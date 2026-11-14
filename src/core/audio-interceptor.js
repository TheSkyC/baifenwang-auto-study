/**
 * @file Audio interceptor — keeps course video playback constantly muted.
 * @author PhoebeCLS
 *
 * Prevents video audio from playing when lessons auto-switch or when the user
 * manually navigates between lessons.  The website (tj.100.wang) and its
 * player (Aliplayer / HTML5 Video) reinitialize the video element or reset
 * `video.muted = false` on every playback kickoff.
 *
 * This module intercepts:
 *   1. HTMLMediaElement.prototype.muted  — forces underlying mute while returning
 *      `false` to site scripts so anti-cheat / idle detection stays unaware.
 *   2. HTMLMediaElement.prototype.volume — retains the site's volume setting
 *      transparently while underlying audio is silenced.
 *   3. HTMLMediaElement.prototype.play   — ensures video is muted before frames start.
 *   4. Media events (play, playing, loadedmetadata, canplay, loadstart, volumechange) —
 *      re-asserts mute state whenever the player attempts to unmute.
 *   5. Element creation (createElement, new Audio) & src/load hooks — silences media
 *      from birth before any audio buffers can reach the output hardware.
 */

import { getSetting, onChange } from '../settings.js';
import { info, debug, warn } from '../utils/logger.js';
import { appendLog } from '../ui/builder.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let installed = false;

/** Original HTMLMediaElement.prototype.muted descriptor */
let _origMutedDesc = null;

/** Original HTMLMediaElement.prototype.volume descriptor */
let _origVolumeDesc = null;

/** Original HTMLMediaElement.prototype.play function */
let _origPlay = null;

/** Original HTMLMediaElement.prototype.load function */
let _origLoad = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Retrieve a property descriptor from an object or anywhere up its prototype chain.
 * @param {Object} obj
 * @param {string} prop
 * @returns {PropertyDescriptor|null}
 */
function getPropertyDescriptor(obj, prop) {
  let cur = obj;
  while (cur) {
    const desc = Object.getOwnPropertyDescriptor(cur, prop);
    if (desc) return desc;
    cur = Object.getPrototypeOf(cur);
  }
  return null;
}

/**
 * Determine whether an element is a media element (handles cross-frame elements).
 * @param {*} el
 * @returns {boolean}
 */
function isMediaElement(el) {
  if (!el) return false;
  if (typeof HTMLMediaElement !== 'undefined' && el instanceof HTMLMediaElement) return true;
  const tag = (el.tagName || '').toUpperCase();
  return tag === 'VIDEO' || tag === 'AUDIO';
}

/**
 * Apply muted state to a media element without triggering page detection.
 * @param {HTMLMediaElement|Element} el
 */
export function applyMuteToElement(el) {
  if (!isMediaElement(el)) return;

  try {
    if (_origMutedDesc && _origMutedDesc.get && _origMutedDesc.set) {
      if (!_origMutedDesc.get.call(el)) {
        _origMutedDesc.set.call(el, true);
        debug('Audio interceptor: enforced mute on media element');
      }
    } else {
      el.muted = true;
    }
  } catch (e) {
    try { el.muted = true; } catch (_) {}
    debug('Audio interceptor: failed to mute element via descriptor:', e);
  }

  try {
    el.defaultMuted = true;
  } catch (_) {}
}

/**
 * Restore unmuted state to a media element according to its virtual setting.
 * @param {HTMLMediaElement|Element} el
 */
export function applyUnmuteToElement(el) {
  if (!isMediaElement(el)) return;

  try {
    const desired = el._fakeMuted !== undefined ? el._fakeMuted : false;
    if (_origMutedDesc && _origMutedDesc.set) {
      _origMutedDesc.set.call(el, desired);
    } else {
      el.muted = desired;
    }
    debug('Audio interceptor: restored mute state on media element:', desired);
  } catch (e) {
    debug('Audio interceptor: failed to restore mute state on element:', e);
  }

  try { el.defaultMuted = false; } catch (_) {}
}

/**
 * Mute all video and audio elements currently in the document.
 */
export function muteAllMedia() {
  const mediaElements = document.querySelectorAll('video, audio');
  for (const el of mediaElements) {
    applyMuteToElement(el);
  }
}

/**
 * Unmute all video and audio elements currently in the document.
 */
export function unmuteAllMedia() {
  const mediaElements = document.querySelectorAll('video, audio');
  for (const el of mediaElements) {
    applyUnmuteToElement(el);
  }
}

// ---------------------------------------------------------------------------
// Event handlers (capture phase)
// ---------------------------------------------------------------------------

function onMediaCaptureEvent(e) {
  if (!getSetting('muteVideo', false)) return;
  if (isMediaElement(e.target)) {
    applyMuteToElement(e.target);
  }
}

// ---------------------------------------------------------------------------
// Installation
// ---------------------------------------------------------------------------

/**
 * Install the audio interceptor by monkey-patching HTMLMediaElement.prototype
 * and Document element creation hooks. Safe to call multiple times (idempotent).
 */
export function installAudioInterceptor() {
  if (installed) {
    debug('Audio interceptor: already installed, skipping');
    return;
  }

  if (typeof HTMLMediaElement === 'undefined') {
    debug('Audio interceptor: HTMLMediaElement not available, skipping');
    return;
  }

  // 1. Hook HTMLMediaElement.prototype.muted
  try {
    _origMutedDesc = getPropertyDescriptor(HTMLMediaElement.prototype, 'muted');
    if (_origMutedDesc && _origMutedDesc.get && _origMutedDesc.set) {
      Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
        get() {
          if (getSetting('muteVideo', false)) {
            // When muted setting is active, pretend to the page that the media is unmuted
            // (or whatever value the page script explicitly set) so anti-cheat doesn't complain.
            return this._fakeMuted !== undefined ? this._fakeMuted : false;
          }
          return _origMutedDesc.get.call(this);
        },
        set(val) {
          this._fakeMuted = Boolean(val);
          if (getSetting('muteVideo', false)) {
            // Always keep the underlying audio track muted
            if (!_origMutedDesc.get.call(this)) {
              _origMutedDesc.set.call(this, true);
            }
          } else {
            _origMutedDesc.set.call(this, val);
          }
        },
        configurable: true,
        enumerable: true,
      });
    }
  } catch (e) {
    warn('Audio interceptor: could not override HTMLMediaElement.prototype.muted:', e);
  }

  // 2. Hook HTMLMediaElement.prototype.volume
  try {
    _origVolumeDesc = getPropertyDescriptor(HTMLMediaElement.prototype, 'volume');
    if (_origVolumeDesc && _origVolumeDesc.get && _origVolumeDesc.set) {
      Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
        get() {
          if (getSetting('muteVideo', false)) {
            return this._fakeVolume !== undefined ? this._fakeVolume : _origVolumeDesc.get.call(this);
          }
          return _origVolumeDesc.get.call(this);
        },
        set(val) {
          const num = Number(val);
          if (isNaN(num) || num < 0 || num > 1) {
            throw new DOMException(
              "Failed to set the 'volume' property on 'HTMLMediaElement': The volume provided is outside the range [0, 1].",
              'IndexSizeError',
            );
          }
          this._fakeVolume = num;
          _origVolumeDesc.set.call(this, num);
          if (getSetting('muteVideo', false)) {
            applyMuteToElement(this);
          }
        },
        configurable: true,
        enumerable: true,
      });
    }
  } catch (e) {
    warn('Audio interceptor: could not override HTMLMediaElement.prototype.volume:', e);
  }

  // 3. Hook HTMLMediaElement.prototype.play
  try {
    _origPlay = HTMLMediaElement.prototype.play;
    if (typeof _origPlay === 'function') {
      HTMLMediaElement.prototype.play = function interceptedPlay(...args) {
        if (getSetting('muteVideo', false)) {
          applyMuteToElement(this);
        }
        return _origPlay.apply(this, args);
      };
    }
  } catch (e) {
    warn('Audio interceptor: could not override HTMLMediaElement.prototype.play:', e);
  }

  // 4. Hook HTMLMediaElement.prototype.load
  try {
    _origLoad = HTMLMediaElement.prototype.load;
    if (typeof _origLoad === 'function') {
      HTMLMediaElement.prototype.load = function interceptedLoad(...args) {
        if (getSetting('muteVideo', false)) {
          applyMuteToElement(this);
        }
        return _origLoad.apply(this, args);
      };
    }
  } catch (e) {
    debug('Audio interceptor: could not override HTMLMediaElement.prototype.load:', e);
  }

  // 5. Hook Document.prototype.createElement to silence elements upon birth
  try {
    if (typeof Document !== 'undefined' && Document.prototype.createElement) {
      const origCreateElement = Document.prototype.createElement;
      Document.prototype.createElement = function interceptedCreateElement(tagName, ...args) {
        const el = origCreateElement.call(this, tagName, ...args);
        if (typeof tagName === 'string') {
          const tag = tagName.toLowerCase();
          if (tag === 'video' || tag === 'audio') {
            if (getSetting('muteVideo', false)) {
              applyMuteToElement(el);
            }
          }
        }
        return el;
      };
    }
  } catch (e) {
    debug('Audio interceptor: could not hook createElement:', e);
  }

  // 6. Hook window.Audio constructor
  try {
    if (typeof window !== 'undefined' && window.Audio) {
      const OrigAudio = window.Audio;
      const InterceptedAudio = function(...args) {
        const audio = new OrigAudio(...args);
        if (getSetting('muteVideo', false)) {
          applyMuteToElement(audio);
        }
        return audio;
      };
      InterceptedAudio.prototype = OrigAudio.prototype;
      window.Audio = InterceptedAudio;
    }
  } catch (e) {
    debug('Audio interceptor: could not hook Audio constructor:', e);
  }

  // 7. Capture media playback and volume events across document
  const captureEvents = [
    'play', 'playing', 'loadedmetadata', 'canplay',
    'loadstart', 'canplaythrough', 'durationchange', 'timeupdate', 'volumechange',
  ];
  for (const ev of captureEvents) {
    try {
      document.addEventListener(ev, onMediaCaptureEvent, true);
    } catch (_) {}
  }

  // 8. If muteVideo is already active in persisted storage, enforce immediately
  if (getSetting('muteVideo', false)) {
    muteAllMedia();
  }

  installed = true;
  info('Audio interceptor: installed (HTMLMediaElement monkey-patch & event capture)');
}

/**
 * Check whether the audio interceptor is installed.
 * @returns {boolean}
 */
export function isAudioInterceptorInstalled() {
  return installed;
}

// ---------------------------------------------------------------------------
// Settings integration
// ---------------------------------------------------------------------------

/**
 * Subscribe to the `muteVideo` setting to react to toggles at runtime.
 * Called from index.js after settings are loaded.
 */
export function initAudioInterceptorSettings() {
  onChange('muteVideo', (enabled) => {
    if (enabled) {
      muteAllMedia();
      info('Audio interceptor: enabled — video playback muted');
      appendLog('已启用静音播放视频');
    } else {
      unmuteAllMedia();
      info('Audio interceptor: disabled — video playback restored');
      appendLog('已关闭静音播放视频');
    }
  });

  // Apply immediately if already enabled in persisted settings
  if (getSetting('muteVideo', false)) {
    muteAllMedia();
  }
}
