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

import { IMAGE_POOL_CONFIG, FACE_DETECT_CONFIG } from '../config.js';
import { debug, warn } from './logger.js';

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
export async function smartCropToStandard(img) {
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
  if (FACE_DETECT_CONFIG.NATIVE_ENABLED) {
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
export function renderCrop(img, cropRect) {
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