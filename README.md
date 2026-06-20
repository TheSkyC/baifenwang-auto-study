# 百分网自动刷课助手

[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/TheSkyC/baifenwang-auto-study/releases)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![Install](https://img.shields.io/badge/Install-直接安装-orange)](https://github.com/TheSkyC/baifenwang-auto-study/releases/latest)

专为百分网（tj.100.wang）设计的网课自动化助手。通过 Canvas 替换摄像头视频流、图像池人脸优选、React 状态监听，全自动完成人脸验证拍照、课程播放、进度追踪，并内置防切屏检测绕过机制。

## 功能特性

### 摄像头替换与人脸验证自动化

- **Canvas 虚拟摄像头流** — 拦截 `getUserMedia`，将人脸图片通过 Canvas 渲染为动态视频流，替代真实摄像头
- **全自动验证流程** — 自动识别人脸验证弹窗，依次点击「打开摄像头 → 拍照 → 开始对比」，失败自动换图重试
- **加权优选机制** — 根据验证历史动态调整选取权重，优质图片优先选用，低分图片保留机会
- **视频叠加控件** — 视频播放器上浮动「换图」「切换真实/伪装摄像头」按钮，可随时手动干预

### 智能图片池管理

- **拖拽上传** — 支持点击或拖拽添加人脸图片（JPG/PNG/WebP）
- **智能裁剪** — 三级人脸检测自动定位，智能裁剪为统一比例
- **感知去重** — 自动拒绝相似度过高的图片，避免重复占用空间
- **变异引擎** — 每次选用随机微调多项图像参数（亮度、色相、旋转等），确保同一张图每次输出不同
- **手动裁剪编辑器** — 点击缩略图打开裁剪编辑器，支持拖拽手柄、宽高比锁定和实时预览
- **隐私保护** — 缩略图默认模糊显示，悬停清晰查看

### 自动课程播放

- **React 状态直读** — 读取 React 内部状态获取课程结构（章节/课时/进度）
- **进度追踪** — 实时显示「本章进度」和「总体进度」两条进度条，附带剩余时间估算
- **自动播放** — 进入页面自动点击播放按钮
- **卡住恢复** — 检测到视频长时间暂停自动恢复播放

### 防切屏检测绕过

- **全向量拦截** — 拦截所有页面可见性相关 API（`document.hidden`、`visibilitychange`、`blur` 等）及对应的事件处理器
- **捕获阶段抑制** — 在事件捕获阶段拦截切屏事件，页面脚本完全感知不到
- **可开关** — 面板内提供独立开关，随时启用/禁用

### 控制面板

- **侧边抽屉面板** — 固定在页面右侧，默认折叠为窄手柄，点击滑出完整面板
- **5 项独立开关** — 自动验证点击 / 摄像头替换 / 自动对比 / 自动刷课 / 防切屏检测绕过
- **实时日志** — 带时间戳的日志窗口，自动滚动
- **图片池管理** — 缩略图网格、删除按钮、质量等级标记（绿框=优质 / 红虚框=差评）、详细统计弹窗
- **快捷按钮** — 手动重试、清空日志、视频截图入池

## 安装

### 前置要求

- 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/) 扩展

### 从发布包安装

1. 前往 [Releases](../../releases) 下载最新版 `baifenwang-auto-study.user.js`
2. 浏览器会自动弹出油猴安装提示，点击确认即可

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/TheSkyC/baifenwang-auto-study.git
cd baifenwang-auto-study

# 安装依赖
npm install

# 构建
npm run build
```

## 使用说明

1. 安装脚本后，打开百分网课程页面，右侧会出现控制面板手柄
2. **首次使用**：上传你的人脸照片到图片池（至少 1 张清晰正面照）
3. 开启需要的功能开关
4. 进入课程后，脚本会自动完成人脸验证和视频播放
5. 如遇验证反复失败，可点击视频上的「切换真实摄像头」按钮用真摄像头完成验证

## 兼容性

**脚本管理器**：Tampermonkey ✅ · Violentmonkey ✅ · Greasemonkey ✅

**浏览器**：Chrome / Edge ✅ · Firefox ✅ · 其他 Chromium ✅

> Chrome / Edge 原生支持 FaceDetector API，人脸检测效果最优；Firefox 自动回退肤色聚类/固定偏移算法。

## 开发

```bash
# 开发模式
npm run dev

# 生产构建
npm run build

# 版本号递增
npm run bump:patch   # 1.0.0 → 1.0.1
npm run bump:minor   # 1.0.0 → 1.1.0
npm run bump:major   # 1.0.0 → 2.0.0
```

## 注意事项

- 请确保图片池中**至少有一张清晰的人脸正面照**，否则验证通过率会较低
- 脚本仅在 `*.tj.100.wang/*` 域名下运行，不会影响其他网站
- 本项目仅用于学习交流，请勿用于违反平台条款的行为

## 许可证

[MIT](./LICENSE)
