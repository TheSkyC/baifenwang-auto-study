// ==UserScript==
// @name           百分网自动刷课助手
// @description    自动完成百分网人脸验证与课程播放，支持防切屏检测与人脸图片管理
// @namespace      https://greasyfork.org/baifenwang-auto-study
// @version        1.0.0
// @author         TheSkyC
// @license        MIT
// @homepageURL    https://github.com/TheSkyC/baifenwang-auto-study
// @supportURL     https://github.com/TheSkyC/baifenwang-auto-study/issues
// @updateURL      https://baifenwang-auto-study.tarxf.com/latest.user.js
// @downloadURL    https://baifenwang-auto-study.tarxf.com/latest.user.js
// @match          *://*.tj.100.wang/*
// @run-at         document-start
// @compatible     Tampermonkey
// @compatible     Greasemonkey
// @compatible     Violentmonkey
// @compatible     ScriptCat
// @compatible     AdGuard
// @grant          none
// ==/UserScript==

(function () {
  'use strict';

  /**
   * @file Image pool and face detection configuration.
   * @module config/pool
   */

  // Image pool configuration
  const IMAGE_POOL_CONFIG = {
    /** Maximum number of images the user can store */
    MAX_IMAGES: 50,

    // ---- Standard output ----
    /** Output width (all stored images are forced to this) */
    OUTPUT_WIDTH: 400,
    /** Output height (all stored images are forced to this) */
    OUTPUT_HEIGHT: 300,
    /** Maximum pixel dimension (width or height) for stored images — keeps aspect ratio */
    MAX_DIMENSION: 800,
    /** JPEG export quality (0.0 – 1.0) for storage */
    JPEG_QUALITY: 0.78,

    // ---- Original image compression (kept for crop editing) ----
    /** Max pixel dimension for stored originals — keeps file size under quota */
    ORIG_MAX_DIMENSION: 1200,
    /** JPEG quality for stored originals (aggressive to save quota) */
    ORIG_JPEG_QUALITY: 0.65,

    // ---- Upload guards ----
    /** Accepted MIME types for upload */
    ACCEPTED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'],
    /** Maximum file size before compression (bytes) — reject larger files upfront */
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB

    // ---- Dedup ----
    /** dHash Hamming-distance threshold: ≤ this value → considered duplicate */
    DEDUP_HAMMING_THRESHOLD: 8,

    // ---- Mutation (applied at pick-time, never alters stored originals) ----
    /** Probability that mutation is enabled at all per pick */
    MUTATION_ENABLED: true,
    /** Per-mutation activation chances (0–1).  ~2–5 mutations fire per pick. */
    MUTATION_CHANCE_BRIGHTNESS: 0.40,
    MUTATION_CHANCE_CONTRAST: 0.35,
    MUTATION_CHANCE_SATURATION: 0.30,
    MUTATION_CHANCE_HUE: 0.15,
    MUTATION_CHANCE_FLIP: 0,
    MUTATION_CHANCE_ROTATE: 0.45,
    MUTATION_CHANCE_SCALE_JITTER: 0.30,
    /** Ranges */
    MUTATION_BRIGHTNESS_RANGE: [0.85, 1.15],   // multiplier
    MUTATION_CONTRAST_RANGE:   [0.88, 1.12],
    MUTATION_SATURATION_RANGE: [0.85, 1.15],
    MUTATION_HUE_RANGE:        [-4, 4],         // degrees
    MUTATION_ROTATE_RANGE:     [-2.5, 2.5],     // degrees
    MUTATION_SCALE_RANGE:      [1.0, 1.06],     // multiplier per axis (floor ≥ 1.0 prevents black borders)
    /** JPEG quality range for mutated output */
    MUTATION_QUALITY_RANGE:    [0.72, 0.85],

    // ---- Quality scoring (weighted random selection) ----
    /**
     * Per-image usage stats are persisted separately (bfw_img_stats) and
     * drive a weighted random selection algorithm.  High-quality images
     * get boosted probability; low-quality images are down-weighted but
     * never fully excluded — every image always has a non-zero chance.
     */
    QUALITY_SCORING: {
      /** Minimum uses before quality tier can drop below neutral */
      MIN_USES_FOR_ASSESSMENT: 3,
      /** Minimum failure count before an image can be classified as low-quality */
      LOW_QUALITY_FAILURE_THRESHOLD: 3,
      /** Failure rate (failures / totalUses) at or above this value → low quality */
      LOW_QUALITY_FAIL_RATE: 0.5,
      /** Success rate at or above this → high quality (requires enough uses) */
      HIGH_QUALITY_SUCCESS_RATE: 0.7,
      /** Minimum uses before an image can be classified as high-quality */
      HIGH_QUALITY_MIN_USES: 5,
      /** Weight multiplier for low-quality images (0.15 = 15% of neutral) */
      LOW_QUALITY_WEIGHT: 0.15,
      /** Weight multiplier for neutral / new images (baseline) */
      NEUTRAL_WEIGHT: 1.0,
      /** Weight multiplier for high-quality images */
      HIGH_QUALITY_WEIGHT: 2.5,
    },

    // ---- Storage ----
    /** Storage key prefix (shared across all storage backends) */
    STORAGE_KEY_PREFIX: 'bfw_img_',
    /** Metadata key */
    META_KEY: 'bfw_meta',
    /** Stats key for per-image quality tracking */
    STATS_KEY: 'bfw_img_stats',
  };

  // Face detection (smart crop) configuration
  const FACE_DETECT_CONFIG = {
    // ---- Tier 1: Native FaceDetector API ----
    /** Whether to attempt the browser-native FaceDetector API at all */
    NATIVE_ENABLED: true,
    /** Maximum time (ms) to wait for FaceDetector before falling back */
    DETECT_TIMEOUT_MS: 2000,
    /** Maximum number of faces to request from FaceDetector */
    MAX_FACES: 5,
    /** Prefer fast/low-accuracy mode for FaceDetector */
    FAST_MODE: true,

    // ---- Tier 2: Skin-color heuristic ----
    /** Downsample size for skin-color analysis (pixels on longest side) */
    SKIN_SAMPLE_SIZE: 80,
    /** Minimum skin-pixel count for heuristic to be considered valid */
    SKIN_MIN_PIXELS: 50,
    /** Grid dimensions for skin-pixel clustering (cols × rows) */
    SKIN_GRID_COLS: 4,
    SKIN_GRID_ROWS: 3,
    /** YCbCr skin-pixel thresholds (ITU-R BT.601, illumination-invariant) */
    SKIN_CB_MIN: 77,
    SKIN_CB_MAX: 127,
    SKIN_CR_MIN: 133,
    SKIN_CR_MAX: 173,

    // ---- Tier 3: Fixed-bias fallback ----
    /**
     * Vertical bias when no faces are detected by either tier.
     * Same value as IMAGE_POOL_CONFIG.CROP_FACE_BIAS — kept here as the
     * canonical source for the face-detection pipeline.
     */
    CROP_FALLBACK_BIAS: 0.38,

    // ---- Detection quality filters ----
    /** Minimum face bounding-box area as fraction of total image area */
    MIN_FACE_AREA_RATIO: 0.005,
    /** Minimum face bounding-box dimension in pixels (reject spurious tiny detections) */
    MIN_FACE_SIZE_PX: 10,
  };

  // Crop editor configuration
  const CROP_EDITOR_CONFIG = {
    /** Maximum displayed width/height in the editor (px) — image is scaled to fit */
    MAX_DISPLAY_SIZE: 480,
    /** Handle radius for interaction hit-testing (px) */
    HANDLE_RADIUS: 10,
    /** Handle visual size in CSS (px) */
    HANDLE_SIZE: 12,
    /** Minimum crop rectangle size in source pixels */
    MIN_CROP_PX: 20,
    /** Target aspect ratio (width / height) */
    TARGET_RATIO: 4 / 3,
    /** Live preview thumbnail size (px, square bounding box) */
    PREVIEW_SIZE: 72,
  };

  /**
   * @file Media configuration — video stream replacement, frame capture, and overlay.
   * @module config/media
   */

  // Video stream replacement configuration
  const VIDEO_REPLACE_CONFIG = {
    /** Default canvas width when constraints don't specify */
    DEFAULT_WIDTH: 640,
    /** Default canvas height when constraints don't specify */
    DEFAULT_HEIGHT: 480,
    /** Canvas stream FPS */
    STREAM_FPS: 30,
    /** Subtle brightness jitter range (±this fraction) to simulate live camera */
    BRIGHTNESS_JITTER: 0.02,
  };

  // Video frame capture selectors (for manual "capture" button)
  const VIDEO_CAPTURE_SELECTORS = ['#video', '.main_content', 'video[autoplay]', 'video'];

  /**
   * @file Core configuration constants for baifenwang-auto-study.
   *
   * Domain-specific configs are in config/pool.js and config/media.js.
   */

  // Script metadata
  const SCRIPT_NAME = '百分网自动刷课助手';
  const SCRIPT_VERSION = '1.0.0';
  const GITHUB_URL = 'https://github.com/TheSkyC/baifenwang-auto-study';
  const UPDATE_API_URL = 'https://baifenwang-auto-study.tarxf.com';

  // Log level
  const LOG_LEVEL = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  };

  // Current log level (change to LOG_LEVEL.DEBUG for verbose output)
  const CURRENT_LOG_LEVEL = LOG_LEVEL.INFO;

  // Settings storage key (shared across GM, localStorage, and in-memory backends)
  const SETTINGS_KEY = 'bfw_settings';

  // Progress tracker storage key
  const PROGRESS_TRACKER_KEY = 'bfw_progress';

  // Progress tracker behavior thresholds
  const PROGRESS_TRACKER_CONFIG = {
    /** Sessions shorter than this (seconds) with 0 lessons completed are discarded on end. */
    MIN_SESSION_DURATION_S: 30,
    /** Unfinished sessions older than this (ms) are not resumed — treated as abandoned. */
    RESUME_MAX_AGE_MS: 4 * 60 * 60 * 1000,  // 4 hours
  };

  // Retry settings for auto-processor
  const AUTO_CONFIG = {
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
     *  because the page still shows both "重新拍照" and "开始对比" buttons. */
    COMPARE_COOLDOWN_MS: 4000,
    /** Delay after clicking retry button before camera-open click (ms).
     *  Used by onRetry() as a bridge between retry and the normal pipeline. */
    RETRY_CAMERA_DELAY_MS: 800,
  };

  // Auto-course (自动刷课) configuration
  const COURSE_CONFIG = {
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
    MAX_RESUME_ATTEMPTS: 3};

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
  function jitterMs(baseMs, factor = 0.3) {
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
  function jitterMsFloor(baseMs, factor = 0.3) {
    const f = Math.min(Math.max(factor, 0), 1);
    return Math.round(baseMs * (1 + Math.random() * f));
  }

  /**
   * @file Logger utility with colored console output
   * Provides leveled logging with script prefix and optional styles.
   */


  const STYLES$1 = {
    debug: 'color: #888; font-style: italic;',
    info: 'color: #2196F3; font-weight: bold;',
    warn: 'color: #FF9800; font-weight: bold;',
    error: 'color: #F44336; font-weight: bold;',
  };

  const LABELS = {
    debug: 'DBG',
    info: 'INF',
    warn: 'WRN',
    error: 'ERR',
  };

  function shouldLog(level) {
    return level >= CURRENT_LOG_LEVEL;
  }

  function formatPrefix(level) {
    return `%c[${SCRIPT_NAME}][${LABELS[level]}]`;
  }

  /**
   * Log a debug-level message (verbose, hidden by default).
   * @param  {...any} args - Values to log
   */
  function debug(...args) {
    if (!shouldLog(LOG_LEVEL.DEBUG)) return;
    console.log(formatPrefix(LOG_LEVEL.DEBUG), STYLES$1.debug, ...args);
  }

  /**
   * Log an info-level message.
   * @param  {...any} args - Values to log
   */
  function info(...args) {
    if (!shouldLog(LOG_LEVEL.INFO)) return;
    console.log(formatPrefix(LOG_LEVEL.INFO), STYLES$1.info, ...args);
  }

  /**
   * Log a warning-level message.
   * @param  {...any} args - Values to log
   */
  function warn(...args) {
    if (!shouldLog(LOG_LEVEL.WARN)) return;
    console.warn(formatPrefix(LOG_LEVEL.WARN), STYLES$1.warn, ...args);
  }

  /**
   * Log an error-level message.
   * @param  {...any} args - Values to log
   */
  function error(...args) {
    if (!shouldLog(LOG_LEVEL.ERROR)) return;
    console.error(formatPrefix(LOG_LEVEL.ERROR), STYLES$1.error, ...args);
  }

  /**
   * @file Storage adapter — unified multi-backend persistent storage.
   *
   * Backends (tried in order):
   *   1. localStorage (per-origin, persistent, ~5 MB)
   *   2. In-memory Map (session-only fallback)
   *
   * All public methods return Promises so callers never need to distinguish
   * between sync and async backends.
   *
   * Note: GM sandbox storage (GM_setValue / GM.getValue) is intentionally NOT
   * used because it would require @grant annotations that sandbox the script
   * away from page globals — every DOM / navigator access would then need
   * unsafeWindow.*, which is a disproportionate refactor for the modest quota
   * gain.  localStorage is reliable and sufficient for a compressed face-image
   * pool.
   *
   * @module utils/storage-adapter
   */


  // ---------------------------------------------------------------------------
  // Adapter type
  // ---------------------------------------------------------------------------

  /**
   * @typedef {Object} StorageAdapter
   * @property {(key: string) => Promise<string|null>} get
   * @property {(key: string, value: string) => Promise<void>} set
   * @property {(key: string) => Promise<void>} remove
   * @property {() => Promise<string[]>} keys
   */

  // ---------------------------------------------------------------------------
  // Cached singleton
  // ---------------------------------------------------------------------------

  /** @type {StorageAdapter|null} */
  let _adapter = null;

  // ---------------------------------------------------------------------------
  // Backend detectors
  // ---------------------------------------------------------------------------

  /**
   * Try localStorage (per-origin, persistent).
   * @returns {StorageAdapter|null}
   */
  function detectLocalStorage() {
    try {
      const testKey = '__bfw_storage_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return {
        get: (key) => Promise.resolve(localStorage.getItem(key)),
        set: (key, value) => { localStorage.setItem(key, value); return Promise.resolve(); },
        remove: (key) => { localStorage.removeItem(key); return Promise.resolve(); },
        keys: () => {
          const out = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k) out.push(k);
          }
          return Promise.resolve(out);
        },
      };
    } catch (_) { /* unavailable (private browsing, quota, etc.) */ }
    return null;
  }

  /**
   * Build an in-memory fallback adapter (session-only, always available).
   * @returns {StorageAdapter}
   */
  function createMemoryAdapter() {
    const store = new Map();
    return {
      get: (key) => Promise.resolve(store.get(key) ?? null),
      set: (key, value) => { store.set(key, value); return Promise.resolve(); },
      remove: (key) => { store.delete(key); return Promise.resolve(); },
      keys: () => Promise.resolve(Array.from(store.keys())),
    };
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Return the best available storage adapter (cached after first call).
   *
   * Detection order: localStorage → in-memory.
   *
   * @returns {StorageAdapter}
   */
  function getStorageAdapter() {
    if (_adapter) return _adapter;

    // 1. localStorage
    _adapter = detectLocalStorage();
    if (_adapter) { debug('Storage: using localStorage adapter'); return _adapter; }

    // 2. In-memory fallback
    warn('Storage: no persistent backend available, using in-memory (session-only)');
    _adapter = createMemoryAdapter();
    return _adapter;
  }

  /**
   * @file Settings state — centralized toggleable configuration for the userscript.
   *
   * Settings are persisted across page reloads via utils/storage-adapter.js.
   * On load, persisted values are merged over defaults; on every change the
   * full state is flushed to storage.
   *
   * Reserved for future expansion: auto-course (自动刷课) settings group.
   */


  // ---------------------------------------------------------------------------
  // Defaults — the source of truth for all setting keys and their initial values
  // ---------------------------------------------------------------------------

  const DEFAULTS = {
    /** Enable auto-click for face verification UI elements */
    faceAutoClick: true,
    /** Replace the camera video stream with a pool image (getUserMedia interception) */
    videoReplace: true,
    /** Auto-compare after photo — when OFF, pauses after photo for manual confirmation */
    autoCompare: true,

    // ---- Auto-course (自动刷课) ----
    /** Enable auto-course processor — auto-plays course videos and monitors progress */
    autoCourse: false,
    /** Prevent the site from detecting tab-switch / window minimization */
    disableVisibilityCheck: false,

    // ---- Image pool ----
    /** Enable weighted random selection based on per-image quality stats */
    dynamicWeight: true,
  };

  // ---------------------------------------------------------------------------
  // State & listeners
  // ---------------------------------------------------------------------------

  /** @type {{ [key: string]: Array<(val: any) => void> }} */
  const listeners = {};

  /** Runtime state (defaults merged with persisted values after init). */
  const state = { ...DEFAULTS };

  /** Whether the persisted state has been loaded. */
  let loaded$1 = false;

  /**
   * Load persisted settings from storage and merge over defaults.
   * Called once during initialization; safe to call multiple times (idempotent).
   */
  async function loadSettings() {
    if (loaded$1) return;

    try {
      const raw = await getStorageAdapter().get(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          // Only merge keys that exist in DEFAULTS — ignore unknown/stale keys
          for (const key of Object.keys(DEFAULTS)) {
            if (key in parsed && typeof parsed[key] === typeof DEFAULTS[key]) {
              state[key] = parsed[key];
            }
          }
          debug('Settings: loaded from storage');
        }
      }
    } catch (e) {
      warn('Settings: failed to load from storage, using defaults:', e);
    }

    loaded$1 = true;
    info(`Settings ready: faceAutoClick=${state.faceAutoClick}, videoReplace=${state.videoReplace}, autoCompare=${state.autoCompare}, autoCourse=${state.autoCourse}, disableVisibilityCheck=${state.disableVisibilityCheck}, dynamicWeight=${state.dynamicWeight}`);
  }

  /**
   * Persist the current state to storage (best-effort).
   */
  async function saveSettings() {
    try {
      await getStorageAdapter().set(SETTINGS_KEY, JSON.stringify(state));
    } catch (e) {
      warn('Settings: failed to persist:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Get the value of a setting.
   *
   * When settings have been loaded (the normal case after DOMContentLoaded)
   * the in-memory state is returned.  Before that — during the document-start
   * window when interceptors are already installed but loadSettings() hasn't
   * run yet — a synchronous localStorage read is attempted so that persisted
   * preferences are honoured from the very first intercepted call.
   *
   * @template T
   * @param {string} key
   * @param {T} [fallback]
   * @returns {T}
   */
  function getSetting(key, fallback) {
    // Fast path: settings already loaded
    if (loaded$1) {
      return key in state ? state[key] : fallback;
    }

    // Pre-init path: try a synchronous localStorage peek so interceptors
    // that fire before DOMContentLoaded (e.g. video-interceptor) see the
    // user's actual preference instead of the hard-coded default.
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object'
            && key in parsed
            && typeof parsed[key] === typeof DEFAULTS[key]) {
          return parsed[key];
        }
      }
    } catch (_) { /* localStorage unavailable or corrupt — use fallback */ }

    return fallback;
  }

  /**
   * Set a setting value, persist it, and notify listeners.
   * @param {string} key
   * @param {*} value
   */
  function setSetting(key, value) {
    const old = state[key];
    if (old === value) return;
    state[key] = value;

    // Fire-and-forget persistence — never block the UI
    saveSettings();

    if (listeners[key]) {
      listeners[key].forEach((fn) => { try { fn(value); } catch (_) { /* noop */ } });
    }
  }

  /**
   * Register a listener for changes to a setting.
   * @param {string} key
   * @param {(val: any) => void} fn
   * @returns {() => void} Unsubscribe function
   */
  function onChange(key, fn) {
    if (!listeners[key]) listeners[key] = [];
    listeners[key].push(fn);
    return () => {
      listeners[key] = listeners[key].filter((f) => f !== fn);
    };
  }

  /**
   * Check whether face auto-click is enabled.
   * Convenience aggregator — used by the auto-processor to decide whether to run.
   * @returns {boolean}
   */
  function isFaceAutoActive() {
    return state.faceAutoClick;
  }

  /**
   * @file Progress tracker — persistent learning session history and statistics.
   *
   * Responsibilities:
   *   1. Track learning sessions (start/end time, chapters/lessons completed, duration).
   *   2. Store per-course statistics (total lessons, completion date, last studied).
   *   3. Calculate aggregate stats (total study time, completion rate, daily activity).
   *   4. Provide queryable history for UI display (today, this week, all time).
   *
   * Storage schema:
   *   {
   *     sessions: [{ id, courseId, startTime, endTime, chaptersCompleted, lessonsCompleted, duration }],
   *     courses: { [courseId]: { name, totalLessons, completedCount, firstStudy, lastStudy, sessions } }
   *   }
   */


  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  /** Current schema version for progress data */
  const SCHEMA_VERSION = 1;

  // ---------------------------------------------------------------------------
  // Utility Functions
  // ---------------------------------------------------------------------------

  /**
   * Format a timestamp as YYYY-MM-DD.
   * @param {number} timestamp - Unix timestamp in milliseconds
   * @returns {string}
   */
  function formatDate(timestamp) {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /**
   * Format a timestamp as YYYY-MM-DD HH:MM.
   * @param {number} timestamp - Unix timestamp in milliseconds
   * @returns {string}
   */
  function formatDateTime(timestamp) {
    const d = new Date(timestamp);
    return `${formatDate(timestamp)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  /** In-memory cache of progress data */
  let progressData = {
    version: SCHEMA_VERSION,
    sessions: [],
    courses: {},
    lastSync: 0,
  };

  /** Whether data has been loaded from storage */
  let loaded = false;

  /** Current session tracking */
  let currentSession = null;

  /** Debounce timer for saveProgressData */
  let saveTimer = null;

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  /**
   * Migrate old data format to the current schema version.
   * @param {Object} data - Raw data from storage
   * @returns {Object} Migrated data
   */
  function migrateData(data) {
    const version = data.version || 0;

    // Version 0 → 1: Add version field
    if (version === 0) {
      debug('ProgressTracker: migrating data from v0 to v1');
      data.version = 1;
      // V0 to V1: no schema changes, just add version field
    }

    // Future migrations go here:
    // if (version === 1) { ... migrate to v2 ... }

    return data;
  }

  /**
   * Validate and sanitize progress data schema.
   * Ensures all required fields exist and are of the correct type.
   * @param {Object} data - Data object to validate
   * @returns {Object} Validated and sanitized data
   */
  function validateSchema(data) {
    // Ensure top-level structure
    if (!data || typeof data !== 'object') {
      warn('ProgressTracker: invalid data object, resetting to empty');
      return {
        version: SCHEMA_VERSION,
        sessions: [],
        courses: {},
        lastSync: Date.now(),
      };
    }

    // Validate version
    if (typeof data.version !== 'number') {
      data.version = SCHEMA_VERSION;
    }

    // Validate sessions array
    if (!Array.isArray(data.sessions)) {
      warn('ProgressTracker: sessions is not an array, resetting');
      data.sessions = [];
    } else {
      // Filter out invalid session entries
      data.sessions = data.sessions.filter(s => {
        if (!s || typeof s !== 'object') return false;
        if (typeof s.id !== 'string') return false;
        if (typeof s.courseId !== 'string') return false;
        if (typeof s.startTime !== 'number') return false;
        // endTime can be null for unfinished sessions
        if (s.endTime !== null && typeof s.endTime !== 'number') return false;
        return true;
      });
    }

    // Validate courses object
    if (typeof data.courses !== 'object' || data.courses === null || Array.isArray(data.courses)) {
      warn('ProgressTracker: courses is not an object, resetting');
      data.courses = {};
    } else {
      // Sanitize course entries
      for (const [courseId, course] of Object.entries(data.courses)) {
        if (!course || typeof course !== 'object') {
          delete data.courses[courseId];
          continue;
        }
        // Ensure required fields exist with defaults
        if (typeof course.name !== 'string') course.name = 'Unknown Course';
        if (typeof course.totalLessons !== 'number') course.totalLessons = 0;
        if (typeof course.completedCount !== 'number') course.completedCount = 0;
        if (typeof course.firstStudy !== 'number') course.firstStudy = Date.now();
        if (!Array.isArray(course.sessions)) course.sessions = [];
      }
    }

    // Validate lastSync
    if (typeof data.lastSync !== 'number') {
      data.lastSync = Date.now();
    }

    return data;
  }

  /**
   * Load progress history from storage.
   * Called once during boot; idempotent.
   */
  async function loadProgressTracker() {
    if (loaded) return;

    try {
      const raw = await getStorageAdapter().get(PROGRESS_TRACKER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const migrated = migrateData(parsed);
          const validated = validateSchema(migrated);
          progressData = validated;

          // Seal any unfinished sessions that are too old to resume.
          // These are leftovers from a hard crash or a browser kill — they were
          // pre-persisted by startSession() but never reached endSession().
          const resumeAge = PROGRESS_TRACKER_CONFIG.RESUME_MAX_AGE_MS;
          let sealedCount = 0;
          for (const s of progressData.sessions) {
            if (s.endTime === null && (Date.now() - s.startTime) >= resumeAge) {
              s.endTime = s.startTime;  // zero-duration; will be skipped by stats
              s.duration = 0;
              sealedCount++;
            }
          }
          if (sealedCount > 0) {
            debug(`ProgressTracker: sealed ${sealedCount} stale unfinished session(s)`);
          }

          debug(`ProgressTracker: loaded ${progressData.sessions.length} sessions, ${Object.keys(progressData.courses).length} courses (schema v${progressData.version})`);
        }
      }
    } catch (e) {
      warn('ProgressTracker: failed to load from storage:', e);
    }

    loaded = true;
  }

  /**
   * Persist the current progress data to storage (best-effort).
   */
  async function saveProgressData() {
    try {
      progressData.lastSync = Date.now();
      await getStorageAdapter().set(PROGRESS_TRACKER_KEY, JSON.stringify(progressData));
    } catch (e) {
      warn('ProgressTracker: failed to persist:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // Session Management
  // ---------------------------------------------------------------------------

  /**
   * Start a new learning session.
   * Returns a session ID that should be passed to endSession().
   *
   * @param {string} courseId - Unique course identifier
   * @param {string} courseName - Human-readable course name
   * @returns {string} Session ID
   */
  function startSession(courseId, courseName) {
    // Fast path: in-memory session for the same course is still live
    if (currentSession && currentSession.courseId === courseId) {
      debug(`ProgressTracker: resuming in-memory session ${currentSession.id}`);
      return currentSession.id;
    }

    // If there's a different in-memory session, end it first
    if (currentSession) {
      warn(`ProgressTracker: ending previous session ${currentSession.id} before starting new one`);
      endSession().catch(e => warn('Failed to end previous session:', e));
    }

    // Cross-refresh recovery: look for an unfinished persisted session for this
    // course that was abandoned (e.g. tab reload, SPA navigation).  Only resume
    // if it started recently enough to still be meaningful.
    const resumeAge = PROGRESS_TRACKER_CONFIG.RESUME_MAX_AGE_MS;
    const unfinished = progressData.sessions.findLast(
      s => s.courseId === courseId && s.endTime === null && (Date.now() - s.startTime) < resumeAge,
    );

    if (unfinished) {
      currentSession = { ...unfinished };
      debug(`ProgressTracker: recovered unfinished session ${unfinished.id} after page reload`);
      return unfinished.id;
    }

    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    currentSession = {
      id: sessionId,
      courseId,
      courseName,
      startTime: Date.now(),
      endTime: null,
      chaptersCompleted: 0,
      lessonsCompleted: 0,
      duration: 0,
    };

    // Initialize course record if not exists
    if (!(courseId in progressData.courses)) {
      progressData.courses[courseId] = {
        name: courseName,
        totalLessons: 0,
        completedCount: 0,
        firstStudy: Date.now(),
        lastStudy: null,
        sessions: [],
      };
    }

    // Persist the new session immediately so it can be recovered on page reload
    // before endSession() is ever called.
    progressData.sessions.push(currentSession);
    saveProgressData().catch(e => warn('ProgressTracker: failed to persist new session:', e));

    debug(`ProgressTracker: started session ${sessionId} for course "${courseName}"`);
    return sessionId;
  }

  /**
   * Update the current session with progress data.
   * Should be called periodically (e.g., on every course-processor tick).
   * Changes are debounced and saved after 5 seconds of inactivity.
   *
   * @param {number} chaptersCompleted
   * @param {number} lessonsCompleted
   * @param {number} totalLessons
   */
  function updateSession(chaptersCompleted, lessonsCompleted, totalLessons) {
    if (!currentSession) return;

    currentSession.chaptersCompleted = chaptersCompleted;
    currentSession.lessonsCompleted = lessonsCompleted;

    // Update course total if we discover a new max
    const course = progressData.courses[currentSession.courseId];
    if (course && totalLessons > course.totalLessons) {
      course.totalLessons = totalLessons;
    }

    // NOTE: Do NOT update completedCount here — it should only be set in endSession
    // to avoid the data getting stuck at historical max values when users re-take courses.
    // The session already tracks lessonsCompleted, which is the source of truth.

    // Debounced save (avoid excessive writes during active learning)
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveProgressData().catch(e => warn('ProgressTracker: debounced save failed:', e));
    }, 5000);
  }

  /**
   * End the current session and save it to history.
   * Should be called when leaving a course or stopping learning.
   * Clears any pending debounced saves and immediately persists.
   */
  async function endSession() {
    if (!currentSession) return;

    // Clear pending debounced save since we're doing an immediate save
    clearTimeout(saveTimer);
    saveTimer = null;

    currentSession.endTime = Date.now();
    currentSession.duration = Math.round((currentSession.endTime - currentSession.startTime) / 1000);

    // Discard sessions that are too short and produced nothing — these are
    // almost always page reloads or SPA navigations that fired stopCourseMonitor
    // before any real learning happened.
    const { MIN_SESSION_DURATION_S } = PROGRESS_TRACKER_CONFIG;
    if (currentSession.duration < MIN_SESSION_DURATION_S && currentSession.lessonsCompleted === 0) {
      // Remove the pre-persisted placeholder written in startSession
      const idx = progressData.sessions.findIndex(s => s.id === currentSession.id);
      if (idx !== -1) progressData.sessions.splice(idx, 1);

      debug(`ProgressTracker: discarded trivial session ${currentSession.id} (${currentSession.duration}s, 0 lessons)`);
      currentSession = null;
      await saveProgressData();
      return;
    }

    // Update the in-place record that was persisted during startSession
    const existing = progressData.sessions.find(s => s.id === currentSession.id);
    if (existing) {
      Object.assign(existing, currentSession);
    } else {
      // Fallback: session was not pre-persisted (e.g. recovered via findLast path
      // after a reload where the old entry already had an endTime).
      progressData.sessions.push(currentSession);
    }

    // Update course record
    const course = progressData.courses[currentSession.courseId];
    if (course) {
      course.lastStudy = currentSession.endTime;
      course.completedCount = currentSession.lessonsCompleted;
      course.sessions = (course.sessions || []).includes(currentSession.id)
        ? course.sessions
        : (course.sessions || []).concat(currentSession.id);
    }

    debug(`ProgressTracker: ended session ${currentSession.id}, duration ${currentSession.duration}s`);

    currentSession = null;
    await saveProgressData();
  }

  // ---------------------------------------------------------------------------
  // Statistics & Queries
  // ---------------------------------------------------------------------------

  /**
   * Get today's statistics.
   * @returns {{ sessionsCount: number, totalDuration: number, lessonsCompleted: number, coursesStudied: Set<string> }}
   */
  function getTodayStats() {
    const now = Date.now();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todaySessions = progressData.sessions.filter(s => s.endTime && s.endTime >= todayStart.getTime());

    return {
      sessionsCount: todaySessions.length,
      totalDuration: Math.round(todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60),
      lessonsCompleted: todaySessions.reduce((sum, s) => sum + s.lessonsCompleted, 0),
      coursesStudied: new Set(todaySessions.map(s => s.courseId)),
    };
  }

  /**
   * Get this week's statistics (last 7 days).
   * @returns {{ sessionsCount: number, totalDuration: number, lessonsCompleted: number, daysActive: number }}
   */
  function getWeekStats() {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const weekStart = now - weekMs;

    const weekSessions = progressData.sessions.filter(s => s.endTime && s.endTime >= weekStart);

    const daysActive = new Set(
      weekSessions.map(s => formatDate(s.endTime))
    ).size;

    return {
      sessionsCount: weekSessions.length,
      totalDuration: Math.round(weekSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60),
      lessonsCompleted: weekSessions.reduce((sum, s) => sum + s.lessonsCompleted, 0),
      daysActive,
    };
  }

  /**
   * Get daily study duration for the last N days (for chart visualization).
   * Returns an array of { date, duration, label } ordered from oldest to newest.
   *
   * @param {number} [days=7] - Number of days to include
   * @returns {Array<{date: string, duration: number, label: string}>}
   */
  function getDailyTrendData(days = 7) {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Build a map of date -> total duration (in minutes)
    const dailyMap = new Map();

    // Initialize all days with 0
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * dayMs);
      d.setHours(0, 0, 0, 0);
      const key = formatDate(d.getTime());
      dailyMap.set(key, 0);
    }

    // Aggregate session durations by date
    progressData.sessions.forEach(s => {
      if (!s.endTime) return;
      const sessionDate = new Date(s.endTime);
      sessionDate.setHours(0, 0, 0, 0);
      const key = formatDate(sessionDate.getTime());
      if (dailyMap.has(key)) {
        dailyMap.set(key, dailyMap.get(key) + Math.round((s.duration || 0) / 60));
      }
    });

    // Convert to array with short labels (e.g., "周一", "周二", or "1/15")
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * dayMs);
      d.setHours(0, 0, 0, 0);
      const key = formatDate(d.getTime());
      const dayOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
      const monthDay = `${d.getMonth() + 1}/${d.getDate()}`;
      result.push({
        date: key,
        duration: dailyMap.get(key) || 0,
        label: days <= 7 ? dayOfWeek : monthDay,
      });
    }

    return result;
  }

  /**
   * Get all-time statistics.
   * @returns {{ sessionsCount: number, totalDuration: number, lessonsCompleted: number, coursesCount: number, totalLessons: number }}
   */
  function getAllTimeStats() {
    const totalDuration = Math.round(
      progressData.sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60
    );

    const totalLessons = Object.values(progressData.courses).reduce(
      (sum, course) => sum + (course.totalLessons || 0),
      0
    );

    return {
      sessionsCount: progressData.sessions.length,
      totalDuration,
      lessonsCompleted: progressData.sessions.reduce((sum, s) => sum + s.lessonsCompleted, 0),
      coursesCount: Object.keys(progressData.courses).length,
      totalLessons,
    };
  }

  /**
   * Get recent sessions for display.
   * @param {number} [limit=10]
   * @returns {Array}
   */
  function getRecentSessions(limit = 10) {
    return progressData.sessions
      .slice(-limit)
      .reverse()
      .map(s => ({
        ...s,
        durationMin: Math.round(s.duration / 60),
        startDate: formatDateTime(s.startTime),
      }));
  }

  /**
   * Get all courses sorted by last study time (most recent first).
   * @returns {Array}
   */
  function getCoursesList() {
    return Object.entries(progressData.courses)
      .map(([id, data]) => {
        // Calculate total study time from all sessions for this course
        const courseSessions = progressData.sessions.filter(s => s.courseId === id);
        const totalStudyTime = Math.round(
          courseSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60
        );

        return {
          id,
          ...data,
          completionRate: data.totalLessons > 0 ? Math.round((data.completedCount / data.totalLessons) * 100) : 0,
          totalStudyTime,
        };
      })
      .sort((a, b) => (b.lastStudy || 0) - (a.lastStudy || 0));
  }

  /**
   * Clear all progress history (destructive).
   * Use with caution.
   */
  async function clearAllProgress() {
    progressData = {
      version: SCHEMA_VERSION,
      sessions: [],
      courses: {},
      lastSync: Date.now(),
    };
    currentSession = null;
    await saveProgressData();
    debug('ProgressTracker: cleared all progress history');
  }

  /**
   * Export progress data as JSON (for backup/sharing).
   * @returns {Object}
   */
  function exportProgress() {
    return JSON.parse(JSON.stringify(progressData));
  }

  /**
   * Get cached progress data reference (read-only).
   * @returns {Object}
   */
  function getProgressData() {
    return progressData;
  }

  /**
   * @file Face-detection-aware smart cropping.
   *
   * Three-tier pipeline for positioning the crop window:
   *
   *   Tier 1: Browser-native FaceDetector API (Chrome/Edge, secure context)
   *           → area-weighted centroid of all detected faces
   *
   *   Tier 2: Skin-color heuristic (YCbCr on downscaled canvas)
   *           → density-cluster centroid of skin-tone pixels
   *
   *   Tier 3: Fixed vertical bias (CROP_FALLBACK_BIAS = 0.38)
   *           → identical to the previous hard-coded behaviour
   *
   * Each tier falls through silently on failure so the pipeline degrades
   * gracefully on any browser.
   */


  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Smart-crop an image to the standard output dimensions (400×300).
   *
   * Attempts face detection to position the crop window around the most
   * visually important region.  Falls back to a fixed vertical bias when
   * no faces or skin regions can be found.
   *
   * @param {HTMLImageElement} img - decoded image (onload already fired)
   * @returns {Promise<{ dataUrl: string, width: number, height: number }>}
   */
  async function smartCropToStandard(img) {
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;

    // Run the face-detection pipeline
    const faces = await detectFaces(img);

    let attentionX, attentionY, cropBias;

    if (faces && faces.length > 0) {
      // Area-weighted centroid of all detected faces
      let totalWeight = 0;
      attentionX = 0;
      attentionY = 0;
      for (const f of faces) {
        const area = f.width * f.height;
        attentionX += (f.x + f.width / 2) * area;
        attentionY += (f.y + f.height / 2) * area;
        totalWeight += area;
      }
      attentionX /= totalWeight;
      attentionY /= totalWeight;
      // Faces detected → center them in the output (0.6)
      cropBias = 0.60;
      debug(`Smart crop: ${faces.length} face(s) detected, attention at (${attentionX.toFixed(0)}, ${attentionY.toFixed(0)})`);
    } else {
      // Tier 3 fallback: no faces — use heuristic upper bias
      attentionX = srcW / 2;
      attentionY = srcH * FACE_DETECT_CONFIG.CROP_FALLBACK_BIAS;
      cropBias = FACE_DETECT_CONFIG.CROP_FALLBACK_BIAS;
      debug('Smart crop: no faces detected, using fixed bias fallback');
    }

    const cropRect = computeCropRect(srcW, srcH, attentionX, attentionY, cropBias);
    const result = renderCrop(img, cropRect);
    return { ...result, cropRect };
  }

  // ---------------------------------------------------------------------------
  // Detection orchestrator
  // ---------------------------------------------------------------------------

  /**
   * Run the three-tier detection pipeline.
   *
   * @param {HTMLImageElement} img
   * @returns {Promise<Array<{x:number,y:number,width:number,height:number}>|null>}
   */
  async function detectFaces(img) {
    // Tier 1: Native FaceDetector API
    {
      const nativeFaces = await detectFacesNative(img);
      if (nativeFaces && nativeFaces.length > 0) return nativeFaces;
    }

    // Tier 2: Skin-color heuristic
    const skinFaces = detectFacesSkinHeuristic(img);
    if (skinFaces && skinFaces.length > 0) return skinFaces;

    // Tier 3: nothing found — caller uses fixed bias
    return null;
  }

  // ---------------------------------------------------------------------------
  // Tier 1: Browser-native FaceDetector
  // ---------------------------------------------------------------------------

  /**
   * Detect faces using the Shape Detection API (FaceDetector).
   * Available in Chrome/Edge when window.isSecureContext is true.
   *
   * @param {HTMLImageElement} img
   * @returns {Promise<Array<{x:number,y:number,width:number,height:number}>|null>}
   */
  async function detectFacesNative(img) {
    // Secure-context gate — FaceDetector throws on HTTP pages
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      debug('FaceDetector: skipping (not a secure context)');
      return null;
    }

    // API availability gate
    if (typeof FaceDetector === 'undefined') {
      debug('FaceDetector: API not available in this browser');
      return null;
    }

    try {
      const detector = new FaceDetector({
        maxDetectedFaces: FACE_DETECT_CONFIG.MAX_FACES,
        fastMode: FACE_DETECT_CONFIG.FAST_MODE,
      });

      // Race against timeout to avoid hanging on problematic images
      const faces = await Promise.race([
        detector.detect(img),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('FaceDetector timeout')),
            FACE_DETECT_CONFIG.DETECT_TIMEOUT_MS),
        ),
      ]);

      if (!Array.isArray(faces) || faces.length === 0) {
        debug('FaceDetector: no faces found');
        return null;
      }

      // Filter out spurious tiny detections
      const srcArea = img.naturalWidth * img.naturalHeight;
      const minArea = srcArea * FACE_DETECT_CONFIG.MIN_FACE_AREA_RATIO;
      const minSize = FACE_DETECT_CONFIG.MIN_FACE_SIZE_PX;

      const filtered = faces
        .map((f) => ({
          x: f.boundingBox.x,
          y: f.boundingBox.y,
          width: f.boundingBox.width,
          height: f.boundingBox.height,
        }))
        .filter((f) =>
          f.width >= minSize && f.height >= minSize && f.width * f.height >= minArea,
        );

      if (filtered.length === 0) {
        debug('FaceDetector: all detections below minimum size, filtered out');
        return null;
      }

      debug(`FaceDetector: found ${filtered.length} face(s) (from ${faces.length} raw detections)`);
      return filtered;
    } catch (e) {
      debug(`FaceDetector: failed — ${e.message || e}`);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Tier 2: Skin-color heuristic (YCbCr on downscaled canvas)
  // ---------------------------------------------------------------------------

  /**
   * Estimate face position by detecting clusters of skin-tone pixels.
   *
   * Down-scales the image to a small canvas, converts each pixel to YCbCr,
   * classifies skin pixels using established chrominance thresholds, then
   * finds the grid cell with the highest density and expands to adjacent
   * cells above a threshold to produce a bounding rectangle.
   *
   * @param {HTMLImageElement} img
   * @returns {Array<{x:number,y:number,width:number,height:number}>|null}
   */
  function detectFacesSkinHeuristic(img) {
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    const cfg = FACE_DETECT_CONFIG;

    // Down-scale to a small sample canvas to keep cost under ~5ms
    const scale = Math.min(cfg.SKIN_SAMPLE_SIZE / srcW, cfg.SKIN_SAMPLE_SIZE / srcH);
    const cw = Math.max(1, Math.round(srcW * scale));
    const ch = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, cw, ch);

    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, cw, ch);
    } catch (_) {
      debug('Skin heuristic: canvas tainted, cannot read pixels');
      return null;
    }

    const { data } = imageData;
    const gridCols = cfg.SKIN_GRID_COLS;
    const gridRows = cfg.SKIN_GRID_ROWS;
    const grid = Array.from({ length: gridRows }, () => new Array(gridCols).fill(0));

    const cellW = cw / gridCols;
    const cellH = ch / gridRows;
    let totalSkin = 0;

    // Classify each pixel using YCbCr chrominance thresholds
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // RGB → YCbCr (ITU-R BT.601 simplified)
      const cb = 128 - 0.169 * r - 0.331 * g + 0.500 * b;
      const cr = 128 + 0.500 * r - 0.419 * g - 0.081 * b;

      if (cb >= cfg.SKIN_CB_MIN && cb <= cfg.SKIN_CB_MAX
          && cr >= cfg.SKIN_CR_MIN && cr <= cfg.SKIN_CR_MAX) {
        const px = (i / 4) % cw;
        const py = Math.floor((i / 4) / cw);
        const col = Math.min(Math.floor(px / cellW), gridCols - 1);
        const row = Math.min(Math.floor(py / cellH), gridRows - 1);
        grid[row][col]++;
        totalSkin++;
      }
    }

    // Not enough skin pixels to be meaningful
    if (totalSkin < cfg.SKIN_MIN_PIXELS) {
      debug(`Skin heuristic: only ${totalSkin} skin pixels (need ${cfg.SKIN_MIN_PIXELS})`);
      return null;
    }

    // Find the densest cell
    let maxDensity = 0;
    let bestRow = 0;
    let bestCol = 0;
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        if (grid[r][c] > maxDensity) {
          maxDensity = grid[r][c];
          bestRow = r;
          bestCol = c;
        }
      }
    }

    // Expand to adjacent cells with ≥50% of peak density
    const threshold = maxDensity * 0.5;
    let minCol = bestCol;
    let maxCol = bestCol;
    let minRow = bestRow;
    let maxRow = bestRow;

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        if (grid[r][c] >= threshold) {
          if (c < minCol) minCol = c;
          if (c > maxCol) maxCol = c;
          if (r < minRow) minRow = r;
          if (r > maxRow) maxRow = r;
        }
      }
    }

    // Map bounding rectangle back to source coordinates
    const faceX = minCol * (srcW / gridCols);
    const faceY = minRow * (srcH / gridRows);
    const faceW = (maxCol - minCol + 1) * (srcW / gridCols);
    const faceH = (maxRow - minRow + 1) * (srcH / gridRows);

    debug(`Skin heuristic: cluster at (${faceX.toFixed(0)}, ${faceY.toFixed(0)}), ${faceW.toFixed(0)}×${faceH.toFixed(0)}, ${totalSkin} skin pixels`);
    return [{ x: faceX, y: faceY, width: faceW, height: faceH }];
  }

  // ---------------------------------------------------------------------------
  // Crop geometry
  // ---------------------------------------------------------------------------

  /**
   * Compute the source crop rectangle that places the attention point at
   * the given vertical bias from the top of the output, while clamping to
   * image bounds so the crop window never extends outside the source.
   *
   * @param {number} srcW - Source image width
   * @param {number} srcH - Source image height
   * @param {number} attentionX - Horizontal attention point (px)
   * @param {number} attentionY - Vertical attention point (px)
   * @param {number} bias - Where the attention point should land vertically
   *   in the output: 0 = top edge, 0.5 = center, 1 = bottom edge.
   * @returns {{ sx: number, sy: number, sw: number, sh: number }}
   */
  function computeCropRect(srcW, srcH, attentionX, attentionY, bias) {
    const targetW = IMAGE_POOL_CONFIG.OUTPUT_WIDTH;
    const targetH = IMAGE_POOL_CONFIG.OUTPUT_HEIGHT;
    const targetRatio = targetW / targetH;
    const srcRatio = srcW / srcH;

    let sx, sy, sw, sh;

    if (Math.abs(srcRatio - targetRatio) < 0.01) {
      // Already the correct ratio — no crop needed
      sx = 0; sy = 0; sw = srcW; sh = srcH;
    } else if (srcRatio > targetRatio) {
      // Too wide — crop sides, center horizontally around the attention point
      sh = srcH;
      sw = sh * targetRatio;
      sx = attentionX - sw / 2;
      sy = 0;
    } else {
      // Too tall — crop top/bottom, position attention point at bias from top
      sw = srcW;
      sh = sw / targetRatio;
      sx = 0;
      sy = attentionY - sh * bias;
    }

    // Clamp to image bounds
    sx = Math.max(0, Math.min(sx, srcW - sw));
    sy = Math.max(0, Math.min(sy, srcH - sh));

    return { sx, sy, sw, sh };
  }

  /**
   * Render the crop rectangle to a canvas and export as JPEG.
   *
   * @param {HTMLImageElement} img
   * @param {{ sx: number, sy: number, sw: number, sh: number }} cropRect
   * @returns {{ dataUrl: string, width: number, height: number }}
   */
  function renderCrop(img, cropRect) {
    const { sx, sy, sw, sh } = cropRect;
    const targetW = IMAGE_POOL_CONFIG.OUTPUT_WIDTH;
    const targetH = IMAGE_POOL_CONFIG.OUTPUT_HEIGHT;

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

    const dataUrl = canvas.toDataURL('image/jpeg', IMAGE_POOL_CONFIG.JPEG_QUALITY);
    return { dataUrl, width: targetW, height: targetH };
  }

  /**
   * @file Image pool — persistent, uploadable, deduplicated face-image pool.
   *
   * Storage is provided by utils/storage-adapter.js (GM → localStorage → memory).
   *
   * Upload pipeline:
   *   File → FileReader → validate MIME / size → <img> decode
   *        → smart-crop to 400×300 (face-biased) → JPEG compress
   *        → dHash perceptual fingerprint → dedup check → store
   *
   * Each image stores TWO keys:
   *   bfw_img_{id}      — cropped 400×300 JPEG (what the system uses)
   *   bfw_img_orig_{id} — original un-cropped data URI (for manual crop editing)
   *
   * Pick pipeline:
   *   pickImage() → load metadata → pool empty? → fallback canvas face
   *              → random index → load & validate stored image
   *              → load fails? → evict entry, retry (up to 3×)
   *              → apply random mutations (brightness/contrast/saturation/hue
   *                 flip/rotate/scale-jitter + JPEG quality jitter)
   *              → return mutated image (bytes differ every call)
   */


  // ---------------------------------------------------------------------------
  // Image validation & processing
  // ---------------------------------------------------------------------------

  /**
   * Validate that a string looks like a base64 data URI we can use.
   * @param {string} str
   * @returns {boolean}
   */
  function isValidDataURI(str) {
    return typeof str === 'string'
      && str.startsWith('data:image/')
      && str.length > 50
      && str.length < IMAGE_POOL_CONFIG.MAX_FILE_SIZE * 1.5; // base64 ~33% larger
  }

  /**
   * Fisher-Yates shuffle (in-place).
   * @template T
   * @param {T[]} arr
   * @returns {T[]} the same array
   */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Compress an image data URI to a smaller size suitable for long-term storage.
   * Resizes to max 1200px on the longest side, exports as JPEG at quality 0.65.
   * A 12MP phone photo (~5 MB base64) compresses to ~80–150 KB.
   *
   * @param {string} dataUrl - source data URI
   * @returns {Promise<string>} compressed JPEG data URI
   */
  function compressOriginal(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode for compression'));
      img.onload = () => {
        try {
          const maxDim = IMAGE_POOL_CONFIG.ORIG_MAX_DIMENSION;
          let w = img.naturalWidth;
          let h = img.naturalHeight;

          if (w <= maxDim && h <= maxDim && dataUrl.length < 200 * 1024) {
            // Already small enough — return as-is
            resolve(dataUrl);
            return;
          }

          const scale = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', IMAGE_POOL_CONFIG.ORIG_JPEG_QUALITY));
        } catch (e) {
          reject(e);
        }
      };
      img.src = dataUrl;
    });
  }

  // ---------------------------------------------------------------------------
  // Mutation engine — applied at pick-time to make every output byte-unique
  // ---------------------------------------------------------------------------

  /** Cached offscreen canvas for mutateImage (400×300, constant size).
   *  Reusing a single canvas avoids repeated createElement + GC pressure on the
   *  hot path — pickImage() is called every time the camera interceptor
   *  activates (face verification modal opens). */
  let _mutationCanvas = null;

  /** @returns {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D }} */
  function getMutationCanvas() {
    if (!_mutationCanvas) {
      _mutationCanvas = document.createElement('canvas');
      _mutationCanvas.width = IMAGE_POOL_CONFIG.OUTPUT_WIDTH;
      _mutationCanvas.height = IMAGE_POOL_CONFIG.OUTPUT_HEIGHT;
    }
    const ctx = _mutationCanvas.getContext('2d');
    return { canvas: _mutationCanvas, ctx };
  }

  /**
   * Apply a random set of low-level mutations to a 400×300 image.
   * Each mutation has an independent activation chance → on average 2–4 fire.
   *
   * Transforms are composed into a SINGLE draw call (canvas filter + transform)
   * to avoid quality degradation from multi-pass rendering.
   *
   * Mutation catalogue (applied in composited order):
   *   brightness  : ×0.85–1.15
   *   contrast    : ×0.88–1.12
   *   saturation  : ×0.85–1.15
   *   hue         : ±4°
   *   flip        : horizontal mirror (50% dice)
   *   rotate      : ±2.5° (background filled black, draw 8% oversize)
   *   scale-jitter: ×1.00–1.06 per axis (independent, floor=1.0 prevents black borders)
   *   JPEG quality: 0.72–0.85 random
   *
   * Reuses a single offscreen canvas for all mutation calls to reduce GC pressure.
   *
   * @param {string} sourceDataUrl - the stored clean image
   * @returns {Promise<string>} mutated JPEG data URI
   */
  function mutateImage(sourceDataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Mutation: failed to load source image'));
      img.onload = () => {
        try {
          const cfg = IMAGE_POOL_CONFIG;
          const targetW = cfg.OUTPUT_WIDTH;
          const targetH = cfg.OUTPUT_HEIGHT;

          const { canvas, ctx } = getMutationCanvas();

          // Background fill (handles rotation corners / scale shrink)
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, targetW, targetH);

          // ---- Gather mutations ----
          /** @type {string[]} */
          const active = [];
          if (Math.random() < cfg.MUTATION_CHANCE_BRIGHTNESS) active.push('brightness');
          if (Math.random() < cfg.MUTATION_CHANCE_CONTRAST)   active.push('contrast');
          if (Math.random() < cfg.MUTATION_CHANCE_SATURATION) active.push('saturation');
          if (Math.random() < cfg.MUTATION_CHANCE_HUE)        active.push('hue');
          // Shuffle so the same <filter> string doesn't repeat often
          shuffle(active);

          // ---- Build CSS filter ----
          /** @type {string[]} */
          const filters = [];
          for (const m of active) {
            switch (m) {
              case 'brightness': {
                const v = lerp(cfg.MUTATION_BRIGHTNESS_RANGE, Math.random()).toFixed(2);
                filters.push(`brightness(${v})`);
                break;
              }
              case 'contrast': {
                const v = lerp(cfg.MUTATION_CONTRAST_RANGE, Math.random()).toFixed(2);
                filters.push(`contrast(${v})`);
                break;
              }
              case 'saturation': {
                const v = lerp(cfg.MUTATION_SATURATION_RANGE, Math.random()).toFixed(2);
                filters.push(`saturate(${v})`);
                break;
              }
              case 'hue': {
                const v = lerp(cfg.MUTATION_HUE_RANGE, Math.random()).toFixed(1);
                filters.push(`hue-rotate(${v}deg)`);
                break;
              }
            }
          }
          if (filters.length > 0) {
            ctx.filter = filters.join(' ');
          }

          // ---- Build transform ----
          ctx.save();
          ctx.translate(targetW / 2, targetH / 2);

          const flip = Math.random() < cfg.MUTATION_CHANCE_FLIP ? -1 : 1;
          const jitter = Math.random() < cfg.MUTATION_CHANCE_SCALE_JITTER;
          const sx = flip * (jitter ? lerp(cfg.MUTATION_SCALE_RANGE, Math.random()) : 1);
          const sy = jitter ? lerp(cfg.MUTATION_SCALE_RANGE, Math.random()) : 1;

          const doRotate = Math.random() < cfg.MUTATION_CHANCE_ROTATE;
          const angle = doRotate
            ? lerp(cfg.MUTATION_ROTATE_RANGE, Math.random()) * Math.PI / 180
            : 0;

          ctx.transform(sx, 0, 0, sy, 0, 0);
          if (angle) ctx.rotate(angle);

          // Draw slightly larger when rotating so corners stay filled
          const margin = doRotate ? 1.08 : 1.0;
          ctx.drawImage(
            img,
            -targetW * margin / 2,
            -targetH * margin / 2,
            targetW * margin,
            targetH * margin,
          );
          ctx.restore();
          ctx.filter = 'none';

          // ---- Export with quality jitter ----
          const q = lerp(cfg.MUTATION_QUALITY_RANGE, Math.random()).toFixed(3);
          const dataUrl = canvas.toDataURL('image/jpeg', Number(q));

          resolve(dataUrl);
        } catch (e) {
          reject(e);
        }
      };
      img.src = sourceDataUrl;
    });
  }

  /**
   * Linear interpolation in [range[0], range[1]].
   * @param {[number,number]} range
   * @param {number} t  0–1
   * @returns {number}
   */
  function lerp(range, t) {
    return range[0] + (range[1] - range[0]) * t;
  }

  /** Cached 9×8 offscreen canvas for dHash computation.  Reusing a single
   *  canvas avoids repeated createElement + GC pressure during batch uploads
   *  where computeDHash() is called for every file. */
  let _dHashCanvas = null;

  /**
   * Compute a 64-bit dHash (difference hash) from an Image element.
   * Returns a BigInt (0n – 0xFFFFFFFFFFFFFFFFn) or null on failure.
   *
   * Algorithm: shrink to 9×8, compare each pixel's luminance with its
   * right neighbour → 64 bits.
   *
   * @param {HTMLImageElement} img
   * @returns {bigint|null}
   */
  function computeDHash(img) {
    try {
      if (!_dHashCanvas) {
        _dHashCanvas = document.createElement('canvas');
        _dHashCanvas.width = 9;
        _dHashCanvas.height = 8;
      }
      const ctx = _dHashCanvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(img, 0, 0, 9, 8);
      const { data } = ctx.getImageData(0, 0, 9, 8);

      let hash = 0n;
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const idx = (y * 9 + x) * 4;
          // Perceived luminance
          const lumA = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
          const lumB = data[(y * 9 + x + 1) * 4] * 0.299
                     + data[(y * 9 + x + 1) * 4 + 1] * 0.587
                     + data[(y * 9 + x + 1) * 4 + 2] * 0.114;
          hash = (hash << 1n) | (lumA > lumB ? 1n : 0n);
        }
      }
      return hash;
    } catch (e) {
      debug('dHash computation failed:', e);
      return null;
    }
  }

  /**
   * Hamming distance between two BigInts (popcount of XOR).
   * @param {bigint} a
   * @param {bigint} b
   * @returns {number}
   */
  function hammingDistance(a, b) {
    let xor = a ^ b;
    let dist = 0;
    while (xor) {
      dist++;
      xor &= xor - 1n;
    }
    return dist;
  }

  /**
   * Process a File object into a pool-ready entry.
   * Returns the entry or null if the file is invalid / unreadable.
   *
   * @param {File} file
   * @param {bigint[]} existingHashes - hashes already in the pool
   * @returns {Promise<object|null>}
   */
  function processUploadedFile(file, existingHashes) {
    return new Promise((resolve) => {
      // 1. Size guard
      if (file.size > IMAGE_POOL_CONFIG.MAX_FILE_SIZE) {
        warn(`File "${file.name}" exceeds max size (${(file.size / 1e6).toFixed(1)}MB > ${IMAGE_POOL_CONFIG.MAX_FILE_SIZE / 1e6}MB), skipping`);
        return resolve(null);
      }

      // 2. MIME guard
      if (!IMAGE_POOL_CONFIG.ACCEPTED_TYPES.includes(file.type) && file.type !== '') {
        // Allow empty MIME (some systems don't set it) but reject known non-images
        if (file.type.startsWith('video/') || file.type.startsWith('audio/')
            || file.type.startsWith('application/') || file.type.startsWith('text/')) {
          warn(`File "${file.name}" is not an image (${file.type}), skipping`);
          return resolve(null);
        }
      }

      // 3. Read as data URL
      const reader = new FileReader();
      reader.onerror = () => {
        warn(`Failed to read file "${file.name}"`);
        resolve(null);
      };
      reader.onload = () => {
        const dataUrl = /** @type {string} */ (reader.result);

        // 4. Decode via Image to validate
        const img = new Image();
        img.onerror = () => {
          warn(`File "${file.name}" could not be decoded as an image, skipping`);
          resolve(null);
        };
        img.onload = async () => {
          // 5. Smart-crop to standard size (async: may use FaceDetector)
          const { dataUrl: cropped, width, height, cropRect } = await smartCropToStandard(img);

          // 6. Compress original for quota-friendly storage
          let origDataUrl;
          try {
            origDataUrl = await compressOriginal(dataUrl);
          } catch (e) {
            warn(`Failed to compress original for "${file.name}":`, e);
            origDataUrl = null;
          }

          // 7. Perceptual hash for dedup
          const hash = computeDHash(img);
          if (hash !== null) {
            const threshold = IMAGE_POOL_CONFIG.DEDUP_HAMMING_THRESHOLD;
            const duplicate = existingHashes.some((h) => hammingDistance(h, hash) <= threshold);
            if (duplicate) {
              debug(`File "${file.name}" is a perceptual duplicate, skipping`);
              return resolve(null);
            }
          }

          debug(`Processed "${file.name}": ${file.size} → ${cropped.length} bytes, ${width}×${height}`);
          resolve({
            name: file.name,
            dataUrl: cropped,
            origDataUrl: origDataUrl,
            origWidth: img.naturalWidth,
            origHeight: img.naturalHeight,
            hash: hash ? hash.toString(16) : null,
            size: cropped.length,
            width,
            height,
            cropParams: origDataUrl ? cropRect : null,
          });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  // ---------------------------------------------------------------------------
  // Pool state & metadata
  // ---------------------------------------------------------------------------

  /**
   * @typedef {Object} PoolEntry
   * @property {number}  id       - stable index
   * @property {string}  name     - original filename
   * @property {string}  hash     - hex dHash string (or null)
   * @property {number}  size     - data URI length in bytes (cropped image)
   * @property {number}  width    - pixels (cropped, always 400)
   * @property {number}  height   - pixels (cropped, always 300)
   * @property {number}  addedAt  - epoch ms
   * @property {{sx:number,sy:number,sw:number,sh:number}|null} cropParams - source crop rectangle, null if unavailable
   * @property {number}  origWidth  - original (un-cropped) image width in px (after compression)
   * @property {number}  origHeight - original (un-cropped) image height in px (after compression)
   */

  /** @typedef {'high'|'neutral'|'low'} QualityTier */

  /**
   * @typedef {Object} ImageStats
   * @property {number}  totalUses    - number of times this image was picked
   * @property {number}  successes    - number of times it led to a passed verification
   * @property {number}  failures     - number of times it led to a failed verification
   * @property {number}  lastUsedAt   - epoch ms of last pick
   * @property {'success'|'fail'|null} lastResult - outcome of last verification attempt
   */

  /**
   * @typedef {Object} PoolMeta
   * @property {number}   version
   * @property {number}   nextId
   * @property {PoolEntry[]} entries
   */

  /** In-memory metadata cache */
  let _meta = { version: 1, nextId: 0, entries: [] };

  /** In-memory stats cache — { [id: number]: ImageStats } */
  let _stats = {};

  /** ID of the most recently picked image (set by pickImage, read by recordLastPickResult). */
  let _lastPickedId = null;

  /** Whether init() has completed */
  let _ready = false;

  function imgKey(id) {
    return IMAGE_POOL_CONFIG.STORAGE_KEY_PREFIX + id;
  }

  function imgOrigKey(id) {
    return IMAGE_POOL_CONFIG.STORAGE_KEY_PREFIX + 'orig_' + id;
  }

  /**
   * Load metadata from storage.  If metadata is missing but image keys exist,
   * rebuild metadata from surviving keys (self-healing).
   */
  async function loadMeta() {
    const adapter = getStorageAdapter();
    const raw = await adapter.get(IMAGE_POOL_CONFIG.META_KEY);

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.version === 'number'
            && typeof parsed.nextId === 'number'
            && Array.isArray(parsed.entries)) {
          _meta = parsed;
          debug(`Image pool: loaded ${_meta.entries.length} entries (nextId=${_meta.nextId})`);
          return;
        }
      } catch (e) {
        warn('Image pool: metadata corrupted, attempting rebuild');
      }
    }

    // Self-heal: scan for orphaned image keys
    const allKeys = await adapter.keys();
    const prefix = IMAGE_POOL_CONFIG.STORAGE_KEY_PREFIX;
    const orphanIds = allKeys
      .filter((k) => k.startsWith(prefix) && k !== IMAGE_POOL_CONFIG.META_KEY && !k.includes('orig_'))
      .map((k) => {
        const idStr = k.slice(prefix.length);
        const id = parseInt(idStr, 10);
        return Number.isFinite(id) ? id : -1;
      })
      .filter((id) => id >= 0)
      .sort((a, b) => a - b);

    if (orphanIds.length > 0) {
      info(`Image pool: found ${orphanIds.length} orphaned images, rebuilding metadata`);
      const entries = [];
      for (const id of orphanIds) {
        const data = await adapter.get(imgKey(id));
        if (data && isValidDataURI(data)) {
          entries.push({
            id,
            name: `recovered_${id}`,
            hash: null,
            size: data.length,
            width: 0,
            height: 0,
            addedAt: Date.now(),
            cropParams: null,
            origWidth: 0,
            origHeight: 0,
          });
        } else {
          // Dead key — clean up
          await adapter.remove(imgKey(id));
        }
      }
      _meta = {
        version: 1,
        nextId: orphanIds.length > 0 ? Math.max(...orphanIds) + 1 : 0,
        entries,
      };
      await persistMeta();
    } else {
      _meta = { version: 1, nextId: 0, entries: [] };
    }
  }

  /**
   * Write metadata to storage (best-effort).
   */
  async function persistMeta() {
    try {
      await getStorageAdapter().set(IMAGE_POOL_CONFIG.META_KEY, JSON.stringify(_meta));
    } catch (e) {
      warn('Image pool: failed to persist metadata:', e);
    }
  }

  /**
   * Remove an image key from storage (best-effort).
   */
  async function removeImageData(id) {
    try {
      await getStorageAdapter().remove(imgKey(id));
    } catch (e) {
      warn(`Image pool: failed to remove image ${id}:`, e);
    }
  }

  // ---------------------------------------------------------------------------
  // Stats tracking — per-image quality scoring
  // ---------------------------------------------------------------------------

  /**
   * Create a fresh (zeroed) stats object for a new image.
   * @returns {ImageStats}
   */
  function createDefaultStats() {
    return { totalUses: 0, successes: 0, failures: 0, lastUsedAt: 0, lastResult: null };
  }

  /**
   * Load per-image stats from storage.  Self-heals: removes entries for
   * images that no longer exist in metadata.
   */
  async function loadStats() {
    const adapter = getStorageAdapter();
    const raw = await adapter.get(IMAGE_POOL_CONFIG.STATS_KEY);

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          // Keep only stats for images that still exist
          const validIds = new Set(_meta.entries.map((e) => e.id));
          const cleaned = {};
          let removed = 0;
          for (const [idStr, s] of Object.entries(parsed)) {
            const id = Number(idStr);
            if (validIds.has(id) && s && typeof s.totalUses === 'number') {
              cleaned[id] = s;
            } else {
              removed++;
            }
          }
          _stats = cleaned;
          if (removed > 0) {
            debug(`Image pool stats: removed ${removed} orphaned entries`);
            await persistStats();
          } else {
            debug(`Image pool stats: loaded ${Object.keys(_stats).length} entries`);
          }
          return;
        }
      } catch (e) {
        warn('Image pool stats: corrupted, resetting');
      }
    }
    _stats = {};
  }

  /**
   * Write stats to storage (best-effort).
   */
  async function persistStats() {
    try {
      await getStorageAdapter().set(IMAGE_POOL_CONFIG.STATS_KEY, JSON.stringify(_stats));
    } catch (e) {
      warn('Image pool: failed to persist stats:', e);
    }
  }

  /**
   * Get or create stats for an image ID.
   * @param {number} id
   * @returns {ImageStats}
   */
  function getOrCreateStats(id) {
    if (!_stats[id]) {
      _stats[id] = createDefaultStats();
    }
    return _stats[id];
  }

  /**
   * Determine the quality tier for given stats.
   * @param {ImageStats} stats
   * @returns {QualityTier}
   */
  function getQualityTier(stats) {
    const cfg = IMAGE_POOL_CONFIG.QUALITY_SCORING;
    if (!stats || stats.totalUses < cfg.MIN_USES_FOR_ASSESSMENT) return 'neutral';

    const failRate = stats.failures / stats.totalUses;
    if (stats.failures >= cfg.LOW_QUALITY_FAILURE_THRESHOLD && failRate >= cfg.LOW_QUALITY_FAIL_RATE) {
      return 'low';
    }

    if (stats.totalUses >= cfg.HIGH_QUALITY_MIN_USES) {
      const successRate = stats.successes / stats.totalUses;
      if (successRate >= cfg.HIGH_QUALITY_SUCCESS_RATE) return 'high';
    }

    return 'neutral';
  }

  /**
   * Compute selection weights for all pool entries based on their quality tier.
   * Returns an array aligned with `_meta.entries`.  Every weight is strictly > 0.
   * @returns {number[]}
   */
  function computeWeights() {
    const cfg = IMAGE_POOL_CONFIG.QUALITY_SCORING;
    return _meta.entries.map((entry) => {
      const stats = _stats[entry.id] || createDefaultStats();
      const tier = getQualityTier(stats);
      switch (tier) {
        case 'high': return cfg.HIGH_QUALITY_WEIGHT;
        case 'low': return cfg.LOW_QUALITY_WEIGHT;
        default: return cfg.NEUTRAL_WEIGHT;
      }
    });
  }

  /**
   * Weighted random index into `_meta.entries`.
   * Falls back to uniform random if weights sum to zero (should not happen).
   * @param {number[]} weights
   * @returns {number} index into _meta.entries
   */
  function weightedRandomIndex(weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return Math.floor(Math.random() * _meta.entries.length);

    let target = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      target -= weights[i];
      if (target <= 0) return i;
    }
    return weights.length - 1;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Initialize the image pool.  Must be called once before any other operations.
   * Idempotent — subsequent calls are no-ops.
   *
   * @returns {Promise<void>}
   */
  async function initPool() {
    if (_ready) return;
    await loadMeta();
    await loadStats();
    _ready = true;
    info(`Image pool ready: ${_meta.entries.length}/${IMAGE_POOL_CONFIG.MAX_IMAGES} images`);
  }

  /**
   * How many images are currently in the pool?
   * @returns {number}
   */
  function poolSize() {
    return _meta.entries.length;
  }

  /**
   * Maximum capacity.
   * @returns {number}
   */
  function poolCapacity() {
    return IMAGE_POOL_CONFIG.MAX_IMAGES;
  }

  /**
   * Return a shallow copy of all pool entries (for UI rendering).
   * @returns {PoolEntry[]}
   */
  function listEntries() {
    return _meta.entries.slice();
  }

  /**
   * Pick a random image from the pool using weighted random selection.
   * High-quality images are boosted; low-quality images are down-weighted
   * but never fully excluded.  Falls back to uniform random if the pool
   * has no stats data yet.
   *
   * On every call the chosen image is run through mutateImage() so that
   * no two requests ever return the same bytes — brightness, contrast,
   * saturation, hue, flip, rotation, scale, and JPEG quality are all
   * randomized per invocation.
   *
   * Also records usage stats: increments totalUses and sets lastUsedAt
   * so that the quality scoring system can track per-image performance.
   *
   * @returns {Promise<string>} base64 JPEG data URI
   */
  async function pickImage() {
    if (_meta.entries.length === 0) {
      const err = new Error('Image pool is empty — cannot pick an image for replacement');
      err.code = 'POOL_EMPTY';
      throw err;
    }

    const maxRetries = 3;
    const tried = new Set();

    // Compute weights once — they don't change during retries
    const useWeighted = getSetting('dynamicWeight', true);
    const weights = useWeighted ? computeWeights() : null;

    for (let attempt = 0; attempt < maxRetries && tried.size < _meta.entries.length; attempt++) {
      // Weighted or uniform random selection
      let idx;
      do {
        idx = useWeighted
          ? weightedRandomIndex(weights)
          : Math.floor(Math.random() * _meta.entries.length);
      } while (tried.has(idx));
      tried.add(idx);

      const entry = _meta.entries[idx];
      const adapter = getStorageAdapter();
      const raw = await adapter.get(imgKey(entry.id));

      if (raw && isValidDataURI(raw)) {
        // Record usage stats
        _lastPickedId = entry.id;
        const stats = getOrCreateStats(entry.id);
        info(`Picked image #${entry.id} "${entry.name}" (tier=${getQualityTier(stats)}, prevUses=${stats.totalUses})`);
        stats.totalUses++;
        stats.lastUsedAt = Date.now();
        persistStats(); // fire-and-forget

        // Apply random mutations if enabled
        {
          try {
            const mutated = await mutateImage(raw);
            return mutated;
          } catch (e) {
            // Mutation failed — return the clean copy as fallback
            warn(`Mutation failed for "${entry.name}", returning clean copy:`, e);
            return raw;
          }
        }

        return raw;
      }

      // Stale/dead entry — evict
      warn(`Image ${entry.id} ("${entry.name}") data missing or invalid, evicting`);
      await removeImageData(entry.id);
      _meta.entries.splice(idx, 1);
      // Also remove stale stats
      delete _stats[entry.id];
      await persistMeta();
      await persistStats();
    }

    // All retries exhausted — every entry failed to load or validate
    warn(`All ${_meta.entries.length} pool images failed to load from storage — cannot pick an image`);
    const err = new Error('All pool images failed to load — storage may be corrupted or inaccessible');
    err.code = 'POOL_EMPTY';
    throw err;
  }

  /**
   * Add images from File objects to the pool.
   *
   * @param {File[]} files
   * @returns {Promise<{ added: PoolEntry[], skipped: number, duplicates: number }>}
   */
  async function addImages(files) {
    if (!_ready) await initPool();

    const existingHashes = _meta.entries
      .map((e) => {
        if (e.hash) {
          try { return BigInt('0x' + e.hash); } catch (_) { return null; }
        }
        return null;
      })
      .filter(Boolean);

    const results = { added: [], skipped: 0, duplicates: 0 };

    for (const file of files) {
      // Capacity check
      if (_meta.entries.length + results.added.length >= IMAGE_POOL_CONFIG.MAX_IMAGES) {
        warn(`Image pool full (${IMAGE_POOL_CONFIG.MAX_IMAGES}), skipping "${file.name}"`);
        results.skipped++;
        continue;
      }

      const processed = await processUploadedFile(file, [...existingHashes, ...results.added.map((e) => {
        if (e.hash) {
          try { return BigInt('0x' + e.hash); } catch (_) { return 0n; }
        }
        return 0n;
      }).filter((h) => h !== 0n)]);

      if (!processed) {
        results.skipped++;
        continue;
      }

      const id = _meta.nextId++;
      const entry = {
        id,
        name: processed.name,
        hash: processed.hash,
        size: processed.size,
        width: processed.width,
        height: processed.height,
        addedAt: Date.now(),
        cropParams: processed.cropParams || null,
        origWidth: processed.origWidth || 0,
        origHeight: processed.origHeight || 0,
      };

      // Persist cropped image (must succeed); original is best-effort
      try {
        await getStorageAdapter().set(imgKey(id), processed.dataUrl);
      } catch (e) {
        warn(`Failed to store cropped image "${file.name}":`, e);
        results.skipped++;
        continue;
      }

      // Store original — non-blocking: if it fails we keep the cropped image
      // but disable crop editing (cropParams stays null)
      if (processed.origDataUrl) {
        try {
          await getStorageAdapter().set(imgOrigKey(id), processed.origDataUrl);
        } catch (e) {
          warn(`Failed to store original for "${file.name}" (quota), crop editing disabled`);
          entry.cropParams = null;
        }
      } else {
        entry.cropParams = null;
      }

      _meta.entries.push(entry);
      results.added.push(entry);
      info(`Image "${file.name}" added to pool (id=${id}, ${processed.width}×${processed.height})`);
    }

    if (results.added.length > 0 || results.skipped > 0) {
      await persistMeta();
    }

    return results;
  }

  /**
   * Add a single image from a data URI (canvas capture, screenshot, etc.).
   * Skips the File/FileReader path — goes directly to decode → compress →
   * dHash dedup → storage.  Designed for programmatic frame capture from
   * &lt;video&gt; elements.
   *
   * @param {string} dataUrl - A base64 data URI (data:image/…)
   * @param {string} name    - Human-readable label (e.g. "captured_1712345678901")
   * @returns {Promise<PoolEntry|null>} The added entry, or null if rejected
   */
  async function addImageFromDataURI(dataUrl, name) {
    if (!_ready) await initPool();

    // 1. Quick sanity — must look like a data URI
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      warn('addImageFromDataURI: not a valid image data URI');
      return null;
    }

    if (dataUrl.length > IMAGE_POOL_CONFIG.MAX_FILE_SIZE * 2) {
      warn('addImageFromDataURI: data URI too large before compression, rejecting');
      return null;
    }

    // 2. Capacity check
    if (_meta.entries.length >= IMAGE_POOL_CONFIG.MAX_IMAGES) {
      warn('Image pool full, rejecting captured frame');
      return null;
    }

    // 3. Build existing hashes for dedup
    const existingHashes = _meta.entries
      .map((e) => {
        if (e.hash) {
          try { return BigInt('0x' + e.hash); } catch (_) { return null; }
        }
        return null;
      })
      .filter(Boolean);

    // 4. Decode, compress, dHash
    return new Promise((resolve) => {
      const img = new Image();
      img.onerror = () => {
        warn('addImageFromDataURI: failed to decode image');
        resolve(null);
      };
      img.onload = async () => {
        // Compress via smart-crop to standard dimensions (async: may use FaceDetector)
        const { dataUrl: compressed, width, height, cropRect } = await smartCropToStandard(img);

        // Compress original for quota-friendly storage
        let origDataUrl;
        try {
          origDataUrl = await compressOriginal(dataUrl);
        } catch (e) {
          warn(`Failed to compress original for "${name}":`, e);
          origDataUrl = null;
        }

        // Perceptual dedup
        const hash = computeDHash(img);
        if (hash !== null) {
          const threshold = IMAGE_POOL_CONFIG.DEDUP_HAMMING_THRESHOLD;
          const duplicate = existingHashes.some((h) => hammingDistance(h, hash) <= threshold);
          if (duplicate) {
            debug(`Captured frame "${name}" is a perceptual duplicate, skipping`);
            return resolve(null);
          }
        }

        // 5. Allocate id & persist
        const id = _meta.nextId++;
        const entry = {
          id,
          name,
          hash: hash ? hash.toString(16) : null,
          size: compressed.length,
          width,
          height,
          addedAt: Date.now(),
          cropParams: (cropRect && origDataUrl) ? cropRect : null,
          origWidth: img.naturalWidth,
          origHeight: img.naturalHeight,
        };

        // Persist cropped image (must succeed)
        try {
          await getStorageAdapter().set(imgKey(id), compressed);
        } catch (e) {
          warn(`Failed to store captured image "${name}":`, e);
          return resolve(null);
        }

        // Store original — non-blocking: if it fails we keep the cropped image
        if (origDataUrl) {
          try {
            await getStorageAdapter().set(imgOrigKey(id), origDataUrl);
          } catch (e) {
            warn(`Failed to store original for "${name}" (quota), crop editing disabled`);
            entry.cropParams = null;
          }
        }

        _meta.entries.push(entry);
        await persistMeta();
        info(`Captured image "${name}" added to pool (id=${id}, ${width}×${height})`);
        resolve(entry);
      };
      img.src = dataUrl;
    });
  }

  /**
   * Remove a single image by its stable id.
   * @param {number} id
   * @returns {Promise<boolean>} true if removed
   */
  async function removeImage(id) {
    const idx = _meta.entries.findIndex((e) => e.id === id);
    if (idx === -1) return false;

    const entry = _meta.entries[idx];
    await removeImageData(entry.id);
    try { await getStorageAdapter().remove(imgOrigKey(entry.id)); } catch (_) { /* ignore */ }
    _meta.entries.splice(idx, 1);
    // Clean up stats for the removed image
    delete _stats[entry.id];
    await persistMeta();
    await persistStats();
    info(`Removed image "${entry.name}" (id=${id})`);
    return true;
  }

  /**
   * Remove all images from the pool.
   * @returns {Promise<void>}
   */
  async function clearPool() {
    const adapter = getStorageAdapter();

    for (const entry of _meta.entries) {
      await adapter.remove(imgKey(entry.id));
      try { await adapter.remove(imgOrigKey(entry.id)); } catch (_) { /* ignore */ }
    }

    _meta.entries = [];
    _meta.nextId = 0;
    _stats = {};
    _lastPickedId = null;
    await persistMeta();
    await persistStats();
    info('Image pool cleared');
  }

  /**
   * Return the data URI for a specific entry (for thumbnail display).
   * @param {number} id
   * @returns {Promise<string|null>}
   */
  async function getImageData(id) {
    const raw = await getStorageAdapter().get(imgKey(id));
    return raw && isValidDataURI(raw) ? raw : null;
  }

  /**
   * Return the ORIGINAL (un-cropped) data URI for a specific entry.
   * @param {number} id
   * @returns {Promise<string|null>}
   */
  async function getOriginalImageData(id) {
    const raw = await getStorageAdapter().get(imgOrigKey(id));
    return raw && typeof raw === 'string' && raw.startsWith('data:image/') ? raw : null;
  }

  /**
   * Update the crop rectangle for an existing image, re-render the cropped
   * output, and persist everything back to storage.
   *
   * @param {number} id
   * @param {{sx:number, sy:number, sw:number, sh:number}} cropParams — new crop rect in source-pixel coordinates
   * @returns {Promise<boolean>} true if successful
   */
  async function updateCrop(id, cropParams) {
    const idx = _meta.entries.findIndex((e) => e.id === id);
    if (idx === -1) {
      warn(`updateCrop: image ${id} not found`);
      return false;
    }

    const origDataUrl = await getOriginalImageData(id);
    if (!origDataUrl) {
      warn(`updateCrop: original image data not found for ${id}`);
      return false;
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.onerror = () => {
        warn(`updateCrop: failed to decode original image for ${id}`);
        resolve(false);
      };
      img.onload = async () => {
        try {
          const { dataUrl, width, height } = renderCrop(img, cropParams);

          // Persist new cropped image
          await getStorageAdapter().set(imgKey(id), dataUrl);

          // Update metadata — sync origWidth/origHeight to the loaded image
          // dimensions so that on re-open the coordinate system matches.
          _meta.entries[idx].cropParams = { ...cropParams };
          _meta.entries[idx].size = dataUrl.length;
          _meta.entries[idx].width = width;
          _meta.entries[idx].height = height;
          _meta.entries[idx].origWidth = img.naturalWidth;
          _meta.entries[idx].origHeight = img.naturalHeight;
          await persistMeta();

          debug(`Crop updated for image ${id}: source (${cropParams.sx},${cropParams.sy}) ${cropParams.sw}×${cropParams.sh}`);
          resolve(true);
        } catch (e) {
          warn(`updateCrop: render failed for ${id}:`, e);
          resolve(false);
        }
      };
      img.src = origDataUrl;
    });
  }

  // ---------------------------------------------------------------------------
  // Stats public API — per-image quality tracking
  // ---------------------------------------------------------------------------

  /**
   * Record a verification result for a specific image.
   * Updates successes/failures/lastResult and persists stats.
   *
   * @param {number} id - Image ID
   * @param {boolean} success - Whether verification succeeded
   */
  function recordImageResult(id, success) {
    const stats = getOrCreateStats(id);
    if (success) {
      stats.successes++;
      stats.lastResult = 'success';
    } else {
      stats.failures++;
      stats.lastResult = 'fail';
    }
    // If lastUsedAt is 0 (never picked directly but result recorded), set now
    if (!stats.lastUsedAt) stats.lastUsedAt = Date.now();
    persistStats(); // fire-and-forget
    const tier = getQualityTier(stats);
    info(`Image ${id} verification: ${success ? '✓ SUCCESS' : '✗ FAIL'}  (totalUses=${stats.totalUses}, success=${stats.successes}/${stats.totalUses}, tier=${tier})`);
  }

  /**
   * Record a verification result for the most recently picked image.
   * Convenience wrapper — the processor doesn't know the exact image ID;
   * it just knows the current verification attempt succeeded or failed.
   *
   * @param {boolean} success
   */
  function recordLastPickResult(success) {
    if (_lastPickedId == null) {
      info('recordLastPickResult: no image was picked yet — cannot record result');
      return;
    }
    recordImageResult(_lastPickedId, success);
  }

  /**
   * Get the stats for a specific image.
   * @param {number} id
   * @returns {ImageStats|null}
   */
  function getImageStats(id) {
    return _stats[id] || null;
  }

  /**
   * Get the quality tier for a specific image.
   * @param {number} id
   * @returns {QualityTier}
   */
  function getImageQualityTier(id) {
    const stats = _stats[id] || createDefaultStats();
    return getQualityTier(stats);
  }

  /**
   * @file CSS styles for the edge-drawer panel UI
   * All styles are injected as a <style> element at runtime.
   *
   * The panel uses an edge-drawer pattern: hidden off-screen to the right,
   * with only a 32px handle grip visible.  Hovering the handle slides the
   * full panel into view.  A pin button locks it open.
   */

  const STYLES = `
  /* ================================================================
   * Panel container — edge-drawer pattern
   * ================================================================ */

  .bfw-panel {
    position: fixed;
    z-index: 999999;
    right: 0;
    top: 0;
    height: 100vh;
    display: flex;
    flex-direction: row;
    /* Only the 32px handle is visible by default */
    transform: translateX(calc(100% - 32px));
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #cdd6f4;
    /* Allow clicks to pass through when fully hidden */
    pointer-events: none;
  }

  .bfw-panel.open,
  .bfw-panel.pinned {
    transform: translateX(0);
    pointer-events: auto;
  }

  /* While the handle is hovered, allow interaction */
  .bfw-panel:hover {
    pointer-events: auto;
  }

  /* ================================================================
   * Handle — the visible grip tab on the right edge
   * ================================================================ */

  .bfw-panel-handle {
    width: 32px;
    height: 120px;
    align-self: center;
    flex-shrink: 0;
    cursor: pointer;
    user-select: none;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;  /* Always clickable, even when panel is hidden */
  }

  /* The visible tab — a rounded rectangle */
  .bfw-panel-handle::before {
    content: '';
    position: absolute;
    inset: 0;
    left: 3px;
    background: linear-gradient(180deg,
      rgba(30, 30, 46, 0.92),
      rgba(49, 50, 68, 0.96) 20%,
      rgba(49, 50, 68, 0.96) 80%,
      rgba(30, 30, 46, 0.92));
    border: 1px solid rgba(137, 180, 250, 0.3);
    border-right: none;
    border-radius: 8px 0 0 8px;
    box-shadow: -2px 0 16px rgba(0, 0, 0, 0.3);
    transition: border-color 0.3s, box-shadow 0.3s;
  }

  /* Accent glow line */
  .bfw-panel-handle::after {
    content: '';
    position: absolute;
    left: 7px;
    top: 50%;
    transform: translateY(-50%);
    width: 2px;
    height: 64px;
    background: linear-gradient(180deg, transparent, #89b4fa 20%, #74c7ec 80%, transparent);
    border-radius: 1px;
    box-shadow: 0 0 8px rgba(137, 180, 250, 0.6);
    transition: box-shadow 0.3s;
  }

  .bfw-panel-handle:hover::before {
    border-color: rgba(137, 180, 250, 0.6);
    box-shadow: -2px 0 20px rgba(137, 180, 250, 0.15);
  }

  .bfw-panel-handle:hover::after {
    box-shadow: 0 0 14px rgba(137, 180, 250, 0.9);
  }

  /* Vertical label text */
  .bfw-handle-text {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-size: 12px;
    font-weight: 700;
    color: #89b4fa;
    letter-spacing: 6px;
    position: relative;
    z-index: 1;
    text-shadow: 0 0 8px rgba(137, 180, 250, 0.35);
    transition: color 0.3s, text-shadow 0.3s;
  }

  .bfw-panel-handle:hover .bfw-handle-text {
    color: #74c7ec;
    text-shadow: 0 0 12px rgba(137, 180, 250, 0.6);
  }

  /* ================================================================
   * Inner panel — the actual UI surface
   * ================================================================ */

  .bfw-panel-inner {
    width: 348px;
    flex-shrink: 0;
    background: #1e1e2e;
    border-left: 1px solid #313244;
    box-shadow: -4px 0 32px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  /* ================================================================
   * Header — title + pin button
   * ================================================================ */

  .bfw-panel-header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
    padding: 0 14px;
    background: linear-gradient(135deg, #89b4fa, #74c7ec);
    font-size: 13px;
    font-weight: 700;
    color: #1e1e2e;
  }

  .bfw-panel-header .bfw-header-actions {
    display: flex;
    gap: 4px;
  }

  .bfw-panel-header button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 15px;
    line-height: 1;
    color: #1e1e2e;
    padding: 2px 4px;
    border-radius: 4px;
    transition: background 0.15s;
  }

  /* Pin button — slightly larger to accommodate the SVG icon */
  .bfw-pin-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .bfw-panel-header button:hover {
    background: rgba(30, 30, 46, 0.12);
  }

  /* ================================================================
   * Body — scrollable content area
   * ================================================================ */

  .bfw-panel-body {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 14px;
  }

  /* Custom scrollbar */
  .bfw-panel-body::-webkit-scrollbar {
    width: 5px;
  }

  .bfw-panel-body::-webkit-scrollbar-track {
    background: transparent;
  }

  .bfw-panel-body::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 3px;
  }

  .bfw-panel-body::-webkit-scrollbar-thumb:hover {
    background: #585b70;
  }

  /* Firefox scrollbar */
  .bfw-panel-body {
    scrollbar-width: thin;
    scrollbar-color: #45475a transparent;
  }

  /* ================================================================
   * Status indicator
   * ================================================================ */

  .bfw-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0 10px;
    font-size: 12px;
  }

  .bfw-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #a6e3a1;
    flex-shrink: 0;
    box-shadow: 0 0 6px rgba(166, 227, 161, 0.5);
    transition: background 0.3s, box-shadow 0.3s;
  }

  .bfw-status-dot.inactive {
    background: #f38ba8;
    box-shadow: 0 0 6px rgba(243, 139, 168, 0.5);
  }

  /* ================================================================
   * Log area
   * ================================================================ */

  .bfw-log {
    margin-top: 6px;
    padding: 10px;
    background: #11111b;
    border-radius: 6px;
    font-family: "Cascadia Code", "Fira Code", "Consolas", monospace;
    font-size: 11px;
    line-height: 1.55;
    color: #a6adc8;
    height: 120px;
    overflow-y: auto;
  }

  .bfw-log::-webkit-scrollbar {
    width: 4px;
  }

  .bfw-log::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 2px;
  }

  .bfw-log .log-time {
    color: #585b70;
    margin-right: 4px;
  }

  /* ================================================================
   * Action buttons
   * ================================================================ */

  .bfw-actions {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }

  .bfw-btn {
    flex: 1;
    padding: 7px 12px;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }

  .bfw-btn:active {
    transform: scale(0.97);
  }

  .bfw-btn-primary {
    background: #89b4fa;
    color: #1e1e2e;
  }
  .bfw-btn-primary:hover {
    background: #74c7ec;
  }

  .bfw-btn-danger {
    background: #f38ba8;
    color: #1e1e2e;
  }
  .bfw-btn-danger:hover {
    background: #eba0ac;
  }

  .bfw-btn-ghost {
    background: transparent;
    color: #cdd6f4;
    border: 1px solid #45475a;
  }
  .bfw-btn-ghost:hover {
    background: #313244;
  }

  /* ================================================================
   * Image Pool section
   * ================================================================ */

  .bfw-pool-section {
    margin-top: 12px;
    border-top: 1px solid #313244;
    padding-top: 10px;
  }

  .bfw-pool-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .bfw-pool-header-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .bfw-pool-title {
    font-size: 12px;
    font-weight: 600;
    color: #bac2de;
  }

  .bfw-pool-count {
    font-size: 11px;
    color: #a6adc8;
    transition: color 0.2s;
  }

  .bfw-pool-drag-zone {
    border: 2px dashed #45475a;
    border-radius: 6px;
    padding: 10px;
    text-align: center;
    font-size: 11px;
    color: #6c7086;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, color 0.15s;
    margin-bottom: 8px;
  }
  .bfw-pool-drag-zone:hover,
  .bfw-pool-drag-zone.drag-over {
    border-color: #89b4fa;
    background: rgba(137, 180, 250, 0.06);
    color: #89b4fa;
  }

  .bfw-pool-thumbs {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
    gap: 6px;
    max-height: 120px;
    overflow-y: auto;
    padding: 2px;
  }

  .bfw-pool-thumbs::-webkit-scrollbar {
    width: 4px;
  }

  .bfw-pool-thumbs::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 2px;
  }

  .bfw-pool-thumb {
    position: relative;
    aspect-ratio: 1;
    border-radius: 5px;
    overflow: hidden;
    border: 1px solid #45475a;
    background: #11111b;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .bfw-pool-thumb:hover {
    border-color: #89b4fa;
    box-shadow: 0 0 8px rgba(137, 180, 250, 0.25);
  }

  /* ---- Quality tier border indicators ---- */

  /* Low-quality image: red/orange dashed border with subtle pulsing glow */
  .bfw-pool-thumb.bfw-quality-low {
    border-color: rgba(243, 139, 168, 0.55);
    border-style: dashed;
    box-shadow: 0 0 6px rgba(243, 139, 168, 0.15);
  }

  .bfw-pool-thumb.bfw-quality-low:hover {
    border-color: #f38ba8;
    box-shadow: 0 0 12px rgba(243, 139, 168, 0.35);
  }

  @keyframes bfw-pulse-warn {
    0%, 100% { box-shadow: 0 0 6px rgba(243, 139, 168, 0.12); }
    50%      { box-shadow: 0 0 12px rgba(243, 139, 168, 0.28); }
  }

  /* High-quality image: subtle green accent */
  .bfw-pool-thumb.bfw-quality-high {
    border-color: rgba(166, 227, 161, 0.4);
  }

  .bfw-pool-thumb.bfw-quality-high:hover {
    border-color: #a6e3a1;
    box-shadow: 0 0 8px rgba(166, 227, 161, 0.25);
  }
  .bfw-pool-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  /* Keep img behind absolute-positioned overlay buttons */
  .bfw-pool-thumb .bfw-thumb-delete {
    position: absolute;
    z-index: 1;
    top: 1px;
    right: 1px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(30, 30, 46, 0.85);
    border: none;
    color: #f38ba8;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.12s;
  }
  .bfw-pool-thumb:hover .bfw-thumb-delete {
    opacity: 1;
  }
  .bfw-pool-thumb .bfw-thumb-delete .bfw-icon {
    display: block;
    margin: 0;
    vertical-align: baseline;
  }
  .bfw-pool-thumb .bfw-thumb-delete:hover {
    background: #f38ba8;
    color: #1e1e2e;
  }

  /* Stats info button — appears on hover, same pattern as delete button */
  .bfw-pool-thumb .bfw-thumb-info {
    position: absolute;
    z-index: 1;
    top: 1px;
    left: 1px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(30, 30, 46, 0.85);
    border: none;
    color: #89b4fa;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.12s;
  }
  .bfw-pool-thumb:hover .bfw-thumb-info {
    opacity: 1;
  }
  .bfw-pool-thumb .bfw-thumb-info .bfw-icon {
    display: block;
    margin: 0;
    vertical-align: baseline;
  }
  .bfw-pool-thumb .bfw-thumb-info:hover {
    background: #89b4fa;
    color: #1e1e2e;
  }

  /* ---- Stats popup (inline tooltip-style popover) ---- */

  .bfw-thumb-stats-popup {
    position: absolute;
    z-index: 9999999;
    width: 200px;
    background: #1e1e2e;
    border: 1px solid #45475a;
    border-radius: 8px;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
    padding: 10px 12px;
    font-size: 11px;
    color: #cdd6f4;
    pointer-events: auto;
    cursor: default;
  }

  .bfw-thumb-stats-popup .stats-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid #313244;
  }

  .bfw-thumb-stats-popup .stats-name {
    font-weight: 600;
    font-size: 11px;
    color: #cdd6f4;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bfw-thumb-stats-popup .stats-tier-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .bfw-thumb-stats-popup .stats-tier-high {
    background: rgba(166, 227, 161, 0.15);
    color: #a6e3a1;
  }

  .bfw-thumb-stats-popup .stats-tier-neutral {
    background: rgba(137, 180, 250, 0.12);
    color: #89b4fa;
  }

  .bfw-thumb-stats-popup .stats-tier-low {
    background: rgba(243, 139, 168, 0.15);
    color: #f38ba8;
  }

  .bfw-thumb-stats-popup .stats-table {
    width: 100%;
    border-collapse: collapse;
  }

  .bfw-thumb-stats-popup .stats-table td {
    padding: 3px 0;
    font-size: 11px;
    line-height: 1.4;
  }

  .bfw-thumb-stats-popup .stats-label {
    color: #6c7086;
    width: 60px;
    white-space: nowrap;
  }

  .bfw-thumb-stats-popup .stats-value {
    color: #cdd6f4;
    text-align: right;
  }

  .bfw-thumb-stats-popup .stats-value.success {
    color: #a6e3a1;
  }

  .bfw-thumb-stats-popup .stats-value.fail {
    color: #f38ba8;
  }

  .bfw-thumb-stats-popup .stats-value.rate-good {
    color: #a6e3a1;
  }

  .bfw-thumb-stats-popup .stats-value.rate-bad {
    color: #f38ba8;
  }

  .bfw-thumb-stats-popup .stats-empty {
    text-align: center;
    color: #585b70;
    padding: 6px 0;
    font-size: 11px;
  }

  /* Blur toggle button */
  .bfw-eye-btn {
    background: none;
    border: none;
    color: #6c7086;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: color 0.15s, background 0.15s;
  }
  .bfw-eye-btn:hover {
    color: #cdd6f4;
    background: rgba(205, 214, 244, 0.08);
  }
  .bfw-eye-btn.active {
    color: #f38ba8;
  }

  /* Weight toggle button — same pattern as eye-btn */
  .bfw-weight-btn {
    background: none;
    border: none;
    color: #6c7086;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: color 0.15s, background 0.15s;
  }
  .bfw-weight-btn:hover {
    color: #cdd6f4;
    background: rgba(205, 214, 244, 0.08);
  }
  .bfw-weight-btn.active {
    color: #a6e3a1;
  }

  /* Blur mode — all thumbnails blurred */
  .bfw-pool-thumb img {
    transition: filter 0.15s;
  }
  .bfw-pool-thumbs.blur .bfw-pool-thumb img {
    filter: blur(8px);
  }
  /* Hover to reveal original */
  .bfw-pool-thumbs.blur .bfw-pool-thumb:hover img {
    filter: blur(0);
  }

  .bfw-pool-actions {
    display: flex;
    gap: 6px;
    margin-top: 8px;
  }

  .bfw-pool-actions .bfw-btn {
    font-size: 11px;
    padding: 5px 10px;
  }

  /* Capture button variant */
  .bfw-btn-capture {
    background: #a6e3a1;
    color: #1e1e2e;
    font-size: 11px;
    padding: 5px 10px;
    flex: 1;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }
  .bfw-btn-capture:hover {
    background: #94e2d5;
  }
  .bfw-btn-capture:active {
    transform: scale(0.97);
  }
  .bfw-btn-capture:disabled {
    background: #585b70;
    color: #a6adc8;
    cursor: not-allowed;
  }

  .bfw-pool-empty {
    font-size: 11px;
    color: #585b70;
    text-align: center;
    padding: 10px 0;
  }

  .bfw-pool-status {
    font-size: 10px;
    color: #a6e3a1;
    margin-top: 6px;
    min-height: 14px;
    transition: color 0.2s;
  }
  .bfw-pool-status.error {
    color: #f38ba8;
  }

  /* ================================================================
   * Course Progress Section
   * ================================================================ */

  .bfw-course-section {
    padding: 8px 10px;
    background: #28283d;
    border-radius: 6px;
  }
  .bfw-course-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }
  .bfw-course-title {
    font-size: 11px;
    color: #cdd6f4;
    font-weight: 600;
  }
  .bfw-course-header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .bfw-course-count {
    font-size: 11px;
    color: #a6adc8;
    font-weight: 500;
  }
  .bfw-course-ch-label {
    font-size: 10px;
    color: #6c7086;
    display: none; /* hidden when zero, JS sets inline if wanted */
  }
  .bfw-course-current {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2px;
  }
  .bfw-course-current-name {
    font-size: 11px;
    color: #89b4fa;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .bfw-course-vid-pct {
    font-size: 10px;
    color: #a6adc8;
    flex-shrink: 0;
  }
  .bfw-course-chapter {
    font-size: 10px;
    color: #6c7086;
    margin-bottom: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bfw-course-bar-group {
    margin-bottom: 4px;
  }
  .bfw-course-bar-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 3px;
  }
  .bfw-course-bar-label {
    font-size: 9px;
    color: #6c7086;
    width: 22px;
    text-align: left;
    flex-shrink: 0;
  }
  .bfw-course-bar-track {
    flex: 1;
    height: 4px;
    background: #45475a;
    border-radius: 2px;
    overflow: hidden;
  }
  .bfw-course-bar-fill {
    height: 100%;
    background: #89b4fa;
    border-radius: 2px;
    transition: width 0.3s ease;
  }
  .bfw-bar-lesson {
    background: #a6e3a1;
  }
  .bfw-course-bar-pct {
    font-size: 9px;
    color: #a6adc8;
    width: 28px;
    text-align: right;
    flex-shrink: 0;
  }
  .bfw-course-stat {
    font-size: 10px;
    color: #6c7086;
  }

  /* ================================================================
   * SVG Icons
   * ================================================================ */

  .bfw-icon {
    vertical-align: middle;
    flex-shrink: 0;
  }

  /* Gap between icon and text inside buttons */
  button > .bfw-icon + *,
  button > .bfw-icon ~ * {
    margin-left: 0;
  }

  button > .bfw-icon {
    margin-right: 4px;
  }

  button > .bfw-icon:last-child {
    margin-right: 0;
  }

  /* Spin animation for the clock / busy icon */
  @keyframes bfw-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  .bfw-icon-spin {
    animation: bfw-spin 1.5s linear infinite;
    transform-origin: center center;
  }

  /* ================================================================
   * Settings section
   * ================================================================ */

  .bfw-settings-section {
    margin-top: 12px;
    border-top: 1px solid #313244;
    padding-top: 10px;
  }

  .bfw-settings-header {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }

  .bfw-settings-title {
    font-size: 12px;
    font-weight: 600;
    color: #bac2de;
  }

  .bfw-setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid rgba(49, 50, 68, 0.4);
  }

  .bfw-setting-row:last-of-type {
    border-bottom: none;
  }

  .bfw-setting-row.bfw-setting-disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .bfw-setting-info {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }

  .bfw-setting-icon {
    display: flex;
    align-items: center;
    color: #89b4fa;
    flex-shrink: 0;
  }

  .bfw-setting-disabled .bfw-setting-icon {
    color: #585b70;
  }

  .bfw-setting-label {
    font-size: 12px;
    font-weight: 500;
    color: #cdd6f4;
  }

  .bfw-setting-desc {
    font-size: 10px;
    color: #585b70;
    flex-basis: 100%;
    margin-left: 22px; /* indent under icon */
  }

  /* ================================================================
   * Toggle switch (CSS-only, checkbox-driven)
   * ================================================================ */

  .bfw-toggle {
    position: relative;
    display: inline-block;
    width: 36px;
    height: 20px;
    flex-shrink: 0;
    cursor: pointer;
  }

  .bfw-setting-disabled .bfw-toggle {
    cursor: not-allowed;
  }

  .bfw-toggle-input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .bfw-toggle-slider {
    position: absolute;
    inset: 0;
    background: #45475a;
    border-radius: 10px;
    transition: background 0.2s ease;
  }

  .bfw-toggle-slider::before {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    background: #cdd6f4;
    border-radius: 50%;
    transition: transform 0.2s ease, background 0.2s ease;
  }

  .bfw-toggle-input:checked + .bfw-toggle-slider {
    background: #89b4fa;
  }

  .bfw-toggle-input:checked + .bfw-toggle-slider::before {
    transform: translateX(16px);
    background: #1e1e2e;
  }

  .bfw-toggle-input:disabled + .bfw-toggle-slider {
    background: #313244;
  }

  .bfw-toggle-input:disabled + .bfw-toggle-slider::before {
    background: #585b70;
  }

  /* Hover glow for active toggles */
  .bfw-toggle:not(:has(input:disabled)):hover .bfw-toggle-slider {
    box-shadow: 0 0 6px rgba(137, 180, 250, 0.4);
  }

  /* ================================================================
   * Video overlay — controls overlaid on the fake stream video element
   * ================================================================ */

  .bfw-video-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-sizing: border-box;
  }

  .bfw-video-overlay *,
  .bfw-video-overlay *::before,
  .bfw-video-overlay *::after {
    box-sizing: border-box;
  }

  .bfw-video-overlay-btns {
    position: absolute;
    bottom: 12px;
    right: 12px;
    display: flex;
    gap: 8px;
    pointer-events: auto;
  }

  .bfw-overlay-btn {
    padding: 6px 14px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s, opacity 0.15s;
    white-space: nowrap;
    user-select: none;
    display: flex;
    align-items: center;
    gap: 5px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    line-height: 1;
  }

  .bfw-overlay-btn:active {
    transform: scale(0.95);
  }

  .bfw-overlay-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  .bfw-overlay-btn-refresh {
    background: rgba(30, 30, 46, 0.85);
    color: #cdd6f4;
    border: 1px solid rgba(137, 180, 250, 0.3);
  }

  .bfw-overlay-btn-refresh:hover:not(:disabled) {
    background: rgba(49, 50, 68, 0.92);
    border-color: rgba(137, 180, 250, 0.6);
  }

  .bfw-overlay-btn-toggle {
    background: rgba(137, 180, 250, 0.9);
    color: #1e1e2e;
    border: 1px solid transparent;
  }

  .bfw-overlay-btn-toggle:hover:not(:disabled) {
    background: rgba(116, 199, 236, 0.95);
  }

  .bfw-overlay-btn-toggle.mode-real {
    background: rgba(166, 227, 161, 0.9);
    color: #1e1e2e;
  }

  .bfw-overlay-btn-toggle.mode-real:hover:not(:disabled) {
    background: rgba(148, 226, 213, 0.95);
  }

  .bfw-overlay-mode-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    pointer-events: none;
    transition: opacity 0.2s;
  }

  .bfw-overlay-mode-badge.mode-fake {
    background: rgba(137, 180, 250, 0.8);
    color: #1e1e2e;
  }

  .bfw-overlay-mode-badge.mode-real {
    background: rgba(166, 227, 161, 0.8);
    color: #1e1e2e;
  }

  /* ================================================================
   * Crop Editor — modal overlay for manual crop adjustment
   * ================================================================ */

  .bfw-ce-overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    background: rgba(0, 0, 0, 0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  .bfw-ce-modal {
    background: #1e1e2e;
    border: 1px solid #313244;
    border-radius: 10px;
    box-shadow: 0 8px 48px rgba(0, 0, 0, 0.6);
    display: flex;
    flex-direction: column;
    max-width: calc(100vw - 40px);
    max-height: calc(100vh - 40px);
  }

  /* ---- Header ---- */

  .bfw-ce-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid #313244;
  }

  .bfw-ce-title {
    font-size: 13px;
    font-weight: 600;
    color: #cdd6f4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 320px;
  }

  .bfw-ce-close {
    background: none;
    border: none;
    color: #6c7086;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s, background 0.15s;
    flex-shrink: 0;
  }

  .bfw-ce-close:hover {
    color: #f38ba8;
    background: rgba(243, 139, 168, 0.1);
  }

  /* ---- Body ---- */

  .bfw-ce-body {
    display: flex;
    gap: 12px;
    padding: 14px;
    overflow: hidden;
  }

  .bfw-ce-main {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* ---- Display / canvas area ---- */

  .bfw-ce-display-wrapper {
    position: relative;
    background: #11111b;
    border-radius: 4px;
    overflow: hidden;
    user-select: none;
  }

  .bfw-ce-display-img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
  }

  /* Semi-transparent overlay that dims outside the crop box */
  .bfw-ce-crop-mask {
    position: absolute;
    inset: 0;
    pointer-events: none;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
    border-radius: 1px;
  }

  /* ---- Crop box ---- */

  .bfw-ce-crop-box {
    position: absolute;
    box-sizing: border-box;
    border: 2px solid #89b4fa;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5), 0 0 12px rgba(137, 180, 250, 0.3);
    cursor: move;
    z-index: 2;
    /* Grid overlay for composition guidance */
    background-image:
      linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px);
    background-size: calc(100% / 3) calc(100% / 3);
  }

  /* ---- Handles ---- */

  .bfw-ce-handle {
    position: absolute;
    background: #89b4fa;
    border: 2px solid #1e1e2e;
    box-sizing: border-box;
    border-radius: 2px;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.4);
    z-index: 3;
    pointer-events: auto;
  }

  .bfw-ce-h-nw { top: -6px; left: -6px; cursor: nwse-resize; }
  .bfw-ce-h-ne { top: -6px; right: -6px; cursor: nesw-resize; }
  .bfw-ce-h-sw { bottom: -6px; left: -6px; cursor: nesw-resize; }
  .bfw-ce-h-se { bottom: -6px; right: -6px; cursor: nwse-resize; }
  .bfw-ce-h-n  { top: -6px; left: calc(50% - 6px); cursor: ns-resize; }
  .bfw-ce-h-s  { bottom: -6px; left: calc(50% - 6px); cursor: ns-resize; }
  .bfw-ce-h-w  { left: -6px; top: calc(50% - 6px); cursor: ew-resize; }
  .bfw-ce-h-e  { right: -6px; top: calc(50% - 6px); cursor: ew-resize; }

  .bfw-ce-info {
    font-size: 11px;
    color: #a6adc8;
    margin-top: 6px;
  }

  /* ---- Sidebar (preview) ---- */

  .bfw-ce-sidebar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .bfw-ce-preview-label {
    font-size: 11px;
    color: #a6adc8;
    font-weight: 500;
  }

  .bfw-ce-preview-box {
    width: 72px;
    height: 54px;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid #45475a;
    background: #11111b;
  }

  .bfw-ce-preview-canvas {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .bfw-ce-preview-size {
    font-size: 10px;
    color: #585b70;
  }

  /* ---- Footer ---- */

  .bfw-ce-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-top: 1px solid #313244;
    gap: 8px;
  }

  .bfw-ce-footer-right {
    display: flex;
    gap: 8px;
  }

  .bfw-ce-btn {
    padding: 7px 16px;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }

  .bfw-ce-btn:active {
    transform: scale(0.97);
  }

  .bfw-ce-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .bfw-ce-btn-reset {
    background: transparent;
    color: #a6adc8;
    border: 1px solid #45475a;
  }

  .bfw-ce-btn-reset:hover:not(:disabled) {
    background: #313244;
    color: #cdd6f4;
  }

  .bfw-ce-btn-cancel {
    background: transparent;
    color: #cdd6f4;
    border: 1px solid #45475a;
  }

  .bfw-ce-btn-cancel:hover:not(:disabled) {
    background: #313244;
  }

  .bfw-ce-btn-primary {
    background: #89b4fa;
    color: #1e1e2e;
  }

  .bfw-ce-btn-primary:hover:not(:disabled) {
    background: #74c7ec;
  }

  /* Responsive: stack vertically on narrow panels */
  @media (max-width: 600px) {
    .bfw-ce-body {
      flex-direction: column;
      align-items: center;
    }

    .bfw-ce-sidebar {
      flex-direction: row;
      gap: 8px;
    }
  }

  /* ================================================================
   * Progress Stats Section — learning history and aggregate stats
   * ================================================================ */

  .bfw-stats-section {
    margin-top: 14px;
    padding: 0;
    border-top: 1px solid rgba(69, 71, 90, 0.5);
  }

  .bfw-stats-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 10px 10px;
    cursor: pointer;
    user-select: none;
    transition: background 0.15s;
    border-radius: 6px 6px 0 0;
  }

  .bfw-stats-header:hover {
    background: rgba(49, 50, 68, 0.25);
  }

  .bfw-stats-title {
    font-weight: 600;
    font-size: 13px;
    color: #cdd6f4;
    display: flex;
    align-items: center;
    gap: 7px;
    letter-spacing: 0.3px;
  }

  .bfw-stats-toggle {
    background: none;
    border: none;
    color: #74c7ec;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s;
    border-radius: 4px;
  }

  .bfw-stats-toggle:hover {
    color: #89b4fa;
    background: rgba(137, 180, 250, 0.1);
  }

  .bfw-stats-content {
    padding: 0 8px 14px;
    max-height: 600px;
    overflow-y: auto;
  }

  .bfw-stats-content::-webkit-scrollbar {
    width: 5px;
  }

  .bfw-stats-content::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 3px;
  }

  .bfw-stats-group {
    margin-bottom: 18px;
  }

  .bfw-stats-group-title {
    font-size: 11px;
    font-weight: 700;
    color: #74c7ec;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    padding-left: 2px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .bfw-stats-group-title::before {
    content: '';
    width: 3px;
    height: 12px;
    background: linear-gradient(180deg, #89b4fa, #74c7ec);
    border-radius: 2px;
    box-shadow: 0 0 6px rgba(116, 199, 236, 0.4);
  }

  /* ---- Weekly trend chart ---- */

  .bfw-trend-chart {
    position: relative;
    background: linear-gradient(135deg, rgba(49, 50, 68, 0.4) 0%, rgba(40, 40, 61, 0.5) 100%);
    border: 1px solid rgba(69, 71, 90, 0.5);
    border-radius: 8px;
    padding: 16px 12px 12px;
    overflow: hidden;
  }

  .bfw-trend-chart::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(137, 180, 250, 0.4), transparent);
  }

  #bfw-trend-canvas {
    display: block;
    width: 100%;
    height: 140px;
  }

  /* ---- Summary cards grid ---- */

  .bfw-stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 10px;
  }

  .bfw-stat-card {
    background: linear-gradient(135deg, rgba(49, 50, 68, 0.5) 0%, rgba(40, 40, 61, 0.6) 100%);
    border: 1px solid rgba(69, 71, 90, 0.6);
    border-radius: 8px;
    padding: 12px 10px;
    text-align: center;
    position: relative;
    overflow: hidden;
    transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
  }

  .bfw-stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(137, 180, 250, 0.3), transparent);
  }

  .bfw-stat-card:hover {
    transform: translateY(-1px);
    border-color: rgba(137, 180, 250, 0.5);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .stat-label {
    font-size: 10px;
    color: #a6adc8;
    margin-bottom: 6px;
    font-weight: 500;
    letter-spacing: 0.3px;
  }

  .stat-value {
    font-size: 20px;
    font-weight: 700;
    background: linear-gradient(135deg, #a6e3a1 0%, #94e2d5 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1.2;
  }

  /* ---- Recent sessions list ---- */

  .bfw-recent-sessions {
    max-height: 240px;
    overflow-y: auto;
    border-radius: 8px;
    background: rgba(17, 17, 27, 0.4);
    border: 1px solid rgba(69, 71, 90, 0.4);
  }

  .bfw-recent-sessions::-webkit-scrollbar {
    width: 4px;
  }

  .bfw-recent-sessions::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 2px;
  }

  .bfw-sessions-empty {
    padding: 20px 16px;
    text-align: center;
    color: #6c7086;
    font-size: 11px;
  }

  .bfw-session-item {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(69, 71, 90, 0.3);
    transition: background 0.15s;
    position: relative;
  }

  .bfw-session-item:last-child {
    border-bottom: none;
  }

  .bfw-session-item:hover {
    background: rgba(49, 50, 68, 0.3);
  }

  .bfw-session-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 0;
    background: linear-gradient(180deg, #89b4fa, #74c7ec);
    border-radius: 0 2px 2px 0;
    transition: height 0.2s;
  }

  .bfw-session-item:hover::before {
    height: 60%;
  }

  .session-name {
    font-size: 12px;
    font-weight: 600;
    color: #cdd6f4;
    margin-bottom: 5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .session-meta {
    font-size: 10px;
    color: #a6adc8;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .session-meta span {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }

  /* ---- Courses breakdown list ---- */

  .bfw-courses-list {
    max-height: 280px;
    overflow-y: auto;
    border-radius: 8px;
    background: rgba(17, 17, 27, 0.4);
    border: 1px solid rgba(69, 71, 90, 0.4);
  }

  .bfw-courses-list::-webkit-scrollbar {
    width: 4px;
  }

  .bfw-courses-list::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 2px;
  }

  .bfw-courses-empty {
    padding: 20px 16px;
    text-align: center;
    color: #6c7086;
    font-size: 11px;
  }

  .bfw-course-item {
    padding: 12px 14px;
    border-bottom: 1px solid rgba(69, 71, 90, 0.3);
    transition: background 0.15s;
    position: relative;
  }

  .bfw-course-item:last-child {
    border-bottom: none;
  }

  .bfw-course-item:hover {
    background: rgba(49, 50, 68, 0.3);
  }

  .course-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .course-name {
    font-size: 12px;
    font-weight: 600;
    color: #cdd6f4;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-right: 8px;
  }

  .course-rate {
    font-size: 13px;
    font-weight: 700;
    background: linear-gradient(135deg, #a6e3a1 0%, #94e2d5 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    flex-shrink: 0;
    min-width: 38px;
    text-align: right;
  }

  .course-progress {
    margin-bottom: 8px;
  }

  .course-bar {
    height: 6px;
    background: rgba(45, 48, 71, 0.6);
    border-radius: 3px;
    overflow: hidden;
    position: relative;
  }

  .course-bar::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg,
      transparent,
      rgba(255, 255, 255, 0.08) 50%,
      transparent);
    animation: bfw-shimmer 2s infinite;
    opacity: 0;
  }

  .course-bar:hover::before {
    opacity: 1;
  }

  @keyframes bfw-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .course-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #89b4fa 0%, #74c7ec 50%, #94e2d5 100%);
    border-radius: 3px;
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    box-shadow: 0 0 8px rgba(137, 180, 250, 0.3);
  }

  .course-bar-fill::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 8px;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25));
    border-radius: 0 3px 3px 0;
  }

  .course-stats {
    font-size: 10px;
    color: #a6adc8;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .course-stat {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .course-stat::before {
    content: '·';
    color: #45475a;
    font-weight: 700;
  }

  .course-stat:first-child::before {
    content: none;
  }

  /* ---- Actions row ---- */

  .bfw-stats-actions {
    display: flex;
    gap: 8px;
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px solid rgba(69, 71, 90, 0.3);
  }

  .bfw-stats-actions .bfw-btn {
    flex: 1;
    padding: 7px 12px;
    font-size: 11px;
    font-weight: 600;
  }

  /* ================================================================
   * Footer — minimal info bar at bottom of panel
   * ================================================================ */

  .bfw-footer {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 24px;
    padding: 0 10px;
    background: rgba(0, 0, 0, 0.05);
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    font-size: 11px;
    color: #a6adc8;
  }

  .bfw-footer-left {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .bfw-footer-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .bfw-footer-compat {
    display: inline-flex;
    align-items: center;
    cursor: help;
  }

  .bfw-footer-compat svg {
    display: block;
  }

  .bfw-footer-version {
    font-weight: 600;
    color: #89b4fa;
  }

  .bfw-footer-sep {
    color: #45475a;
  }

  .bfw-footer-page {
    color: #a6adc8;
  }

  .bfw-footer-link {
    display: inline-flex;
    align-items: center;
    color: #6c7086;
    text-decoration: none;
    line-height: 1;
    transition: color 0.15s, transform 0.1s;
    cursor: pointer;
  }

  .bfw-footer-link svg {
    display: block;
  }

  .bfw-footer-link:hover {
    color: #89b4fa;
    transform: scale(1.1);
  }

  /* ================================================================
   * Update badge — shown in footer-right when an update is available
   * ================================================================ */

  .bfw-update-btn {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: none;
    border: none;
    padding: 2px 3px;
    border-radius: 4px;
    cursor: pointer;
    color: #a6adc8;
    font-size: 10px;
    line-height: 1;
    transition: color 0.2s, background 0.2s;
    position: relative;
  }

  .bfw-update-btn:hover {
    color: #cdd6f4;
    background: rgba(137, 180, 250, 0.08);
  }

  /* Spinning loader state */
  .bfw-update-btn.checking {
    color: #585b70;
    pointer-events: none;
  }

  /* Update available state — orange accent */
  .bfw-update-btn.has-update {
    color: #fab387;
    animation: bfw-update-pulse 2.5s ease-in-out infinite;
  }

  .bfw-update-btn.has-update:hover {
    color: #fe9057;
    background: rgba(250, 179, 135, 0.1);
    animation: none;
  }

  @keyframes bfw-update-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.6; }
  }

  /* ================================================================
   * Update changelog card — pops up above the footer
   * ================================================================ */

  .bfw-update-card {
    position: absolute;
    bottom: calc(100% + 8px);
    right: 0;
    width: 300px;
    background: #1e1e2e;
    border: 1px solid rgba(250, 179, 135, 0.35);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(250, 179, 135, 0.08);
    z-index: 10;
    overflow: hidden;
    animation: bfw-card-in 0.18s cubic-bezier(0.2, 0, 0.2, 1);
    transform-origin: bottom right;
  }

  @keyframes bfw-card-in {
    from { opacity: 0; transform: scale(0.94) translateY(4px); }
    to   { opacity: 1; transform: scale(1)   translateY(0);    }
  }

  .bfw-update-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px 8px;
    border-bottom: 1px solid rgba(49, 50, 68, 0.8);
  }

  .bfw-update-card-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #fab387;
  }

  .bfw-update-card-close {
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    color: #585b70;
    display: inline-flex;
    align-items: center;
    border-radius: 3px;
    transition: color 0.15s, background 0.15s;
  }

  .bfw-update-card-close:hover {
    color: #cdd6f4;
    background: rgba(205, 214, 244, 0.08);
  }

  .bfw-update-card-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px 0;
    font-size: 11px;
    color: #a6adc8;
  }

  .bfw-update-card-meta .version-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: rgba(250, 179, 135, 0.12);
    color: #fab387;
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 11px;
    font-weight: 600;
  }

  .bfw-update-card-meta .arrow {
    color: #45475a;
    font-size: 10px;
  }

  /* Changelog list inside the card */
  .bfw-update-changelog {
    padding: 8px 12px;
    max-height: 180px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #313244 transparent;
  }

  .bfw-update-changelog::-webkit-scrollbar {
    width: 4px;
  }

  .bfw-update-changelog::-webkit-scrollbar-thumb {
    background: #313244;
    border-radius: 2px;
  }

  .bfw-update-changelog-empty {
    font-size: 11px;
    color: #585b70;
    padding: 4px 0;
  }

  .bfw-changelog-entry {
    display: flex;
    gap: 6px;
    padding: 3px 0;
    font-size: 11px;
    line-height: 1.4;
    border-bottom: 1px solid rgba(49, 50, 68, 0.5);
  }

  .bfw-changelog-entry:last-child {
    border-bottom: none;
  }

  .bfw-changelog-type {
    flex-shrink: 0;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.03em;
    padding: 1px 5px;
    border-radius: 3px;
    align-self: flex-start;
    margin-top: 1px;
    text-transform: uppercase;
  }

  .bfw-type-feature    { background: rgba(137, 180, 250, 0.15); color: #89b4fa; }
  .bfw-type-fix        { background: rgba(243, 139, 168, 0.15); color: #f38ba8; }
  .bfw-type-improvement{ background: rgba(166, 227, 161, 0.15); color: #a6e3a1; }
  .bfw-type-performance{ background: rgba(249, 226, 175, 0.15); color: #f9e2af; }
  .bfw-type-security   { background: rgba(250, 179, 135, 0.15); color: #fab387; }
  .bfw-type-breaking   { background: rgba(243, 139, 168, 0.2);  color: #f38ba8; }
  .bfw-type-docs       { background: rgba(108, 112, 134, 0.2);  color: #6c7086; }
  .bfw-type-internal   { background: rgba(69, 71, 90, 0.4);     color: #45475a; }

  .bfw-changelog-text {
    color: #cdd6f4;
    flex: 1;
    min-width: 0;
  }

  .bfw-changelog-text .desc {
    display: block;
    font-size: 10px;
    color: #6c7086;
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Card action buttons */
  .bfw-update-card-actions {
    display: flex;
    gap: 6px;
    padding: 8px 12px 10px;
    border-top: 1px solid rgba(49, 50, 68, 0.8);
  }

  .bfw-update-install-btn {
    flex: 1;
    background: rgba(250, 179, 135, 0.15);
    border: 1px solid rgba(250, 179, 135, 0.3);
    color: #fab387;
    border-radius: 5px;
    padding: 5px 10px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .bfw-update-install-btn:hover {
    background: rgba(250, 179, 135, 0.25);
    border-color: rgba(250, 179, 135, 0.5);
  }

  .bfw-update-release-btn {
    background: none;
    border: 1px solid rgba(69, 71, 90, 0.6);
    color: #6c7086;
    border-radius: 5px;
    padding: 5px 10px;
    font-size: 11px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
  }

  .bfw-update-release-btn:hover {
    color: #a6adc8;
    border-color: #45475a;
  }
`;

  /**
   * @file SVG icon utilities — feather-based inline SVG icons.
   * All icons are stroke-based and inherit the parent's text color via
   * `stroke="currentColor"`.  They are sized consistently and can be
   * overridden with CSS.
   */

  /**
   * Build an inline SVG icon string.
   * @param {string} body - SVG body content (paths, circles, polylines, etc.)
   * @param {number} [size=16] - Icon size in logical pixels
   * @returns {string} Inline SVG markup
   */
  function svgIcon(body, size = 16) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="bfw-icon">${body}</svg>`;
  }

  const icons = {
    /** Map pin — general "pin / location" metaphor */
    pin:
      svgIcon('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'),

    /** Map pin with filled centre dot — "pinned / locked" state */
    pinFilled:
      svgIcon('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="currentColor" stroke="none"/>'),

    /** Clapper board / film — video capture */
    film:
      svgIcon('<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>'),

    /** Clock — waiting / busy / capturing state */
    clock:
      svgIcon('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),

    /** X / close — delete or dismiss */
    x:
      svgIcon('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>', 14),

    /** Gear — settings */
    settings:
      svgIcon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>', 14),

    /** Toggle-right — on / active state */
    toggleOn:
      svgIcon('<rect x="1" y="5" width="22" height="14" rx="7" ry="7" fill="currentColor" opacity="0.2"/><circle cx="16" cy="12" r="5" fill="currentColor"/>', 20),

    /** Toggle-left — off / inactive state */
    toggleOff:
      svgIcon('<rect x="1" y="5" width="22" height="14" rx="7" ry="7" fill="currentColor" opacity="0.1"/><circle cx="8" cy="12" r="5" fill="currentColor" opacity="0.3"/>', 20),

    /** Book-open — course / lesson */
    book:
      svgIcon('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'),

    /** User-check — face match */
    userCheck:
      svgIcon('<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>'),

    /** Video-camera — camera stream replacement */
    video:
      svgIcon('<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>'),

    /** Check-circle — auto-compare confirmation */
    checkCircle:
      svgIcon('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'),

    /** Refresh/shuffle — swap the displayed pool image */
    refresh:
      svgIcon('<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>'),

    /** Camera toggle — switch between real and fake camera */
    cameraToggle:
      svgIcon('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/><line x1="3" y1="1" x2="21" y2="23"/>'),

    /** Info — circle with "i" used for per-image stats display */
    info:
      svgIcon('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>', 14),

    /** Eye-open — blur off / images visible */
    eye:
      svgIcon('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'),

    /** Eye-off — blur on / images hidden */
    eyeOff:
      svgIcon('<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'),

    /** Monitor — visibility interception / screen detection bypass */
    monitor:
      svgIcon('<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>'),

    /** Sliders — dynamic weight adjustment */
    sliders:
      svgIcon('<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>'),

    /** Bar chart — statistics */
    barChart:
      svgIcon('<line x1="12" y1="2" x2="12" y2="22"/><path d="M19 5h-2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/>'),

    /** Chevron down — collapse/expand indicator */
    chevronDown:
      svgIcon('<polyline points="6 9 12 15 18 9"/>', 14),

    /** Download — export data */
    download:
      svgIcon('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'),

    // Version checker status icons (Bootstrap Icons style)
    /** Check-circle — tested/compatible version */
    versionTested: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="m10.97 4.97-.02.022-3.473 4.425-2.093-2.094a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05"/></svg>`,

    /** Question-circle — unknown version */
    versionUnknown: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94"/></svg>`,

    /** X-circle — incompatible version */
    versionIncompatible: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/></svg>`,

    /** Exclamation-circle — missing version */
    versionMissing: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/></svg>`,

    /** GitHub logo */
    github: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/></svg>`,

    /** Arrow-up-circle — new version available */
    arrowUpCircle:
      svgIcon('<circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/>', 13),

    /** Loader / spinner — checking in progress */
    loader:
      svgIcon('<line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>', 13),

    /** Tag — version label */
    tag:
      svgIcon('<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>', 13),
  };

  /**
   * @file Video frame capture — extracts still frames from the face verification
   * video element for the manual "capture" button in the pool UI.
   *
   * Public API:
   *   findVideoElement(selectors)
   *   captureFrame(video, quality)
   *   isFrameUseful(dataUrl)
   */


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
  function findVideoElement(selectors) {
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
  function captureFrame(video, quality = 0.85) {
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
  function isFrameUseful(dataUrl) {
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

  /**
   * @file UI event handlers — edge-drawer hover/pin, action buttons, image pool interactions.
   */


  // ---------------------------------------------------------------------------
  // Edge-drawer behaviour — hover to reveal, pin to lock
  // ---------------------------------------------------------------------------

  /**
   * Bind edge-drawer click-toggle / pin behaviour.
   *
   * - Click the handle: toggle panel open / close.
   * - Pin button: toggles pinned state — when pinned the panel stays open and
   *   Escape won't close it.  Clicking the handle while pinned unpins and
   *   closes in one action.
   * - Hover no longer triggers open / close.
   *
   * @param {HTMLElement} panel - The panel root element (`.bfw-panel`)
   */
  function bindDrawer(panel) {
    const handle = panel.querySelector('.bfw-panel-handle');
    const pinBtn = panel.querySelector('.bfw-pin-btn');

    if (!handle || !pinBtn) return;

    // ---- Handle click: toggle open / close ----

    handle.addEventListener('click', () => {
      const isOpen = panel.classList.contains('open');

      if (isOpen) {
        // Close — also unpin if currently pinned
        panel.classList.remove('open', 'pinned');
        pinBtn.innerHTML = icons.pin;
        pinBtn.title = '固定面板';
      } else {
        panel.classList.add('open');
      }
    });

    // ---- Pin toggle ----

    pinBtn.addEventListener('click', () => {
      const isPinned = panel.classList.toggle('pinned');

      if (isPinned) {
        pinBtn.innerHTML = icons.pinFilled;
        pinBtn.title = '取消固定';
        // Ensure panel is open when pinning
        panel.classList.add('open');
      } else {
        pinBtn.innerHTML = icons.pin;
        pinBtn.title = '固定面板';
        // Don't close on unpin — user may just want to allow toggle again
      }
    });

    // ---- Click outside to close (non-pinned only) ----
    // Use capture phase so the check runs before innerHTML mutations in
    // panel-internal handlers (e.g. eye toggle replaces its SVG children).

    document.addEventListener('click', (e) => {
      if (!panel.classList.contains('open') || panel.classList.contains('pinned')) return;
      // Don't close on clicks inside the panel or the crop editor modal
      if (panel.contains(e.target) || e.target.closest('.bfw-ce-overlay, .bfw-thumb-stats-popup')) return;
      panel.classList.remove('open');
    }, true);

    // ---- Escape key (non-pinned only) ----

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('open') && !panel.classList.contains('pinned')) {
        // Don't close panel when a stats popup or crop editor is open —
        // let their own Escape handlers dismiss them first.
        if (document.querySelector('.bfw-thumb-stats-popup') || document.querySelector('.bfw-ce-overlay')) return;
        panel.classList.remove('open');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Action button bindings
  // ---------------------------------------------------------------------------

  /**
   * Bind action buttons inside the panel.
   * @param {HTMLElement} panel - The panel root element
   */
  function bindActions(panel) {
    const retryBtn = panel.querySelector('#bfw-btn-retry');
    const clearBtn = panel.querySelector('#bfw-btn-clear');

    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        // Dispatch a custom event that bubbles to document so the
        // auto-processor (which listens on document) can react.
        panel.dispatchEvent(new CustomEvent('bfw:retry', { bubbles: true }));
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const logArea = panel.querySelector('#bfw-log-area');
        if (logArea) logArea.innerHTML = '';
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Settings toggle bindings
  // ---------------------------------------------------------------------------

  /**
   * Bind toggle switches in the settings section.
   * Syncs DOM state ↔ settings.js state and reacts to external changes.
   * @param {HTMLElement} panel
   */
  function bindSettings(panel) {
    // Map DOM IDs to settings keys
    const bindings = [
      { inputId: 'bfw-toggle-face-autoclick', key: 'faceAutoClick' },
      { inputId: 'bfw-toggle-video-replace', key: 'videoReplace' },
      { inputId: 'bfw-toggle-auto-compare', key: 'autoCompare' },
      { inputId: 'bfw-toggle-auto-course', key: 'autoCourse' },
      { inputId: 'bfw-toggle-disable-visibility-check', key: 'disableVisibilityCheck' },
    ];

    for (const { inputId, key } of bindings) {
      const input = panel.querySelector(`#${inputId}`);
      if (!input) continue;

      // Read settings state into DOM
      input.checked = getSetting(key, false);

      // User toggles → update settings
      input.addEventListener('change', () => {
        setSetting(key, input.checked);
        updateSettingUI(panel, key, input.checked);
      });

      // React to programmatic setting changes
      onChange(key, (val) => {
        input.checked = val;
        updateSettingUI(panel, key, val);
      });
    }

    // Initial UI state sync
    for (const { key } of bindings) {
      updateSettingUI(panel, key, getSetting(key, false));
    }

    // ---- Dynamic weight setting sync (button, not checkbox) ----
    onChange('dynamicWeight', (val) => {
      const weightBtn = panel.querySelector('#bfw-btn-weight');
      if (weightBtn) {
        weightBtn.classList.toggle('active', val);
        weightBtn.title = val
          ? '动态权重: 开 — 根据图片成功率自动调整选中概率'
          : '动态权重: 关 — 所有图片等概率随机选取';
      }
    });
  }

  /**
   * Update the visual state of a setting row when its value changes.
   * @param {HTMLElement} panel
   * @param {string} key
   * @param {boolean} value
   */
  function updateSettingUI(panel, key, value) {
    const row = panel.querySelector(`.bfw-setting-row[data-setting="${key}"]`);
    if (!row) return;

    const toggleIcon = row.querySelector('.bfw-toggle-icon');
    if (toggleIcon) {
      toggleIcon.innerHTML = value ? icons.toggleOn : icons.toggleOff;
    }

    // Update status dot and text for settings
    if (key === 'faceAutoClick' || key === 'videoReplace' || key === 'autoCompare') {
      const fcOn = getSetting('faceAutoClick', true);
      const vrOn = getSetting('videoReplace', true);
      const acOn = getSetting('autoCompare', true);

      if (!fcOn && !vrOn) {
        setStatus(false, '已停止 — 所有功能已关闭');
      } else if (vrOn) {
        setStatus(true, '运行中 — 摄像头已替换');
      } else if (!fcOn) {
        setStatus(true, '运行中 — 仅替换画面 (自动点击已关闭)');
      } else if (!acOn) {
        setStatus(true, '运行中 — 拍照后暂停确认');
      } else {
        setStatus(true, '运行中 — 摄像头已替换');
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Image pool event bindings
  // ---------------------------------------------------------------------------

  /**
   * Set a transient status message in the pool section.
   * @param {HTMLElement} panel
   * @param {string} msg
   * @param {'ok'|'error'} [kind='ok']
   */
  function poolStatus(panel, msg, kind = 'ok') {
    const el = panel.querySelector('#bfw-pool-status');
    if (!el) return;
    el.textContent = msg;
    el.className = `bfw-pool-status${kind === 'error' ? ' error' : ''}`;
    if (msg) {
      setTimeout(() => {
        if (el.textContent === msg) {
          el.textContent = '';
          el.className = 'bfw-pool-status';
        }
      }, 3000);
    }
  }

  /**
   * Bind all image-pool related events: upload, drag-drop, delete, clear.
   * @param {HTMLElement} panel
   */
  function bindPoolEvents(panel) {
    const dropZone = panel.querySelector('#bfw-pool-drop-zone');
    const fileInput = panel.querySelector('#bfw-pool-file-input');
    const uploadBtn = panel.querySelector('#bfw-btn-upload');
    const captureBtn = panel.querySelector('#bfw-btn-capture');
    const clearBtn = panel.querySelector('#bfw-btn-clear-pool');

    if (!dropZone || !fileInput) return;

    // ---- Blur toggle ----
    const eyeBtn = panel.querySelector('#bfw-btn-eye');
    const thumbsEl = panel.querySelector('#bfw-pool-thumbs');
    if (eyeBtn && thumbsEl) {
      eyeBtn.addEventListener('click', () => {
        const active = thumbsEl.classList.toggle('blur');
        eyeBtn.classList.toggle('active', active);
        eyeBtn.innerHTML = active ? icons.eyeOff : icons.eye;
        eyeBtn.title = active ? '显示原图' : '隐私模糊';
      });
    }

    // ---- Weight toggle ----
    const weightBtn = panel.querySelector('#bfw-btn-weight');
    if (weightBtn) {
      // Init from settings
      const weightOn = getSetting('dynamicWeight', true);
      weightBtn.classList.toggle('active', weightOn);
      weightBtn.title = weightOn
        ? '动态权重: 开 — 根据图片成功率自动调整选中概率'
        : '动态权重: 关 — 所有图片等概率随机选取';

      weightBtn.addEventListener('click', () => {
        const active = weightBtn.classList.toggle('active');
        weightBtn.title = active
          ? '动态权重: 开 — 根据图片成功率自动调整选中概率'
          : '动态权重: 关 — 所有图片等概率随机选取';
        setSetting('dynamicWeight', active);
      });
    }

    // ---- Upload trigger ----
    function openFilePicker() {
      fileInput.value = ''; // Allow re-uploading the same file
      fileInput.click();
    }

    dropZone.addEventListener('click', (e) => {
      // Don't trigger if user clicked the hidden input itself
      if (e.target === fileInput) return;
      openFilePicker();
    });

    if (uploadBtn) {
      uploadBtn.addEventListener('click', openFilePicker);
    }

    // ---- Capture button (video frame → pool) ----
    if (captureBtn) {
      captureBtn.addEventListener('click', async () => {
        // Defensive: don't allow double-clicks while capture is in progress
        if (captureBtn.disabled) return;
        captureBtn.disabled = true;
        captureBtn.innerHTML = `${icons.clock} 正在捕获…`;
        // Add spin animation to the clock icon
        const clockIcon = captureBtn.querySelector('.bfw-icon');
        if (clockIcon) clockIcon.classList.add('bfw-icon-spin');

        try {
          await handleCapture(panel);
        } finally {
          captureBtn.disabled = false;
          captureBtn.innerHTML = `${icons.film} 捕获`;
        }
      });
    }

    // ---- File selection ----
    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      if (files.length > 0) {
        handleUpload(panel, files);
      }
    });

    // ---- Drag and drop ----
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');

      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) {
        handleUpload(panel, files);
      }
    });

    // ---- Delete image (via custom event) ----
    panel.addEventListener('bfw:delete-image', async (e) => {
      const { id } = /** @type {CustomEvent} */ (e).detail;
      if (id == null) return;

      const ok = await removeImage(id);
      if (ok) {
        poolStatus(panel, '图片已移除');
        appendLog('图片已从图片池移除');
      }
      refreshPoolUI(panel);
    });

    // ---- Clear all ----
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        const count = poolSize();
        if (count === 0) return;

        // Safety check — don't confirm if only 1 image
        if (count > 1) {
          const confirmed = confirm(`确定要删除图片池中全部 ${count} 张图片吗？`);
          if (!confirmed) return;
        }

        await clearPool();
        refreshPoolUI(panel);
        poolStatus(panel, '全部图片已清空');
        appendLog(`图片池已清空 (原有 ${count} 张)`);
      });
    }

    // ---- Stats popup dismissal — click outside closes it ----
    document.addEventListener('click', (e) => {
      // If there's a stats popup open and the click is not on an info button
      // or inside the popup itself, close it.
      const popup = document.querySelector('.bfw-thumb-stats-popup');
      if (!popup) return;
      if (popup.contains(e.target)) return;
      if (e.target.closest('.bfw-thumb-info')) return;
      hideStatsPopup();
    });

    // ---- Escape key dismissal ----
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        hideStatsPopup();
      }
    });
  }

  /**
   * Process and upload a batch of files to the image pool.
   * @param {HTMLElement} panel
   * @param {File[]} files
   */
  async function handleUpload(panel, files) {
    const cap = poolCapacity();
    const current = poolSize();

    if (current >= cap) {
      poolStatus(panel, `图片池已满 (${current}/${cap})。请先移除一些图片。`, 'error');
      return;
    }

    // Filter to images only (defensive — the input accept attr should catch most)
    const imageFiles = files.filter((f) =>
      f.type.startsWith('image/') || f.type === '',
    );

    if (imageFiles.length === 0) {
      poolStatus(panel, '未选择有效的图片文件', 'error');
      return;
    }

    poolStatus(panel, `正在处理 ${imageFiles.length} 张图片…`);

    try {
      const result = await addImages(imageFiles);

      // Refresh UI + log
      refreshPoolUI(panel);

      // Build status message
      const parts = [];
      if (result.added.length > 0) parts.push(`${result.added.length} 张已添加`);
      if (result.skipped > 0) parts.push(`${result.skipped} 张已跳过`);

      if (parts.length > 0) {
        const isError = result.added.length === 0;
        poolStatus(panel, parts.join(', '), isError ? 'error' : 'ok');
      }

      if (result.added.length > 0) {
        appendLog(`图片池: 已添加 ${result.added.length} 张图片 (${poolSize()}/${cap})`);
      }
      if (result.skipped > 0) {
        appendLog(`图片池: ${result.skipped} 个文件已跳过 (无效/重复/已满)`);
      }
    } catch (e) {
      poolStatus(panel, '上传失败 — 请查看控制台', 'error');
      console.error('Image pool upload error:', e);
    }
  }

  /**
   * Capture a frame from the video element and feed it into the image pool.
   * @param {HTMLElement} panel
   */
  async function handleCapture(panel) {
    const cap = poolCapacity();
    const current = poolSize();

    if (current >= cap) {
      poolStatus(panel, `图片池已满 (${current}/${cap})。请先移除一些图片。`, 'error');
      return;
    }

    // Reset interval gate so manual capture always works

    const video = findVideoElement(VIDEO_CAPTURE_SELECTORS);
    if (!video) {
      poolStatus(panel, '页面上未找到视频元素', 'error');
      return;
    }

    const dataUrl = captureFrame(video, IMAGE_POOL_CONFIG.JPEG_QUALITY);
    if (!dataUrl) {
      poolStatus(panel, '视频帧捕获失败', 'error');
      return;
    }

    poolStatus(panel, '已捕获帧 — 正在验证…');

    const useful = await isFrameUseful(dataUrl);
    if (!useful) {
      poolStatus(panel, '捕获的帧为空或无效 — 已跳过', 'error');
      return;
    }

    // Store in pool
    const ts = Date.now();
    const name = `captured_${ts}`;
    const entry = await addImageFromDataURI(dataUrl, name);

    if (!entry) {
      poolStatus(panel, '帧未保存 (重复/已满/存储错误)', 'error');
      return;
    }

    refreshPoolUI(panel);
    poolStatus(panel, `已捕获! ${entry.width}×${entry.height} → 图片池 (${poolSize()}/${cap})`);
    appendLog(`已捕获帧: ${entry.width}×${entry.height} → 图片池`);
  }

  /**
   * @file Crop editor — modal UI for manually adjusting image crop rectangles.
   *
   * Displays the original un-cropped image with a draggable, resizable 4:3
   * crop overlay.  Handles 8 resize grips (4 corners + 4 edge midpoints)
   * with aspect-ratio locking.  A live preview thumbnail shows the result
   * in real time.  On save, the re-cropped image is persisted back to the
   * image pool via updateCrop().
   */


  // ---------------------------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------------------------

  /** Current modal root — only one editor can be open at a time. */
  let activeModal = null;

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Open the crop editor for a given pool entry.
   *
   * @param {number} entryId
   * @param {import('../pool/image-pool.js').PoolEntry} entry
   * @param {Function} onSaved — callback when crop is saved (for refreshing pool UI)
   */
  async function openCropEditor(entryId, entry, onSaved) {
    // Close any existing editor
    if (activeModal) closeCropEditor();

    const cfg = CROP_EDITOR_CONFIG;

    // Validate that we have crop params
    if (!entry.cropParams) {
      // This shouldn't happen if the UI only enables click for entries with cropParams,
      // but guard defensively.
      return;
    }

    // Load original image
    const origDataUrl = await getOriginalImageData(entryId);
    if (!origDataUrl) {
      return;
    }

    // Decode original
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Failed to decode original image'));
      el.src = origDataUrl;
    });

    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;

    // The crop params were computed against the full-resolution original.
    // The stored original is compressed (max 1200px).  Scale the crop rect
    // to match the compressed image's coordinate space.
    /** @type {{sx:number,sy:number,sw:number,sh:number}} */
    let crop;
    const storedW = entry.origWidth || 0;
    const storedH = entry.origHeight || 0;
    if (storedW > 0 && storedH > 0 && (srcW !== storedW || srcH !== storedH)) {
      const scaleX = srcW / storedW;
      const scaleY = srcH / storedH;
      crop = {
        sx: entry.cropParams.sx * scaleX,
        sy: entry.cropParams.sy * scaleY,
        sw: entry.cropParams.sw * scaleX,
        sh: entry.cropParams.sh * scaleY,
      };
    } else {
      crop = { ...entry.cropParams };
    }

    // Compute display scale — fit within MAX_DISPLAY_SIZE
    const scale = Math.min(cfg.MAX_DISPLAY_SIZE / srcW, cfg.MAX_DISPLAY_SIZE / srcH, 1);
    const dispW = Math.round(srcW * scale);
    const dispH = Math.round(srcH * scale);

    // Build modal DOM
    const modal = createModalDOM(dispW, dispH, entry);
    activeModal = modal;
    document.body.appendChild(modal);

    // Cache references
    const displayImg = modal.querySelector('.bfw-ce-display-img');
    const cropBox = modal.querySelector('.bfw-ce-crop-box');
    const previewCanvas = modal.querySelector('.bfw-ce-preview-canvas');
    const previewCtx = previewCanvas.getContext('2d');
    const infoEl = modal.querySelector('.bfw-ce-info');

    displayImg.src = origDataUrl;

    // State for mouse interactions
    /** @type {'move'|'nw'|'ne'|'sw'|'se'|'n'|'s'|'w'|'e'|null} */
    let dragMode = null;
    let dragStart = { x: 0, y: 0, crop: null };

    // -----------------------------------------------------------------------
    // Coordinate helpers
    // -----------------------------------------------------------------------

    /** Convert source-pixel coords to display-space coords */
    function srcToDisp(r) {
      return {
        x: Math.round(r.sx * scale),
        y: Math.round(r.sy * scale),
        w: Math.round(r.sw * scale),
        h: Math.round(r.sh * scale),
      };
    }

    /** Clamp crop rect to source image bounds and ensure minimum size */
    function clampCrop(r) {
      const minPx = cfg.MIN_CROP_PX;
      let sx = Math.max(0, Math.min(r.sx, srcW - minPx));
      let sy = Math.max(0, Math.min(r.sy, srcH - minPx));
      let sw = Math.max(minPx, Math.min(r.sw, srcW - sx));
      let sh = Math.max(minPx, Math.min(r.sh, srcH - sy));

      // Re-enforce target ratio: adjust width to match height * ratio
      // Prefer shrinking width (more forgiving) over shrinking height
      const targetRatio = cfg.TARGET_RATIO;
      const adjustedW = sh * targetRatio;
      if (adjustedW <= srcW - sx) {
        sw = adjustedW;
      } else {
        sw = srcW - sx;
        sh = sw / targetRatio;
        if (sh > srcH - sy) {
          sh = srcH - sy;
          sw = sh * targetRatio;
        }
      }

      // Re-clamp
      if (sx + sw > srcW) { sx = srcW - sw; }
      if (sy + sh > srcH) { sy = srcH - sh; }
      if (sx < 0) { sx = 0; }
      if (sy < 0) { sy = 0; }

      return { sx, sy, sw, sh };
    }

    // -----------------------------------------------------------------------
    // UI update
    // -----------------------------------------------------------------------

    function updateCropBox() {
      const d = srcToDisp(crop);
      cropBox.style.left = `${d.x}px`;
      cropBox.style.top = `${d.y}px`;
      cropBox.style.width = `${d.w}px`;
      cropBox.style.height = `${d.h}px`;
    }

    /** Draw the crop result directly onto the preview canvas — no toDataURL. */
    function drawPreview() {
      const pw = previewCanvas.width;
      const ph = previewCanvas.height;
      previewCtx.clearRect(0, 0, pw, ph);
      previewCtx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, pw, ph);
    }

    function updateInfo() {
      if (infoEl) {
        infoEl.textContent = `${crop.sw.toFixed(0)}×${crop.sh.toFixed(0)} px`;
      }
    }

    /** rAF-based throttling — at most one visual update per animation frame. */
    let _rafPending = null;
    let _needsInfoOnly = false;

    function refreshUI(infoOnly) {
      if (_rafPending) return;
      _rafPending = requestAnimationFrame(() => {
        _rafPending = null;
        updateCropBox();
        if (!_needsInfoOnly) drawPreview();
        _needsInfoOnly = false;
        updateInfo();
      });
    }

    function flushUI() {
      if (_rafPending) {
        cancelAnimationFrame(_rafPending);
        _rafPending = null;
      }
      updateCropBox();
      drawPreview();
      updateInfo();
    }

    // -----------------------------------------------------------------------
    // Mouse handlers (attached to the display wrapper)
    // -----------------------------------------------------------------------

    const wrapper = modal.querySelector('.bfw-ce-display-wrapper');

    function getEventPos(e) {
      // Use cached rect during active drag to avoid layout thrashing
      const rect = _dragRect || wrapper.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    /** Cached bounding rect set at mousedown, cleared on mouseup */
    let _dragRect = null;

    /**
     * Determine which handle the pointer is over (in display coordinates).
     * Returns null if not on any handle.
     */
    function hitTestHandle(dx, dy) {
      const d = srcToDisp(crop);
      const radius = cfg.HANDLE_RADIUS;

      // Corners
      if (Math.abs(dx - d.x) <= radius && Math.abs(dy - d.y) <= radius) return 'nw';
      if (Math.abs(dx - (d.x + d.w)) <= radius && Math.abs(dy - d.y) <= radius) return 'ne';
      if (Math.abs(dx - d.x) <= radius && Math.abs(dy - (d.y + d.h)) <= radius) return 'sw';
      if (Math.abs(dx - (d.x + d.w)) <= radius && Math.abs(dy - (d.y + d.h)) <= radius) return 'se';

      // Edge midpoints
      if (Math.abs(dx - (d.x + d.w / 2)) <= radius && Math.abs(dy - d.y) <= radius) return 'n';
      if (Math.abs(dx - (d.x + d.w / 2)) <= radius && Math.abs(dy - (d.y + d.h)) <= radius) return 's';
      if (Math.abs(dx - d.x) <= radius && Math.abs(dy - (d.y + d.h / 2)) <= radius) return 'w';
      if (Math.abs(dx - (d.x + d.w)) <= radius && Math.abs(dy - (d.y + d.h / 2)) <= radius) return 'e';

      return null;
    }

    wrapper.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Only left button
      const pos = getEventPos(e);
      const d = srcToDisp(crop);

      // Check if click is inside crop box
      const inBox = pos.x >= d.x && pos.x <= d.x + d.w
                 && pos.y >= d.y && pos.y <= d.y + d.h;

      if (!inBox) return;

      // Check handles first
      const handle = hitTestHandle(pos.x, pos.y);
      dragMode = handle || 'move';
      dragStart = {
        x: pos.x,
        y: pos.y,
        crop: { ...crop },
      };

      e.preventDefault();
      e.stopPropagation();

      // Cache bounding rect for the duration of this drag
      _dragRect = wrapper.getBoundingClientRect();

      // Bind document-level listeners so drag continues outside the wrapper
      document.addEventListener('mousemove', onDragMove);
      document.addEventListener('mouseup', onDragEnd);
    });

    function onDragMove(e) {
      if (!dragMode) return;
      const pos = getEventPos(e);
      const dx = (pos.x - dragStart.x) / scale;
      const dy = (pos.y - dragStart.y) / scale;
      const orig = dragStart.crop;
      const ratio = cfg.TARGET_RATIO;

      let newCrop;

      switch (dragMode) {
        case 'move': {
          newCrop = {
            sx: orig.sx + dx,
            sy: orig.sy + dy,
            sw: orig.sw,
            sh: orig.sh,
          };
          break;
        }
        // Corners — anchor opposite corner, adjust width then derive height from ratio
        case 'nw': {
          const newSW = orig.sw - dx;
          const newSH = newSW / ratio;
          newCrop = {
            sx: orig.sx + orig.sw - newSW,
            sy: orig.sy + orig.sh - newSH,
            sw: newSW,
            sh: newSH,
          };
          break;
        }
        case 'se': {
          const newSW = orig.sw + dx;
          newCrop = {
            sx: orig.sx,
            sy: orig.sy,
            sw: newSW,
            sh: newSW / ratio,
          };
          break;
        }
        case 'ne': {
          const newSW = orig.sw + dx;
          const newSH = newSW / ratio;
          newCrop = {
            sx: orig.sx,
            sy: orig.sy + orig.sh - newSH,
            sw: newSW,
            sh: newSH,
          };
          break;
        }
        case 'sw': {
          const newSW = orig.sw - dx;
          const newSH = newSW / ratio;
          newCrop = {
            sx: orig.sx + orig.sw - newSW,
            sy: orig.sy,
            sw: newSW,
            sh: newSH,
          };
          break;
        }
        // Edges — adjust one dimension, derive the other from ratio
        case 'n': {
          const newSH = orig.sh - dy;
          const newSW = newSH * ratio;
          newCrop = {
            sx: orig.sx + (orig.sw - newSW) / 2,
            sy: orig.sy + orig.sh - newSH,
            sw: newSW,
            sh: newSH,
          };
          break;
        }
        case 's': {
          const newSH = orig.sh + dy;
          const newSW = newSH * ratio;
          newCrop = {
            sx: orig.sx + (orig.sw - newSW) / 2,
            sy: orig.sy,
            sw: newSW,
            sh: newSH,
          };
          break;
        }
        case 'w': {
          const newSW = orig.sw - dx;
          const newSH = newSW / ratio;
          newCrop = {
            sx: orig.sx + orig.sw - newSW,
            sy: orig.sy + (orig.sh - newSH) / 2,
            sw: newSW,
            sh: newSH,
          };
          break;
        }
        case 'e': {
          const newSW = orig.sw + dx;
          const newSH = newSW / ratio;
          newCrop = {
            sx: orig.sx,
            sy: orig.sy + (orig.sh - newSH) / 2,
            sw: newSW,
            sh: newSH,
          };
          break;
        }
        default:
          return;
      }

      crop = clampCrop(newCrop);
      refreshUI();
    }

    function onDragEnd() {
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);
      _dragRect = null;
      dragMode = null;
      dragStart = null;
      wrapper.style.cursor = 'default';
    }

    // Hover cursor feedback (non-drag)
    wrapper.addEventListener('mousemove', (e) => {
      if (dragMode) return; // onDragMove handles active drag
      const pos = getEventPos(e);
      const d = srcToDisp(crop);
      const inBox = pos.x >= d.x && pos.x <= d.x + d.w
                 && pos.y >= d.y && pos.y <= d.y + d.h;
      if (!inBox) {
        wrapper.style.cursor = 'default';
        return;
      }
      const handle = hitTestHandle(pos.x, pos.y);
      const cursors = {
        nw: 'nwse-resize', se: 'nwse-resize',
        ne: 'nesw-resize', sw: 'nesw-resize',
        n: 'ns-resize', s: 'ns-resize',
        w: 'ew-resize', e: 'ew-resize',
      };
      wrapper.style.cursor = cursors[handle] || 'move';
    });

    // -----------------------------------------------------------------------
    // Buttons
    // -----------------------------------------------------------------------

    // Reset to auto-detect
    const resetBtn = modal.querySelector('.bfw-ce-btn-reset');
    resetBtn.addEventListener('click', async () => {
      resetBtn.disabled = true;
      resetBtn.textContent = '检测中…';
      try {
        const originalImg = await new Promise((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error('failed'));
          el.src = origDataUrl;
        });
        const { cropRect } = await smartCropToStandard(originalImg);
        crop = clampCrop(cropRect);
        flushUI();
      } catch (e) {
        // Keep current crop on failure
      } finally {
        resetBtn.disabled = false;
        resetBtn.textContent = '重新检测';
      }
    });

    // Save
    const saveBtn = modal.querySelector('.bfw-ce-btn-save');
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.textContent = '保存中…';
      try {
        const ok = await updateCrop(entryId, crop);
        if (ok && onSaved) onSaved();
      } finally {
        closeCropEditor();
      }
    });

    // Cancel
    const cancelBtn = modal.querySelector('.bfw-ce-btn-cancel');
    cancelBtn.addEventListener('click', () => closeCropEditor());

    // Close via backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeCropEditor();
    });

    // Close via Escape
    const onKey = (e) => {
      if (e.key === 'Escape') closeCropEditor();
    };
    document.addEventListener('keydown', onKey);
    modal._onKey = onKey;

    // Initial render
    flushUI();
  }

  /**
   * Close the active crop editor modal, if any.
   */
  function closeCropEditor() {
    if (!activeModal) return;

    if (activeModal._onKey) {
      document.removeEventListener('keydown', activeModal._onKey);
    }
    activeModal.remove();
    activeModal = null;
  }

  // ---------------------------------------------------------------------------
  // DOM factory
  // ---------------------------------------------------------------------------

  /**
   * Build the crop editor modal DOM.
   *
   * @param {number} dispW  — image display width
   * @param {number} dispH  — image display height
   * @param {import('../pool/image-pool.js').PoolEntry} entry
   * @returns {HTMLElement}
   */
  function createModalDOM(dispW, dispH, entry) {
    const modal = document.createElement('div');
    modal.className = 'bfw-ce-overlay';

    const hs = CROP_EDITOR_CONFIG.HANDLE_SIZE;
    const previewW = CROP_EDITOR_CONFIG.PREVIEW_SIZE;
    const previewH = Math.round(previewW / CROP_EDITOR_CONFIG.TARGET_RATIO);

    modal.innerHTML = `
    <div class="bfw-ce-modal" style="--ce-disp-w: ${dispW}px; --ce-disp-h: ${dispH}px;">
      <div class="bfw-ce-header">
        <span class="bfw-ce-title">裁剪编辑 — ${escapeHtml$2(entry.name)}</span>
        <button class="bfw-ce-close" title="关闭">${icons.x}</button>
      </div>
      <div class="bfw-ce-body">
        <div class="bfw-ce-main">
          <div class="bfw-ce-display-wrapper" style="width:${dispW}px;height:${dispH}px;">
            <img class="bfw-ce-display-img" draggable="false" />
            <div class="bfw-ce-crop-mask"></div>
            <div class="bfw-ce-crop-box">
              <div class="bfw-ce-handle bfw-ce-h-nw" style="width:${hs}px;height:${hs}px;"></div>
              <div class="bfw-ce-handle bfw-ce-h-ne" style="width:${hs}px;height:${hs}px;"></div>
              <div class="bfw-ce-handle bfw-ce-h-sw" style="width:${hs}px;height:${hs}px;"></div>
              <div class="bfw-ce-handle bfw-ce-h-se" style="width:${hs}px;height:${hs}px;"></div>
              <div class="bfw-ce-handle bfw-ce-h-n"  style="width:${hs}px;height:${hs}px;"></div>
              <div class="bfw-ce-handle bfw-ce-h-s"  style="width:${hs}px;height:${hs}px;"></div>
              <div class="bfw-ce-handle bfw-ce-h-w"  style="width:${hs}px;height:${hs}px;"></div>
              <div class="bfw-ce-handle bfw-ce-h-e"  style="width:${hs}px;height:${hs}px;"></div>
            </div>
          </div>
          <div class="bfw-ce-info"></div>
        </div>
        <div class="bfw-ce-sidebar">
          <div class="bfw-ce-preview-label">裁剪预览</div>
          <div class="bfw-ce-preview-box">
            <canvas class="bfw-ce-preview-canvas" width="${previewW}" height="${previewH}"></canvas>
          </div>
          <div class="bfw-ce-preview-size">400 × 300</div>
        </div>
      </div>
      <div class="bfw-ce-footer">
        <button class="bfw-ce-btn bfw-ce-btn-reset">重新检测</button>
        <div class="bfw-ce-footer-right">
          <button class="bfw-ce-btn bfw-ce-btn-cancel">取消</button>
          <button class="bfw-ce-btn bfw-ce-btn-save bfw-ce-btn-primary">保存</button>
        </div>
      </div>
    </div>
  `;

    return modal;
  }

  /** Escape HTML special characters. */
  function escapeHtml$2(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * @file Progress statistics panel — displays learning session history and aggregate stats.
   *
   * Creates a collapsible stats section in the main panel with:
   *   - Today's summary (sessions, minutes, lessons)
   *   - This week's summary (sessions, minutes, lessons, active days)
   *   - All-time summary (total sessions, study time, lessons, courses)
   *   - Recent sessions log (last 10)
   *   - Course breakdown list (sortable by last study date)
   *   - Clear history action
   */


  // ---------------------------------------------------------------------------
  // Chart rendering cache
  // ---------------------------------------------------------------------------

  /** Last rendered chart data key (used to skip redundant redraws) */
  let _lastChartDataKey = null;

  /**
   * Create the stats section DOM.
   * @returns {HTMLElement}
   */
  function createStatsSection() {
    const section = document.createElement('div');
    section.className = 'bfw-stats-section';
    section.innerHTML = `
    <div class="bfw-stats-header">
      <span class="bfw-stats-title">${icons.barChart} 学习统计</span>
      <button class="bfw-stats-toggle" title="切换统计面板">${icons.chevronDown}</button>
    </div>
    <div class="bfw-stats-content" style="display: none;">
      <!-- Today's stats -->
      <div class="bfw-stats-group">
        <div class="bfw-stats-group-title">今天</div>
        <div class="bfw-stats-grid">
          <div class="bfw-stat-card">
            <div class="stat-label">学习次数</div>
            <div class="stat-value" id="stat-today-sessions">0</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">学习时长</div>
            <div class="stat-value" id="stat-today-duration">0分钟</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">课程完成</div>
            <div class="stat-value" id="stat-today-lessons">0</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">课程数</div>
            <div class="stat-value" id="stat-today-courses">0</div>
          </div>
        </div>
      </div>

      <!-- This week's stats -->
      <div class="bfw-stats-group">
        <div class="bfw-stats-group-title">本周</div>
        <div class="bfw-stats-grid">
          <div class="bfw-stat-card">
            <div class="stat-label">学习次数</div>
            <div class="stat-value" id="stat-week-sessions">0</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">学习时长</div>
            <div class="stat-value" id="stat-week-duration">0小时</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">课程完成</div>
            <div class="stat-value" id="stat-week-lessons">0</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">活跃天数</div>
            <div class="stat-value" id="stat-week-days">0</div>
          </div>
        </div>
      </div>

      <!-- Weekly trend chart -->
      <div class="bfw-stats-group">
        <div class="bfw-stats-group-title">学习趋势</div>
        <div class="bfw-trend-chart" id="bfw-trend-chart">
          <canvas id="bfw-trend-canvas"></canvas>
        </div>
      </div>

      <!-- All-time stats -->
      <div class="bfw-stats-group">
        <div class="bfw-stats-group-title">累计</div>
        <div class="bfw-stats-grid">
          <div class="bfw-stat-card">
            <div class="stat-label">总学习次数</div>
            <div class="stat-value" id="stat-total-sessions">0</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">总学习时长</div>
            <div class="stat-value" id="stat-total-duration">0小时</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">总课程完成</div>
            <div class="stat-value" id="stat-total-lessons">0</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">课程数</div>
            <div class="stat-value" id="stat-total-courses">0</div>
          </div>
        </div>
      </div>

      <!-- Recent sessions -->
      <div class="bfw-stats-group">
        <div class="bfw-stats-group-title">最近学习</div>
        <div class="bfw-recent-sessions" id="bfw-recent-sessions">
          <div class="bfw-sessions-empty">暂无学习记录</div>
        </div>
      </div>

      <!-- Courses breakdown -->
      <div class="bfw-stats-group">
        <div class="bfw-stats-group-title">课程详情</div>
        <div class="bfw-courses-list" id="bfw-courses-list">
          <div class="bfw-courses-empty">暂无课程</div>
        </div>
      </div>

      <!-- Actions -->
      <div class="bfw-stats-actions">
        <button class="bfw-btn bfw-btn-ghost" id="bfw-btn-export-stats" title="导出统计数据为 JSON">${icons.download} 导出</button>
        <button class="bfw-btn bfw-btn-danger" id="bfw-btn-clear-stats">清空统计</button>
      </div>
    </div>
  `;

    return section;
  }

  /**
   * Refresh all stats displays.
   * Called on panel mount or when stats data changes.
   *
   * @param {HTMLElement} panel - The main panel element
   */
  function refreshStats(panel) {
    if (!panel) return;

    const statsSection = panel.querySelector('.bfw-stats-section');
    if (!statsSection) return;

    // Today's stats
    const today = getTodayStats();
    panel.querySelector('#stat-today-sessions').textContent = today.sessionsCount;
    panel.querySelector('#stat-today-duration').textContent = `${today.totalDuration}分钟`;
    panel.querySelector('#stat-today-lessons').textContent = today.lessonsCompleted;
    panel.querySelector('#stat-today-courses').textContent = today.coursesStudied.size;

    // This week's stats
    const week = getWeekStats();
    panel.querySelector('#stat-week-sessions').textContent = week.sessionsCount;
    panel.querySelector('#stat-week-duration').textContent = week.totalDuration >= 60
      ? `${Math.round(week.totalDuration / 60)}小时`
      : `${week.totalDuration}分钟`;
    panel.querySelector('#stat-week-lessons').textContent = week.lessonsCompleted;
    panel.querySelector('#stat-week-days').textContent = week.daysActive;

    // Weekly trend chart
    refreshTrendChart(panel);

    // All-time stats
    const allTime = getAllTimeStats();
    panel.querySelector('#stat-total-sessions').textContent = allTime.sessionsCount;
    panel.querySelector('#stat-total-duration').textContent = allTime.totalDuration >= 60
      ? `${Math.round(allTime.totalDuration / 60)}小时`
      : `${allTime.totalDuration}分钟`;
    panel.querySelector('#stat-total-lessons').textContent = allTime.lessonsCompleted;
    panel.querySelector('#stat-total-courses').textContent = allTime.coursesCount;

    // Recent sessions
    const recentEl = panel.querySelector('#bfw-recent-sessions');
    const recentSessions = getRecentSessions(10);
    if (recentSessions.length === 0) {
      recentEl.innerHTML = '<div class="bfw-sessions-empty">暂无学习记录</div>';
    } else {
      recentEl.innerHTML = recentSessions.map(session => `
      <div class="bfw-session-item">
        <div class="session-name">${escapeHtml$1(session.courseName)}</div>
        <div class="session-meta">
          <span class="session-time">${session.startDate}</span>
          <span class="session-duration">${session.durationMin}分钟</span>
          <span class="session-lessons">完成 ${session.lessonsCompleted} 课</span>
        </div>
      </div>
    `).join('');
    }

    // Courses breakdown
    const coursesEl = panel.querySelector('#bfw-courses-list');
    const courses = getCoursesList();
    if (courses.length === 0) {
      coursesEl.innerHTML = '<div class="bfw-courses-empty">暂无课程</div>';
    } else {
      coursesEl.innerHTML = courses.map(course => {
        const sessionCount = course.sessions ? course.sessions.length : 0;
        const totalMinutes = course.totalStudyTime || 0;
        const totalHours = totalMinutes >= 60 ? Math.round(totalMinutes / 60) : 0;
        const displayTime = totalHours > 0 ? `${totalHours}h` : `${totalMinutes}min`;

        return `
        <div class="bfw-course-item">
          <div class="course-header">
            <span class="course-name">${escapeHtml$1(course.name)}</span>
            <span class="course-rate">${course.completionRate}%</span>
          </div>
          <div class="course-progress">
            <div class="course-bar">
              <div class="course-bar-fill" style="width: ${course.completionRate}%"></div>
            </div>
          </div>
          <div class="course-stats">
            <span class="course-stat">完成 ${course.completedCount}/${course.totalLessons}</span>
            <span class="course-stat">${sessionCount} 次</span>
            <span class="course-stat">${displayTime}</span>
          </div>
        </div>
      `;
      }).join('');
    }
  }

  /**
   * Draw the weekly trend chart on canvas.
   * Uses a smooth curve with gradient fill and animated dots.
   *
   * @param {HTMLElement} panel
   */
  function refreshTrendChart(panel) {
    const canvas = panel.querySelector('#bfw-trend-canvas');
    if (!canvas) return;

    const data = getDailyTrendData(7);

    // Skip redraw if data hasn't changed (optimization for frequent refreshStats calls)
    const dataKey = JSON.stringify(data.map(d => d.duration));
    if (_lastChartDataKey === dataKey) return;
    _lastChartDataKey = dataKey;

    const ctx = canvas.getContext('2d');

    // Set canvas size (2x for retina)
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();

    // Parent is hidden (display:none) — skip and don't cache, so the next call
    // after the panel is expanded draws correctly.
    if (rect.width === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = 140 * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = '140px';
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = 140;
    const padding = { top: 20, right: 24, bottom: 30, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find max value for scaling (handle empty data explicitly)
    const maxDuration = data.length > 0
      ? Math.max(...data.map(d => d.duration), 1)
      : 1;

    // Calculate positions
    const points = data.map((d, i) => ({
      x: padding.left + (chartWidth / (data.length - 1)) * i,
      y: padding.top + chartHeight - (d.duration / maxDuration) * chartHeight,
      duration: d.duration,
      label: d.label,
    }));

    // Draw gradient fill area
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(137, 180, 250, 0.25)');
    gradient.addColorStop(0.5, 'rgba(116, 199, 236, 0.15)');
    gradient.addColorStop(1, 'rgba(148, 226, 213, 0.05)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, height - padding.bottom);
    points.forEach((p, i) => {
      if (i === 0) {
        ctx.lineTo(p.x, p.y);
      } else {
        // Smooth curve using quadratic bezier
        const prev = points[i - 1];
        const cpX = (prev.x + p.x) / 2;
        ctx.quadraticCurveTo(cpX, prev.y, p.x, p.y);
      }
    });
    ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        const prev = points[i - 1];
        const cpX = (prev.x + p.x) / 2;
        ctx.quadraticCurveTo(cpX, prev.y, p.x, p.y);
      }
    });
    ctx.strokeStyle = '#89b4fa';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Draw dots and labels
    points.forEach((p, i) => {
      // Dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#1e1e2e';
      ctx.fill();
      ctx.strokeStyle = p.duration > 0 ? '#89b4fa' : '#45475a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label (day name)
      ctx.fillStyle = '#a6adc8';
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, p.x, height - padding.bottom + 18);

      // Duration value (only if > 0)
      if (p.duration > 0) {
        ctx.fillStyle = '#cdd6f4';
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        const durationText = p.duration >= 60 ? `${Math.round(p.duration / 60)}h` : `${p.duration}m`;
        ctx.fillText(durationText, p.x, p.y - 10);
      }
    });
  }

  /**
   * Escape HTML entities to prevent XSS.
   * @param {string} str
   * @returns {string}
   */
  const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function escapeHtml$1(str) {
    return String(str).replace(/[&<>"']/g, m => escapeMap[m]);
  }

  /**
   * Bind stats section event listeners (toggle, actions).
   *
   * @param {HTMLElement} panel
   * @param {Function} onClearStats - Callback when clear button is clicked
   * @param {Function} onExportStats - Callback when export button is clicked
   */
  function bindStatsEvents(panel, onClearStats, onExportStats) {
    const toggle = panel.querySelector('.bfw-stats-toggle');
    const content = panel.querySelector('.bfw-stats-content');
    const clearBtn = panel.querySelector('#bfw-btn-clear-stats');
    const exportBtn = panel.querySelector('#bfw-btn-export-stats');

    if (toggle && content) {
      toggle.addEventListener('click', () => {
        const isVisible = content.style.display !== 'none';
        content.style.display = isVisible ? 'none' : 'block';
        toggle.style.transform = isVisible ? '' : 'rotate(180deg)';

        // Force chart redraw on expand — canvas had zero width while hidden
        if (!isVisible) {
          _lastChartDataKey = null;
          refreshStats(panel);
        }
      });

      // Set initial state — content starts hidden, so chevron should not be rotated
      toggle.style.transform = '';
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        if (confirm('确定要清空所有学习统计数据吗？此操作无法撤销。')) {
          if (onClearStats) await onClearStats();
          refreshStats(panel);
        }
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        if (onExportStats) onExportStats();
      });
    }
  }

  /**
   * @file Page version compatibility checker
   *
   * Detects the page version from DOM and compares against a white/black list
   * to determine compatibility status.  Conservative strategy: only mark as
   * "tested" when explicitly verified; everything else is "unknown".
   */


  /**
   * Compatibility map — tested versions only.
   * Only add versions after manual testing confirms full functionality.
   *
   * Format:
   *   'x.y.z': 'tested'     - Fully compatible, tested personally
   *   'x.y.z': 'incompatible' - Known to break (future use)
   */
  const COMPATIBILITY_MAP = {
    '1.0.20': 'tested',
    // Add more as you test new versions
  };

  /**
   * Status descriptions for each compatibility level.
   * Icons are SVG strings imported from icons.js.
   */
  const STATUS_INFO = {
    tested: {
      iconKey: 'versionTested',
      color: '#52c41a',
      message: '完全兼容',
    },
    unknown: {
      iconKey: 'versionUnknown',
      color: '#faad14',
      message: '未在此版本测试',
    },
    incompatible: {
      iconKey: 'versionIncompatible',
      color: '#ff4d4f',
      message: '已知不兼容',
    },
    missing: {
      iconKey: 'versionMissing',
      color: '#8c8c8c',
      message: '未检测到版本号',
    },
  };

  /**
   * Check the page version and determine compatibility status.
   *
   * @returns {Object} Compatibility result
   * @property {string} status - 'tested' | 'unknown' | 'incompatible' | 'missing'
   * @property {string} [pageVersion] - Detected page version (if found)
   * @property {string} scriptVersion - Current script version
   * @property {string} iconKey - Icon key name for icons.js lookup
   * @property {string} color - Status color (CSS)
   * @property {string} message - Human-readable status description
   */
  function checkPageVersion() {
    // Try multiple selectors — CSS Modules hash may change
    const selectors = [
      '.versions___2-l4L',                    // Current CSS Module hash
      '[class*="versions"]',                  // Partial match fallback
      '.ant-layout-footer [class*="version"]', // Common Ant Design footer pattern
    ];

    let versionEl = null;
    for (const selector of selectors) {
      versionEl = document.querySelector(selector);
      if (versionEl) break;
    }

    // Case 1: Version element not found
    if (!versionEl) {
      const info_status = STATUS_INFO.missing;
      warn('未检测到页面版本号元素');
      return {
        status: 'missing',
        scriptVersion: SCRIPT_VERSION,
        ...info_status,
      };
    }

    // Case 2: Parse version number
    const match = versionEl.textContent.match(/版本号[：:]\s*([\d.]+)/);
    if (!match) {
      const info_status = STATUS_INFO.missing;
      warn('版本号格式异常:', versionEl.textContent);
      return {
        status: 'missing',
        scriptVersion: SCRIPT_VERSION,
        ...info_status,
      };
    }

    const pageVersion = match[1];
    const knownStatus = COMPATIBILITY_MAP[pageVersion];

    // Case 3: Known tested version
    if (knownStatus === 'tested') {
      const info_status = STATUS_INFO.tested;
      info(`页面版本: ${pageVersion}, 脚本版本: ${SCRIPT_VERSION}, 兼容性: 已测试`);
      return {
        status: 'tested',
        pageVersion,
        scriptVersion: SCRIPT_VERSION,
        ...info_status,
      };
    }

    // Case 4: Known incompatible version
    if (knownStatus === 'incompatible') {
      const info_status = STATUS_INFO.incompatible;
      error(`页面版本 ${pageVersion} 与脚本不兼容`);
      return {
        status: 'incompatible',
        pageVersion,
        scriptVersion: SCRIPT_VERSION,
        ...info_status,
      };
    }

    // Case 5: Unknown version (default — conservative strategy)
    const info_status = STATUS_INFO.unknown;
    warn(`页面版本: ${pageVersion}, 脚本版本: ${SCRIPT_VERSION}, 兼容性: 未知 (未测试)`);
    return {
      status: 'unknown',
      pageVersion,
      scriptVersion: SCRIPT_VERSION,
      ...info_status,
    };
  }

  /**
   * @file Update checker — queries the update API and caches results.
   *
   * Strategy:
   *   - Checks once per session after a 5-second startup delay.
   *   - Result is cached in localStorage for 24 hours; no request is made
   *     if a fresh cached result exists.
   *   - Network/parse errors are silently swallowed — never interrupts the
   *     main script flow.
   *   - Exposes a single public API: checkForUpdate(callback).
   */


  const CACHE_KEY = 'bfw_update_cache';
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  const CHECK_DELAY_MS = 5000;
  const FETCH_TIMEOUT_MS = 8000;

  /**
   * @typedef {Object} UpdateResult
   * @property {boolean} hasUpdate
   * @property {string}  latestVersion
   * @property {string}  downloadUrl
   * @property {Array<{type: string, title: string, description?: string}>} changelog
   * @property {string}  releaseUrl
   * @property {string}  checkedAt  — ISO timestamp
   */

  /**
   * Read and validate the cached update result.
   * Returns null if absent or stale.
   * @returns {Promise<UpdateResult|null>}
   */
  async function readCache() {
    try {
      const raw = await getStorageAdapter().get(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.checkedAt) return null;
      if (Date.now() - new Date(parsed.checkedAt).getTime() > CACHE_TTL_MS) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Persist an update result via the storage adapter.
   * Fails silently if storage is unavailable.
   * @param {UpdateResult} result
   */
  async function writeCache(result) {
    try {
      await getStorageAdapter().set(CACHE_KEY, JSON.stringify(result));
    } catch { /* quota exceeded or unavailable — non-fatal */ }
  }

  /**
   * Invalidate the cached result, forcing a fresh check on next call.
   */
  function invalidateUpdateCache() {
    getStorageAdapter().remove(CACHE_KEY).catch(() => { /* non-fatal */ });
  }

  /**
   * Fetch update info from the API with a timeout.
   * @returns {Promise<UpdateResult>}
   */
  async function fetchUpdateInfo() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      // Step 1 — check endpoint returns hasUpdate + version + downloadUrl
      const checkUrl = `${UPDATE_API_URL}/api/v1/check?version=${encodeURIComponent(SCRIPT_VERSION)}`;
      const checkRes = await fetch(checkUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!checkRes.ok) throw new Error(`HTTP ${checkRes.status}`);
      const check = await checkRes.json();

      if (!check.hasUpdate) {
        return {
          hasUpdate: false,
          latestVersion: check.version ?? SCRIPT_VERSION,
          downloadUrl: check.downloadUrl ?? '',
          changelog: [],
          releaseUrl: '',
          checkedAt: new Date().toISOString(),
        };
      }

      // Step 2 — fetch full release metadata for changelog (only when update exists)
      let changelog = [];
      let releaseUrl = '';
      try {
        const releaseUrl_ = `${UPDATE_API_URL}/api/v1/releases/${encodeURIComponent(check.version)}`;
        const releaseRes = await fetch(releaseUrl_, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (releaseRes.ok) {
          const release = await releaseRes.json();
          changelog = Array.isArray(release.changelog) ? release.changelog : [];
          releaseUrl = release.source?.releaseUrl ?? '';
        }
      } catch { /* changelog fetch failure is non-fatal — still show update badge */ }

      return {
        hasUpdate: true,
        latestVersion: check.version,
        downloadUrl: check.downloadUrl,
        changelog,
        releaseUrl,
        checkedAt: new Date().toISOString(),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Check for updates and invoke the callback when a result is available.
   * Uses the 24-hour cache; forces a fresh fetch only when cache is stale.
   *
   * @param {(result: UpdateResult) => void} onResult
   * @param {Object}   [opts]
   * @param {boolean}  [opts.force=false]  — bypass cache
   * @param {number}   [opts.delay=CHECK_DELAY_MS]  — startup delay in ms
   * @param {Function} [opts.onError]  — called when the check fails (network/timeout)
   */
  function checkForUpdate(onResult, { force = false, delay = CHECK_DELAY_MS, onError } = {}) {
    setTimeout(async () => {
      if (!force) {
        const cached = await readCache();
        if (cached) {
          debug('[update] serving from cache:', cached.latestVersion);
          onResult(cached);
          return;
        }
      }

      try {
        const result = await fetchUpdateInfo();
        await writeCache(result);
        debug('[update] fetched:', result.latestVersion, 'hasUpdate:', result.hasUpdate);
        onResult(result);
      } catch (err) {
        debug('[update] check failed:', err?.message);
        onError?.();
      }
    }, delay);
  }

  /**
   * @file UI builder — creates and renders the edge-drawer panel DOM.
   *
   * Panel structure:
   *   .bfw-panel (edge-drawer container, slides on hover)
   *     .bfw-panel-handle (32px grip tab, always visible on right edge)
   *     .bfw-panel-inner (348px content surface)
   *       .bfw-panel-header  (title + pin button)
   *       .bfw-panel-body    (scrollable: status, log, actions, pool)
   */


  let panelEl = null;

  /** Cached course progress data (written by course-processor, read by UI updates). */
  let courseProgressData = {
    chapterCount: 0, totalLessons: 0, completedLessons: 0,
    currentChapter: '', currentName: '', curChapLessons: 0, curChapDone: 0,
    remainingMinutes: 0,
    videoProgress: 0, autoCourseEnabled: false,
  };

  /**
   * Update the course progress display in the panel.
   * Called by course-processor on every progress tick.
   *
   * Bars:
   *   章 = lessons done / total lessons in the CURRENT chapter
   *   总 = all lessons done / all lessons across every chapter
   *
   * @param {Object} data - Progress data from course-processor
   */
  function updateCourseProgress(data) {
    courseProgressData = { ...data };
    refreshCourseProgress();
  }

  /**
   * Refresh the course progress DOM from cached data.
   */
  function refreshCourseProgress() {
    if (!panelEl) return;
    const d = courseProgressData;

    // Current video playback as a 0.0–1.0 fraction (0 when not playing / not loaded)
    const vidFrac = (d.videoProgress || 0) / 100;

    // ---- Current-chapter progress (fractional: includes video position) ----
    const chapFraction = d.curChapLessons > 0
      ? (d.curChapDone + vidFrac) / d.curChapLessons
      : 0;
    const chapPct = Math.round(chapFraction * 100);

    // ---- Overall progress (fractional: includes video position) ----
    const overallFraction = d.totalLessons > 0
      ? (d.completedLessons + vidFrac) / d.totalLessons
      : 0;
    const overallPct = Math.round(overallFraction * 100);

    // ---- Chapter bar (本章) ----
    const chBarFill = panelEl.querySelector('#bfw-course-chbar-fill');
    if (chBarFill) chBarFill.style.width = `${Math.min(chapPct, 100)}%`;
    const chBarPct = panelEl.querySelector('#bfw-course-chbar-pct');
    if (chBarPct) chBarPct.textContent = d.curChapLessons ? `${chapPct}%` : '';

    // ---- Overall bar (总) ----
    const lBarFill = panelEl.querySelector('#bfw-course-lbar-fill');
    if (lBarFill) lBarFill.style.width = `${Math.min(overallPct, 100)}%`;
    const lBarPct = panelEl.querySelector('#bfw-course-lbar-pct');
    if (lBarPct) lBarPct.textContent = d.totalLessons ? `${overallPct}%` : '';

    // ---- Count badge ----
    const countEl = panelEl.querySelector('#bfw-course-count');
    if (countEl) {
      countEl.textContent = d.totalLessons ? `${d.completedLessons}/${d.totalLessons}` : '0/0';
      countEl.style.color = d.totalLessons > 0 && d.completedLessons >= d.totalLessons ? '#a6e3a1' : '#a6adc8';
    }

    // ---- Chapter label (right of header) ----
    const chLabel = panelEl.querySelector('#bfw-course-ch-label');
    if (chLabel) {
      chLabel.textContent = d.curChapLessons ? `本章 ${d.curChapDone}/${d.curChapLessons}` : '';
      chLabel.style.display = d.curChapLessons ? '' : 'none';
    }

    // ---- Current lesson ----
    const nameEl = panelEl.querySelector('#bfw-course-current-name');
    if (nameEl) {
      nameEl.textContent = d.currentName || (d.totalLessons > 0 ? '就绪…' : '等待课程…');
    }
    const chNameEl = panelEl.querySelector('#bfw-course-current-chapter');
    if (chNameEl) {
      chNameEl.textContent = d.currentChapter || '';
    }

    // ---- Video progress ----
    const vidPctEl = panelEl.querySelector('#bfw-course-vid-pct');
    if (vidPctEl) {
      vidPctEl.textContent = d.currentName ? `视频 ${d.videoProgress || 0}%` : '';
    }

    // ---- Stat line ----
    const statEl = panelEl.querySelector('#bfw-course-stat');
    if (statEl) {
      const parts = [];
      if (d.autoCourseEnabled) parts.push('自动播放: 开');
      parts.push(`${d.chapterCount} 章`);
      parts.push(`${d.completedLessons}/${d.totalLessons} 课`);
      if (d.remainingMinutes > 0) {
        parts.push(d.remainingMinutes >= 60
          ? `剩余约 ${Math.round(d.remainingMinutes / 60)}h`
          : `剩余约 ${d.remainingMinutes}min`);
      }
      statEl.textContent = parts.join(' · ');
    }
  }

  /**
   * Render the thumbnail grid + pool status from current pool state.
   * @param {HTMLElement} panel
   */
  /**
   * Reload the thumbnail image for a specific entry after crop edit.
   * Avoids a full pool rebuild when only one image's content changed.
   * @param {HTMLElement} panel
   * @param {number} entryId
   */
  async function refreshPoolThumb(panel, entryId) {
    const target = panel || panelEl;
    if (!target) return;

    const thumb = target.querySelector(`.bfw-pool-thumb[data-id="${entryId}"]`);
    if (!thumb) return;

    await loadThumbImage(thumb, entryId);
  }

  function refreshPoolUI(panel) {
    const target = panel || panelEl;
    if (!target) return;

    // Close any open stats popup before rebuilding thumbs (prevents memory leaks)
    hideStatsPopup();

    const thumbsEl = target.querySelector('#bfw-pool-thumbs');
    const countEl = target.querySelector('#bfw-pool-count');
    const emptyEl = target.querySelector('#bfw-pool-empty');
    const clearBtn = target.querySelector('#bfw-btn-clear-pool');

    if (!thumbsEl || !countEl) return;

    const entries = listEntries();
    const count = entries.length;
    const cap = poolCapacity();

    // Count badge
    countEl.textContent = `${count}/${cap}`;
    countEl.style.color = count >= cap ? '#f38ba8' : '#a6adc8';

    // Clear button state
    if (clearBtn) clearBtn.disabled = count === 0;

    // Empty placeholder
    if (emptyEl) emptyEl.style.display = count === 0 ? 'block' : 'none';

    // Thumbnails — incremental update: only rebuild if count changed
    const currentThumbs = thumbsEl.querySelectorAll('.bfw-pool-thumb');
    if (currentThumbs.length !== count) {
      thumbsEl.innerHTML = '';
      if (count === 0) {
        thumbsEl.appendChild(emptyEl || document.createElement('div'));
      } else {
        for (const entry of entries) {
          const thumb = createThumbElement(entry);
          thumbsEl.appendChild(thumb);
          // Load actual image data lazily
          loadThumbImage(thumb, entry.id);
        }
      }
    }

    // Close any open stats popup (thumb elements were rebuilt)
    hideStatsPopup();
  }

  // ---------------------------------------------------------------------------
  // Stats popup — inline tooltip for per-image usage statistics
  // ---------------------------------------------------------------------------

  /** Currently visible stats popup element (null when hidden). */
  let _statsPopupEl = null;

  /** Timeout handle for delayed popup hide on mouseleave (debounce). */
  let _statsPopupTimeout = null;

  /**
   * Build a stats popup DOM for an image.  Returns the popup element
   * but does NOT attach it to the DOM.
   *
   * @param {import('../pool/image-pool.js').PoolEntry} entry
   * @returns {HTMLElement}
   */
  function createStatsPopup(entry) {
    const stats = getImageStats(entry.id);
    const tier = getImageQualityTier(entry.id);

    const popup = document.createElement('div');
    popup.className = 'bfw-thumb-stats-popup';
    popup.dataset.id = String(entry.id);

    // Tier badge label
    const tierLabels = { high: '高成功率', neutral: '中性', low: '低成功率' };
    const tierCss = { high: 'stats-tier-high', neutral: 'stats-tier-neutral', low: 'stats-tier-low' };

    if (!stats || stats.totalUses === 0) {
      popup.innerHTML = `
      <div class="stats-header">
        <span class="stats-name">${escapeHtml(entry.name)}</span>
        <span class="stats-tier-badge ${tierCss[tier]}">${tierLabels[tier]}</span>
      </div>
      <div class="stats-empty">暂无使用数据</div>`;
    } else {
      const successRate = stats.totalUses > 0
        ? Math.round((stats.successes / stats.totalUses) * 100)
        : 0;
      const rateClass = successRate >= 50 ? 'rate-good' : 'rate-bad';
      const lastResultText = stats.lastResult === 'success' ? '✅ 通过'
        : stats.lastResult === 'fail' ? '❌ 未通过' : '—';

      popup.innerHTML = `
      <div class="stats-header">
        <span class="stats-name">${escapeHtml(entry.name)}</span>
        <span class="stats-tier-badge ${tierCss[tier]}">${tierLabels[tier]}</span>
      </div>
      <table class="stats-table">
        <tr><td class="stats-label">使用次数</td><td class="stats-value">${stats.totalUses}</td></tr>
        <tr><td class="stats-label">成功</td><td class="stats-value success">${stats.successes}</td></tr>
        <tr><td class="stats-label">失败</td><td class="stats-value fail">${stats.failures}</td></tr>
        <tr><td class="stats-label">成功率</td><td class="stats-value ${rateClass}">${successRate}%</td></tr>
        <tr><td class="stats-label">最近结果</td><td class="stats-value">${lastResultText}</td></tr>
      </table>`;
    }

    // Keep popup visible while cursor is over it (hover-triggered tooltip pattern)
    popup.addEventListener('mouseenter', () => {
      if (_statsPopupTimeout) {
        clearTimeout(_statsPopupTimeout);
        _statsPopupTimeout = null;
      }
    });
    popup.addEventListener('mouseleave', () => {
      hideStatsPopup();
    });

    return popup;
  }

  /**
   * Escape HTML entities in a string to prevent XSS.
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Show the stats popup for a thumbnail element (hover-triggered).
   * Closes any previously open popup first.  If the popup for this
   * entry is already visible the call is a no-op.
   *
   * @param {HTMLElement} thumbEl - The .bfw-pool-thumb element
   * @param {import('../pool/image-pool.js').PoolEntry} entry
   */
  function showStatsPopup(thumbEl, entry) {
    // Already showing for this entry — nothing to do
    if (_statsPopupEl && _statsPopupEl.dataset.id === String(entry.id) && _statsPopupEl.parentNode) {
      return;
    }

    // Cancel any pending hide
    if (_statsPopupTimeout) {
      clearTimeout(_statsPopupTimeout);
      _statsPopupTimeout = null;
    }

    // Close any existing popup
    hideStatsPopup();

    // Create and show new popup
    _statsPopupEl = createStatsPopup(entry);

    // Always attach to <body> — the panel (.bfw-panel) has a CSS transform
    // which creates a new containing block, so any position:fixed descendant
    // is relative to the panel (not the viewport) and gets clipped by
    // overflow-y: auto on .bfw-panel-body.
    document.body.appendChild(_statsPopupEl);

    // Position the popup near the thumbnail
    positionStatsPopup(thumbEl, _statsPopupEl);
  }

  /**
   * Schedule a deferred hide of the stats popup.
   * Gives the cursor time to reach the popup itself before it disappears.
   */
  function scheduleHideStatsPopup() {
    _statsPopupTimeout = setTimeout(() => {
      hideStatsPopup();
    }, 200);
  }

  /**
   * Position the stats popup relative to its thumbnail element.
   * Tries to place it to the right, falling back to left / above / below.
   *
   * @param {HTMLElement} thumbEl
   * @param {HTMLElement} popup
   */
  function positionStatsPopup(thumbEl, popup) {
    const thumbRect = thumbEl.getBoundingClientRect();
    const popupW = 200;
    const popupH = popup.offsetHeight || 140;

    // Default: to the right of the thumb
    let left = thumbRect.right + 8;
    let top = thumbRect.top;

    // If it would overflow right edge of viewport, flip to left
    if (left + popupW > window.innerWidth - 10) {
      left = thumbRect.left - popupW - 8;
    }
    // If still overflows left edge, place below
    if (left < 10) {
      left = thumbRect.left;
      top = thumbRect.bottom + 4;
    }
    // If overflows bottom, place above
    if (top + popupH > window.innerHeight - 10) {
      top = thumbRect.top - popupH - 4;
    }
    // Clamp to viewport
    top = Math.max(4, top);
    left = Math.max(4, left);

    popup.style.position = 'fixed';
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }

  /**
   * Hide and remove the currently visible stats popup.
   * Safe to call when no popup is open (no-op).
   */
  function hideStatsPopup() {
    if (_statsPopupTimeout) {
      clearTimeout(_statsPopupTimeout);
      _statsPopupTimeout = null;
    }
    if (_statsPopupEl) {
      if (_statsPopupEl.parentNode) _statsPopupEl.parentNode.removeChild(_statsPopupEl);
      _statsPopupEl = null;
    }
  }

  /**
   * Create a thumbnail DOM element for a pool entry.
   * @param {import('../pool/image-pool.js').PoolEntry} entry
   * @returns {HTMLElement}
   */
  function createThumbElement(entry) {
    const div = document.createElement('div');
    div.className = 'bfw-pool-thumb';
    div.title = `${entry.name}\n${entry.width}×${entry.height} — 点击编辑裁剪`;
    div.dataset.id = String(entry.id);

    // Quality tier border class
    const tier = getImageQualityTier(entry.id);
    if (tier === 'low') div.classList.add('bfw-quality-low');
    else if (tier === 'high') div.classList.add('bfw-quality-high');

    const img = document.createElement('img');
    img.alt = entry.name;
    img.src = ''; // lazy
    div.appendChild(img);

    // Stats info icon — hover shows usage stats popup (see showStatsPopup)
    const infoBtn = document.createElement('button');
    infoBtn.className = 'bfw-thumb-info';
    infoBtn.innerHTML = icons.info;
    infoBtn.addEventListener('mouseenter', (e) => {
      e.stopPropagation();
      showStatsPopup(div, entry);
    });
    infoBtn.addEventListener('mouseleave', () => {
      scheduleHideStatsPopup();
    });
    div.appendChild(infoBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'bfw-thumb-delete';
    delBtn.innerHTML = icons.x;
    delBtn.title = '删除';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Dispatch to panel so events.js handles it
      panelEl?.dispatchEvent(new CustomEvent('bfw:delete-image', {
        detail: { id: entry.id },
      }));
    });
    div.appendChild(delBtn);

    // Click to open crop editor
    div.addEventListener('click', () => {
      // Don't open crop editor if clicking the info button (handled above)
      if (!entry.cropParams) return; // No original data available
      openCropEditor(entry.id, entry, () => {
        // Reload just this thumbnail — content changed, count unchanged
        refreshPoolThumb(panelEl, entry.id);
      });
    });

    return div;
  }

  /**
   * Load the image data for a thumbnail element.
   * @param {HTMLElement} thumbEl
   * @param {number} id
   */
  async function loadThumbImage(thumbEl, id) {
    try {
      const dataUrl = await getImageData(id);
      if (dataUrl) {
        const img = thumbEl.querySelector('img');
        if (img) img.src = dataUrl;
      }
    } catch (_) { /* thumb load failure is non-fatal */ }
  }

  /**
   * MutationObserver for watching version element appear.
   * Disconnects automatically after detecting the version.
   */
  let versionObserver = null;

  // ---------------------------------------------------------------------------
  // Footer left — compat version display
  // ---------------------------------------------------------------------------

  function buildFooterLeftHtml(compatInfo) {
    const iconSvg = icons[compatInfo.iconKey] || icons.versionMissing;

    if (compatInfo.pageVersion) {
      return `<span class="bfw-footer-compat" style="color: ${compatInfo.color}" title="${compatInfo.message}">${iconSvg}</span>
       <span class="bfw-footer-version">v${SCRIPT_VERSION}</span>
       <span class="bfw-footer-sep">|</span>
       <span class="bfw-footer-page">页面 v${compatInfo.pageVersion}</span>`;
    }
    return `<span class="bfw-footer-compat" style="color: ${compatInfo.color}" title="${compatInfo.message}">${iconSvg}</span>
       <span class="bfw-footer-version">v${SCRIPT_VERSION}</span>`;
  }

  function updateFooterContent(footer, compatInfo) {
    const leftEl = footer.querySelector('.bfw-footer-left');
    if (!leftEl) return;
    leftEl.innerHTML = buildFooterLeftHtml(compatInfo);
  }

  // ---------------------------------------------------------------------------
  // Footer right — update badge
  // ---------------------------------------------------------------------------

  const TYPE_LABELS = {
    feature:     '新功能',
    fix:         '修复',
    improvement: '优化',
    performance: '性能',
    security:    '安全',
    breaking:    '破坏性',
    docs:        '文档',
    internal:    '内部',
  };

  /**
   * Render the changelog card DOM.
   * @param {import('../utils/update-checker.js').UpdateResult} result
   * @returns {HTMLElement}
   */
  function createUpdateCard(result) {
    const card = document.createElement('div');
    card.className = 'bfw-update-card';

    // Static skeleton — no remote content here
    card.innerHTML = `
    <div class="bfw-update-card-header">
      <span class="bfw-update-card-title">
        ${icons.arrowUpCircle} 发现新版本
      </span>
      <button class="bfw-update-card-close" title="关闭">${icons.x}</button>
    </div>
    <div class="bfw-update-card-meta">
      <span>v${SCRIPT_VERSION}</span>
      <span class="arrow">→</span>
      <span class="version-badge">${icons.tag} <span class="bfw-latest-ver"></span></span>
    </div>
    <div class="bfw-update-changelog"></div>
    <div class="bfw-update-card-actions">
      <button class="bfw-update-install-btn">立即安装</button>
    </div>
  `;

    // Populate remote-sourced content via textContent / DOM APIs (no innerHTML for untrusted data)
    card.querySelector('.bfw-latest-ver').textContent = `v${result.latestVersion}`;

    const changelogEl = card.querySelector('.bfw-update-changelog');
    const entries = result.changelog.slice(0, 8);
    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'bfw-update-changelog-empty';
      empty.textContent = '暂无详细更新说明';
      changelogEl.appendChild(empty);
    } else {
      entries.forEach((e) => {
        const row = document.createElement('div');
        row.className = 'bfw-changelog-entry';

        const typeSpan = document.createElement('span');
        const safeType = /^[a-z]+$/.test(e.type) ? e.type : 'internal';
        typeSpan.className = `bfw-changelog-type bfw-type-${safeType}`;
        typeSpan.textContent = TYPE_LABELS[e.type] ?? e.type;

        const textSpan = document.createElement('span');
        textSpan.className = 'bfw-changelog-text';
        textSpan.textContent = e.title;
        if (e.description) {
          const desc = document.createElement('span');
          desc.className = 'desc';
          desc.textContent = e.description;
          textSpan.appendChild(desc);
        }

        row.appendChild(typeSpan);
        row.appendChild(textSpan);
        changelogEl.appendChild(row);
      });
    }

    const actionsEl = card.querySelector('.bfw-update-card-actions');

    if (result.releaseUrl) {
      const releaseBtn = document.createElement('button');
      releaseBtn.className = 'bfw-update-release-btn';
      releaseBtn.textContent = '发布说明';
      releaseBtn.addEventListener('click', () => window.open(result.releaseUrl, '_blank'));
      actionsEl.appendChild(releaseBtn);
    }

    // Close button
    card.querySelector('.bfw-update-card-close').addEventListener('click', () => {
      card.remove();
    });

    // Install button — opens download URL (triggers script manager install dialog)
    card.querySelector('.bfw-update-install-btn').addEventListener('click', () => {
      if (result.downloadUrl) window.open(result.downloadUrl, '_blank');
      card.remove();
    });

    // Click outside to close
    setTimeout(() => {
      const onOutside = (e) => {
        if (!card.contains(e.target)) {
          card.remove();
          document.removeEventListener('click', onOutside);
        }
      };
      document.addEventListener('click', onOutside);
    }, 0);

    return card;
  }

  /**
   * Create the update badge button in the footer-right area.
   * Starts in "checking" state; transitions to idle or has-update after the
   * checkForUpdate callback fires.
   *
   * @param {HTMLElement} footer
   * @returns {HTMLElement} The badge button element
   */
  function createUpdateBadge(footer) {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';

    const btn = document.createElement('button');
    btn.className = 'bfw-update-btn checking';
    btn.title = '正在检测更新…';
    btn.innerHTML = `<span class="bfw-icon-spin">${icons.loader}</span>`;
    wrapper.appendChild(btn);

    // Called when checkForUpdate resolves
    const onResult = (result) => {

      if (!result.hasUpdate) {
        // Up to date — show subtle version tag, no pulse
        btn.className = 'bfw-update-btn';
        btn.title = `已是最新版本 v${result.latestVersion}`;
        btn.innerHTML = icons.tag;
        return;
      }

      // Has update — orange pulsing badge
      btn.className = 'bfw-update-btn has-update';
      btn.title = `发现新版本 v${result.latestVersion}，点击查看`;
      btn.innerHTML = `${icons.arrowUpCircle} <span style="font-size:10px;font-weight:600;">v${result.latestVersion}</span>`;

      // Use onclick (not addEventListener) so re-check via contextmenu never stacks listeners
      btn.onclick = (e) => {
        e.stopPropagation();
        const existing = wrapper.querySelector('.bfw-update-card');
        if (existing) { existing.remove(); return; }
        wrapper.appendChild(createUpdateCard(result));
      };
    };

    // triggerRecheck and onError are mutually referencing — use let to allow forward reference
    let triggerRecheck;

    const onError = () => {
      btn.className = 'bfw-update-btn';
      btn.title = '检测更新失败，点击重试';
      btn.innerHTML = icons.tag;
      btn.onclick = (e) => { e.stopPropagation(); triggerRecheck(); };
    };

    triggerRecheck = () => {
      btn.className = 'bfw-update-btn checking';
      btn.title = '正在检测更新…';
      btn.innerHTML = `<span class="bfw-icon-spin">${icons.loader}</span>`;
      btn.onclick = null;
      invalidateUpdateCache();
      checkForUpdate(onResult, { force: true, delay: 0, onError });
    };

    // Right-click / long-press to force re-check
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      triggerRecheck();
    });

    checkForUpdate(onResult, { onError });

    return wrapper;
  }

  // ---------------------------------------------------------------------------
  // Footer assembly
  // ---------------------------------------------------------------------------

  function createFooter() {
    const footer = document.createElement('div');
    footer.className = 'bfw-footer';
    footer.id = 'bfw-footer';

    const initialInfo = {
      iconKey: 'versionMissing',
      color: '#8c8c8c',
      message: '正在检测版本...',
      pageVersion: null,
    };

    footer.innerHTML = `
    <div class="bfw-footer-left">
      ${buildFooterLeftHtml(initialInfo)}
    </div>
    <div class="bfw-footer-right"></div>
  `;

    // Right side: update badge + GitHub link
    const right = footer.querySelector('.bfw-footer-right');
    right.appendChild(createUpdateBadge());
    const ghLink = document.createElement('a');
    ghLink.href = GITHUB_URL;
    ghLink.target = '_blank';
    ghLink.className = 'bfw-footer-link';
    ghLink.title = 'GitHub 仓库';
    ghLink.innerHTML = icons.github;
    right.appendChild(ghLink);

    startVersionWatch(footer);
    return footer;
  }

  // ---------------------------------------------------------------------------
  // Version watch (page compat, unchanged logic)
  // ---------------------------------------------------------------------------

  function startVersionWatch(footer) {
    if (versionObserver) {
      versionObserver.disconnect();
      versionObserver = null;
    }

    const immediate = checkPageVersion();
    if (immediate.pageVersion) {
      updateFooterContent(footer, immediate);
      return;
    }

    let isThrottled = false;
    versionObserver = new MutationObserver(() => {
      if (isThrottled) return;
      isThrottled = true;
      setTimeout(() => { isThrottled = false; }, 200);

      const compatInfo = checkPageVersion();
      if (compatInfo.pageVersion) {
        updateFooterContent(footer, compatInfo);
        if (versionObserver) {
          versionObserver.disconnect();
          versionObserver = null;
        }
      }
    });

    versionObserver.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      if (versionObserver) {
        versionObserver.disconnect();
        versionObserver = null;
      }
    }, 30000);
  }

  /**
   * Create the panel DOM structure (edge-drawer pattern).
   * @returns {HTMLElement}
   */
  function createPanelDOM() {
    const panel = document.createElement('div');
    panel.className = 'bfw-panel';
    panel.innerHTML = `
    <div class="bfw-panel-handle">
      <span class="bfw-handle-text">刷课助手</span>
    </div>
    <div class="bfw-panel-inner">
      <div class="bfw-panel-header">
        <span class="bfw-title">${SCRIPT_NAME}</span>
        <div class="bfw-header-actions">
          <button class="bfw-pin-btn" title="固定面板">${icons.pin}</button>
        </div>
      </div>
      <div class="bfw-panel-body">
        <div class="bfw-status">
          <span class="bfw-status-dot"></span>
          <span class="bfw-status-text">运行中 — 摄像头已替换</span>
        </div>
        <div class="bfw-log" id="bfw-log-area"></div>
        <div class="bfw-actions">
          <button class="bfw-btn bfw-btn-primary" id="bfw-btn-retry">手动重试</button>
          <button class="bfw-btn bfw-btn-ghost" id="bfw-btn-clear">清空日志</button>
        </div>

        <!-- Settings Section -->
        <div class="bfw-settings-section">
          <div class="bfw-settings-header">
            <span class="bfw-settings-title">设置</span>
          </div>

          <div class="bfw-setting-row" data-setting="faceAutoClick">
            <div class="bfw-setting-info">
              <span class="bfw-setting-icon">${icons.userCheck}</span>
              <span class="bfw-setting-label">自动点击验证按钮</span>
              <span class="bfw-setting-desc">自动完成打开摄像头、拍照、对比等步骤</span>
            </div>
            <label class="bfw-toggle">
              <input type="checkbox" class="bfw-toggle-input" id="bfw-toggle-face-autoclick" checked />
              <span class="bfw-toggle-slider"></span>
            </label>
          </div>

          <div class="bfw-setting-row" data-setting="videoReplace">
            <div class="bfw-setting-info">
              <span class="bfw-setting-icon">${icons.video}</span>
              <span class="bfw-setting-label">替换摄像头画面</span>
              <span class="bfw-setting-desc">用图片池中的照片替代真实摄像头</span>
            </div>
            <label class="bfw-toggle">
              <input type="checkbox" class="bfw-toggle-input" id="bfw-toggle-video-replace" checked />
              <span class="bfw-toggle-slider"></span>
            </label>
          </div>

          <div class="bfw-setting-row" data-setting="autoCompare">
            <div class="bfw-setting-info">
              <span class="bfw-setting-icon">${icons.checkCircle}</span>
              <span class="bfw-setting-label">拍照后自动对比</span>
              <span class="bfw-setting-desc">关闭时拍照后暂停，需手动点击对比</span>
            </div>
            <label class="bfw-toggle">
              <input type="checkbox" class="bfw-toggle-input" id="bfw-toggle-auto-compare" checked />
              <span class="bfw-toggle-slider"></span>
            </label>
          </div>

          <div class="bfw-setting-row" data-setting="autoCourse">
            <div class="bfw-setting-info">
              <span class="bfw-setting-icon">${icons.book}</span>
              <span class="bfw-setting-label">自动刷课</span>
              <span class="bfw-setting-desc">自动播放课程视频并监控进度</span>
            </div>
            <label class="bfw-toggle">
              <input type="checkbox" class="bfw-toggle-input" id="bfw-toggle-auto-course" />
              <span class="bfw-toggle-slider"></span>
            </label>
          </div>

          <div class="bfw-setting-row" data-setting="disableVisibilityCheck">
            <div class="bfw-setting-info">
              <span class="bfw-setting-icon">${icons.monitor}</span>
              <span class="bfw-setting-label">防切屏检测</span>
              <span class="bfw-setting-desc">阻止网站因切屏或最小化而暂停播放</span>
            </div>
            <label class="bfw-toggle">
              <input type="checkbox" class="bfw-toggle-input" id="bfw-toggle-disable-visibility-check" />
              <span class="bfw-toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Course Progress Section -->
        <div class="bfw-course-section">
          <div class="bfw-course-header">
            <span class="bfw-course-title">课程进度</span>
            <div class="bfw-course-header-right">
              <span class="bfw-course-ch-label" id="bfw-course-ch-label"></span>
              <span class="bfw-course-count" id="bfw-course-count">0/0</span>
            </div>
          </div>
          <div class="bfw-course-current">
            <span class="bfw-course-current-name" id="bfw-course-current-name">等待课程…</span>
            <span class="bfw-course-vid-pct" id="bfw-course-vid-pct"></span>
          </div>
          <div class="bfw-course-chapter" id="bfw-course-current-chapter"></div>
          <div class="bfw-course-bar-group">
            <div class="bfw-course-bar-row">
              <span class="bfw-course-bar-label">章</span>
              <div class="bfw-course-bar-track">
                <div class="bfw-course-bar-fill" id="bfw-course-chbar-fill" style="width: 0%"></div>
              </div>
              <span class="bfw-course-bar-pct" id="bfw-course-chbar-pct"></span>
            </div>
            <div class="bfw-course-bar-row">
              <span class="bfw-course-bar-label">总</span>
              <div class="bfw-course-bar-track">
                <div class="bfw-course-bar-fill bfw-bar-lesson" id="bfw-course-lbar-fill" style="width: 0%"></div>
              </div>
              <span class="bfw-course-bar-pct" id="bfw-course-lbar-pct"></span>
            </div>
          </div>
          <div class="bfw-course-stat" id="bfw-course-stat"></div>
        </div>

        <!-- Progress Stats Section (inserted by createStatsSection) -->
        <div id="bfw-stats-placeholder"></div>

        <!-- Image Pool Section -->
        <div class="bfw-pool-section">
          <div class="bfw-pool-header">
            <span class="bfw-pool-title">图片池</span>
            <div class="bfw-pool-header-right">
              <span class="bfw-pool-count" id="bfw-pool-count">0/50</span>
              <button class="bfw-weight-btn active" id="bfw-btn-weight" title="动态权重: 开 — 根据图片成功率自动调整选中概率">${icons.sliders}</button>
              <button class="bfw-eye-btn active" id="bfw-btn-eye" title="显示原图">${icons.eyeOff}</button>
            </div>
          </div>
          <div class="bfw-pool-drag-zone" id="bfw-pool-drop-zone" title="拖拽或点击此处上传图片">
            拖拽或点击此处上传图片
            <input type="file" id="bfw-pool-file-input" accept="image/jpeg,image/png,image/webp,image/bmp" multiple hidden />
          </div>
          <div class="bfw-pool-thumbs blur" id="bfw-pool-thumbs">
            <div class="bfw-pool-empty" id="bfw-pool-empty">暂无图片 — 点击上方上传</div>
          </div>
          <div class="bfw-pool-status" id="bfw-pool-status"></div>
          <div class="bfw-pool-actions">
            <button class="bfw-btn bfw-btn-primary" id="bfw-btn-upload">上传</button>
            <button class="bfw-btn bfw-btn-capture" id="bfw-btn-capture" title="捕获当前视频帧到图片池">${icons.film} 捕获</button>
            <button class="bfw-btn bfw-btn-danger" id="bfw-btn-clear-pool" disabled>清空全部</button>
          </div>
        </div>
      </div>
    </div>
  `;

    // Append footer to panel-inner (after panel-body)
    const panelInner = panel.querySelector('.bfw-panel-inner');
    if (panelInner) {
      panelInner.appendChild(createFooter());
    }

    return panel;
  }

  /**
   * Inject CSS styles into the page if not already present.
   */
  function injectStyles() {
    if (document.getElementById('bfw-styles')) return;

    const style = document.createElement('style');
    style.id = 'bfw-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  /**
   * Append a timestamped log message to the panel log area.
   * @param {string} message - The log message text
   */
  function appendLog(message) {
    if (!panelEl) return;
    const logArea = panelEl.querySelector('#bfw-log-area');
    if (!logArea) return;

    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const line = document.createElement('div');
    const timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = `[${time}]`;
    line.appendChild(timeSpan);
    line.appendChild(document.createTextNode(message));
    logArea.appendChild(line);
    logArea.scrollTop = logArea.scrollHeight;
  }

  /**
   * Update the status indicator in the panel.
   * @param {boolean} active - Whether the interceptor is active
   * @param {string} [text] - Override status text
   */
  function setStatus(active, text) {
    if (!panelEl) return;
    const dot = panelEl.querySelector('.bfw-status-dot');
    const label = panelEl.querySelector('.bfw-status-text');
    if (dot) dot.classList.toggle('inactive', !active);
    if (label) label.textContent = text || (active ? '运行中 — 摄像头已替换' : '已停止');
  }

  /**
   * Build and mount the panel UI into the page.
   * @returns {HTMLElement} The panel root element
   */
  function buildUI() {
    if (panelEl) return panelEl;

    injectStyles();
    panelEl = createPanelDOM();
    document.body.appendChild(panelEl);

    // Bind interaction events
    bindDrawer(panelEl);
    bindActions(panelEl);
    bindPoolEvents(panelEl);
    bindSettings(panelEl);

    // Note: bfw:retry bubbles to document where processor.js handles it
    // (the processor logs "已触发手动重试" and performs the actual retry scan)

    // Insert stats section into placeholder
    const statsPlaceholder = panelEl.querySelector('#bfw-stats-placeholder');
    if (statsPlaceholder) {
      const statsSection = createStatsSection();
      statsPlaceholder.parentNode.replaceChild(statsSection, statsPlaceholder);

      // Bind stats events
      bindStatsEvents(panelEl,
        clearAllProgress,
        () => {
          const data = exportProgress();
          const json = JSON.stringify(data, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          // Use local date format for filename
          const date = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
          a.download = `bfw-stats-${date}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }
      );

      // Initial stats refresh
      refreshStats(panelEl);
    }

    // Initial pool UI refresh
    refreshPoolUI(panelEl);

    return panelEl;
  }

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


  /** Reference to the original getUserMedia (cached at install time). */
  let originalGetUserMedia = null;

  /** Whether the interceptor has been installed. */
  let installed$1 = false;

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
          debug('Video interceptor: no more active fake streams, clearing flag');
        }
      });
    }

    activeStreams.set(stream, state);
    activeStreamSet.add(stream);
    streamConstraints.set(stream, constraints);
    _activeStreamCount++;
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
  function installVideoInterceptor() {
    if (installed$1) {
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

    installed$1 = true;
    info('Video interceptor installed (getUserMedia monkey-patch)');
  }

  /**
   * Check whether a MediaStream was created by the interceptor (i.e. is a fake stream).
   * @param {MediaStream} stream
   * @returns {boolean}
   */
  function isStreamFake(stream) {
    return activeStreams.has(stream);
  }

  /**
   * Get the original getUserMedia constraints for a stream.
   * Returns null if the stream is not a known fake stream or the constraints
   * are not available.
   * @param {MediaStream} stream
   * @returns {MediaStreamConstraints|null}
   */
  function getStreamConstraints(stream) {
    return streamConstraints.get(stream) ?? null;
  }

  /**
   * Pick a new pool image and swap it into the canvas for the given stream.
   * Triggers an immediate redraw on the next animation frame.
   *
   * @param {MediaStream} stream - The fake MediaStream returned by getUserMedia
   * @returns {Promise<boolean>} true if the image was swapped, false if stream not found
   */
  async function refreshStreamImage(stream) {
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
  async function switchToRealCamera(fakeStream, constraints) {
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
  async function switchToFakeCamera(realStream, constraints) {
    // Stop real stream tracks if provided
    if (realStream) {
      for (const track of realStream.getTracks()) {
        track.stop();
      }
    }

    return createFakeStream(constraints, originalGetUserMedia);
  }

  /**
   * @file Shared body-level MutationObserver — one observer, many handlers.
   *
   * Before this module, both processor.js and video-overlay.js created their
   * own MutationObserver on document.body with `{ childList: true, subtree:
   * true }`.  On a page with heavy DOM churn every mutation fired 2–3
   * observer callbacks, each traversing the mutation records independently.
   *
   * This module creates a single observer and dispatches to registered
   * handlers.  Modules call registerBodyMutationHandler(fn) and receive an
   * unsubscribe function.  Handlers that throw are isolated — one handler
   * failing does not prevent others from running.
   *
   * @module utils/dom-observer
   */

  /** @type {MutationObserver|null} */
  let _observer = null;

  /** @type {Array<(mutations: MutationRecord[]) => void>} */
  const _handlers = [];

  /**
   * Register a callback to be invoked on every document.body mutation
   * (childList + subtree).  Returns an unsubscribe function; call it to
   * remove the handler.
   *
   * The observer is created lazily on the first registration and disconnected
   * automatically when all handlers unsubscribe.
   *
   * @param {(mutations: MutationRecord[]) => void} fn
   * @returns {() => void} unsubscribe function
   */
  function registerBodyMutationHandler(fn) {
    _handlers.push(fn);

    if (!_observer) {
      _observer = new MutationObserver((mutations) => {
        for (let i = 0; i < _handlers.length; i++) {
          try { _handlers[i](mutations); } catch (_) { /* isolate failures */ }
        }
      });
      _observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      const idx = _handlers.indexOf(fn);
      if (idx >= 0) _handlers.splice(idx, 1);
      if (_handlers.length === 0 && _observer) {
        _observer.disconnect();
        _observer = null;
      }
    };
  }

  /**
   * @file Auto-processor for face verification windows
   * Observes the page for face recognition UI elements and auto-clicks them
   * in sequence: open camera → take photo → start comparison.
   *
   * Actual DOM structure on tj.100.wang:
   *
   *   State 1 (camera not opened):
   *     <div class="face_btn">
   *       <span class="face_btns btn_fill">开启摄像头</span>
   *     </div>
   *
   *   State 2 (camera opened, ready to take photo):
   *     <div class="face_btn">
   *       <span class="face_btns btn_again">拍照</span>
   *     </div>
   *
   *   State 3 (photo taken, two options):
   *     <div class="face_btn">
   *       <span class="face_btns btn_again">重新拍照</span>
   *       <span class="face_btns btn_contrast btn_fill">开始对比</span>
   *     </div>
   *
   * Note: .btn_again is used for BOTH "拍照" and "重新拍照" — text content
   * must be checked to distinguish the action.  "重试" (retry after failure)
   * may also use .btn_again.
   */


  let observerUnsubscribe$1 = null;
  let retryAttempt = 0;
  let retryExhausted = false;
  let retryBackoffTimer = null;
  let debounceTimer = null;
  let compareRetries = 0;

  /**
   * Consecutive compare-fail counter for the retake→compare loop.
   * Incremented each time a fresh "重新拍照" → "开始对比" cycle is triggered
   * from the comparing state.  Resets when the modal closes (success) or
   * when the processor is stopped/reset.
   */
  let compareAttempts = 0;

  /**
   * Timestamp (Date.now()) of the most recent state transition.
   * Used by the watchdog check in checkAndStartSequence() to detect
   * sequences that have been stuck in the same state too long without
   * making progress.
   */
  let _stateEnteredAt = 0;

  /**
   * Maximum time (ms) a non-idle sequence state may persist before the
   * watchdog forces a reset.  Catches edge cases where the DOM stops
   * updating (slow server, frozen page) and the MutationObserver stays
   * silent — the state machine would otherwise be stuck forever.
   */
  const WATCHDOG_TIMEOUT_MS = 10000;

  /**
   * Sentinel that prevents duplicate post-cooldown re-check timers.
   * Set to true when scheduleCooldownRecheck() arms a timer; cleared
   * when the timer fires or when clearSequence() runs.
   */
  let _cooldownRecheckScheduled = false;

  /**
   * Timestamp (Date.now()) of the most recent "开始对比" click.
   * Used by handleCompareFailRecovery to enforce a cooldown period —
   * the server needs time to respond before we can safely conclude that
   * the comparison was rejected.  0 = no compare has been submitted yet.
   */
  let _lastCompareSubmittedAt = 0;

  /**
   * Jittered cooldown duration (ms) for the current compare cycle.
   * Captured once at compare-submit time so the cooldown is stable for
   * the entire server-response window.  Varies per attempt.
   *
   * Initialised from AUTO_CONFIG at module load — assumes {@link AUTO_CONFIG}
   * is available at this point (imported at the top of the module).
   */
  let _compareCooldownMs = AUTO_CONFIG.COMPARE_COOLDOWN_MS;

  /**
   * Current auto-click sequence state.
   * @type {'idle' | 'waiting_modal' | 'camera_opening' | 'photo_taking' | 'photo_taken' | 'comparing'}
   */
  let sequenceState = 'idle';

  /**
   * Whether a verification attempt is in flight — any state past the initial
   * modal detection where an image from the pool is being used for verification.
   *
   * Set implicitly by the state machine; read when the modal disappears to
   * decide whether to record a success for the last picked image.
   *
   * True for: camera_opening, photo_taking, photo_taken, comparing.
   * False for: idle, waiting_modal.
   */
  function isVerificationInFlight() {
    return sequenceState === 'camera_opening'
        || sequenceState === 'photo_taking'
        || sequenceState === 'photo_taken'
        || sequenceState === 'comparing';
  }

  /**
   * Transition the sequence state machine and record the timestamp.
   * Every state assignment must go through this helper so the watchdog
   * can detect stalled sequences.
   * @param {string} newState
   */
  function transitionState(newState) {
    sequenceState = newState;
    _stateEnteredAt = Date.now();
  }

  /**
   * Schedule a one-shot re-check after the compare cooldown expires.
   *
   * When handleCompareFailRecovery is blocked by the cooldown guard,
   * there may be no further DOM mutations to trigger the observer.
   * This timer ensures we re-evaluate the modal state once the server
   * has had time to respond.
   *
   * Idempotent — only one re-check timer is scheduled at a time.
   *
   * @param {number} elapsed - ms already elapsed since compare was submitted
   */
  function scheduleCooldownRecheck(elapsed) {
    if (_cooldownRecheckScheduled) return;
    _cooldownRecheckScheduled = true;

    const remaining = _compareCooldownMs - elapsed + 150;
    debug(`Scheduling cooldown re-check in ${remaining}ms`);
    const timer = setTimeout(() => {
      _cooldownRecheckScheduled = false;
      checkAndStartSequence();
    }, remaining);
    sequenceTimers.push(timer);
  }

  /**
   * Timer handles for the sequential click delays (used to cancel on reset).
   */
  let sequenceTimers = [];

  // ---------------------------------------------------------------------------
  // Selectors & text patterns
  // ---------------------------------------------------------------------------

  /**
   * CSS selectors for face verification UI elements.
   * These are tried first (fast path); text-content fallback is used when selectors fail.
   */
  const FACE_UI_SELECTORS = {
    /** The face verification modal container (Ant Design modal) */
    MODAL: '.ant-modal-content',
    /** Open camera button — .face_btns.btn_fill without .btn_contrast */
    CAMERA_BTN: '.face_btns.btn_fill:not(.btn_contrast)',
    /** Take photo / re-take photo button — .face_btns.btn_again */
    PHOTO_BTN: '.face_btns.btn_again',
    /** Start comparison button */
    COMPARE_BTN: '.face_btns.btn_contrast.btn_fill'};

  /**
   * Text patterns for button identification (fallback when CSS selectors are ambiguous).
   * .btn_again is used for "拍照", "重新拍照", and possibly "重试" —
   * we distinguish by text content.
   *
   * Exported for use by video-overlay.js and other UI modules that search for
   * face verification buttons.
   */
  const BTN_TEXT = {
    CAMERA: ['开启摄像头', '打开摄像头'],
    PHOTO: ['拍照'],
    RETAKE: ['重新拍照', '重新拍'],
    COMPARE: ['开始对比', '对比', '开始验证'],
    RETRY: ['重试', '重新验证'],
  };

  // ---------------------------------------------------------------------------
  // Button finder — class selector first, text fallback
  // ---------------------------------------------------------------------------

  /**
   * Find a button element using class selectors first, falling back to text-content search.
   *
   * @param {string} selector - CSS selector to try first
   * @param {string[]} [textPatterns] - Text patterns for fallback search
   * @param {HTMLElement} [root=document] - Root element to search within
   * @returns {HTMLElement|null}
   */
  function findButton(selector, textPatterns, root = document) {
    // 1. Class-based selector (fast path)
    const el = root.querySelector(selector);
    if (el) return el;

    // 2. Text-content fallback (slow path)
    if (textPatterns && textPatterns.length > 0) {
      // Search among .face_btns elements first
      const faceBtns = root.querySelectorAll('.face_btns');
      for (const btn of faceBtns) {
        const text = (btn.textContent || '').trim();
        for (const pattern of textPatterns) {
          if (text.includes(pattern)) return btn;
        }
      }
      // Broader: search any button-like element
      // Exclude our own panel buttons to avoid recursive self-clicks
      const candidates = root.querySelectorAll('button, [role="button"], .ant-btn, .ant-btn-primary');
      for (const btn of candidates) {
        if (btn.closest('.bfw-panel')) continue;
        const text = (btn.textContent || '').trim();
        for (const pattern of textPatterns) {
          if (text.includes(pattern)) return btn;
        }
      }
    }

    return null;
  }

  /**
   * Check if a button element's text matches any pattern in the list.
   * @param {Element} btn
   * @param {string[]} patterns
   * @returns {boolean}
   */
  function btnTextMatches(btn, patterns) {
    const text = (btn.textContent || '').trim();
    return patterns.some(p => text.includes(p));
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Clear all pending sequence timers and reset state.
   */
  function clearSequence() {
    sequenceTimers.forEach(clearTimeout);
    sequenceTimers = [];
    transitionState('idle');
    compareRetries = 0;
    _lastCompareSubmittedAt = 0;
    _compareCooldownMs = AUTO_CONFIG.COMPARE_COOLDOWN_MS;
    _cooldownRecheckScheduled = false;
  }

  /**
   * Click an element and log the action.
   * @param {Element} el
   * @param {string} label
   * @returns {boolean}
   */
  function clickElement(el, label) {
    if (!el) return false;
    try {
      el.click();
      info(`Auto-clicked: ${label}`);
      appendLog(`已自动点击: ${label}`);
      return true;
    } catch (e) {
      warn(`Auto-click failed for "${label}":`, e);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Retry backoff
  // ---------------------------------------------------------------------------

  /**
   * Calculate the exponential backoff delay for the current retry attempt.
   * @returns {number} milliseconds
   */
  function getBackoffDelay() {
    const delay = AUTO_CONFIG.RETRY_BASE_DELAY_MS * Math.pow(2, retryAttempt - 1);
    return jitterMs(Math.min(delay, AUTO_CONFIG.RETRY_MAX_DELAY_MS), 0.2);
  }

  /**
   * Handle retry exhaustion — give up and stop the auto-processor.
   */
  function exhaustRetries() {
    retryExhausted = true;
    warn(`Retry limit reached (${AUTO_CONFIG.RETRY_MAX_ATTEMPTS} attempts). Stopping auto-processor.`);
    appendLog(`自动重试已达上限 (${AUTO_CONFIG.RETRY_MAX_ATTEMPTS} 次)，已停止`);
    setStatus(false, '已停止 — 重试次数已达上限');
    stopAutoProcessor();
  }

  // ---------------------------------------------------------------------------
  // Sequential auto-click flow
  // ---------------------------------------------------------------------------

  /**
   * Phase 1: Find and click the "open camera" button.
   * After clicking, schedule phase 2 (photo).
   */
  function clickCameraButton() {
    if (sequenceState !== 'waiting_modal') return;

    const modal = document.querySelector(FACE_UI_SELECTORS.MODAL);
    const rootNode = modal || document;
    const btn = findButton(FACE_UI_SELECTORS.CAMERA_BTN, BTN_TEXT.CAMERA, rootNode);

    if (!btn) {
      // Camera button not found — maybe we can skip to photo or compare
      debug('Camera button not found, looking for photo/compare button directly');
      const photoBtn = findButton(FACE_UI_SELECTORS.PHOTO_BTN, null, rootNode);
      if (photoBtn && btnTextMatches(photoBtn, BTN_TEXT.PHOTO) && !btnTextMatches(photoBtn, BTN_TEXT.RETAKE)) {
        // Camera already open, photo button visible — jump to photo phase
        debug('Found photo button directly — skipping camera phase');
        transitionState('camera_opening');
        clickPhotoButton();
        return;
      }
      const compareBtn = findButton(FACE_UI_SELECTORS.COMPARE_BTN, BTN_TEXT.COMPARE, rootNode);
      if (compareBtn) {
        debug('Found compare button directly — skipping to compare phase');
        transitionState('photo_taking');
        clickCompareButton();
        return;
      }
      debug('No camera, photo, or compare button found yet');
      return;
    }

    transitionState('camera_opening');
    clickElement(btn, '开启摄像头');

    // Schedule photo click after camera opens
    const timer = setTimeout(() => {
      clickPhotoButton();
    }, jitterMs(AUTO_CONFIG.CAMERA_OPEN_DELAY_MS, 0.35));
    sequenceTimers.push(timer);
  }

  /**
   * Phase 2: Click the "拍照" button (has class .btn_again).
   * This button appears after the camera is opened.
   * Also handles "重新拍照" — re-takes the photo and then proceeds to compare.
   */
  function clickPhotoButton() {
    if (sequenceState !== 'camera_opening') return;

    const modal = document.querySelector(FACE_UI_SELECTORS.MODAL);
    const rootNode = modal || document;

    // Look for "拍照" button (.btn_again with text "拍照" but NOT "重新拍照")
    const allBtnAgain = rootNode.querySelectorAll(FACE_UI_SELECTORS.PHOTO_BTN);
    let photoBtn = null;
    for (const btn of allBtnAgain) {
      if (btnTextMatches(btn, BTN_TEXT.PHOTO) && !btnTextMatches(btn, BTN_TEXT.RETAKE)) {
        photoBtn = btn;
        break;
      }
    }

    // Also check if compare button already appeared
    const compareBtn = findButton(FACE_UI_SELECTORS.COMPARE_BTN, BTN_TEXT.COMPARE, rootNode);

    if (!photoBtn) {
      // No photo button — maybe compare already visible
      if (compareBtn) {
        if (!getSetting('autoCompare', true)) {
          info('Compare button visible but autoCompare OFF — pausing');
          appendLog('检测到对比按钮，自动对比已关闭 — 请手动点击');
          transitionState('photo_taken');
          return;
        }
        debug('Photo button not found, compare button visible — clicking compare directly');
        transitionState('photo_taking');
        clickCompareButton();
        return;
      }
      warn('Photo button not found after opening camera');
      return;
    }

    // Photo button found (guaranteed to be pure "拍照" at this point —
    // "重新拍照" was branched off above).
    //
    // If the compare button also already appeared alongside, it means the
    // page auto-took a photo.  We still want to click "拍照" to refresh
    // the pool image, so fall through to the normal flow below.

    transitionState('photo_taking');
    clickElement(photoBtn, '拍照');

    // Check autoCompare setting: when OFF, pause for manual confirmation
    if (!getSetting('autoCompare', true)) {
      transitionState('photo_taken');
      info('Photo taken — autoCompare OFF, pausing for manual confirmation');
      appendLog('拍摄完成 — 请确认后手动点击「开始对比」');
      setStatus(true, '等待确认 — 请手动点击对比');
      return;
    }

    // Schedule comparison click after photo is taken
    const timer = setTimeout(() => {
      clickCompareButton();
    }, jitterMs(AUTO_CONFIG.PHOTO_DELAY_MS, 0.3));
    sequenceTimers.push(timer);
  }

  /**
   * Phase 3: Click the "start comparison" button.
   * Retries a few times with short delays if the button isn't in the DOM yet.
   * Exported so the UI can trigger it manually when autoCompare is OFF.
   */
  function clickCompareButton() {
    if (sequenceState !== 'photo_taking' && sequenceState !== 'photo_taken') return;

    const modal = document.querySelector(FACE_UI_SELECTORS.MODAL);
    const rootNode = modal || document;

    // Check for "重新拍照" button — if visible, photo was taken and compare should appear
    const allBtnAgain = rootNode.querySelectorAll(FACE_UI_SELECTORS.PHOTO_BTN);
    for (const btn of allBtnAgain) {
      if (btnTextMatches(btn, BTN_TEXT.RETAKE)) {
        break;
      }
    }

    const btn = findButton(FACE_UI_SELECTORS.COMPARE_BTN, BTN_TEXT.COMPARE, rootNode);

    if (!btn) {
      // Compare button not yet in DOM — retry
      if (compareRetries < AUTO_CONFIG.MAX_COMPARE_RETRIES) {
        compareRetries++;
        debug(`Compare button not found, retry ${compareRetries}/${AUTO_CONFIG.MAX_COMPARE_RETRIES}`);
        const timer = setTimeout(() => clickCompareButton(), jitterMs(AUTO_CONFIG.COMPARE_RETRY_DELAY_MS, 0.25));
        sequenceTimers.push(timer);
        return;
      }

      warn('Compare button not found after retries — trying fallback');
      // Last resort: click any non-camera, non-photo face button
      const faceBtns = rootNode.querySelectorAll('.face_btns');
      for (const fb of faceBtns) {
        const text = (fb.textContent || '').trim();
        if (!btnTextMatches(fb, BTN_TEXT.CAMERA) && !btnTextMatches(fb, BTN_TEXT.PHOTO)) {
          clickElement(fb, `备选按钮 ("${text}")`);
          break;
        }
      }
      return;
    }

    transitionState('comparing');
    compareRetries = 0;
    _lastCompareSubmittedAt = Date.now();
    _compareCooldownMs = jitterMsFloor(AUTO_CONFIG.COMPARE_COOLDOWN_MS, 0.3);
    clickElement(btn, '开始对比');
    // Reset retry counter on successful comparison submission
    if (retryAttempt > 0) {
      info(`Retry counter reset (${retryAttempt} → 0) — compare submitted`);
      retryAttempt = 0;
      retryExhausted = false;
    }
  }

  /**
   * Check for a genuine retry button ("重试") and click it.
   * IMPORTANT: "拍照" and "重新拍照" also use .btn_again — we must distinguish
   * by text content and NOT treat "拍照" as a retry button.
   */
  function clickRetryButton() {
    if (retryExhausted) return false;

    const modal = document.querySelector(FACE_UI_SELECTORS.MODAL);
    const rootNode = modal || document;

    // Only look for genuine retry buttons by text content
    // "重试" is the actual retry button; "拍照" and "重新拍照" are NOT retries
    const retryBtn = findButton(null, BTN_TEXT.RETRY, rootNode);
    if (!retryBtn) return false;

    // Enforce max retry attempts
    if (retryAttempt >= AUTO_CONFIG.RETRY_MAX_ATTEMPTS) {
      exhaustRetries();
      return false;
    }

    retryAttempt++;
    const delay = getBackoffDelay();

    info(`Retry attempt ${retryAttempt}/${AUTO_CONFIG.RETRY_MAX_ATTEMPTS} — waiting ${(delay / 1000).toFixed(1)}s`);
    appendLog(`重试第 ${retryAttempt}/${AUTO_CONFIG.RETRY_MAX_ATTEMPTS} 次 — 等待 ${(delay / 1000).toFixed(1)} 秒`);

    // Record failure for the last picked image — the retry means verification failed
    recordLastPickResult(false);

    clickElement(retryBtn, '重试');

    // Reset state to start the sequence over after backoff delay
    clearSequence();
    transitionState('waiting_modal');
    retryBackoffTimer = setTimeout(() => clickCameraButton(), delay);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Compare-fail recovery
  // ---------------------------------------------------------------------------

  /**
   * Handle the case where the previous comparison was rejected.
   * Called when sequenceState is 'comparing' but the modal is still visible.
   *
   * Three recovery paths:
   *   1. "重新拍照" + "开始对比" both visible → click retake, re-enter photo pipeline
   *   2. Only "开始对比" visible → click compare directly
   *   3. "开启摄像头" visible → modal fully reset; restart from scratch
   *
   * Paths 1 & 2 are guarded by a cooldown — while the server is processing the
   * original compare, the page shows the same buttons as a rejection, so we
   * schedule a re-check after the cooldown expires rather than acting early.
   * Path 3 bypasses the cooldown because the modal can only reset to "开启摄像头"
   * AFTER the server has responded, so there is no ambiguity.
   *
   * @param {HTMLElement} modal - The face verification modal element
   * @returns {boolean} true if recovery was attempted
   */
  function handleCompareFailRecovery(modal) {
    // Enforce max consecutive compare retries
    if (compareAttempts >= AUTO_CONFIG.RETRY_MAX_ATTEMPTS) {
      warn(`Compare retry limit reached (${AUTO_CONFIG.RETRY_MAX_ATTEMPTS}). Stopping.`);
      appendLog(`对比重试次数已达上限 (${AUTO_CONFIG.RETRY_MAX_ATTEMPTS} 次)，请手动操作`);
      setStatus(false, '已停止 — 对比重试次数已达上限');
      return true; // modal is present; caller should not start a new sequence
    }

    const elapsed = Date.now() - _lastCompareSubmittedAt;
    const cooldownActive = _lastCompareSubmittedAt > 0 && elapsed < _compareCooldownMs;
    if (cooldownActive) {
      debug(`Compare cooldown active (${elapsed}ms / ${_compareCooldownMs}ms)`);
    }

    const allBtnAgain = modal.querySelectorAll(FACE_UI_SELECTORS.PHOTO_BTN);
    let retakeBtn = null;
    for (const btn of allBtnAgain) {
      if (btnTextMatches(btn, BTN_TEXT.RETAKE)) { retakeBtn = btn; break; }
    }
    const compareBtn = findButton(FACE_UI_SELECTORS.COMPARE_BTN, BTN_TEXT.COMPARE, modal);

    // ── Path 1: both "重新拍照" and "开始对比" visible ─────────────────
    // Ambiguous state — same DOM during server wait and after rejection.
    // Cooldown MUST be respected.
    if (retakeBtn && compareBtn) {
      if (cooldownActive) {
        scheduleCooldownRecheck(elapsed);
        return false;
      }

      compareAttempts++;
      info(`Verification failed — retry ${compareAttempts}/${AUTO_CONFIG.RETRY_MAX_ATTEMPTS}: clicking retake, then photo`);
      appendLog(`验证未通过，自动重试第 ${compareAttempts}/${AUTO_CONFIG.RETRY_MAX_ATTEMPTS} 次`);

      // Record failure for the last picked image
      recordLastPickResult(false);

      // Clear pending timers (don't touch compareAttempts)
      sequenceTimers.forEach(clearTimeout);
      sequenceTimers = [];
      compareRetries = 0;

      clickElement(retakeBtn, '重新拍照');

      // After retake the camera re-opens → go through the normal pipeline
      transitionState('camera_opening');
      const timer = setTimeout(() => clickPhotoButton(), jitterMs(AUTO_CONFIG.CAMERA_OPEN_DELAY_MS, 0.35));
      sequenceTimers.push(timer);
      return true;
    }

    // ── Path 2: only "开始对比" visible (no "重新拍照") ────────────────
    // Also ambiguous — cooldown applies.
    if (!retakeBtn && compareBtn) {
      if (cooldownActive) {
        scheduleCooldownRecheck(elapsed);
        return false;
      }

      compareAttempts++;
      info(`Verification failed — retry ${compareAttempts}/${AUTO_CONFIG.RETRY_MAX_ATTEMPTS}: compare button visible directly`);
      appendLog(`验证未通过，自动重试第 ${compareAttempts}/${AUTO_CONFIG.RETRY_MAX_ATTEMPTS} 次（直接对比）`);
      transitionState('photo_taking');
      clickCompareButton();
      return true;
    }

    // ── Path 3: modal fully reset to initial "开启摄像头" state ─────────
    // No cooldown guard here.  The modal can only transition to this state
    // AFTER the server has responded with a rejection — the DOM went from
    // "retake + compare" (pending) → "camera" (rejected).  There is no
    // ambiguity, so we act immediately.
    const cameraBtn = findButton(FACE_UI_SELECTORS.CAMERA_BTN, BTN_TEXT.CAMERA, modal);
    if (cameraBtn) {
      compareAttempts++;
      info(`Verification failed — retry ${compareAttempts}/${AUTO_CONFIG.RETRY_MAX_ATTEMPTS}: modal reset to initial state`);
      appendLog(`验证未通过，自动重试第 ${compareAttempts}/${AUTO_CONFIG.RETRY_MAX_ATTEMPTS} 次（重新开始）`);

      // Record failure for the last picked image
      recordLastPickResult(false);

      // Reset state so checkAndStartSequence can start a fresh sequence
      clearSequence();
      // Keep compareAttempts — it tracks consecutive failures within the same
      // modal session and is only reset when the modal closes or processor stops.
      return false; // Let checkAndStartSequence fall through to startModalSequence
    }

    // Neither button visible yet — fall through
    return false;
  }

  // ---------------------------------------------------------------------------
  // Modal sequence start
  // ---------------------------------------------------------------------------

  /**
   * Kick off a fresh auto-click sequence when the face modal first appears.
   * @param {HTMLElement} modal
   */
  function startModalSequence(modal) {
    if (retryAttempt > 0) {
      info(`Retry counter reset (${retryAttempt} → 0) — new modal detected`);
      retryAttempt = 0;
      retryExhausted = false;
    }

    transitionState('waiting_modal');
    info('Face verification modal detected, starting auto-click sequence');
    appendLog('检测到人脸验证窗口，开始自动操作');
    setStatus(true, '运行中 — 自动处理人脸验证');

    // Give the modal time to fully render, then begin
    const timer = setTimeout(() => {
      clickCameraButton();
    }, jitterMs(AUTO_CONFIG.CLICK_DELAY_MS, 0.4));
    sequenceTimers.push(timer);
  }

  // ---------------------------------------------------------------------------
  // Modal detection & sequence kickoff
  // ---------------------------------------------------------------------------

  /**
   * Check if the face verification modal is present and start the sequence.
   * @returns {boolean} Whether the modal was detected
   */
  function checkAndStartSequence() {
    // Check settings — skip if auto-click is disabled
    if (!isFaceAutoActive()) {
      debug('Auto-processor: face auto not active, skipping');
      return false;
    }

    const modal = document.querySelector(FACE_UI_SELECTORS.MODAL);
    if (!modal) {
      if (isVerificationInFlight()) {
        // Modal disappeared while a verification attempt was in flight —
        // the comparison was accepted → record success for the last picked image.
        info(`Face modal closed during "${sequenceState}" → verification SUCCESS`);
        recordLastPickResult(true);
      }
      if (sequenceState !== 'idle') {
        debug('Face modal disappeared, resetting auto-processor state');
        clearSequence();
        compareAttempts = 0;
      }
      return false;
    }

    // Log available buttons for debugging
    debug('Auto-processor: modal found, scanning buttons');
    const allBtns = modal.querySelectorAll('.face_btns, .face_btn, .ant-btn, button');
    for (const btn of allBtns) {
      debug(`  Button: classes="${btn.className}" text="${(btn.textContent || '').trim().substring(0, 30)}"`);
    }

    // ── Watchdog: detect stuck sequence states ──────────────────────────
    // If the state machine has been parked in the same non-idle state for
    // longer than WATCHDOG_TIMEOUT_MS, something went wrong (e.g. the DOM
    // never updated and the MutationObserver stayed silent).  Force a reset
    // so the processor can re-scan and recover.
    //
    // photo_taken is excluded — it means autoCompare is OFF and the user
    // intentionally wants manual confirmation; the pause is expected.
    if (sequenceState !== 'idle' && sequenceState !== 'photo_taken'
        && _stateEnteredAt > 0
        && (Date.now() - _stateEnteredAt) > WATCHDOG_TIMEOUT_MS) {
      warn(`Watchdog: state "${sequenceState}" stuck for ${Date.now() - _stateEnteredAt}ms — forcing reset`);
      appendLog('自动操作卡住超时，正在重置');
      clearSequence();
      // Keep compareAttempts — watchdog fires on transient stalls, not
      // verification failures.  Resetting the counter would allow infinite
      // retry loops when the page is consistently slow.
      // Fall through to start a fresh sequence below
    }

    // 1. Check for genuine retry button ("重试")
    if (clickRetryButton()) return true;

    // 2. Compare-fail recovery
    if (sequenceState === 'comparing' && handleCompareFailRecovery(modal)) return true;

    // 2b. Fresh-modal guard: when the state machine is stuck in any non-idle
    //     state from a previous (possibly interrupted) sequence, but the DOM
    //     shows a brand-new modal with camera or photo buttons, reset and
    //     start over.  This recovers from two scenarios:
    //
    //       a) SPA navigation replaced the old modal while state was still
    //          in-flight — the new modal appears with "开启摄像头";
    //       b) handleCompareFailRecovery mis-fired on a slow-but-successful
    //          compare (cooldown expired while server was still processing),
    //          advancing state to camera_opening before the server closed
    //          the modal — leaving state stuck when the next modal opens.
    if (sequenceState !== 'idle' && sequenceState !== 'photo_taken') {
      const freshCameraBtn = findButton(FACE_UI_SELECTORS.CAMERA_BTN, BTN_TEXT.CAMERA, modal);
      const allPhotoBtns = modal.querySelectorAll(FACE_UI_SELECTORS.PHOTO_BTN);
      let freshPhotoBtn = null;
      for (const btn of allPhotoBtns) {
        if (btnTextMatches(btn, BTN_TEXT.PHOTO) && !btnTextMatches(btn, BTN_TEXT.RETAKE)) { freshPhotoBtn = btn; break; }
      }
      if (freshCameraBtn || freshPhotoBtn) {
        debug(`State is "${sequenceState}" but fresh modal detected (camera=${!!freshCameraBtn} photo=${!!freshPhotoBtn}) — resetting and restarting`);
        clearSequence();
        // Keep compareAttempts — it tracks failures within the same modal
        // session.  Only the modal-close (success) or stopAutoProcessor
        // should reset this counter.
        startModalSequence();
        return true;
      }
    }

    // 3. Guard: don't restart if already in a non-idle state.
    //    photo_taken means autoCompare is OFF and we're intentionally paused
    //    waiting for manual confirmation — only the autoCompare toggle
    //    listener or modal-close should move us out of this state.
    if (sequenceState !== 'idle') return true;

    // 4. Start a fresh sequence (only from idle)
    startModalSequence();
    return true;
  }

  // ---------------------------------------------------------------------------
  // Retry handler — called from UI panel
  // ---------------------------------------------------------------------------

  /**
   * Handle the retry custom event dispatched from the UI panel.
   */
  function onRetry() {
    if (!isFaceAutoActive()) {
      warn('Manual retry ignored — face auto is disabled');
      appendLog('手动重试已忽略 — 过人脸已关闭');
      return;
    }

    info('Manual retry received — scanning for face UI elements');
    appendLog('已触发手动重试');

    // Reset sequence state so we can re-enter the flow
    clearSequence();

    const modal = document.querySelector(FACE_UI_SELECTORS.MODAL);
    const rootNode = modal || document;

    // Try genuine retry button first
    const retryBtn = findButton(null, BTN_TEXT.RETRY, rootNode);
    if (retryBtn) {
      clickElement(retryBtn, '重试按钮');
      transitionState('waiting_modal');
      setTimeout(() => clickCameraButton(), jitterMs(AUTO_CONFIG.RETRY_CAMERA_DELAY_MS, 0.35));
      return;
    }

    const cameraBtn = findButton(FACE_UI_SELECTORS.CAMERA_BTN, BTN_TEXT.CAMERA, rootNode);
    if (cameraBtn) {
      clickElement(cameraBtn, '开启摄像头');
      transitionState('camera_opening');
      setTimeout(() => clickPhotoButton(), jitterMs(AUTO_CONFIG.CAMERA_OPEN_DELAY_MS, 0.35));
      return;
    }

    // Look for "拍照" specifically (not "重新拍照" — that's handled as a retake below)
    const allBtnAgain = rootNode.querySelectorAll(FACE_UI_SELECTORS.PHOTO_BTN);
    for (const btn of allBtnAgain) {
      if (btnTextMatches(btn, BTN_TEXT.PHOTO) && !btnTextMatches(btn, BTN_TEXT.RETAKE)) {
        clickElement(btn, '拍照');
        transitionState('photo_taking');
        setTimeout(() => clickCompareButton(), jitterMs(AUTO_CONFIG.PHOTO_DELAY_MS, 0.3));
        return;
      }
    }

    // "重新拍照" — retake, then schedule the photo pipeline
    for (const btn of allBtnAgain) {
      if (btnTextMatches(btn, BTN_TEXT.RETAKE)) {
        clickElement(btn, '重新拍照');
        transitionState('camera_opening');
        setTimeout(() => clickPhotoButton(), jitterMs(AUTO_CONFIG.CAMERA_OPEN_DELAY_MS, 0.35));
        return;
      }
    }

    const compareBtn = findButton(FACE_UI_SELECTORS.COMPARE_BTN, BTN_TEXT.COMPARE, rootNode);
    if (compareBtn) {
      clickElement(compareBtn, '开始对比按钮');
      return;
    }

    warn('No face UI element found on manual retry');
    appendLog('未找到可点击的人脸验证元素');
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Start observing the DOM for face verification popups.
   */
  function startAutoProcessor() {
    if (observerUnsubscribe$1) {
      warn('Auto-processor is already running');
      return;
    }

    // Initial scan — check if modal is already present
    checkAndStartSequence();

    // Register with the shared body-level MutationObserver
    observerUnsubscribe$1 = registerBodyMutationHandler((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList'
            && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
          if (retryExhausted) break;

          clearTimeout(debounceTimer);
          const baseDebounce = retryAttempt > 0
            ? Math.min(AUTO_CONFIG.CLICK_DELAY_MS * (retryAttempt + 1), 2000)
            : AUTO_CONFIG.CLICK_DELAY_MS;
          debounceTimer = setTimeout(() => {
            checkAndStartSequence();
          }, jitterMs(baseDebounce, 0.35));
          break;
        }
      }
    });

    document.addEventListener('bfw:retry', onRetry);

    info('Auto-processor started');
    setStatus(true, '运行中 — 正在处理人脸验证');
    appendLog('自动处理器已启动');
  }

  /**
   * Start the auto-processor and disconnect the observer.
   */
  function stopAutoProcessor() {
    if (observerUnsubscribe$1) {
      observerUnsubscribe$1();
      observerUnsubscribe$1 = null;
    }
    clearTimeout(debounceTimer);
    debounceTimer = null;
    clearTimeout(retryBackoffTimer);
    retryBackoffTimer = null;
    clearSequence();
    document.removeEventListener('bfw:retry', onRetry);
    retryAttempt = 0;
    retryExhausted = false;
    compareAttempts = 0;
    setStatus(false, '已停止');
    appendLog('自动处理器已停止');
    info('Auto-processor stopped');
  }

  /**
   * Reset the auto-processor sequence state without stopping the observer.
   * Allows the overlay's camera toggle to restart the flow from scratch
   * (avoids the processor being stuck in 'photo_taken' or other states).
   */
  function resetAutoSequence() {
    clearTimeout(debounceTimer);
    debounceTimer = null;
    clearTimeout(retryBackoffTimer);
    retryBackoffTimer = null;
    clearSequence();
    retryAttempt = 0;
    retryExhausted = false;
    compareAttempts = 0;
    debug('Auto-processor: sequence reset for camera toggle');
  }

  // ---------------------------------------------------------------------------
  // Settings listener
  // ---------------------------------------------------------------------------

  function syncProcessorFromSettings() {
    const shouldRun = isFaceAutoActive();
    if (shouldRun && !observerUnsubscribe$1) {
      startAutoProcessor();
    } else if (!shouldRun && observerUnsubscribe$1) {
      stopAutoProcessor();
    }
  }

  onChange('faceAutoClick', () => syncProcessorFromSettings());

  // When autoCompare is toggled ON while paused at photo_taken, resume the flow
  onChange('autoCompare', (val) => {
    if (val && sequenceState === 'photo_taken') {
      info('autoCompare toggled ON — resuming comparison');
      appendLog('自动对比已开启 — 继续执行对比');
      setStatus(true, '运行中 — 正在处理人脸验证');
      // Short delay to allow the UI to update before clicking
      const timer = setTimeout(() => clickCompareButton(), jitterMs(300, 0.4));
      sequenceTimers.push(timer);
    }
  });

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
  function initVideoOverlay() {
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
   * @file Visibility interceptor — prevents the site from detecting tab-switch or window minimization.
   *
   * 百分网 (tj.100.wang) uses the Page Visibility API and blur events to detect when the
   * user switches tabs or minimizes the window, then pauses the video and shows a warning:
   * "检测到您可能已离开本窗口，已自动暂停播放视频".
   *
   * This module intercepts every known detection vector so the site believes the page
   * is always visible and focused, regardless of the actual window state.
   *
   * Vectors covered:
   *   1. document.hidden                  → always false
   *   2. document.visibilityState         → always "visible"
   *   3. document.hasFocus()              → always true
   *   4. visibilitychange event           → captured & suppressed
   *   5. window blur event                → captured & suppressed
   *   6. document.onvisibilitychange      → setter intercepted
   *   7. window.onblur                    → setter intercepted
   *   8. document.webkitHidden (legacy)   → always false
   *   9. document.msHidden (legacy IE)    → always false
   *  10. pagehide / pageshow events       → captured & suppressed
   */


  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  /** Whether the interceptor is currently active (installed & enforcing). */
  let active = false;

  /** Whether install() has ever been called (prevents double-install). */
  let installed = false;

  // ---------------------------------------------------------------------------
  // Saved references for uninstall
  // ---------------------------------------------------------------------------

  /** Original document.hidden descriptor. */
  let _originalHiddenDescriptor = null;

  /** Original document.visibilityState descriptor. */
  let _originalVisibilityStateDescriptor = null;

  /** Original document.hasFocus function. */
  let _originalHasFocus = null;

  /** Original document.onvisibilitychange descriptor. */
  let _originalOnVisibilityChangeDescriptor = null;

  /** Original window.onblur descriptor. */
  let _originalOnBlurDescriptor = null;

  /** Original document.webkitHidden descriptor (if exists). */
  let _originalWebkitHiddenDescriptor = null;

  /** Original document.msHidden descriptor (if exists). */
  let _originalMsHiddenDescriptor = null;

  // ---------------------------------------------------------------------------
  // Event handlers (capture phase — fire before page listeners)
  // ---------------------------------------------------------------------------

  /**
   * Suppress visibilitychange events at the capture phase.
   * Calling stopImmediatePropagation() here prevents any non-capture listeners
   * (which is what the page registers) from ever seeing the event.
   */
  function onVisibilityChangeCapture(e) {
    if (!active) return;
    e.stopImmediatePropagation();
  }

  /**
   * Suppress window blur events at the capture phase.
   * We only intercept blur on the window object — child element blurs are
   * allowed through so UI interactions still work.
   */
  function onWindowBlurCapture(e) {
    if (!active) return;
    if (e.target === window || e.target === document) {
      e.stopImmediatePropagation();
    }
  }

  /**
   * Suppress pagehide events at the capture phase.
   * Some sites use this as an additional visibility signal.
   */
  function onPageHideCapture(e) {
    if (!active) return;
    e.stopImmediatePropagation();
  }

  /**
   * Suppress pageshow events at the capture phase.
   * (Symmetry — if we block pagehide we block pageshow too.)
   */
  function onPageShowCapture(e) {
    if (!active) return;
    e.stopImmediatePropagation();
  }

  // ---------------------------------------------------------------------------
  // Install
  // ---------------------------------------------------------------------------

  /**
   * Install the visibility interceptor.
   *
   * After calling this, document.hidden is always false and visibilitychange
   * events never reach page-registered listeners (the interceptor consumes them
   * at the capture phase before they bubble).  window blur events are also
   * suppressed at the capture phase for the window target only.
   *
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  function installVisibilityInterceptor() {
    if (installed) {
      debug('Visibility interceptor: already installed, skipping');
      return;
    }
    installed = true;

    // --- document.hidden ---
    try {
      _originalHiddenDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden')
        || Object.getOwnPropertyDescriptor(document, 'hidden');
      Object.defineProperty(document, 'hidden', {
        get: () => active ? false : (_originalHiddenDescriptor
          ? _originalHiddenDescriptor.get.call(document)
          : false),
        configurable: true,
        enumerable: true,
      });
    } catch (e) {
      // Fallback: some browsers expose it on Document.prototype
      try {
        _originalHiddenDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
        Object.defineProperty(Document.prototype, 'hidden', {
          get: () => active ? false : (_originalHiddenDescriptor
            ? _originalHiddenDescriptor.get.call(document)
            : false),
          configurable: true,
          enumerable: true,
        });
      } catch (e2) {
        warn('Visibility interceptor: could not override document.hidden', e2);
      }
    }

    // --- document.visibilityState ---
    try {
      _originalVisibilityStateDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState')
        || Object.getOwnPropertyDescriptor(document, 'visibilityState');
      Object.defineProperty(document, 'visibilityState', {
        get: () => active ? 'visible' : (_originalVisibilityStateDescriptor
          ? _originalVisibilityStateDescriptor.get.call(document)
          : 'visible'),
        configurable: true,
        enumerable: true,
      });
    } catch (e) {
      try {
        _originalVisibilityStateDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
        Object.defineProperty(Document.prototype, 'visibilityState', {
          get: () => active ? 'visible' : (_originalVisibilityStateDescriptor
            ? _originalVisibilityStateDescriptor.get.call(document)
            : 'visible'),
          configurable: true,
          enumerable: true,
        });
      } catch (e2) {
        warn('Visibility interceptor: could not override document.visibilityState', e2);
      }
    }

    // --- document.hasFocus ---
    try {
      _originalHasFocus = document.hasFocus;
      document.hasFocus = function hasFocus() {
        return active ? true : _originalHasFocus.call(document);
      };
    } catch (e) {
      warn('Visibility interceptor: could not override document.hasFocus', e);
    }

    // --- document.onvisibilitychange setter ---
    try {
      _originalOnVisibilityChangeDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'onvisibilitychange')
        || Object.getOwnPropertyDescriptor(document, 'onvisibilitychange');
      const target = _originalOnVisibilityChangeDescriptor ? Document.prototype : document;
      Object.defineProperty(target, 'onvisibilitychange', {
        get() {
          // Return the original getter value — the page can still read it
          return _originalOnVisibilityChangeDescriptor
            ? _originalOnVisibilityChangeDescriptor.get.call(this)
            : undefined;
        },
        set(fn) {
          if (_originalOnVisibilityChangeDescriptor) {
            _originalOnVisibilityChangeDescriptor.set.call(this, fn);
          }
          // We don't block the setter — the capture-phase listener already
          // suppresses the event.  Letting the setter through is harmless and
          // avoids breakage if the page checks for assignment success.
        },
        configurable: true,
        enumerable: true,
      });
    } catch (e) {
      debug('Visibility interceptor: could not intercept onvisibilitychange setter', e);
    }

    // --- window.onblur setter ---
    try {
      _originalOnBlurDescriptor = Object.getOwnPropertyDescriptor(Window.prototype, 'onblur')
        || Object.getOwnPropertyDescriptor(window, 'onblur');
      const target = _originalOnBlurDescriptor ? Window.prototype : window;
      Object.defineProperty(target, 'onblur', {
        get() {
          return _originalOnBlurDescriptor
            ? _originalOnBlurDescriptor.get.call(this)
            : undefined;
        },
        set(fn) {
          if (_originalOnBlurDescriptor) {
            _originalOnBlurDescriptor.set.call(this, fn);
          }
        },
        configurable: true,
        enumerable: true,
      });
    } catch (e) {
      debug('Visibility interceptor: could not intercept onblur setter', e);
    }

    // --- document.webkitHidden (legacy Safari/Chrome) ---
    try {
      if ('webkitHidden' in document) {
        _originalWebkitHiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'webkitHidden');
        Object.defineProperty(document, 'webkitHidden', {
          get: () => active ? false : (_originalWebkitHiddenDescriptor
            ? _originalWebkitHiddenDescriptor.get.call(document)
            : false),
          configurable: true,
          enumerable: true,
        });
      }
    } catch (e) {
      debug('Visibility interceptor: could not override document.webkitHidden', e);
    }

    // --- document.msHidden (legacy IE) ---
    try {
      if ('msHidden' in document) {
        _originalMsHiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'msHidden');
        Object.defineProperty(document, 'msHidden', {
          get: () => active ? false : (_originalMsHiddenDescriptor
            ? _originalMsHiddenDescriptor.get.call(document)
            : false),
          configurable: true,
          enumerable: true,
        });
      }
    } catch (e) {
      debug('Visibility interceptor: could not override document.msHidden', e);
    }

    // --- Event listeners (capture phase) ---
    document.addEventListener('visibilitychange', onVisibilityChangeCapture, true);
    window.addEventListener('blur', onWindowBlurCapture, true);
    window.addEventListener('pagehide', onPageHideCapture, true);
    window.addEventListener('pageshow', onPageShowCapture, true);

    info('Visibility interceptor: installed (all vectors covered)');
  }

  // ---------------------------------------------------------------------------
  // Activate / deactivate
  // ---------------------------------------------------------------------------

  /**
   * Enable interception.  Until this is called the getters and event handlers
   * pass through to the original browser behavior.
   */
  function enableVisibilityInterceptor() {
    if (!installed) {
      installVisibilityInterceptor();
    }
    if (active) return;
    active = true;
    info('Visibility interceptor: ACTIVATED — page cannot detect tab-switch or minimization');
    appendLog('离开检测拦截已启用');
  }

  /**
   * Disable interception.  Restores pass-through behavior.
   */
  function disableVisibilityInterceptor() {
    if (!active) return;
    active = false;
    info('Visibility interceptor: DEACTIVATED — pass-through mode');
    appendLog('离开检测拦截已关闭');
  }

  // ---------------------------------------------------------------------------
  // Auto-init: react to settings changes
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to the `disableVisibilityCheck` setting so the interceptor can
   * be toggled at runtime via the UI.  Called once from index.js after settings
   * are loaded.
   */
  function initVisibilityInterceptorSettings() {
    // React to UI toggles (runtime)
    onChange('disableVisibilityCheck', (enabled) => {
      if (enabled) {
        enableVisibilityInterceptor();
      } else {
        disableVisibilityInterceptor();
      }
    });

    // React to persisted setting (initial load)
    const current = getSetting('disableVisibilityCheck', false);
    if (current) {
      enableVisibilityInterceptor();
    }
  }

  /**
   * @file Auto-course processor — course progress monitoring and automatic playback.
   *
   * Responsibilities:
   *   1. Read complete course tree from React component state (all chapters, lessons, status).
   *   2. Monitor video playback progress (always active).
   *   3. Auto-click the play button when autoCourse is enabled.
   *   4. Auto-resume paused videos that have been stuck for too long.
   *
   * Integration points:
   *   - Controlled via the UI settings panel toggle (key: `autoCourse`).
   *   - Emits log messages through ui/builder.js `appendLog()`.
   *   - Course data is read from React Fiber (not parsed from DOM).
   *
   * Expected flow:
   *   Page load → click play → video plays → ends → platform auto-navigates
   *   → face verification popup (handled by processor.js) → next course loads → repeat
   */


  // ---------------------------------------------------------------------------
  // DOM Selectors
  // ---------------------------------------------------------------------------

  const SELECTORS = {
    /** Play button overlay (appears on page load before video starts) */
    PLAY_BTN: '.playIcon___2PP65, .playIcon',
    /** Ant Design collapse container (root of the course directory) */
    COLLAPSE_CONTAINER: '.ant-collapse',
    /** Fallback container: list wrapper (hash class) */
    LIST_CONTAINER: '[class^="list___"]',
    /** Course directory list element for MutationObserver */
    LIST_OBSERVE: '.list___3GtHP, .list',
  };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  /** @type {boolean} Whether the course monitor is running */
  let running = false;

  /** @type {HTMLVideoElement|null} Cached video element reference */
  let videoEl = null;

  /** @type {MutationObserver|null} Observer for course directory changes */
  let dirObserver = null;

  /** @type {Element|null} The DOM element currently observed by dirObserver */
  let dirObservedEl = null;

  /** @type {number|null} setTimeout handle for periodic progress updates */
  let progressInterval = null;

  /** @type {number} setTimeout handle for play button retry */
  let playRetryTimer = 0;

  /** @type {number} setTimeout handle for stuck-video check */
  let stuckTimer = 0;

  /** @type {number} How many times we've tried to auto-resume */
  let resumeAttempts = 0;

  /** @type {Array|null} Cached reference to the React state array holding course data */
  let cachedCourseData = null;

  /** Cached DOM container for the React fiber hook (avoids repeated querySelector). */
  let cachedFiberContainer = null;

  /** Cached React fiber key on the container (avoids repeated Object.keys scan). */
  let cachedFiberKey = null;

  /** @type {string|null} Current session ID for progress tracking */
  let currentSessionId = null;

  /** @type {string|null} Current course ID being tracked */
  let currentCourseId = null;

  // ---------------------------------------------------------------------------
  // React Fiber helpers — read course data from component state
  // ---------------------------------------------------------------------------

  /**
   * Find the React Fiber key on a DOM element.
   * Results are cached per element so subsequent scans are O(1).
   * @param {Element} el
   * @returns {string|null}
   */
  function findFiberKey(el) {
    if (cachedFiberContainer === el && cachedFiberKey) return cachedFiberKey;

    cachedFiberKey = Object.keys(el).find(k =>
      k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'),
    ) || null;

    if (cachedFiberKey) cachedFiberContainer = el;
    return cachedFiberKey;
  }

  /**
   * Check whether a value looks like the course data array we want.
   * The course data is an array of chapter objects, each having `children`
   * (an array of lesson objects), and lessons have `studyRate`, `studyStatus`.
   *
   * @param {*} obj
   * @returns {boolean}
   */
  function isCourseData(obj) {
    if (!Array.isArray(obj) || obj.length === 0) return false;
    // First item should be a chapter: has name, children array, chapterType
    const first = obj[0];
    if (!first || typeof first !== 'object') return false;
    if (first.$$typeof || first.stateNode) return false;              // React internal
    if (typeof first.name !== 'string') return false;
    if (!Array.isArray(first.children)) return false;
    // Check that at least one child has studyRate/studyStatus
    if (first.children.length > 0) {
      const child = first.children[0];
      if (typeof child !== 'object' || child === null) return false;
      return typeof child.studyRate === 'number' && typeof child.studyStatus === 'number';
    }
    // Chapter with no children is still valid if it has chapterType
    return typeof first.chapterType === 'number';
  }

  /**
   * Walk up the React Fiber tree from a DOM element, searching component
   * memoizedState chains for the course data array.
   *
   * @param {Element} container - DOM element to start from
   * @returns {Array|null} The course data array, or null if not found
   */
  function readCourseDataFromReact(container) {
    const fiberKey = findFiberKey(container);
    if (!fiberKey) return null;

    let fiber = container[fiberKey];

    while (fiber) {
      let hook = fiber.memoizedState;
      while (hook) {
        const val = hook.memoizedState;
        if (val) {
          // Direct match: the hook state IS the course array
          if (isCourseData(val)) return val;

          // Nested match: hook state is an object containing the array
          if (typeof val === 'object' && !Array.isArray(val)) {
            for (const key of Object.keys(val)) {
              if (Object.prototype.hasOwnProperty.call(val, key) && isCourseData(val[key])) {
                return val[key];
              }
            }
          }
        }
        hook = hook.next;
      }
      fiber = fiber.return;
    }
    return null;
  }

  /**
   * Try to find and cache the course data from React state.
   * Returns cached copy if available; re-scans if not found yet.
   * @returns {Array|null}
   */
  function getCourseData() {
    if (cachedCourseData) return cachedCourseData;

    const container = document.querySelector(SELECTORS.COLLAPSE_CONTAINER)
      || document.querySelector(SELECTORS.LIST_CONTAINER);

    if (!container) return null;

    cachedCourseData = readCourseDataFromReact(container);
    if (cachedCourseData) {
      info(`Course: read ${cachedCourseData.length} chapters from React state`);
    }
    return cachedCourseData;
  }

  /**
   * Invalidate the cached course data and fiber references so the next call re-scans.
   */
  function invalidateCourseCache() {
    cachedCourseData = null;
    cachedFiberContainer = null;
    cachedFiberKey = null;
  }

  // ---------------------------------------------------------------------------
  // Progress helpers
  // ---------------------------------------------------------------------------

  /**
   * Compute progress stats from the React course data.
   *
   * Two-level progress model:
   *   本章 = lessons completed (studyStatus 3) / total lessons in the CURRENT chapter
   *   总   = all lessons completed / all lessons across every chapter
   *
   * In-progress lessons (studyStatus 2) are NOT counted as "done" for either bar
   * — only fully-completed (studyStatus 3) count.
   *
   * @returns {{
   *   chapterCount: number,
   *   totalLessons: number,
   *   completedLessons: number,
   *   completedChapters: number,
   *   currentChapter: string,
   *   currentName: string,
   *   currentPct: number,
   *   curChapLessons: number,
   *   curChapDone: number,
   *   remainingMinutes: number,
   *   courseId: string,
   *   courseName: string
   * }}
   */
  function parseCourseProgress() {
    const chapters = getCourseData();
    const result = {
      chapterCount: 0,
      totalLessons: 0,
      completedLessons: 0,
      completedChapters: 0,
      currentChapter: '',
      currentName: '',
      currentPct: 0,
      curChapLessons: 0,      // total lessons in the current chapter
      curChapDone: 0,         // completed (studyStatus 3) in the current chapter
      remainingMinutes: 0,
      courseId: '',
      courseName: '',
    };

    if (!chapters) return result;

    // ---- First pass: compute overall stats, find in-progress lesson ----
    for (const chapter of chapters) {
      if (chapter.chapterType !== 0) continue;

      result.chapterCount++;
      const lessons = (chapter.children || []).filter(l => l.chapterType === 1);

      for (const lesson of lessons) {
        result.totalLessons++;

        if (lesson.studyStatus === 3) {
          result.completedLessons++;
        } else {
          // Unfinished — accumulate remaining time
          const dur = lesson.duration || 0;
          const rate = lesson.studyRate || 0;
          result.remainingMinutes += Math.round(dur * (1 - rate / 100) / 60);
        }

        // Track the first studyStatus=2 lesson as "current"
        if (lesson.studyStatus === 2 && !result.currentName) {
          result.currentChapter = chapter.name || '';
          result.currentName = lesson.name || '';
          result.currentPct = Math.round(lesson.studyRate || 0);
        }
      }
    }

    // ---- Second pass: fill curChapLessons/curChapDone for the current chapter ----
    if (result.currentChapter && chapters.length > 0) {
      const curChap = chapters.find(
        c => c.chapterType === 0 && c.name === result.currentChapter,
      );
      if (curChap) {
        const curLessons = (curChap.children || []).filter(l => l.chapterType === 1);
        result.curChapLessons = curLessons.length;
        result.curChapDone = curLessons.filter(l => l.studyStatus === 3).length;
      }
    }

    // ---- Third pass: compute completed chapters count ----
    result.completedChapters = chapters.filter(chapter => {
      if (chapter.chapterType !== 0) return false;
      const lessons = (chapter.children || []).filter(l => l.chapterType === 1);
      return lessons.length > 0 && lessons.every(l => l.studyStatus === 3);
    }).length;

    // ---- Extract course identification info ----
    // Create a stable course ID from URL pathname
    // Prioritize extracting numeric course ID from URL (e.g., /course/12345)
    const pathname = window.location.pathname;
    const urlMatch = pathname.match(/\/(?:course|study|learn|class)\/(\d+)/i);
    result.courseId = urlMatch ? `course-${urlMatch[1]}` : pathname;

    // For course name: check if we've already cached a name for this courseId
    // (prevents name drift when document.title changes dynamically)
    const progressData = getProgressData();
    const existingCourse = progressData?.courses?.[result.courseId];
    if (existingCourse && existingCourse.name) {
      result.courseName = existingCourse.name;
    } else {
      // First time seeing this course — extract name from document title
      let title = document.title || '百分网在线学习';
      title = title.replace(/\s*[-–—]\s*(百分网|在线学习|正在学习).*$/, '').trim();

      // Fallback to first chapter name if title cleanup resulted in empty string
      const firstChapterName = chapters.length > 0 && chapters[0].chapterType === 0
        ? chapters[0].name
        : '';
      result.courseName = title || firstChapterName || '百分网在线学习';
    }

    // ---- Fallback: no in-progress lesson found.  Use the first chapter that
    //      still has unfinished lessons as the "current" one. ----
    if (!result.currentName && chapters.length > 0) {
      for (const chapter of chapters) {
        if (chapter.chapterType !== 0) continue;
        const lessons = (chapter.children || []).filter(l => l.chapterType === 1);
        const allDone = lessons.every(l => l.studyStatus === 3);
        if (!allDone && lessons.length > 0) {
          result.currentChapter = chapter.name || '';
          result.currentName = lessons.find(l => l.studyStatus !== 3)?.name || lessons[0].name || '';
          result.curChapLessons = lessons.length;
          result.curChapDone = lessons.filter(l => l.studyStatus === 3).length;
          break;
        }
      }
    }

    return result;
  }

  /**
   * Get current video playback info from the <video> element.
   * @returns {{ currentTime: number, duration: number, progress: number, paused: boolean, ended: boolean }}
   */
  function getVideoInfo() {
    const v = videoEl || document.querySelector('#player_html5_api, #player video');
    if (!v || v.tagName !== 'VIDEO') return { currentTime: 0, duration: 0, progress: 0, paused: true, ended: false };

    const duration = v.duration || 0;
    const currentTime = v.currentTime || 0;
    const progress = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;

    return {
      currentTime,
      duration,
      progress,
      paused: v.paused,
      ended: v.ended,
    };
  }

  // ---------------------------------------------------------------------------
  // Auto-play logic (only runs when autoCourse is ON)
  // ---------------------------------------------------------------------------

  /**
   * Attempt to click the play button.
   * @returns {boolean} true if the button was found and clicked
   */
  function tryClickPlay() {
    const btn = document.querySelector(SELECTORS.PLAY_BTN);
    if (!btn) return false;

    try {
      btn.click();
      info('Course: auto-clicked play button');
      appendLog('已自动开始播放课程视频');
      return true;
    } catch (e) {
      warn('Course: failed to click play button:', e);
      return false;
    }
  }

  /**
   * Start retrying the play button click until success or max retries.
   */
  function startPlayRetry() {
    // Clear any existing timer to prevent orphaned timeouts when re-entered
    // (e.g. if the UI checkbox fires onChange during init while already running)
    if (playRetryTimer) {
      clearTimeout(playRetryTimer);
      playRetryTimer = 0;
    }

    let attempts = 0;
    const maxRetries = COURSE_CONFIG.PLAY_MAX_RETRIES;

    function scheduleNext() {
      if (!running || !getSetting('autoCourse', false)) {
        playRetryTimer = 0;
        return;
      }
      if (videoEl && !videoEl.paused) {
        playRetryTimer = 0;
        return;
      }

      attempts++;
      if (tryClickPlay()) {
        playRetryTimer = 0;
        resumeAttempts = 0;
        return;
      }

      if (attempts >= maxRetries) {
        playRetryTimer = 0;
        debug(`Course: play button not found after ${maxRetries} retries`);
        return;
      }

      // Recursive setTimeout with per-tick jitter — avoids the fixed-interval
      // fingerprint of setInterval.
      playRetryTimer = setTimeout(scheduleNext, jitterMs(COURSE_CONFIG.PLAY_RETRY_DELAY_MS, 0.3));
    }

    // First attempt after initial delay (also jittered)
    playRetryTimer = setTimeout(scheduleNext, jitterMs(COURSE_CONFIG.PLAY_CLICK_DELAY_MS, 0.4));
  }

  // ---------------------------------------------------------------------------
  // Stuck-video detection and auto-resume
  // ---------------------------------------------------------------------------

  /**
   * Schedule a check for stuck video playback.
   * If the video is paused (not ended) for longer than STUCK_THRESHOLD_S, auto-resume.
   */
  function scheduleStuckCheck() {
    clearTimeout(stuckTimer);

    if (!running || !getSetting('autoCourse', false)) return;
    if (!videoEl || videoEl.ended) return;

    stuckTimer = setTimeout(() => {
      if (!running || !getSetting('autoCourse', false)) return;
      if (!videoEl) return;

      if (videoEl.paused && !videoEl.ended) {
        if (resumeAttempts >= COURSE_CONFIG.MAX_RESUME_ATTEMPTS) {
          warn('Course: max resume attempts reached, giving up');
          appendLog('视频自动恢复失败，请手动播放');
          return;
        }

        resumeAttempts++;
        warn(`Course: video stuck, auto-resuming (attempt ${resumeAttempts}/${COURSE_CONFIG.MAX_RESUME_ATTEMPTS})`);
        appendLog(`视频暂停超过 ${COURSE_CONFIG.STUCK_THRESHOLD_S} 秒，自动恢复播放 (${resumeAttempts}/${COURSE_CONFIG.MAX_RESUME_ATTEMPTS})`);

        try {
          videoEl.play();
        } catch (e) {
          warn('Course: auto-resume play() failed:', e);
        }
      }

      // Re-schedule for continuous stuck monitoring
      scheduleStuckCheck();
    }, jitterMsFloor(COURSE_CONFIG.STUCK_THRESHOLD_S * 1000, 0.25));
  }

  // ---------------------------------------------------------------------------
  // UI update helper
  // ---------------------------------------------------------------------------

  /**
   * Push current course progress and video info to the UI.
   * Also updates the current progress tracking session.
   */
  function pushProgress() {
    const courseProgress = parseCourseProgress();
    const videoInfo = getVideoInfo();

    updateCourseProgress({
      ...courseProgress,
      videoProgress: videoInfo.progress,
      videoPaused: videoInfo.paused,
      autoCourseEnabled: getSetting('autoCourse', false),
    });

    // Update progress tracker with current lesson/chapter counts
    if (currentSessionId && courseProgress.totalLessons > 0) {
      updateSession(courseProgress.completedChapters, courseProgress.completedLessons, courseProgress.totalLessons);
    }
  }

  // ---------------------------------------------------------------------------
  // Video event handlers
  // ---------------------------------------------------------------------------

  function onTimeUpdate() {
    if (!videoEl) return;
    pushProgress();
  }

  function onVideoPlay() {
    resumeAttempts = 0;
    scheduleStuckCheck();
    pushProgress();
  }

  function onVideoPause() {
    if (!running) return;
    scheduleStuckCheck();
  }

  function onVideoEnded() {
    clearTimeout(stuckTimer);
    const courseProgress = parseCourseProgress();
    appendLog(`视频播放完成 (${courseProgress.currentName || '当前课程'})`);
    info(`Course: video ended — ${courseProgress.currentName}`);

    updateCourseProgress({
      ...courseProgress,
      videoProgress: 100,
      videoPaused: false,
      autoCourseEnabled: getSetting('autoCourse', false),
    });

    // Re-invalidate cache — platform may navigate to next lesson
    invalidateCourseCache();
  }

  // ---------------------------------------------------------------------------
  // Directory monitoring
  // ---------------------------------------------------------------------------

  /**
   * Start observing the course directory for changes (collapse/expand, navigation).
   * Re-checks React state on mutation (may capture data refreshes).
   */
  function startDirectoryObserver() {
    if (dirObserver) return;

    const listContainer = document.querySelector(SELECTORS.LIST_OBSERVE);
    if (!listContainer) {
      debug('Course: directory container not found, skipping observer');
      return;
    }

    dirObserver = new MutationObserver(() => {
      invalidateCourseCache();
      pushProgress();
    });

    dirObserver.observe(listContainer, { childList: true, subtree: true, attributes: true });
    dirObservedEl = listContainer;
    debug('Course: directory observer started');
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  /**
   * Cache the video element and bind event listeners.
   * Aliplayer wraps the <video> inside #player div; actual element is #player_html5_api.
   *
   * If another element was previously tracked, its listeners are removed first
   * so that orphaned listeners don't prevent GC of detached DOM nodes after
   * SPA navigation.
   *
   * @returns {HTMLVideoElement|null}
   */
  function initVideoMonitor() {
    // If we already have a video element that is still in the DOM, reuse it
    if (videoEl && document.contains(videoEl)) return videoEl;

    // Old element is gone — remove listeners before dropping the reference
    if (videoEl) {
      unbindVideoListeners(videoEl);
      videoEl = null;
    }

    // Try actual video selectors first; fall back to any <video>
    videoEl = document.querySelector('#player_html5_api, #player video, #playerHtml5_api');
    if (!videoEl) {
      debug('Course: video element not found (will retry)');
      return null;
    }

    if (videoEl.tagName !== 'VIDEO') {
      debug('Course: matched element is not <video>, skipping event bind');
      videoEl = null;
      return null;
    }

    videoEl.addEventListener('timeupdate', onTimeUpdate);
    videoEl.addEventListener('play', onVideoPlay);
    videoEl.addEventListener('pause', onVideoPause);
    videoEl.addEventListener('ended', onVideoEnded);

    debug('Course: video event listeners bound');
    return videoEl;
  }

  /**
   * Remove bound event listeners from a video element.
   * Called before dropping the reference after SPA navigation replaces the
   * element, so the old (detached) node can be garbage-collected.
   * @param {HTMLVideoElement} el
   */
  function unbindVideoListeners(el) {
    el.removeEventListener('timeupdate', onTimeUpdate);
    el.removeEventListener('play', onVideoPlay);
    el.removeEventListener('pause', onVideoPause);
    el.removeEventListener('ended', onVideoEnded);
    debug('Course: video event listeners unbound');
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Start the course monitor.
   * Always monitors progress; only auto-plays when autoCourse setting is ON.
   */
  function startCourseMonitor() {
    if (running) return;

    running = true;
    info('Course monitor started');
    appendLog('课程监控已启动');

    // Pre-load course data from React state
    getCourseData();

    // Initialize progress tracking session
    // Extract stable course ID and name from parsed progress
    const courseProgress = parseCourseProgress();
    currentCourseId = courseProgress.courseId || `course-${Date.now()}`;
    const courseName = courseProgress.courseName || '百分网在线学习';
    currentSessionId = startSession(currentCourseId, courseName);

    debug(`Course monitor: tracking session ${currentSessionId} for "${courseName}" (id: ${currentCourseId})`);

    // Bind video events
    initVideoMonitor();

    // Start directory observer
    startDirectoryObserver();

    // Periodic progress update (recursive setTimeout with per-tick jitter —
    // avoids the fixed-interval fingerprint of setInterval).
    function scheduleProgress() {
      if (!running) return;

      // Catch SPA navigation: if video element was replaced, rebind
      if (!videoEl || !document.contains(videoEl)) {
        invalidateCourseCache();
        initVideoMonitor();
      }

      // Catch SPA navigation: if the directory list container was replaced
      // (e.g. after switching courses in the sidebar), the old MutationObserver
      // is silently detached from the DOM and stops firing.  Detect that and
      // re-establish the observer + invalidate the React fiber cache so
      // pushProgress() below re-reads fresh course data.
      if (dirObserver && dirObservedEl && !document.contains(dirObservedEl)) {
        dirObserver.disconnect();
        dirObserver = null;
        dirObservedEl = null;
        invalidateCourseCache();
      }
      // Also handle the case where the observer was never started (e.g. element
      // wasn't present at init but appeared after navigation)
      if (!dirObserver) {
        startDirectoryObserver();
      }

      pushProgress();

      // Schedule next tick with jitter
      progressInterval = setTimeout(scheduleProgress, jitterMs(COURSE_CONFIG.PROGRESS_UPDATE_INTERVAL_MS, 0.2));
    }

    // Kick off the first tick after an initial short delay
    progressInterval = setTimeout(scheduleProgress, jitterMs(COURSE_CONFIG.PROGRESS_UPDATE_INTERVAL_MS, 0.2));

    // Auto-play if enabled
    if (getSetting('autoCourse', false)) {
      startPlayRetry();
      setStatus(true, '运行中 — 自动刷课已启用');
    }

    // Initial progress push
    pushProgress();
  }

  /**
   * Stop the course monitor.
   * Cleans up observers, timers, and event listeners.
   */
  async function stopCourseMonitor() {
    if (!running) return;

    running = false;

    clearTimeout(progressInterval);
    progressInterval = 0;
    clearTimeout(playRetryTimer);
    playRetryTimer = 0;
    clearTimeout(stuckTimer);
    stuckTimer = 0;

    if (dirObserver) {
      dirObserver.disconnect();
      dirObserver = null;
      dirObservedEl = null;
    }

    if (videoEl) {
      videoEl.removeEventListener('timeupdate', onTimeUpdate);
      videoEl.removeEventListener('play', onVideoPlay);
      videoEl.removeEventListener('pause', onVideoPause);
      videoEl.removeEventListener('ended', onVideoEnded);
      videoEl = null;
    }

    resumeAttempts = 0;
    invalidateCourseCache();

    // End the current progress tracking session
    if (currentSessionId) {
      try {
        await endSession();
        debug('Course monitor: progress session ended successfully');
      } catch (e) {
        warn('Course monitor: failed to end progress session:', e);
      }
      currentSessionId = null;
      currentCourseId = null;
    }

    info('Course monitor stopped');
    appendLog('课程监控已停止');
  }

  // ---------------------------------------------------------------------------
  // Settings listener — react to toggle changes from the UI panel
  // ---------------------------------------------------------------------------

  onChange('autoCourse', (enabled) => {
    if (enabled) {
      if (!running) {
        startCourseMonitor();
      } else {
        startPlayRetry();
        setStatus(true, '运行中 — 自动刷课已启用');
        appendLog('自动刷课已启用');
      }
    } else {
      if (running) {
        clearTimeout(playRetryTimer);
        playRetryTimer = 0;
        clearTimeout(stuckTimer);
        stuckTimer = 0;
        resumeAttempts = 0;

        setStatus(true, '运行中 — 课程监控 (自动刷课已关闭)');
        appendLog('自动刷课已关闭 — 仅监控进度');
      }
    }
  });

  /**
   * @file Main entry point for baifenwang-auto-study userscript.
   * Bootstraps interceptors, auto-processor, UI, and image pool.
   */


  /**
   * Initialize the userscript.
   * Interceptors are installed immediately (run-at: document-start).
   * UI, auto-processor, and image pool are deferred until DOM is ready.
   *
   * Each subsystem is wrapped in try-catch so one failure doesn't block
   * the rest.  Errors are surfaced in both the console and the UI log panel
   * (once the UI is mounted).
   */
  function bootstrap() {
    info(`${SCRIPT_NAME} v${SCRIPT_VERSION} starting…`);

    // ---- Phase 1: install interceptors immediately (before page scripts run) ----

    try { installVideoInterceptor(); } catch (e) {
      error('Video interceptor install failed:', e);
    }

    try { initVideoOverlay(); } catch (e) {
      error('Video overlay init failed:', e);
    }

    try { installVisibilityInterceptor(); } catch (e) {
      error('Visibility interceptor install failed:', e);
    }

    // ---- Phase 2: DOM-dependent components (deferred to ready) ----

    async function mountUI() {
      let uiReady = false;
      const fail = (msg) => {
        warn(msg);
        if (uiReady) appendLog(msg);
        else setTimeout(() => appendLog(msg), 0); // queue for after UI is built
      };

      // 2a. Persisted settings
      try {
        await loadSettings();
      } catch (e) {
        fail(`Settings load failed: ${e?.message || e}`);
        error('Settings load failed:', e);
      }

      // 2a1. Progress tracker (learning history)
      try {
        await loadProgressTracker();
        debug('Progress tracker loaded successfully');
      } catch (e) {
        // Non-fatal — stats panel will show empty data if this fails
        warn('Progress tracker init failed (non-fatal):', e);
      }

      // 2a2. Visibility interceptor — must run after settings load
      try {
        initVisibilityInterceptorSettings();
      } catch (e) {
        debug('Visibility interceptor init failed:', e);
      }

      // 2b. Image pool
      try {
        await initPool();
      } catch (e) {
        fail(`Image pool init failed: ${e?.message || e}`);
        error('Image pool init failed:', e);
        // Non-fatal — the pool will stay empty and the interceptor will fall
        // back to the real camera when it can't pick an image.
      }

      // 2c. Build UI panel (must succeed — otherwise we can't show any feedback)
      try {
        buildUI();
        uiReady = true;
        appendLog('UI面板已挂载');
      } catch (e) {
        error('UI build failed — no panel visible:', e);
        // Can't show UI — log to console only.  Interceptors are already
        // installed so the core bypass still works silently.
        return;
      }

      // 2d. Auto-processor
      try {
        startAutoProcessor();
      } catch (e) {
        appendLog(`人脸验证处理器启动失败: ${e?.message || e}`);
        error('Auto-processor start failed:', e);
      }

      // 2e. Course monitor
      try {
        startCourseMonitor();
      } catch (e) {
        appendLog(`课程监控启动失败: ${e?.message || e}`);
        error('Course monitor start failed:', e);
      }

      appendLog('所有系统就绪');
      info('Initialization complete');
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountUI);
    } else {
      mountUI();
    }

    // ---- Phase 3: register cleanup hooks for session tracking ----

    // End active session when user leaves/refreshes the page
    window.addEventListener('beforeunload', () => {
      try {
        // stopCourseMonitor is async but beforeunload handlers should not be async
        // Just call endSession synchronously (best-effort save)
        stopCourseMonitor();
      } catch (e) {
        // Swallow errors in beforeunload to avoid blocking navigation
        error('Failed to stop course monitor on page unload:', e);
      }
    });
  }

  bootstrap();

})();
