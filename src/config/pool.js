/**
 * @file Image pool and face detection configuration.
 * @module config/pool
 */

// Image pool configuration
export const IMAGE_POOL_CONFIG = {
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

  // ---- No-repeat: avoid reusing successfully-verified faces ----
  /**
   * When enabled, images that recently passed face verification are excluded
   * from subsequent picks so the same face isn't sent twice in a row.
   *
   * Edge case handling:
   *  - If ALL pool images are excluded (tiny pool, e.g. 1–2 images), fall
   *    back to the full pool with a debug-level log entry.
   *  - If an excluded image is removed from the pool, its exclusion is
   *    automatically cleaned up.
   */
  NO_REPEAT_ENABLED: true,
  /**
   * Exclusion scope:
   *  - 'session': exclude ALL images that succeeded during the current page
   *    session.  Best for long courses with many verification checkpoints —
   *    each face is used at most once per session.
   *  - 'last': exclude only the SINGLE most-recently-successful image.
   *    Safer for tiny pools (2–3 images) where session mode would exhaust
   *    the pipeline too quickly.
   */
  NO_REPEAT_MODE: 'session',

  // ---- Storage ----
  /** Storage key prefix (shared across all storage backends) */
  STORAGE_KEY_PREFIX: 'bfw_img_',
  /** Metadata key */
  META_KEY: 'bfw_meta',
  /** Stats key for per-image quality tracking */
  STATS_KEY: 'bfw_img_stats',
};

// Face detection (smart crop) configuration
export const FACE_DETECT_CONFIG = {
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
export const CROP_EDITOR_CONFIG = {
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
