/**
 * @file Video overlay — controls overlaid on the fake stream video element.
 *
 * Detects when a <video> element receives a fake MediaStream (created by
 * video-interceptor.js) and overlays HTML buttons for switching to the real
 * camera or refreshing the pool image.
 *
 * Uses two detection mechanisms:
 *   1. MutationObserver — watches for new <video> elements added to the DOM.
 *   2. srcObject setter hook — intercepts video.srcObject assignments so we
 *      catch streams assigned after the video element is already in the DOM.
 *
 * Overlay buttons:
 *   - 换一张 (Refresh Image): pick a new random pool image for the canvas.
 *   - 切换真实/模拟 (Toggle Real/Fake): temporarily switch between fake and
 *     real camera streams on the video element.
 */

import {
  isStreamFake,
  refreshStreamImage,
  switchToRealCamera,
  switchToFakeCamera,
  getStreamConstraints,
} from '../core/video-interceptor.js';
import { info, debug, warn } from '../utils/logger.js';
import { appendLog } from './builder.js';
import { icons } from './icons.js';
import { resetAutoSequence, findButton, BTN_TEXT } from '../auto/processor.js';
import { registerBodyMutationHandler } from '../utils/dom-observer.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} OverlayState
 * @property {MediaStream|null} fakeStream  - Current fake stream (null when in real mode)
 * @property {MediaStream|null} realStream  - Cached real stream (null when in fake mode)
 * @property {MediaStreamConstraints|null} constraints - Original getUserMedia constraints
 * @property {'fake'|'real'} mode            - Current display mode
 * @property {HTMLElement} overlayEl         - The overlay container DOM element
 * @property {ResizeObserver|null} resizeObserver
 */

/** Map of <video> element → OverlayState. */
const overlayMap = new Map();

/** Whether the srcObject setter has been hooked. */
let srcObjectHooked = false;

/** Unsubscribe function for the shared body MutationObserver. */
let observerUnsubscribe = null;

// ---------------------------------------------------------------------------
// Overlay DOM creation
// ---------------------------------------------------------------------------

/**
 * Create the overlay DOM element with mode badge and control buttons.
 * @returns {HTMLElement}
 */
function createOverlayDOM() {
  const overlay = document.createElement('div');
  overlay.className = 'bfw-video-overlay';
  overlay.innerHTML = `
    <div class="bfw-overlay-mode-badge mode-fake">模拟</div>
    <div class="bfw-video-overlay-btns">
      <button class="bfw-overlay-btn bfw-overlay-btn-refresh" title="从图片池中随机更换一张人脸">${icons.refresh} 换一张</button>
      <button class="bfw-overlay-btn bfw-overlay-btn-toggle" title="暂时切换为真实摄像头">${icons.cameraToggle} 切换真实</button>
    </div>
  `;
  return overlay;
}

/**
 * Update overlay UI elements to reflect the current mode.
 * @param {OverlayState} state
 */
function updateOverlayUI(state) {
  const { overlayEl, mode } = state;
  if (!overlayEl) return;

  const modeBadge = overlayEl.querySelector('.bfw-overlay-mode-badge');
  const toggleBtn = overlayEl.querySelector('.bfw-overlay-btn-toggle');
  const refreshBtn = overlayEl.querySelector('.bfw-overlay-btn-refresh');

  if (mode === 'fake') {
    if (modeBadge) {
      modeBadge.textContent = '模拟';
      modeBadge.className = 'bfw-overlay-mode-badge mode-fake';
    }
    if (toggleBtn) {
      toggleBtn.innerHTML = `${icons.cameraToggle} 切换真实`;
      toggleBtn.className = 'bfw-overlay-btn bfw-overlay-btn-toggle';
      toggleBtn.title = '暂时切换为真实摄像头';
    }
    if (refreshBtn) refreshBtn.disabled = false;
  } else {
    if (modeBadge) {
      modeBadge.textContent = '真实';
      modeBadge.className = 'bfw-overlay-mode-badge mode-real';
    }
    if (toggleBtn) {
      toggleBtn.innerHTML = `${icons.video} 切回模拟`;
      toggleBtn.className = 'bfw-overlay-btn bfw-overlay-btn-toggle mode-real';
      toggleBtn.title = '切回模拟摄像头';
    }
    if (refreshBtn) refreshBtn.disabled = true;
  }
}

// ---------------------------------------------------------------------------
// Button handlers
// ---------------------------------------------------------------------------

/**
 * Handle "换一张" (Refresh Image) button click.
 * @param {HTMLVideoElement} _video
 * @param {OverlayState} state
 */
async function onRefreshImage(_video, state) {
  if (state.mode !== 'fake' || !state.fakeStream) return;

  const ok = await refreshStreamImage(state.fakeStream);
  if (ok) {
    info('Overlay: refreshed pool image');
  } else {
    warn('Overlay: failed to refresh pool image (stream may have ended or pool empty)');
    appendLog('换一张失败 — 图片池可能为空');
  }
}

/**
 * Handle "切换真实/模拟" (Toggle Real/Fake) button click.
 * @param {HTMLVideoElement} video
 * @param {OverlayState} state
 */
async function onToggleRealFake(video, state) {
  const constraints = state.constraints || { video: true, audio: false };
  const btn = state.overlayEl?.querySelector('.bfw-overlay-btn-toggle');

  if (btn) btn.disabled = true;

  // Reset the auto-click sequence so it doesn't race ahead after we switch.
  // The next DOM change (from clicking 重新拍照) will restart it naturally.
  resetAutoSequence();

  if (state.mode === 'fake') {
    // Switch FROM fake TO real camera
    try {
      const realStream = await switchToRealCamera(state.fakeStream, constraints);
      state.realStream = realStream;
      state.fakeStream = null;
      state.mode = 'real';
      video.srcObject = realStream;
      updateOverlayUI(state);
      info('Overlay: switched to real camera');
      appendLog('已切换到真实摄像头');

      // Click 重新拍照 if visible, so the page re-takes the photo
      // with the real camera feed instead of the old fake one.
      setTimeout(() => {
        const retake = findButton('.face_btns.btn_again', BTN_TEXT.RETAKE);
        if (retake) {
          retake.click();
          info('Overlay: clicked 重新拍照 after real camera switch');
          appendLog('已触发重新拍照');
        }
      }, 400);
    } catch (e) {
      warn('Overlay: failed to switch to real camera:', e);
      appendLog('无法切换到真实摄像头 — 请检查权限');
      // switchToRealCamera now acquires the real stream BEFORE stopping
      // the fake one, so on failure the fake stream is still intact and
      // the video element continues showing the pool image.
    }
  } else {
    // Switch FROM real TO fake camera
    try {
      const fakeStream = await switchToFakeCamera(state.realStream, constraints);
      state.fakeStream = fakeStream;
      state.realStream = null;
      state.mode = 'fake';
      video.srcObject = fakeStream;
      updateOverlayUI(state);
      info('Overlay: switched back to fake camera');
      appendLog('已切回模拟摄像头');

      // Also click 重新拍照 to retake with the fake feed.
      setTimeout(() => {
        const retake = findButton('.face_btns.btn_again', BTN_TEXT.RETAKE);
        if (retake) {
          retake.click();
          info('Overlay: clicked 重新拍照 after fake camera switch');
          appendLog('已触发重新拍照');
        }
      }, 400);
    } catch (e) {
      warn('Overlay: failed to switch to fake camera:', e);
      appendLog('无法切回模拟摄像头 — 图片池可能为空');
    }
  }

  if (btn) btn.disabled = false;
}

// ---------------------------------------------------------------------------
// Overlay lifecycle
// ---------------------------------------------------------------------------

/**
 * Attach an overlay to a <video> element that is playing a fake stream.
 * @param {HTMLVideoElement} video
 * @param {MediaStream} fakeStream
 */
function attachOverlay(video, fakeStream) {
  if (overlayMap.has(video)) return; // Already has an overlay

  const constraints = getStreamConstraints(fakeStream);

  // Ensure the video's parent has position: relative (or absolute/fixed)
  // so the overlay can be positioned absolutely within it.
  const parent = video.parentElement;
  if (parent) {
    const parentPos = getComputedStyle(parent).position;
    if (!parentPos || parentPos === 'static') {
      parent.style.position = 'relative';
    }
  }

  // Create overlay
  const overlayEl = createOverlayDOM();

  // Insert overlay as a sibling after the video (inside video's parent)
  if (parent) {
    parent.insertBefore(overlayEl, video.nextSibling);
  } else {
    // Video not in DOM yet — shouldn't happen in practice, but handle gracefully
    debug('Overlay: video element has no parent, cannot attach overlay');
    return;
  }

  const state = {
    fakeStream,
    realStream: null,
    constraints,
    mode: 'fake',
    overlayEl,
    resizeObserver: null,
  };

  // Bind button clicks
  const refreshBtn = overlayEl.querySelector('.bfw-overlay-btn-refresh');
  const toggleBtn = overlayEl.querySelector('.bfw-overlay-btn-toggle');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onRefreshImage(video, state);
    });
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onToggleRealFake(video, state);
    });
  }

  // Keep overlay sized to match the video using ResizeObserver
  try {
    const ro = new ResizeObserver(() => {
      // Overlay is position:absolute with inset:0 relative to the video's parent,
      // so its size automatically tracks the parent. But we still watch for
      // reference so we can detect when the video is removed/hidden.
    });
    ro.observe(video);
    state.resizeObserver = ro;
  } catch (_) { /* ResizeObserver not supported — overlay still works via CSS */ }

  overlayMap.set(video, state);
  info('Overlay: attached controls to video element');
}

/**
 * Clean up overlay for a specific video element.
 * @param {HTMLVideoElement} video
 */
function cleanupOverlay(video) {
  const state = overlayMap.get(video);
  if (!state) return;

  if (state.resizeObserver) {
    state.resizeObserver.disconnect();
  }
  if (state.overlayEl && state.overlayEl.parentNode) {
    state.overlayEl.parentNode.removeChild(state.overlayEl);
  }
  overlayMap.delete(video);
  debug('Overlay: cleaned up overlay for video element');
}

// ---------------------------------------------------------------------------
// Video element discovery
// ---------------------------------------------------------------------------

/**
 * Check if a video element is playing our fake stream and attach overlay if so.
 * @param {HTMLVideoElement} video
 */
function checkVideoElement(video) {
  // Skip if already has an overlay
  if (overlayMap.has(video)) return;

  // Must be in the DOM
  if (!video.isConnected) return;

  const stream = video.srcObject;
  if (stream instanceof MediaStream && isStreamFake(stream)) {
    attachOverlay(video, stream);
  }
}

// ---------------------------------------------------------------------------
// srcObject setter hook
// ---------------------------------------------------------------------------

/**
 * Monkey-patch HTMLMediaElement.prototype.srcObject setter to detect
 * when a page script assigns a fake stream to a video element.
 */
function hookSrcObjectSetter() {
  if (srcObjectHooked) return;

  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLMediaElement.prototype, 'srcObject',
  );

  if (!descriptor || !descriptor.set) {
    warn('Overlay: cannot hook srcObject setter — overlay detection may be unreliable');
    return;
  }

  const originalSetter = descriptor.set;

  Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
    ...descriptor,
    set(value) {
      // Call original setter first
      originalSetter.call(this, value);

      // Check if the assigned stream is a fake stream we created
      if (value instanceof MediaStream && isStreamFake(value)) {
        // Delay slightly to let the DOM settle
        if (this instanceof HTMLVideoElement) {
          // Use requestAnimationFrame to let the page finish its update
          requestAnimationFrame(() => {
            checkVideoElement(this);
          });
        }
      }
    },
  });

  srcObjectHooked = true;
  debug('Overlay: hooked srcObject setter');
}

// ---------------------------------------------------------------------------
// MutationObserver — detect new video elements
// ---------------------------------------------------------------------------

/**
 * Scan all <video> elements in the document and check for fake streams.
 */
function scanForVideos() {
  const videos = document.querySelectorAll('video');
  for (const video of videos) {
    checkVideoElement(video);
  }
}

/**
 * Start observing the DOM for new <video> elements.
 * Uses the shared body-level MutationObserver to avoid creating a
 * redundant observer alongside the auto-processor.
 */
function startObserving() {
  if (observerUnsubscribe) return; // Already observing

  observerUnsubscribe = registerBodyMutationHandler((mutations) => {
    for (const mutation of mutations) {
      // Check added nodes for new video elements
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLVideoElement) {
          checkVideoElement(node);
        }
        // Also check descendants of added nodes
        if (node instanceof HTMLElement && node.querySelector) {
          const videos = node.querySelectorAll('video');
          for (const video of videos) {
            checkVideoElement(video);
          }
        }
      }

      // Clean up overlays for removed video elements
      for (const node of mutation.removedNodes) {
        if (node instanceof HTMLVideoElement) {
          cleanupOverlay(node);
        }
        if (node instanceof HTMLElement && node.querySelector) {
          const videos = node.querySelectorAll('video');
          for (const video of videos) {
            cleanupOverlay(video);
          }
        }
      }
    }
  });

  debug('Overlay: registered with shared MutationObserver');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize the video overlay system.
 *
 * Called once at bootstrap time. Hooks the srcObject setter and starts
 * watching for video elements that receive fake streams.
 */
export function initVideoOverlay() {
  // Hook srcObject before any page script assigns streams
  hookSrcObjectSetter();

  // Watch for video elements added to the DOM
  if (document.body) {
    startObserving();
    // Initial scan for any video elements already present
    scanForVideos();
  } else {
    // DOM not ready yet — defer
    document.addEventListener('DOMContentLoaded', () => {
      startObserving();
      scanForVideos();
    });
  }

  debug('Overlay: initialized');
}

/**
 * Remove overlay for a specific video element.
 * @param {HTMLVideoElement} video
 */
export function destroyOverlay(video) {
  cleanupOverlay(video);
}

/**
 * Remove all overlays and stop observing.
 */
export function destroyAllOverlays() {
  for (const video of overlayMap.keys()) {
    cleanupOverlay(video);
  }
  if (observerUnsubscribe) {
    observerUnsubscribe();
    observerUnsubscribe = null;
  }
  debug('Overlay: all overlays destroyed');
}