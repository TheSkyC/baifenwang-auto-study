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

import { IMAGE_POOL_CONFIG } from '../config.js';
import { smartCropToStandard, renderCrop } from '../utils/face-detect.js';
import { info, debug, warn } from '../utils/logger.js';
import { getStorageAdapter } from '../utils/storage-adapter.js';
import { getSetting } from '../settings.js';

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

/**
 * ID of the most recently successful image — excluded from the next pick to
 * avoid back-to-back reuse of the same face.  Controlled by NO_REPEAT_ENABLED
 * and NO_REPEAT_MODE config.
 */
let _lastSuccessId = null;

/**
 * Set of all image IDs that passed verification in the current page session.
 * When NO_REPEAT_MODE is 'session', these IDs are excluded from all future
 * picks.  In-memory only — resets on page reload.
 * @type {Set<number>}
 */
let _sessionSuccessIds = new Set();

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
  if (total <= 0) return Math.floor(Math.random() * weights.length);

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
export async function initPool() {
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
export function poolSize() {
  return _meta.entries.length;
}

/**
 * Maximum capacity.
 * @returns {number}
 */
export function poolCapacity() {
  return IMAGE_POOL_CONFIG.MAX_IMAGES;
}

/**
 * Return a shallow copy of all pool entries (for UI rendering).
 * @returns {PoolEntry[]}
 */
export function listEntries() {
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
export async function pickImage() {
  if (_meta.entries.length === 0) {
    const err = new Error('Image pool is empty — cannot pick an image for replacement');
    err.code = 'POOL_EMPTY';
    throw err;
  }

  // ── No-repeat exclusion ──────────────────────────────────────────────
  // Avoid reusing faces that already passed verification this session.
  // Build a list of eligible entry indices; fall back to the full pool
  // if every image is excluded (tiny pool edge case).
  const excludeIds = new Set();
  if (IMAGE_POOL_CONFIG.NO_REPEAT_ENABLED) {
    if (_lastSuccessId != null) excludeIds.add(_lastSuccessId);
    if (IMAGE_POOL_CONFIG.NO_REPEAT_MODE === 'session') {
      for (const id of _sessionSuccessIds) excludeIds.add(id);
    }
  }

  /** @type {number[]} — indices into _meta.entries that are eligible for selection */
  let eligibleIndices = [];
  for (let i = 0; i < _meta.entries.length; i++) {
    if (!excludeIds.has(_meta.entries[i].id)) {
      eligibleIndices.push(i);
    }
  }

  const usingFallback = eligibleIndices.length === 0;
  if (usingFallback) {
    eligibleIndices = _meta.entries.map((_, i) => i);
  }

  const maxRetries = 3;
  const tried = new Set();

  // Compute weights once — they don't change during retries
  const useWeighted = getSetting('dynamicWeight', true);
  const weights = useWeighted ? computeWeights() : null;

  for (let attempt = 0; attempt < maxRetries && tried.size < eligibleIndices.length; attempt++) {
    // Weighted or uniform random selection over eligible indices
    let eligiblePos;
    do {
      if (useWeighted) {
        const eligibleWeights = eligibleIndices.map((i) => weights[i]);
        eligiblePos = weightedRandomIndex(eligibleWeights);
      } else {
        eligiblePos = Math.floor(Math.random() * eligibleIndices.length);
      }
    } while (tried.has(eligiblePos));
    tried.add(eligiblePos);

    const idx = eligibleIndices[eligiblePos];
    const entry = _meta.entries[idx];
    const adapter = getStorageAdapter();
    const raw = await adapter.get(imgKey(entry.id));

    if (raw && isValidDataURI(raw)) {
      // Record usage stats
      _lastPickedId = entry.id;
      const stats = getOrCreateStats(entry.id);
      const excludedNote = (usingFallback && excludeIds.has(entry.id)) ? ' (fallback — was excluded)' : '';
      info(`Picked image #${entry.id} "${entry.name}" (tier=${getQualityTier(stats)}, prevUses=${stats.totalUses}${excludedNote})`);
      stats.totalUses++;
      stats.lastUsedAt = Date.now();
      persistStats(); // fire-and-forget

      // Apply random mutations if enabled
      if (IMAGE_POOL_CONFIG.MUTATION_ENABLED) {
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
export async function addImages(files) {
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
export async function addImageFromDataURI(dataUrl, name) {
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
export async function removeImage(id) {
  const idx = _meta.entries.findIndex((e) => e.id === id);
  if (idx === -1) return false;

  const entry = _meta.entries[idx];
  await removeImageData(entry.id);
  try { await getStorageAdapter().remove(imgOrigKey(entry.id)); } catch (_) { /* ignore */ }
  _meta.entries.splice(idx, 1);
  // Clean up stats and no-repeat state for the removed image
  delete _stats[entry.id];
  if (_lastSuccessId === entry.id) _lastSuccessId = null;
  _sessionSuccessIds.delete(entry.id);
  await persistMeta();
  await persistStats();
  info(`Removed image "${entry.name}" (id=${id})`);
  return true;
}

/**
 * Remove all images from the pool.
 * @returns {Promise<void>}
 */
export async function clearPool() {
  const adapter = getStorageAdapter();

  for (const entry of _meta.entries) {
    await adapter.remove(imgKey(entry.id));
    try { await adapter.remove(imgOrigKey(entry.id)); } catch (_) { /* ignore */ }
  }

  _meta.entries = [];
  _meta.nextId = 0;
  _stats = {};
  _lastPickedId = null;
  _lastSuccessId = null;
  _sessionSuccessIds.clear();
  await persistMeta();
  await persistStats();
  info('Image pool cleared');
}

/**
 * Return the data URI for a specific entry (for thumbnail display).
 * @param {number} id
 * @returns {Promise<string|null>}
 */
export async function getImageData(id) {
  const raw = await getStorageAdapter().get(imgKey(id));
  return raw && isValidDataURI(raw) ? raw : null;
}

/**
 * Return the ORIGINAL (un-cropped) data URI for a specific entry.
 * @param {number} id
 * @returns {Promise<string|null>}
 */
export async function getOriginalImageData(id) {
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
export async function updateCrop(id, cropParams) {
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

/**
 * Re-run automatic face detection to reset the crop rectangle to the
 * algorithm's best guess.  Convenience wrapper around updateCrop.
 *
 * @param {number} id
 * @returns {Promise<boolean>}
 */
export async function resetCrop(id) {
  const origDataUrl = await getOriginalImageData(id);
  if (!origDataUrl) {
    warn(`resetCrop: original image data not found for ${id}`);
    return false;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => {
      warn(`resetCrop: failed to decode original image for ${id}`);
      resolve(false);
    };
    img.onload = async () => {
      try {
        const { cropRect } = await smartCropToStandard(img);
        const ok = await updateCrop(id, cropRect);
        resolve(ok);
      } catch (e) {
        warn(`resetCrop: auto-detect failed for ${id}:`, e);
        resolve(false);
      }
    };
    img.src = origDataUrl;
  });
}

/**
 * Rebuild metadata from orphaned image keys.  Use as a manual repair tool
 * if metadata gets out of sync.
 * @returns {Promise<number>} number of entries rebuilt
 */
export async function repairPool() {
  const adapter = getStorageAdapter();
  const allKeys = await adapter.keys();
  const prefix = IMAGE_POOL_CONFIG.STORAGE_KEY_PREFIX;

  const imageKeys = allKeys.filter((k) =>
    k.startsWith(prefix) && k !== IMAGE_POOL_CONFIG.META_KEY && !k.includes('orig_'),
  );
  const rebuilt = [];

  for (const key of imageKeys) {
    const idStr = key.slice(prefix.length);
    const id = parseInt(idStr, 10);
    if (!Number.isFinite(id)) continue;

    const data = await adapter.get(key);
    if (data && isValidDataURI(data)) {
      rebuilt.push({
        id,
        name: `recovered_${id}`,
        hash: null,
        size: data.length,
        width: 0,
        height: 0,
        addedAt: Date.now(),
        cropParams: null,
      });
    } else {
      await adapter.remove(key);
    }
  }

  rebuilt.sort((a, b) => a.id - b.id);
  _meta = {
    version: 1,
    nextId: rebuilt.length > 0 ? Math.max(...rebuilt.map((e) => e.id)) + 1 : 0,
    entries: rebuilt,
  };
  // Clean up stats for images that no longer exist
  const validIds = new Set(rebuilt.map((e) => e.id));
  for (const id of Object.keys(_stats)) {
    if (!validIds.has(Number(id))) delete _stats[Number(id)];
  }
  await persistMeta();
  await persistStats();
  info(`Pool repaired: ${rebuilt.length} entries recovered`);
  return rebuilt.length;
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
export function recordImageResult(id, success) {
  const stats = getOrCreateStats(id);
  if (success) {
    stats.successes++;
    stats.lastResult = 'success';
    // Track for no-repeat exclusion so this face won't be reused immediately
    _lastSuccessId = id;
    _sessionSuccessIds.add(id);
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
export function recordLastPickResult(success) {
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
export function getImageStats(id) {
  return _stats[id] || null;
}

/**
 * Get stats for all images in the pool, keyed by ID.
 * Returns a fresh object — safe for UI rendering.
 * @returns {{ [id: number]: ImageStats }}
 */
export function getAllStats() {
  return { ..._stats };
}

/**
 * Reset the no-repeat exclusion state so all images are eligible for
 * picking again.  Call when starting a new course or when the user
 * explicitly requests a fresh verification cycle.
 *
 * Does NOT affect quality scores — only clears the in-memory exclusion
 * set (_lastSuccessId and _sessionSuccessIds).
 */
export function resetNoRepeatState() {
  const hadState = _lastSuccessId != null || _sessionSuccessIds.size > 0;
  _lastSuccessId = null;
  _sessionSuccessIds.clear();
  if (hadState) {
    debug('No-repeat state reset — all images are eligible again');
  }
}

/**
 * Get the quality tier for a specific image.
 * @param {number} id
 * @returns {QualityTier}
 */
export function getImageQualityTier(id) {
  const stats = _stats[id] || createDefaultStats();
  return getQualityTier(stats);
}
