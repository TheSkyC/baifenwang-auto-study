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

  /* ================================================================
   * Progress Stats Section — learning history and aggregate stats
   * ================================================================ */

  .bfw-stats-section {
    margin-top: 14px;
    padding: 0;
    border-top: 1px solid rgba(69, 71, 90, 0.5);
  }

  .bfw-stats-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 10px 10px;
    cursor: pointer;
    user-select: none;
    transition: background 0.15s;
    border-radius: 6px 6px 0 0;
  }

  .bfw-stats-header:hover {
    background: rgba(49, 50, 68, 0.25);
  }

  .bfw-stats-title {
    font-weight: 600;
    font-size: 13px;
    color: #cdd6f4;
    display: flex;
    align-items: center;
    gap: 7px;
    letter-spacing: 0.3px;
  }

  .bfw-stats-toggle {
    background: none;
    border: none;
    color: #74c7ec;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 4px;
    pointer-events: none;
  }

  .bfw-stats-content {
    padding: 0 8px 14px;
    max-height: 600px;
    overflow-y: auto;
  }

  .bfw-stats-content::-webkit-scrollbar {
    width: 5px;
  }

  .bfw-stats-content::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 3px;
  }

  .bfw-stats-group {
    margin-bottom: 18px;
  }

  .bfw-stats-group-title {
    font-size: 11px;
    font-weight: 700;
    color: #74c7ec;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    padding-left: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .bfw-stats-group-title::before {
    content: '';
    width: 3px;
    height: 12px;
    background: linear-gradient(180deg, #89b4fa, #74c7ec);
    border-radius: 2px;
    box-shadow: 0 0 6px rgba(116, 199, 236, 0.4);
  }

  /* ---- Weekly trend chart ---- */

  .bfw-trend-legend {
    display: flex;
    gap: 14px;
    margin-bottom: 6px;
    padding-left: 2px;
  }

  .bfw-legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    color: #a6adc8;
  }

  .bfw-legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1.5px solid;
    background: #1e1e2e;
    flex-shrink: 0;
  }

  .bfw-legend-dot-blue  { border-color: #89b4fa; }
  .bfw-legend-dot-green { border-color: #a6e3a1; }

  .bfw-trend-chart {
    position: relative;
    background: linear-gradient(135deg, rgba(49, 50, 68, 0.4) 0%, rgba(40, 40, 61, 0.5) 100%);
    border: 1px solid rgba(69, 71, 90, 0.5);
    border-radius: 8px;
    padding: 16px 12px 12px;
    overflow: hidden;
  }

  .bfw-trend-chart::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(137, 180, 250, 0.4), rgba(166, 227, 161, 0.4), transparent);
  }

  #bfw-trend-canvas {
    display: block;
    width: 100%;
    height: 140px;
  }

  /* ---- Summary cards grid ---- */

  .bfw-stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 10px;
  }

  .bfw-stat-card {
    background: linear-gradient(135deg, rgba(49, 50, 68, 0.5) 0%, rgba(40, 40, 61, 0.6) 100%);
    border: 1px solid rgba(69, 71, 90, 0.6);
    border-radius: 8px;
    padding: 12px 10px;
    text-align: center;
    position: relative;
    overflow: hidden;
    transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
  }

  .bfw-stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(137, 180, 250, 0.3), transparent);
  }

  .bfw-stat-card:hover {
    transform: translateY(-1px);
    border-color: rgba(137, 180, 250, 0.5);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .stat-label {
    font-size: 10px;
    color: #a6adc8;
    margin-bottom: 6px;
    font-weight: 500;
    letter-spacing: 0.3px;
  }

  .stat-value {
    font-size: 20px;
    font-weight: 700;
    background: linear-gradient(135deg, #a6e3a1 0%, #94e2d5 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1.2;
  }

  /* ---- Recent sessions list ---- */

  .bfw-recent-sessions {
    max-height: 240px;
    overflow-y: auto;
    border-radius: 8px;
    background: rgba(17, 17, 27, 0.4);
    border: 1px solid rgba(69, 71, 90, 0.4);
  }

  .bfw-recent-sessions::-webkit-scrollbar {
    width: 4px;
  }

  .bfw-recent-sessions::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 2px;
  }

  .bfw-sessions-empty {
    padding: 20px 16px;
    text-align: center;
    color: #6c7086;
    font-size: 11px;
  }

  .bfw-session-item {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(69, 71, 90, 0.3);
    transition: background 0.15s;
    position: relative;
  }

  .bfw-session-item:last-child {
    border-bottom: none;
  }

  .bfw-session-item:hover {
    background: rgba(49, 50, 68, 0.3);
  }

  .bfw-session-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 0;
    background: linear-gradient(180deg, #89b4fa, #74c7ec);
    border-radius: 0 2px 2px 0;
    transition: height 0.2s;
  }

  .bfw-session-item:hover::before {
    height: 60%;
  }

  .session-name {
    font-size: 12px;
    font-weight: 600;
    color: #cdd6f4;
    margin-bottom: 5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .session-meta {
    font-size: 10px;
    color: #a6adc8;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .session-meta span {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }

  /* ---- Courses breakdown list ---- */

  .bfw-courses-list {
    max-height: 280px;
    overflow-y: auto;
    border-radius: 8px;
    background: rgba(17, 17, 27, 0.4);
    border: 1px solid rgba(69, 71, 90, 0.4);
  }

  .bfw-courses-list::-webkit-scrollbar {
    width: 4px;
  }

  .bfw-courses-list::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 2px;
  }

  .bfw-courses-empty {
    padding: 20px 16px;
    text-align: center;
    color: #6c7086;
    font-size: 11px;
  }

  .bfw-course-item {
    padding: 12px 14px;
    border-bottom: 1px solid rgba(69, 71, 90, 0.3);
    transition: background 0.15s;
    position: relative;
  }

  .bfw-course-item:last-child {
    border-bottom: none;
  }

  .bfw-course-item:hover {
    background: rgba(49, 50, 68, 0.3);
  }

  .course-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .course-name {
    font-size: 12px;
    font-weight: 600;
    color: #cdd6f4;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-right: 8px;
  }

  .course-rate {
    font-size: 13px;
    font-weight: 700;
    background: linear-gradient(135deg, #a6e3a1 0%, #94e2d5 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    flex-shrink: 0;
    min-width: 38px;
    text-align: right;
  }

  .course-progress {
    margin-bottom: 8px;
  }

  .course-bar {
    height: 6px;
    background: rgba(45, 48, 71, 0.6);
    border-radius: 3px;
    overflow: hidden;
    position: relative;
  }

  .course-bar::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg,
      transparent,
      rgba(255, 255, 255, 0.08) 50%,
      transparent);
    animation: bfw-shimmer 2s infinite;
    opacity: 0;
  }

  .course-bar:hover::before {
    opacity: 1;
  }

  @keyframes bfw-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .course-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #89b4fa 0%, #74c7ec 50%, #94e2d5 100%);
    border-radius: 3px;
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    box-shadow: 0 0 8px rgba(137, 180, 250, 0.3);
  }

  .course-bar-fill::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 8px;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25));
    border-radius: 0 3px 3px 0;
  }

  .course-stats {
    font-size: 10px;
    color: #a6adc8;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .course-stat {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .course-stat::before {
    content: '·';
    color: #45475a;
    font-weight: 700;
  }

  .course-stat:first-child::before {
    content: none;
  }

  /* ---- Actions row ---- */

  .bfw-stats-actions {
    display: flex;
    gap: 8px;
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px solid rgba(69, 71, 90, 0.3);
  }

  .bfw-stats-actions .bfw-btn {
    flex: 1;
    padding: 7px 12px;
    font-size: 11px;
    font-weight: 600;
  }

  /* ================================================================
   * Footer — minimal info bar at bottom of panel
   * ================================================================ */

  .bfw-footer {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 24px;
    padding: 0 10px;
    background: rgba(0, 0, 0, 0.05);
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    font-size: 11px;
    color: #a6adc8;
  }

  .bfw-footer-left {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .bfw-footer-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .bfw-footer-compat {
    display: inline-flex;
    align-items: center;
    cursor: help;
  }

  .bfw-footer-compat svg {
    display: block;
  }

  .bfw-footer-version {
    font-weight: 600;
    color: #89b4fa;
  }

  .bfw-footer-sep {
    color: #45475a;
  }

  .bfw-footer-page {
    color: #a6adc8;
  }

  .bfw-footer-link {
    display: inline-flex;
    align-items: center;
    color: #6c7086;
    text-decoration: none;
    line-height: 1;
    transition: color 0.15s, transform 0.1s;
    cursor: pointer;
  }

  .bfw-footer-link svg {
    display: block;
  }

  .bfw-footer-link:hover {
    color: #89b4fa;
    transform: scale(1.1);
  }

  /* ================================================================
   * Update badge — shown in footer-right when an update is available
   * ================================================================ */

  .bfw-update-btn {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: none;
    border: none;
    padding: 2px 3px;
    border-radius: 4px;
    cursor: pointer;
    color: #a6adc8;
    font-size: 11px;
    line-height: 1;
    transition: color 0.2s, background 0.2s;
    position: relative;
  }

  .bfw-update-btn:hover {
    color: #cdd6f4;
    background: rgba(137, 180, 250, 0.08);
  }

  /* Spinning loader state */
  .bfw-update-btn.checking {
    color: #585b70;
    pointer-events: none;
  }

  /* Update available state — orange accent */
  .bfw-update-btn.has-update {
    color: #fab387;
    animation: bfw-update-pulse 2.5s ease-in-out infinite;
  }

  .bfw-update-btn.has-update:hover {
    color: #fe9057;
    background: rgba(250, 179, 135, 0.1);
    animation: none;
  }

  @keyframes bfw-update-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.6; }
  }

  /* ================================================================
   * Update changelog card — pops up above the footer
   * ================================================================ */

  .bfw-update-card {
    position: absolute;
    bottom: calc(100% + 8px);
    right: 0;
    width: 300px;
    background: #1e1e2e;
    border: 1px solid rgba(250, 179, 135, 0.35);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(250, 179, 135, 0.08);
    z-index: 10;
    overflow: hidden;
    animation: bfw-card-in 0.18s cubic-bezier(0.2, 0, 0.2, 1);
    transform-origin: bottom right;
  }

  @keyframes bfw-card-in {
    from { opacity: 0; transform: scale(0.94) translateY(4px); }
    to   { opacity: 1; transform: scale(1)   translateY(0);    }
  }

  .bfw-update-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px 8px;
    border-bottom: 1px solid rgba(49, 50, 68, 0.8);
  }

  .bfw-update-card-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #fab387;
  }

  .bfw-update-card-close {
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    color: #585b70;
    display: inline-flex;
    align-items: center;
    border-radius: 3px;
    transition: color 0.15s, background 0.15s;
  }

  .bfw-update-card-close:hover {
    color: #cdd6f4;
    background: rgba(205, 214, 244, 0.08);
  }

  .bfw-update-card-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px 0;
    font-size: 11px;
    color: #a6adc8;
  }

  .bfw-update-card-meta .version-badge {
    display: inline-flex;
    align-items: center;
  }

  /* Common visual badge style — used by both the <a> link and plain <span> */
  .bfw-version-badge-link {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: rgba(250, 179, 135, 0.12);
    color: #fab387;
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 11px;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.15s;
  }

  a.bfw-version-badge-link {
    cursor: pointer;
  }

  a.bfw-version-badge-link:hover {
    background: rgba(250, 179, 135, 0.22);
    color: #fab387;
  }

  .bfw-update-card-meta .arrow {
    color: #6c7086;
  }

  /* Changelog list inside the card */
  .bfw-update-changelog {
    padding: 8px 12px;
    max-height: 180px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #313244 transparent;
  }

  .bfw-update-changelog::-webkit-scrollbar {
    width: 4px;
  }

  .bfw-update-changelog::-webkit-scrollbar-thumb {
    background: #313244;
    border-radius: 2px;
  }

  .bfw-update-changelog-empty {
    font-size: 11px;
    color: #585b70;
    padding: 4px 0;
  }

  .bfw-changelog-entry {
    display: flex;
    gap: 6px;
    padding: 3px 0;
    font-size: 11px;
    line-height: 1.4;
    border-bottom: 1px solid rgba(49, 50, 68, 0.5);
  }

  .bfw-changelog-entry:last-child {
    border-bottom: none;
  }

  .bfw-changelog-type {
    flex-shrink: 0;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.03em;
    padding: 1px 5px;
    border-radius: 3px;
    align-self: flex-start;
    margin-top: 1px;
    text-transform: uppercase;
  }

  .bfw-type-feature    { background: rgba(137, 180, 250, 0.15); color: #89b4fa; }
  .bfw-type-fix        { background: rgba(243, 139, 168, 0.15); color: #f38ba8; }
  .bfw-type-improvement{ background: rgba(166, 227, 161, 0.15); color: #a6e3a1; }
  .bfw-type-performance{ background: rgba(249, 226, 175, 0.15); color: #f9e2af; }
  .bfw-type-security   { background: rgba(250, 179, 135, 0.15); color: #fab387; }
  .bfw-type-breaking   { background: rgba(243, 139, 168, 0.2);  color: #f38ba8; }
  .bfw-type-docs       { background: rgba(108, 112, 134, 0.2);  color: #6c7086; }
  .bfw-type-internal   { background: rgba(69, 71, 90, 0.4);     color: #45475a; }

  .bfw-changelog-text {
    color: #cdd6f4;
    flex: 1;
    min-width: 0;
  }

  .bfw-changelog-text .desc {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 10px;
    color: #6c7086;
    margin-top: 1px;
  }

  /* Card action buttons */
  .bfw-update-card-actions {
    display: flex;
    gap: 6px;
    padding: 8px 12px 10px;
    border-top: 1px solid rgba(49, 50, 68, 0.8);
  }

  .bfw-update-install-btn {
    flex: 1;
    background: rgba(250, 179, 135, 0.15);
    border: 1px solid rgba(250, 179, 135, 0.3);
    color: #fab387;
    border-radius: 5px;
    padding: 5px 10px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .bfw-update-install-btn:hover {
    background: rgba(250, 179, 135, 0.25);
    border-color: rgba(250, 179, 135, 0.5);
  }

  .bfw-update-ignore-btn {
    background: none;
    border: 1px solid rgba(69, 71, 90, 0.4);
    color: #6c7086;
    border-radius: 5px;
    padding: 5px 10px;
    font-size: 11px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
  }

  .bfw-update-ignore-btn:hover {
    color: #a6adc8;
    border-color: #585b70;
  }

  .bfw-update-recheck-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: #585b70;
    border-radius: 3px;
    padding: 2px;
    cursor: pointer;
    transition: color 0.15s, background 0.15s;
    flex-shrink: 0;
    margin-left: 2px;
  }

  .bfw-update-recheck-btn:hover {
    color: #a6adc8;
    background: rgba(137, 180, 250, 0.08);
  }
`;
