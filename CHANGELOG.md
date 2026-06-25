# 更新日志

本项目的所有重要变更均记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

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
- MIT 开源许可证
