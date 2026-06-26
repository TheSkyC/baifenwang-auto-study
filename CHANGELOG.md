# 更新日志

本项目的所有重要变更均记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.1.0] - 2026-06-26

### 新增

- **学习进度追踪系统** — 持久化学习会话记录（开始/结束时间、课程、章节、课时、时长），今日/本周/全部三级统计面板，课程明细列表（按最后学习时间排序），最近 10 次会话日志，历史数据一键清除。通过 `beforeunload` 同步刷盘防止数据丢失，自动丢弃短于 30s 且无课时完成的废弃记录，页面重载时按会话 ID 去重。

- **七日学习趋势图** — Canvas 双线折线图，同时展示每日学习时长（分钟）和完成课时数，双 Y 轴自动刻度，颜色图例和圆点数据标记。图表在统计面板展开时按需绘制，通过数据指纹缓存跳过冗余重绘，统计头部整行可点击切换展开/折叠。

- **版本更新检查系统** — 异步更新 API 检测，24 小时缓存（localStorage 持久化），首次启动 5 秒后自动检查，两步式获取（先 `/api/v1/check` 查是否有更新 → 有则 `/api/v1/releases/:ver` 取完整 changelog），8 秒超时保护。网络错误静默丢弃，不影响主脚本运行。

- **更新角标与更新日志卡片** — 面板底部显示更新按钮：检测中转菊花动画，有更新时绿色脉冲动画，已最新时灰色安静态。点击弹出更新日志卡片（XSS 安全 DOM 构建，使用 `textContent`／`href` 属性），展示版本号、发布日期、类型标记色的条目列表、逐条标题和描述；支持立即安装（`downloadURL` 打开）、忽略此版本（持久化保存，下次同版本不再提醒）、手动重新检查（清除缓存后重新请求）。

- **页面版本兼容性检测** — 自动扫描页面 DOM 检测版本号（多选择器容错 + 正则 `版本号[：:]\s*([\d.]+)` 提取），与白名单比对返回四级兼容性评级：`tested`（绿色「完全兼容」）、`unknown`（黄色「未在此版本测试」）、`incompatible`（红色「已知不兼容」）、`missing`（灰色「未检测到版本号」）。结果展示在面板底部版本号旁，包含页面版本与脚本版本对照。

- **Cloudflare Worker 更新 API** — 独立 Worker 脚本（`worker/`），部署至 `baifenwang-auto-study.tarxf.com`。提供 `/api/v1/check?version=X`（语义化版本比较）、`/api/v1/releases/:ver`（单个发布元数据 + changelog）、`/latest.user.js`（重定向至最新 GitHub Release 资产）、`/health`（健康检查）四个端点。changelog 内嵌于 Worker 源码，无需运行时访问 GitHub API，无速率限制、无冷启动延迟。

- **图片池动态权重开关** — 图片池头部新增切换按钮，一键开关动态加权选图功能，开关状态持久化保存。

- **GitHub Actions CI/CD** — 两套自动化工作流：
  - **`build.yml`**：master 分支 push 触发，Node 22 环境 `npm ci` → `npm run build`，自动提交 `dist/` 产物并推送回 master。
  - **`release.yml`**：`v*` 标签 push 触发，标签格式校验（`vX.Y.Z[-(alpha|beta|rc)...]`），构建并计算 SHA256 校验和，创建 GitHub Release（含安装直链和校验和），上传至 Cloudflare R2（版本化路径 + latest 指针，仅有正式版更新 latest），同步注入 changelog 至 `update-api` 仓库并部署 Worker。

### 修复

- **自动人脸验证**：修复比对重试耗尽后的无限重启循环——新增三重守卫（`checkAndStartSequence` 提前返回、`clickCompareButton` 拒绝执行、`handleCompareFailRecovery` 过渡到终端状态），Watchdog 超时从 10s 延长至 40s（留足冷却期 + 重试间隔 + 管道延迟），冷却期与重试间隔彻底解耦。
- **比对失败误判**：新增 `COMPARE_COOLDOWN_MS`（8 秒冷却期），在点击「开始对比」后等待服务器响应，避免页面同时显示「重新拍照」和「开始对比」按钮时被误判为失败。
- **SPA 导航**：弹窗关闭后重新检测新弹窗并恢复自动序列（应对单页应用导航导致 DOM 重建），课程处理器在 SPA 导航前移除视频事件监听器再置空引用。
- **比对被拒处理**：修正 `handleCompareFailRecovery` 路径——被拒后延迟重试间隔（指数退避：2s→15s，仅加长不减短）、记录失败反馈至图片质量评分、过渡状态到 `camera_opening` 防止重入。
- **课程卡顿检测**：手动暂停视频后卡顿检测定时器保持活跃，恢复正常播放时自动接管。
- **课时统计**：采用增量式计数替代绝对值读取，防止 `studyStatus` 状态翻转导致的统计数据虚增。
- **章节检测**：React Fiber `studyStatus` 过期不准确时，回退至 sidebar `playIngName` DOM class 检测当前章节。
- **图片变异**：修复 `mutateImage` 中缩小抖动产生黑边的 bug（`drawImage` 目标尺寸为 0 时的除零保护）。
- **进度条溢出**：章节和总体进度条限制至 100%，防止重播已完成课程时进度条超出容器。
- **趋势图渲染**：面板折叠时 canvas 宽度为 0 跳过绘制，展开后延迟重绘确保容器尺寸就绪。
- **会话去重**：页面重载后按会话 ID 和结束时间去重，废弃短时无内容会话自动丢弃。
- **无更新角标交互**：修复无更新状态下角标不可点击的问题，移除右键重新检查逻辑，统一为左键手动重新检查。
- **过期更新缓存**：当前版本已等于或超过缓存中的最新版本时，自动丢弃过期缓存条目。
- **Firefox 兼容性**：添加无参数 `captureStream()` 兜底调用（Firefox 不支持 `captureStream(fps)` 参数）。

### 变更

- **面板交互**：抽屉面板改为点击把手切换展开/关闭（替代悬浮展开/移出关闭），非固定模式下点击面板外部区域自动关闭，固定模式不受影响。
- **统计面板**：统计区域头部整行可点击展开/折叠（替代仅 toggle 按钮可点击），移除 toggle 按钮 hover 样式。
- **CDN 域名**：更新 API 和下载 URL 切换至 `https://baifenwang-auto-study.tarxf.com`，`updateURL` 使用 GitHub raw 作为回退。
- **构建系统**：合并双 Rollup 配置为单文件（`rollup.config.js` + `rollup.min.config.js`），`npm run build` 同时输出未压缩版（`dist/baifenwang-auto-study.user.js`，符合 GreasyFork 源码可读性要求）和压缩版（`dist/baifenwang-auto-study.min.user.js`，Terser）。移除 GreasyFork 专有构建变体。
- **存储后端**：移除无效的 GM 沙箱存储后端（`GM_setValue` / `GM.getValue`），精简为 `localStorage → 内存 Map` 两级降级。`getSetting()` 添加同步 `localStorage` 回退防止设置初始化竞态。
- **版本号同步工具**：`bump-version.js` 覆盖范围扩展至全部 7 处版本引用（`config.js`、`package.json`、`package-lock.json`、`metablock.json`、`worker/package.json`、`worker/package-lock.json`、`worker/src/index.js`）。
- **CSS 构建变体**：移除 GreasyFork 专用的 `rollup.greasyfork.config.js`，合并入统一构建流程。

### 内部改进

- **架构优化**：合并两个独立的 `document.body` MutationObserver 为单一共享工具模块（`utils/dom-observer.js`），一处观察多处订阅，错误隔离。
- **配置拆分**：将 `config.js` 按域拆分为 `config/media.js`（视频替换/捕获/覆盖层选择器）和 `config/pool.js`（图片池/人脸检测/裁剪编辑器），`config.js` 作为统一入口重新导出所有常量。
- **模块清理**：移除废弃的 `generateFaceImage` 模块（自图片池迁移后未使用），移除死代码 `MATCH_PATTERNS` 导出，移除无效网络拦截器。
- **资源管理**：缓存 `AudioContext` 单例防止反复创建导致浏览器资源泄漏，全局错误边界包裹引导阶段防止静默初始化失败。
- **性能优化**：dHash 计算 canvas 跨上传批次复用减少内存分配，图片突变复用单个离屏 canvas 避免重复创建，React Fiber key 和容器缓存避免重复 `Object.keys` 扫描，drawLoop 从 60fps 降至 15fps（静态 canvas 图片无需高频刷新）。
- **UI 文案**：全面润色中文界面文案，项目名从「百分王」修正为「百分网」，侧边栏标签优化为「刷课助手」。

## [1.0.0] - 2026-06-23

### 新增

- **视频流拦截** — 代理 `getUserMedia`，用图片池中的图片替换真实摄像头，通过 canvas 渲染（15fps，含亮度随机扰动）
- **持久化图片池** — 支持点击/拖拽上传，dHash 感知哈希去重，变异引擎（亮度、对比度、饱和度、色调、翻转、旋转、缩放、JPEG 质量随机化），保存原图供裁剪编辑
- **质量评分与加权选图** — 按图片成功率追踪，分三档权重（高=2.5×、中=1.0×、低=0.15×），悬浮展示使用次数和成功率徽章
- **三级人脸检测智能裁剪** — 浏览器原生 FaceDetector API → YCbCr 肤色聚类（降采样 canvas）→ 固定垂直偏置兜底
- **裁剪编辑器** — 8 个可拖拽调整手柄，4:3 宽高比锁定，拖动移动裁剪框，实时预览缩略图，一键重新人脸检测
- **人脸验证自动化** — MutationObserver 检测验证弹窗，顺序自动点击（打开摄像头→拍照→对比），失败指数退避重试（基础 2s，上限 30s，最多 5 次），支持暂停/恢复的自动对比开关
- **自动刷课** — 读取 React Fiber 状态获取完整课程树（章节/课时/学习进度/状态），双进度条（本章+总体），带重试的自动播放（最多 10 次），卡顿检测与自动恢复（30s 阈值），SPA 导航自适应
- **防切屏检测** — 全向拦截：`document.hidden`、`visibilityState`、`hasFocus`、`visibilitychange`、`blur`、`pagehide`/`pageshow` 事件及其 onxxx setter，捕获阶段 `stopImmediatePropagation()` 抑制，可通过设置开关还原
- **视频叠加层控件** — 在伪流 `<video>` 上叠加模式徽章与刷新/切换按钮，通过 `srcObject` setter 钩子与 MutationObserver 双重检测
- **侧边抽屉面板** — 32px 悬浮把手 → 348px 滑出面板，固定开启，5 个独立开关，带时间戳的日志查看器（自动滚动），图片池缩略图网格（绿色边框=高成功率 / 红色虚线=低成功率），隐私模糊开关，视频帧捕获按钮
- **多后端存储适配器** — GM_setValue → GM 异步 API → localStorage → 内存 Map 无缝降级，设置与图片池共用
- **彩色控制台日志** — 四档日志级别（DEBUG/INFO/WARN/ERROR），可配置输出阈值
- **Rollup 构建流水线** — IIFE 输出，`rollup-plugin-userscript-metablock` 自动注入脚本头，Terser 双次压缩
- **视频帧捕获工具** — 查找最小可见摄像头视频，校验帧质量（过滤全黑/低色彩帧），保存至图片池
- **版本号同步工具** — `npm run bump:patch|minor|major` 同步更新 `config.js`、`package.json`、`metablock.json`
- **MIT 开源许可证**
