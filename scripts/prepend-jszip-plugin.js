/**
 * @file Rollup plugin that prepends JSZip UMD source to the output bundle.
 *
 * JSZip is loaded at build time from the jsDelivr CDN and injected after the
 * userscript metadata header, so window.JSZip is defined before the IIFE runs.
 * This avoids the @require race condition with @grant none + document-start.
 */

import https from 'https';

/** Module-level cache — survives across build phases and multi-config runs. */
let _jszipSource = null;

/**
 * Fetch the JSZip UMD source from CDN.
 * @returns {Promise<string>}
 */
function fetchJSZipSource() {
  const url = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          // Follow redirect
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            https
              .get(res.headers.location, (redirectRes) => {
                if (redirectRes.statusCode !== 200) {
                  reject(new Error(`Failed to fetch JSZip: HTTP ${redirectRes.statusCode}`));
                  return;
                }
                let data = '';
                redirectRes.on('data', (chunk) => (data += chunk));
                redirectRes.on('end', () => resolve(data));
              })
              .on('error', reject);
            return;
          }
          reject(new Error(`Failed to fetch JSZip: HTTP ${res.statusCode}`));
          return;
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

/**
 * Rollup plugin — fetches JSZip at build start and inserts it after the
 * ==/UserScript== line in renderChunk.
 *
 * @returns {import('rollup').Plugin}
 */
export default function prependJszip() {
  return {
    name: 'prepend-jszip',

    async buildStart() {
      if (_jszipSource) return; // Already fetched (watch mode re-build)
      _jszipSource = await fetchJSZipSource();
      console.log('[prepend-jszip] Fetched JSZip v3.10.1 from CDN');
    },

    renderChunk(code) {
      if (!_jszipSource) {
        this.warn('JSZip source not available — output may be missing JSZip');
        return null;
      }

      const endMeta = code.indexOf('// ==/UserScript==');
      if (endMeta === -1) {
        // No metablock — prepend at the very beginning
        return { code: _jszipSource + '\n' + code, map: null };
      }

      const insertAt = endMeta + '// ==/UserScript=='.length;
      const before = code.slice(0, insertAt);
      const after = code.slice(insertAt);
      return { code: before + '\n' + _jszipSource + '\n' + after, map: null };
    },
  };
}
