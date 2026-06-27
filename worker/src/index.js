/**
 * @file baifenwang-auto-study update API — Cloudflare Worker
 *
 * Serves version-check and release metadata for the userscript's built-in
 * update checker (src/utils/update-checker.js).  Data is embedded in this
 * file rather than fetched from GitHub at runtime — no rate limits, no
 * cold-start latency, always consistent.
 *
 * Endpoints:
 *   GET /                         API index
 *   GET /health                   Health check
 *   GET /api/v1/check?version=X   Version comparison
 *   GET /api/v1/releases/:ver     Single release metadata + changelog
 *   GET /latest.user.js           Redirect to latest GitHub release asset
 *
 * Release process:
 *   1. Bump version with `npm run bump:{patch,minor,major}`
 *   2. Run `npm run build` to update dist/
 *   3. Add a release entry in RELEASES below
 *   4. Push the tag — GitHub Release action publishes the .user.js asset
 *   5. Deploy the worker: `cd worker && npm run deploy`
 */

// ---------------------------------------------------------------------------
// Embedded release catalog — update on each release
// ---------------------------------------------------------------------------

const LATEST_VERSION = '1.2.0';
const GITHUB_REPO = 'TheSkyC/baifenwang-auto-study';
const DOWNLOAD_PATH = '/latest.user.js';

/** @type {Record<string, object>} */
const RELEASES = {
  '1.2.0': {
    version: '1.2.0',
    publishedAt: '2026-06-27T00:00:00Z',
    downloadUrl: `https://github.com/${GITHUB_REPO}/releases/download/v1.2.0/baifenwang-auto-study.user.js`,
    changelog: [
      { type: 'feat', title: '智能肤色人脸检测', description: '上传图片对面部区域的裁剪更精准' },
      { type: 'feat', title: '人脸预览测试面板', description: '支持预览变异效果与检测几何信息' },
      { type: 'feat', title: '已验证人脸去重', description: '验证成功的人脸本次课程不再复用' },
    ],
    source: {
      releaseUrl: `https://github.com/${GITHUB_REPO}/releases/tag/v1.2.0`,
    },
  },
  '1.1.0': {
    version: '1.1.0',
    publishedAt: '2026-06-26T00:00:00Z',
    downloadUrl: `https://github.com/${GITHUB_REPO}/releases/download/v1.1.0/baifenwang-auto-study.user.js`,
    changelog: [
      { type: 'feat', title: '学习进度追踪系统', description: '记录每次学习会话，今日/本周/全部三级统计，课程明细列表，七日趋势图' },
      { type: 'feat', title: '版本更新检查系统', description: '自动检测新版本，角标提示与更新日志，支持忽略版本与手动重检' },
      { type: 'feat', title: '页面版本兼容性检测', description: '自动识别页面版本号并给出四级兼容性评级，右下角显示版本号对照及兼容状态' },
      { type: 'feat', title: '图片池动态权重开关', description: '一键开关加权选图功能，状态自动保存' },
      { type: 'fix', title: '修复人脸比对无限重试', description: '增加超时保护，避免比对失败后陷入无限重试循环' },
      { type: 'fix', title: '修复人脸比对误判', description: '消除服务器处理延迟导致的误报，失败后自动渐进式重试' },
      { type: 'fix', title: '修复章节检测失效', description: '章节切换后状态过期导致无法识别当前章节时，自动降级到 DOM 检测' },
      { type: 'fix', title: '修复 Firefox 兼容性', description: '修复视频流获取失败、图片边缘黑边、进度条溢出等问题' },
      { type: 'change', title: '面板交互优化', description: '点击把手切换展开收起、点击外部自动关闭、统计区域整行可点击' },
      { type: 'perf', title: '性能优化', description: '合并重复 DOM 监听、复用 Canvas 实例、降低绘制帧率至 15fps、缓存组件树遍历路径' },
    ],
    source: {
      releaseUrl: `https://github.com/${GITHUB_REPO}/releases/tag/v1.1.0`,
    },
  },
  '1.0.0': {
    version: '1.0.0',
    publishedAt: '2026-06-23T00:00:00Z',
    downloadUrl: `https://github.com/${GITHUB_REPO}/releases/download/v1.0.0/baifenwang-auto-study.user.js`,
    changelog: [
      { type: 'feat', title: '首次发布', description: '百分网自动刷课助手首次公开发布，包含视频流拦截、图片池、人脸验证自动化、自动刷课、防切屏检测等核心功能。' },
    ],
    source: {
      releaseUrl: `https://github.com/${GITHUB_REPO}/releases/tag/v1.0.0`,
    },
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function redirect(url, status = 302) {
  return new Response(null, { status, headers: { Location: url } });
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Accept',
        },
      });
    }

    // API index
    if (request.method === 'GET' && path === '/') {
      return json({
        name: 'baifenwang-auto-study update API',
        version: 'v1',
        latestVersion: LATEST_VERSION,
        endpoints: {
          check: '/api/v1/check?version=X',
          releases: '/api/v1/releases/:version',
          download: DOWNLOAD_PATH,
        },
      });
    }

    // Health check
    if (request.method === 'GET' && path === '/health') {
      return json({ ok: true, timestamp: new Date().toISOString() });
    }

    // Version check — returns whether an update is available
    if (request.method === 'GET' && path === '/api/v1/check') {
      const clientVersion = url.searchParams.get('version') || '0.0.0';
      const latest = RELEASES[LATEST_VERSION];
      const hasUpdate = compareVersions(LATEST_VERSION, clientVersion) > 0;
      return json({
        hasUpdate,
        version: LATEST_VERSION,
        downloadUrl: hasUpdate ? latest.downloadUrl : '',
      });
    }

    // Single release metadata
    const releaseMatch = path.match(/^\/api\/v1\/releases\/(.+)$/);
    if (request.method === 'GET' && releaseMatch) {
      const version = releaseMatch[1];
      const release = RELEASES[version];
      if (!release) {
        return json({ error: 'release_not_found', message: `Release ${version} not found.` }, 404);
      }
      return json(release);
    }

    // Latest download redirect
    if (request.method === 'GET' && path === DOWNLOAD_PATH) {
      const latest = RELEASES[LATEST_VERSION];
      if (!latest) return json({ error: 'not_found' }, 404);
      return redirect(latest.downloadUrl);
    }

    return json({ error: 'not_found', message: 'Endpoint not found.' }, 404);
  },
};
