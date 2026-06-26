/**
 * @file Face-detection-aware smart cropping.
 *
 * Two-tier pipeline for positioning the crop window:
 *
 *   Tier 1: Skin-color heuristic (YCbCr on downscaled canvas)
 *           → density-cluster centroid of skin-tone pixels
 *
 *   Tier 2: Fixed vertical bias (CROP_FALLBACK_BIAS = 0.38)
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
  const { faces } = await detectFaces(img);

  let attentionX, attentionY, cropBias;

  if (faces && faces.length > 0) {
    // Area-weighted centroid of all detected faces.
    // Prefer the density-weighted centroid (cx/cy) when the heuristic
    // provides it — it is more precise than the geometric box centre.
    let totalWeight = 0;
    attentionX = 0;
    attentionY = 0;
    for (const f of faces) {
      const fx = f.cx != null ? f.cx : (f.x + f.width / 2);
      const fy = f.cy != null ? f.cy : (f.y + f.height / 2);
      const area = f.width * f.height;
      attentionX += fx * area;
      attentionY += fy * area;
      totalWeight += area;
    }
    attentionX /= totalWeight;
    attentionY /= totalWeight;
    // Faces detected → use the face-aware crop bias (tighter framing)
    cropBias = FACE_DETECT_CONFIG.CROP_FACE_BIAS;
    debug(`Smart crop: ${faces.length} face(s) detected, attention at (${attentionX.toFixed(0)}, ${attentionY.toFixed(0)})`);
  } else {
    // Tier 2 fallback: no faces — use heuristic upper bias
    attentionX = srcW / 2;
    attentionY = srcH * FACE_DETECT_CONFIG.CROP_FALLBACK_BIAS;
    cropBias = FACE_DETECT_CONFIG.CROP_FALLBACK_BIAS;
    debug('Smart crop: no faces detected, using fixed bias fallback');
  }

  const cropRect = computeCropRect(srcW, srcH, attentionX, attentionY, cropBias);
  const result = renderCrop(img, cropRect);
  return { ...result, cropRect };
}

/**
 * Run the full face-detection pipeline and return debug information
 * for visualization in the face preview modal.
 *
 * @param {HTMLImageElement} img - decoded image (onload already fired)
 * @returns {Promise<{faces: Array<{x:number,y:number,width:number,height:number}>|null, tier: 'skin'|'fallback', attentionPoint: {x:number,y:number}|null, cropRect: {sx:number,sy:number,sw:number,sh:number}|null}>}
 */
export async function detectFacesDebug(img) {
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  const { faces, tier } = await detectFaces(img);

  let attentionX, attentionY, cropBias;

  if (faces && faces.length > 0) {
    let totalWeight = 0;
    attentionX = 0;
    attentionY = 0;
    for (const f of faces) {
      const fx = f.cx != null ? f.cx : (f.x + f.width / 2);
      const fy = f.cy != null ? f.cy : (f.y + f.height / 2);
      const area = f.width * f.height;
      attentionX += fx * area;
      attentionY += fy * area;
      totalWeight += area;
    }
    attentionX /= totalWeight;
    attentionY /= totalWeight;
    cropBias = FACE_DETECT_CONFIG.CROP_FACE_BIAS;
  } else {
    attentionX = srcW / 2;
    attentionY = srcH * FACE_DETECT_CONFIG.CROP_FALLBACK_BIAS;
    cropBias = FACE_DETECT_CONFIG.CROP_FALLBACK_BIAS;
  }

  const cropRect = computeCropRect(srcW, srcH, attentionX, attentionY, cropBias);

  return {
    faces,
    tier,
    attentionPoint: { x: attentionX, y: attentionY },
    cropRect,
  };
}

// ---------------------------------------------------------------------------
// Detection orchestrator
// ---------------------------------------------------------------------------

/**
 * Run the two-tier detection pipeline.
 *
 * @param {HTMLImageElement} img
 * @returns {Promise<{faces: Array<{x:number,y:number,width:number,height:number}>|null, tier: 'skin'|'fallback'}>}
 */
export async function detectFaces(img) {
  // Tier 1: Skin-color heuristic
  const skinFaces = detectFacesSkinHeuristic(img);
  if (skinFaces && skinFaces.length > 0) return { faces: skinFaces, tier: 'skin' };

  // Tier 2: nothing found — caller uses fixed bias
  return { faces: null, tier: 'fallback' };
}

// ---------------------------------------------------------------------------
// Tier 1: Skin-color heuristic (YCbCr on downscaled canvas)
// ---------------------------------------------------------------------------

/**
 * Estimate face position by detecting clusters of skin-tone pixels.
 *
 * Six-layer enhancement pipeline (all layers operate on the same
 * downscaled canvas, keeping total cost <8ms):
 *
 *   Layer 1 — Vertical position prior:
 *     Skin pixels in the upper portion of the image are weighted more
 *     heavily because faces nearly always appear in the upper half of
 *     portrait photos.  This biases the density centre of mass upward.
 *
 *   Layer 2 — Edge-density bonus:
 *     Skin pixels near sharp luminance edges (eyes, brows, nostrils,
 *     mouth) receive a bonus weight.  Necks are smooth — this shifts
 *     mass away from them.
 *
 *   Layer 3 — Increased grid resolution (8×6 vs. old 4×3):
 *     ~4× finer spatial discrimination at zero extra computation once
 *     pixels are classified.  Enables reliable face/neck separation
 *     that was impossible with the old coarse grid.
 *
 *   Layer 4 — Directional asymmetric expansion:
 *     Different inclusion thresholds per direction relative to the
 *     peak-density cell — low threshold upward (easy to include
 *     forehead), high threshold downward (hard to include neck).
 *
 *   Layer 5 — Density cliff detection:
 *     Scans per-row skin-pixel density for a sharp drop in the lower
 *     half of the expanded region that signals the chin→neck transition.
 *
 *   Layer 6 — Aspect ratio sanity:
 *     If the final region is >1.4× taller than wide it almost certainly
 *     includes neck — bottom rows are trimmed to restore a face-like ratio.
 *
 * When all layers pass, the function returns a single face box with
 * optional density-weighted centroid fields (cx, cy) that give a more
 * precise attention point than the geometric box centre.
 *
 * @param {HTMLImageElement} img
 * @returns {Array<{x:number,y:number,width:number,height:number,cx?:number,cy?:number}>|null}
 */
function detectFacesSkinHeuristic(img) {
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  const cfg = FACE_DETECT_CONFIG;

  // ── Down-scale to a small sample canvas ──────────────────────────────
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
  const cellW = cw / gridCols;
  const cellH = ch / gridRows;

  // Weighted grid accumulates contributions from layers 1–3.
  // Used to find the peak cell and determine the density centroid.
  const grid = Array.from({ length: gridRows }, () => new Array(gridCols).fill(0));

  // Raw (unweighted) grid preserves the true skin-pixel count per cell.
  // Used for expansion decisions (layer 4) and cliff detection (layer 5)
  // where we need un-skewed counts.
  const rawGrid = Array.from({ length: gridRows }, () => new Array(gridCols).fill(0));

  let totalSkin = 0;

  // ── Single-pass pixel classification (layers 1–3) ────────────────────
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

      // Raw count (always incremented)
      rawGrid[row][col]++;

      // Layer 1: Vertical position prior
      // Top rows get 1.0× weight; bottom rows get (1.0 − decay)×
      let cellWeight = 1.0;
      if (cfg.SKIN_VERTICAL_WEIGHT_ENABLED) {
        const vertFactor = 1.0 - cfg.SKIN_VERTICAL_WEIGHT_DECAY
          * (row / Math.max(gridRows - 1, 1));
        cellWeight *= Math.max(0.1, vertFactor);
      }

      // Layer 2: Edge-density bonus
      // Compare luminance with the pixel to the right — facial features
      // (eyes, brows, mouth) produce strong horizontal luminance edges.
      if (cfg.SKIN_EDGE_BONUS_ENABLED && px < cw - 1) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const r2 = data[i + 4];
        const g2 = data[i + 5];
        const b2 = data[i + 6];
        const lum2 = 0.299 * r2 + 0.587 * g2 + 0.114 * b2;
        if (Math.abs(lum - lum2) > cfg.SKIN_EDGE_LUM_THRESHOLD) {
          cellWeight += cfg.SKIN_EDGE_BONUS_WEIGHT;
        }
      }

      grid[row][col] += cellWeight;
      totalSkin++;
    }
  }

  // ── Minimum skin-pixel guard ──────────────────────────────────────────
  if (totalSkin < cfg.SKIN_MIN_PIXELS) {
    debug(`Skin heuristic: only ${totalSkin} skin pixels (need ${cfg.SKIN_MIN_PIXELS})`);
    return null;
  }

  // ── Find peak-density cell (weighted grid) ────────────────────────────
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

  // ── Layer 4: Directional asymmetric expansion ────────────────────────
  // The peak raw value serves as the reference for all thresholds.
  const peakRaw = rawGrid[bestRow][bestCol];
  if (peakRaw === 0) return null; // Should never happen — guard

  let minCol = bestCol;
  let maxCol = bestCol;
  let minRow = bestRow;
  let maxRow = bestRow;

  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      let threshold;
      if (r < bestRow) {
        threshold = cfg.SKIN_EXPAND_UP_THRESHOLD;       // 0.30 — easy up
      } else if (r > bestRow) {
        threshold = cfg.SKIN_EXPAND_DOWN_THRESHOLD;     // 0.55 — hard down
      } else {
        threshold = cfg.SKIN_EXPAND_SIDE_THRESHOLD;     // 0.40 — medium
      }

      if (rawGrid[r][c] >= peakRaw * threshold) {
        if (c < minCol) minCol = c;
        if (c > maxCol) maxCol = c;
        if (r < minRow) minRow = r;
        if (r > maxRow) maxRow = r;
      }
    }
  }

  // ── Layer 5: Density cliff detection ─────────────────────────────────
  // Scan per-row skin-pixel density looking for a sharp drop that signals
  // the face→neck transition.  Only scan the lower half of the region to
  // avoid mistaking forehead→hair transitions for cliffs.
  if (cfg.SKIN_CLIFF_DETECT_ENABLED) {
    const rowDensity = [];
    for (let r = minRow; r <= maxRow; r++) {
      let rowSum = 0;
      for (let c = minCol; c <= maxCol; c++) {
        rowSum += rawGrid[r][c];
      }
      rowDensity.push({ row: r, density: rowSum });
    }

    const startIdx = Math.floor(rowDensity.length / 2);
    let maxDrop = 0;
    let dropRow = -1;
    for (let i = startIdx; i < rowDensity.length - 1; i++) {
      if (rowDensity[i].density > 0) {
        const drop = (rowDensity[i].density - rowDensity[i + 1].density)
          / rowDensity[i].density;
        if (drop > maxDrop && drop >= cfg.SKIN_CLIFF_THRESHOLD) {
          maxDrop = drop;
          dropRow = rowDensity[i].row;
        }
      }
    }

    if (dropRow >= 0) {
      maxRow = dropRow;
      debug(`Skin heuristic: density cliff at row ${dropRow} (${(maxDrop * 100).toFixed(0)}% drop), face bottom clipped`);
    }
  }

  // ── Layer 6: Aspect ratio sanity ─────────────────────────────────────
  const regionCols = maxCol - minCol + 1;
  const regionRows = maxRow - minRow + 1;
  if (regionRows / regionCols > cfg.SKIN_MAX_ASPECT_RATIO) {
    const maxRows = Math.max(1, Math.ceil(regionCols * cfg.SKIN_MAX_ASPECT_RATIO));
    const trimmed = regionRows - maxRows;
    if (trimmed > 0) {
      maxRow = minRow + maxRows - 1;
      debug(`Skin heuristic: region too tall (${(regionRows / regionCols).toFixed(1)}:1), trimmed ${trimmed} row(s) from bottom`);
    }
  }

  // ── Density-weighted centroid ────────────────────────────────────────
  // Compute the centre of mass within the final region for a more precise
  // attention point than the geometric box centre.  Uses the weighted grid
  // so the vertical prior and edge bonus contribute to the centroid.
  let weightedX = 0;
  let weightedY = 0;
  let weightSum = 0;
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const w = grid[r][c];
      if (w > 0) {
        weightedX += (c + 0.5) * w;
        weightedY += (r + 0.5) * w;
        weightSum += w;
      }
    }
  }

  // Map bounding rectangle back to source coordinates
  const faceX = minCol * (srcW / gridCols);
  const faceY = minRow * (srcH / gridRows);
  const faceW = (maxCol - minCol + 1) * (srcW / gridCols);
  const faceH = (maxRow - minRow + 1) * (srcH / gridRows);

  const result = {
    x: faceX,
    y: faceY,
    width: faceW,
    height: faceH,
  };

  // Attach density-weighted centroid when computation succeeded.
  // Apply headroom shift: the skin centroid sits inside the face box
  // (roughly nose bridge), but the full head extends above the hairline
  // by ~33% of face height (hair/crown).  Shift cy upward to centre the
  // full head in the crop window rather than just the face.
  if (weightSum > 0) {
    result.cx = (weightedX / weightSum) * (srcW / gridCols);
    const skinCy = (weightedY / weightSum) * (srcH / gridRows);
    const headroomPx = faceH * cfg.SKIN_HEADROOM_SHIFT;
    result.cy = skinCy - headroomPx;
  }

  debug(`Skin heuristic: ${totalSkin} skin px, peak@(${bestCol},${bestRow}) density=${maxDensity.toFixed(1)}, region cols ${minCol}–${maxCol} rows ${minRow}–${maxRow}, centroid raw@(${(result.cx || faceX + faceW/2).toFixed(0)}, ${((result.cy || faceY + faceH/2)).toFixed(0)}) adjusted↑${(faceH * cfg.SKIN_HEADROOM_SHIFT).toFixed(0)}px`);

  return [result];
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