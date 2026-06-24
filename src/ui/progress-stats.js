/**
 * @file Progress statistics panel — displays learning session history and aggregate stats.
 *
 * Creates a collapsible stats section in the main panel with:
 *   - Today's summary (sessions, minutes, lessons)
 *   - This week's summary (sessions, minutes, lessons, active days)
 *   - All-time summary (total sessions, study time, lessons, courses)
 *   - Recent sessions log (last 10)
 *   - Course breakdown list (sortable by last study date)
 *   - Clear history action
 */

import { getTodayStats, getWeekStats, getAllTimeStats, getRecentSessions, getCoursesList, getDailyTrendData } from '../utils/progress-tracker.js';
import { icons } from './icons.js';

// ---------------------------------------------------------------------------
// Chart rendering cache
// ---------------------------------------------------------------------------

/** Last rendered chart data key (used to skip redundant redraws) */
let _lastChartDataKey = null;

/**
 * Create the stats section DOM.
 * @returns {HTMLElement}
 */
export function createStatsSection() {
  const section = document.createElement('div');
  section.className = 'bfw-stats-section';
  section.innerHTML = `
    <div class="bfw-stats-header">
      <span class="bfw-stats-title">${icons.barChart} 学习统计</span>
      <button class="bfw-stats-toggle" title="切换统计面板">${icons.chevronDown}</button>
    </div>
    <div class="bfw-stats-content" style="display: none;">
      <!-- Today's stats -->
      <div class="bfw-stats-group">
        <div class="bfw-stats-group-title">今天</div>
        <div class="bfw-stats-grid">
          <div class="bfw-stat-card">
            <div class="stat-label">学习次数</div>
            <div class="stat-value" id="stat-today-sessions">0</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">学习时长</div>
            <div class="stat-value" id="stat-today-duration">0分钟</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">课程完成</div>
            <div class="stat-value" id="stat-today-lessons">0</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">课程数</div>
            <div class="stat-value" id="stat-today-courses">0</div>
          </div>
        </div>
      </div>

      <!-- This week's stats -->
      <div class="bfw-stats-group">
        <div class="bfw-stats-group-title">本周</div>
        <div class="bfw-stats-grid">
          <div class="bfw-stat-card">
            <div class="stat-label">学习次数</div>
            <div class="stat-value" id="stat-week-sessions">0</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">学习时长</div>
            <div class="stat-value" id="stat-week-duration">0小时</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">课程完成</div>
            <div class="stat-value" id="stat-week-lessons">0</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">活跃天数</div>
            <div class="stat-value" id="stat-week-days">0</div>
          </div>
        </div>
      </div>

      <!-- Weekly trend chart -->
      <div class="bfw-stats-group">
        <div class="bfw-stats-group-title">学习趋势</div>
        <div class="bfw-trend-chart" id="bfw-trend-chart">
          <canvas id="bfw-trend-canvas"></canvas>
        </div>
      </div>

      <!-- All-time stats -->
      <div class="bfw-stats-group">
        <div class="bfw-stats-group-title">累计</div>
        <div class="bfw-stats-grid">
          <div class="bfw-stat-card">
            <div class="stat-label">总学习次数</div>
            <div class="stat-value" id="stat-total-sessions">0</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">总学习时长</div>
            <div class="stat-value" id="stat-total-duration">0小时</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">总课程完成</div>
            <div class="stat-value" id="stat-total-lessons">0</div>
          </div>
          <div class="bfw-stat-card">
            <div class="stat-label">课程数</div>
            <div class="stat-value" id="stat-total-courses">0</div>
          </div>
        </div>
      </div>

      <!-- Recent sessions -->
      <div class="bfw-stats-group">
        <div class="bfw-stats-group-title">最近学习</div>
        <div class="bfw-recent-sessions" id="bfw-recent-sessions">
          <div class="bfw-sessions-empty">暂无学习记录</div>
        </div>
      </div>

      <!-- Courses breakdown -->
      <div class="bfw-stats-group">
        <div class="bfw-stats-group-title">课程详情</div>
        <div class="bfw-courses-list" id="bfw-courses-list">
          <div class="bfw-courses-empty">暂无课程</div>
        </div>
      </div>

      <!-- Actions -->
      <div class="bfw-stats-actions">
        <button class="bfw-btn bfw-btn-ghost" id="bfw-btn-export-stats" title="导出统计数据为 JSON">${icons.download} 导出</button>
        <button class="bfw-btn bfw-btn-danger" id="bfw-btn-clear-stats">清空统计</button>
      </div>
    </div>
  `;

  return section;
}

/**
 * Refresh all stats displays.
 * Called on panel mount or when stats data changes.
 *
 * @param {HTMLElement} panel - The main panel element
 */
export function refreshStats(panel) {
  if (!panel) return;

  const statsSection = panel.querySelector('.bfw-stats-section');
  if (!statsSection) return;

  // Today's stats
  const today = getTodayStats();
  panel.querySelector('#stat-today-sessions').textContent = today.sessionsCount;
  panel.querySelector('#stat-today-duration').textContent = `${today.totalDuration}分钟`;
  panel.querySelector('#stat-today-lessons').textContent = today.lessonsCompleted;
  panel.querySelector('#stat-today-courses').textContent = today.coursesStudied.size;

  // This week's stats
  const week = getWeekStats();
  panel.querySelector('#stat-week-sessions').textContent = week.sessionsCount;
  panel.querySelector('#stat-week-duration').textContent = week.totalDuration >= 60
    ? `${Math.round(week.totalDuration / 60)}小时`
    : `${week.totalDuration}分钟`;
  panel.querySelector('#stat-week-lessons').textContent = week.lessonsCompleted;
  panel.querySelector('#stat-week-days').textContent = week.daysActive;

  // Weekly trend chart
  refreshTrendChart(panel);

  // All-time stats
  const allTime = getAllTimeStats();
  panel.querySelector('#stat-total-sessions').textContent = allTime.sessionsCount;
  panel.querySelector('#stat-total-duration').textContent = allTime.totalDuration >= 60
    ? `${Math.round(allTime.totalDuration / 60)}小时`
    : `${allTime.totalDuration}分钟`;
  panel.querySelector('#stat-total-lessons').textContent = allTime.lessonsCompleted;
  panel.querySelector('#stat-total-courses').textContent = allTime.coursesCount;

  // Recent sessions
  const recentEl = panel.querySelector('#bfw-recent-sessions');
  const recentSessions = getRecentSessions(10);
  if (recentSessions.length === 0) {
    recentEl.innerHTML = '<div class="bfw-sessions-empty">暂无学习记录</div>';
  } else {
    recentEl.innerHTML = recentSessions.map(session => `
      <div class="bfw-session-item">
        <div class="session-name">${escapeHtml(session.courseName)}</div>
        <div class="session-meta">
          <span class="session-time">${session.startDate}</span>
          <span class="session-duration">${session.durationMin}分钟</span>
          <span class="session-lessons">完成 ${session.lessonsCompleted} 课</span>
        </div>
      </div>
    `).join('');
  }

  // Courses breakdown
  const coursesEl = panel.querySelector('#bfw-courses-list');
  const courses = getCoursesList();
  if (courses.length === 0) {
    coursesEl.innerHTML = '<div class="bfw-courses-empty">暂无课程</div>';
  } else {
    coursesEl.innerHTML = courses.map(course => {
      const sessionCount = course.sessions ? course.sessions.length : 0;
      const totalMinutes = course.totalStudyTime || 0;
      const totalHours = totalMinutes >= 60 ? Math.round(totalMinutes / 60) : 0;
      const displayTime = totalHours > 0 ? `${totalHours}h` : `${totalMinutes}min`;

      return `
        <div class="bfw-course-item">
          <div class="course-header">
            <span class="course-name">${escapeHtml(course.name)}</span>
            <span class="course-rate">${course.completionRate}%</span>
          </div>
          <div class="course-progress">
            <div class="course-bar">
              <div class="course-bar-fill" style="width: ${course.completionRate}%"></div>
            </div>
          </div>
          <div class="course-stats">
            <span class="course-stat">完成 ${course.completedCount}/${course.totalLessons}</span>
            <span class="course-stat">${sessionCount} 次</span>
            <span class="course-stat">${displayTime}</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

/**
 * Draw the weekly trend chart on canvas.
 * Uses a smooth curve with gradient fill and animated dots.
 *
 * @param {HTMLElement} panel
 */
function refreshTrendChart(panel) {
  const canvas = panel.querySelector('#bfw-trend-canvas');
  if (!canvas) return;

  const data = getDailyTrendData(7);

  // Skip redraw if data hasn't changed (optimization for frequent refreshStats calls)
  const dataKey = JSON.stringify(data.map(d => d.duration));
  if (_lastChartDataKey === dataKey) return;
  _lastChartDataKey = dataKey;

  const ctx = canvas.getContext('2d');

  // Set canvas size (2x for retina)
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 140 * dpr;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = '140px';
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = 140;
  const padding = { top: 20, right: 10, bottom: 30, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Find max value for scaling (handle empty data explicitly)
  const maxDuration = data.length > 0
    ? Math.max(...data.map(d => d.duration), 1)
    : 1;

  // Calculate positions
  const points = data.map((d, i) => ({
    x: padding.left + (chartWidth / (data.length - 1)) * i,
    y: padding.top + chartHeight - (d.duration / maxDuration) * chartHeight,
    duration: d.duration,
    label: d.label,
  }));

  // Draw gradient fill area
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, 'rgba(137, 180, 250, 0.25)');
  gradient.addColorStop(0.5, 'rgba(116, 199, 236, 0.15)');
  gradient.addColorStop(1, 'rgba(148, 226, 213, 0.05)');

  ctx.beginPath();
  ctx.moveTo(points[0].x, height - padding.bottom);
  points.forEach((p, i) => {
    if (i === 0) {
      ctx.lineTo(p.x, p.y);
    } else {
      // Smooth curve using quadratic bezier
      const prev = points[i - 1];
      const cpX = (prev.x + p.x) / 2;
      ctx.quadraticCurveTo(cpX, prev.y, p.x, p.y);
    }
  });
  ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw line
  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) {
      ctx.moveTo(p.x, p.y);
    } else {
      const prev = points[i - 1];
      const cpX = (prev.x + p.x) / 2;
      ctx.quadraticCurveTo(cpX, prev.y, p.x, p.y);
    }
  });
  ctx.strokeStyle = '#89b4fa';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Draw dots and labels
  points.forEach((p, i) => {
    // Dot
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#1e1e2e';
    ctx.fill();
    ctx.strokeStyle = p.duration > 0 ? '#89b4fa' : '#45475a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label (day name)
    ctx.fillStyle = '#a6adc8';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.label, p.x, height - padding.bottom + 18);

    // Duration value (only if > 0)
    if (p.duration > 0) {
      ctx.fillStyle = '#cdd6f4';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      const durationText = p.duration >= 60 ? `${Math.round(p.duration / 60)}h` : `${p.duration}m`;
      ctx.fillText(durationText, p.x, p.y - 10);
    }
  });
}

/**
 * Escape HTML entities to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => escapeMap[m]);
}

/**
 * Bind stats section event listeners (toggle, actions).
 *
 * @param {HTMLElement} panel
 * @param {Function} onClearStats - Callback when clear button is clicked
 * @param {Function} onExportStats - Callback when export button is clicked
 */
export function bindStatsEvents(panel, onClearStats, onExportStats) {
  const toggle = panel.querySelector('.bfw-stats-toggle');
  const content = panel.querySelector('.bfw-stats-content');
  const clearBtn = panel.querySelector('#bfw-btn-clear-stats');
  const exportBtn = panel.querySelector('#bfw-btn-export-stats');

  if (toggle && content) {
    toggle.addEventListener('click', () => {
      const isVisible = content.style.display !== 'none';
      content.style.display = isVisible ? 'none' : 'block';
      toggle.style.transform = isVisible ? '' : 'rotate(180deg)';
    });

    // Set initial state — content starts hidden, so chevron should not be rotated
    toggle.style.transform = '';
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (confirm('确定要清空所有学习统计数据吗？此操作无法撤销。')) {
        if (onClearStats) await onClearStats();
        refreshStats(panel);
      }
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (onExportStats) onExportStats();
    });
  }
}
