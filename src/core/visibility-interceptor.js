/**
 * @file Visibility interceptor — prevents the site from detecting tab-switch or window minimization.
 *
 * 百分网 (tj.100.wang) uses the Page Visibility API and blur events to detect when the
 * user switches tabs or minimizes the window, then pauses the video and shows a warning:
 * "检测到您可能已离开本窗口，已自动暂停播放视频".
 *
 * This module intercepts every known detection vector so the site believes the page
 * is always visible and focused, regardless of the actual window state.
 *
 * Vectors covered:
 *   1. document.hidden                  → always false
 *   2. document.visibilityState         → always "visible"
 *   3. document.hasFocus()              → always true
 *   4. visibilitychange event           → captured & suppressed
 *   5. window blur event                → captured & suppressed
 *   6. document.onvisibilitychange      → setter intercepted
 *   7. window.onblur                    → setter intercepted
 *   8. document.webkitHidden (legacy)   → always false
 *   9. document.msHidden (legacy IE)    → always false
 *  10. pagehide / pageshow events       → captured & suppressed
 */

import { getSetting, onChange } from '../settings.js';
import { info, debug, warn } from '../utils/logger.js';
import { appendLog } from '../ui/builder.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** Whether the interceptor is currently active (installed & enforcing). */
let active = false;

/** Whether install() has ever been called (prevents double-install). */
let installed = false;

// ---------------------------------------------------------------------------
// Saved references for uninstall
// ---------------------------------------------------------------------------

/** Original document.hidden descriptor. */
let _originalHiddenDescriptor = null;

/** Original document.visibilityState descriptor. */
let _originalVisibilityStateDescriptor = null;

/** Original document.hasFocus function. */
let _originalHasFocus = null;

/** Original document.onvisibilitychange descriptor. */
let _originalOnVisibilityChangeDescriptor = null;

/** Original window.onblur descriptor. */
let _originalOnBlurDescriptor = null;

/** Original document.webkitHidden descriptor (if exists). */
let _originalWebkitHiddenDescriptor = null;

/** Original document.msHidden descriptor (if exists). */
let _originalMsHiddenDescriptor = null;

// ---------------------------------------------------------------------------
// Event handlers (capture phase — fire before page listeners)
// ---------------------------------------------------------------------------

/**
 * Suppress visibilitychange events at the capture phase.
 * Calling stopImmediatePropagation() here prevents any non-capture listeners
 * (which is what the page registers) from ever seeing the event.
 */
function onVisibilityChangeCapture(e) {
  if (!active) return;
  e.stopImmediatePropagation();
}

/**
 * Suppress window blur events at the capture phase.
 * We only intercept blur on the window object — child element blurs are
 * allowed through so UI interactions still work.
 */
function onWindowBlurCapture(e) {
  if (!active) return;
  if (e.target === window || e.target === document) {
    e.stopImmediatePropagation();
  }
}

/**
 * Suppress pagehide events at the capture phase.
 * Some sites use this as an additional visibility signal.
 */
function onPageHideCapture(e) {
  if (!active) return;
  e.stopImmediatePropagation();
}

/**
 * Suppress pageshow events at the capture phase.
 * (Symmetry — if we block pagehide we block pageshow too.)
 */
function onPageShowCapture(e) {
  if (!active) return;
  e.stopImmediatePropagation();
}

// ---------------------------------------------------------------------------
// Install
// ---------------------------------------------------------------------------

/**
 * Install the visibility interceptor.
 *
 * After calling this, document.hidden is always false and visibilitychange
 * events never reach page-registered listeners (the interceptor consumes them
 * at the capture phase before they bubble).  window blur events are also
 * suppressed at the capture phase for the window target only.
 *
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function installVisibilityInterceptor() {
  if (installed) {
    debug('Visibility interceptor: already installed, skipping');
    return;
  }
  installed = true;

  // --- document.hidden ---
  try {
    _originalHiddenDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden')
      || Object.getOwnPropertyDescriptor(document, 'hidden');
    Object.defineProperty(document, 'hidden', {
      get: () => active ? false : (_originalHiddenDescriptor
        ? _originalHiddenDescriptor.get.call(document)
        : false),
      configurable: true,
      enumerable: true,
    });
  } catch (e) {
    // Fallback: some browsers expose it on Document.prototype
    try {
      _originalHiddenDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
      Object.defineProperty(Document.prototype, 'hidden', {
        get: () => active ? false : (_originalHiddenDescriptor
          ? _originalHiddenDescriptor.get.call(document)
          : false),
        configurable: true,
        enumerable: true,
      });
    } catch (e2) {
      warn('Visibility interceptor: could not override document.hidden', e2);
    }
  }

  // --- document.visibilityState ---
  try {
    _originalVisibilityStateDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState')
      || Object.getOwnPropertyDescriptor(document, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', {
      get: () => active ? 'visible' : (_originalVisibilityStateDescriptor
        ? _originalVisibilityStateDescriptor.get.call(document)
        : 'visible'),
      configurable: true,
      enumerable: true,
    });
  } catch (e) {
    try {
      _originalVisibilityStateDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
      Object.defineProperty(Document.prototype, 'visibilityState', {
        get: () => active ? 'visible' : (_originalVisibilityStateDescriptor
          ? _originalVisibilityStateDescriptor.get.call(document)
          : 'visible'),
        configurable: true,
        enumerable: true,
      });
    } catch (e2) {
      warn('Visibility interceptor: could not override document.visibilityState', e2);
    }
  }

  // --- document.hasFocus ---
  try {
    _originalHasFocus = document.hasFocus;
    document.hasFocus = function hasFocus() {
      return active ? true : _originalHasFocus.call(document);
    };
  } catch (e) {
    warn('Visibility interceptor: could not override document.hasFocus', e);
  }

  // --- document.onvisibilitychange setter ---
  try {
    _originalOnVisibilityChangeDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'onvisibilitychange')
      || Object.getOwnPropertyDescriptor(document, 'onvisibilitychange');
    const target = _originalOnVisibilityChangeDescriptor ? Document.prototype : document;
    Object.defineProperty(target, 'onvisibilitychange', {
      get() {
        // Return the original getter value — the page can still read it
        return _originalOnVisibilityChangeDescriptor
          ? _originalOnVisibilityChangeDescriptor.get.call(this)
          : undefined;
      },
      set(fn) {
        if (_originalOnVisibilityChangeDescriptor) {
          _originalOnVisibilityChangeDescriptor.set.call(this, fn);
        }
        // We don't block the setter — the capture-phase listener already
        // suppresses the event.  Letting the setter through is harmless and
        // avoids breakage if the page checks for assignment success.
      },
      configurable: true,
      enumerable: true,
    });
  } catch (e) {
    debug('Visibility interceptor: could not intercept onvisibilitychange setter', e);
  }

  // --- window.onblur setter ---
  try {
    _originalOnBlurDescriptor = Object.getOwnPropertyDescriptor(Window.prototype, 'onblur')
      || Object.getOwnPropertyDescriptor(window, 'onblur');
    const target = _originalOnBlurDescriptor ? Window.prototype : window;
    Object.defineProperty(target, 'onblur', {
      get() {
        return _originalOnBlurDescriptor
          ? _originalOnBlurDescriptor.get.call(this)
          : undefined;
      },
      set(fn) {
        if (_originalOnBlurDescriptor) {
          _originalOnBlurDescriptor.set.call(this, fn);
        }
      },
      configurable: true,
      enumerable: true,
    });
  } catch (e) {
    debug('Visibility interceptor: could not intercept onblur setter', e);
  }

  // --- document.webkitHidden (legacy Safari/Chrome) ---
  try {
    if ('webkitHidden' in document) {
      _originalWebkitHiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'webkitHidden');
      Object.defineProperty(document, 'webkitHidden', {
        get: () => active ? false : (_originalWebkitHiddenDescriptor
          ? _originalWebkitHiddenDescriptor.get.call(document)
          : false),
        configurable: true,
        enumerable: true,
      });
    }
  } catch (e) {
    debug('Visibility interceptor: could not override document.webkitHidden', e);
  }

  // --- document.msHidden (legacy IE) ---
  try {
    if ('msHidden' in document) {
      _originalMsHiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'msHidden');
      Object.defineProperty(document, 'msHidden', {
        get: () => active ? false : (_originalMsHiddenDescriptor
          ? _originalMsHiddenDescriptor.get.call(document)
          : false),
        configurable: true,
        enumerable: true,
      });
    }
  } catch (e) {
    debug('Visibility interceptor: could not override document.msHidden', e);
  }

  // --- Event listeners (capture phase) ---
  document.addEventListener('visibilitychange', onVisibilityChangeCapture, true);
  window.addEventListener('blur', onWindowBlurCapture, true);
  window.addEventListener('pagehide', onPageHideCapture, true);
  window.addEventListener('pageshow', onPageShowCapture, true);

  info('Visibility interceptor: installed (all vectors covered)');
}

// ---------------------------------------------------------------------------
// Activate / deactivate
// ---------------------------------------------------------------------------

/**
 * Enable interception.  Until this is called the getters and event handlers
 * pass through to the original browser behavior.
 */
export function enableVisibilityInterceptor() {
  if (!installed) {
    installVisibilityInterceptor();
  }
  if (active) return;
  active = true;
  info('Visibility interceptor: ACTIVATED — page cannot detect tab-switch or minimization');
  appendLog('离开检测拦截已启用');
}

/**
 * Disable interception.  Restores pass-through behavior.
 */
export function disableVisibilityInterceptor() {
  if (!active) return;
  active = false;
  info('Visibility interceptor: DEACTIVATED — pass-through mode');
  appendLog('离开检测拦截已关闭');
}

/**
 * Check whether the interceptor is currently active.
 * @returns {boolean}
 */
export function isVisibilityInterceptorActive() {
  return active;
}

// ---------------------------------------------------------------------------
// Auto-init: react to settings changes
// ---------------------------------------------------------------------------

/**
 * Subscribe to the `disableVisibilityCheck` setting so the interceptor can
 * be toggled at runtime via the UI.  Called once from index.js after settings
 * are loaded.
 */
export function initVisibilityInterceptorSettings() {
  // React to UI toggles (runtime)
  onChange('disableVisibilityCheck', (enabled) => {
    if (enabled) {
      enableVisibilityInterceptor();
    } else {
      disableVisibilityInterceptor();
    }
  });

  // React to persisted setting (initial load)
  const current = getSetting('disableVisibilityCheck', false);
  if (current) {
    enableVisibilityInterceptor();
  }
}
