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
        <div class="bfw-trend-legend">
          <span class="bfw-legend-item"><span class="bfw-legend-dot bfw-legend-dot-blue"></span>学习时长</span>
          <span class="bfw-legend-item"><span class="bfw-legend-dot bfw-legend-dot-green"></span>学习课程</span>
        </div>
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
 * Dual-line chart: study duration (blue, left axis) and lessons completed (green, right axis).
 *
 * @param {HTMLElement} panel
 */
function refreshTrendChart(panel) {
  const canvas = panel.querySelector('#bfw-trend-canvas');
  if (!canvas) return;

  const data = getDailyTrendData(7);

  // Skip redraw if data hasn't changed (optimization for frequent refreshStats calls)
  const dataKey = JSON.stringify(data.map(d => [d.duration, d.lessons]));
  if (_lastChartDataKey === dataKey) return;
  _lastChartDataKey = dataKey;

  const ctx = canvas.getContext('2d');

  // Set canvas size (2x for retina)
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth;

  // Parent is hidden (display:none) — skip and don't cache, so the next call
  // after the panel is expanded draws correctly.
  if (cssWidth === 0) return;

  canvas.width = cssWidth * dpr;
  canvas.height = 140 * dpr;
  ctx.scale(dpr, dpr);

  const width = cssWidth;
  const height = 140;
  const padding = { top: 18, right: 14, bottom: 30, left: 14 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const baselineY = height - padding.bottom;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  if (data.length === 0) return;

  // Find max values for scaling (handle all-zero gracefully)
  const maxDuration = Math.max(...data.map(d => d.duration), 1);
  const maxLessons = Math.max(...data.map(d => d.lessons), 1);

  // Calculate point positions for both series
  const durationPoints = data.map((d, i) => ({
    x: padding.left + (chartWidth / (data.length - 1)) * i,
    y: padding.top + chartHeight - (d.duration / maxDuration) * chartHeight,
    value: d.duration,
    label: d.label,
  }));

  const lessonsPoints = data.map((d, i) => ({
    x: padding.left + (chartWidth / (data.length - 1)) * i,
    y: padding.top + chartHeight - (d.lessons / maxLessons) * chartHeight,
    value: d.lessons,
    label: d.label,
  }));

  // Monotone cubic interpolation (Fritsch-Carlson): smooth curves that never overshoot.
  // Computes tangents that preserve local monotonicity, then converts to bezier segments.
  function monotoneCubicPath(pts) {
    const n = pts.length;
    if (n < 2) return [];
    // Secant slopes between adjacent points
    const d = [];
    for (let i = 0; i < n - 1; i++) {
      const dx = pts[i + 1].x - pts[i].x;
      d.push(dx === 0 ? 0 : (pts[i + 1].y - pts[i].y) / dx);
    }
    // Initial tangent at each point: average of neighboring secants
    const m = new Array(n);
    m[0] = d[0];
    m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = (d[i - 1] + d[i]) / 2;
    // Fritsch-Carlson monotonicity constraint
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i];
      const mag = a * a + b * b;
      if (mag > 9) { const t = 3 / Math.sqrt(mag); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    // Return bezier segments
    const segs = [];
    for (let i = 0; i < n - 1; i++) {
      const h = pts[i + 1].x - pts[i].x;
      segs.push([
        pts[i].x + h / 3,        pts[i].y + m[i] * h / 3,
        pts[i + 1].x - h / 3,    pts[i + 1].y - m[i + 1] * h / 3,
        pts[i + 1].x,             pts[i + 1].y,
      ]);
    }
    return segs;
  }

  // Helper: draw a smooth area-fill + stroke line for a series
  function drawLineSeries(points, strokeColor, fillGradient) {
    const segs = monotoneCubicPath(points);

    // Fill area under curve
    ctx.beginPath();
    ctx.moveTo(points[0].x, baselineY);
    ctx.lineTo(points[0].x, points[0].y);
    segs.forEach(s => ctx.bezierCurveTo(...s));
    ctx.lineTo(points[points.length - 1].x, baselineY);
    ctx.closePath();
    ctx.fillStyle = fillGradient;
    ctx.fill();

    // Stroke the curve
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    segs.forEach(s => ctx.bezierCurveTo(...s));
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  // Duration gradient (blue → teal)
  const durationGradient = ctx.createLinearGradient(0, padding.top, 0, baselineY);
  durationGradient.addColorStop(0, 'rgba(137, 180, 250, 0.25)');
  durationGradient.addColorStop(0.5, 'rgba(116, 199, 236, 0.15)');
  durationGradient.addColorStop(1, 'rgba(148, 226, 213, 0.05)');

  // Lessons gradient (green)
  const lessonsGradient = ctx.createLinearGradient(0, padding.top, 0, baselineY);
  lessonsGradient.addColorStop(0, 'rgba(166, 227, 161, 0.22)');
  lessonsGradient.addColorStop(0.5, 'rgba(148, 226, 190, 0.12)');
  lessonsGradient.addColorStop(1, 'rgba(148, 226, 213, 0.03)');

  // Draw lessons area first (behind duration), then duration on top
  drawLineSeries(lessonsPoints, '#a6e3a1', lessonsGradient);
  drawLineSeries(durationPoints, '#89b4fa', durationGradient);

  // Draw dots only (no labels)
  function drawDots(points, color) {
    points.forEach((p) => {
      const active = p.value > 0;
      if (active) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = color.replace(')', ', 0.15)').replace('rgb', 'rgba');
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#1e1e2e';
      ctx.fill();
      ctx.strokeStyle = active ? color : '#45475a';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  // Draw labels for both series together per column, resolving vertical collisions.
  // The series whose dot is higher (smaller Y) gets its label above; the other below.
  // If both labels would still be within MIN_GAP pixels of each other, push them apart.
  function drawDualLabels(dPts, lPts, dFmt, lFmt) {
    const MIN_GAP = 16; // px between two labels
    const ABOVE_OFFSET = -10;
    const BELOW_OFFSET = 18;

    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';

    dPts.forEach((dp, i) => {
      const lp = lPts[i];
      const dActive = dp.value > 0;
      const lActive = lp.value > 0;

      if (!dActive && !lActive) return;

      if (dActive && !lActive) {
        // Only duration label — always above its dot
        const y = Math.max(14, Math.min(dp.y + ABOVE_OFFSET, baselineY - 2));
        ctx.fillStyle = '#89b4fa';
        ctx.fillText(dFmt(dp.value), dp.x, y);
        return;
      }

      if (!dActive && lActive) {
        // Only lessons label — always below its dot
        const y = Math.max(14, Math.min(lp.y + BELOW_OFFSET, baselineY - 2));
        ctx.fillStyle = '#a6e3a1';
        ctx.fillText(lFmt(lp.value), lp.x, y);
        return;
      }

      // Both active: the higher dot (smaller Y) gets label above, lower dot gets label below
      let dyAbove, dyBelow, colorAbove, colorBelow, textAbove, textBelow, xAbove, xBelow;
      if (dp.y <= lp.y) {
        // duration is higher
        dyAbove = dp.y + ABOVE_OFFSET;
        dyBelow = lp.y + BELOW_OFFSET;
        colorAbove = '#89b4fa'; textAbove = dFmt(dp.value); xAbove = dp.x;
        colorBelow = '#a6e3a1'; textBelow = lFmt(lp.value); xBelow = lp.x;
      } else {
        // lessons is higher
        dyAbove = lp.y + ABOVE_OFFSET;
        dyBelow = dp.y + BELOW_OFFSET;
        colorAbove = '#a6e3a1'; textAbove = lFmt(lp.value); xAbove = lp.x;
        colorBelow = '#89b4fa'; textBelow = dFmt(dp.value); xBelow = dp.x;
      }

      // Clamp to chart bounds first
      dyAbove = Math.max(14, dyAbove);
      dyBelow = Math.min(dyBelow, baselineY - 2);

      // If the two labels are still too close, push them apart symmetrically
      const gap = dyBelow - dyAbove;
      if (gap < MIN_GAP) {
        const nudge = (MIN_GAP - gap) / 2;
        dyAbove = Math.max(14, dyAbove - nudge);
        dyBelow = Math.min(dyBelow + nudge, baselineY - 2);
      }

      ctx.fillStyle = colorAbove;
      ctx.fillText(textAbove, xAbove, dyAbove);
      ctx.fillStyle = colorBelow;
      ctx.fillText(textBelow, xBelow, dyBelow);
    });
  }

  drawDots(durationPoints, '#89b4fa');
  drawDots(lessonsPoints, '#a6e3a1');
  drawDualLabels(durationPoints, lessonsPoints, v => v >= 60 ? `${Math.round(v / 60)}h` : `${v}m`, v => `${v}节`);

  // Day labels (bottom axis) — draw once shared
  durationPoints.forEach((p) => {
    ctx.fillStyle = '#a6adc8';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.label, p.x, baselineY + 18);
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

  const header = panel.querySelector('.bfw-stats-header');
  if (header && toggle && content) {
    header.addEventListener('click', () => {
      const isVisible = content.style.display !== 'none';
      content.style.display = isVisible ? 'none' : 'block';
      toggle.style.transform = isVisible ? '' : 'rotate(180deg)';

      // Force chart redraw on expand — canvas had zero width while hidden
      if (!isVisible) {
        _lastChartDataKey = null;
        refreshStats(panel);
      }
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
