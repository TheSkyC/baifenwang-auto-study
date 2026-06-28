/**
 * @file Core configuration constants for baifenwang-auto-study.
 *
 * Domain-specific configs are in config/pool.js and config/media.js.
 */

// Script metadata
export const SCRIPT_NAME = '百分网自动刷课助手';
export const SCRIPT_VERSION = '1.2.0';
export const GITHUB_URL = 'https://github.com/TheSkyC/baifenwang-auto-study';
export const GREASYFORK_URL = 'https://greasyfork.org/zh-CN/scripts/583943';
export const UPDATE_API_URL = 'https://baifenwang-auto-study.tarxf.com';

// Log level
export const LOG_LEVEL = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Current log level (change to LOG_LEVEL.DEBUG for verbose output)
export const CURRENT_LOG_LEVEL = LOG_LEVEL.INFO;

// Settings storage key (shared across GM, localStorage, and in-memory backends)
export const SETTINGS_KEY = 'bfw_settings';

// Progress tracker storage key
export const PROGRESS_TRACKER_KEY = 'bfw_progress';

// Progress tracker behavior thresholds
export const PROGRESS_TRACKER_CONFIG = {
  /** Sessions shorter than this (seconds) with 0 lessons completed are discarded on end. */
  MIN_SESSION_DURATION_S: 30,
  /** Unfinished sessions older than this (ms) are not resumed — treated as abandoned. */
  RESUME_MAX_AGE_MS: 4 * 60 * 60 * 1000,  // 4 hours
};

// Import / export constants
export const IMPORT_EXPORT_CONFIG = {
  /** Current backup format version. Increment when the ZIP layout changes. */
  FORMAT_VERSION: 1,
  /** Estimated average cropped JPEG size for file-size prediction (bytes). */
  EST_CROPPED_JPEG_SIZE: 50 * 1024,   // 50 KB
  /** Estimated average original JPEG size for file-size prediction (bytes). */
  EST_ORIG_JPEG_SIZE: 100 * 1024,     // 100 KB
  /** Per-image JSON overhead in pool-meta.json + pool-stats.json (bytes). */
  EST_PER_IMAGE_JSON: 400,
};

// Retry settings for auto-processor
export const AUTO_CONFIG = {
  /** Delay before initial sequence kickoff (ms) */
  CLICK_DELAY_MS: 300,
  /** Delay after clicking "open camera" before trying the photo button (ms) */
  CAMERA_OPEN_DELAY_MS: 1500,
  /** Delay after clicking "take photo" before trying the compare button (ms) */
  PHOTO_DELAY_MS: 1000,
  /** Max retries when compare button is not yet in the DOM */
  MAX_COMPARE_RETRIES: 5,
  /** Retry interval for compare button polling (ms) */
  COMPARE_RETRY_DELAY_MS: 400,
  /** Max consecutive retry-button cycles before giving up */
  RETRY_MAX_ATTEMPTS: 5,
  /** Base delay for exponential backoff on retry (ms) */
  RETRY_BASE_DELAY_MS: 2000,
  /** Maximum backoff delay cap (ms) */
  RETRY_MAX_DELAY_MS: 30000,
  /** Minimum wait after clicking "开始对比" before handleCompareFailRecovery
   *  may fire.  The server needs time to respond; without this cooldown any
   *  DOM mutation during the server round-trip is misidentified as a failure
   *  because the page still shows both "重新拍照" and "开始对比" buttons.
   *
   *  Fixed per attempt — server response time doesn't change between retries.
   *  The retry gap (COMPARE_RETRY_GAP_BASE_MS) handles pacing between attempts;
   *  this only covers the ambiguous "still waiting or already rejected?" window. */
  COMPARE_COOLDOWN_MS: 8000,
  /** Base retry gap after a confirmed compare failure, before the retake cycle
   *  begins (ms).  Grows exponentially: base × 2^(compareAttempts-1), capped by
   *  COMPARE_RETRY_GAP_MAX_MS.
   *
   *  Separate from COMPARE_COOLDOWN_MS — the cooldown waits for the server to
   *  respond; the gap paces the cycle after failure is confirmed.  Using a
   *  shorter base with a moderate cap keeps the overall pace brisk even when
   *  verification fails several times in a row. */
  COMPARE_RETRY_GAP_BASE_MS: 2000,
  /** Maximum retry gap cap for exponential backoff (ms). */
  COMPARE_RETRY_GAP_MAX_MS: 15000,
  /** Delay after clicking retry button before camera-open click (ms).
   *  Used by onRetry() as a bridge between retry and the normal pipeline. */
  RETRY_CAMERA_DELAY_MS: 800,
};

// Auto-course (自动刷课) configuration
export const COURSE_CONFIG = {
  /** Delay before clicking the play button after page load (ms) */
  PLAY_CLICK_DELAY_MS: 1000,
  /** Max retries for finding and clicking the play button */
  PLAY_MAX_RETRIES: 10,
  /** Retry interval for play button polling (ms) */
  PLAY_RETRY_DELAY_MS: 500,
  /** How often to update the progress display (ms) */
  PROGRESS_UPDATE_INTERVAL_MS: 3000,
  /** Seconds of paused playback before auto-resuming */
  STUCK_THRESHOLD_S: 30,
  /** Max auto-resume attempts before giving up */
  MAX_RESUME_ATTEMPTS: 3,
  /** Resume attempt cooldown (ms) */
  RESUME_COOLDOWN_MS: 5000,
};

// ---------------------------------------------------------------------------
// Delay jitter — prevents bot-detection via fixed-interval timing analysis.
// Human reaction times have a coefficient of variation (CV) in the 0.3–0.8
// range; fixed delays are CV=0.  Apply jitter at every usage site so the
// timing fingerprint becomes unpredictable.
// ---------------------------------------------------------------------------

/**
 * Apply symmetric random jitter to a base delay.
 * Returns `baseMs * (1 ± factor)` — the delay can be SHORTER or LONGER.
 * Suitable for click delays, polling intervals, and general wait times.
 *
 * @param {number} baseMs - base delay in milliseconds
 * @param {number} [factor=0.3] - jitter range (0.3 = ±30%)
 * @returns {number} jittered delay (always ≥ 1ms)
 */
export function jitterMs(baseMs, factor = 0.3) {
  const f = Math.min(Math.max(factor, 0), 1);
  return Math.max(1, Math.round(baseMs * (1 + (Math.random() - 0.5) * 2 * f)));
}

/**
 * Apply asymmetric jitter — delay is ONLY lengthened, never shortened.
 * Suitable for cooldowns, thresholds, and minimum-wait guards where
 * going below the base value risks a false positive (e.g. mistaking
 * a slow server response for a comparison failure).
 *
 * @param {number} baseMs - floor delay in milliseconds
 * @param {number} [factor=0.3] - maximum increase relative to baseMs
 * @returns {number} jittered delay in [baseMs, baseMs × (1 + factor)]
 */
export function jitterMsFloor(baseMs, factor = 0.3) {
  const f = Math.min(Math.max(factor, 0), 1);
  return Math.round(baseMs * (1 + Math.random() * f));
}

// Re-export domain configs for backward compatibility
export {
  IMAGE_POOL_CONFIG,
  FACE_DETECT_CONFIG,
  CROP_EDITOR_CONFIG,
} from './config/pool.js';

export {
  VIDEO_REPLACE_CONFIG,
  VIDEO_CAPTURE_SELECTORS,
  VIDEO_OVERLAY_SELECTORS,
} from './config/media.js';
