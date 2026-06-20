/**
 * @file Crop editor — modal UI for manually adjusting image crop rectangles.
 *
 * Displays the original un-cropped image with a draggable, resizable 4:3
 * crop overlay.  Handles 8 resize grips (4 corners + 4 edge midpoints)
 * with aspect-ratio locking.  A live preview thumbnail shows the result
 * in real time.  On save, the re-cropped image is persisted back to the
 * image pool via updateCrop().
 */

import { CROP_EDITOR_CONFIG } from '../config.js';
import { getOriginalImageData, updateCrop } from '../pool/image-pool.js';
import { smartCropToStandard } from '../utils/face-detect.js';
import { icons } from './icons.js';

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

/** Current modal root — only one editor can be open at a time. */
let activeModal = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Open the crop editor for a given pool entry.
 *
 * @param {number} entryId
 * @param {import('../pool/image-pool.js').PoolEntry} entry
 * @param {Function} onSaved — callback when crop is saved (for refreshing pool UI)
 */
export async function openCropEditor(entryId, entry, onSaved) {
  // Close any existing editor
  if (activeModal) closeCropEditor();

  const cfg = CROP_EDITOR_CONFIG;

  // Validate that we have crop params
  if (!entry.cropParams) {
    // This shouldn't happen if the UI only enables click for entries with cropParams,
    // but guard defensively.
    return;
  }

  // Load original image
  const origDataUrl = await getOriginalImageData(entryId);
  if (!origDataUrl) {
    return;
  }

  // Decode original
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Failed to decode original image'));
    el.src = origDataUrl;
  });

  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;

  // The crop params were computed against the full-resolution original.
  // The stored original is compressed (max 1200px).  Scale the crop rect
  // to match the compressed image's coordinate space.
  /** @type {{sx:number,sy:number,sw:number,sh:number}} */
  let crop;
  const storedW = entry.origWidth || 0;
  const storedH = entry.origHeight || 0;
  if (storedW > 0 && storedH > 0 && (srcW !== storedW || srcH !== storedH)) {
    const scaleX = srcW / storedW;
    const scaleY = srcH / storedH;
    crop = {
      sx: entry.cropParams.sx * scaleX,
      sy: entry.cropParams.sy * scaleY,
      sw: entry.cropParams.sw * scaleX,
      sh: entry.cropParams.sh * scaleY,
    };
  } else {
    crop = { ...entry.cropParams };
  }

  // Compute display scale — fit within MAX_DISPLAY_SIZE
  const scale = Math.min(cfg.MAX_DISPLAY_SIZE / srcW, cfg.MAX_DISPLAY_SIZE / srcH, 1);
  const dispW = Math.round(srcW * scale);
  const dispH = Math.round(srcH * scale);

  // Build modal DOM
  const modal = createModalDOM(dispW, dispH, entry);
  activeModal = modal;
  document.body.appendChild(modal);

  // Cache references
  const displayImg = modal.querySelector('.bfw-ce-display-img');
  const cropBox = modal.querySelector('.bfw-ce-crop-box');
  const previewCanvas = modal.querySelector('.bfw-ce-preview-canvas');
  const previewCtx = previewCanvas.getContext('2d');
  const infoEl = modal.querySelector('.bfw-ce-info');

  displayImg.src = origDataUrl;

  // State for mouse interactions
  /** @type {'move'|'nw'|'ne'|'sw'|'se'|'n'|'s'|'w'|'e'|null} */
  let dragMode = null;
  let dragStart = { x: 0, y: 0, crop: null };

  // -----------------------------------------------------------------------
  // Coordinate helpers
  // -----------------------------------------------------------------------

  /** Convert source-pixel coords to display-space coords */
  function srcToDisp(r) {
    return {
      x: Math.round(r.sx * scale),
      y: Math.round(r.sy * scale),
      w: Math.round(r.sw * scale),
      h: Math.round(r.sh * scale),
    };
  }

  /** Convert display-space coords to source-pixel coords */
  function dispToSrc(d) {
    return {
      sx: d.x / scale,
      sy: d.y / scale,
      sw: d.w / scale,
      sh: d.h / scale,
    };
  }

  /** Clamp crop rect to source image bounds and ensure minimum size */
  function clampCrop(r) {
    const minPx = cfg.MIN_CROP_PX;
    let sx = Math.max(0, Math.min(r.sx, srcW - minPx));
    let sy = Math.max(0, Math.min(r.sy, srcH - minPx));
    let sw = Math.max(minPx, Math.min(r.sw, srcW - sx));
    let sh = Math.max(minPx, Math.min(r.sh, srcH - sy));

    // Re-enforce target ratio: adjust width to match height * ratio
    // Prefer shrinking width (more forgiving) over shrinking height
    const targetRatio = cfg.TARGET_RATIO;
    const adjustedW = sh * targetRatio;
    if (adjustedW <= srcW - sx) {
      sw = adjustedW;
    } else {
      sw = srcW - sx;
      sh = sw / targetRatio;
      if (sh > srcH - sy) {
        sh = srcH - sy;
        sw = sh * targetRatio;
      }
    }

    // Re-clamp
    if (sx + sw > srcW) { sx = srcW - sw; }
    if (sy + sh > srcH) { sy = srcH - sh; }
    if (sx < 0) { sx = 0; }
    if (sy < 0) { sy = 0; }

    return { sx, sy, sw, sh };
  }

  // -----------------------------------------------------------------------
  // UI update
  // -----------------------------------------------------------------------

  function updateCropBox() {
    const d = srcToDisp(crop);
    cropBox.style.left = `${d.x}px`;
    cropBox.style.top = `${d.y}px`;
    cropBox.style.width = `${d.w}px`;
    cropBox.style.height = `${d.h}px`;
  }

  /** Draw the crop result directly onto the preview canvas — no toDataURL. */
  function drawPreview() {
    const pw = previewCanvas.width;
    const ph = previewCanvas.height;
    previewCtx.clearRect(0, 0, pw, ph);
    previewCtx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, pw, ph);
  }

  function updateInfo() {
    if (infoEl) {
      infoEl.textContent = `${crop.sw.toFixed(0)}×${crop.sh.toFixed(0)} px`;
    }
  }

  /** rAF-based throttling — at most one visual update per animation frame. */
  let _rafPending = null;
  let _needsInfoOnly = false;

  function refreshUI(infoOnly) {
    if (infoOnly) {
      // Info-only updates (e.g. dimension readout) skip crop box + preview
      _needsInfoOnly = true;
    }
    if (_rafPending) return;
    _rafPending = requestAnimationFrame(() => {
      _rafPending = null;
      updateCropBox();
      if (!_needsInfoOnly) drawPreview();
      _needsInfoOnly = false;
      updateInfo();
    });
  }

  function flushUI() {
    if (_rafPending) {
      cancelAnimationFrame(_rafPending);
      _rafPending = null;
    }
    updateCropBox();
    drawPreview();
    updateInfo();
  }

  // -----------------------------------------------------------------------
  // Mouse handlers (attached to the display wrapper)
  // -----------------------------------------------------------------------

  const wrapper = modal.querySelector('.bfw-ce-display-wrapper');

  function getEventPos(e) {
    // Use cached rect during active drag to avoid layout thrashing
    const rect = _dragRect || wrapper.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  /** Cached bounding rect set at mousedown, cleared on mouseup */
  let _dragRect = null;

  /**
   * Determine which handle the pointer is over (in display coordinates).
   * Returns null if not on any handle.
   */
  function hitTestHandle(dx, dy) {
    const d = srcToDisp(crop);
    const radius = cfg.HANDLE_RADIUS;

    // Corners
    if (Math.abs(dx - d.x) <= radius && Math.abs(dy - d.y) <= radius) return 'nw';
    if (Math.abs(dx - (d.x + d.w)) <= radius && Math.abs(dy - d.y) <= radius) return 'ne';
    if (Math.abs(dx - d.x) <= radius && Math.abs(dy - (d.y + d.h)) <= radius) return 'sw';
    if (Math.abs(dx - (d.x + d.w)) <= radius && Math.abs(dy - (d.y + d.h)) <= radius) return 'se';

    // Edge midpoints
    if (Math.abs(dx - (d.x + d.w / 2)) <= radius && Math.abs(dy - d.y) <= radius) return 'n';
    if (Math.abs(dx - (d.x + d.w / 2)) <= radius && Math.abs(dy - (d.y + d.h)) <= radius) return 's';
    if (Math.abs(dx - d.x) <= radius && Math.abs(dy - (d.y + d.h / 2)) <= radius) return 'w';
    if (Math.abs(dx - (d.x + d.w)) <= radius && Math.abs(dy - (d.y + d.h / 2)) <= radius) return 'e';

    return null;
  }

  wrapper.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // Only left button
    const pos = getEventPos(e);
    const d = srcToDisp(crop);

    // Check if click is inside crop box
    const inBox = pos.x >= d.x && pos.x <= d.x + d.w
               && pos.y >= d.y && pos.y <= d.y + d.h;

    if (!inBox) return;

    // Check handles first
    const handle = hitTestHandle(pos.x, pos.y);
    dragMode = handle || 'move';
    dragStart = {
      x: pos.x,
      y: pos.y,
      crop: { ...crop },
    };

    e.preventDefault();
    e.stopPropagation();

    // Cache bounding rect for the duration of this drag
    _dragRect = wrapper.getBoundingClientRect();

    // Bind document-level listeners so drag continues outside the wrapper
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
  });

  function onDragMove(e) {
    if (!dragMode) return;
    const pos = getEventPos(e);
    const dx = (pos.x - dragStart.x) / scale;
    const dy = (pos.y - dragStart.y) / scale;
    const orig = dragStart.crop;
    const ratio = cfg.TARGET_RATIO;

    let newCrop;

    switch (dragMode) {
      case 'move': {
        newCrop = {
          sx: orig.sx + dx,
          sy: orig.sy + dy,
          sw: orig.sw,
          sh: orig.sh,
        };
        break;
      }
      // Corners — anchor opposite corner, adjust width then derive height from ratio
      case 'nw': {
        const newSW = orig.sw - dx;
        const newSH = newSW / ratio;
        newCrop = {
          sx: orig.sx + orig.sw - newSW,
          sy: orig.sy + orig.sh - newSH,
          sw: newSW,
          sh: newSH,
        };
        break;
      }
      case 'se': {
        const newSW = orig.sw + dx;
        newCrop = {
          sx: orig.sx,
          sy: orig.sy,
          sw: newSW,
          sh: newSW / ratio,
        };
        break;
      }
      case 'ne': {
        const newSW = orig.sw + dx;
        const newSH = newSW / ratio;
        newCrop = {
          sx: orig.sx,
          sy: orig.sy + orig.sh - newSH,
          sw: newSW,
          sh: newSH,
        };
        break;
      }
      case 'sw': {
        const newSW = orig.sw - dx;
        const newSH = newSW / ratio;
        newCrop = {
          sx: orig.sx + orig.sw - newSW,
          sy: orig.sy,
          sw: newSW,
          sh: newSH,
        };
        break;
      }
      // Edges — adjust one dimension, derive the other from ratio
      case 'n': {
        const newSH = orig.sh - dy;
        const newSW = newSH * ratio;
        newCrop = {
          sx: orig.sx + (orig.sw - newSW) / 2,
          sy: orig.sy + orig.sh - newSH,
          sw: newSW,
          sh: newSH,
        };
        break;
      }
      case 's': {
        const newSH = orig.sh + dy;
        const newSW = newSH * ratio;
        newCrop = {
          sx: orig.sx + (orig.sw - newSW) / 2,
          sy: orig.sy,
          sw: newSW,
          sh: newSH,
        };
        break;
      }
      case 'w': {
        const newSW = orig.sw - dx;
        const newSH = newSW / ratio;
        newCrop = {
          sx: orig.sx + orig.sw - newSW,
          sy: orig.sy + (orig.sh - newSH) / 2,
          sw: newSW,
          sh: newSH,
        };
        break;
      }
      case 'e': {
        const newSW = orig.sw + dx;
        const newSH = newSW / ratio;
        newCrop = {
          sx: orig.sx,
          sy: orig.sy + (orig.sh - newSH) / 2,
          sw: newSW,
          sh: newSH,
        };
        break;
      }
      default:
        return;
    }

    crop = clampCrop(newCrop);
    refreshUI();
  }

  function onDragEnd() {
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    _dragRect = null;
    dragMode = null;
    dragStart = null;
    wrapper.style.cursor = 'default';
  }

  // Hover cursor feedback (non-drag)
  wrapper.addEventListener('mousemove', (e) => {
    if (dragMode) return; // onDragMove handles active drag
    const pos = getEventPos(e);
    const d = srcToDisp(crop);
    const inBox = pos.x >= d.x && pos.x <= d.x + d.w
               && pos.y >= d.y && pos.y <= d.y + d.h;
    if (!inBox) {
      wrapper.style.cursor = 'default';
      return;
    }
    const handle = hitTestHandle(pos.x, pos.y);
    const cursors = {
      nw: 'nwse-resize', se: 'nwse-resize',
      ne: 'nesw-resize', sw: 'nesw-resize',
      n: 'ns-resize', s: 'ns-resize',
      w: 'ew-resize', e: 'ew-resize',
    };
    wrapper.style.cursor = cursors[handle] || 'move';
  });

  // -----------------------------------------------------------------------
  // Buttons
  // -----------------------------------------------------------------------

  // Reset to auto-detect
  const resetBtn = modal.querySelector('.bfw-ce-btn-reset');
  resetBtn.addEventListener('click', async () => {
    resetBtn.disabled = true;
    resetBtn.textContent = '检测中…';
    try {
      const originalImg = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('failed'));
        el.src = origDataUrl;
      });
      const { cropRect } = await smartCropToStandard(originalImg);
      crop = clampCrop(cropRect);
      flushUI();
    } catch (e) {
      // Keep current crop on failure
    } finally {
      resetBtn.disabled = false;
      resetBtn.textContent = '重新检测';
    }
  });

  // Save
  const saveBtn = modal.querySelector('.bfw-ce-btn-save');
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中…';
    try {
      const ok = await updateCrop(entryId, crop);
      if (ok && onSaved) onSaved();
    } finally {
      closeCropEditor();
    }
  });

  // Cancel
  const cancelBtn = modal.querySelector('.bfw-ce-btn-cancel');
  cancelBtn.addEventListener('click', () => closeCropEditor());

  // Close via backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeCropEditor();
  });

  // Close via Escape
  const onKey = (e) => {
    if (e.key === 'Escape') closeCropEditor();
  };
  document.addEventListener('keydown', onKey);
  modal._onKey = onKey;

  // Initial render
  flushUI();
}

/**
 * Close the active crop editor modal, if any.
 */
export function closeCropEditor() {
  if (!activeModal) return;

  if (activeModal._onKey) {
    document.removeEventListener('keydown', activeModal._onKey);
  }
  activeModal.remove();
  activeModal = null;
}

// ---------------------------------------------------------------------------
// DOM factory
// ---------------------------------------------------------------------------

/**
 * Build the crop editor modal DOM.
 *
 * @param {number} dispW  — image display width
 * @param {number} dispH  — image display height
 * @param {import('../pool/image-pool.js').PoolEntry} entry
 * @returns {HTMLElement}
 */
function createModalDOM(dispW, dispH, entry) {
  const modal = document.createElement('div');
  modal.className = 'bfw-ce-overlay';

  const hs = CROP_EDITOR_CONFIG.HANDLE_SIZE;
  const previewW = CROP_EDITOR_CONFIG.PREVIEW_SIZE;
  const previewH = Math.round(previewW / CROP_EDITOR_CONFIG.TARGET_RATIO);

  modal.innerHTML = `
    <div class="bfw-ce-modal" style="--ce-disp-w: ${dispW}px; --ce-disp-h: ${dispH}px;">
      <div class="bfw-ce-header">
        <span class="bfw-ce-title">裁剪编辑 — ${escapeHtml(entry.name)}</span>
        <button class="bfw-ce-close" title="关闭">${icons.x}</button>
      </div>
      <div class="bfw-ce-body">
        <div class="bfw-ce-main">
          <div class="bfw-ce-display-wrapper" style="width:${dispW}px;height:${dispH}px;">
            <img class="bfw-ce-display-img" draggable="false" />
            <div class="bfw-ce-crop-mask"></div>
            <div class="bfw-ce-crop-box">
              <div class="bfw-ce-handle bfw-ce-h-nw" style="width:${hs}px;height:${hs}px;"></div>
              <div class="bfw-ce-handle bfw-ce-h-ne" style="width:${hs}px;height:${hs}px;"></div>
              <div class="bfw-ce-handle bfw-ce-h-sw" style="width:${hs}px;height:${hs}px;"></div>
              <div class="bfw-ce-handle bfw-ce-h-se" style="width:${hs}px;height:${hs}px;"></div>
              <div class="bfw-ce-handle bfw-ce-h-n"  style="width:${hs}px;height:${hs}px;"></div>
              <div class="bfw-ce-handle bfw-ce-h-s"  style="width:${hs}px;height:${hs}px;"></div>
              <div class="bfw-ce-handle bfw-ce-h-w"  style="width:${hs}px;height:${hs}px;"></div>
              <div class="bfw-ce-handle bfw-ce-h-e"  style="width:${hs}px;height:${hs}px;"></div>
            </div>
          </div>
          <div class="bfw-ce-info"></div>
        </div>
        <div class="bfw-ce-sidebar">
          <div class="bfw-ce-preview-label">裁剪预览</div>
          <div class="bfw-ce-preview-box">
            <canvas class="bfw-ce-preview-canvas" width="${previewW}" height="${previewH}"></canvas>
          </div>
          <div class="bfw-ce-preview-size">400 × 300</div>
        </div>
      </div>
      <div class="bfw-ce-footer">
        <button class="bfw-ce-btn bfw-ce-btn-reset">重新检测</button>
        <div class="bfw-ce-footer-right">
          <button class="bfw-ce-btn bfw-ce-btn-cancel">取消</button>
          <button class="bfw-ce-btn bfw-ce-btn-save bfw-ce-btn-primary">保存</button>
        </div>
      </div>
    </div>
  `;

  return modal;
}

/** Escape HTML special characters. */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
