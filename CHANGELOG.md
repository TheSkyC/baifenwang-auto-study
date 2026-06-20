# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-23

### Added

- **Video stream interceptor** — monkey-patches `getUserMedia`, replaces camera feed with pool-managed images rendered via canvas (15fps draw loop with brightness jitter)
- **Persistent image pool** — user upload (click/drag-drop), dHash perceptual deduplication, mutation engine (brightness/contrast/saturation/hue/flip/rotation/scale/JPEG quality randomization), original image storage for crop editing
- **Quality scoring with weighted selection** — per-image success/failure tracking, tier-based weights (high=2.5×, neutral=1.0×, low=0.15×), stats popup with usage count and success-rate badge
- **Three-tier smart crop face detection** — browser FaceDetector API → YCbCr skin-color clustering on downscaled canvas → fixed vertical bias fallback
- **Crop editor modal** — 8 draggable resize handles with 4:3 aspect-ratio lock, drag-to-move crop box, live preview thumbnail, auto face-detection reset
- **Auto-processor for face verification** — MutationObserver-based detection of verification modal, sequential auto-click (open camera → photo → compare), exponential backoff retry on failure (base 2s, max 30s, up to 5 attempts), autoCompare toggle with pause-and-resume support
- **Auto-course processor** — React Fiber state reading for complete course tree (chapters/lessons/studyRate/studyStatus), dual progress bars (chapter + overall), auto-play with retry (up to 10 attempts), stuck-video detection and auto-resume (30s threshold), SPA navigation resilience
- **Visibility interceptor** — full-vector anti-tab-switch bypass: `document.hidden`, `visibilityState`, `hasFocus`, `visibilitychange`, `blur`, `pagehide`/`pageshow` events and their onxxx setters, capture-phase `stopImmediatePropagation()` suppression, reversible with settings toggle
- **Video overlay controls** — mode badge + refresh/toggle buttons overlaid on fake-stream `<video>` elements, `srcObject` setter hook + MutationObserver dual detection
- **Edge-drawer panel UI** — 32px handle → 348px slide-out, pin to lock open, 5 independent toggle switches, timestamped log viewer with auto-scroll, image pool thumbnail grid with quality-tier indicators (green border=high / red dashed=low), privacy blur toggle, video frame capture button
- **Multi-backend storage adapter** — seamless fallback chain (GM_setValue → GM async API → localStorage → in-memory Map) shared across settings and image pool
- **Colored console logger** — four log levels (DEBUG/INFO/WARN/ERROR) with configurable threshold
- **Rollup build pipeline** — IIFE output, userscript metadata auto-injection via `rollup-plugin-userscript-metablock`, Terser minification (2 compression passes)
- **Video frame capture utility** — finds the smallest visible camera video, validates frame quality (rejects all-black / low-color frames), saves to pool
- **Version bump helper** — `npm run bump:patch|minor|major` syncs version across `config.js`, `package.json`, and `metablock.json`
- MIT License
