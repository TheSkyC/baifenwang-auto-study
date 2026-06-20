/**
 * @file Settings state — centralized toggleable configuration for the userscript.
 *
 * Settings are persisted across page reloads via utils/storage-adapter.js.
 * On load, persisted values are merged over defaults; on every change the
 * full state is flushed to storage.
 *
 * Reserved for future expansion: auto-course (自动刷课) settings group.
 */

import { SETTINGS_KEY } from './config.js';
import { info, debug, warn } from './utils/logger.js';
import { getStorageAdapter } from './utils/storage-adapter.js';

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
let loaded = false;

/**
 * Load persisted settings from storage and merge over defaults.
 * Called once during initialization; safe to call multiple times (idempotent).
 */
export async function loadSettings() {
  if (loaded) return;

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

  loaded = true;
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
export function getSetting(key, fallback) {
  // Fast path: settings already loaded
  if (loaded) {
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
export function setSetting(key, value) {
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
export function onChange(key, fn) {
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
export function isFaceAutoActive() {
  return state.faceAutoClick;
}