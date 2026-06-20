/**
 * @file CSS styles for the edge-drawer panel UI
 * All styles are injected as a <style> element at runtime.
 *
 * The panel uses an edge-drawer pattern: hidden off-screen to the right,
 * with only a 32px handle grip visible.  Hovering the handle slides the
 * full panel into view.  A pin button locks it open.
 */

export const STYLES = `
  /* ================================================================
   * Panel container — edge-drawer pattern
   * ================================================================ */

  .bfw-panel {
    position: fixed;
    z-index: 999999;
    right: 0;
    top: 0;
    height: 100vh;
    display: flex;
    flex-direction: row;
    /* Only the 32px handle is visible by default */
    transform: translateX(calc(100% - 32px));
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #cdd6f4;
    /* Allow clicks to pass through when fully hidden */
    pointer-events: none;
  }

  .bfw-panel.open,
  .bfw-panel.pinned {
    transform: translateX(0);
    pointer-events: auto;
  }

  /* While the handle is hovered, allow interaction */
  .bfw-panel:hover {
    pointer-events: auto;
  }

  /* ================================================================
   * Handle — the visible grip tab on the right edge
   * ================================================================ */

  .bfw-panel-handle {
    width: 32px;
    height: 120px;
    align-self: center;
    flex-shrink: 0;
    cursor: pointer;
    user-select: none;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;  /* Always clickable, even when panel is hidden */
  }

  /* The visible tab — a rounded rectangle */
  .bfw-panel-handle::before {
    content: '';
    position: absolute;
    inset: 0;
    left: 3px;
    background: linear-gradient(180deg,
      rgba(30, 30, 46, 0.92),
      rgba(49, 50, 68, 0.96) 20%,
      rgba(49, 50, 68, 0.96) 80%,
      rgba(30, 30, 46, 0.92));
    border: 1px solid rgba(137, 180, 250, 0.3);
    border-right: none;
    border-radius: 8px 0 0 8px;
    box-shadow: -2px 0 16px rgba(0, 0, 0, 0.3);
    transition: border-color 0.3s, box-shadow 0.3s;
  }

  /* Accent glow line */
  .bfw-panel-handle::after {
    content: '';
    position: absolute;
    left: 7px;
    top: 50%;
    transform: translateY(-50%);
    width: 2px;
    height: 64px;
    background: linear-gradient(180deg, transparent, #89b4fa 20%, #74c7ec 80%, transparent);
    border-radius: 1px;
    box-shadow: 0 0 8px rgba(137, 180, 250, 0.6);
    transition: box-shadow 0.3s;
  }

  .bfw-panel-handle:hover::before {
    border-color: rgba(137, 180, 250, 0.6);
    box-shadow: -2px 0 20px rgba(137, 180, 250, 0.15);
  }

  .bfw-panel-handle:hover::after {
    box-shadow: 0 0 14px rgba(137, 180, 250, 0.9);
  }

  /* Vertical label text */
  .bfw-handle-text {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    font-size: 12px;
    font-weight: 700;
    color: #89b4fa;
    letter-spacing: 6px;
    position: relative;
    z-index: 1;
    text-shadow: 0 0 8px rgba(137, 180, 250, 0.35);
    transition: color 0.3s, text-shadow 0.3s;
  }

  .bfw-panel-handle:hover .bfw-handle-text {
    color: #74c7ec;
    text-shadow: 0 0 12px rgba(137, 180, 250, 0.6);
  }

  /* ================================================================
   * Inner panel — the actual UI surface
   * ================================================================ */

  .bfw-panel-inner {
    width: 348px;
    flex-shrink: 0;
    background: #1e1e2e;
    border-left: 1px solid #313244;
    box-shadow: -4px 0 32px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  /* ================================================================
   * Header — title + pin button
   * ================================================================ */

  .bfw-panel-header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 40px;
    padding: 0 14px;
    background: linear-gradient(135deg, #89b4fa, #74c7ec);
    font-size: 13px;
    font-weight: 700;
    color: #1e1e2e;
  }

  .bfw-panel-header .bfw-header-actions {
    display: flex;
    gap: 4px;
  }

  .bfw-panel-header button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 15px;
    line-height: 1;
    color: #1e1e2e;
    padding: 2px 4px;
    border-radius: 4px;
    transition: background 0.15s;
  }

  /* Pin button — slightly larger to accommodate the SVG icon */
  .bfw-pin-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .bfw-panel-header button:hover {
    background: rgba(30, 30, 46, 0.12);
  }

  /* ================================================================
   * Body — scrollable content area
   * ================================================================ */

  .bfw-panel-body {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 14px;
  }

  /* Custom scrollbar */
  .bfw-panel-body::-webkit-scrollbar {
    width: 5px;
  }

  .bfw-panel-body::-webkit-scrollbar-track {
    background: transparent;
  }

  .bfw-panel-body::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 3px;
  }

  .bfw-panel-body::-webkit-scrollbar-thumb:hover {
    background: #585b70;
  }

  /* Firefox scrollbar */
  .bfw-panel-body {
    scrollbar-width: thin;
    scrollbar-color: #45475a transparent;
  }

  /* ================================================================
   * Status indicator
   * ================================================================ */

  .bfw-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0 10px;
    font-size: 12px;
  }

  .bfw-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #a6e3a1;
    flex-shrink: 0;
    box-shadow: 0 0 6px rgba(166, 227, 161, 0.5);
    transition: background 0.3s, box-shadow 0.3s;
  }

  .bfw-status-dot.inactive {
    background: #f38ba8;
    box-shadow: 0 0 6px rgba(243, 139, 168, 0.5);
  }

  /* ================================================================
   * Log area
   * ================================================================ */

  .bfw-log {
    margin-top: 6px;
    padding: 10px;
    background: #11111b;
    border-radius: 6px;
    font-family: "Cascadia Code", "Fira Code", "Consolas", monospace;
    font-size: 11px;
    line-height: 1.55;
    color: #a6adc8;
    height: 120px;
    overflow-y: auto;
  }

  .bfw-log::-webkit-scrollbar {
    width: 4px;
  }

  .bfw-log::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 2px;
  }

  .bfw-log .log-time {
    color: #585b70;
    margin-right: 4px;
  }

  /* ================================================================
   * Action buttons
   * ================================================================ */

  .bfw-actions {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }

  .bfw-btn {
    flex: 1;
    padding: 7px 12px;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }

  .bfw-btn:active {
    transform: scale(0.97);
  }

  .bfw-btn-primary {
    background: #89b4fa;
    color: #1e1e2e;
  }
  .bfw-btn-primary:hover {
    background: #74c7ec;
  }

  .bfw-btn-danger {
    background: #f38ba8;
    color: #1e1e2e;
  }
  .bfw-btn-danger:hover {
    background: #eba0ac;
  }

  .bfw-btn-ghost {
    background: transparent;
    color: #cdd6f4;
    border: 1px solid #45475a;
  }
  .bfw-btn-ghost:hover {
    background: #313244;
  }

  /* ================================================================
   * Image Pool section
   * ================================================================ */

  .bfw-pool-section {
    margin-top: 12px;
    border-top: 1px solid #313244;
    padding-top: 10px;
  }

  .bfw-pool-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .bfw-pool-header-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .bfw-pool-title {
    font-size: 12px;
    font-weight: 600;
    color: #bac2de;
  }

  .bfw-pool-count {
    font-size: 11px;
    color: #a6adc8;
    transition: color 0.2s;
  }

  .bfw-pool-drag-zone {
    border: 2px dashed #45475a;
    border-radius: 6px;
    padding: 10px;
    text-align: center;
    font-size: 11px;
    color: #6c7086;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, color 0.15s;
    margin-bottom: 8px;
  }
  .bfw-pool-drag-zone:hover,
  .bfw-pool-drag-zone.drag-over {
    border-color: #89b4fa;
    background: rgba(137, 180, 250, 0.06);
    color: #89b4fa;
  }

  .bfw-pool-thumbs {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
    gap: 6px;
    max-height: 120px;
    overflow-y: auto;
    padding: 2px;
  }

  .bfw-pool-thumbs::-webkit-scrollbar {
    width: 4px;
  }

  .bfw-pool-thumbs::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 2px;
  }

  .bfw-pool-thumb {
    position: relative;
    aspect-ratio: 1;
    border-radius: 5px;
    overflow: hidden;
    border: 1px solid #45475a;
    background: #11111b;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .bfw-pool-thumb:hover {
    border-color: #89b4fa;
    box-shadow: 0 0 8px rgba(137, 180, 250, 0.25);
  }

  /* ---- Quality tier border indicators ---- */

  /* Low-quality image: red/orange dashed border with subtle pulsing glow */
  .bfw-pool-thumb.bfw-quality-low {
    border-color: rgba(243, 139, 168, 0.55);
    border-style: dashed;
    box-shadow: 0 0 6px rgba(243, 139, 168, 0.15);
  }

  .bfw-pool-thumb.bfw-quality-low:hover {
    border-color: #f38ba8;
    box-shadow: 0 0 12px rgba(243, 139, 168, 0.35);
  }

  @keyframes bfw-pulse-warn {
    0%, 100% { box-shadow: 0 0 6px rgba(243, 139, 168, 0.12); }
    50%      { box-shadow: 0 0 12px rgba(243, 139, 168, 0.28); }
  }

  /* High-quality image: subtle green accent */
  .bfw-pool-thumb.bfw-quality-high {
    border-color: rgba(166, 227, 161, 0.4);
  }

  .bfw-pool-thumb.bfw-quality-high:hover {
    border-color: #a6e3a1;
    box-shadow: 0 0 8px rgba(166, 227, 161, 0.25);
  }
  .bfw-pool-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  /* Keep img behind absolute-positioned overlay buttons */
  .bfw-pool-thumb .bfw-thumb-delete {
    position: absolute;
    z-index: 1;
    top: 1px;
    right: 1px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(30, 30, 46, 0.85);
    border: none;
    color: #f38ba8;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.12s;
  }
  .bfw-pool-thumb:hover .bfw-thumb-delete {
    opacity: 1;
  }
  .bfw-pool-thumb .bfw-thumb-delete .bfw-icon {
    display: block;
    margin: 0;
    vertical-align: baseline;
  }
  .bfw-pool-thumb .bfw-thumb-delete:hover {
    background: #f38ba8;
    color: #1e1e2e;
  }

  /* Stats info button — appears on hover, same pattern as delete button */
  .bfw-pool-thumb .bfw-thumb-info {
    position: absolute;
    z-index: 1;
    top: 1px;
    left: 1px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(30, 30, 46, 0.85);
    border: none;
    color: #89b4fa;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.12s;
  }
  .bfw-pool-thumb:hover .bfw-thumb-info {
    opacity: 1;
  }
  .bfw-pool-thumb .bfw-thumb-info .bfw-icon {
    display: block;
    margin: 0;
    vertical-align: baseline;
  }
  .bfw-pool-thumb .bfw-thumb-info:hover {
    background: #89b4fa;
    color: #1e1e2e;
  }

  /* ---- Stats popup (inline tooltip-style popover) ---- */

  .bfw-thumb-stats-popup {
    position: absolute;
    z-index: 9999999;
    width: 200px;
    background: #1e1e2e;
    border: 1px solid #45475a;
    border-radius: 8px;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
    padding: 10px 12px;
    font-size: 11px;
    color: #cdd6f4;
    pointer-events: auto;
    cursor: default;
  }

  .bfw-thumb-stats-popup .stats-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid #313244;
  }

  .bfw-thumb-stats-popup .stats-name {
    font-weight: 600;
    font-size: 11px;
    color: #cdd6f4;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bfw-thumb-stats-popup .stats-tier-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .bfw-thumb-stats-popup .stats-tier-high {
    background: rgba(166, 227, 161, 0.15);
    color: #a6e3a1;
  }

  .bfw-thumb-stats-popup .stats-tier-neutral {
    background: rgba(137, 180, 250, 0.12);
    color: #89b4fa;
  }

  .bfw-thumb-stats-popup .stats-tier-low {
    background: rgba(243, 139, 168, 0.15);
    color: #f38ba8;
  }

  .bfw-thumb-stats-popup .stats-table {
    width: 100%;
    border-collapse: collapse;
  }

  .bfw-thumb-stats-popup .stats-table td {
    padding: 3px 0;
    font-size: 11px;
    line-height: 1.4;
  }

  .bfw-thumb-stats-popup .stats-label {
    color: #6c7086;
    width: 60px;
    white-space: nowrap;
  }

  .bfw-thumb-stats-popup .stats-value {
    color: #cdd6f4;
    text-align: right;
  }

  .bfw-thumb-stats-popup .stats-value.success {
    color: #a6e3a1;
  }

  .bfw-thumb-stats-popup .stats-value.fail {
    color: #f38ba8;
  }

  .bfw-thumb-stats-popup .stats-value.rate-good {
    color: #a6e3a1;
  }

  .bfw-thumb-stats-popup .stats-value.rate-bad {
    color: #f38ba8;
  }

  .bfw-thumb-stats-popup .stats-empty {
    text-align: center;
    color: #585b70;
    padding: 6px 0;
    font-size: 11px;
  }

  /* Blur toggle button */
  .bfw-eye-btn {
    background: none;
    border: none;
    color: #6c7086;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: color 0.15s, background 0.15s;
  }
  .bfw-eye-btn:hover {
    color: #cdd6f4;
    background: rgba(205, 214, 244, 0.08);
  }
  .bfw-eye-btn.active {
    color: #f38ba8;
  }

  /* Weight toggle button — same pattern as eye-btn */
  .bfw-weight-btn {
    background: none;
    border: none;
    color: #6c7086;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: color 0.15s, background 0.15s;
  }
  .bfw-weight-btn:hover {
    color: #cdd6f4;
    background: rgba(205, 214, 244, 0.08);
  }
  .bfw-weight-btn.active {
    color: #a6e3a1;
  }

  /* Blur mode — all thumbnails blurred */
  .bfw-pool-thumb img {
    transition: filter 0.15s;
  }
  .bfw-pool-thumbs.blur .bfw-pool-thumb img {
    filter: blur(8px);
  }
  /* Hover to reveal original */
  .bfw-pool-thumbs.blur .bfw-pool-thumb:hover img {
    filter: blur(0);
  }

  .bfw-pool-actions {
    display: flex;
    gap: 6px;
    margin-top: 8px;
  }

  .bfw-pool-actions .bfw-btn {
    font-size: 11px;
    padding: 5px 10px;
  }

  /* Capture button variant */
  .bfw-btn-capture {
    background: #a6e3a1;
    color: #1e1e2e;
    font-size: 11px;
    padding: 5px 10px;
    flex: 1;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }
  .bfw-btn-capture:hover {
    background: #94e2d5;
  }
  .bfw-btn-capture:active {
    transform: scale(0.97);
  }
  .bfw-btn-capture:disabled {
    background: #585b70;
    color: #a6adc8;
    cursor: not-allowed;
  }

  .bfw-pool-empty {
    font-size: 11px;
    color: #585b70;
    text-align: center;
    padding: 10px 0;
  }

  .bfw-pool-status {
    font-size: 10px;
    color: #a6e3a1;
    margin-top: 6px;
    min-height: 14px;
    transition: color 0.2s;
  }
  .bfw-pool-status.error {
    color: #f38ba8;
  }

  /* ================================================================
   * Course Progress Section
   * ================================================================ */

  .bfw-course-section {
    padding: 8px 10px;
    background: #28283d;
    border-radius: 6px;
  }
  .bfw-course-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }
  .bfw-course-title {
    font-size: 11px;
    color: #cdd6f4;
    font-weight: 600;
  }
  .bfw-course-header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .bfw-course-count {
    font-size: 11px;
    color: #a6adc8;
    font-weight: 500;
  }
  .bfw-course-ch-label {
    font-size: 10px;
    color: #6c7086;
    display: none; /* hidden when zero, JS sets inline if wanted */
  }
  .bfw-course-current {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2px;
  }
  .bfw-course-current-name {
    font-size: 11px;
    color: #89b4fa;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .bfw-course-vid-pct {
    font-size: 10px;
    color: #a6adc8;
    flex-shrink: 0;
  }
  .bfw-course-chapter {
    font-size: 10px;
    color: #6c7086;
    margin-bottom: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bfw-course-bar-group {
    margin-bottom: 4px;
  }
  .bfw-course-bar-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 3px;
  }
  .bfw-course-bar-label {
    font-size: 9px;
    color: #6c7086;
    width: 22px;
    text-align: left;
    flex-shrink: 0;
  }
  .bfw-course-bar-track {
    flex: 1;
    height: 4px;
    background: #45475a;
    border-radius: 2px;
    overflow: hidden;
  }
  .bfw-course-bar-fill {
    height: 100%;
    background: #89b4fa;
    border-radius: 2px;
    transition: width 0.3s ease;
  }
  .bfw-bar-lesson {
    background: #a6e3a1;
  }
  .bfw-course-bar-pct {
    font-size: 9px;
    color: #a6adc8;
    width: 28px;
    text-align: right;
    flex-shrink: 0;
  }
  .bfw-course-stat {
    font-size: 10px;
    color: #6c7086;
  }

  /* ================================================================
   * SVG Icons
   * ================================================================ */

  .bfw-icon {
    vertical-align: middle;
    flex-shrink: 0;
  }

  /* Gap between icon and text inside buttons */
  button > .bfw-icon + *,
  button > .bfw-icon ~ * {
    margin-left: 0;
  }

  button > .bfw-icon {
    margin-right: 4px;
  }

  button > .bfw-icon:last-child {
    margin-right: 0;
  }

  /* Spin animation for the clock / busy icon */
  @keyframes bfw-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  .bfw-icon-spin {
    animation: bfw-spin 1.5s linear infinite;
    transform-origin: center center;
  }

  /* ================================================================
   * Settings section
   * ================================================================ */

  .bfw-settings-section {
    margin-top: 12px;
    border-top: 1px solid #313244;
    padding-top: 10px;
  }

  .bfw-settings-header {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }

  .bfw-settings-title {
    font-size: 12px;
    font-weight: 600;
    color: #bac2de;
  }

  .bfw-setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid rgba(49, 50, 68, 0.4);
  }

  .bfw-setting-row:last-of-type {
    border-bottom: none;
  }

  .bfw-setting-row.bfw-setting-disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .bfw-setting-info {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }

  .bfw-setting-icon {
    display: flex;
    align-items: center;
    color: #89b4fa;
    flex-shrink: 0;
  }

  .bfw-setting-disabled .bfw-setting-icon {
    color: #585b70;
  }

  .bfw-setting-label {
    font-size: 12px;
    font-weight: 500;
    color: #cdd6f4;
  }

  .bfw-setting-desc {
    font-size: 10px;
    color: #585b70;
    flex-basis: 100%;
    margin-left: 22px; /* indent under icon */
  }

  /* ================================================================
   * Toggle switch (CSS-only, checkbox-driven)
   * ================================================================ */

  .bfw-toggle {
    position: relative;
    display: inline-block;
    width: 36px;
    height: 20px;
    flex-shrink: 0;
    cursor: pointer;
  }

  .bfw-setting-disabled .bfw-toggle {
    cursor: not-allowed;
  }

  .bfw-toggle-input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .bfw-toggle-slider {
    position: absolute;
    inset: 0;
    background: #45475a;
    border-radius: 10px;
    transition: background 0.2s ease;
  }

  .bfw-toggle-slider::before {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    background: #cdd6f4;
    border-radius: 50%;
    transition: transform 0.2s ease, background 0.2s ease;
  }

  .bfw-toggle-input:checked + .bfw-toggle-slider {
    background: #89b4fa;
  }

  .bfw-toggle-input:checked + .bfw-toggle-slider::before {
    transform: translateX(16px);
    background: #1e1e2e;
  }

  .bfw-toggle-input:disabled + .bfw-toggle-slider {
    background: #313244;
  }

  .bfw-toggle-input:disabled + .bfw-toggle-slider::before {
    background: #585b70;
  }

  /* Hover glow for active toggles */
  .bfw-toggle:not(:has(input:disabled)):hover .bfw-toggle-slider {
    box-shadow: 0 0 6px rgba(137, 180, 250, 0.4);
  }

  /* ================================================================
   * Video overlay — controls overlaid on the fake stream video element
   * ================================================================ */

  .bfw-video-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-sizing: border-box;
  }

  .bfw-video-overlay *,
  .bfw-video-overlay *::before,
  .bfw-video-overlay *::after {
    box-sizing: border-box;
  }

  .bfw-video-overlay-btns {
    position: absolute;
    bottom: 12px;
    right: 12px;
    display: flex;
    gap: 8px;
    pointer-events: auto;
  }

  .bfw-overlay-btn {
    padding: 6px 14px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s, opacity 0.15s;
    white-space: nowrap;
    user-select: none;
    display: flex;
    align-items: center;
    gap: 5px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    line-height: 1;
  }

  .bfw-overlay-btn:active {
    transform: scale(0.95);
  }

  .bfw-overlay-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  .bfw-overlay-btn-refresh {
    background: rgba(30, 30, 46, 0.85);
    color: #cdd6f4;
    border: 1px solid rgba(137, 180, 250, 0.3);
  }

  .bfw-overlay-btn-refresh:hover:not(:disabled) {
    background: rgba(49, 50, 68, 0.92);
    border-color: rgba(137, 180, 250, 0.6);
  }

  .bfw-overlay-btn-toggle {
    background: rgba(137, 180, 250, 0.9);
    color: #1e1e2e;
    border: 1px solid transparent;
  }

  .bfw-overlay-btn-toggle:hover:not(:disabled) {
    background: rgba(116, 199, 236, 0.95);
  }

  .bfw-overlay-btn-toggle.mode-real {
    background: rgba(166, 227, 161, 0.9);
    color: #1e1e2e;
  }

  .bfw-overlay-btn-toggle.mode-real:hover:not(:disabled) {
    background: rgba(148, 226, 213, 0.95);
  }

  .bfw-overlay-mode-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    pointer-events: none;
    transition: opacity 0.2s;
  }

  .bfw-overlay-mode-badge.mode-fake {
    background: rgba(137, 180, 250, 0.8);
    color: #1e1e2e;
  }

  .bfw-overlay-mode-badge.mode-real {
    background: rgba(166, 227, 161, 0.8);
    color: #1e1e2e;
  }

  /* ================================================================
   * Crop Editor — modal overlay for manual crop adjustment
   * ================================================================ */

  .bfw-ce-overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    background: rgba(0, 0, 0, 0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  .bfw-ce-modal {
    background: #1e1e2e;
    border: 1px solid #313244;
    border-radius: 10px;
    box-shadow: 0 8px 48px rgba(0, 0, 0, 0.6);
    display: flex;
    flex-direction: column;
    max-width: calc(100vw - 40px);
    max-height: calc(100vh - 40px);
  }

  /* ---- Header ---- */

  .bfw-ce-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid #313244;
  }

  .bfw-ce-title {
    font-size: 13px;
    font-weight: 600;
    color: #cdd6f4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 320px;
  }

  .bfw-ce-close {
    background: none;
    border: none;
    color: #6c7086;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s, background 0.15s;
    flex-shrink: 0;
  }

  .bfw-ce-close:hover {
    color: #f38ba8;
    background: rgba(243, 139, 168, 0.1);
  }

  /* ---- Body ---- */

  .bfw-ce-body {
    display: flex;
    gap: 12px;
    padding: 14px;
    overflow: hidden;
  }

  .bfw-ce-main {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* ---- Display / canvas area ---- */

  .bfw-ce-display-wrapper {
    position: relative;
    background: #11111b;
    border-radius: 4px;
    overflow: hidden;
    user-select: none;
  }

  .bfw-ce-display-img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
  }

  /* Semi-transparent overlay that dims outside the crop box */
  .bfw-ce-crop-mask {
    position: absolute;
    inset: 0;
    pointer-events: none;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
    border-radius: 1px;
  }

  /* ---- Crop box ---- */

  .bfw-ce-crop-box {
    position: absolute;
    box-sizing: border-box;
    border: 2px solid #89b4fa;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5), 0 0 12px rgba(137, 180, 250, 0.3);
    cursor: move;
    z-index: 2;
    /* Grid overlay for composition guidance */
    background-image:
      linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px);
    background-size: calc(100% / 3) calc(100% / 3);
  }

  /* ---- Handles ---- */

  .bfw-ce-handle {
    position: absolute;
    background: #89b4fa;
    border: 2px solid #1e1e2e;
    box-sizing: border-box;
    border-radius: 2px;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.4);
    z-index: 3;
    pointer-events: auto;
  }

  .bfw-ce-h-nw { top: -6px; left: -6px; cursor: nwse-resize; }
  .bfw-ce-h-ne { top: -6px; right: -6px; cursor: nesw-resize; }
  .bfw-ce-h-sw { bottom: -6px; left: -6px; cursor: nesw-resize; }
  .bfw-ce-h-se { bottom: -6px; right: -6px; cursor: nwse-resize; }
  .bfw-ce-h-n  { top: -6px; left: calc(50% - 6px); cursor: ns-resize; }
  .bfw-ce-h-s  { bottom: -6px; left: calc(50% - 6px); cursor: ns-resize; }
  .bfw-ce-h-w  { left: -6px; top: calc(50% - 6px); cursor: ew-resize; }
  .bfw-ce-h-e  { right: -6px; top: calc(50% - 6px); cursor: ew-resize; }

  .bfw-ce-info {
    font-size: 11px;
    color: #a6adc8;
    margin-top: 6px;
  }

  /* ---- Sidebar (preview) ---- */

  .bfw-ce-sidebar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .bfw-ce-preview-label {
    font-size: 11px;
    color: #a6adc8;
    font-weight: 500;
  }

  .bfw-ce-preview-box {
    width: 72px;
    height: 54px;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid #45475a;
    background: #11111b;
  }

  .bfw-ce-preview-canvas {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .bfw-ce-preview-size {
    font-size: 10px;
    color: #585b70;
  }

  /* ---- Footer ---- */

  .bfw-ce-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-top: 1px solid #313244;
    gap: 8px;
  }

  .bfw-ce-footer-right {
    display: flex;
    gap: 8px;
  }

  .bfw-ce-btn {
    padding: 7px 16px;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }

  .bfw-ce-btn:active {
    transform: scale(0.97);
  }

  .bfw-ce-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .bfw-ce-btn-reset {
    background: transparent;
    color: #a6adc8;
    border: 1px solid #45475a;
  }

  .bfw-ce-btn-reset:hover:not(:disabled) {
    background: #313244;
    color: #cdd6f4;
  }

  .bfw-ce-btn-cancel {
    background: transparent;
    color: #cdd6f4;
    border: 1px solid #45475a;
  }

  .bfw-ce-btn-cancel:hover:not(:disabled) {
    background: #313244;
  }

  .bfw-ce-btn-primary {
    background: #89b4fa;
    color: #1e1e2e;
  }

  .bfw-ce-btn-primary:hover:not(:disabled) {
    background: #74c7ec;
  }

  /* Responsive: stack vertically on narrow panels */
  @media (max-width: 600px) {
    .bfw-ce-body {
      flex-direction: column;
      align-items: center;
    }

    .bfw-ce-sidebar {
      flex-direction: row;
      gap: 8px;
    }
  }
`;
