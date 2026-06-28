/**
 * @file UI event handlers — edge-drawer hover/pin, action buttons, image pool interactions.
 */

import { addImages, removeImage, clearPool, poolSize, poolCapacity, addImageFromDataURI } from '../pool/image-pool.js';
import { findVideoElement, captureFrame, isFrameUseful } from '../utils/video-capture.js';
import { IMAGE_POOL_CONFIG, VIDEO_CAPTURE_SELECTORS } from '../config.js';
import { getSetting, setSetting, onChange } from '../settings.js';
import { icons } from './icons.js';
import { refreshPoolUI, appendLog, setStatus, hideStatsPopup, showExportModal, showImportModal, closeIEModal } from './builder.js';
import { openFacePreview } from './face-preview.js';

// ---------------------------------------------------------------------------
// Edge-drawer behaviour — hover to reveal, pin to lock
// ---------------------------------------------------------------------------

/**
 * Bind edge-drawer click-toggle / pin behaviour.
 *
 * - Click the handle: toggle panel open / close.
 * - Pin button: toggles pinned state — when pinned the panel stays open and
 *   Escape won't close it.  Clicking the handle while pinned unpins and
 *   closes in one action.
 * - Hover no longer triggers open / close.
 *
 * @param {HTMLElement} panel - The panel root element (`.bfw-panel`)
 */
export function bindDrawer(panel) {
  const handle = panel.querySelector('.bfw-panel-handle');
  const pinBtn = panel.querySelector('.bfw-pin-btn');

  if (!handle || !pinBtn) return;

  // ---- Handle click: toggle open / close ----

  handle.addEventListener('click', () => {
    const isOpen = panel.classList.contains('open');

    if (isOpen) {
      // Close — also unpin if currently pinned
      panel.classList.remove('open', 'pinned');
      pinBtn.innerHTML = icons.pin;
      pinBtn.title = '固定面板';
    } else {
      panel.classList.add('open');
    }
  });

  // ---- Pin toggle ----

  pinBtn.addEventListener('click', () => {
    const isPinned = panel.classList.toggle('pinned');

    if (isPinned) {
      pinBtn.innerHTML = icons.pinFilled;
      pinBtn.title = '取消固定';
      // Ensure panel is open when pinning
      panel.classList.add('open');
    } else {
      pinBtn.innerHTML = icons.pin;
      pinBtn.title = '固定面板';
      // Don't close on unpin — user may just want to allow toggle again
    }
  });

  // ---- Click outside to close (non-pinned only) ----
  // Use capture phase so the check runs before innerHTML mutations in
  // panel-internal handlers (e.g. eye toggle replaces its SVG children).

  document.addEventListener('click', (e) => {
    if (!panel.classList.contains('open') || panel.classList.contains('pinned')) return;
    // Don't close on clicks inside the panel or the crop editor modal
    if (panel.contains(e.target) || e.target.closest('.bfw-ce-overlay, .bfw-thumb-stats-popup')) return;
    panel.classList.remove('open');
  }, true);

  // ---- Escape key (non-pinned only) ----

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('open') && !panel.classList.contains('pinned')) {
      // Don't close panel when a stats popup, crop editor, or face preview is open —
      // let their own Escape handlers dismiss them first.
      if (document.querySelector('.bfw-thumb-stats-popup') || document.querySelector('.bfw-ce-overlay') || document.querySelector('.bfw-fp-overlay')) return;
      panel.classList.remove('open');
    }
  });
}

// ---------------------------------------------------------------------------
// Action button bindings
// ---------------------------------------------------------------------------

/**
 * Bind action buttons inside the panel.
 * @param {HTMLElement} panel - The panel root element
 */
export function bindActions(panel) {
  const retryBtn = panel.querySelector('#bfw-btn-retry');
  const clearBtn = panel.querySelector('#bfw-btn-clear');

  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      // Dispatch a custom event that bubbles to document so the
      // auto-processor (which listens on document) can react.
      panel.dispatchEvent(new CustomEvent('bfw:retry', { bubbles: true }));
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const logArea = panel.querySelector('#bfw-log-area');
      if (logArea) logArea.innerHTML = '';
    });
  }
}

// ---------------------------------------------------------------------------
// Import / Export button bindings
// ---------------------------------------------------------------------------

/**
 * Bind import and export buttons in the data management section.
 * @param {HTMLElement} panel
 */
export function bindImportExport(panel) {
  const exportBtn = panel.querySelector('#bfw-btn-export-data');
  const importBtn = panel.querySelector('#bfw-btn-import-data');

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      showExportModal();
    });
  }

  if (importBtn) {
    importBtn.addEventListener('click', () => {
      showImportModal(panel);
    });
  }
}

// ---------------------------------------------------------------------------
// Settings toggle bindings
// ---------------------------------------------------------------------------

/**
 * Bind toggle switches in the settings section.
 * Syncs DOM state ↔ settings.js state and reacts to external changes.
 * @param {HTMLElement} panel
 */
export function bindSettings(panel) {
  // Map DOM IDs to settings keys
  const bindings = [
    { inputId: 'bfw-toggle-face-autoclick', key: 'faceAutoClick' },
    { inputId: 'bfw-toggle-video-replace', key: 'videoReplace' },
    { inputId: 'bfw-toggle-auto-compare', key: 'autoCompare' },
    { inputId: 'bfw-toggle-auto-course', key: 'autoCourse' },
    { inputId: 'bfw-toggle-disable-visibility-check', key: 'disableVisibilityCheck' },
  ];

  for (const { inputId, key } of bindings) {
    const input = panel.querySelector(`#${inputId}`);
    if (!input) continue;

    // Read settings state into DOM
    input.checked = getSetting(key, false);

    // User toggles → update settings
    input.addEventListener('change', () => {
      setSetting(key, input.checked);
      updateSettingUI(panel, key, input.checked);
    });

    // React to programmatic setting changes
    onChange(key, (val) => {
      input.checked = val;
      updateSettingUI(panel, key, val);
    });
  }

  // Initial UI state sync
  for (const { key } of bindings) {
    updateSettingUI(panel, key, getSetting(key, false));
  }

  // ---- Dynamic weight setting sync (button, not checkbox) ----
  onChange('dynamicWeight', (val) => {
    const weightBtn = panel.querySelector('#bfw-btn-weight');
    if (weightBtn) {
      weightBtn.classList.toggle('active', val);
      weightBtn.title = val
        ? '动态权重: 开 — 根据图片成功率自动调整选中概率'
        : '动态权重: 关 — 所有图片等概率随机选取';
    }
  });
}

/**
 * Update the visual state of a setting row when its value changes.
 * @param {HTMLElement} panel
 * @param {string} key
 * @param {boolean} value
 */
function updateSettingUI(panel, key, value) {
  const row = panel.querySelector(`.bfw-setting-row[data-setting="${key}"]`);
  if (!row) return;

  const toggleIcon = row.querySelector('.bfw-toggle-icon');
  if (toggleIcon) {
    toggleIcon.innerHTML = value ? icons.toggleOn : icons.toggleOff;
  }

  // Update status dot and text for settings
  if (key === 'faceAutoClick' || key === 'videoReplace' || key === 'autoCompare') {
    const fcOn = getSetting('faceAutoClick', true);
    const vrOn = getSetting('videoReplace', true);
    const acOn = getSetting('autoCompare', true);

    if (!fcOn && !vrOn) {
      setStatus(false, '已停止 — 所有功能已关闭');
    } else if (vrOn) {
      setStatus(true, '运行中 — 摄像头已替换');
    } else if (!fcOn) {
      setStatus(true, '运行中 — 仅替换画面 (自动点击已关闭)');
    } else if (!acOn) {
      setStatus(true, '运行中 — 拍照后暂停确认');
    } else {
      setStatus(true, '运行中 — 摄像头已替换');
    }
  }
}

// ---------------------------------------------------------------------------
// Image pool event bindings
// ---------------------------------------------------------------------------

/**
 * Set a transient status message in the pool section.
 * @param {HTMLElement} panel
 * @param {string} msg
 * @param {'ok'|'error'} [kind='ok']
 */
function poolStatus(panel, msg, kind = 'ok') {
  const el = panel.querySelector('#bfw-pool-status');
  if (!el) return;
  el.textContent = msg;
  el.className = `bfw-pool-status${kind === 'error' ? ' error' : ''}`;
  if (msg) {
    setTimeout(() => {
      if (el.textContent === msg) {
        el.textContent = '';
        el.className = 'bfw-pool-status';
      }
    }, 3000);
  }
}

/**
 * Bind all image-pool related events: upload, drag-drop, delete, clear.
 * @param {HTMLElement} panel
 */
export function bindPoolEvents(panel) {
  const dropZone = panel.querySelector('#bfw-pool-drop-zone');
  const fileInput = panel.querySelector('#bfw-pool-file-input');
  const uploadBtn = panel.querySelector('#bfw-btn-upload');
  const captureBtn = panel.querySelector('#bfw-btn-capture');
  const clearBtn = panel.querySelector('#bfw-btn-clear-pool');

  if (!dropZone || !fileInput) return;

  // ---- Blur toggle ----
  const eyeBtn = panel.querySelector('#bfw-btn-eye');
  const thumbsEl = panel.querySelector('#bfw-pool-thumbs');
  if (eyeBtn && thumbsEl) {
    eyeBtn.addEventListener('click', () => {
      const active = thumbsEl.classList.toggle('blur');
      eyeBtn.classList.toggle('active', active);
      eyeBtn.innerHTML = active ? icons.eyeOff : icons.eye;
      eyeBtn.title = active ? '显示原图' : '隐私模糊';
    });
  }

  // ---- Face preview button ----
  const previewBtn = panel.querySelector('#bfw-btn-preview');
  if (previewBtn) {
    previewBtn.addEventListener('click', () => {
      openFacePreview();
    });
  }

  // ---- Weight toggle ----
  const weightBtn = panel.querySelector('#bfw-btn-weight');
  if (weightBtn) {
    // Init from settings
    const weightOn = getSetting('dynamicWeight', true);
    weightBtn.classList.toggle('active', weightOn);
    weightBtn.title = weightOn
      ? '动态权重: 开 — 根据图片成功率自动调整选中概率'
      : '动态权重: 关 — 所有图片等概率随机选取';

    weightBtn.addEventListener('click', () => {
      const active = weightBtn.classList.toggle('active');
      weightBtn.title = active
        ? '动态权重: 开 — 根据图片成功率自动调整选中概率'
        : '动态权重: 关 — 所有图片等概率随机选取';
      setSetting('dynamicWeight', active);
    });
  }

  // ---- Upload trigger ----
  function openFilePicker() {
    fileInput.value = ''; // Allow re-uploading the same file
    fileInput.click();
  }

  dropZone.addEventListener('click', (e) => {
    // Don't trigger if user clicked the hidden input itself
    if (e.target === fileInput) return;
    openFilePicker();
  });

  if (uploadBtn) {
    uploadBtn.addEventListener('click', openFilePicker);
  }

  // ---- Capture button (video frame → pool) ----
  if (captureBtn) {
    captureBtn.addEventListener('click', async () => {
      // Defensive: don't allow double-clicks while capture is in progress
      if (captureBtn.disabled) return;
      captureBtn.disabled = true;
      captureBtn.innerHTML = `${icons.clock} 正在捕获…`;
      // Add spin animation to the clock icon
      const clockIcon = captureBtn.querySelector('.bfw-icon');
      if (clockIcon) clockIcon.classList.add('bfw-icon-spin');

      try {
        await handleCapture(panel);
      } finally {
        captureBtn.disabled = false;
        captureBtn.innerHTML = `${icons.film} 捕获`;
      }
    });
  }

  // ---- File selection ----
  fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files || []);
    if (files.length > 0) {
      handleUpload(panel, files);
    }
  });

  // ---- Drag and drop ----
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');

    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length > 0) {
      handleUpload(panel, files);
    }
  });

  // ---- Delete image (via custom event) ----
  panel.addEventListener('bfw:delete-image', async (e) => {
    const { id } = /** @type {CustomEvent} */ (e).detail;
    if (id == null) return;

    const ok = await removeImage(id);
    if (ok) {
      poolStatus(panel, '图片已移除');
      appendLog('图片已从图片池移除');
    }
    refreshPoolUI(panel);
  });

  // ---- Clear all ----
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      const count = poolSize();
      if (count === 0) return;

      // Safety check — don't confirm if only 1 image
      if (count > 1) {
        const confirmed = confirm(`确定要删除图片池中全部 ${count} 张图片吗？`);
        if (!confirmed) return;
      }

      await clearPool();
      refreshPoolUI(panel);
      poolStatus(panel, '全部图片已清空');
      appendLog(`图片池已清空 (原有 ${count} 张)`);
    });
  }

  // ---- Stats popup dismissal — click outside closes it ----
  document.addEventListener('click', (e) => {
    // If there's a stats popup open and the click is not on an info button
    // or inside the popup itself, close it.
    const popup = document.querySelector('.bfw-thumb-stats-popup');
    if (!popup) return;
    if (popup.contains(e.target)) return;
    if (e.target.closest('.bfw-thumb-info')) return;
    hideStatsPopup();
  });

  // ---- Escape key dismissal ----
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideStatsPopup();
    }
  });
}

/**
 * Process and upload a batch of files to the image pool.
 * @param {HTMLElement} panel
 * @param {File[]} files
 */
async function handleUpload(panel, files) {
  const cap = poolCapacity();
  const current = poolSize();

  if (current >= cap) {
    poolStatus(panel, `图片池已满 (${current}/${cap})。请先移除一些图片。`, 'error');
    return;
  }

  // Filter to images only (defensive — the input accept attr should catch most)
  const imageFiles = files.filter((f) =>
    f.type.startsWith('image/') || f.type === '',
  );

  if (imageFiles.length === 0) {
    poolStatus(panel, '未选择有效的图片文件', 'error');
    return;
  }

  poolStatus(panel, `正在处理 ${imageFiles.length} 张图片…`);

  try {
    const result = await addImages(imageFiles);

    // Refresh UI + log
    refreshPoolUI(panel);

    // Build status message
    const parts = [];
    if (result.added.length > 0) parts.push(`${result.added.length} 张已添加`);
    if (result.skipped > 0) parts.push(`${result.skipped} 张已跳过`);

    if (parts.length > 0) {
      const isError = result.added.length === 0;
      poolStatus(panel, parts.join(', '), isError ? 'error' : 'ok');
    }

    if (result.added.length > 0) {
      appendLog(`图片池: 已添加 ${result.added.length} 张图片 (${poolSize()}/${cap})`);
    }
    if (result.skipped > 0) {
      appendLog(`图片池: ${result.skipped} 个文件已跳过 (无效/重复/已满)`);
    }
  } catch (e) {
    poolStatus(panel, '上传失败 — 请查看控制台', 'error');
    console.error('Image pool upload error:', e);
  }
}

/**
 * Capture a frame from the video element and feed it into the image pool.
 * @param {HTMLElement} panel
 */
async function handleCapture(panel) {
  const cap = poolCapacity();
  const current = poolSize();

  if (current >= cap) {
    poolStatus(panel, `图片池已满 (${current}/${cap})。请先移除一些图片。`, 'error');
    return;
  }

  // Reset interval gate so manual capture always works

  const video = findVideoElement(VIDEO_CAPTURE_SELECTORS);
  if (!video) {
    poolStatus(panel, '页面上未找到视频元素', 'error');
    return;
  }

  const dataUrl = captureFrame(video, IMAGE_POOL_CONFIG.JPEG_QUALITY);
  if (!dataUrl) {
    poolStatus(panel, '视频帧捕获失败', 'error');
    return;
  }

  poolStatus(panel, '已捕获帧 — 正在验证…');

  const useful = await isFrameUseful(dataUrl);
  if (!useful) {
    poolStatus(panel, '捕获的帧为空或无效 — 已跳过', 'error');
    return;
  }

  // Store in pool
  const ts = Date.now();
  const name = `captured_${ts}`;
  const entry = await addImageFromDataURI(dataUrl, name);

  if (!entry) {
    poolStatus(panel, '帧未保存 (重复/已满/存储错误)', 'error');
    return;
  }

  refreshPoolUI(panel);
  poolStatus(panel, `已捕获! ${entry.width}×${entry.height} → 图片池 (${poolSize()}/${cap})`);
  appendLog(`已捕获帧: ${entry.width}×${entry.height} → 图片池`);
}
