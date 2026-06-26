/**
 * @file Video stream interceptor — replaces the camera feed with a pool image.
 *
 * Monkey-patches navigator.mediaDevices.getUserMedia so that when the page
 * requests camera access, we return a canvas.captureStream() that draws a
 * mutated pool image instead of the real camera feed.
 *
 * This makes the fake face visible in the <video> preview and ensures every
 * frame the website captures (via canvas, video snapshot, etc.) contains the
 * fake face — not just the intercepted network request body.
 */

import { VIDEO_REPLACE_CONFIG } from '../config.js';
import { getSetting } from '../settings.js';
import { initPool, pickImage } from '../pool/image-pool.js';
import { info, debug, warn } from '../utils/logger.js';
import { appendLog, setStatus } from '../ui/builder.js';

/** Reference to the original getUserMedia (cached at install time). */
let originalGetUserMedia = null;

/** Whether the interceptor has been installed. */
let installed = false;

// ---------------------------------------------------------------------------
// Active stream state — cleaned up when tracks end
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} FakeStreamState
 * @property {HTMLCanvasElement} canvas   - offscreen canvas drawing the fake face
 * @property {CanvasRenderingContext2D} ctx
 * @property {HTMLImageElement} image     - current pool image drawn on the canvas
 * @property {number} drawIntervalId      - setInterval handle for the draw loop (15 fps)
 * @property {number} width               - canvas width
 * @property {number} height              - canvas height
 */

/** Map of MediaStream → FakeStreamState for cleanup. */
const activeStreams = new WeakMap();

/** Set of active fake MediaStreams (enables iteration — WeakMap keys are not enumerable). */
const activeStreamSet = new Set();

/** Map of MediaStream → original getUserMedia constraints (for real/fake toggle). */
const streamConstraints = new WeakMap();

/** How many fake MediaStream tracks are currently live (counter avoids WeakMap race). */
let _activeStreamCount = 0;

/** Whether at least one fake video stream is currently active. */
let _fakeStreamActive = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse video dimensions from getUserMedia constraints.
 * Returns { width, height } — falls back to DEFAULT_WIDTH/HEIGHT.
 *
 * @param {MediaStreamConstraints} constraints
 * @returns {{ width: number, height: number }}
 */
function parseVideoDimensions(constraints) {
  const cfg = VIDEO_REPLACE_CONFIG;
  let width = cfg.DEFAULT_WIDTH;
  let height = cfg.DEFAULT_HEIGHT;

  try {
    const video = constraints?.video;
    if (!video) return { width, height };

    // Handle boolean true → use defaults
    if (video === true) return { width, height };

    // Handle object constraints
    if (typeof video === 'object') {
      // width can be a number or { ideal: N, ... }
      const w = video.width;
      const h = video.height;

      if (typeof w === 'number') {
        width = w;
      } else if (w && typeof w === 'object') {
        if (typeof w.ideal === 'number') width = w.ideal;
        else if (typeof w.exact === 'number') width = w.exact;
        else if (typeof w.min === 'number') width = w.min;
      }

      if (typeof h === 'number') {
        height = h;
      } else if (h && typeof h === 'object') {
        if (typeof h.ideal === 'number') height = h.ideal;
        else if (typeof h.exact === 'number') height = h.exact;
        else if (typeof h.min === 'number') height = h.min;
      }
    }

    // Also handle deviceId / facingMode constraints that may have embedded dimensions
    if (typeof video === 'object' && video.mandatory) {
      const mandatory = video.mandatory;
      if (mandatory.minWidth) width = Math.max(width, mandatory.minWidth);
      if (mandatory.minHeight) height = Math.max(height, mandatory.minHeight);
    }
  } catch (e) {
    debug('Video interceptor: failed to parse dimensions from constraints, using defaults');
  }

  return { width: Math.max(width, 160), height: Math.max(height, 120) };
}

/**
 * Load a data URI into an HTMLImageElement.
 * @param {string} dataUrl
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load pool image'));
    img.src = dataUrl;
  });
}

/** Cached AudioContext for silent audio track generation.
 *  Creating a new context per call leaks system audio resources;
 *  browsers may cap active AudioContext instances (~6 in Chrome).
 *  A single context with a continuous silent oscillator serves every
 *  fake stream. */
let _cachedAudioCtx = null;

/**
 * Create a silent audio track using the Web Audio API.
 * Reuses a single AudioContext across all calls to avoid resource leaks.
 * @returns {MediaStreamTrack|null}
 */
function createSilentAudioTrack() {
  try {
    if (!_cachedAudioCtx) {
      _cachedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browsers may suspend inactive contexts)
    if (_cachedAudioCtx.state === 'suspended') {
      _cachedAudioCtx.resume();
    }
    const oscillator = _cachedAudioCtx.createOscillator();
    const gain = _cachedAudioCtx.createGain();
    const dest = _cachedAudioCtx.createMediaStreamDestination();

    // Zero gain = silent
    gain.gain.value = 0;
    oscillator.connect(gain);
    gain.connect(dest);
    oscillator.start();

    const tracks = dest.stream.getAudioTracks();
    if (tracks.length > 0) {
      debug('Video interceptor: created silent audio track');
      return tracks[0];
    }
    return null;
  } catch (e) {
    debug('Video interceptor: could not create silent audio track:', e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Draw loop — keeps the canvas stream "alive" with subtle jitter
// ---------------------------------------------------------------------------

/** Draw refresh rate for static images (fps). 15 fps is enough for
 *  the brightness jitter to look "alive" while saving ~75% CPU vs 60 fps. */
const DRAW_FPS = 15;
const DRAW_INTERVAL_MS = Math.round(1000 / DRAW_FPS);

/**
 * Start the draw loop for a fake stream state.
 * Each frame redraws the image with a subtle brightness jitter to simulate
 * a live camera feed (minor exposure variations).
 *
 * Uses setInterval at a fixed low rate — the canvas is static apart from
 * the jitter, so 60 fps rAF is unnecessary overhead.
 *
 * @param {FakeStreamState} state
 */
function startDrawLoop(state) {
  const cfg = VIDEO_REPLACE_CONFIG;

  function draw() {
    if (!state.image) return;

    const { ctx, canvas, image } = state;

    // Subtle brightness jitter (±BRIGHTNESS_JITTER)
    const jitter = 1 + (Math.random() - 0.5) * 2 * cfg.BRIGHTNESS_JITTER;
    ctx.filter = `brightness(${jitter.toFixed(3)})`;

    // Cover-mode scaling: fill the entire canvas
    const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
    const drawW = image.naturalWidth * scale;
    const drawH = image.naturalHeight * scale;
    const dx = (canvas.width - drawW) / 2;
    const dy = (canvas.height - drawH) / 2;

    // Clear and redraw
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, dx, dy, drawW, drawH);

    // Reset filter
    ctx.filter = 'none';
  }

  // Draw first frame immediately, then every DRAW_INTERVAL_MS
  draw();
  state.drawIntervalId = setInterval(draw, DRAW_INTERVAL_MS);
}

/**
 * Clean up a fake stream's resources.
 * @param {FakeStreamState} state
 */
function cleanupState(state) {
  if (state.drawIntervalId) {
    clearInterval(state.drawIntervalId);
    state.drawIntervalId = 0;
  }
}

// ---------------------------------------------------------------------------
// Core: create fake stream from pool image
// ---------------------------------------------------------------------------

/**
 * Create a fake MediaStream that renders a pool image instead of the real camera.
 *
 * @param {MediaStreamConstraints} constraints - Original getUserMedia constraints
 * @param {Function} originalFn - The original getUserMedia function
 * @returns {Promise<MediaStream>}
 */
async function createFakeStream(constraints, originalFn) {
  const cfg = VIDEO_REPLACE_CONFIG;
  const { width, height } = parseVideoDimensions(constraints);

  // Pick an image from the pool
  let dataUrl;
  try {
    await initPool();
    dataUrl = await pickImage();
  } catch (e) {
    warn('Video interceptor: cannot create fake stream —', e?.message || e);
    if (e?.code === 'POOL_EMPTY') {
      appendLog('图片池为空 — 使用真实摄像头');
      setStatus(true, '运行中 — 图片池为空 (真实摄像头)');
    }
    // Fall back to real camera
    return originalFn.call(navigator.mediaDevices, constraints);
  }

  // Load the image
  const image = await loadImage(dataUrl);

  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Initial draw
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawW = image.naturalWidth * scale;
  const drawH = image.naturalHeight * scale;
  const dx = (width - drawW) / 2;
  const dy = (height - drawH) / 2;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, dx, dy, drawW, drawH);

  // Start draw loop (for jitter animation)
  const state = { canvas, ctx, image, drawIntervalId: 0, width, height };
  startDrawLoop(state);

  // Capture stream from canvas.
  // Try with frameRate first (supported in Chrome, Edge, Safari); fall back
  // to parameterless captureStream() for browsers that ignore or reject the
  // argument (older Firefox).  Only fall back to the real camera if both fail.
  let stream;
  try {
    stream = canvas.captureStream(cfg.STREAM_FPS);
  } catch (_e1) {
    debug('Video interceptor: canvas.captureStream(fps) threw, trying without frameRate');
    try {
      stream = canvas.captureStream();
    } catch (_e2) {
      warn('Video interceptor: canvas.captureStream() failed:', _e2);
      cleanupState(state);
      return originalFn.call(navigator.mediaDevices, constraints);
    }
  }

  // Add silent audio track if audio was requested
  if (constraints?.audio) {
    const audioTrack = createSilentAudioTrack();
    if (audioTrack) {
      stream.addTrack(audioTrack);
    }
  }

  // Clean up when the stream ends
  const videoTracks = stream.getVideoTracks();
  if (videoTracks.length > 0) {
    videoTracks[0].addEventListener('ended', () => {
      debug('Video interceptor: fake stream track ended, cleaning up');
      cleanupState(state);
      activeStreams.delete(stream);
      activeStreamSet.delete(stream);
      streamConstraints.delete(stream);
      _activeStreamCount = Math.max(0, _activeStreamCount - 1);
      if (_activeStreamCount === 0) {
        _fakeStreamActive = false;
        debug('Video interceptor: no more active fake streams, clearing flag');
      }
    });
  }

  activeStreams.set(stream, state);
  activeStreamSet.add(stream);
  streamConstraints.set(stream, constraints);
  _activeStreamCount++;
  _fakeStreamActive = true;
  info(`Video interceptor: fake stream created (${width}×${height})`);
  appendLog(`摄像头流已替换 (${width}×${height})`);
  setStatus(true, '运行中 — 摄像头已替换');

  return stream;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Install the video stream interceptor by monkey-patching
 * navigator.mediaDevices.getUserMedia.
 *
 * When the page requests camera access, the interceptor returns a canvas-based
 * fake stream instead of the real camera feed.
 */
export function installVideoInterceptor() {
  if (installed) {
    warn('Video interceptor already installed');
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    debug('Video interceptor: getUserMedia not available, skipping');
    return;
  }

  originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

  navigator.mediaDevices.getUserMedia = async function interceptedGetUserMedia(constraints) {
    // Check settings — skip interception if video replacement is disabled
    if (!getSetting('videoReplace', true)) {
      debug('Video interceptor: disabled — passing through to real camera');
      return originalGetUserMedia(constraints);
    }

    // Only intercept video requests
    if (!constraints || !constraints.video) {
      debug('Video interceptor: no video in constraints — passing through');
      return originalGetUserMedia(constraints);
    }

    debug('Video interceptor: intercepting getUserMedia with video constraints');

    try {
      const stream = await createFakeStream(constraints, originalGetUserMedia);
      return stream;
    } catch (e) {
      warn('Video interceptor: fake stream failed, falling back to real camera:', e);
      appendLog('摄像头替换失败 — 使用真实摄像头');
      setStatus(true, '运行中 — 摄像头替换失败 (使用真实摄像头)');
      return originalGetUserMedia(constraints);
    }
  };

  installed = true;
  info('Video interceptor installed (getUserMedia monkey-patch)');
}

/**
 * Check whether a MediaStream was created by the interceptor (i.e. is a fake stream).
 * @param {MediaStream} stream
 * @returns {boolean}
 */
export function isStreamFake(stream) {
  return activeStreams.has(stream);
}

/**
 * Check whether at least one fake video stream is currently active.
 * Used by network interceptors to know if they should skip body replacement
 * (since the video stream already provides the fake face).
 * @returns {boolean}
 */
export function isVideoInterceptorActive() {
  return _fakeStreamActive;
}

/**
 * Get the original getUserMedia constraints for a stream.
 * Returns null if the stream is not a known fake stream or the constraints
 * are not available.
 * @param {MediaStream} stream
 * @returns {MediaStreamConstraints|null}
 */
export function getStreamConstraints(stream) {
  return streamConstraints.get(stream) ?? null;
}

/**
 * Pick a new pool image and swap it into the canvas for the given stream.
 * Triggers an immediate redraw on the next animation frame.
 *
 * @param {MediaStream} stream - The fake MediaStream returned by getUserMedia
 * @returns {Promise<boolean>} true if the image was swapped, false if stream not found
 */
export async function refreshStreamImage(stream) {
  const state = activeStreams.get(stream);
  if (!state) return false;

  try {
    await initPool();
    const dataUrl = await pickImage();
    const newImage = await loadImage(dataUrl);
    state.image = newImage;
    debug('Video interceptor: manually refreshed pool image');
    return true;
  } catch (e) {
    debug('Video interceptor: manual image refresh failed:', e?.message || e);
    return false;
  }
}

/**
 * Switch from a fake stream to the real camera.
 *
 * Acquires the real stream FIRST — if it fails, the fake stream is kept
 * intact so the video element never goes black.
 *
 * @param {MediaStream} fakeStream - The current fake MediaStream
 * @param {MediaStreamConstraints} constraints - Original constraints
 * @returns {Promise<MediaStream>} The real camera MediaStream
 * @throws {Error} If the real camera cannot be accessed
 */
export async function switchToRealCamera(fakeStream, constraints) {
  if (!originalGetUserMedia) {
    throw new Error('Original getUserMedia not available');
  }

  // Acquire the real stream FIRST — if this throws, the fake stream survives
  const realStream = await originalGetUserMedia(constraints);

  // Now that we have the real stream, stop the fake one.
  // The 'ended' listener handles canvas cleanup, WeakMap deletion,
  // active-stream counter decrement, and flag clearing.
  for (const track of fakeStream.getTracks()) {
    track.stop();
  }

  info('Video interceptor: switched to real camera');
  return realStream;
}

/**
 * Switch from a real camera stream back to a fake stream.
 * Stops the real stream tracks (if provided) and creates a new fake stream.
 *
 * @param {MediaStream|null} realStream - The current real stream (will be stopped). Pass null if no real stream to stop.
 * @param {MediaStreamConstraints} constraints - Original getUserMedia constraints
 * @returns {Promise<MediaStream>} A new fake MediaStream
 */
export async function switchToFakeCamera(realStream, constraints) {
  // Stop real stream tracks if provided
  if (realStream) {
    for (const track of realStream.getTracks()) {
      track.stop();
    }
  }

  return createFakeStream(constraints, originalGetUserMedia);
}

/**
 * Push a specific image data URL onto all currently active fake streams.
 * This replaces the canvas image in-place — the draw loop immediately
 * picks up the new image without tearing down or recreating the stream.
 *
 * Used by the face preview modal to test how a specific mutated image
 * looks on the live video feed.
 *
 * @param {string} dataUrl - JPEG/PNG data URI (ideally 400×300)
 * @returns {Promise<boolean>} true if at least one stream was updated
 */
export async function pushImageToActiveStream(dataUrl) {
  if (!_fakeStreamActive || activeStreamSet.size === 0) {
    debug('Video interceptor: no active fake stream to push image to');
    return false;
  }

  let pushed = false;
  for (const stream of activeStreamSet) {
    const state = activeStreams.get(stream);
    if (!state) continue;

    try {
      const image = await loadImage(dataUrl);
      state.image = image;
      pushed = true;
      debug('Video interceptor: pushed custom image to live stream');
    } catch (e) {
      warn('Video interceptor: failed to push image to stream:', e?.message || e);
    }
  }

  if (pushed) {
    info(`Video interceptor: pushed custom image to ${pushed ? 'live stream' : 'no streams'}`);
    appendLog('预览图片已推送到摄像头');
  }

  return pushed;
}