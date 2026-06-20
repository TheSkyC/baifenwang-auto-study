/**
 * @file Video frame capture — extracts still frames from the face verification
 * video element for the manual "capture" button in the pool UI.
 *
 * Public API:
 *   findVideoElement(selectors)
 *   captureFrame(video, quality)
 *   isFrameUseful(dataUrl)
 */

import { VIDEO_CAPTURE_SELECTORS } from '../config.js';
import { debug, warn } from './logger.js';

// ---------------------------------------------------------------------------
// Video element discovery
// ---------------------------------------------------------------------------

/**
 * Known video players (course/content video) that should never be captured.
 * The face verification camera is a separate video element.
 */
const PLAYER_VIDEO_SELECTORS = [
  '#player_html5_api',    // Video.js player
  '.vjs-tech',            // Video.js tech element
  '.pv-player',           // Polyv player
  '.plvideo',             // Polyv live video
  '.tcplayer',            // Tencent Cloud player
  '.prism-player',        // Alibaba Cloud player
  '[id*="player"]',       // Generic player id
  '[class*="player"]',    // Generic player class
];

/**
 * Check if a video element matches known course-player selectors.
 * @param {HTMLVideoElement} video
 * @returns {boolean}
 */
function isPlayerVideo(video) {
  for (const sel of PLAYER_VIDEO_SELECTORS) {
    try {
      if (video.matches(sel)) return true;
      // Also check ancestors — player videos are usually nested in player containers
      if (video.closest(sel)) return true;
    } catch (_) { /* invalid selector */ }
  }
  return false;
}

/**
 * Try each CSS selector in order and return the FIRST visible video element
 * with non-zero dimensions that is NOT a course player.
 *
 * Selectors are tried in order of priority — the first matching selector wins.
 * Only falls back to broader selectors if all higher-priority selectors fail.
 *
 * @param {string[]} selectors
 * @returns {HTMLVideoElement|null}
 */
export function findVideoElement(selectors) {
  if (!selectors || selectors.length === 0) {
    selectors = VIDEO_CAPTURE_SELECTORS;
  }

  // Two-pass approach:
  // Pass 1: Try high-priority selectors (#video, .main_content) first.
  //         Return the first non-player match immediately.
  // Pass 2: Only if pass 1 finds nothing, scan broader selectors but
  //         explicitly exclude player videos.

  const specificSelectors = ['#video', '.main_content'];
  const broadSelectors = selectors.filter(s => !specificSelectors.includes(s));

  // Pass 1: Specific camera selectors (priority)
  for (const sel of specificSelectors) {
    try {
      const el = document.querySelector(sel);
      if (el && el.tagName === 'VIDEO') {
        const video = /** @type {HTMLVideoElement} */ (el);
        const rect = video.getBoundingClientRect();
        if (rect.width > 10 && rect.height > 10 && isElementVisible(video)) {
          debug(`Video capture: found camera video via "${sel}" (${video.videoWidth}×${video.videoHeight})`);
          return video;
        }
      }
    } catch (_) { /* invalid CSS selector — skip */ }
  }

  // Pass 2: Broad selectors with player exclusion
  const candidates = [];

  for (const sel of broadSelectors) {
    try {
      const elements = document.querySelectorAll(sel);
      for (const el of elements) {
        if (el.tagName !== 'VIDEO') continue;
        const video = /** @type {HTMLVideoElement} */ (el);
        const rect = video.getBoundingClientRect();

        // Must be visible with meaningful dimensions
        if (!(rect.width > 10 && rect.height > 10 && isElementVisible(video))) continue;

        // Must NOT be a course player
        if (isPlayerVideo(video)) continue;

        candidates.push({ video, area: rect.width * rect.height });
      }
    } catch (_) { /* invalid CSS selector — skip */ }
  }

  if (candidates.length === 0) {
    debug('Video capture: no visible camera video element found');
    return null;
  }

  // Pick the SMALLEST video among candidates (camera feed is typically smaller
  // than any other video on the page).
  candidates.sort((a, b) => a.area - b.area);
  const chosen = candidates[0].video;
  debug(`Video capture: found camera video, ${chosen.videoWidth}×${chosen.videoHeight} (${candidates.length} candidate(s))`);
  return chosen;
}

/**
 * Check whether an element is visible (not display:none, not opacity:0, not
 * hidden via the `hidden` attribute, and not zero-size).
 *
 * @param {HTMLElement} el
 * @returns {boolean}
 */
function isElementVisible(el) {
  const style = getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (parseFloat(style.opacity) === 0) return false;
  if (el.hidden) return false;
  // Check ancestors aren't hidden
  let parent = el.parentElement;
  while (parent) {
    const ps = getComputedStyle(parent);
    if (ps.display === 'none' || ps.visibility === 'hidden') return false;
    parent = parent.parentElement;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Frame capture
// ---------------------------------------------------------------------------

/**
 * Capture the current frame of a &lt;video&gt; element as a JPEG data URI.
 *
 * Returns null if the video is not ready, has zero dimensions, or the canvas
 * is tainted (cross-origin media).
 *
 * @param {HTMLVideoElement} video
 * @param {number} [quality=0.85] - JPEG compression quality (0–1)
 * @returns {string|null} data:image/jpeg;base64,… or null
 */
export function captureFrame(video, quality = 0.85) {
  if (!video || video.tagName !== 'VIDEO') {
    warn('Video capture: invalid video element');
    return null;
  }

  const vw = video.videoWidth;
  const vh = video.videoHeight;

  if (!vw || !vh || vw < 10 || vh < 10) {
    debug(`Video capture: video not ready (${vw}×${vh})`);
    return null;
  }

  // Ensure video is in a playable state — capture the current frame even if paused
  try {
    const canvas = document.createElement('canvas');
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      warn('Video capture: failed to get 2d context');
      return null;
    }

    ctx.drawImage(video, 0, 0, vw, vh);

    try {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      debug(`Video capture: captured ${vw}×${vh} frame (${(dataUrl.length / 1024).toFixed(1)}KB)`);
      return dataUrl;
    } catch (taintErr) {
      warn('Video capture: canvas tainted — cannot export frame. Possible cross-origin media.');
      return null;
    }
  } catch (e) {
    warn('Video capture: drawImage failed —', e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Frame quality validation
// ---------------------------------------------------------------------------

/**
 * Quick check: is the captured frame useful?
 *
 * Samples a grid of pixels across the image and rejects frames that are
 * almost entirely one colour (all-black, all-green placeholder, etc.).
 *
 * @param {string} dataUrl - A data:image/… URI
 * @returns {Promise<boolean>}
 */
export function isFrameUseful(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => {
      debug('Video capture: frame quality check — failed to decode');
      resolve(false);
    };
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        // Sample at a reduced resolution
        canvas.width = Math.min(img.naturalWidth, 80);
        canvas.height = Math.min(img.naturalHeight, 60);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(true); // If we can't check, let it through

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Sample every Nth pixel to build a colour histogram
        const stride = 4; // RGBA
        const seen = new Set();
        let nonBlack = 0;
        let total = 0;

        for (let i = 0; i < data.length; i += stride * 3) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const key = (r >> 5) + ',' + (g >> 5) + ',' + (b >> 5); // 8×8×8 buckets
          seen.add(key);
          if (r > 20 || g > 20 || b > 20) nonBlack++;
          total++;
        }

        // Reject if nearly everything is black (camera not started)
        if (total > 10 && nonBlack / total < 0.05) {
          debug('Video capture: frame appears all-black, rejecting');
          return resolve(false);
        }

        // Reject if virtually no colour variation (blank placeholder)
        if (seen.size < 4 && total > 10) {
          debug(`Video capture: frame has too few distinct colours (${seen.size}), rejecting`);
          return resolve(false);
        }

        debug(`Video capture: frame quality OK (${seen.size} colour buckets, ${((nonBlack / total) * 100).toFixed(0)}% non-dark)`);
        resolve(true);
      } catch (e) {
        debug('Video capture: frame quality check error —', e);
        resolve(true); // Let it pass on error — don't block the pipeline
      }
    };
    img.src = dataUrl;
  });
}
