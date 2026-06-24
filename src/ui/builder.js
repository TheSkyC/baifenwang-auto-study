/**
 * @file UI builder — creates and renders the edge-drawer panel DOM.
 *
 * Panel structure:
 *   .bfw-panel (edge-drawer container, slides on hover)
 *     .bfw-panel-handle (32px grip tab, always visible on right edge)
 *     .bfw-panel-inner (348px content surface)
 *       .bfw-panel-header  (title + pin button)
 *       .bfw-panel-body    (scrollable: status, log, actions, pool)
 */

import { STYLES } from './styles.js';
import { icons } from './icons.js';
import { SCRIPT_NAME } from '../config.js';
import { bindDrawer, bindActions, bindPoolEvents, bindSettings } from './events.js';
import { listEntries, poolSize, poolCapacity, getImageData, getImageStats, getImageQualityTier } from '../pool/image-pool.js';
import { openCropEditor } from './crop-editor.js';
import { createStatsSection, bindStatsEvents, refreshStats } from './progress-stats.js';
import { clearAllProgress, exportProgress } from '../utils/progress-tracker.js';

let panelEl = null;

/** Cached course progress data (written by course-processor, read by UI updates). */
let courseProgressData = {
  chapterCount: 0, totalLessons: 0, completedLessons: 0,
  currentChapter: '', currentName: '', currentPct: 0,
  curChapLessons: 0, curChapDone: 0,
  remainingMinutes: 0,
  videoProgress: 0, videoPaused: true,
  autoCourseEnabled: false,
};

/**
 * Update the course progress display in the panel.
 * Called by course-processor on every progress tick.
 *
 * Bars:
 *   章 = lessons done / total lessons in the CURRENT chapter
 *   总 = all lessons done / all lessons across every chapter
 *
 * @param {Object} data - Progress data from course-processor
 */
export function updateCourseProgress(data) {
  courseProgressData = { ...data };
  refreshCourseProgress();
}

/**
 * Refresh the course progress DOM from cached data.
 */
export function refreshCourseProgress() {
  if (!panelEl) return;
  const d = courseProgressData;

  // Current video playback as a 0.0–1.0 fraction (0 when not playing / not loaded)
  const vidFrac = (d.videoProgress || 0) / 100;

  // ---- Current-chapter progress (fractional: includes video position) ----
  const chapFraction = d.curChapLessons > 0
    ? (d.curChapDone + vidFrac) / d.curChapLessons
    : 0;
  const chapPct = Math.round(chapFraction * 100);

  // ---- Overall progress (fractional: includes video position) ----
  const overallFraction = d.totalLessons > 0
    ? (d.completedLessons + vidFrac) / d.totalLessons
    : 0;
  const overallPct = Math.round(overallFraction * 100);

  // ---- Chapter bar (本章) ----
  const chBarFill = panelEl.querySelector('#bfw-course-chbar-fill');
  if (chBarFill) chBarFill.style.width = `${Math.min(chapPct, 100)}%`;
  const chBarPct = panelEl.querySelector('#bfw-course-chbar-pct');
  if (chBarPct) chBarPct.textContent = d.curChapLessons ? `${chapPct}%` : '';

  // ---- Overall bar (总) ----
  const lBarFill = panelEl.querySelector('#bfw-course-lbar-fill');
  if (lBarFill) lBarFill.style.width = `${Math.min(overallPct, 100)}%`;
  const lBarPct = panelEl.querySelector('#bfw-course-lbar-pct');
  if (lBarPct) lBarPct.textContent = d.totalLessons ? `${overallPct}%` : '';

  // ---- Count badge ----
  const countEl = panelEl.querySelector('#bfw-course-count');
  if (countEl) {
    countEl.textContent = d.totalLessons ? `${d.completedLessons}/${d.totalLessons}` : '0/0';
    countEl.style.color = d.totalLessons > 0 && d.completedLessons >= d.totalLessons ? '#a6e3a1' : '#a6adc8';
  }

  // ---- Chapter label (right of header) ----
  const chLabel = panelEl.querySelector('#bfw-course-ch-label');
  if (chLabel) {
    chLabel.textContent = d.curChapLessons ? `本章 ${d.curChapDone}/${d.curChapLessons}` : '';
    chLabel.style.display = d.curChapLessons ? '' : 'none';
  }

  // ---- Current lesson ----
  const nameEl = panelEl.querySelector('#bfw-course-current-name');
  if (nameEl) {
    nameEl.textContent = d.currentName || (d.totalLessons > 0 ? '就绪…' : '等待课程…');
  }
  const chNameEl = panelEl.querySelector('#bfw-course-current-chapter');
  if (chNameEl) {
    chNameEl.textContent = d.currentChapter || '';
  }

  // ---- Video progress ----
  const vidPctEl = panelEl.querySelector('#bfw-course-vid-pct');
  if (vidPctEl) {
    vidPctEl.textContent = d.currentName ? `视频 ${d.videoProgress || 0}%` : '';
  }

  // ---- Stat line ----
  const statEl = panelEl.querySelector('#bfw-course-stat');
  if (statEl) {
    const parts = [];
    if (d.autoCourseEnabled) parts.push('自动播放: 开');
    parts.push(`${d.chapterCount} 章`);
    parts.push(`${d.completedLessons}/${d.totalLessons} 课`);
    if (d.remainingMinutes > 0) {
      parts.push(d.remainingMinutes >= 60
        ? `剩余约 ${Math.round(d.remainingMinutes / 60)}h`
        : `剩余约 ${d.remainingMinutes}min`);
    }
    statEl.textContent = parts.join(' · ');
  }
}

/**
 * Render the thumbnail grid + pool status from current pool state.
 * @param {HTMLElement} panel
 */
/**
 * Reload the thumbnail image for a specific entry after crop edit.
 * Avoids a full pool rebuild when only one image's content changed.
 * @param {HTMLElement} panel
 * @param {number} entryId
 */
export async function refreshPoolThumb(panel, entryId) {
  const target = panel || panelEl;
  if (!target) return;

  const thumb = target.querySelector(`.bfw-pool-thumb[data-id="${entryId}"]`);
  if (!thumb) return;

  await loadThumbImage(thumb, entryId);
}

export function refreshPoolUI(panel) {
  const target = panel || panelEl;
  if (!target) return;

  // Close any open stats popup before rebuilding thumbs (prevents memory leaks)
  hideStatsPopup();

  const thumbsEl = target.querySelector('#bfw-pool-thumbs');
  const countEl = target.querySelector('#bfw-pool-count');
  const emptyEl = target.querySelector('#bfw-pool-empty');
  const clearBtn = target.querySelector('#bfw-btn-clear-pool');

  if (!thumbsEl || !countEl) return;

  const entries = listEntries();
  const count = entries.length;
  const cap = poolCapacity();

  // Count badge
  countEl.textContent = `${count}/${cap}`;
  countEl.style.color = count >= cap ? '#f38ba8' : '#a6adc8';

  // Clear button state
  if (clearBtn) clearBtn.disabled = count === 0;

  // Empty placeholder
  if (emptyEl) emptyEl.style.display = count === 0 ? 'block' : 'none';

  // Thumbnails — incremental update: only rebuild if count changed
  const currentThumbs = thumbsEl.querySelectorAll('.bfw-pool-thumb');
  if (currentThumbs.length !== count) {
    thumbsEl.innerHTML = '';
    if (count === 0) {
      thumbsEl.appendChild(emptyEl || document.createElement('div'));
    } else {
      for (const entry of entries) {
        const thumb = createThumbElement(entry);
        thumbsEl.appendChild(thumb);
        // Load actual image data lazily
        loadThumbImage(thumb, entry.id);
      }
    }
  }

  // Close any open stats popup (thumb elements were rebuilt)
  hideStatsPopup();
}

// ---------------------------------------------------------------------------
// Stats popup — inline tooltip for per-image usage statistics
// ---------------------------------------------------------------------------

/** Currently visible stats popup element (null when hidden). */
let _statsPopupEl = null;

/** Timeout handle for delayed popup hide on mouseleave (debounce). */
let _statsPopupTimeout = null;

/**
 * Build a stats popup DOM for an image.  Returns the popup element
 * but does NOT attach it to the DOM.
 *
 * @param {import('../pool/image-pool.js').PoolEntry} entry
 * @returns {HTMLElement}
 */
function createStatsPopup(entry) {
  const stats = getImageStats(entry.id);
  const tier = getImageQualityTier(entry.id);

  const popup = document.createElement('div');
  popup.className = 'bfw-thumb-stats-popup';
  popup.dataset.id = String(entry.id);

  // Tier badge label
  const tierLabels = { high: '高成功率', neutral: '中性', low: '低成功率' };
  const tierCss = { high: 'stats-tier-high', neutral: 'stats-tier-neutral', low: 'stats-tier-low' };

  if (!stats || stats.totalUses === 0) {
    popup.innerHTML = `
      <div class="stats-header">
        <span class="stats-name">${escapeHtml(entry.name)}</span>
        <span class="stats-tier-badge ${tierCss[tier]}">${tierLabels[tier]}</span>
      </div>
      <div class="stats-empty">暂无使用数据</div>`;
  } else {
    const successRate = stats.totalUses > 0
      ? Math.round((stats.successes / stats.totalUses) * 100)
      : 0;
    const rateClass = successRate >= 50 ? 'rate-good' : 'rate-bad';
    const lastResultText = stats.lastResult === 'success' ? '✅ 通过'
      : stats.lastResult === 'fail' ? '❌ 未通过' : '—';

    popup.innerHTML = `
      <div class="stats-header">
        <span class="stats-name">${escapeHtml(entry.name)}</span>
        <span class="stats-tier-badge ${tierCss[tier]}">${tierLabels[tier]}</span>
      </div>
      <table class="stats-table">
        <tr><td class="stats-label">使用次数</td><td class="stats-value">${stats.totalUses}</td></tr>
        <tr><td class="stats-label">成功</td><td class="stats-value success">${stats.successes}</td></tr>
        <tr><td class="stats-label">失败</td><td class="stats-value fail">${stats.failures}</td></tr>
        <tr><td class="stats-label">成功率</td><td class="stats-value ${rateClass}">${successRate}%</td></tr>
        <tr><td class="stats-label">最近结果</td><td class="stats-value">${lastResultText}</td></tr>
      </table>`;
  }

  // Keep popup visible while cursor is over it (hover-triggered tooltip pattern)
  popup.addEventListener('mouseenter', () => {
    if (_statsPopupTimeout) {
      clearTimeout(_statsPopupTimeout);
      _statsPopupTimeout = null;
    }
  });
  popup.addEventListener('mouseleave', () => {
    hideStatsPopup();
  });

  return popup;
}

/**
 * Escape HTML entities in a string to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Show the stats popup for a thumbnail element (hover-triggered).
 * Closes any previously open popup first.  If the popup for this
 * entry is already visible the call is a no-op.
 *
 * @param {HTMLElement} thumbEl - The .bfw-pool-thumb element
 * @param {import('../pool/image-pool.js').PoolEntry} entry
 */
function showStatsPopup(thumbEl, entry) {
  // Already showing for this entry — nothing to do
  if (_statsPopupEl && _statsPopupEl.dataset.id === String(entry.id) && _statsPopupEl.parentNode) {
    return;
  }

  // Cancel any pending hide
  if (_statsPopupTimeout) {
    clearTimeout(_statsPopupTimeout);
    _statsPopupTimeout = null;
  }

  // Close any existing popup
  hideStatsPopup();

  // Create and show new popup
  _statsPopupEl = createStatsPopup(entry);

  // Always attach to <body> — the panel (.bfw-panel) has a CSS transform
  // which creates a new containing block, so any position:fixed descendant
  // is relative to the panel (not the viewport) and gets clipped by
  // overflow-y: auto on .bfw-panel-body.
  document.body.appendChild(_statsPopupEl);

  // Position the popup near the thumbnail
  positionStatsPopup(thumbEl, _statsPopupEl);
}

/**
 * Schedule a deferred hide of the stats popup.
 * Gives the cursor time to reach the popup itself before it disappears.
 */
function scheduleHideStatsPopup() {
  _statsPopupTimeout = setTimeout(() => {
    hideStatsPopup();
  }, 200);
}

/**
 * Position the stats popup relative to its thumbnail element.
 * Tries to place it to the right, falling back to left / above / below.
 *
 * @param {HTMLElement} thumbEl
 * @param {HTMLElement} popup
 */
function positionStatsPopup(thumbEl, popup) {
  const thumbRect = thumbEl.getBoundingClientRect();
  const popupW = 200;
  const popupH = popup.offsetHeight || 140;

  // Default: to the right of the thumb
  let left = thumbRect.right + 8;
  let top = thumbRect.top;

  // If it would overflow right edge of viewport, flip to left
  if (left + popupW > window.innerWidth - 10) {
    left = thumbRect.left - popupW - 8;
  }
  // If still overflows left edge, place below
  if (left < 10) {
    left = thumbRect.left;
    top = thumbRect.bottom + 4;
  }
  // If overflows bottom, place above
  if (top + popupH > window.innerHeight - 10) {
    top = thumbRect.top - popupH - 4;
  }
  // Clamp to viewport
  top = Math.max(4, top);
  left = Math.max(4, left);

  popup.style.position = 'fixed';
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

/**
 * Hide and remove the currently visible stats popup.
 * Safe to call when no popup is open (no-op).
 */
export function hideStatsPopup() {
  if (_statsPopupTimeout) {
    clearTimeout(_statsPopupTimeout);
    _statsPopupTimeout = null;
  }
  if (_statsPopupEl) {
    if (_statsPopupEl.parentNode) _statsPopupEl.parentNode.removeChild(_statsPopupEl);
    _statsPopupEl = null;
  }
}

/**
 * Create a thumbnail DOM element for a pool entry.
 * @param {import('../pool/image-pool.js').PoolEntry} entry
 * @returns {HTMLElement}
 */
function createThumbElement(entry) {
  const div = document.createElement('div');
  div.className = 'bfw-pool-thumb';
  div.title = `${entry.name}\n${entry.width}×${entry.height} — 点击编辑裁剪`;
  div.dataset.id = String(entry.id);

  // Quality tier border class
  const tier = getImageQualityTier(entry.id);
  if (tier === 'low') div.classList.add('bfw-quality-low');
  else if (tier === 'high') div.classList.add('bfw-quality-high');

  const img = document.createElement('img');
  img.alt = entry.name;
  img.src = ''; // lazy
  div.appendChild(img);

  // Stats info icon — hover shows usage stats popup (see showStatsPopup)
  const infoBtn = document.createElement('button');
  infoBtn.className = 'bfw-thumb-info';
  infoBtn.innerHTML = icons.info;
  infoBtn.addEventListener('mouseenter', (e) => {
    e.stopPropagation();
    showStatsPopup(div, entry);
  });
  infoBtn.addEventListener('mouseleave', () => {
    scheduleHideStatsPopup();
  });
  div.appendChild(infoBtn);

  const delBtn = document.createElement('button');
  delBtn.className = 'bfw-thumb-delete';
  delBtn.innerHTML = icons.x;
  delBtn.title = '删除';
  delBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Dispatch to panel so events.js handles it
    panelEl?.dispatchEvent(new CustomEvent('bfw:delete-image', {
      detail: { id: entry.id },
    }));
  });
  div.appendChild(delBtn);

  // Click to open crop editor
  div.addEventListener('click', () => {
    // Don't open crop editor if clicking the info button (handled above)
    if (!entry.cropParams) return; // No original data available
    openCropEditor(entry.id, entry, () => {
      // Reload just this thumbnail — content changed, count unchanged
      refreshPoolThumb(panelEl, entry.id);
    });
  });

  return div;
}

/**
 * Load the image data for a thumbnail element.
 * @param {HTMLElement} thumbEl
 * @param {number} id
 */
async function loadThumbImage(thumbEl, id) {
  try {
    const dataUrl = await getImageData(id);
    if (dataUrl) {
      const img = thumbEl.querySelector('img');
      if (img) img.src = dataUrl;
    }
  } catch (_) { /* thumb load failure is non-fatal */ }
}

/**
 * Create the panel DOM structure (edge-drawer pattern).
 * @returns {HTMLElement}
 */
function createPanelDOM() {
  const panel = document.createElement('div');
  panel.className = 'bfw-panel';
  panel.innerHTML = `
    <div class="bfw-panel-handle">
      <span class="bfw-handle-text">刷课助手</span>
    </div>
    <div class="bfw-panel-inner">
      <div class="bfw-panel-header">
        <span class="bfw-title">${SCRIPT_NAME}</span>
        <div class="bfw-header-actions">
          <button class="bfw-pin-btn" title="固定面板">${icons.pin}</button>
        </div>
      </div>
      <div class="bfw-panel-body">
        <div class="bfw-status">
          <span class="bfw-status-dot"></span>
          <span class="bfw-status-text">运行中 — 摄像头已替换</span>
        </div>
        <div class="bfw-log" id="bfw-log-area"></div>
        <div class="bfw-actions">
          <button class="bfw-btn bfw-btn-primary" id="bfw-btn-retry">手动重试</button>
          <button class="bfw-btn bfw-btn-ghost" id="bfw-btn-clear">清空日志</button>
        </div>

        <!-- Settings Section -->
        <div class="bfw-settings-section">
          <div class="bfw-settings-header">
            <span class="bfw-settings-title">设置</span>
          </div>

          <div class="bfw-setting-row" data-setting="faceAutoClick">
            <div class="bfw-setting-info">
              <span class="bfw-setting-icon">${icons.userCheck}</span>
              <span class="bfw-setting-label">自动点击验证按钮</span>
              <span class="bfw-setting-desc">自动完成打开摄像头、拍照、对比等步骤</span>
            </div>
            <label class="bfw-toggle">
              <input type="checkbox" class="bfw-toggle-input" id="bfw-toggle-face-autoclick" checked />
              <span class="bfw-toggle-slider"></span>
            </label>
          </div>

          <div class="bfw-setting-row" data-setting="videoReplace">
            <div class="bfw-setting-info">
              <span class="bfw-setting-icon">${icons.video}</span>
              <span class="bfw-setting-label">替换摄像头画面</span>
              <span class="bfw-setting-desc">用图片池中的照片替代真实摄像头</span>
            </div>
            <label class="bfw-toggle">
              <input type="checkbox" class="bfw-toggle-input" id="bfw-toggle-video-replace" checked />
              <span class="bfw-toggle-slider"></span>
            </label>
          </div>

          <div class="bfw-setting-row" data-setting="autoCompare">
            <div class="bfw-setting-info">
              <span class="bfw-setting-icon">${icons.checkCircle}</span>
              <span class="bfw-setting-label">拍照后自动对比</span>
              <span class="bfw-setting-desc">关闭时拍照后暂停，需手动点击对比</span>
            </div>
            <label class="bfw-toggle">
              <input type="checkbox" class="bfw-toggle-input" id="bfw-toggle-auto-compare" checked />
              <span class="bfw-toggle-slider"></span>
            </label>
          </div>

          <div class="bfw-setting-row" data-setting="autoCourse">
            <div class="bfw-setting-info">
              <span class="bfw-setting-icon">${icons.book}</span>
              <span class="bfw-setting-label">自动刷课</span>
              <span class="bfw-setting-desc">自动播放课程视频并监控进度</span>
            </div>
            <label class="bfw-toggle">
              <input type="checkbox" class="bfw-toggle-input" id="bfw-toggle-auto-course" />
              <span class="bfw-toggle-slider"></span>
            </label>
          </div>

          <div class="bfw-setting-row" data-setting="disableVisibilityCheck">
            <div class="bfw-setting-info">
              <span class="bfw-setting-icon">${icons.monitor}</span>
              <span class="bfw-setting-label">防切屏检测</span>
              <span class="bfw-setting-desc">阻止网站因切屏或最小化而暂停播放</span>
            </div>
            <label class="bfw-toggle">
              <input type="checkbox" class="bfw-toggle-input" id="bfw-toggle-disable-visibility-check" />
              <span class="bfw-toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Course Progress Section -->
        <div class="bfw-course-section">
          <div class="bfw-course-header">
            <span class="bfw-course-title">课程进度</span>
            <div class="bfw-course-header-right">
              <span class="bfw-course-ch-label" id="bfw-course-ch-label"></span>
              <span class="bfw-course-count" id="bfw-course-count">0/0</span>
            </div>
          </div>
          <div class="bfw-course-current">
            <span class="bfw-course-current-name" id="bfw-course-current-name">等待课程…</span>
            <span class="bfw-course-vid-pct" id="bfw-course-vid-pct"></span>
          </div>
          <div class="bfw-course-chapter" id="bfw-course-current-chapter"></div>
          <div class="bfw-course-bar-group">
            <div class="bfw-course-bar-row">
              <span class="bfw-course-bar-label">章</span>
              <div class="bfw-course-bar-track">
                <div class="bfw-course-bar-fill" id="bfw-course-chbar-fill" style="width: 0%"></div>
              </div>
              <span class="bfw-course-bar-pct" id="bfw-course-chbar-pct"></span>
            </div>
            <div class="bfw-course-bar-row">
              <span class="bfw-course-bar-label">总</span>
              <div class="bfw-course-bar-track">
                <div class="bfw-course-bar-fill bfw-bar-lesson" id="bfw-course-lbar-fill" style="width: 0%"></div>
              </div>
              <span class="bfw-course-bar-pct" id="bfw-course-lbar-pct"></span>
            </div>
          </div>
          <div class="bfw-course-stat" id="bfw-course-stat"></div>
        </div>

        <!-- Progress Stats Section (inserted by createStatsSection) -->
        <div id="bfw-stats-placeholder"></div>

        <!-- Image Pool Section -->
        <div class="bfw-pool-section">
          <div class="bfw-pool-header">
            <span class="bfw-pool-title">图片池</span>
            <div class="bfw-pool-header-right">
              <span class="bfw-pool-count" id="bfw-pool-count">0/50</span>
              <button class="bfw-weight-btn active" id="bfw-btn-weight" title="动态权重: 开 — 根据图片成功率自动调整选中概率">${icons.sliders}</button>
              <button class="bfw-eye-btn active" id="bfw-btn-eye" title="显示原图">${icons.eyeOff}</button>
            </div>
          </div>
          <div class="bfw-pool-drag-zone" id="bfw-pool-drop-zone" title="拖拽或点击此处上传图片">
            拖拽或点击此处上传图片
            <input type="file" id="bfw-pool-file-input" accept="image/jpeg,image/png,image/webp,image/bmp" multiple hidden />
          </div>
          <div class="bfw-pool-thumbs blur" id="bfw-pool-thumbs">
            <div class="bfw-pool-empty" id="bfw-pool-empty">暂无图片 — 点击上方上传</div>
          </div>
          <div class="bfw-pool-status" id="bfw-pool-status"></div>
          <div class="bfw-pool-actions">
            <button class="bfw-btn bfw-btn-primary" id="bfw-btn-upload">上传</button>
            <button class="bfw-btn bfw-btn-capture" id="bfw-btn-capture" title="捕获当前视频帧到图片池">${icons.film} 捕获</button>
            <button class="bfw-btn bfw-btn-danger" id="bfw-btn-clear-pool" disabled>清空全部</button>
          </div>
        </div>
      </div>
    </div>
  `;
  return panel;
}

/**
 * Inject CSS styles into the page if not already present.
 */
function injectStyles() {
  if (document.getElementById('bfw-styles')) return;

  const style = document.createElement('style');
  style.id = 'bfw-styles';
  style.textContent = STYLES;
  document.head.appendChild(style);
}

/**
 * Append a timestamped log message to the panel log area.
 * @param {string} message - The log message text
 */
export function appendLog(message) {
  if (!panelEl) return;
  const logArea = panelEl.querySelector('#bfw-log-area');
  if (!logArea) return;

  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const line = document.createElement('div');
  const timeSpan = document.createElement('span');
  timeSpan.className = 'log-time';
  timeSpan.textContent = `[${time}]`;
  line.appendChild(timeSpan);
  line.appendChild(document.createTextNode(message));
  logArea.appendChild(line);
  logArea.scrollTop = logArea.scrollHeight;
}

/**
 * Update the status indicator in the panel.
 * @param {boolean} active - Whether the interceptor is active
 * @param {string} [text] - Override status text
 */
export function setStatus(active, text) {
  if (!panelEl) return;
  const dot = panelEl.querySelector('.bfw-status-dot');
  const label = panelEl.querySelector('.bfw-status-text');
  if (dot) dot.classList.toggle('inactive', !active);
  if (label) label.textContent = text || (active ? '运行中 — 摄像头已替换' : '已停止');
}

/**
 * Build and mount the panel UI into the page.
 * @returns {HTMLElement} The panel root element
 */
export function buildUI() {
  if (panelEl) return panelEl;

  injectStyles();
  panelEl = createPanelDOM();
  document.body.appendChild(panelEl);

  // Bind interaction events
  bindDrawer(panelEl);
  bindActions(panelEl);
  bindPoolEvents(panelEl);
  bindSettings(panelEl);

  // Note: bfw:retry bubbles to document where processor.js handles it
  // (the processor logs "已触发手动重试" and performs the actual retry scan)

  // Insert stats section into placeholder
  const statsPlaceholder = panelEl.querySelector('#bfw-stats-placeholder');
  if (statsPlaceholder) {
    const statsSection = createStatsSection();
    statsPlaceholder.parentNode.replaceChild(statsSection, statsPlaceholder);

    // Bind stats events
    bindStatsEvents(panelEl,
      clearAllProgress,
      () => {
        const data = exportProgress();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Use local date format for filename
        const date = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
        a.download = `bfw-stats-${date}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    );

    // Initial stats refresh
    refreshStats(panelEl);
  }

  // Initial pool UI refresh
  refreshPoolUI(panelEl);

  return panelEl;
}

/**
 * Refresh stats display (called when progress data changes).
 * @param {HTMLElement} panel - The panel element
 */
export function refreshStatsDisplay(panel) {
  const target = panel || panelEl;
  if (!target) return;
  refreshStats(target);
}
