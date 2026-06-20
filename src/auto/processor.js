/**
 * @file Auto-processor for face verification windows
 * Observes the page for face recognition UI elements and auto-clicks them
 * in sequence: open camera → take photo → start comparison.
 *
 * Actual DOM structure on tj.100.wang:
 *
 *   State 1 (camera not opened):
 *     <div class="face_btn">
 *       <span class="face_btns btn_fill">开启摄像头</span>
 *     </div>
 *
 *   State 2 (camera opened, ready to take photo):
 *     <div class="face_btn">
 *       <span class="face_btns btn_again">拍照</span>
 *     </div>
 *
 *   State 3 (photo taken, two options):
 *     <div class="face_btn">
 *       <span class="face_btns btn_again">重新拍照</span>
 *       <span class="face_btns btn_contrast btn_fill">开始对比</span>
 *     </div>
 *
 * Note: .btn_again is used for BOTH "拍照" and "重新拍照" — text content
 * must be checked to distinguish the action.  "重试" (retry after failure)
 * may also use .btn_again.
 */

import { AUTO_CONFIG, jitterMs, jitterMsFloor } from '../config.js';
import { isFaceAutoActive, getSetting, onChange } from '../settings.js';
import { info, debug, warn } from '../utils/logger.js';
import { appendLog, setStatus } from '../ui/builder.js';
import { recordLastPickResult } from '../pool/image-pool.js';
import { registerBodyMutationHandler } from '../utils/dom-observer.js';

let observerUnsubscribe = null;
let retryAttempt = 0;
let retryExhausted = false;
let retryBackoffTimer = null;
let debounceTimer = null;
let compareRetries = 0;

/**
 * Consecutive compare-fail counter for the retake→compare loop.
 * Incremented each time a fresh "重新拍照" → "开始对比" cycle is triggered
 * from the comparing state.  Resets when the modal closes (success) or
 * when the processor is stopped/reset.
 */
let compareAttempts = 0;

/**
 * Timestamp (Date.now()) of the most recent state transition.
 * Used by the watchdog check in checkAndStartSequence() to detect
 * sequences that have been stuck in the same state too long without
 * making progress.
 */
let _stateEnteredAt = 0;

/**
 * Maximum time (ms) a non-idle sequence state may persist before the
 * watchdog forces a reset.  Catches edge cases where the DOM stops
 * updating (slow server, frozen page) and the MutationObserver stays
 * silent — the state machine would otherwise be stuck forever.
 */
const WATCHDOG_TIMEOUT_MS = 10000;

/**
 * Sentinel that prevents duplicate post-cooldown re-check timers.
 * Set to true when scheduleCooldownRecheck() arms a timer; cleared
 * when the timer fires or when clearSequence() runs.
 */
let _cooldownRecheckScheduled = false;

/**
 * Timestamp (Date.now()) of the most recent "开始对比" click.
 * Used by handleCompareFailRecovery to enforce a cooldown period —
 * the server needs time to respond before we can safely conclude that
 * the comparison was rejected.  0 = no compare has been submitted yet.
 */
let _lastCompareSubmittedAt = 0;

/**
 * Jittered cooldown duration (ms) for the current compare cycle.
 * Captured once at compare-submit time so the cooldown is stable for
 * the entire server-response window.  Varies per attempt.
 *
 * Initialised from AUTO_CONFIG at module load — assumes {@link AUTO_CONFIG}
 * is available at this point (imported at the top of the module).
 */
let _compareCooldownMs = AUTO_CONFIG.COMPARE_COOLDOWN_MS;

/**
 * Current auto-click sequence state.
 * @type {'idle' | 'waiting_modal' | 'camera_opening' | 'photo_taking' | 'photo_taken' | 'comparing'}
 */
let sequenceState = 'idle';

/**
 * Whether a verification attempt is in flight — any state past the initial
 * modal detection where an image from the pool is being used for verification.
 *
 * Set implicitly by the state machine; read when the modal disappears to
 * decide whether to record a success for the last picked image.
 *
 * True for: camera_opening, photo_taking, photo_taken, comparing.
 * False for: idle, waiting_modal.
 */
function isVerificationInFlight() {
  return sequenceState === 'camera_opening'
      || sequenceState === 'photo_taking'
      || sequenceState === 'photo_taken'
      || sequenceState === 'comparing';
}

/**
 * Transition the sequence state machine and record the timestamp.
 * Every state assignment must go through this helper so the watchdog
 * can detect stalled sequences.
 * @param {string} newState
 */
function transitionState(newState) {
  sequenceState = newState;
  _stateEnteredAt = Date.now();
}

/**
 * Schedule a one-shot re-check after the compare cooldown expires.
 *
 * When handleCompareFailRecovery is blocked by the cooldown guard,
 * there may be no further DOM mutations to trigger the observer.
 * This timer ensures we re-evaluate the modal state once the server
 * has had time to respond.
 *
 * Idempotent — only one re-check timer is scheduled at a time.
 *
 * @param {number} elapsed - ms already elapsed since compare was submitted
 */
function scheduleCooldownRecheck(elapsed) {
  if (_cooldownRecheckScheduled) return;
  _cooldownRecheckScheduled = true;

  const remaining = _compareCooldownMs - elapsed + 150;
  debug(`Scheduling cooldown re-check in ${remaining}ms`);
  const timer = setTimeout(() => {
    _cooldownRecheckScheduled = false;
    checkAndStartSequence();
  }, remaining);
  sequenceTimers.push(timer);
}

/**
 * Timer handles for the sequential click delays (used to cancel on reset).
 */
let sequenceTimers = [];

// ---------------------------------------------------------------------------
// Selectors & text patterns
// ---------------------------------------------------------------------------

/**
 * CSS selectors for face verification UI elements.
 * These are tried first (fast path); text-content fallback is used when selectors fail.
 */
const FACE_UI_SELECTORS = {
  /** The face verification modal container (Ant Design modal) */
  MODAL: '.ant-modal-content',
  /** Open camera button — .face_btns.btn_fill without .btn_contrast */
  CAMERA_BTN: '.face_btns.btn_fill:not(.btn_contrast)',
  /** Take photo / re-take photo button — .face_btns.btn_again */
  PHOTO_BTN: '.face_btns.btn_again',
  /** Start comparison button */
  COMPARE_BTN: '.face_btns.btn_contrast.btn_fill',
  /** Any face action button */
  ANY_FACE_BTN: '.face_btns',
};

/**
 * Text patterns for button identification (fallback when CSS selectors are ambiguous).
 * .btn_again is used for "拍照", "重新拍照", and possibly "重试" —
 * we distinguish by text content.
 *
 * Exported for use by video-overlay.js and other UI modules that search for
 * face verification buttons.
 */
export const BTN_TEXT = {
  CAMERA: ['开启摄像头', '打开摄像头'],
  PHOTO: ['拍照'],
  RETAKE: ['重新拍照', '重新拍'],
  COMPARE: ['开始对比', '对比', '开始验证'],
  RETRY: ['重试', '重新验证'],
};

// ---------------------------------------------------------------------------
// Button finder — class selector first, text fallback
// ---------------------------------------------------------------------------

/**
 * Find a button element using class selectors first, falling back to text-content search.
 *
 * @param {string} selector - CSS selector to try first
 * @param {string[]} [textPatterns] - Text patterns for fallback search
 * @param {HTMLElement} [root=document] - Root element to search within
 * @returns {HTMLElement|null}
 */
export function findButton(selector, textPatterns, root = document) {
  // 1. Class-based selector (fast path)
  const el = root.querySelector(selector);
  if (el) return el;

  // 2. Text-content fallback (slow path)
  if (textPatterns && textPatterns.length > 0) {
    // Search among .face_btns elements first
    const faceBtns = root.querySelectorAll('.face_btns');
    for (const btn of faceBtns) {
      const text = (btn.textContent || '').trim();
      for (const pattern of textPatterns) {
        if (text.includes(pattern)) return btn;
      }
    }
    // Broader: search any button-like element
    // Exclude our own panel buttons to avoid recursive self-clicks
    const candidates = root.querySelectorAll('button, [role="button"], .ant-btn, .ant-btn-primary');
    for (const btn of candidates) {
      if (btn.closest('.bfw-panel')) continue;
      const text = (btn.textContent || '').trim();
      for (const pattern of textPatterns) {
        if (text.includes(pattern)) return btn;
      }
    }
  }

  return null;
}

/**
 * Check if a button element's text matches any pattern in the list.
 * @param {Element} btn
 * @param {string[]} patterns
 * @returns {boolean}
 */
function btnTextMatches(btn, patterns) {
  const text = (btn.textContent || '').trim();
  return patterns.some(p => text.includes(p));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Clear all pending sequence timers and reset state.
 */
function clearSequence() {
  sequenceTimers.forEach(clearTimeout);
  sequenceTimers = [];
  transitionState('idle');
  compareRetries = 0;
  _lastCompareSubmittedAt = 0;
  _compareCooldownMs = AUTO_CONFIG.COMPARE_COOLDOWN_MS;
  _cooldownRecheckScheduled = false;
}

/**
 * Click an element and log the action.
 * @param {Element} el
 * @param {string} label
 * @returns {boolean}
 */
function clickElement(el, label) {
  if (!el) return false;
  try {
    el.click();
    info(`Auto-clicked: ${label}`);
    appendLog(`已自动点击: ${label}`);
    return true;
  } catch (e) {
    warn(`Auto-click failed for "${label}":`, e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Retry backoff
// ---------------------------------------------------------------------------

/**
 * Calculate the exponential backoff delay for the current retry attempt.
 * @returns {number} milliseconds
 */
function getBackoffDelay() {
  const delay = AUTO_CONFIG.RETRY_BASE_DELAY_MS * Math.pow(2, retryAttempt - 1);
  return jitterMs(Math.min(delay, AUTO_CONFIG.RETRY_MAX_DELAY_MS), 0.2);
}

/**
 * Handle retry exhaustion — give up and stop the auto-processor.
 */
function exhaustRetries() {
  retryExhausted = true;
  warn(`Retry limit reached (${AUTO_CONFIG.RETRY_MAX_ATTEMPTS} attempts). Stopping auto-processor.`);
  appendLog(`自动重试已达上限 (${AUTO_CONFIG.RETRY_MAX_ATTEMPTS} 次)，已停止`);
  setStatus(false, '已停止 — 重试次数已达上限');
  stopAutoProcessor();
}

// ---------------------------------------------------------------------------
// Sequential auto-click flow
// ---------------------------------------------------------------------------

/**
 * Phase 1: Find and click the "open camera" button.
 * After clicking, schedule phase 2 (photo).
 */
function clickCameraButton() {
  if (sequenceState !== 'waiting_modal') return;

  const modal = document.querySelector(FACE_UI_SELECTORS.MODAL);
  const rootNode = modal || document;
  const btn = findButton(FACE_UI_SELECTORS.CAMERA_BTN, BTN_TEXT.CAMERA, rootNode);

  if (!btn) {
    // Camera button not found — maybe we can skip to photo or compare
    debug('Camera button not found, looking for photo/compare button directly');
    const photoBtn = findButton(FACE_UI_SELECTORS.PHOTO_BTN, null, rootNode);
    if (photoBtn && btnTextMatches(photoBtn, BTN_TEXT.PHOTO) && !btnTextMatches(photoBtn, BTN_TEXT.RETAKE)) {
      // Camera already open, photo button visible — jump to photo phase
      debug('Found photo button directly — skipping camera phase');
      transitionState('camera_opening');
      clickPhotoButton();
      return;
    }
    const compareBtn = findButton(FACE_UI_SELECTORS.COMPARE_BTN, BTN_TEXT.COMPARE, rootNode);
    if (compareBtn) {
      debug('Found compare button directly — skipping to compare phase');
      transitionState('photo_taking');
      clickCompareButton();
      return;
    }
    debug('No camera, photo, or compare button found yet');
    return;
  }

  transitionState('camera_opening');
  clickElement(btn, '开启摄像头');

  // Schedule photo click after camera opens
  const timer = setTimeout(() => {
    clickPhotoButton();
  }, jitterMs(AUTO_CONFIG.CAMERA_OPEN_DELAY_MS, 0.35));
  sequenceTimers.push(timer);
}

/**
 * Phase 2: Click the "拍照" button (has class .btn_again).
 * This button appears after the camera is opened.
 * Also handles "重新拍照" — re-takes the photo and then proceeds to compare.
 */
function clickPhotoButton() {
  if (sequenceState !== 'camera_opening') return;

  const modal = document.querySelector(FACE_UI_SELECTORS.MODAL);
  const rootNode = modal || document;

  // Look for "拍照" button (.btn_again with text "拍照" but NOT "重新拍照")
  const allBtnAgain = rootNode.querySelectorAll(FACE_UI_SELECTORS.PHOTO_BTN);
  let photoBtn = null;
  for (const btn of allBtnAgain) {
    if (btnTextMatches(btn, BTN_TEXT.PHOTO) && !btnTextMatches(btn, BTN_TEXT.RETAKE)) {
      photoBtn = btn;
      break;
    }
  }

  // Also check if compare button already appeared
  const compareBtn = findButton(FACE_UI_SELECTORS.COMPARE_BTN, BTN_TEXT.COMPARE, rootNode);

  if (!photoBtn) {
    // No photo button — maybe compare already visible
    if (compareBtn) {
      if (!getSetting('autoCompare', true)) {
        info('Compare button visible but autoCompare OFF — pausing');
        appendLog('检测到对比按钮，自动对比已关闭 — 请手动点击');
        transitionState('photo_taken');
        return;
      }
      debug('Photo button not found, compare button visible — clicking compare directly');
      transitionState('photo_taking');
      clickCompareButton();
      return;
    }
    warn('Photo button not found after opening camera');
    return;
  }

  // Photo button found (guaranteed to be pure "拍照" at this point —
  // "重新拍照" was branched off above).
  //
  // If the compare button also already appeared alongside, it means the
  // page auto-took a photo.  We still want to click "拍照" to refresh
  // the pool image, so fall through to the normal flow below.

  transitionState('photo_taking');
  clickElement(photoBtn, '拍照');

  // Check autoCompare setting: when OFF, pause for manual confirmation
  if (!getSetting('autoCompare', true)) {
    transitionState('photo_taken');
    info('Photo taken — autoCompare OFF, pausing for manual confirmation');
    appendLog('拍摄完成 — 请确认后手动点击「开始对比」');
    setStatus(true, '等待确认 — 请手动点击对比');
    return;
  }

  // Schedule comparison click after photo is taken
  const timer = setTimeout(() => {
    clickCompareButton();
  }, jitterMs(AUTO_CONFIG.PHOTO_DELAY_MS, 0.3));
  sequenceTimers.push(timer);
}

/**
 * Phase 3: Click the "start comparison" button.
 * Retries a few times with short delays if the button isn't in the DOM yet.
 * Exported so the UI can trigger it manually when autoCompare is OFF.
 */
export function clickCompareButton() {
  if (sequenceState !== 'photo_taking' && sequenceState !== 'photo_taken') return;

  const modal = document.querySelector(FACE_UI_SELECTORS.MODAL);
  const rootNode = modal || document;

  // Check for "重新拍照" button — if visible, photo was taken and compare should appear
  const allBtnAgain = rootNode.querySelectorAll(FACE_UI_SELECTORS.PHOTO_BTN);
  let retakeBtn = null;
  for (const btn of allBtnAgain) {
    if (btnTextMatches(btn, BTN_TEXT.RETAKE)) {
      retakeBtn = btn;
      break;
    }
  }

  const btn = findButton(FACE_UI_SELECTORS.COMPARE_BTN, BTN_TEXT.COMPARE, rootNode);

  if (!btn) {
    // Compare button not yet in DOM — retry
    if (compareRetries < AUTO_CONFIG.MAX_COMPARE_RETRIES) {
      compareRetries++;
      debug(`Compare button not found, retry ${compareRetries}/${AUTO_CONFIG.MAX_COMPARE_RETRIES}`);
      const timer = setTimeout(() => clickCompareButton(), jitterMs(AUTO_CONFIG.COMPARE_RETRY_DELAY_MS, 0.25));
      sequenceTimers.push(timer);
      return;
    }

    warn('Compare button not found after retries — trying fallback');
    // Last resort: click any non-camera, non-photo face button
    const faceBtns = rootNode.querySelectorAll('.face_btns');
    for (const fb of faceBtns) {
      const text = (fb.textContent || '').trim();
      if (!btnTextMatches(fb, BTN_TEXT.CAMERA) && !btnTextMatches(fb, BTN_TEXT.PHOTO)) {
        clickElement(fb, `备选按钮 ("${text}")`);
        break;
      }
    }
    return;
  }

  transitionState('comparing');
  compareRetries = 0;
  _lastCompareSubmittedAt = Date.now();
  _compareCooldownMs = jitterMsFloor(AUTO_CONFIG.COMPARE_COOLDOWN_MS, 0.3);
  clickElement(btn, '开始对比');
  // Reset retry counter on successful comparison submission
  if (retryAttempt > 0) {
    info(`Retry counter reset (${retryAttempt} → 0) — compare submitted`);
    retryAttempt = 0;
    retryExhausted = false;
  }
}

/**
 * Check for a genuine retry button ("重试") and click it.
 * IMPORTANT: "拍照" and "重新拍照" also use .btn_again — we must distinguish
 * by text content and NOT treat "拍照" as a retry button.
 */
function clickRetryButton() {
  if (retryExhausted) return false;

  const modal = document.querySelector(FACE_UI_SELECTORS.MODAL);
  const rootNode = modal || document;

  // Only look for genuine retry buttons by text content
  // "重试" is the actual retry button; "拍照" and "重新拍照" are NOT retries
  const retryBtn = findButton(null, BTN_TEXT.RETRY, rootNode);
  if (!retryBtn) return false;

  // Enforce max retry attempts
  if (retryAttempt >= AUTO_CONFIG.RETRY_MAX_ATTEMPTS) {
    exhaustRetries();
    return false;
  }

  retryAttempt++;
  const delay = getBackoffDelay();

  info(`Retry attempt ${retryAttempt}/${AUTO_CONFIG.RETRY_MAX_ATTEMPTS} — waiting ${(delay / 1000).toFixed(1)}s`);
  appendLog(`重试第 ${retryAttempt}/${AUTO_CONFIG.RETRY_MAX_ATTEMPTS} 次 — 等待 ${(delay / 1000).toFixed(1)} 秒`);

  // Record failure for the last picked image — the retry means verification failed
  recordLastPickResult(false);

  clickElement(retryBtn, '重试');

  // Reset state to start the sequence over after backoff delay
  clearSequence();
  transitionState('waiting_modal');
  retryBackoffTimer = setTimeout(() => clickCameraButton(), delay);
  return true;
}

// ---------------------------------------------------------------------------
// Compare-fail recovery
// ---------------------------------------------------------------------------

/**
 * Handle the case where the previous comparison was rejected.
 * Called when sequenceState is 'comparing' but the modal is still visible.
 *
 * Three recovery paths:
 *   1. "重新拍照" + "开始对比" both visible → click retake, re-enter photo pipeline
 *   2. Only "开始对比" visible → click compare directly
 *   3. "开启摄像头" visible → modal fully reset; restart from scratch
 *
 * Paths 1 & 2 are guarded by a cooldown — while the server is processing the
 * original compare, the page shows the same buttons as a rejection, so we
 * schedule a re-check after the cooldown expires rather than acting early.
 * Path 3 bypasses the cooldown because the modal can only reset to "开启摄像头"
 * AFTER the server has responded, so there is no ambiguity.
 *
 * @param {HTMLElement} modal - The face verification modal element
 * @returns {boolean} true if recovery was attempted
 */
function handleCompareFailRecovery(modal) {
  // Enforce max consecutive compare retries
  if (compareAttempts >= AUTO_CONFIG.RETRY_MAX_ATTEMPTS) {
    warn(`Compare retry limit reached (${AUTO_CONFIG.RETRY_MAX_ATTEMPTS}). Stopping.`);
    appendLog(`对比重试次数已达上限 (${AUTO_CONFIG.RETRY_MAX_ATTEMPTS} 次)，请手动操作`);
    setStatus(false, '已停止 — 对比重试次数已达上限');
    return true; // modal is present; caller should not start a new sequence
  }

  const elapsed = Date.now() - _lastCompareSubmittedAt;
  const cooldownActive = _lastCompareSubmittedAt > 0 && elapsed < _compareCooldownMs;
  if (cooldownActive) {
    debug(`Compare cooldown active (${elapsed}ms / ${_compareCooldownMs}ms)`);
  }

  const allBtnAgain = modal.querySelectorAll(FACE_UI_SELECTORS.PHOTO_BTN);
  let retakeBtn = null;
  for (const btn of allBtnAgain) {
    if (btnTextMatches(btn, BTN_TEXT.RETAKE)) { retakeBtn = btn; break; }
  }
  const compareBtn = findButton(FACE_UI_SELECTORS.COMPARE_BTN, BTN_TEXT.COMPARE, modal);

  // ── Path 1: both "重新拍照" and "开始对比" visible ─────────────────
  // Ambiguous state — same DOM during server wait and after rejection.
  // Cooldown MUST be respected.
  if (retakeBtn && compareBtn) {
    if (cooldownActive) {
      scheduleCooldownRecheck(elapsed);
      return false;
    }

    compareAttempts++;
    info(`Verification failed — retry ${compareAttempts}/${AUTO_CONFIG.RETRY_MAX_ATTEMPTS}: clicking retake, then photo`);
    appendLog(`验证未通过，自动重试第 ${compareAttempts}/${AUTO_CONFIG.RETRY_MAX_ATTEMPTS} 次`);

    // Record failure for the last picked image
    recordLastPickResult(false);

    // Clear pending timers (don't touch compareAttempts)
    sequenceTimers.forEach(clearTimeout);
    sequenceTimers = [];
    compareRetries = 0;

    clickElement(retakeBtn, '重新拍照');

    // After retake the camera re-opens → go through the normal pipeline
    transitionState('camera_opening');
    const timer = setTimeout(() => clickPhotoButton(), jitterMs(AUTO_CONFIG.CAMERA_OPEN_DELAY_MS, 0.35));
    sequenceTimers.push(timer);
    return true;
  }

  // ── Path 2: only "开始对比" visible (no "重新拍照") ────────────────
  // Also ambiguous — cooldown applies.
  if (!retakeBtn && compareBtn) {
    if (cooldownActive) {
      scheduleCooldownRecheck(elapsed);
      return false;
    }

    compareAttempts++;
    info(`Verification failed — retry ${compareAttempts}/${AUTO_CONFIG.RETRY_MAX_ATTEMPTS}: compare button visible directly`);
    appendLog(`验证未通过，自动重试第 ${compareAttempts}/${AUTO_CONFIG.RETRY_MAX_ATTEMPTS} 次（直接对比）`);
    transitionState('photo_taking');
    clickCompareButton();
    return true;
  }

  // ── Path 3: modal fully reset to initial "开启摄像头" state ─────────
  // No cooldown guard here.  The modal can only transition to this state
  // AFTER the server has responded with a rejection — the DOM went from
  // "retake + compare" (pending) → "camera" (rejected).  There is no
  // ambiguity, so we act immediately.
  const cameraBtn = findButton(FACE_UI_SELECTORS.CAMERA_BTN, BTN_TEXT.CAMERA, modal);
  if (cameraBtn) {
    compareAttempts++;
    info(`Verification failed — retry ${compareAttempts}/${AUTO_CONFIG.RETRY_MAX_ATTEMPTS}: modal reset to initial state`);
    appendLog(`验证未通过，自动重试第 ${compareAttempts}/${AUTO_CONFIG.RETRY_MAX_ATTEMPTS} 次（重新开始）`);

    // Record failure for the last picked image
    recordLastPickResult(false);

    // Reset state so checkAndStartSequence can start a fresh sequence
    clearSequence();
    // Keep compareAttempts — it tracks consecutive failures within the same
    // modal session and is only reset when the modal closes or processor stops.
    return false; // Let checkAndStartSequence fall through to startModalSequence
  }

  // Neither button visible yet — fall through
  return false;
}

// ---------------------------------------------------------------------------
// Modal sequence start
// ---------------------------------------------------------------------------

/**
 * Kick off a fresh auto-click sequence when the face modal first appears.
 * @param {HTMLElement} modal
 */
function startModalSequence(modal) {
  if (retryAttempt > 0) {
    info(`Retry counter reset (${retryAttempt} → 0) — new modal detected`);
    retryAttempt = 0;
    retryExhausted = false;
  }

  transitionState('waiting_modal');
  info('Face verification modal detected, starting auto-click sequence');
  appendLog('检测到人脸验证窗口，开始自动操作');
  setStatus(true, '运行中 — 自动处理人脸验证');

  // Give the modal time to fully render, then begin
  const timer = setTimeout(() => {
    clickCameraButton();
  }, jitterMs(AUTO_CONFIG.CLICK_DELAY_MS, 0.4));
  sequenceTimers.push(timer);
}

// ---------------------------------------------------------------------------
// Modal detection & sequence kickoff
// ---------------------------------------------------------------------------

/**
 * Check if the face verification modal is present and start the sequence.
 * @returns {boolean} Whether the modal was detected
 */
function checkAndStartSequence() {
  // Check settings — skip if auto-click is disabled
  if (!isFaceAutoActive()) {
    debug('Auto-processor: face auto not active, skipping');
    return false;
  }

  const modal = document.querySelector(FACE_UI_SELECTORS.MODAL);
  if (!modal) {
    if (isVerificationInFlight()) {
      // Modal disappeared while a verification attempt was in flight —
      // the comparison was accepted → record success for the last picked image.
      info(`Face modal closed during "${sequenceState}" → verification SUCCESS`);
      recordLastPickResult(true);
    }
    if (sequenceState !== 'idle') {
      debug('Face modal disappeared, resetting auto-processor state');
      clearSequence();
      compareAttempts = 0;
    }
    return false;
  }

  // Log available buttons for debugging
  debug('Auto-processor: modal found, scanning buttons');
  const allBtns = modal.querySelectorAll('.face_btns, .face_btn, .ant-btn, button');
  for (const btn of allBtns) {
    debug(`  Button: classes="${btn.className}" text="${(btn.textContent || '').trim().substring(0, 30)}"`);
  }

  // ── Watchdog: detect stuck sequence states ──────────────────────────
  // If the state machine has been parked in the same non-idle state for
  // longer than WATCHDOG_TIMEOUT_MS, something went wrong (e.g. the DOM
  // never updated and the MutationObserver stayed silent).  Force a reset
  // so the processor can re-scan and recover.
  //
  // photo_taken is excluded — it means autoCompare is OFF and the user
  // intentionally wants manual confirmation; the pause is expected.
  if (sequenceState !== 'idle' && sequenceState !== 'photo_taken'
      && _stateEnteredAt > 0
      && (Date.now() - _stateEnteredAt) > WATCHDOG_TIMEOUT_MS) {
    warn(`Watchdog: state "${sequenceState}" stuck for ${Date.now() - _stateEnteredAt}ms — forcing reset`);
    appendLog('自动操作卡住超时，正在重置');
    clearSequence();
    // Keep compareAttempts — watchdog fires on transient stalls, not
    // verification failures.  Resetting the counter would allow infinite
    // retry loops when the page is consistently slow.
    // Fall through to start a fresh sequence below
  }

  // 1. Check for genuine retry button ("重试")
  if (clickRetryButton()) return true;

  // 2. Compare-fail recovery
  if (sequenceState === 'comparing' && handleCompareFailRecovery(modal)) return true;

  // 2b. Fresh-modal guard: when the state machine is stuck in any non-idle
  //     state from a previous (possibly interrupted) sequence, but the DOM
  //     shows a brand-new modal with camera or photo buttons, reset and
  //     start over.  This recovers from two scenarios:
  //
  //       a) SPA navigation replaced the old modal while state was still
  //          in-flight — the new modal appears with "开启摄像头";
  //       b) handleCompareFailRecovery mis-fired on a slow-but-successful
  //          compare (cooldown expired while server was still processing),
  //          advancing state to camera_opening before the server closed
  //          the modal — leaving state stuck when the next modal opens.
  if (sequenceState !== 'idle' && sequenceState !== 'photo_taken') {
    const freshCameraBtn = findButton(FACE_UI_SELECTORS.CAMERA_BTN, BTN_TEXT.CAMERA, modal);
    const allPhotoBtns = modal.querySelectorAll(FACE_UI_SELECTORS.PHOTO_BTN);
    let freshPhotoBtn = null;
    for (const btn of allPhotoBtns) {
      if (btnTextMatches(btn, BTN_TEXT.PHOTO) && !btnTextMatches(btn, BTN_TEXT.RETAKE)) { freshPhotoBtn = btn; break; }
    }
    if (freshCameraBtn || freshPhotoBtn) {
      debug(`State is "${sequenceState}" but fresh modal detected (camera=${!!freshCameraBtn} photo=${!!freshPhotoBtn}) — resetting and restarting`);
      clearSequence();
      // Keep compareAttempts — it tracks failures within the same modal
      // session.  Only the modal-close (success) or stopAutoProcessor
      // should reset this counter.
      startModalSequence(modal);
      return true;
    }
  }

  // 3. Guard: don't restart if already in a non-idle state.
  //    photo_taken means autoCompare is OFF and we're intentionally paused
  //    waiting for manual confirmation — only the autoCompare toggle
  //    listener or modal-close should move us out of this state.
  if (sequenceState !== 'idle') return true;

  // 4. Start a fresh sequence (only from idle)
  startModalSequence(modal);
  return true;
}

// ---------------------------------------------------------------------------
// Retry handler — called from UI panel
// ---------------------------------------------------------------------------

/**
 * Handle the retry custom event dispatched from the UI panel.
 */
function onRetry() {
  if (!isFaceAutoActive()) {
    warn('Manual retry ignored — face auto is disabled');
    appendLog('手动重试已忽略 — 过人脸已关闭');
    return;
  }

  info('Manual retry received — scanning for face UI elements');
  appendLog('已触发手动重试');

  // Reset sequence state so we can re-enter the flow
  clearSequence();

  const modal = document.querySelector(FACE_UI_SELECTORS.MODAL);
  const rootNode = modal || document;

  // Try genuine retry button first
  const retryBtn = findButton(null, BTN_TEXT.RETRY, rootNode);
  if (retryBtn) {
    clickElement(retryBtn, '重试按钮');
    transitionState('waiting_modal');
    setTimeout(() => clickCameraButton(), jitterMs(AUTO_CONFIG.RETRY_CAMERA_DELAY_MS, 0.35));
    return;
  }

  const cameraBtn = findButton(FACE_UI_SELECTORS.CAMERA_BTN, BTN_TEXT.CAMERA, rootNode);
  if (cameraBtn) {
    clickElement(cameraBtn, '开启摄像头');
    transitionState('camera_opening');
    setTimeout(() => clickPhotoButton(), jitterMs(AUTO_CONFIG.CAMERA_OPEN_DELAY_MS, 0.35));
    return;
  }

  // Look for "拍照" specifically (not "重新拍照" — that's handled as a retake below)
  const allBtnAgain = rootNode.querySelectorAll(FACE_UI_SELECTORS.PHOTO_BTN);
  for (const btn of allBtnAgain) {
    if (btnTextMatches(btn, BTN_TEXT.PHOTO) && !btnTextMatches(btn, BTN_TEXT.RETAKE)) {
      clickElement(btn, '拍照');
      transitionState('photo_taking');
      setTimeout(() => clickCompareButton(), jitterMs(AUTO_CONFIG.PHOTO_DELAY_MS, 0.3));
      return;
    }
  }

  // "重新拍照" — retake, then schedule the photo pipeline
  for (const btn of allBtnAgain) {
    if (btnTextMatches(btn, BTN_TEXT.RETAKE)) {
      clickElement(btn, '重新拍照');
      transitionState('camera_opening');
      setTimeout(() => clickPhotoButton(), jitterMs(AUTO_CONFIG.CAMERA_OPEN_DELAY_MS, 0.35));
      return;
    }
  }

  const compareBtn = findButton(FACE_UI_SELECTORS.COMPARE_BTN, BTN_TEXT.COMPARE, rootNode);
  if (compareBtn) {
    clickElement(compareBtn, '开始对比按钮');
    return;
  }

  warn('No face UI element found on manual retry');
  appendLog('未找到可点击的人脸验证元素');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start observing the DOM for face verification popups.
 */
export function startAutoProcessor() {
  if (observerUnsubscribe) {
    warn('Auto-processor is already running');
    return;
  }

  // Initial scan — check if modal is already present
  checkAndStartSequence();

  // Register with the shared body-level MutationObserver
  observerUnsubscribe = registerBodyMutationHandler((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList'
          && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
        if (retryExhausted) break;

        clearTimeout(debounceTimer);
        const baseDebounce = retryAttempt > 0
          ? Math.min(AUTO_CONFIG.CLICK_DELAY_MS * (retryAttempt + 1), 2000)
          : AUTO_CONFIG.CLICK_DELAY_MS;
        debounceTimer = setTimeout(() => {
          checkAndStartSequence();
        }, jitterMs(baseDebounce, 0.35));
        break;
      }
    }
  });

  document.addEventListener('bfw:retry', onRetry);

  info('Auto-processor started');
  setStatus(true, '运行中 — 正在处理人脸验证');
  appendLog('自动处理器已启动');
}

/**
 * Start the auto-processor and disconnect the observer.
 */
export function stopAutoProcessor() {
  if (observerUnsubscribe) {
    observerUnsubscribe();
    observerUnsubscribe = null;
  }
  clearTimeout(debounceTimer);
  debounceTimer = null;
  clearTimeout(retryBackoffTimer);
  retryBackoffTimer = null;
  clearSequence();
  document.removeEventListener('bfw:retry', onRetry);
  retryAttempt = 0;
  retryExhausted = false;
  compareAttempts = 0;
  setStatus(false, '已停止');
  appendLog('自动处理器已停止');
  info('Auto-processor stopped');
}

/**
 * Reset the auto-processor sequence state without stopping the observer.
 * Allows the overlay's camera toggle to restart the flow from scratch
 * (avoids the processor being stuck in 'photo_taken' or other states).
 */
export function resetAutoSequence() {
  clearTimeout(debounceTimer);
  debounceTimer = null;
  clearTimeout(retryBackoffTimer);
  retryBackoffTimer = null;
  clearSequence();
  retryAttempt = 0;
  retryExhausted = false;
  compareAttempts = 0;
  debug('Auto-processor: sequence reset for camera toggle');
}

// ---------------------------------------------------------------------------
// Settings listener
// ---------------------------------------------------------------------------

function syncProcessorFromSettings() {
  const shouldRun = isFaceAutoActive();
  if (shouldRun && !observerUnsubscribe) {
    startAutoProcessor();
  } else if (!shouldRun && observerUnsubscribe) {
    stopAutoProcessor();
  }
}

onChange('faceAutoClick', () => syncProcessorFromSettings());

// When autoCompare is toggled ON while paused at photo_taken, resume the flow
onChange('autoCompare', (val) => {
  if (val && sequenceState === 'photo_taken') {
    info('autoCompare toggled ON — resuming comparison');
    appendLog('自动对比已开启 — 继续执行对比');
    setStatus(true, '运行中 — 正在处理人脸验证');
    // Short delay to allow the UI to update before clicking
    const timer = setTimeout(() => clickCompareButton(), jitterMs(300, 0.4));
    sequenceTimers.push(timer);
  }
});