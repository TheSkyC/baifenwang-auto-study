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

const LATEST_VERSION = '1.0.0';
const GITHUB_REPO = 'TheSkyC/baifenwang-auto-study';
const DOWNLOAD_PATH = '/latest.user.js';

/** @type {Record<string, object>} */
const RELEASES = {
  '1.0.0': {
    version: '1.0.0',
    publishedAt: '2025-06-25T00:00:00Z',
    downloadUrl: `https://github.com/${GITHUB_REPO}/releases/download/v1.0.0/baifenwang-auto-study.user.js`,
    changelog: [
      { type: 'feat', title: 'Initial release', description: 'First public release of baifenwang-auto-study.' },
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
