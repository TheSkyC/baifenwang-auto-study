/**
 * @file Media configuration — video stream replacement, frame capture, and overlay.
 * @module config/media
 */

// Video stream replacement configuration
export const VIDEO_REPLACE_CONFIG = {
  /** Default canvas width when constraints don't specify */
  DEFAULT_WIDTH: 640,
  /** Default canvas height when constraints don't specify */
  DEFAULT_HEIGHT: 480,
  /** Canvas stream FPS */
  STREAM_FPS: 30,
  /** Subtle brightness jitter range (±this fraction) to simulate live camera */
  BRIGHTNESS_JITTER: 0.02,
};

// Video frame capture selectors (for manual "capture" button)
export const VIDEO_CAPTURE_SELECTORS = ['#video', '.main_content', 'video[autoplay]', 'video'];

// Video overlay selectors — used to find video elements for overlay controls
export const VIDEO_OVERLAY_SELECTORS = ['#video', '.main_content video', 'video[autoplay]', 'video'];
