/**
 * @file System notification helper — Windows toast notifications and browser alerts.
 * @author PhoebeCLS
 */

import { info, debug } from './logger.js';

let _titleAlertTimer = null;
let _originalTitle = '';

/**
 * Request permission for web notifications if not already determined.
 */
export function requestNotificationPermission() {
  const NotificationAPI = (typeof window !== 'undefined' && window.Notification) || (typeof Notification !== 'undefined' ? Notification : null);
  if (NotificationAPI && NotificationAPI.permission === 'default' && typeof NotificationAPI.requestPermission === 'function') {
    NotificationAPI.requestPermission().catch(() => {});
  }
}

/**
 * Play a gentle double-chime using Web Audio API.
 */
function playChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.15);
    gain2.gain.setValueAtTime(0.18, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.45);

    setTimeout(() => {
      try { ctx.close().catch(() => {}); } catch (_) {}
    }, 800);
  } catch (_) {}
}

/**
 * Stop tab title flashing and restore original document title.
 */
export function stopTitleAlert() {
  if (_titleAlertTimer) {
    clearInterval(_titleAlertTimer);
    _titleAlertTimer = null;
    if (typeof document !== 'undefined' && _originalTitle) {
      document.title = _originalTitle;
    }
  }
}

/**
 * Start tab title flashing to alert user when window is inactive.
 * @param {string} alertText
 */
export function startTitleAlert(alertText) {
  if (typeof document === 'undefined') return;
  if (_titleAlertTimer) return;

  _originalTitle = document.title;
  let toggle = false;

  _titleAlertTimer = setInterval(() => {
    document.title = toggle ? alertText : _originalTitle;
    toggle = !toggle;
  }, 1000);
  if (typeof _titleAlertTimer?.unref === 'function') {
    _titleAlertTimer.unref();
  }

  const stop = () => {
    stopTitleAlert();
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('focus', stop);
    }
  };
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('focus', stop);
  }
}

/**
 * Send a Windows system notification (via GM_notification or Web Notification API).
 * Text strings are explicitly normalized to NFC Unicode to prevent Chinese character corruption.
 *
 * @param {string} title
 * @param {string} body
 * @returns {boolean}
 */
export function sendWindowsNotification(title, body) {
  const safeTitle = String(title || '').normalize('NFC');
  const safeBody = String(body || '').normalize('NFC');

  info(`Notification: sending system notification — "${safeTitle}: ${safeBody}"`);

  playChime();
  startTitleAlert(`【已暂停】${safeBody}`);

  if (typeof GM_notification === 'function') {
    try {
      GM_notification({
        title: safeTitle,
        text: safeBody,
        timeout: 12000,
      });
      return true;
    } catch (e) {
      debug('Notification: GM_notification failed, falling back:', e);
    }
  }

  const NotificationAPI = (typeof window !== 'undefined' && window.Notification) || (typeof Notification !== 'undefined' ? Notification : null);
  if (NotificationAPI) {
    if (NotificationAPI.permission === 'granted') {
      try {
        new NotificationAPI(safeTitle, { body: safeBody });
        return true;
      } catch (e) {
        debug('Notification: Web Notification failed:', e);
      }
    } else if (NotificationAPI.permission !== 'denied' && typeof NotificationAPI.requestPermission === 'function') {
      NotificationAPI.requestPermission().then((perm) => {
        if (perm === 'granted') {
          new NotificationAPI(safeTitle, { body: safeBody });
        }
      }).catch(() => {});
    }
  }

  return false;
}
