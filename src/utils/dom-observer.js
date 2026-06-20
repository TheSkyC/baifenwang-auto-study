/**
 * @file Shared body-level MutationObserver — one observer, many handlers.
 *
 * Before this module, both processor.js and video-overlay.js created their
 * own MutationObserver on document.body with `{ childList: true, subtree:
 * true }`.  On a page with heavy DOM churn every mutation fired 2–3
 * observer callbacks, each traversing the mutation records independently.
 *
 * This module creates a single observer and dispatches to registered
 * handlers.  Modules call registerBodyMutationHandler(fn) and receive an
 * unsubscribe function.  Handlers that throw are isolated — one handler
 * failing does not prevent others from running.
 *
 * @module utils/dom-observer
 */

/** @type {MutationObserver|null} */
let _observer = null;

/** @type {Array<(mutations: MutationRecord[]) => void>} */
const _handlers = [];

/**
 * Register a callback to be invoked on every document.body mutation
 * (childList + subtree).  Returns an unsubscribe function; call it to
 * remove the handler.
 *
 * The observer is created lazily on the first registration and disconnected
 * automatically when all handlers unsubscribe.
 *
 * @param {(mutations: MutationRecord[]) => void} fn
 * @returns {() => void} unsubscribe function
 */
export function registerBodyMutationHandler(fn) {
  _handlers.push(fn);

  if (!_observer) {
    _observer = new MutationObserver((mutations) => {
      for (let i = 0; i < _handlers.length; i++) {
        try { _handlers[i](mutations); } catch (_) { /* isolate failures */ }
      }
    });
    _observer.observe(document.body, { childList: true, subtree: true });
  }

  return () => {
    const idx = _handlers.indexOf(fn);
    if (idx >= 0) _handlers.splice(idx, 1);
    if (_handlers.length === 0 && _observer) {
      _observer.disconnect();
      _observer = null;
    }
  };
}
