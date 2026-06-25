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

import { SCRIPT_VERSION, UPDATE_API_URL } from '../config.js';
import * as logger from './logger.js';
import { getStorageAdapter } from './storage-adapter.js';

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
export function invalidateUpdateCache() {
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
export function checkForUpdate(onResult, { force = false, delay = CHECK_DELAY_MS, onError } = {}) {
  setTimeout(async () => {
    if (!force) {
      const cached = await readCache();
      if (cached) {
        logger.debug('[update] serving from cache:', cached.latestVersion);
        onResult(cached);
        return;
      }
    }

    try {
      const result = await fetchUpdateInfo();
      await writeCache(result);
      logger.debug('[update] fetched:', result.latestVersion, 'hasUpdate:', result.hasUpdate);
      onResult(result);
    } catch (err) {
      logger.debug('[update] check failed:', err?.message);
      onError?.();
    }
  }, delay);
}
