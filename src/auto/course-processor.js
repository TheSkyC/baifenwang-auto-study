/**
 * @file Auto-course processor — course progress monitoring and automatic playback.
 *
 * Responsibilities:
 *   1. Read complete course tree from React component state (all chapters, lessons, status).
 *   2. Monitor video playback progress (always active).
 *   3. Auto-click the play button when autoCourse is enabled.
 *   4. Auto-resume paused videos that have been stuck for too long.
 *
 * Integration points:
 *   - Controlled via the UI settings panel toggle (key: `autoCourse`).
 *   - Emits log messages through ui/builder.js `appendLog()`.
 *   - Course data is read from React Fiber (not parsed from DOM).
 *
 * Expected flow:
 *   Page load → click play → video plays → ends → platform auto-navigates
 *   → face verification popup (handled by processor.js) → next course loads → repeat
 */

import { COURSE_CONFIG, jitterMs, jitterMsFloor } from '../config.js';
import { getSetting, onChange } from '../settings.js';
import { info, debug, warn } from '../utils/logger.js';
import { appendLog, setStatus, updateCourseProgress } from '../ui/builder.js';
import { startSession, updateSession, endSession, getProgressData } from '../utils/progress-tracker.js';

// ---------------------------------------------------------------------------
// DOM Selectors
// ---------------------------------------------------------------------------

const SELECTORS = {
  /** Play button overlay (appears on page load before video starts) */
  PLAY_BTN: '.playIcon___2PP65, .playIcon',
  /** Ant Design collapse container (root of the course directory) */
  COLLAPSE_CONTAINER: '.ant-collapse',
  /** Fallback container: list wrapper (hash class) */
  LIST_CONTAINER: '[class^="list___"]',
  /** Course directory list element for MutationObserver */
  LIST_OBSERVE: '.list___3GtHP, .list',
  /**
   * The sidebar marks the currently-playing lesson with a CSS-module
   * class `playIngName___<hash>`.  We use a prefix match to survive
   * hash changes across platform deployments.
   */
  PLAYING_NAME: '[class*="playIngName"]',
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** @type {boolean} Whether the course monitor is running */
let running = false;

/** @type {HTMLVideoElement|null} Cached video element reference */
let videoEl = null;

/** @type {MutationObserver|null} Observer for course directory changes */
let dirObserver = null;

/** @type {Element|null} The DOM element currently observed by dirObserver */
let dirObservedEl = null;

/** @type {number|null} setTimeout handle for periodic progress updates */
let progressInterval = null;

/** @type {number} setTimeout handle for play button retry */
let playRetryTimer = 0;

/** @type {number} setTimeout handle for stuck-video check */
let stuckTimer = 0;

/** @type {number} How many times we've tried to auto-resume */
let resumeAttempts = 0;

/** @type {Array|null} Cached reference to the React state array holding course data */
let cachedCourseData = null;

/** Cached DOM container for the React fiber hook (avoids repeated querySelector). */
let cachedFiberContainer = null;

/** Cached React fiber key on the container (avoids repeated Object.keys scan). */
let cachedFiberKey = null;

/** @type {string|null} Current session ID for progress tracking */
let currentSessionId = null;

/** @type {string|null} Current course ID being tracked */
let currentCourseId = null;

// ---------------------------------------------------------------------------
// React Fiber helpers — read course data from component state
// ---------------------------------------------------------------------------

/**
 * Find the React Fiber key on a DOM element.
 * Results are cached per element so subsequent scans are O(1).
 * @param {Element} el
 * @returns {string|null}
 */
function findFiberKey(el) {
  if (cachedFiberContainer === el && cachedFiberKey) return cachedFiberKey;

  cachedFiberKey = Object.keys(el).find(k =>
    k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'),
  ) || null;

  if (cachedFiberKey) cachedFiberContainer = el;
  return cachedFiberKey;
}

/**
 * Check whether a value looks like the course data array we want.
 * The course data is an array of chapter objects, each having `children`
 * (an array of lesson objects), and lessons have `studyRate`, `studyStatus`.
 *
 * @param {*} obj
 * @returns {boolean}
 */
function isCourseData(obj) {
  if (!Array.isArray(obj) || obj.length === 0) return false;
  // First item should be a chapter: has name, children array, chapterType
  const first = obj[0];
  if (!first || typeof first !== 'object') return false;
  if (first.$$typeof || first.stateNode) return false;              // React internal
  if (typeof first.name !== 'string') return false;
  if (!Array.isArray(first.children)) return false;
  // Check that at least one child has studyRate/studyStatus
  if (first.children.length > 0) {
    const child = first.children[0];
    if (typeof child !== 'object' || child === null) return false;
    return typeof child.studyRate === 'number' && typeof child.studyStatus === 'number';
  }
  // Chapter with no children is still valid if it has chapterType
  return typeof first.chapterType === 'number';
}

/**
 * Walk up the React Fiber tree from a DOM element, searching component
 * memoizedState chains for the course data array.
 *
 * @param {Element} container - DOM element to start from
 * @returns {Array|null} The course data array, or null if not found
 */
function readCourseDataFromReact(container) {
  const fiberKey = findFiberKey(container);
  if (!fiberKey) return null;

  let fiber = container[fiberKey];

  while (fiber) {
    let hook = fiber.memoizedState;
    while (hook) {
      const val = hook.memoizedState;
      if (val) {
        // Direct match: the hook state IS the course array
        if (isCourseData(val)) return val;

        // Nested match: hook state is an object containing the array
        if (typeof val === 'object' && !Array.isArray(val)) {
          for (const key of Object.keys(val)) {
            if (Object.prototype.hasOwnProperty.call(val, key) && isCourseData(val[key])) {
              return val[key];
            }
          }
        }
      }
      hook = hook.next;
    }
    fiber = fiber.return;
  }
  return null;
}

/**
 * Try to find and cache the course data from React state.
 * Returns cached copy if available; re-scans if not found yet.
 * @returns {Array|null}
 */
function getCourseData() {
  if (cachedCourseData) return cachedCourseData;

  const container = document.querySelector(SELECTORS.COLLAPSE_CONTAINER)
    || document.querySelector(SELECTORS.LIST_CONTAINER);

  if (!container) return null;

  cachedCourseData = readCourseDataFromReact(container);
  if (cachedCourseData) {
    info(`Course: read ${cachedCourseData.length} chapters from React state`);
  }
  return cachedCourseData;
}

/**
 * Invalidate the cached course data and fiber references so the next call re-scans.
 */
function invalidateCourseCache() {
  cachedCourseData = null;
  cachedFiberContainer = null;
  cachedFiberKey = null;
}

// ---------------------------------------------------------------------------
// Progress helpers
// ---------------------------------------------------------------------------

/**
 * Read the name of the currently-playing lesson from the sidebar DOM.
 *
 * The platform's sidebar marks the active lesson's name element with a
 * CSS-module class `playIngName___<hash>`.  We use a prefix attribute
 * selector to survive hash changes across platform redeploys.
 *
 * This is more reliable than React `studyStatus` for determining which
 * lesson the user is watching, because `studyStatus` does NOT change
 * from 3 (DONE) back to 2 (IN_PROGRESS) when the user replays a
 * completed lesson — but the sidebar DOM always updates.
 *
 * @returns {string|null} The lesson name text, or null if not found.
 */
function getPlayingLessonNameFromDOM() {
  const el = document.querySelector(SELECTORS.PLAYING_NAME);
  if (!el) return null;
  const name = (el.textContent || '').trim();
  return name || null;
}

/**
 * Resolve chapter progress for a specific chapter identified by the DOM
 * sidebar (rather than by React studyStatus).
 *
 * When the user replays a completed lesson, React keeps its studyStatus
 * at 3, so the `studyStatus=2` heuristic points at a different (stale)
 * chapter.  This helper overrides the chapter selection when the sidebar
 * DOM tells us a different lesson is actually playing.
 *
 * @param {Array} chapters - React course data array
 * @param {string} lessonName - Lesson name from the sidebar DOM
 * @param {Object} result - The result object to mutate
 */
function applyDOMChapterHint(chapters, lessonName, result) {
  for (const chapter of chapters) {
    if (chapter.chapterType !== 0) continue;
    const lessons = (chapter.children || []).filter(l => l.chapterType === 1);
    const match = lessons.find(l => l.name === lessonName);
    if (match) {
      // Only override if the DOM says we're in a different chapter than
      // what React studyStatus=2 indicates (or if React had no opinion).
      if (chapter.name !== result.currentChapter) {
        result.currentChapter = chapter.name || '';
        result.currentName = match.name || '';
        result.currentPct = Math.round(match.studyRate || 0);
        result.curChapLessons = lessons.length;
        result.curChapDone = lessons.filter(l => l.studyStatus === 3).length;
      }
      return;
    }
  }
}

/**
 * Compute progress stats from the React course data.
 *
 * Two-level progress model:
 *   本章 = lessons completed (studyStatus 3) / total lessons in the CURRENT chapter
 *   总   = all lessons completed / all lessons across every chapter
 *
 * In-progress lessons (studyStatus 2) are NOT counted as "done" for either bar
 * — only fully-completed (studyStatus 3) count.
 *
 * Chapter detection uses two sources, in priority order:
 *   1. React `studyStatus === 2` — the canonical "in progress" signal
 *   2. DOM sidebar `playIngName___` class — more reliable when the user
 *      replays a completed lesson (React keeps studyStatus=3).
 *
 * @returns {{
 *   chapterCount: number,
 *   totalLessons: number,
 *   completedLessons: number,
 *   completedChapters: number,
 *   currentChapter: string,
 *   currentName: string,
 *   currentPct: number,
 *   curChapLessons: number,
 *   curChapDone: number,
 *   remainingMinutes: number,
 *   courseId: string,
 *   courseName: string
 * }}
 */
function parseCourseProgress() {
  const chapters = getCourseData();
  const result = {
    chapterCount: 0,
    totalLessons: 0,
    completedLessons: 0,
    completedChapters: 0,
    currentChapter: '',
    currentName: '',
    currentPct: 0,
    curChapLessons: 0,      // total lessons in the current chapter
    curChapDone: 0,         // completed (studyStatus 3) in the current chapter
    remainingMinutes: 0,
    courseId: '',
    courseName: '',
  };

  // ---- Extract course identification info (MUST run before early return) ----
  // Create a stable course ID from URL pathname.
  // Prioritize extracting numeric course ID from URL (e.g., /course/12345).
  const pathname = window.location.pathname;
  const urlMatch = pathname.match(/\/(?:course|study|learn|class)\/(\d+)/i);
  result.courseId = urlMatch ? `course-${urlMatch[1]}` : pathname;

  // For course name: check if we've already cached a name for this courseId
  // (prevents name drift when document.title changes dynamically).
  const progressData = getProgressData();
  const existingCourse = progressData?.courses?.[result.courseId];
  if (existingCourse && existingCourse.name) {
    result.courseName = existingCourse.name;
  } else {
    // First time seeing this course — extract name from document title
    let title = document.title || '百分网在线学习';
    title = title.replace(/\s*[-–—]\s*(百分网|在线学习|正在学习).*$/, '').trim();

    // Fallback to first chapter name if title cleanup resulted in empty string
    const firstChapterName = (chapters && chapters.length > 0 && chapters[0].chapterType === 0)
      ? chapters[0].name
      : '';
    result.courseName = title || firstChapterName || pathname || '百分网在线学习';
  }

  // ---- Return early if no React data available yet ----
  // courseId and courseName are already populated above, so the session can
  // still be tied to the correct course even before React renders.
  if (!chapters) return result;

  // ---- First pass: compute overall stats, find in-progress lesson ----
  for (const chapter of chapters) {
    if (chapter.chapterType !== 0) continue;

    result.chapterCount++;
    const lessons = (chapter.children || []).filter(l => l.chapterType === 1);

    for (const lesson of lessons) {
      result.totalLessons++;

      if (lesson.studyStatus === 3) {
        result.completedLessons++;
      } else {
        // Unfinished — accumulate remaining time
        const dur = lesson.duration || 0;
        const rate = lesson.studyRate || 0;
        result.remainingMinutes += Math.round(dur * (1 - rate / 100) / 60);
      }

      // Track the first studyStatus=2 lesson as "current"
      if (lesson.studyStatus === 2 && !result.currentName) {
        result.currentChapter = chapter.name || '';
        result.currentName = lesson.name || '';
        result.currentPct = Math.round(lesson.studyRate || 0);
      }
    }
  }

  // ---- Second pass: fill curChapLessons/curChapDone for the current chapter ----
  if (result.currentChapter && chapters.length > 0) {
    const curChap = chapters.find(
      c => c.chapterType === 0 && c.name === result.currentChapter,
    );
    if (curChap) {
      const curLessons = (curChap.children || []).filter(l => l.chapterType === 1);
      result.curChapLessons = curLessons.length;
      result.curChapDone = curLessons.filter(l => l.studyStatus === 3).length;
    }
  }

  // ---- DOM hint: the sidebar's `playIngName___` class reflects which lesson
  //      the user is actually watching.  When the user replays a completed
  //      lesson, React keeps studyStatus=3 on that lesson, so the studyStatus=2
  //      heuristic picks a stale chapter.  The DOM sidebar is always correct.
  const domLessonName = getPlayingLessonNameFromDOM();
  if (domLessonName) {
    applyDOMChapterHint(chapters, domLessonName, result);
  }

  // ---- Third pass: compute completed chapters count ----
  result.completedChapters = chapters.filter(chapter => {
    if (chapter.chapterType !== 0) return false;
    const lessons = (chapter.children || []).filter(l => l.chapterType === 1);
    return lessons.length > 0 && lessons.every(l => l.studyStatus === 3);
  }).length;

  // ---- Fallback: no in-progress lesson found.  Use the first chapter that
  //      still has unfinished lessons as the "current" one. ----
  if (!result.currentName && chapters.length > 0) {
    for (const chapter of chapters) {
      if (chapter.chapterType !== 0) continue;
      const lessons = (chapter.children || []).filter(l => l.chapterType === 1);
      const allDone = lessons.every(l => l.studyStatus === 3);
      if (!allDone && lessons.length > 0) {
        result.currentChapter = chapter.name || '';
        result.currentName = lessons.find(l => l.studyStatus !== 3)?.name || lessons[0].name || '';
        result.curChapLessons = lessons.length;
        result.curChapDone = lessons.filter(l => l.studyStatus === 3).length;
        break;
      }
    }
  }

  return result;
}

/**
 * Get current video playback info from the <video> element.
 * @returns {{ currentTime: number, duration: number, progress: number, paused: boolean, ended: boolean }}
 */
function getVideoInfo() {
  const v = videoEl || document.querySelector('#player_html5_api, #player video');
  if (!v || v.tagName !== 'VIDEO') return { currentTime: 0, duration: 0, progress: 0, paused: true, ended: false };

  const duration = v.duration || 0;
  const currentTime = v.currentTime || 0;
  const progress = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;

  return {
    currentTime,
    duration,
    progress,
    paused: v.paused,
    ended: v.ended,
  };
}

// ---------------------------------------------------------------------------
// Auto-play logic (only runs when autoCourse is ON)
// ---------------------------------------------------------------------------

/**
 * Attempt to click the play button.
 * @returns {boolean} true if the button was found and clicked
 */
function tryClickPlay() {
  const btn = document.querySelector(SELECTORS.PLAY_BTN);
  if (!btn) return false;

  try {
    btn.click();
    info('Course: auto-clicked play button');
    appendLog('已自动开始播放课程视频');
    return true;
  } catch (e) {
    warn('Course: failed to click play button:', e);
    return false;
  }
}

/**
 * Start retrying the play button click until success or max retries.
 */
function startPlayRetry() {
  // Clear any existing timer to prevent orphaned timeouts when re-entered
  // (e.g. if the UI checkbox fires onChange during init while already running)
  if (playRetryTimer) {
    clearTimeout(playRetryTimer);
    playRetryTimer = 0;
  }

  let attempts = 0;
  const maxRetries = COURSE_CONFIG.PLAY_MAX_RETRIES;

  function scheduleNext() {
    if (!running || !getSetting('autoCourse', false)) {
      playRetryTimer = 0;
      return;
    }
    if (videoEl && !videoEl.paused) {
      playRetryTimer = 0;
      return;
    }

    attempts++;
    if (tryClickPlay()) {
      playRetryTimer = 0;
      resumeAttempts = 0;
      return;
    }

    if (attempts >= maxRetries) {
      playRetryTimer = 0;
      debug(`Course: play button not found after ${maxRetries} retries`);
      return;
    }

    // Recursive setTimeout with per-tick jitter — avoids the fixed-interval
    // fingerprint of setInterval.
    playRetryTimer = setTimeout(scheduleNext, jitterMs(COURSE_CONFIG.PLAY_RETRY_DELAY_MS, 0.3));
  }

  // First attempt after initial delay (also jittered)
  playRetryTimer = setTimeout(scheduleNext, jitterMs(COURSE_CONFIG.PLAY_CLICK_DELAY_MS, 0.4));
}

// ---------------------------------------------------------------------------
// Stuck-video detection and auto-resume
// ---------------------------------------------------------------------------

/**
 * Schedule a check for stuck video playback.
 * If the video is paused (not ended) for longer than STUCK_THRESHOLD_S, auto-resume.
 */
function scheduleStuckCheck() {
  clearTimeout(stuckTimer);

  if (!running || !getSetting('autoCourse', false)) return;
  if (!videoEl || videoEl.ended) return;

  stuckTimer = setTimeout(() => {
    if (!running || !getSetting('autoCourse', false)) return;
    if (!videoEl) return;

    if (videoEl.paused && !videoEl.ended) {
      if (resumeAttempts >= COURSE_CONFIG.MAX_RESUME_ATTEMPTS) {
        warn('Course: max resume attempts reached, giving up');
        appendLog('视频自动恢复失败，请手动播放');
        return;
      }

      resumeAttempts++;
      warn(`Course: video stuck, auto-resuming (attempt ${resumeAttempts}/${COURSE_CONFIG.MAX_RESUME_ATTEMPTS})`);
      appendLog(`视频暂停超过 ${COURSE_CONFIG.STUCK_THRESHOLD_S} 秒，自动恢复播放 (${resumeAttempts}/${COURSE_CONFIG.MAX_RESUME_ATTEMPTS})`);

      try {
        videoEl.play();
      } catch (e) {
        warn('Course: auto-resume play() failed:', e);
      }
    }

    // Re-schedule for continuous stuck monitoring
    scheduleStuckCheck();
  }, jitterMsFloor(COURSE_CONFIG.STUCK_THRESHOLD_S * 1000, 0.25));
}

// ---------------------------------------------------------------------------
// UI update helper
// ---------------------------------------------------------------------------

/**
 * Push current course progress and video info to the UI.
 * Also updates the current progress tracking session.
 */
function pushProgress() {
  const courseProgress = parseCourseProgress();
  const videoInfo = getVideoInfo();

  updateCourseProgress({
    ...courseProgress,
    videoProgress: videoInfo.progress,
    videoPaused: videoInfo.paused,
    autoCourseEnabled: getSetting('autoCourse', false),
  });

  // Update progress tracker with current lesson/chapter counts
  if (currentSessionId && courseProgress.totalLessons > 0) {
    updateSession(courseProgress.completedChapters, courseProgress.completedLessons, courseProgress.totalLessons);
  }
}

// ---------------------------------------------------------------------------
// Video event handlers
// ---------------------------------------------------------------------------

function onTimeUpdate() {
  if (!videoEl) return;
  pushProgress();
}

function onVideoPlay() {
  resumeAttempts = 0;
  scheduleStuckCheck();
  pushProgress();
}

function onVideoPause() {
  if (!running) return;
  scheduleStuckCheck();
}

function onVideoEnded() {
  clearTimeout(stuckTimer);
  const courseProgress = parseCourseProgress();
  appendLog(`视频播放完成 (${courseProgress.currentName || '当前课程'})`);
  info(`Course: video ended — ${courseProgress.currentName}`);

  updateCourseProgress({
    ...courseProgress,
    videoProgress: 100,
    videoPaused: false,
    autoCourseEnabled: getSetting('autoCourse', false),
  });

  // Re-invalidate cache — platform may navigate to next lesson
  invalidateCourseCache();
}

// ---------------------------------------------------------------------------
// Directory monitoring
// ---------------------------------------------------------------------------

/**
 * Start observing the course directory for changes (collapse/expand, navigation).
 * Re-checks React state on mutation (may capture data refreshes).
 */
function startDirectoryObserver() {
  if (dirObserver) return;

  const listContainer = document.querySelector(SELECTORS.LIST_OBSERVE);
  if (!listContainer) {
    debug('Course: directory container not found, skipping observer');
    return;
  }

  dirObserver = new MutationObserver(() => {
    invalidateCourseCache();
    pushProgress();
  });

  dirObserver.observe(listContainer, { childList: true, subtree: true, attributes: true });
  dirObservedEl = listContainer;
  debug('Course: directory observer started');
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Cache the video element and bind event listeners.
 * Aliplayer wraps the <video> inside #player div; actual element is #player_html5_api.
 *
 * If another element was previously tracked, its listeners are removed first
 * so that orphaned listeners don't prevent GC of detached DOM nodes after
 * SPA navigation.
 *
 * @returns {HTMLVideoElement|null}
 */
function initVideoMonitor() {
  // If we already have a video element that is still in the DOM, reuse it
  if (videoEl && document.contains(videoEl)) return videoEl;

  // Old element is gone — remove listeners before dropping the reference
  if (videoEl) {
    unbindVideoListeners(videoEl);
    videoEl = null;
  }

  // Try actual video selectors first; fall back to any <video>
  videoEl = document.querySelector('#player_html5_api, #player video, #playerHtml5_api');
  if (!videoEl) {
    debug('Course: video element not found (will retry)');
    return null;
  }

  if (videoEl.tagName !== 'VIDEO') {
    debug('Course: matched element is not <video>, skipping event bind');
    videoEl = null;
    return null;
  }

  videoEl.addEventListener('timeupdate', onTimeUpdate);
  videoEl.addEventListener('play', onVideoPlay);
  videoEl.addEventListener('pause', onVideoPause);
  videoEl.addEventListener('ended', onVideoEnded);

  debug('Course: video event listeners bound');
  return videoEl;
}

/**
 * Remove bound event listeners from a video element.
 * Called before dropping the reference after SPA navigation replaces the
 * element, so the old (detached) node can be garbage-collected.
 * @param {HTMLVideoElement} el
 */
function unbindVideoListeners(el) {
  el.removeEventListener('timeupdate', onTimeUpdate);
  el.removeEventListener('play', onVideoPlay);
  el.removeEventListener('pause', onVideoPause);
  el.removeEventListener('ended', onVideoEnded);
  debug('Course: video event listeners unbound');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start the course monitor.
 * Always monitors progress; only auto-plays when autoCourse setting is ON.
 */
export function startCourseMonitor() {
  if (running) return;

  running = true;
  info('Course monitor started');
  appendLog('课程监控已启动');

  // Initialize progress tracking session
  // courseId is always populated from URL pathname, even before React renders
  const courseProgress = parseCourseProgress();
  currentCourseId = courseProgress.courseId;
  const courseName = courseProgress.courseName || '百分网在线学习';
  currentSessionId = startSession(currentCourseId, courseName);

  debug(`Course monitor: tracking session ${currentSessionId} for "${courseName}" (id: ${currentCourseId})`);

  // Bind video events
  initVideoMonitor();

  // Start directory observer
  startDirectoryObserver();

  // Periodic progress update (recursive setTimeout with per-tick jitter —
  // avoids the fixed-interval fingerprint of setInterval).
  function scheduleProgress() {
    if (!running) return;

    // Catch SPA navigation: if video element was replaced, rebind
    if (!videoEl || !document.contains(videoEl)) {
      invalidateCourseCache();
      initVideoMonitor();
    }

    // Catch SPA navigation: if the directory list container was replaced
    // (e.g. after switching courses in the sidebar), the old MutationObserver
    // is silently detached from the DOM and stops firing.  Detect that and
    // re-establish the observer + invalidate the React fiber cache so
    // pushProgress() below re-reads fresh course data.
    if (dirObserver && dirObservedEl && !document.contains(dirObservedEl)) {
      dirObserver.disconnect();
      dirObserver = null;
      dirObservedEl = null;
      invalidateCourseCache();
    }
    // Also handle the case where the observer was never started (e.g. element
    // wasn't present at init but appeared after navigation)
    if (!dirObserver) {
      startDirectoryObserver();
    }

    pushProgress();

    // Schedule next tick with jitter
    progressInterval = setTimeout(scheduleProgress, jitterMs(COURSE_CONFIG.PROGRESS_UPDATE_INTERVAL_MS, 0.2));
  }

  // Kick off the first tick after an initial short delay
  progressInterval = setTimeout(scheduleProgress, jitterMs(COURSE_CONFIG.PROGRESS_UPDATE_INTERVAL_MS, 0.2));

  // Auto-play if enabled
  if (getSetting('autoCourse', false)) {
    startPlayRetry();
    setStatus(true, '运行中 — 自动刷课已启用');
  }

  // Initial progress push
  pushProgress();
}

/**
 * Stop the course monitor.
 * Cleans up observers, timers, and event listeners.
 */
export async function stopCourseMonitor() {
  if (!running) return;

  running = false;

  clearTimeout(progressInterval);
  progressInterval = 0;
  clearTimeout(playRetryTimer);
  playRetryTimer = 0;
  clearTimeout(stuckTimer);
  stuckTimer = 0;

  if (dirObserver) {
    dirObserver.disconnect();
    dirObserver = null;
    dirObservedEl = null;
  }

  if (videoEl) {
    videoEl.removeEventListener('timeupdate', onTimeUpdate);
    videoEl.removeEventListener('play', onVideoPlay);
    videoEl.removeEventListener('pause', onVideoPause);
    videoEl.removeEventListener('ended', onVideoEnded);
    videoEl = null;
  }

  resumeAttempts = 0;
  invalidateCourseCache();

  // End the current progress tracking session
  if (currentSessionId) {
    try {
      await endSession();
      debug('Course monitor: progress session ended successfully');
    } catch (e) {
      warn('Course monitor: failed to end progress session:', e);
    }
    currentSessionId = null;
    currentCourseId = null;
  }

  info('Course monitor stopped');
  appendLog('课程监控已停止');
}

/**
 * Check whether the course monitor is currently active.
 * @returns {boolean}
 */
export function isCourseActive() {
  return running;
}

// ---------------------------------------------------------------------------
// Settings listener — react to toggle changes from the UI panel
// ---------------------------------------------------------------------------

onChange('autoCourse', (enabled) => {
  if (enabled) {
    if (!running) {
      startCourseMonitor();
    } else {
      startPlayRetry();
      setStatus(true, '运行中 — 自动刷课已启用');
      appendLog('自动刷课已启用');
    }
  } else {
    if (running) {
      clearTimeout(playRetryTimer);
      playRetryTimer = 0;
      clearTimeout(stuckTimer);
      stuckTimer = 0;
      resumeAttempts = 0;

      setStatus(true, '运行中 — 课程监控 (自动刷课已关闭)');
      appendLog('自动刷课已关闭 — 仅监控进度');
    }
  }
});
