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

import { debug, warn } from './logger.js';

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
export function getStorageAdapter() {
  if (_adapter) return _adapter;

  // 1. localStorage
  _adapter = detectLocalStorage();
  if (_adapter) { debug('Storage: using localStorage adapter'); return _adapter; }

  // 2. In-memory fallback
  warn('Storage: no persistent backend available, using in-memory (session-only)');
  _adapter = createMemoryAdapter();
  return _adapter;
}
