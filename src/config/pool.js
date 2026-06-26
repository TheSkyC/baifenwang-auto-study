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
  // ---- Tier 1: Skin-color heuristic ----
  /**
   * Downsample size for skin-color analysis (pixels on longest side).
   * Increased from 80→100 for ~56% more skin-pixel samples at negligible
   * cost (~1ms extra on a 100×75 downscaled canvas).
   */
  SKIN_SAMPLE_SIZE: 100,

  /**
   * Minimum skin-pixel count for the heuristic to be considered valid.
   * Scaled proportionally from 50→80 to match the larger sample canvas.
   */
  SKIN_MIN_PIXELS: 80,

  /**
   * Grid dimensions for skin-pixel clustering (cols × rows).
   * Increased from 4×3 (12 cells) to 8×6 (48 cells) — ~4× finer spatial
   * resolution enables reliable face/neck discrimination at zero extra
   * computation once pixels are classified.
   */
  SKIN_GRID_COLS: 8,
  SKIN_GRID_ROWS: 6,

  /** YCbCr skin-pixel thresholds (ITU-R BT.601, illumination-invariant) */
  SKIN_CB_MIN: 77,
  SKIN_CB_MAX: 127,
  SKIN_CR_MIN: 133,
  SKIN_CR_MAX: 173,

  // ---- Component analysis (P0 backbone) ----
  /**
   * Minimum absolute skin pixels for a connected component to be considered
   * as a face candidate on the downsampled canvas.
   */
  SKIN_COMPONENT_MIN_PIXELS: 60,
  /**
   * Minimum component area ratio relative to the downsampled sample canvas.
   * Rejects tiny blobs even when the absolute pixel threshold is permissive.
   */
  SKIN_COMPONENT_MIN_AREA_RATIO: 0.01,
  /**
   * Broad aspect-ratio guard for candidate components before final trimming.
   * Kept generous so slightly tilted or off-angle faces still survive.
   */
  SKIN_COMPONENT_MIN_ASPECT_RATIO: 0.55,
  SKIN_COMPONENT_MAX_CANDIDATE_ASPECT_RATIO: 2.2,
  /** Typical face height/width ratio used by the component scorer. */
  SKIN_COMPONENT_IDEAL_ASPECT_RATIO: 1.18,
  /**
   * Target area ratio for the area score.  Larger components saturate the
   * score instead of dominating purely by size.
   */
  SKIN_COMPONENT_TARGET_AREA_RATIO: 0.10,
  /**
   * Edge-density guards for rejecting smooth, skin-coloured background
   * regions such as cabinets or walls.
   */
  SKIN_COMPONENT_MIN_EDGE_RATIO: 0.012,
  SKIN_COMPONENT_HARD_MIN_EDGE_RATIO: 0.006,
  /**
   * Best-candidate confidence gates.  When the top component is weak or the
   * top two are too close, the heuristic falls back to the fixed crop bias.
   */
  SKIN_COMPONENT_SCORE_THRESHOLD: 2.35,
  SKIN_COMPONENT_MIN_SCORE_MARGIN: 0.18,
  /** Component scorer weights. */
  SKIN_SCORE_WEIGHT_AREA: 0.90,
  SKIN_SCORE_WEIGHT_VERTICAL: 0.85,
  SKIN_SCORE_WEIGHT_EDGE: 1.35,
  SKIN_SCORE_WEIGHT_ASPECT: 0.85,
  SKIN_SCORE_WEIGHT_SHARE: 0.45,
  SKIN_SCORE_WEIGHT_TAPER: 0.35,

  // ---- Layer 1: Vertical position prior ----
  /**
   * Skin pixels in the upper portion of the image are weighted more
   * heavily because faces nearly always appear in the upper half of
   * portrait photos.  This naturally biases the detected region's
   * center of mass away from the neck.
   *
   * Weight formula:  1.0 − decay × (row / maxRow)
   * Top row gets 1.0×, bottom row gets (1.0 − decay)×.
   */
  SKIN_VERTICAL_WEIGHT_ENABLED: true,
  /** At 0.35 the bottom row gets 0.65× the weight of the top row. */
  SKIN_VERTICAL_WEIGHT_DECAY: 0.35,

  // ---- Layer 2: Directional asymmetric expansion ----
  /**
   * After finding the peak-density cell, adjacent cells are merged into
   * the face region if their raw skin-pixel count reaches a fraction of
   * the peak.  Because faces are wider at the top and narrower at the
   * bottom (chin), and the neck below shares skin tone, we use
   * DIRECTIONAL thresholds:
   *
   *   Up (forehead/hair):   LOW  — easy to expand, hair is non-skin
   *   Down (chin/neck):     HIGH — hard to expand, avoids neck bleed
   *   Horizontal (cheeks):  MEDIUM
   */
  SKIN_EXPAND_UP_THRESHOLD: 0.25,
  SKIN_EXPAND_DOWN_THRESHOLD: 0.60,
  SKIN_EXPAND_SIDE_THRESHOLD: 0.35,

  // ---- Layer 3: Edge-density bonus ----
  /**
   * Faces contain high-contrast features (eyes, brows, nostrils, mouth)
   * that create sharp luminance edges.  Necks are comparatively smooth.
   * Adding a small bonus to skin pixels near luminance edges shifts
   * density mass toward the face and away from the neck.
   *
   * For each skin pixel we compare its luminance with its right-hand
   * neighbour; if the difference exceeds the threshold we add the bonus
   * weight to that pixel's grid cell.
   */
  SKIN_EDGE_BONUS_ENABLED: true,
  /** Weight added to a skin pixel's grid cell when an edge is detected. */
  SKIN_EDGE_BONUS_WEIGHT: 0.30,
  /** Luminance difference (> this) between adjacent pixels → edge.
   *  Typical face features produce step edges of 40–80 luma units;
   *  smooth skin varies by <10.  A threshold of 20 reliably separates
   *  facial features from uniform neck skin. */
  SKIN_EDGE_LUM_THRESHOLD: 20,

  // ---- Layer 4: Density cliff detection ----
  /**
   * Scans per-row skin-pixel density within the expanded region for a
   * sharp drop that signals the face→neck transition.  The neck is
   * narrower than the face, so horizontal skin-pixel count drops sharply
   * below the chin.
   *
   * Only scans the lower half of the region to avoid false positives
   * from forehead→hair transitions at the top.
   */
  SKIN_CLIFF_DETECT_ENABLED: true,
  /**
   * Minimum relative drop between consecutive rows to be considered a
   * face→neck cliff.  0.40 = row below has ≤60% of the skin pixels.
   */
  SKIN_CLIFF_THRESHOLD: 0.40,

  // ---- Layer 5: Aspect ratio sanity ----
  /**
   * A purely-skin-based face box that's much taller than wide almost
   * certainly includes neck.  Clamp height to this ratio.
   * 1.4:1 is generous for oval faces — a typical face is 1.0–1.3:1
   * (height/width).  Anything taller gets bottom-trimmed.
   */
  SKIN_MAX_ASPECT_RATIO: 1.4,

  // ---- Headroom extension ----
  /**
   * The skin heuristic detects the FACE (roughly hairline to chin).
   * The hair and crown extend above the hairline by 25–38% of face
   * height (anthropometric average ~33%).  This shift re-positions the
   * attention point upward by a fraction of the detected face height
   * so the crop window includes the full head, not just the face.
   *
   * General anthropometric data:
   *   Face (hairline→chin) = ~60–65% of total head
   *   Hair/crown above hairline = ~35–40% of face height
   *   User measurement: hair 60px : face 160px → 0.375 ratio
   *
   * 0.15 × faceH shifts the centroid from the skin centre (roughly
   * nose bridge) up toward the eye/forehead level so the crop window
   * includes the full head with comfortable headroom.
   */
  SKIN_HEADROOM_SHIFT: 0.15,

  // ---- Tier 2: Fixed-bias fallback ----
  /**
   * Vertical bias when no skin regions are detected by the heuristic.
   * Same value as IMAGE_POOL_CONFIG.CROP_FACE_BIAS — kept here as the
   * canonical source for the face-detection pipeline.
   */
  CROP_FALLBACK_BIAS: 0.38,

  /**
   * Vertical bias used when skin detection succeeds.
   * 0.40 = attention point at 40% from top → more headroom above than
   * below.  Combined with the headroom shift on the centroid, this
   * ensures the full head (face + hair) is visible in the 4:3 crop.
   */
  CROP_FACE_BIAS: 0.40,
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
