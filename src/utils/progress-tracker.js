/**
 * @file Progress tracker — persistent learning session history and statistics.
 *
 * Responsibilities:
 *   1. Track learning sessions (start/end time, chapters/lessons completed, duration).
 *   2. Store per-course statistics (total lessons, completion date, last studied).
 *   3. Calculate aggregate stats (total study time, completion rate, daily activity).
 *   4. Provide queryable history for UI display (today, this week, all time).
 *
 * Storage schema:
 *   {
 *     sessions: [{ id, courseId, startTime, endTime, chaptersCompleted, lessonsCompleted, duration }],
 *     courses: { [courseId]: { name, totalLessons, completedCount, firstStudy, lastStudy, sessions } }
 *   }
 */

import { PROGRESS_TRACKER_KEY, PROGRESS_TRACKER_CONFIG } from '../config.js';
import { getStorageAdapter } from './storage-adapter.js';
import { debug, warn } from './logger.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Current schema version for progress data */
const SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/**
 * Format a timestamp as YYYY-MM-DD.
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string}
 */
function formatDate(timestamp) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Format a timestamp as YYYY-MM-DD HH:MM.
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string}
 */
function formatDateTime(timestamp) {
  const d = new Date(timestamp);
  return `${formatDate(timestamp)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** In-memory cache of progress data */
let progressData = {
  version: SCHEMA_VERSION,
  sessions: [],
  courses: {},
  lastSync: 0,
};

/** Whether data has been loaded from storage */
let loaded = false;

/** Current session tracking */
let currentSession = null;

/** Debounce timer for saveProgressData */
let saveTimer = null;

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Migrate old data format to the current schema version.
 * @param {Object} data - Raw data from storage
 * @returns {Object} Migrated data
 */
function migrateData(data) {
  const version = data.version || 0;

  // Version 0 → 1: Add version field
  if (version === 0) {
    debug('ProgressTracker: migrating data from v0 to v1');
    data.version = 1;
    // V0 to V1: no schema changes, just add version field
  }

  // Future migrations go here:
  // if (version === 1) { ... migrate to v2 ... }

  return data;
}

/**
 * Validate and sanitize progress data schema.
 * Ensures all required fields exist and are of the correct type.
 * @param {Object} data - Data object to validate
 * @returns {Object} Validated and sanitized data
 */
function validateSchema(data) {
  // Ensure top-level structure
  if (!data || typeof data !== 'object') {
    warn('ProgressTracker: invalid data object, resetting to empty');
    return {
      version: SCHEMA_VERSION,
      sessions: [],
      courses: {},
      lastSync: Date.now(),
    };
  }

  // Validate version
  if (typeof data.version !== 'number') {
    data.version = SCHEMA_VERSION;
  }

  // Validate sessions array
  if (!Array.isArray(data.sessions)) {
    warn('ProgressTracker: sessions is not an array, resetting');
    data.sessions = [];
  } else {
    // Filter out invalid session entries
    data.sessions = data.sessions.filter(s => {
      if (!s || typeof s !== 'object') return false;
      if (typeof s.id !== 'string') return false;
      if (typeof s.courseId !== 'string') return false;
      if (typeof s.startTime !== 'number') return false;
      // endTime can be null for unfinished sessions
      if (s.endTime !== null && typeof s.endTime !== 'number') return false;
      return true;
    });
  }

  // Validate courses object
  if (typeof data.courses !== 'object' || data.courses === null || Array.isArray(data.courses)) {
    warn('ProgressTracker: courses is not an object, resetting');
    data.courses = {};
  } else {
    // Sanitize course entries
    for (const [courseId, course] of Object.entries(data.courses)) {
      if (!course || typeof course !== 'object') {
        delete data.courses[courseId];
        continue;
      }
      // Ensure required fields exist with defaults
      if (typeof course.name !== 'string') course.name = 'Unknown Course';
      if (typeof course.totalLessons !== 'number') course.totalLessons = 0;
      if (typeof course.completedCount !== 'number') course.completedCount = 0;
      if (typeof course.firstStudy !== 'number') course.firstStudy = Date.now();
      if (!Array.isArray(course.sessions)) course.sessions = [];
    }
  }

  // Validate lastSync
  if (typeof data.lastSync !== 'number') {
    data.lastSync = Date.now();
  }

  return data;
}

/**
 * Load progress history from storage.
 * Called once during boot; idempotent.
 */
export async function loadProgressTracker() {
  if (loaded) return;

  try {
    const raw = await getStorageAdapter().get(PROGRESS_TRACKER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const migrated = migrateData(parsed);
        const validated = validateSchema(migrated);
        progressData = validated;

        // Seal any unfinished sessions that are too old to resume.
        // These are leftovers from a hard crash or a browser kill — they were
        // pre-persisted by startSession() but never reached endSession().
        const resumeAge = PROGRESS_TRACKER_CONFIG.RESUME_MAX_AGE_MS;
        let sealedCount = 0;
        for (const s of progressData.sessions) {
          if (s.endTime === null && (Date.now() - s.startTime) >= resumeAge) {
            s.endTime = s.startTime;  // zero-duration; will be skipped by stats
            s.duration = 0;
            sealedCount++;
          }
        }
        if (sealedCount > 0) {
          debug(`ProgressTracker: sealed ${sealedCount} stale unfinished session(s)`);
        }

        debug(`ProgressTracker: loaded ${progressData.sessions.length} sessions, ${Object.keys(progressData.courses).length} courses (schema v${progressData.version})`);
      }
    }
  } catch (e) {
    warn('ProgressTracker: failed to load from storage:', e);
  }

  loaded = true;
}

/**
 * Persist the current progress data to storage (best-effort).
 */
async function saveProgressData() {
  try {
    progressData.lastSync = Date.now();
    await getStorageAdapter().set(PROGRESS_TRACKER_KEY, JSON.stringify(progressData));
  } catch (e) {
    warn('ProgressTracker: failed to persist:', e);
  }
}

// ---------------------------------------------------------------------------
// Session Management
// ---------------------------------------------------------------------------

/**
 * Start a new learning session.
 * Returns a session ID that should be passed to endSession().
 *
 * @param {string} courseId - Unique course identifier
 * @param {string} courseName - Human-readable course name
 * @returns {string} Session ID
 */
export function startSession(courseId, courseName) {
  // Fast path: in-memory session for the same course is still live
  if (currentSession && currentSession.courseId === courseId) {
    debug(`ProgressTracker: resuming in-memory session ${currentSession.id}`);
    return currentSession.id;
  }

  // If there's a different in-memory session, end it first
  if (currentSession) {
    warn(`ProgressTracker: ending previous session ${currentSession.id} before starting new one`);
    endSession().catch(e => warn('Failed to end previous session:', e));
  }

  // Cross-refresh recovery: look for an unfinished persisted session for this
  // course that was abandoned (e.g. tab reload, SPA navigation).  Only resume
  // if it started recently enough to still be meaningful.
  const resumeAge = PROGRESS_TRACKER_CONFIG.RESUME_MAX_AGE_MS;
  const unfinished = progressData.sessions.findLast(
    s => s.courseId === courseId && s.endTime === null && (Date.now() - s.startTime) < resumeAge,
  );

  if (unfinished) {
    currentSession = { ...unfinished };
    debug(`ProgressTracker: recovered unfinished session ${unfinished.id} after page reload`);
    return unfinished.id;
  }

  const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  currentSession = {
    id: sessionId,
    courseId,
    courseName,
    startTime: Date.now(),
    endTime: null,
    chaptersCompleted: 0,
    lessonsCompleted: 0,
    duration: 0,
  };

  // Initialize course record if not exists
  if (!(courseId in progressData.courses)) {
    progressData.courses[courseId] = {
      name: courseName,
      totalLessons: 0,
      completedCount: 0,
      firstStudy: Date.now(),
      lastStudy: null,
      sessions: [],
    };
  }

  // Persist the new session immediately so it can be recovered on page reload
  // before endSession() is ever called.
  progressData.sessions.push(currentSession);
  saveProgressData().catch(e => warn('ProgressTracker: failed to persist new session:', e));

  debug(`ProgressTracker: started session ${sessionId} for course "${courseName}"`);
  return sessionId;
}

/**
 * Update the current session with progress data.
 * Should be called periodically (e.g., on every course-processor tick).
 * Changes are debounced and saved after 5 seconds of inactivity.
 *
 * @param {number} chaptersCompleted
 * @param {number} lessonsCompleted
 * @param {number} totalLessons
 */
export function updateSession(chaptersCompleted, lessonsCompleted, totalLessons) {
  if (!currentSession) return;

  currentSession.chaptersCompleted = chaptersCompleted;
  currentSession.lessonsCompleted = lessonsCompleted;

  // Update course total if we discover a new max
  const course = progressData.courses[currentSession.courseId];
  if (course && totalLessons > course.totalLessons) {
    course.totalLessons = totalLessons;
  }

  // NOTE: Do NOT update completedCount here — it should only be set in endSession
  // to avoid the data getting stuck at historical max values when users re-take courses.
  // The session already tracks lessonsCompleted, which is the source of truth.

  // Debounced save (avoid excessive writes during active learning)
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveProgressData().catch(e => warn('ProgressTracker: debounced save failed:', e));
  }, 5000);
}

/**
 * End the current session and save it to history.
 * Should be called when leaving a course or stopping learning.
 * Clears any pending debounced saves and immediately persists.
 */
export async function endSession() {
  if (!currentSession) return;

  // Clear pending debounced save since we're doing an immediate save
  clearTimeout(saveTimer);
  saveTimer = null;

  currentSession.endTime = Date.now();
  currentSession.duration = Math.round((currentSession.endTime - currentSession.startTime) / 1000);

  // Discard sessions that are too short and produced nothing — these are
  // almost always page reloads or SPA navigations that fired stopCourseMonitor
  // before any real learning happened.
  const { MIN_SESSION_DURATION_S } = PROGRESS_TRACKER_CONFIG;
  if (currentSession.duration < MIN_SESSION_DURATION_S && currentSession.lessonsCompleted === 0) {
    // Remove the pre-persisted placeholder written in startSession
    const idx = progressData.sessions.findIndex(s => s.id === currentSession.id);
    if (idx !== -1) progressData.sessions.splice(idx, 1);

    debug(`ProgressTracker: discarded trivial session ${currentSession.id} (${currentSession.duration}s, 0 lessons)`);
    currentSession = null;
    await saveProgressData();
    return;
  }

  // Update the in-place record that was persisted during startSession
  const existing = progressData.sessions.find(s => s.id === currentSession.id);
  if (existing) {
    Object.assign(existing, currentSession);
  } else {
    // Fallback: session was not pre-persisted (e.g. recovered via findLast path
    // after a reload where the old entry already had an endTime).
    progressData.sessions.push(currentSession);
  }

  // Update course record
  const course = progressData.courses[currentSession.courseId];
  if (course) {
    course.lastStudy = currentSession.endTime;
    course.completedCount = currentSession.lessonsCompleted;
    course.sessions = (course.sessions || []).includes(currentSession.id)
      ? course.sessions
      : (course.sessions || []).concat(currentSession.id);
  }

  debug(`ProgressTracker: ended session ${currentSession.id}, duration ${currentSession.duration}s`);

  currentSession = null;
  await saveProgressData();
}

// ---------------------------------------------------------------------------
// Statistics & Queries
// ---------------------------------------------------------------------------

/**
 * Get today's statistics.
 * @returns {{ sessionsCount: number, totalDuration: number, lessonsCompleted: number, coursesStudied: Set<string> }}
 */
export function getTodayStats() {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const todaySessions = progressData.sessions.filter(s => s.endTime && s.endTime >= todayStart.getTime());

  return {
    sessionsCount: todaySessions.length,
    totalDuration: Math.round(todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60),
    lessonsCompleted: todaySessions.reduce((sum, s) => sum + s.lessonsCompleted, 0),
    coursesStudied: new Set(todaySessions.map(s => s.courseId)),
  };
}

/**
 * Get this week's statistics (last 7 days).
 * @returns {{ sessionsCount: number, totalDuration: number, lessonsCompleted: number, daysActive: number }}
 */
export function getWeekStats() {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weekStart = now - weekMs;

  const weekSessions = progressData.sessions.filter(s => s.endTime && s.endTime >= weekStart);

  const daysActive = new Set(
    weekSessions.map(s => formatDate(s.endTime))
  ).size;

  return {
    sessionsCount: weekSessions.length,
    totalDuration: Math.round(weekSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60),
    lessonsCompleted: weekSessions.reduce((sum, s) => sum + s.lessonsCompleted, 0),
    daysActive,
  };
}

/**
 * Get daily study duration for the last N days (for chart visualization).
 * Returns an array of { date, duration, label } ordered from oldest to newest.
 *
 * @param {number} [days=7] - Number of days to include
 * @returns {Array<{date: string, duration: number, label: string}>}
 */
export function getDailyTrendData(days = 7) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Build a map of date -> total duration (in minutes)
  const dailyMap = new Map();

  // Initialize all days with 0
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * dayMs);
    d.setHours(0, 0, 0, 0);
    const key = formatDate(d.getTime());
    dailyMap.set(key, 0);
  }

  // Aggregate session durations by date
  progressData.sessions.forEach(s => {
    if (!s.endTime) return;
    const sessionDate = new Date(s.endTime);
    sessionDate.setHours(0, 0, 0, 0);
    const key = formatDate(sessionDate.getTime());
    if (dailyMap.has(key)) {
      dailyMap.set(key, dailyMap.get(key) + Math.round((s.duration || 0) / 60));
    }
  });

  // Convert to array with short labels (e.g., "周一", "周二", or "1/15")
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * dayMs);
    d.setHours(0, 0, 0, 0);
    const key = formatDate(d.getTime());
    const dayOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    const monthDay = `${d.getMonth() + 1}/${d.getDate()}`;
    result.push({
      date: key,
      duration: dailyMap.get(key) || 0,
      label: days <= 7 ? dayOfWeek : monthDay,
    });
  }

  return result;
}

/**
 * Get all-time statistics.
 * @returns {{ sessionsCount: number, totalDuration: number, lessonsCompleted: number, coursesCount: number, totalLessons: number }}
 */
export function getAllTimeStats() {
  const totalDuration = Math.round(
    progressData.sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60
  );

  const totalLessons = Object.values(progressData.courses).reduce(
    (sum, course) => sum + (course.totalLessons || 0),
    0
  );

  return {
    sessionsCount: progressData.sessions.length,
    totalDuration,
    lessonsCompleted: progressData.sessions.reduce((sum, s) => sum + s.lessonsCompleted, 0),
    coursesCount: Object.keys(progressData.courses).length,
    totalLessons,
  };
}

/**
 * Get recent sessions for display.
 * @param {number} [limit=10]
 * @returns {Array}
 */
export function getRecentSessions(limit = 10) {
  return progressData.sessions
    .slice(-limit)
    .reverse()
    .map(s => ({
      ...s,
      durationMin: Math.round(s.duration / 60),
      startDate: formatDateTime(s.startTime),
    }));
}

/**
 * Get course-specific statistics.
 * @param {string} courseId
 * @returns {Object|null}
 */
export function getCourseStats(courseId) {
  const course = progressData.courses[courseId];
  if (!course) return null;

  const courseSessions = progressData.sessions.filter(s => s.courseId === courseId);

  return {
    name: course.name,
    totalLessons: course.totalLessons,
    completedCount: course.completedCount,
    completionRate: course.totalLessons > 0
      ? Math.round((course.completedCount / course.totalLessons) * 100)
      : 0,
    sessionsCount: courseSessions.length,
    totalStudyTime: Math.round(courseSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60),
    firstStudy: formatDateTime(course.firstStudy),
    lastStudy: course.lastStudy ? formatDateTime(course.lastStudy) : '未开始',
    avgSessionDuration: courseSessions.length > 0
      ? Math.round(courseSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / courseSessions.length / 60)
      : 0,
  };
}

/**
 * Get all courses sorted by last study time (most recent first).
 * @returns {Array}
 */
export function getCoursesList() {
  return Object.entries(progressData.courses)
    .map(([id, data]) => {
      // Calculate total study time from all sessions for this course
      const courseSessions = progressData.sessions.filter(s => s.courseId === id);
      const totalStudyTime = Math.round(
        courseSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60
      );

      return {
        id,
        ...data,
        completionRate: data.totalLessons > 0 ? Math.round((data.completedCount / data.totalLessons) * 100) : 0,
        totalStudyTime,
      };
    })
    .sort((a, b) => (b.lastStudy || 0) - (a.lastStudy || 0));
}

/**
 * Clear all progress history (destructive).
 * Use with caution.
 */
export async function clearAllProgress() {
  progressData = {
    version: SCHEMA_VERSION,
    sessions: [],
    courses: {},
    lastSync: Date.now(),
  };
  currentSession = null;
  await saveProgressData();
  debug('ProgressTracker: cleared all progress history');
}

/**
 * Export progress data as JSON (for backup/sharing).
 * @returns {Object}
 */
export function exportProgress() {
  return JSON.parse(JSON.stringify(progressData));
}

/**
 * Get cached progress data reference (read-only).
 * @returns {Object}
 */
export function getProgressData() {
  return progressData;
}
