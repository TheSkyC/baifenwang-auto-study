/**
 * @file Logger utility with colored console output
 * Provides leveled logging with script prefix and optional styles.
 */

import { SCRIPT_NAME, CURRENT_LOG_LEVEL, LOG_LEVEL } from '../config.js';

const STYLES = {
  debug: 'color: #888; font-style: italic;',
  info: 'color: #2196F3; font-weight: bold;',
  warn: 'color: #FF9800; font-weight: bold;',
  error: 'color: #F44336; font-weight: bold;',
};

const LABELS = {
  debug: 'DBG',
  info: 'INF',
  warn: 'WRN',
  error: 'ERR',
};

function shouldLog(level) {
  return level >= CURRENT_LOG_LEVEL;
}

function formatPrefix(level) {
  return `%c[${SCRIPT_NAME}][${LABELS[level]}]`;
}

/**
 * Log a debug-level message (verbose, hidden by default).
 * @param  {...any} args - Values to log
 */
export function debug(...args) {
  if (!shouldLog(LOG_LEVEL.DEBUG)) return;
  console.log(formatPrefix(LOG_LEVEL.DEBUG), STYLES.debug, ...args);
}

/**
 * Log an info-level message.
 * @param  {...any} args - Values to log
 */
export function info(...args) {
  if (!shouldLog(LOG_LEVEL.INFO)) return;
  console.log(formatPrefix(LOG_LEVEL.INFO), STYLES.info, ...args);
}

/**
 * Log a warning-level message.
 * @param  {...any} args - Values to log
 */
export function warn(...args) {
  if (!shouldLog(LOG_LEVEL.WARN)) return;
  console.warn(formatPrefix(LOG_LEVEL.WARN), STYLES.warn, ...args);
}

/**
 * Log an error-level message.
 * @param  {...any} args - Values to log
 */
export function error(...args) {
  if (!shouldLog(LOG_LEVEL.ERROR)) return;
  console.error(formatPrefix(LOG_LEVEL.ERROR), STYLES.error, ...args);
}