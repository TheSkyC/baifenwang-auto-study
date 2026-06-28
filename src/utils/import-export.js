/**
 * @file Import/Export — ZIP-based backup and restore for all userscript data.
 *
 * Data categories:
 *   1. Settings       — 6 boolean toggles (~200 bytes JSON)
 *   2. Learning progress — sessions + courses history (~50 KB JSON)
 *   3. Image pool     — cropped/original JPEGs + meta + stats (up to ~7 MB)
 *
 * ZIP layout:
 *   manifest.json          — formatVersion, exportedAt, scriptVersion, section summaries
 *   settings.json          — { faceAutoClick, videoReplace, ... }
 *   progress.json          — { version, sessions[], courses{}, lastSync }
 *   pool-meta.json         — { version, nextId, entries[] }
 *   pool-stats.json        — { [id]: ImageStats }
 *   images/
 *     {id}_cropped.jpg     — raw JPEG binary (STORE, no re-compression)
 *     {id}_original.jpg    — raw JPEG binary (optional)
 *
 * All ZIP entries use STORE (no compression) — JPEG is already compressed.
 */

import JSZip from 'jszip';
import { SCRIPT_VERSION, PROGRESS_TRACKER_KEY, IMAGE_POOL_CONFIG, IMPORT_EXPORT_CONFIG } from '../config.js';
import { getSetting, setSetting } from '../settings.js';
import { getProgressData, clearAllProgress, reloadProgress } from '../utils/progress-tracker.js';
import {
  listEntries, getImageData, getOriginalImageData,
  getAllStats, clearPool,
  reloadPool,
} from '../pool/image-pool.js';
import { getStorageAdapter } from '../utils/storage-adapter.js';
import { debug, warn } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Constants (re-exported from config for convenience)
// ---------------------------------------------------------------------------

/** Current backup format version. */
export const FORMAT_VERSION = IMPORT_EXPORT_CONFIG.FORMAT_VERSION;

/** Estimated average cropped JPEG size for file-size prediction (bytes). */
const EST_CROPPED_JPEG_SIZE = IMPORT_EXPORT_CONFIG.EST_CROPPED_JPEG_SIZE;
/** Estimated average original JPEG size for file-size prediction (bytes). */
const EST_ORIG_JPEG_SIZE = IMPORT_EXPORT_CONFIG.EST_ORIG_JPEG_SIZE;
/** Per-image JSON overhead in pool-meta.json + pool-stats.json (bytes). */
const EST_PER_IMAGE_JSON = IMPORT_EXPORT_CONFIG.EST_PER_IMAGE_JSON;

// ---------------------------------------------------------------------------
// Data URI ↔ Blob conversion
// ---------------------------------------------------------------------------

/**
 * Convert a base64 data URI to a Blob (raw binary).
 * Preserves the original MIME type.
 * @param {string} dataUri
 * @returns {Blob}
 */
function dataURIToBlob(dataUri) {
  const commaIdx = dataUri.indexOf(',');
  const header = dataUri.slice(0, commaIdx);
  const mime = (header.match(/:(.*?);/) || ['', 'image/jpeg'])[1];
  const bytes = atob(dataUri.slice(commaIdx + 1));
  const buf = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * Compute estimated export size per section for UI preview.
 * @param {{ settings: boolean, progress: boolean, imagePool: boolean }} sections
 * @returns {{ settings: number, progress: number, imagePool: number, total: number }}
 */
export function estimateExportSize(sections) {
  let settings = 0;
  let progress = 0;
  let imagePool = 0;

  if (sections.settings) {
    settings = 300; // ~200 bytes JSON + manifest overhead
  }

  if (sections.progress) {
    const data = getProgressData();
    const sessions = (data.sessions || []).length;
    const courses = Object.keys(data.courses || {}).length;
    progress = 500 + sessions * 200 + courses * 300; // rough estimate
  }

  if (sections.imagePool) {
    const entries = listEntries();
    const count = entries.length;
    imagePool = count * (EST_CROPPED_JPEG_SIZE + EST_ORIG_JPEG_SIZE + EST_PER_IMAGE_JSON) + 1000;
  }

  const total = settings + progress + imagePool;
  return { settings, progress, imagePool, total };
}

/**
 * Format a byte count into a human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Build a backup ZIP blob from the selected data categories.
 *
 * @param {{ settings: boolean, progress: boolean, imagePool: boolean }} sections
 * @param {(phase: string, pct: number, detail?: string) => void} [onProgress]
 *        phase: 'settings' | 'progress' | 'imagePool' | 'done'
 * @returns {Promise<Blob>}
 */
export async function buildBackupBlob(sections, onProgress) {
  const zip = new JSZip();
  const selectedCount = (sections.settings ? 1 : 0) + (sections.progress ? 1 : 0) + (sections.imagePool ? 1 : 0);
  if (selectedCount === 0) throw new Error('No sections selected for export');

  let phaseWeight = 0;
  const phaseBase = (() => {
    const w = [];
    if (sections.settings) w.push(1);
    if (sections.progress) w.push(1);
    if (sections.imagePool) w.push(3); // image pool is the heavy part
    return w;
  })();

  const totalWeight = phaseBase.reduce((a, b) => a + b, 0);

  /** @type {{ settings?: Object, progress?: Object, imagePool?: Object }} */
  const manifestSections = {};

  // ---- Phase 1: Settings ----
  if (sections.settings) {
    onProgress?.('settings', 0, '正在导出设置...');
    const settings = {
      faceAutoClick: getSetting('faceAutoClick', true),
      videoReplace: getSetting('videoReplace', true),
      autoCompare: getSetting('autoCompare', true),
      autoCourse: getSetting('autoCourse', false),
      disableVisibilityCheck: getSetting('disableVisibilityCheck', false),
      dynamicWeight: getSetting('dynamicWeight', true),
    };
    zip.file('settings.json', JSON.stringify(settings));
    manifestSections.settings = { count: 6 };
    onProgress?.('settings', 100, '设置已导出');
  }

  // ---- Phase 2: Learning progress ----
  if (sections.progress) {
    onProgress?.('progress', 0, '正在导出学习进度...');
    const progress = getProgressData();
    zip.file('progress.json', JSON.stringify(progress));
    manifestSections.progress = {
      sessions: (progress.sessions || []).length,
      courses: Object.keys(progress.courses || {}).length,
    };
    onProgress?.('progress', 100, '学习进度已导出');
  }

  // ---- Phase 3: Image pool ----
  if (sections.imagePool) {
    onProgress?.('imagePool', 0, '正在导出图片池...');

    const entries = listEntries();
    const count = entries.length;
    const imgFolder = zip.folder('images');

    let exportedCount = 0;
    for (const entry of entries) {
      // Cropped image (always present)
      const cropped = await getImageData(entry.id);
      if (cropped) {
        imgFolder.file(`${entry.id}_cropped.jpg`, dataURIToBlob(cropped));
      }

      // Original image (optional — only if crop editing is available)
      const orig = await getOriginalImageData(entry.id);
      if (orig && entry.cropParams) {
        imgFolder.file(`${entry.id}_original.jpg`, dataURIToBlob(orig));
      }

      exportedCount++;
      onProgress?.('imagePool',
        Math.round(exportedCount / count * 100),
        `正在导出图片 (${exportedCount}/${count})...`,
      );
    }

    // Pool metadata (without dataUrl — images are separate files)
    const poolMeta = {
      version: 1,
      nextId: entries.length > 0 ? entries.reduce((max, e) => Math.max(max, e.id), 0) + 1 : 0,
      entries: entries.map(e => ({
        id: e.id,
        name: e.name,
        hash: e.hash,
        size: e.size,
        width: e.width,
        height: e.height,
        addedAt: e.addedAt,
        cropParams: e.cropParams,
        origWidth: e.origWidth,
        origHeight: e.origHeight,
      })),
    };
    zip.file('pool-meta.json', JSON.stringify(poolMeta));

    // Pool stats
    const poolStats = getAllStats();
    zip.file('pool-stats.json', JSON.stringify(poolStats));

    manifestSections.imagePool = {
      count,
      withOriginals: entries.filter(e => e.cropParams).length,
    };
    onProgress?.('imagePool', 100, '图片池已导出');
  }

  // ---- Manifest ----
  const manifest = {
    formatVersion: FORMAT_VERSION,
    exportedAt: Date.now(),
    scriptVersion: SCRIPT_VERSION,
    sections: manifestSections,
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // ---- Generate ZIP blob (STORE = no re-compression) ----
  onProgress?.('done', 0, '正在打包...');
  const blob = await zip.generateAsync(
    { type: 'blob', compression: 'STORE' },
    (meta) => {
      onProgress?.('done', meta.percent, '正在打包...');
    },
  );
  onProgress?.('done', 100, '导出完成');

  return blob;
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/**
 * Validate a backup manifest object.
 * @param {Object} manifest
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object') {
    errors.push('manifest.json 缺失或格式无效');
    return { valid: false, errors };
  }
  if (typeof manifest.formatVersion !== 'number') {
    errors.push('缺少 formatVersion 字段');
  } else if (manifest.formatVersion > FORMAT_VERSION) {
    errors.push(`备份格式版本 (v${manifest.formatVersion}) 高于当前支持 (v${FORMAT_VERSION})，请更新脚本`);
  }
  if (manifest.formatVersion < 1) {
    errors.push(`不支持的备份格式版本: ${manifest.formatVersion}`);
  }
  if (!manifest.sections || typeof manifest.sections !== 'object') {
    errors.push('缺少 sections 字段');
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Parse a backup file, validate structure, and return manifest + ZIP reference.
 *
 * @param {File} file - The .zip backup file
 * @returns {Promise<{ manifest: Object, zip: JSZip, errors: string[], valid: boolean }>}
 */
export async function parseBackupFile(file) {
  const errors = [];

  // Basic file type check
  if (!file.name.endsWith('.zip') && file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed') {
    // Be lenient — some browsers / OSes don't set MIME correctly
    debug(`Backup file MIME: "${file.type}", name: "${file.name}" — attempting to parse anyway`);
  }

  /** @type {JSZip} */
  let zip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch (e) {
    errors.push('无法解析备份文件 — 文件可能已损坏或不是有效的 ZIP 格式');
    return { manifest: null, zip: null, errors, valid: false };
  }

  // Check for manifest.json
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    errors.push('备份文件中缺少 manifest.json');
    return { manifest: null, zip: null, errors, valid: false };
  }

  /** @type {Object} */
  let manifest;
  try {
    const text = await manifestFile.async('text');
    manifest = JSON.parse(text);
  } catch (e) {
    errors.push('manifest.json 解析失败');
    return { manifest: null, zip: null, errors, valid: false };
  }

  const { valid, errors: validationErrors } = validateManifest(manifest);
  errors.push(...validationErrors);

  // Check for expected section files
  if (manifest.sections) {
    if (manifest.sections.settings && !zip.file('settings.json')) {
      errors.push('manifest 声明包含设置数据但 settings.json 缺失');
    }
    if (manifest.sections.progress && !zip.file('progress.json')) {
      errors.push('manifest 声明包含学习进度但 progress.json 缺失');
    }
    if (manifest.sections.imagePool && !zip.file('pool-meta.json')) {
      errors.push('manifest 声明包含图片池但 pool-meta.json 缺失');
    }
  }

  return { manifest, zip, errors, valid: valid && errors.length === 0 };
}

/**
 * Build a human-readable summary string from a parsed manifest.
 * @param {Object} manifest
 * @returns {string[]}
 */
export function buildSummary(manifest) {
  const lines = [];
  if (!manifest || !manifest.sections) return lines;

  if (manifest.scriptVersion) {
    lines.push(`脚本版本: v${manifest.scriptVersion}`);
  }
  if (manifest.exportedAt) {
    const d = new Date(manifest.exportedAt);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    lines.push(`导出时间: ${date} ${time}`);
  }

  const s = manifest.sections;
  if (s.settings) {
    lines.push(`设置: ${s.settings.count || '?'} 项`);
  }
  if (s.progress) {
    const parts = [];
    if (typeof s.progress.sessions === 'number') parts.push(`${s.progress.sessions} 次学习`);
    if (typeof s.progress.courses === 'number') parts.push(`${s.progress.courses} 门课程`);
    lines.push(`学习进度: ${parts.join(', ') || '有数据'}`);
  }
  if (s.imagePool) {
    const parts = [`${s.imagePool.count || 0} 张图片`];
    if (s.imagePool.withOriginals) parts.push(`${s.imagePool.withOriginals} 张含原图`);
    lines.push(`图片池: ${parts.join(', ')}`);
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Import execution
// ---------------------------------------------------------------------------

/**
 * Merge two progress objects, keeping existing data and adding incoming.
 * Sessions are deduplicated by ID. Courses merge with max-values strategy.
 *
 * @param {Object} existing
 * @param {Object} incoming
 * @returns {Object}
 */
function mergeProgress(existing, incoming) {
  const existingIds = new Set((existing.sessions || []).map(s => s.id));

  // Merge sessions: keep all existing, add incoming ones not already present
  const mergedSessions = [...(existing.sessions || [])];
  let addedSessions = 0;
  for (const sess of (incoming.sessions || [])) {
    if (!existingIds.has(sess.id)) {
      mergedSessions.push(sess);
      addedSessions++;
    }
  }

  // Merge courses: max completedCount, max lastStudy
  const mergedCourses = { ...(existing.courses || {}) };
  for (const [courseId, incomingCourse] of Object.entries(incoming.courses || {})) {
    if (mergedCourses[courseId]) {
      const ec = mergedCourses[courseId];
      const ic = /** @type {Object} */ (incomingCourse);
      // Build a new object instead of mutating the existing reference
      const ecSessions = new Set([...(ec.sessions || [])]);
      for (const sid of (ic.sessions || [])) ecSessions.add(sid);
      mergedCourses[courseId] = {
        name: ec.name || ic.name,
        totalLessons: Math.max(ec.totalLessons || 0, ic.totalLessons || 0),
        completedCount: Math.max(ec.completedCount || 0, ic.completedCount || 0),
        lastStudy: Math.max(ec.lastStudy || 0, ic.lastStudy || 0),
        firstStudy: ec.firstStudy || ic.firstStudy || Date.now(),
        sessions: [...ecSessions],
      };
    } else {
      mergedCourses[courseId] = { ...ic };
    }
  }

  debug(`Progress merge: ${addedSessions} new sessions added, ${Object.keys(mergedCourses).length} total courses`);

  return {
    version: existing.version || incoming.version || 1,
    sessions: mergedSessions,
    courses: mergedCourses,
    lastSync: Date.now(),
  };
}

/**
 * Execute the actual import of data from a parsed backup ZIP.
 *
 * @param {JSZip} zip - JSZip instance from parseBackupFile()
 * @param {{ settings: boolean, progress: boolean, imagePool: boolean }} sections
 * @param {{ settings: 'replace', progress: 'replace'|'merge', imagePool: 'replace'|'merge' }} strategies
 * @param {(phase: string, pct: number, detail?: string) => void} [onProgress]
 * @returns {Promise<{ settings: { imported: number }|null, progress: { sessions: number, courses: number }|null, imagePool: { added: number, skipped: number }|null }>}
 */
export async function executeImport(zip, sections, strategies, onProgress) {
  /** @type {{ settings: any, progress: any, imagePool: any }} */
  const results = { settings: null, progress: null, imagePool: null };

  // ---- Phase 1: Settings ----
  if (sections.settings) {
    onProgress?.('settings', 0, '正在导入设置...');
    try {
      const raw = await zip.file('settings.json').async('text');
      const data = JSON.parse(raw);
      let count = 0;
      const keys = ['faceAutoClick', 'videoReplace', 'autoCompare', 'autoCourse', 'disableVisibilityCheck', 'dynamicWeight'];
      for (const key of keys) {
        if (key in data) {
          setSetting(key, data[key]);
          count++;
        }
      }
      results.settings = { imported: count };
      onProgress?.('settings', 100, `已导入 ${count} 项设置`);
    } catch (e) {
      warn('Settings import failed:', e);
      throw new Error(`设置导入失败: ${e.message}`);
    }
  }

  // ---- Phase 2: Learning progress ----
  if (sections.progress) {
    onProgress?.('progress', 0, '正在导入学习进度...');
    try {
      const raw = await zip.file('progress.json').async('text');
      const incoming = JSON.parse(raw);

      if (strategies.progress === 'replace') {
        await clearAllProgress();
        await getStorageAdapter().set(PROGRESS_TRACKER_KEY, JSON.stringify(incoming));
        results.progress = {
          sessions: (incoming.sessions || []).length,
          courses: Object.keys(incoming.courses || {}).length,
        };
      } else {
        // merge
        const existing = getProgressData();
        const merged = mergeProgress(existing, incoming);
        await getStorageAdapter().set(PROGRESS_TRACKER_KEY, JSON.stringify(merged));
        results.progress = {
          sessions: merged.sessions.length,
          courses: Object.keys(merged.courses).length,
        };
      }

      // Reload in-memory state from storage
      await reloadProgress();
      onProgress?.('progress', 100, '学习进度已导入');
    } catch (e) {
      warn('Progress import failed:', e);
      throw new Error(`学习进度导入失败: ${e.message}`);
    }
  }

  // ---- Phase 3: Image pool ----
  if (sections.imagePool) {
    onProgress?.('imagePool', 0, '正在导入图片池...');
    try {
      const poolMetaText = await zip.file('pool-meta.json').async('text');
      const incomingMeta = JSON.parse(poolMetaText);

      let poolStatsText;
      let incomingStats = {};
      const statsFile = zip.file('pool-stats.json');
      if (statsFile) {
        poolStatsText = await statsFile.async('text');
        incomingStats = JSON.parse(poolStatsText);
      }

      const incomingEntries = incomingMeta.entries || [];
      const incomingCount = incomingEntries.length;

      if (strategies.imagePool === 'replace') {
        // Clear existing pool
        await clearPool();
        const adapter = getStorageAdapter();

        /** Successfully imported entries (in order, excluding skipped). */
        const importedEntries = [];
        for (let i = 0; i < incomingCount; i++) {
          const entry = incomingEntries[i];

          // Read cropped JPEG from ZIP as base64, then build a valid data URI.
          // Using async('blob') loses the MIME type (JSZip produces
          // application/octet-stream), which causes the data:image/ prefix
          // check to fail.  async('base64') avoids this entirely.
          const croppedFile = zip.file(`images/${entry.id}_cropped.jpg`);
          if (!croppedFile) {
            warn(`Missing cropped image for entry ${entry.id}, skipping`);
            continue;
          }

          const croppedBase64 = await croppedFile.async('base64');
          const croppedDataUrl = 'data:image/jpeg;base64,' + croppedBase64;

          // Store cropped image
          const imgKey = IMAGE_POOL_CONFIG.STORAGE_KEY_PREFIX + entry.id;
          await adapter.set(imgKey, croppedDataUrl);

          // Original image (optional)
          const origFile = zip.file(`images/${entry.id}_original.jpg`);
          if (origFile) {
            try {
              const origBase64 = await origFile.async('base64');
              const origDataUrl = 'data:image/jpeg;base64,' + origBase64;
              const origKey = IMAGE_POOL_CONFIG.STORAGE_KEY_PREFIX + 'orig_' + entry.id;
              await adapter.set(origKey, origDataUrl);
            } catch (_) {
              // Original is best-effort
              debug(`No original image for entry ${entry.id}, skipping`);
            }
          }

          importedEntries.push(entry);
          onProgress?.('imagePool',
            Math.round((i + 1) / incomingCount * 100),
            `正在导入图片 (${i + 1}/${incomingCount})...`,
          );
        }

        // Persist metadata (only successfully imported entries)
        const newMeta = {
          version: 1,
          nextId: importedEntries.length > 0
            ? importedEntries.reduce((max, e) => Math.max(max, e.id), 0) + 1
            : 0,
          entries: importedEntries,
        };
        await adapter.set(IMAGE_POOL_CONFIG.META_KEY, JSON.stringify(newMeta));

        // Persist stats (filter to imported entries)
        const importedIds = new Set(importedEntries.map(e => e.id));
        const filteredStats = {};
        for (const [idStr, stat] of Object.entries(incomingStats)) {
          if (importedIds.has(Number(idStr))) {
            filteredStats[idStr] = stat;
          }
        }
        await adapter.set(IMAGE_POOL_CONFIG.STATS_KEY, JSON.stringify(filteredStats));

        // Reload in-memory pool state
        await reloadPool();

        results.imagePool = {
          added: importedEntries.length,
          skipped: incomingCount - importedEntries.length,
        };
      } else {
        // merge strategy
        const existingEntries = listEntries();
        const existingIds = new Set(existingEntries.map(e => e.id));
        const adapter = getStorageAdapter();

        // Load existing meta to get nextId
        const rawMeta = await adapter.get(IMAGE_POOL_CONFIG.META_KEY);
        const existingMeta = rawMeta ? JSON.parse(rawMeta) : { nextId: 0, entries: [] };
        let nextId = existingMeta.nextId || 0;

        const mergedEntries = [...existingMeta.entries || []];
        const mergedStats = { ...getAllStats() };

        let added = 0;
        let skipped = 0;

        for (let i = 0; i < incomingCount; i++) {
          const entry = incomingEntries[i];
          const newId = nextId++;

          const croppedFile = zip.file(`images/${entry.id}_cropped.jpg`);
          if (!croppedFile) {
            skipped++;
            continue;
          }

          try {
            const croppedBase64 = await croppedFile.async('base64');
            const croppedDataUrl = 'data:image/jpeg;base64,' + croppedBase64;

            // Store with new ID
            const imgKey = IMAGE_POOL_CONFIG.STORAGE_KEY_PREFIX + newId;
            await adapter.set(imgKey, croppedDataUrl);

            // Original
            let cropParams = entry.cropParams;
            const origFile = zip.file(`images/${entry.id}_original.jpg`);
            if (origFile && cropParams) {
              try {
                const origBase64 = await origFile.async('base64');
                const origDataUrl = 'data:image/jpeg;base64,' + origBase64;
                const origKey = IMAGE_POOL_CONFIG.STORAGE_KEY_PREFIX + 'orig_' + newId;
                await adapter.set(origKey, origDataUrl);
              } catch (_) {
                cropParams = null;
              }
            } else {
              cropParams = null;
            }

            // Add to merged entries (keep incoming hash for reference, no re-hash)
            mergedEntries.push({
              id: newId,
              name: entry.name || `imported_${entry.id}`,
              hash: entry.hash || null,
              size: croppedDataUrl.length,
              width: entry.width || 0,
              height: entry.height || 0,
              addedAt: Date.now(),
              cropParams,
              origWidth: entry.origWidth || 0,
              origHeight: entry.origHeight || 0,
            });

            // Merge stats
            if (incomingStats[String(entry.id)]) {
              mergedStats[String(newId)] = incomingStats[String(entry.id)];
            }

            added++;
          } catch (_) {
            skipped++;
          }

          const processed = i + 1;
          onProgress?.('imagePool',
            Math.round(processed / incomingCount * 100),
            `正在导入图片 (${processed}/${incomingCount})...`,
          );
        }

        // Persist merged meta and stats
        const mergedMeta = { version: 1, nextId, entries: mergedEntries };
        await adapter.set(IMAGE_POOL_CONFIG.META_KEY, JSON.stringify(mergedMeta));
        await adapter.set(IMAGE_POOL_CONFIG.STATS_KEY, JSON.stringify(mergedStats));

        // Reload
        await reloadPool();

        results.imagePool = { added, skipped };
      }

      onProgress?.('imagePool', 100, `图片池导入完成 (${results.imagePool.added} 张)`);
    } catch (e) {
      warn('Image pool import failed:', e);
      throw new Error(`图片池导入失败: ${e.message}`);
    }
  }

  return results;
}
