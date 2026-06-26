/**
 * @file Inject a new release entry into the Worker catalog.
 *
 * Called by the release workflow. Reads the CHANGELOG.md from the main repo,
 * extracts the current version's changelog entries, and inserts them into
 * worker/src/index.js (LATEST_VERSION + RELEASES block).
 *
 * Env vars (set by release.yml):
 *   VERSION          1.1.0    (semver, no v prefix)
 *   TAG              v1.1.0   (git tag)
 *   SHA256           hex
 *   SIZE             bytes
 *   REPO             TheSkyC/baifenwang-auto-study
 *   CDN_BASE         https://cdn.tarxf.com | empty
 *   CHANGELOG_PATH   absolute path to CHANGELOG.md
 */

import { readFileSync, writeFileSync } from 'node:fs';

const VERSION = process.env.VERSION;
const TAG = process.env.TAG;
const SHA256 = process.env.SHA256;
const SIZE = process.env.SIZE;
const REPO = process.env.REPO;
const CDN_BASE = process.env.CDN_BASE || '';
const CHANGELOG_PATH = process.env.CHANGELOG_PATH;

// Worker source to modify (in the main repo, under worker/)
const WORKER_PATH = 'worker/src/index.js';

// ── helpers ──

function parseChangelog(path, version) {
  const text = readFileSync(path, 'utf8');

  // Find the ## [VERSION] section
  const sectionStart = new RegExp(`^## \\[${escapeRx(version)}\\]`, 'm');
  const startMatch = text.match(sectionStart);
  if (!startMatch) {
    console.warn(`WARN: version [${version}] not found in changelog — skipping entry extraction`);
    return null;
  }

  // Find the next ## [...] section (or end of file)
  const rest = text.slice(startMatch.index);
  const nextSection = rest.slice(startMatch[0].length).match(/^## \[/m);
  const sectionText = nextSection
    ? rest.slice(0, startMatch[0].length + nextSection.index)
    : rest;

  return extractEntries(sectionText);
}

function escapeRx(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Map Chinese Keep-a-Changelog section headers to canonical types. */
const SECTION_TYPE = {
  '新增': 'feat',
  '修复': 'fix',
  '变更': 'change',
  '内部改进': 'perf',
  '移除': 'change',
  '安全': 'fix',
};

function extractEntries(sectionText) {
  const entries = [];
  const lines = sectionText.split('\n');
  let currentType = 'feat';

  for (const raw of lines) {
    const line = raw.trim();
    // Match "### 新增" style headers
    const h3 = line.match(/^### (.+)$/);
    if (h3) {
      const label = h3[1].trim();
      currentType = SECTION_TYPE[label] || 'feat';
      continue;
    }
    // Match "- **title** — description" bullet
    const bullet = line.match(/^- \*\*(.+?)\*\*(?:\s*[—–-]\s*(.+))?$/);
    if (bullet) {
      entries.push({
        type: currentType,
        title: bullet[1].trim(),
        description: (bullet[2] || '').trim(),
      });
    }
  }

  return entries.length > 0 ? entries : null;
}

function injectRelease(workerContent, version, tag, sha256, size, repo, cdnBase, changelogEntries) {
  let changed = false;

  // 1. Update LATEST_VERSION
  const lvRegex = /const LATEST_VERSION = '[^']*';/;
  const newLv = `const LATEST_VERSION = '${version}';`;
  if (workerContent.match(lvRegex)?.[0] !== newLv) {
    workerContent = workerContent.replace(lvRegex, newLv);
    changed = true;
    console.log(`  LATEST_VERSION → ${version}`);
  }

  // 2. Insert RELEASES entry (before existing first entry)
  if (workerContent.includes(`'${version}':`)) {
    console.log(`  RELEASES[${version}] already exists — skipping`);
    return { content: workerContent, changed };
  }

  const releasesOpen = 'const RELEASES = {\n';
  const insertAt = workerContent.indexOf(releasesOpen);
  if (insertAt === -1) {
    console.error('ERROR: RELEASES block not found');
    process.exit(1);
  }

  const today = new Date().toISOString().split('T')[0];
  const changelogJson = changelogEntries
    ? JSON.stringify(changelogEntries, null, 6).replace(/\n/g, '\n    ')
    : '[]';

  const downloadUrl = cdnBase
    ? `${cdnBase}/${tag}/baifenwang-auto-study.user.js`
    : `https://github.com/${repo}/releases/download/${tag}/baifenwang-auto-study.user.js`;

  const entry = [
    `  '${version}': {`,
    `    version: '${version}',`,
    `    publishedAt: '${today}T00:00:00Z',`,
    `    sha256: '${sha256}',`,
    `    size: ${size},`,
    `    downloadUrl: '${downloadUrl}',`,
    `    changelog: ${changelogJson},`,
    `    source: {`,
    `      releaseUrl: 'https://github.com/${repo}/releases/tag/${tag}',`,
    `    },`,
    `  },`,
    `\n`,
  ].join('\n');

  workerContent =
    workerContent.slice(0, insertAt + releasesOpen.length) +
    entry +
    workerContent.slice(insertAt + releasesOpen.length);

  changed = true;
  console.log(`  RELEASES entry added for ${version}`);
  return { content: workerContent, changed };
}

// ── main ──

const changelogEntries = parseChangelog(CHANGELOG_PATH, VERSION);
if (changelogEntries) {
  console.log(`  CHANGELOG: ${changelogEntries.length} entries extracted for ${VERSION}`);
}

let workerContent;
try {
  workerContent = readFileSync(WORKER_PATH, 'utf8');
} catch {
  console.error(`ERROR: ${WORKER_PATH} not found`);
  process.exit(1);
}

const { content: newWorker, changed } = injectRelease(
  workerContent, VERSION, TAG, SHA256, parseInt(SIZE, 10), REPO, CDN_BASE, changelogEntries
);

if (changed) {
  writeFileSync(WORKER_PATH, newWorker);
  console.log(`  Wrote ${WORKER_PATH}`);
} else {
  console.log(`  No changes needed`);
}
