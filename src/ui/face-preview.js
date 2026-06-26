/**
 * @file Face preview & test modal — lets the user preview post-mutation output,
 * inspect face detection geometry, and push custom images to the live camera feed.
 *
 * Features:
 *   - Real-time mutation preview (canvas render of mutateImageWithMeta output)
 *   - Per-mutation detail readout (brightness, contrast, flip, rotation, etc.)
 *   - Face detection visualization (bounding boxes, crop rect, attention point)
 *   - Image navigation (prev / next / random) with optional pin-to-lock
 *   - Push-to-camera: replace the live fake-stream image without tearing down the stream
 */

import { icons } from './icons.js';
import {
  listEntries,
  getImageData,
  getOriginalImageData,
  getImageStats,
  getImageQualityTier,
  mutateImageWithMeta,
} from '../pool/image-pool.js';
import { detectFacesDebug } from '../utils/face-detect.js';
import { pushImageToActiveStream } from '../core/video-interceptor.js';
import { IMAGE_POOL_CONFIG, FACE_DETECT_CONFIG } from '../config.js';
import { debug } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Modal state
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} FpState
 * @property {boolean}          pinned          — lock to current image ID
 * @property {number}           pinnedId        — the locked image ID (only valid when pinned)
 * @property {number}           currentIndex    — index into pool entries
 * @property {{dataUrl:string, mutations:Array}|null} currentMutated
 * @property {{faces:Array,tier:string,attentionPoint:{x,y},cropRect:Object}|null} detectionResult
 */

/** @type {FpState} */
let fpState = {
  pinned: false,
  pinnedId: -1,
  currentIndex: 0,
  currentMutated: null,
  detectionResult: null,
};

/** Current active DOM references. */
let fpModal = null;
let fpOrigImage = null; // Cached original Image element for face detection

/**
 * Are we currently inside a render cycle?  Used to debounce rapid clicks.
 * @type {boolean}
 */
let _rendering = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TIER_LABELS = {
  skin: '🎨 肤色启发式',
  fallback: '📐 固定偏置',
};

const TIER_CSS = {
  skin: 'fp-tier-skin',
  fallback: 'fp-tier-fallback',
};

/** Escape HTML text. */
function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------------------------------------------------------------------------
// Render: mutation canvas
// ---------------------------------------------------------------------------

/**
 * Render the mutated image onto the preview canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {string} dataUrl
 */
function renderMutatedCanvas(canvas, dataUrl) {
  const img = new Image();
  img.onload = () => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#11111b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  img.src = dataUrl;
}

// ---------------------------------------------------------------------------
// Render: face detection canvas (original image + overlay)
// ---------------------------------------------------------------------------

/**
 * Draw the original image with face-detection overlay:
 *   - Green rectangles: detected face bounding boxes
 *   - Yellow rectangle: crop region
 *   - Red dot: attention point
 *   - Semi-transparent dark mask outside crop region
 *
 * @param {HTMLCanvasElement} canvas - target canvas (max ~480px wide)
 * @param {HTMLImageElement} img - original source image
 * @param {{faces:Array|null, tier:string, attentionPoint:{x:number,y:number}|null, cropRect:{sx,sy,sw,sh}|null}} det
 */
function renderDetectionCanvas(canvas, img, det) {
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;

  // Fit into display canvas while preserving aspect ratio
  const maxW = canvas.width;
  const maxH = canvas.height;
  const scale = Math.min(maxW / srcW, maxH / srcH, 1);
  const dispW = Math.round(srcW * scale);
  const dispH = Math.round(srcH * scale);
  const dx = Math.round((maxW - dispW) / 2);
  const dy = Math.round((maxH - dispH) / 2);

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, maxW, maxH);

  // Background fill
  ctx.fillStyle = '#11111b';
  ctx.fillRect(0, 0, maxW, maxH);

  // Draw source image scaled to fit
  ctx.drawImage(img, dx, dy, dispW, dispH);

  if (!det) return;

  // Helper: source → display coordinates
  const toDisp = (sx, sy) => ({
    x: dx + sx * scale,
    y: dy + sy * scale,
  });
  const toDispDim = (sw, sh) => ({
    w: sw * scale,
    h: sh * scale,
  });

  // ---- Face bounding boxes (green) ----
  if (det.faces && det.faces.length > 0) {
    ctx.strokeStyle = 'rgba(166, 227, 161, 0.85)'; // Catppuccin green
    ctx.lineWidth = 2;
    for (const f of det.faces) {
      const d = toDisp(f.x, f.y);
      const dim = toDispDim(f.width, f.height);
      ctx.strokeRect(d.x, d.y, dim.w, dim.h);
    }
  }

  // ---- Crop rectangle (yellow) ----
  if (det.cropRect) {
    const { sx, sy, sw, sh } = det.cropRect;

    const cd = toDisp(sx, sy);
    const cdim = toDispDim(sw, sh);

    // Dim everything outside the crop rectangle via evenodd clip
    ctx.save();
    ctx.beginPath();
    ctx.rect(dx, dy, dispW, dispH);
    ctx.rect(cd.x, cd.y, cdim.w, cdim.h);
    ctx.clip('evenodd');
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(dx, dy, dispW, dispH);
    ctx.restore();

    // Yellow dashed border around crop region
    ctx.strokeStyle = 'rgba(249, 226, 175, 0.9)'; // Catppuccin yellow
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(cd.x, cd.y, cdim.w, cdim.h);
    ctx.setLineDash([]);
  }

  // ---- Attention point (red dot) ----
  if (det.attentionPoint) {
    const ap = toDisp(det.attentionPoint.x, det.attentionPoint.y);
    ctx.fillStyle = 'rgba(243, 139, 168, 0.9)'; // Catppuccin red
    ctx.beginPath();
    ctx.arc(ap.x, ap.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Render: info panel (mutations, stats, tier)
// ---------------------------------------------------------------------------

/**
 * Populate the info panel with current state.
 * @param {HTMLElement} infoEl   - .bfw-fp-info container
 * @param {Object} entry         - pool entry
 * @param {Array}  mutations     - from mutateImageWithMeta
 * @param {{tier:string, faces:Array}|null} det - detection result
 */
function renderInfoPanel(infoEl, entry, mutations, det) {
  const stats = getImageStats(entry.id);
  const tier = getImageQualityTier(entry.id);
  const tierLabels = { high: '高成功率', neutral: '中性', low: '低成功率' };
  const tierCss = { high: 'fp-quality-high', neutral: 'fp-quality-neutral', low: 'fp-quality-low' };

  let statsHtml = '';
  if (stats && stats.totalUses > 0) {
    const rate = stats.totalUses > 0
      ? Math.round((stats.successes / stats.totalUses) * 100)
      : 0;
    statsHtml = `
      <div class="fp-info-stats">
        <div class="fp-stat"><span class="fp-stat-label">使用</span><span class="fp-stat-val">${stats.totalUses}</span></div>
        <div class="fp-stat"><span class="fp-stat-label">成功</span><span class="fp-stat-val success">${stats.successes}</span></div>
        <div class="fp-stat"><span class="fp-stat-label">失败</span><span class="fp-stat-val fail">${stats.failures}</span></div>
        <div class="fp-stat"><span class="fp-stat-label">成功率</span><span class="fp-stat-val ${rate >= 50 ? 'success' : 'fail'}">${rate}%</span></div>
      </div>`;
  } else {
    statsHtml = '<div class="fp-info-stats"><div class="fp-stat-empty">暂无使用数据</div></div>';
  }

  let mutHtml = '';
  if (mutations && mutations.length > 0) {
    mutHtml = `<div class="fp-mutations-title">本次突变</div><div class="fp-mutations-list">`
      + mutations.map((m) => `<span class="fp-mut-tag" title="${esc(m.type)}">${esc(m.label)}: ${esc(m.value)}</span>`).join('')
      + '</div>';
  } else {
    mutHtml = '<div class="fp-mutations-title">本次突变</div><div class="fp-mutations-list"><span class="fp-mut-tag muted">无变化</span></div>';
  }

  let detectHtml = '';
  if (det) {
    detectHtml = `
      <div class="fp-detect-summary">
        <span class="fp-detect-tier ${TIER_CSS[det.tier]}">${TIER_LABELS[det.tier]}</span>
        ${det.faces && det.faces.length > 0
          ? `<span class="fp-detect-count">${det.faces.length} 个人脸</span>`
          : '<span class="fp-detect-count none">未检测到人脸</span>'}
      </div>`;
  }

  infoEl.innerHTML = `
    <div class="fp-info-name" title="${esc(entry.name)}">${esc(entry.name)}</div>
    <div class="fp-info-id-row">
      <span class="fp-info-id">#${entry.id}</span>
      <span class="fp-quality-tier ${tierCss[tier]}">${tierLabels[tier]}</span>
      ${fpState.pinned ? '<span class="fp-pinned-badge">📌 已固定</span>' : ''}
    </div>
    ${statsHtml}
    <div class="fp-info-section">
      ${mutHtml}
    </div>
    <div class="fp-info-section">
      <div class="fp-section-title">人脸检测</div>
      ${detectHtml}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Core: load & render for a given pool entry
// ---------------------------------------------------------------------------

/**
 * Load the stored image, run mutations + face detection, and update all UI.
 *
 * @param {Object}          entry  - pool entry
 * @param {HTMLCanvasElement} mutCanvas
 * @param {HTMLCanvasElement} detCanvas
 * @param {HTMLElement}     infoEl
 */
async function renderForEntry(entry, mutCanvas, detCanvas, infoEl) {
  if (_rendering) return;
  _rendering = true;

  // Show loading state
  const ctx = mutCanvas.getContext('2d');
  ctx.fillStyle = '#11111b';
  ctx.fillRect(0, 0, mutCanvas.width, mutCanvas.height);
  ctx.fillStyle = '#6c7086';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('加载中…', mutCanvas.width / 2, mutCanvas.height / 2);

  infoEl.innerHTML = '<div class="fp-info-loading">加载中…</div>';

  try {
    // 1. Load stored image data
    const dataUrl = await getImageData(entry.id);
    if (!dataUrl) {
      infoEl.innerHTML = '<div class="fp-info-loading error">图片数据丢失</div>';
      _rendering = false;
      return;
    }

    // 2. Apply mutations
    let mutated, mutations;
    try {
      const result = await mutateImageWithMeta(dataUrl);
      mutated = result.dataUrl;
      mutations = result.mutations;
    } catch (e) {
      // Mutation failed — use clean copy
      mutated = dataUrl;
      mutations = [];
      debug('Face preview: mutation failed, using clean copy:', e?.message || e);
    }
    fpState.currentMutated = { dataUrl: mutated, mutations };

    // 3. Load original image for face detection
    const origDataUrl = await getOriginalImageData(entry.id);
    if (origDataUrl) {
      fpOrigImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load original'));
        img.src = origDataUrl;
      });
    } else {
      // Fall back to cropped image
      fpOrigImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = dataUrl;
      });
    }

    // 4. Run face detection debug
    let detectionResult;
    try {
      detectionResult = await detectFacesDebug(fpOrigImage);
    } catch (e) {
      debug('Face preview: detection debug failed:', e?.message || e);
      detectionResult = null;
    }
    fpState.detectionResult = detectionResult;

    // 5. Render all canvases
    renderMutatedCanvas(mutCanvas, mutated);
    if (detCanvas) renderDetectionCanvas(detCanvas, fpOrigImage, detectionResult);

    // 6. Update info panel
    renderInfoPanel(infoEl, entry, mutations, detectionResult);

    // Update toolbar pin button state
    updatePinButton();
    updateNavButtons();
  } catch (e) {
    infoEl.innerHTML = `<div class="fp-info-loading error">加载失败: ${esc(e?.message || '未知错误')}</div>`;
    debug('Face preview: render failed:', e);
  } finally {
    _rendering = false;
  }
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function getCurrentEntry() {
  const entries = listEntries();
  if (entries.length === 0) return null;
  const idx = Math.min(fpState.currentIndex, entries.length - 1);
  fpState.currentIndex = Math.max(0, idx);
  return entries[fpState.currentIndex];
}

async function navigateTo(direction) {
  const entries = listEntries();
  if (entries.length === 0) return;

  if (fpState.pinned) {
    // Still pinned — keep same image, no navigation
    return;
  }

  if (direction === 'prev') {
    fpState.currentIndex = (fpState.currentIndex - 1 + entries.length) % entries.length;
  } else if (direction === 'next') {
    fpState.currentIndex = (fpState.currentIndex + 1) % entries.length;
  } else if (direction === 'random') {
    fpState.currentIndex = Math.floor(Math.random() * entries.length);
  }

  const entry = entries[fpState.currentIndex];
  if (!entry) return;

  const mutCanvas = fpModal?.querySelector('.bfw-fp-mut-canvas');
  const detCanvas = fpModal?.querySelector('.bfw-fp-detect-canvas');
  const infoEl = fpModal?.querySelector('.bfw-fp-info');

  if (mutCanvas && infoEl) {
    await renderForEntry(entry, mutCanvas, detCanvas, infoEl);
  }
}

/**
 * Re-apply mutations.  Behaviour depends on pin state:
 *   - NOT pinned: pick a RANDOM new image, then apply mutations (full refresh).
 *   - Pinned:     keep the SAME image, only re-randomize the mutations.
 *
 * The pin feature exists precisely for this case — "I want to test different
 * mutation parameters on this specific face without switching images."
 */
async function reMutate() {
  if (_rendering) return;

  if (!fpState.pinned) {
    // Full refresh: random image → mutations → face detection
    await navigateTo('random');
    return;
  }

  // Pinned: same image, new mutations, keep detection result
  const entry = getCurrentEntry();
  if (!entry) return;

  const mutCanvas = fpModal?.querySelector('.bfw-fp-mut-canvas');
  const infoEl = fpModal?.querySelector('.bfw-fp-info');

  if (mutCanvas && infoEl) {
    try {
      const dataUrl = await getImageData(entry.id);
      if (!dataUrl) return;

      let mutated, mutations;
      try {
        const result = await mutateImageWithMeta(dataUrl);
        mutated = result.dataUrl;
        mutations = result.mutations;
      } catch (e) {
        mutated = dataUrl;
        mutations = [];
      }
      fpState.currentMutated = { dataUrl: mutated, mutations };

      renderMutatedCanvas(mutCanvas, mutated);
      renderInfoPanel(infoEl, entry, mutations, fpState.detectionResult);
    } catch (e) {
      debug('Face preview: re-mutate failed:', e);
    }
  }
}

async function togglePin() {
  fpState.pinned = !fpState.pinned;

  const entry = getCurrentEntry();
  if (!entry) return;

  if (fpState.pinned) {
    fpState.pinnedId = entry.id;
  } else {
    fpState.pinnedId = -1;
  }

  updatePinButton();
  updateNavButtons();

  // Re-render info to show/hide the pin badge
  const infoEl = fpModal?.querySelector('.bfw-fp-info');
  if (infoEl && fpState.currentMutated) {
    renderInfoPanel(infoEl, entry, fpState.currentMutated.mutations, fpState.detectionResult);
  }
}

async function pushToCamera() {
  if (!fpState.currentMutated) return;

  const btn = fpModal?.querySelector('.bfw-fp-btn-push');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `${icons.clock} 推送中…`;
  }

  try {
    const ok = await pushImageToActiveStream(fpState.currentMutated.dataUrl);
    if (btn) {
      if (ok) {
        btn.innerHTML = `${icons.checkCircle} 已推送`;
        setTimeout(() => {
          btn.innerHTML = `${icons.send} 推送到摄像头`;
          btn.disabled = false;
        }, 2000);
      } else {
        btn.innerHTML = `${icons.send} 无活动流`;
        setTimeout(() => {
          btn.innerHTML = `${icons.send} 推送到摄像头`;
          btn.disabled = false;
        }, 2000);
      }
    }
  } catch (e) {
    if (btn) {
      btn.innerHTML = `${icons.send} 推送失败`;
      setTimeout(() => {
        btn.innerHTML = `${icons.send} 推送到摄像头`;
        btn.disabled = false;
      }, 2000);
    }
  }
}

function updatePinButton() {
  const pinBtn = fpModal?.querySelector('.bfw-fp-btn-pin');
  const mutBtn = fpModal?.querySelector('.bfw-fp-btn-remutate');

  if (pinBtn) {
    if (fpState.pinned) {
      pinBtn.classList.add('active');
      pinBtn.innerHTML = `${icons.pinFilled} 已固定`;
      pinBtn.title = '取消固定 — 恢复随机选择图片';
    } else {
      pinBtn.classList.remove('active');
      pinBtn.innerHTML = `${icons.pin} 固定此图`;
      pinBtn.title = '固定当前图片 — 只对此图重新突变';
    }
  }

  if (mutBtn) {
    if (fpState.pinned) {
      mutBtn.innerHTML = `${icons.sparkles} 重新突变`;
      mutBtn.title = '对此图重新应用随机突变 (图片不变)';
    } else {
      mutBtn.innerHTML = `${icons.shuffle} 随机换图`;
      mutBtn.title = '随机换一张图片并应用突变';
    }
  }
}

function updateNavButtons() {
  const prevBtn = fpModal?.querySelector('.bfw-fp-btn-prev');
  const nextBtn = fpModal?.querySelector('.bfw-fp-btn-next');
  const randomBtn = fpModal?.querySelector('.bfw-fp-btn-random');
  if (prevBtn) prevBtn.disabled = fpState.pinned;
  if (nextBtn) nextBtn.disabled = fpState.pinned;
  if (randomBtn) randomBtn.disabled = fpState.pinned;
}

// ---------------------------------------------------------------------------
// Detection panel toggle
// ---------------------------------------------------------------------------

function toggleDetectionPanel() {
  const section = fpModal?.querySelector('.bfw-fp-detect-section');
  if (!section) return;

  const isOpen = section.classList.toggle('open');
  const chevron = section.querySelector('.bfw-fp-detect-chevron');
  if (chevron) {
    chevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
  }

  // Trigger render on first open if needed
  if (isOpen && fpOrigImage && fpState.detectionResult) {
    const detCanvas = section.querySelector('.bfw-fp-detect-canvas');
    if (detCanvas) {
      renderDetectionCanvas(detCanvas, fpOrigImage, fpState.detectionResult);
    }
  }
}

// ---------------------------------------------------------------------------
// DOM factory
// ---------------------------------------------------------------------------

function createModalDOM() {
  const overlay = document.createElement('div');
  overlay.className = 'bfw-fp-overlay';

  const targetW = IMAGE_POOL_CONFIG.OUTPUT_WIDTH;
  const targetH = IMAGE_POOL_CONFIG.OUTPUT_HEIGHT;

  overlay.innerHTML = `
    <div class="bfw-fp-modal">
      <div class="bfw-fp-header">
        <span class="bfw-fp-title">${icons.sparkles} 人脸预览与测试</span>
        <button class="bfw-fp-close" title="关闭">${icons.x}</button>
      </div>

      <div class="bfw-fp-body">
        <div class="bfw-fp-main">
          <canvas class="bfw-fp-mut-canvas" width="${targetW}" height="${targetH}"></canvas>
          <div class="bfw-fp-info">
            <div class="fp-info-loading">加载中…</div>
          </div>
        </div>

        <div class="bfw-fp-detect-section">
          <div class="bfw-fp-detect-header">
            <span class="bfw-fp-detect-header-text">
              ${icons.crosshair} 人脸检测详情
            </span>
            <span class="bfw-fp-detect-chevron">${icons.chevronDown}</span>
          </div>
          <div class="bfw-fp-detect-body">
            <div class="bfw-fp-detect-wrapper">
              <canvas class="bfw-fp-detect-canvas" width="480" height="360"></canvas>
            </div>
          </div>
        </div>
      </div>

      <div class="bfw-fp-toolbar">
        <div class="bfw-fp-toolbar-left">
          <button class="bfw-fp-btn bfw-fp-btn-prev" title="上一张">${icons.chevronLeft}</button>
          <button class="bfw-fp-btn bfw-fp-btn-next" title="下一张">${icons.chevronRight}</button>
          <button class="bfw-fp-btn bfw-fp-btn-random" title="随机选一张">${icons.shuffle}</button>
          <span class="bfw-fp-toolbar-sep"></span>
          <button class="bfw-fp-btn bfw-fp-btn-pin" title="固定当前图片">${icons.pin} 固定此图</button>
        </div>
        <div class="bfw-fp-toolbar-right">
          <button class="bfw-fp-btn bfw-fp-btn-remutate" title="重新应用随机突变">${icons.sparkles} 重新突变</button>
          <button class="bfw-fp-btn bfw-fp-btn-push bfw-fp-btn-primary" title="将当前突变图推送到活动的摄像头流">${icons.send} 推送到摄像头</button>
        </div>
      </div>
    </div>
  `;

  return overlay;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Open the face preview & test modal.
 */
export function openFacePreview() {
  // Already open? close and re-open to refresh
  if (fpModal) closeFacePreview();

  const entries = listEntries();
  if (entries.length === 0) {
    // No images in pool — nothing to preview
    return;
  }

  // Reset state
  fpState = {
    pinned: false,
    pinnedId: -1,
    currentIndex: Math.min(fpState.currentIndex, entries.length - 1),
    currentMutated: null,
    detectionResult: null,
  };
  fpOrigImage = null;
  _rendering = false;

  // Build and attach DOM
  fpModal = createModalDOM();
  document.body.appendChild(fpModal);

  // Cache element references
  const mutCanvas = fpModal.querySelector('.bfw-fp-mut-canvas');
  const detCanvas = fpModal.querySelector('.bfw-fp-detect-canvas');
  const infoEl = fpModal.querySelector('.bfw-fp-info');

  // Bind close
  const closeBtn = fpModal.querySelector('.bfw-fp-close');
  closeBtn.addEventListener('click', closeFacePreview);

  // Close via backdrop click
  fpModal.addEventListener('click', (e) => {
    if (e.target === fpModal) closeFacePreview();
  });

  // Close via Escape
  const onEsc = (e) => {
    if (e.key === 'Escape') {
      // Don't close if an inner modal (e.g. crop editor) is open
      if (document.querySelector('.bfw-ce-overlay') || document.querySelector('.bfw-thumb-stats-popup')) return;
      closeFacePreview();
    }
  };
  document.addEventListener('keydown', onEsc);
  fpModal._onEsc = onEsc;

  // Toolbar button bindings
  fpModal.querySelector('.bfw-fp-btn-prev').addEventListener('click', () => navigateTo('prev'));
  fpModal.querySelector('.bfw-fp-btn-next').addEventListener('click', () => navigateTo('next'));
  fpModal.querySelector('.bfw-fp-btn-random').addEventListener('click', () => navigateTo('random'));
  fpModal.querySelector('.bfw-fp-btn-pin').addEventListener('click', togglePin);
  fpModal.querySelector('.bfw-fp-btn-remutate').addEventListener('click', reMutate);
  fpModal.querySelector('.bfw-fp-btn-push').addEventListener('click', pushToCamera);

  // Detection panel toggle
  fpModal.querySelector('.bfw-fp-detect-header').addEventListener('click', toggleDetectionPanel);

  // Initial render
  const entry = entries[fpState.currentIndex];
  if (entry && mutCanvas && infoEl) {
    renderForEntry(entry, mutCanvas, detCanvas, infoEl);
  }
}

/**
 * Close the face preview modal.
 */
export function closeFacePreview() {
  if (!fpModal) return;

  if (fpModal._onEsc) {
    document.removeEventListener('keydown', fpModal._onEsc);
  }
  fpModal.remove();
  fpModal = null;
  fpOrigImage = null;
  _rendering = false;
}
