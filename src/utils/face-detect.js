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
import { debug } from './logger.js';

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
 * Estimate face position by detecting connected skin-tone regions.
 *
 * P0 pipeline:
 *   1. Classify skin pixels on a downscaled canvas
 *   2. Build connected components on the binary skin mask
 *   3. Score each component by size, vertical prior, edge density,
 *      aspect ratio, dominance, and top/bottom taper
 *   4. Fall back when the best component is too weak or ambiguous
 *   5. Reuse the existing density-cliff and aspect-ratio safeguards to
 *      trim neck bleed from the selected component
 *
 * @param {HTMLImageElement} img
 * @returns {Array<{x:number,y:number,width:number,height:number,cx?:number,cy?:number}>|null}
 */
function detectFacesSkinHeuristic(img) {
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  const cfg = FACE_DETECT_CONFIG;

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
  const pixelCount = cw * ch;
  const skinMask = new Uint8Array(pixelCount);
  const edgeMask = new Uint8Array(pixelCount);
  let totalSkin = 0;

  for (let py = 0; py < ch; py++) {
    for (let px = 0; px < cw; px++) {
      const pixelIndex = py * cw + px;
      const i = pixelIndex * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const cb = 128 - 0.169 * r - 0.331 * g + 0.500 * b;
      const cr = 128 + 0.500 * r - 0.419 * g - 0.081 * b;

      if (cb >= cfg.SKIN_CB_MIN && cb <= cfg.SKIN_CB_MAX
          && cr >= cfg.SKIN_CR_MIN && cr <= cfg.SKIN_CR_MAX) {
        skinMask[pixelIndex] = 1;
        totalSkin++;

        if (cfg.SKIN_EDGE_BONUS_ENABLED && px < cw - 1) {
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const i2 = i + 4;
          const lum2 = 0.299 * data[i2] + 0.587 * data[i2 + 1] + 0.114 * data[i2 + 2];
          if (Math.abs(lum - lum2) > cfg.SKIN_EDGE_LUM_THRESHOLD) {
            edgeMask[pixelIndex] = 1;
          }
        }
      }
    }
  }

  if (totalSkin < cfg.SKIN_MIN_PIXELS) {
    debug(`Skin heuristic: only ${totalSkin} skin pixels (need ${cfg.SKIN_MIN_PIXELS})`);
    return null;
  }

  const minComponentPixels = Math.max(
    cfg.SKIN_COMPONENT_MIN_PIXELS,
    Math.round(pixelCount * cfg.SKIN_COMPONENT_MIN_AREA_RATIO),
  );
  const components = collectSkinComponents(skinMask, edgeMask, cw, ch, cfg, minComponentPixels);
  if (components.length === 0) {
    debug(`Skin heuristic: ${totalSkin} skin px but no component survived min area ${minComponentPixels}`);
    return null;
  }

  const candidates = components
    .map((component) => scoreSkinComponent(component, totalSkin, cw, ch, cfg))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    debug(`Skin heuristic: ${components.length} component(s) found, none passed candidate scoring`);
    return null;
  }

  const best = candidates[0];
  const second = candidates[1] || null;
  const margin = second ? best.score - second.score : best.score;

  debug(
    `Skin heuristic: ${totalSkin} skin px, ${components.length} component(s), `
    + `best score=${best.score.toFixed(2)} `
    + `(area=${best.component.area}, edge=${best.edgeRatio.toFixed(3)}, aspect=${best.aspect.toFixed(2)}, cy=${best.centerY.toFixed(1)})`
    + (second ? `, second=${second.score.toFixed(2)}, margin=${margin.toFixed(2)}` : ''),
  );

  if (best.score < cfg.SKIN_COMPONENT_SCORE_THRESHOLD
      || (second && margin < cfg.SKIN_COMPONENT_MIN_SCORE_MARGIN)) {
    debug(
      `Skin heuristic: low-confidence candidate `
      + `(best=${best.score.toFixed(2)}, threshold=${cfg.SKIN_COMPONENT_SCORE_THRESHOLD.toFixed(2)}, margin=${margin.toFixed(2)})`,
    );
    return null;
  }

  const result = finalizeComponentFace(best.component, srcW, srcH, cw, ch, edgeMask, cfg);
  if (!result) {
    debug('Skin heuristic: selected component failed finalization');
    return null;
  }

  return [result];
}

function collectSkinComponents(skinMask, edgeMask, cw, ch, cfg, minComponentPixels) {
  const visited = new Uint8Array(cw * ch);
  const components = [];

  for (let start = 0; start < skinMask.length; start++) {
    if (!skinMask[start] || visited[start]) continue;

    const stack = [start];
    visited[start] = 1;

    const component = {
      area: 0,
      edgeCount: 0,
      minX: cw,
      maxX: -1,
      minY: ch,
      maxY: -1,
      weightedX: 0,
      weightedY: 0,
      weightSum: 0,
      pixels: [],
    };

    while (stack.length > 0) {
      const idx = stack.pop();
      const x = idx % cw;
      const y = Math.floor(idx / cw);

      component.area++;
      component.pixels.push(idx);
      if (edgeMask[idx]) component.edgeCount++;
      if (x < component.minX) component.minX = x;
      if (x > component.maxX) component.maxX = x;
      if (y < component.minY) component.minY = y;
      if (y > component.maxY) component.maxY = y;

      const weight = getSkinPixelWeight(y, ch, edgeMask[idx], cfg);
      component.weightedX += (x + 0.5) * weight;
      component.weightedY += (y + 0.5) * weight;
      component.weightSum += weight;

      for (let ny = Math.max(0, y - 1); ny <= Math.min(ch - 1, y + 1); ny++) {
        for (let nx = Math.max(0, x - 1); nx <= Math.min(cw - 1, x + 1); nx++) {
          if (nx === x && ny === y) continue;
          const nidx = ny * cw + nx;
          if (!skinMask[nidx] || visited[nidx]) continue;
          visited[nidx] = 1;
          stack.push(nidx);
        }
      }
    }

    if (component.area >= minComponentPixels) {
      components.push(component);
    }
  }

  return components;
}

function scoreSkinComponent(component, totalSkin, cw, ch, cfg) {
  const width = component.maxX - component.minX + 1;
  const height = component.maxY - component.minY + 1;
  if (width <= 0 || height <= 0) return null;

  const aspect = height / width;
  if (aspect < cfg.SKIN_COMPONENT_MIN_ASPECT_RATIO
      || aspect > cfg.SKIN_COMPONENT_MAX_CANDIDATE_ASPECT_RATIO) {
    return null;
  }

  const areaRatio = component.area / (cw * ch);
  const edgeRatio = component.edgeCount / Math.max(component.area, 1);
  if (component.area >= Math.round(cw * ch * 0.03)
      && edgeRatio < cfg.SKIN_COMPONENT_HARD_MIN_EDGE_RATIO) {
    return null;
  }

  const centerY = component.weightSum > 0
    ? component.weightedY / component.weightSum
    : (component.minY + component.maxY + 1) / 2;
  if (centerY > ch * 0.84) return null;

  const areaScore = clamp01(
    (areaRatio - cfg.SKIN_COMPONENT_MIN_AREA_RATIO)
    / Math.max(cfg.SKIN_COMPONENT_TARGET_AREA_RATIO - cfg.SKIN_COMPONENT_MIN_AREA_RATIO, 0.0001),
  );
  const verticalScore = clamp01(1 - centerY / Math.max(ch * 0.85, 1));
  const edgeScore = clamp01(
    (edgeRatio - cfg.SKIN_COMPONENT_MIN_EDGE_RATIO)
    / Math.max(0.06 - cfg.SKIN_COMPONENT_MIN_EDGE_RATIO, 0.0001),
  );
  const aspectScore = scoreAspect(aspect, cfg.SKIN_COMPONENT_IDEAL_ASPECT_RATIO);
  const shareScore = clamp01((component.area / Math.max(totalSkin, 1)) / 0.55);
  const taperScore = measureComponentTaper(component, cw);

  const score = areaScore * cfg.SKIN_SCORE_WEIGHT_AREA
    + verticalScore * cfg.SKIN_SCORE_WEIGHT_VERTICAL
    + edgeScore * cfg.SKIN_SCORE_WEIGHT_EDGE
    + aspectScore * cfg.SKIN_SCORE_WEIGHT_ASPECT
    + shareScore * cfg.SKIN_SCORE_WEIGHT_SHARE
    + taperScore * cfg.SKIN_SCORE_WEIGHT_TAPER;

  return {
    component,
    score,
    aspect,
    edgeRatio,
    centerY,
  };
}

function finalizeComponentFace(component, srcW, srcH, cw, ch, edgeMask, cfg) {
  const rowData = buildComponentRowData(component, cw);
  let minY = component.minY;
  let maxY = component.maxY;

  if (cfg.SKIN_CLIFF_DETECT_ENABLED) {
    const clippedMaxY = findDensityCliffCutoff(rowData, minY, maxY, cfg);
    if (clippedMaxY < maxY) {
      debug(`Skin heuristic: density cliff at row ${clippedMaxY}, face bottom clipped`);
      maxY = clippedMaxY;
    }
  }

  let bounds = boundsForRows(rowData, minY, maxY);
  if (!bounds) return null;

  let regionW = bounds.maxX - bounds.minX + 1;
  let regionH = bounds.maxY - bounds.minY + 1;
  if (regionH / regionW > cfg.SKIN_MAX_ASPECT_RATIO) {
    const maxRows = Math.max(1, Math.ceil(regionW * cfg.SKIN_MAX_ASPECT_RATIO));
    const trimmed = regionH - maxRows;
    if (trimmed > 0) {
      maxY = bounds.minY + maxRows - 1;
      debug(`Skin heuristic: region too tall (${(regionH / regionW).toFixed(1)}:1), trimmed ${trimmed} row(s) from bottom`);
      bounds = boundsForRows(rowData, bounds.minY, maxY);
      if (!bounds) return null;
      regionW = bounds.maxX - bounds.minX + 1;
      regionH = bounds.maxY - bounds.minY + 1;
    }
  }

  let weightedX = 0;
  let weightedY = 0;
  let weightSum = 0;
  for (const idx of component.pixels) {
    const x = idx % cw;
    const y = Math.floor(idx / cw);
    if (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY) continue;
    const weight = getSkinPixelWeight(y, ch, edgeMask[idx], cfg);
    weightedX += (x + 0.5) * weight;
    weightedY += (y + 0.5) * weight;
    weightSum += weight;
  }

  const scaleX = srcW / cw;
  const scaleY = srcH / ch;
  const faceX = bounds.minX * scaleX;
  const faceY = bounds.minY * scaleY;
  const faceW = regionW * scaleX;
  const faceH = regionH * scaleY;

  const result = {
    x: faceX,
    y: faceY,
    width: faceW,
    height: faceH,
  };

  if (weightSum > 0) {
    result.cx = (weightedX / weightSum) * scaleX;
    const skinCy = (weightedY / weightSum) * scaleY;
    result.cy = skinCy - faceH * cfg.SKIN_HEADROOM_SHIFT;
  }

  return result;
}

function buildComponentRowData(component, cw) {
  const height = component.maxY - component.minY + 1;
  const rowCounts = new Array(height).fill(0);
  const rowMinX = new Array(height).fill(Infinity);
  const rowMaxX = new Array(height).fill(-Infinity);

  for (const idx of component.pixels) {
    const x = idx % cw;
    const y = Math.floor(idx / cw);
    const row = y - component.minY;
    rowCounts[row]++;
    if (x < rowMinX[row]) rowMinX[row] = x;
    if (x > rowMaxX[row]) rowMaxX[row] = x;
  }

  return { rowCounts, rowMinX, rowMaxX, baseY: component.minY };
}

function boundsForRows(rowData, minY, maxY) {
  let minX = Infinity;
  let maxX = -Infinity;
  let found = false;

  for (let y = minY; y <= maxY; y++) {
    const row = y - rowData.baseY;
    if (row < 0 || row >= rowData.rowCounts.length || rowData.rowCounts[row] === 0) continue;
    if (rowData.rowMinX[row] < minX) minX = rowData.rowMinX[row];
    if (rowData.rowMaxX[row] > maxX) maxX = rowData.rowMaxX[row];
    found = true;
  }

  if (!found) return null;
  return { minX, maxX, minY, maxY };
}

function findDensityCliffCutoff(rowData, minY, maxY, cfg) {
  const density = [];
  for (let y = minY; y <= maxY; y++) {
    const row = y - rowData.baseY;
    density.push({ row: y, value: rowData.rowCounts[row] || 0 });
  }

  const startIdx = Math.floor(density.length / 2);
  let bestDrop = 0;
  let dropRow = maxY;
  for (let i = startIdx; i < density.length - 1; i++) {
    if (density[i].value <= 0) continue;
    const drop = (density[i].value - density[i + 1].value) / density[i].value;
    if (drop > bestDrop && drop >= cfg.SKIN_CLIFF_THRESHOLD) {
      bestDrop = drop;
      dropRow = density[i].row;
    }
  }

  return dropRow;
}

function measureComponentTaper(component, cw) {
  const rowData = buildComponentRowData(component, cw);
  const height = rowData.rowCounts.length;
  if (height <= 2) return 0.5;

  const band = Math.max(1, Math.floor(height * 0.35));
  let topWidth = 0;
  let topRows = 0;
  let bottomWidth = 0;
  let bottomRows = 0;

  for (let i = 0; i < band; i++) {
    if (rowData.rowCounts[i] > 0) {
      topWidth += rowData.rowMaxX[i] - rowData.rowMinX[i] + 1;
      topRows++;
    }
  }
  for (let i = height - band; i < height; i++) {
    if (i >= 0 && rowData.rowCounts[i] > 0) {
      bottomWidth += rowData.rowMaxX[i] - rowData.rowMinX[i] + 1;
      bottomRows++;
    }
  }

  if (topRows === 0 || bottomRows === 0) return 0.5;
  const ratio = (bottomWidth / bottomRows) / Math.max(topWidth / topRows, 1);
  return clamp01(1 - Math.abs(ratio - 0.85) / 0.55);
}

function getSkinPixelWeight(y, ch, hasEdge, cfg) {
  let weight = 1.0;
  if (cfg.SKIN_VERTICAL_WEIGHT_ENABLED) {
    const vertFactor = 1.0 - cfg.SKIN_VERTICAL_WEIGHT_DECAY
      * (y / Math.max(ch - 1, 1));
    weight *= Math.max(0.1, vertFactor);
  }
  if (cfg.SKIN_EDGE_BONUS_ENABLED && hasEdge) {
    weight += cfg.SKIN_EDGE_BONUS_WEIGHT;
  }
  return weight;
}

function scoreAspect(aspect, idealAspect) {
  const diff = Math.abs(Math.log(aspect / idealAspect));
  return clamp01(1 - diff / Math.log(1.9));
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
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
