/**
 * @file Main entry point for baifenwang-auto-study userscript.
 * Bootstraps interceptors, auto-processor, UI, and image pool.
 */

import { SCRIPT_NAME, SCRIPT_VERSION } from './config.js';
import { debug, info, warn, error } from './utils/logger.js';
import { loadSettings } from './settings.js';        // persistent settings loader
import { loadProgressTracker } from './utils/progress-tracker.js';  // progress history loader
import { installVideoInterceptor } from './core/video-interceptor.js';
import { initVideoOverlay } from './ui/video-overlay.js';
import { installVisibilityInterceptor, initVisibilityInterceptorSettings } from './core/visibility-interceptor.js';
import { buildUI, appendLog, setStatus } from './ui/builder.js';
import { startAutoProcessor } from './auto/processor.js';
import './auto/course-processor.js';    // side-effect: registers settings listener
import { startCourseMonitor, stopCourseMonitor } from './auto/course-processor.js';
import { initPool } from './pool/image-pool.js';

/**
 * Initialize the userscript.
 * Interceptors are installed immediately (run-at: document-start).
 * UI, auto-processor, and image pool are deferred until DOM is ready.
 *
 * Each subsystem is wrapped in try-catch so one failure doesn't block
 * the rest.  Errors are surfaced in both the console and the UI log panel
 * (once the UI is mounted).
 */
function bootstrap() {
  info(`${SCRIPT_NAME} v${SCRIPT_VERSION} starting…`);

  // ---- Phase 1: install interceptors immediately (before page scripts run) ----

  try { installVideoInterceptor(); } catch (e) {
    error('Video interceptor install failed:', e);
  }

  try { initVideoOverlay(); } catch (e) {
    error('Video overlay init failed:', e);
  }

  try { installVisibilityInterceptor(); } catch (e) {
    error('Visibility interceptor install failed:', e);
  }

  // ---- Phase 2: DOM-dependent components (deferred to ready) ----

  async function mountUI() {
    let uiReady = false;
    const fail = (msg) => {
      warn(msg);
      if (uiReady) appendLog(msg);
      else setTimeout(() => appendLog(msg), 0); // queue for after UI is built
    };

    // 2a. Persisted settings
    try {
      await loadSettings();
    } catch (e) {
      fail(`Settings load failed: ${e?.message || e}`);
      error('Settings load failed:', e);
    }

    // 2a1. Progress tracker (learning history)
    try {
      await loadProgressTracker();
      debug('Progress tracker loaded successfully');
    } catch (e) {
      // Non-fatal — stats panel will show empty data if this fails
      warn('Progress tracker init failed (non-fatal):', e);
    }

    // 2a2. Visibility interceptor — must run after settings load
    try {
      initVisibilityInterceptorSettings();
    } catch (e) {
      debug('Visibility interceptor init failed:', e);
    }

    // 2b. Image pool
    try {
      await initPool();
    } catch (e) {
      fail(`Image pool init failed: ${e?.message || e}`);
      error('Image pool init failed:', e);
      // Non-fatal — the pool will stay empty and the interceptor will fall
      // back to the real camera when it can't pick an image.
    }

    // 2c. Build UI panel (must succeed — otherwise we can't show any feedback)
    try {
      buildUI();
      uiReady = true;
      appendLog('UI面板已挂载');
    } catch (e) {
      error('UI build failed — no panel visible:', e);
      // Can't show UI — log to console only.  Interceptors are already
      // installed so the core bypass still works silently.
      return;
    }

    // 2d. Auto-processor
    try {
      startAutoProcessor();
    } catch (e) {
      appendLog(`人脸验证处理器启动失败: ${e?.message || e}`);
      error('Auto-processor start failed:', e);
    }

    // 2e. Course monitor
    try {
      startCourseMonitor();
    } catch (e) {
      appendLog(`课程监控启动失败: ${e?.message || e}`);
      error('Course monitor start failed:', e);
    }

    appendLog('所有系统就绪');
    info('Initialization complete');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountUI);
  } else {
    mountUI();
  }

  // ---- Phase 3: register cleanup hooks for session tracking ----

  // End active session when user leaves/refreshes the page
  window.addEventListener('beforeunload', () => {
    try {
      // stopCourseMonitor is async but beforeunload handlers should not be async
      // Just call endSession synchronously (best-effort save)
      stopCourseMonitor();
    } catch (e) {
      // Swallow errors in beforeunload to avoid blocking navigation
      error('Failed to stop course monitor on page unload:', e);
    }
  });
}

bootstrap();