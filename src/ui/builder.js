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
import { SCRIPT_NAME, SCRIPT_VERSION, GITHUB_URL, GREASYFORK_URL } from '../config.js';
import { bindDrawer, bindActions, bindPoolEvents, bindSettings } from './events.js';
import { listEntries, poolSize, poolCapacity, getImageData, getImageStats, getImageQualityTier } from '../pool/image-pool.js';
import { openCropEditor } from './crop-editor.js';
import { createStatsSection, bindStatsEvents, refreshStats } from './progress-stats.js';
import { clearAllProgress, exportProgress } from '../utils/progress-tracker.js';
import { checkPageVersion } from '../utils/version-checker.js';
import { checkForUpdate, invalidateUpdateCache, ignoreVersion, clearIgnoredVersion } from '../utils/update-checker.js';

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

/** Cached last-written DOM values — avoids redundant DOM mutations. */
const _lastDom = {};

/**
 * Write textContent only if the value differs from what's already in the DOM.
 * Returns true if a write actually happened.
 * @param {Element} el
 * @param {string} value
 * @returns {boolean}
 */
function setTextIfChanged(el, value) {
  const key = el.id || el.className;
  if (_lastDom[key] === value) return false;
  _lastDom[key] = value;
  el.textContent = value;
  return true;
}

/**
 * Write a style property only if the value differs from the cached state.
 * @param {Element} el
 * @param {string} prop
 * @param {string} value
 * @returns {boolean}
 */
function setStyleIfChanged(el, prop, value) {
  const key = `${el.id || el.className}_${prop}`;
  if (_lastDom[key] === value) return false;
  _lastDom[key] = value;
  el.style[prop] = value;
  return true;
}

/**
 * Refresh the course progress DOM from cached data.
 * Skips redundant writes when values haven't changed, avoiding
 * unnecessary layout recalculations during frequent pushProgress calls.
 */
export function refreshCourseProgress() {
  if (!panelEl) return;
  const d = courseProgressData;

  // Current video playback as a 0.0–1.0 fraction (0 when not playing / not loaded)
  const vidFrac = (d.videoProgress || 0) / 100;

  // ---- Current-chapter progress (fractional: includes video position) ----
  // Capped at 1.0: when replaying a completed lesson (studyStatus===3),
  // that lesson is already counted in curChapDone, so raw vidFrac addition
  // can push the fraction above 1.0.
  const chapFraction = d.curChapLessons > 0
    ? Math.min((d.curChapDone + vidFrac) / d.curChapLessons, 1)
    : 0;
  const chapPct = Math.round(chapFraction * 100);

  // ---- Overall progress (fractional: includes video position) ----
  const overallFraction = d.totalLessons > 0
    ? Math.min((d.completedLessons + vidFrac) / d.totalLessons, 1)
    : 0;
  const overallPct = Math.round(overallFraction * 100);

  // ---- Chapter bar (本章) ----
  const chBarFill = panelEl.querySelector('#bfw-course-chbar-fill');
  if (chBarFill) setStyleIfChanged(chBarFill, 'width', `${Math.min(chapPct, 100)}%`);
  const chBarPct = panelEl.querySelector('#bfw-course-chbar-pct');
  if (chBarPct) setTextIfChanged(chBarPct, d.curChapLessons ? `${chapPct}%` : '');

  // ---- Overall bar (总) ----
  const lBarFill = panelEl.querySelector('#bfw-course-lbar-fill');
  if (lBarFill) setStyleIfChanged(lBarFill, 'width', `${Math.min(overallPct, 100)}%`);
  const lBarPct = panelEl.querySelector('#bfw-course-lbar-pct');
  if (lBarPct) setTextIfChanged(lBarPct, d.totalLessons ? `${overallPct}%` : '');

  // ---- Count badge ----
  const countEl = panelEl.querySelector('#bfw-course-count');
  if (countEl) {
    const countText = d.totalLessons ? `${d.completedLessons}/${d.totalLessons}` : '0/0';
    setTextIfChanged(countEl, countText);
    const countColor = d.totalLessons > 0 && d.completedLessons >= d.totalLessons ? '#a6e3a1' : '#a6adc8';
    setStyleIfChanged(countEl, 'color', countColor);
  }

  // ---- Chapter label (right of header) ----
  const chLabel = panelEl.querySelector('#bfw-course-ch-label');
  if (chLabel) {
    const labelText = d.curChapLessons ? `本章 ${d.curChapDone}/${d.curChapLessons}` : '';
    setTextIfChanged(chLabel, labelText);
    setStyleIfChanged(chLabel, 'display', d.curChapLessons ? '' : 'none');
  }

  // ---- Current lesson ----
  const nameEl = panelEl.querySelector('#bfw-course-current-name');
  if (nameEl) {
    setTextIfChanged(nameEl, d.currentName || (d.totalLessons > 0 ? '就绪…' : '等待课程…'));
  }
  const chNameEl = panelEl.querySelector('#bfw-course-current-chapter');
  if (chNameEl) {
    setTextIfChanged(chNameEl, d.currentChapter || '');
  }

  // ---- Video progress ----
  const vidPctEl = panelEl.querySelector('#bfw-course-vid-pct');
  if (vidPctEl) {
    setTextIfChanged(vidPctEl, d.currentName ? `视频 ${d.videoProgress || 0}%` : '');
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
    setTextIfChanged(statEl, parts.join(' · '));
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
 * MutationObserver for watching version element appear.
 * Disconnects automatically after detecting the version.
 */
let versionObserver = null;

/** Cached update result — set after checkForUpdate resolves. */
let _updateResult = null;

// ---------------------------------------------------------------------------
// Footer left — compat version display
// ---------------------------------------------------------------------------

function buildFooterLeftHtml(compatInfo) {
  const iconSvg = icons[compatInfo.iconKey] || icons.versionMissing;

  if (compatInfo.pageVersion) {
    return `<span class="bfw-footer-compat" style="color: ${compatInfo.color}" title="${compatInfo.message}">${iconSvg}</span>
       <span class="bfw-footer-version">v${SCRIPT_VERSION}</span>
       <span class="bfw-footer-sep">|</span>
       <span class="bfw-footer-page">页面 v${compatInfo.pageVersion}</span>`;
  }
  return `<span class="bfw-footer-compat" style="color: ${compatInfo.color}" title="${compatInfo.message}">${iconSvg}</span>
       <span class="bfw-footer-version">v${SCRIPT_VERSION}</span>`;
}

function updateFooterContent(footer, compatInfo) {
  const leftEl = footer.querySelector('.bfw-footer-left');
  if (!leftEl) return;
  leftEl.innerHTML = buildFooterLeftHtml(compatInfo);
}

// ---------------------------------------------------------------------------
// Footer right — update badge
// ---------------------------------------------------------------------------

const TYPE_LABELS = {
  feature:     '新功能',
  fix:         '修复',
  improvement: '优化',
  performance: '性能',
  security:    '安全',
  breaking:    '破坏性',
  docs:        '文档',
  internal:    '内部',
};

/**
 * Render the changelog card DOM.
 * @param {import('../utils/update-checker.js').UpdateResult} result
 * @param {() => void} onRecheck — called when the user clicks "重新检测"
 * @param {() => void} onIgnore  — called when the user clicks "忽略此版本"
 * @returns {HTMLElement}
 */
function createUpdateCard(result, onRecheck, onIgnore) {
  const card = document.createElement('div');
  card.className = 'bfw-update-card';

  // Static skeleton — no remote content here
  card.innerHTML = `
    <div class="bfw-update-card-header">
      <span class="bfw-update-card-title">
        ${icons.arrowUpCircle} 发现新版本
      </span>
      <button class="bfw-update-card-close" title="关闭">${icons.x}</button>
    </div>
    <div class="bfw-update-card-meta">
      <span>v${SCRIPT_VERSION}</span>
      <span class="arrow">→</span>
      <span class="version-badge"></span>
      <button class="bfw-update-recheck-btn" title="重新检测">${icons.refresh}</button>
    </div>
    <div class="bfw-update-changelog"></div>
    <div class="bfw-update-card-actions">
      <button class="bfw-update-ignore-btn">忽略此版本</button>
      <button class="bfw-update-install-btn">立即安装</button>
    </div>
  `;

  // ---- Version badge — clickable when releaseUrl exists ----
  const versionBadge = card.querySelector('.version-badge');
  if (result.releaseUrl) {
    const link = document.createElement('a');
    link.className = 'bfw-version-badge-link';
    link.href = result.releaseUrl;
    link.target = '_blank';
    link.title = '查看发布说明';
    link.innerHTML = `${icons.tag} <span class="bfw-latest-ver"></span>`;
    link.querySelector('.bfw-latest-ver').textContent = `v${result.latestVersion}`;
    versionBadge.appendChild(link);
  } else {
    const span = document.createElement('span');
    span.className = 'bfw-version-badge-link';
    span.innerHTML = `${icons.tag} <span class="bfw-latest-ver">v${result.latestVersion}</span>`;
    versionBadge.appendChild(span);
  }

  // ---- Changelog entries ----
  const changelogEl = card.querySelector('.bfw-update-changelog');
  const entries = result.changelog.slice(0, 8);
  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'bfw-update-changelog-empty';
    empty.textContent = '暂无详细更新说明';
    changelogEl.appendChild(empty);
  } else {
    entries.forEach((e) => {
      const row = document.createElement('div');
      row.className = 'bfw-changelog-entry';

      const typeSpan = document.createElement('span');
      const safeType = /^[a-z]+$/.test(e.type) ? e.type : 'internal';
      typeSpan.className = `bfw-changelog-type bfw-type-${safeType}`;
      typeSpan.textContent = TYPE_LABELS[e.type] ?? e.type;

      const textSpan = document.createElement('span');
      textSpan.className = 'bfw-changelog-text';
      textSpan.textContent = e.title;
      if (e.description) {
        const desc = document.createElement('span');
        desc.className = 'desc';
        desc.textContent = e.description;
        textSpan.appendChild(desc);
      }

      row.appendChild(typeSpan);
      row.appendChild(textSpan);
      changelogEl.appendChild(row);
    });
  }

  // ---- Button bindings ----

  // Close button
  card.querySelector('.bfw-update-card-close').addEventListener('click', () => {
    card.remove();
  });

  // Install button
  card.querySelector('.bfw-update-install-btn').addEventListener('click', () => {
    if (result.downloadUrl) window.open(result.downloadUrl, '_blank');
    card.remove();
  });

  // Ignore button
  card.querySelector('.bfw-update-ignore-btn').addEventListener('click', () => {
    onIgnore();
    card.remove();
  });

  // Recheck button
  card.querySelector('.bfw-update-recheck-btn').addEventListener('click', () => {
    onRecheck();
    card.remove();
  });

  // Click outside to close
  setTimeout(() => {
    const onOutside = (e) => {
      if (!card.contains(e.target)) {
        card.remove();
        document.removeEventListener('click', onOutside);
      }
    };
    document.addEventListener('click', onOutside);
  }, 0);

  return card;
}

/**
 * Create the update badge button in the footer-right area.
 * Starts in "checking" state; transitions to idle or has-update after the
 * checkForUpdate callback fires.
 *
 * @param {HTMLElement} footer
 * @returns {HTMLElement} The badge button element
 */
function createUpdateBadge(footer) {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';

  const btn = document.createElement('button');
  btn.className = 'bfw-update-btn checking';
  btn.title = '正在检测更新…';
  btn.innerHTML = `<span class="bfw-icon-spin">${icons.loader}</span>`;
  wrapper.appendChild(btn);

  // triggerRecheck and onError are mutually referencing — use let to allow forward reference
  let triggerRecheck;

  const onError = () => {
    btn.className = 'bfw-update-btn';
    btn.title = '检测更新失败，点击重试';
    btn.innerHTML = icons.tag;
    btn.onclick = (e) => { e.stopPropagation(); triggerRecheck(); };
  };

  triggerRecheck = () => {
    btn.className = 'bfw-update-btn checking';
    btn.title = '正在检测更新…';
    btn.innerHTML = `<span class="bfw-icon-spin">${icons.loader}</span>`;
    btn.onclick = null;
    clearIgnoredVersion();
    invalidateUpdateCache();
    checkForUpdate(onResult, { force: true, delay: 0, onError });
  };

  // Called when checkForUpdate resolves
  const onResult = (result) => {
    _updateResult = result;

    if (!result.hasUpdate) {
      // Quiet badge — up to date or version ignored
      btn.className = 'bfw-update-btn';
      if (result.ignoredVersion) {
        btn.title = `v${result.ignoredVersion} 已忽略，点击重新检测`;
        btn.innerHTML = icons.tag;
      } else {
        btn.title = `已是最新版本 v${result.latestVersion}，点击重新检测`;
        btn.innerHTML = icons.tag;
      }
      btn.onclick = (e) => { e.stopPropagation(); triggerRecheck(); };
      return;
    }

    // Has update — orange pulsing badge
    btn.className = 'bfw-update-btn has-update';
    btn.title = `发现新版本 v${result.latestVersion}，点击查看`;
    btn.innerHTML = `${icons.arrowUpCircle}<span style="font-weight:600;">v${result.latestVersion}</span>`;

    // Use onclick (not addEventListener) so re-check via contextmenu never stacks listeners
    btn.onclick = (e) => {
      e.stopPropagation();
      const existing = wrapper.querySelector('.bfw-update-card');
      if (existing) { existing.remove(); return; }

      const onIgnore = () => {
        ignoreVersion(result.latestVersion);
        // Re-apply the ignore filter and update badge state
        onResult({
          ...result,
          hasUpdate: false,
          ignoredVersion: result.latestVersion,
        });
      };

      wrapper.appendChild(createUpdateCard(result, triggerRecheck, onIgnore));
    };
  };

  checkForUpdate(onResult, { onError });

  return wrapper;
}

// ---------------------------------------------------------------------------
// Footer assembly
// ---------------------------------------------------------------------------

function createFooter() {
  const footer = document.createElement('div');
  footer.className = 'bfw-footer';
  footer.id = 'bfw-footer';

  const initialInfo = {
    iconKey: 'versionMissing',
    color: '#8c8c8c',
    message: '正在检测版本...',
    pageVersion: null,
  };

  footer.innerHTML = `
    <div class="bfw-footer-left">
      ${buildFooterLeftHtml(initialInfo)}
    </div>
    <div class="bfw-footer-right"></div>
  `;

  // Right side: update badge + GitHub link
  const right = footer.querySelector('.bfw-footer-right');
  right.appendChild(createUpdateBadge(footer));
  const ghLink = document.createElement('a');
  ghLink.href = GITHUB_URL;
  ghLink.target = '_blank';
  ghLink.className = 'bfw-footer-link';
  ghLink.title = 'GitHub 仓库';
  ghLink.innerHTML = icons.github;
  right.appendChild(ghLink);

  startVersionWatch(footer);
  return footer;
}

// ---------------------------------------------------------------------------
// Version watch (page compat, unchanged logic)
// ---------------------------------------------------------------------------

function startVersionWatch(footer) {
  if (versionObserver) {
    versionObserver.disconnect();
    versionObserver = null;
  }

  const immediate = checkPageVersion();
  if (immediate.pageVersion) {
    updateFooterContent(footer, immediate);
    return;
  }

  let isThrottled = false;
  versionObserver = new MutationObserver(() => {
    if (isThrottled) return;
    isThrottled = true;
    setTimeout(() => { isThrottled = false; }, 200);

    const compatInfo = checkPageVersion();
    if (compatInfo.pageVersion) {
      updateFooterContent(footer, compatInfo);
      if (versionObserver) {
        versionObserver.disconnect();
        versionObserver = null;
      }
    }
  });

  versionObserver.observe(document.body, { childList: true, subtree: true });

  setTimeout(() => {
    if (versionObserver) {
      versionObserver.disconnect();
      versionObserver = null;
    }
  }, 30000);
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

  // Append footer to panel-inner (after panel-body)
  const panelInner = panel.querySelector('.bfw-panel-inner');
  if (panelInner) {
    panelInner.appendChild(createFooter());
  }

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
