/**
 * @file Version bump helper script
 * Usage: node scripts/bump-version.js [patch|minor|major] [--dry-run|--dry]
 *
 * Reads the current version from src/config.js (single source of truth), bumps
 * it according to semver, and writes the new version back to ALL files that
 * reference it — including the worker sub-project that serves the update API.
 *
 * Files updated:
 *   1. src/config.js            — SCRIPT_VERSION constant
 *   2. package.json             — npm version field
 *   3. package-lock.json        — npm lockfile version (root + "" entry)
 *   4. metablock.json           — @version in userscript header
 *   5. rollup.config.js         — metablock override version
 *   6. rollup.min.config.js     — metablock override version (min build)
 *   7. worker/package.json      — worker npm version
 *   8. worker/package-lock.json — worker lockfile version (root + "" entry)
 *   9. worker/src/index.js      — LATEST_VERSION + RELEASES catalog
 *
 * The worker gets a NEW release entry prepended to RELEASES (historical entries
 * are preserved).  The changelog in the new entry is a TODO placeholder — fill
 * it in before deploying.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const BUMP_TYPE = process.argv[2] || 'patch';
const DRY_RUN = process.argv.includes('--dry-run') || process.argv.includes('--dry');

if (!['patch', 'minor', 'major'].includes(BUMP_TYPE)) {
  console.error('Usage: node scripts/bump-version.js [patch|minor|major] [--dry-run]');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readFile(relPath) {
  const abs = path.resolve(ROOT, relPath);
  // Normalize CRLF → LF so all downstream string operations work
  // reliably regardless of the file's original line endings.
  return { abs, content: fs.readFileSync(abs, 'utf-8').replace(/\r\n/g, '\n') };
}

function writeFile(relPath, content) {
  const abs = path.resolve(ROOT, relPath);
  if (DRY_RUN) {
    console.log(`  [dry-run] would write ${relPath}`);
    return;
  }
  fs.writeFileSync(abs, content, 'utf-8');
}

/** Parse "1.2.3" → [1, 2, 3]; throws on invalid format. */
function parseVersion(v) {
  const parts = v.split('.');
  if (parts.length !== 3 || parts.some(p => isNaN(Number(p)) || Number(p) < 0)) {
    throw new Error(`Invalid semver: "${v}". Expected "X.Y.Z".`);
  }
  return parts.map(Number);
}

/** Format [1, 2, 3] → "1.2.3" */
function formatVersion(major, minor, patch) {
  return `${major}.${minor}.${patch}`;
}

/** Bump [major, minor, patch] by type, return new version string. */
function bumpVersion(current, type) {
  const [major, minor, patch] = parseVersion(current);
  switch (type) {
    case 'major': return formatVersion(major + 1, 0, 0);
    case 'minor': return formatVersion(major, minor + 1, 0);
    case 'patch':
    default:      return formatVersion(major, minor, patch + 1);
  }
}

/** ISO-8601 date string for today (UTC midnight, same format as existing entries). */
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T00:00:00Z`;
}

/** Lightweight diff preview: show old → new for a single-line change. */
function previewSingle(oldLine, newLine) {
  console.log(`    - ${oldLine.trim()}`);
  console.log(`    + ${newLine.trim()}`);
}

// ---------------------------------------------------------------------------
// Worker RELEASES entry builder
// ---------------------------------------------------------------------------

/**
 * Build a new RELEASES entry for the worker, matching the exact style of
 * existing entries.  Template literal interpolation markers (${GITHUB_REPO})
 * are preserved literally in the output file; the version number is baked in.
 *
 * Uses string concatenation to avoid nested-template-literal confusion —
 * backticks and ${…} syntax in the output are just literal characters here.
 */
function buildReleaseEntry(newVersion, publishedAt) {
  // In single-quoted JS strings, $ { } and ` carry no special meaning, so they
  // appear verbatim in the written file.
  const BT = '`';                     // literal backtick in output
  const GR = '${GITHUB_REPO}';        // literal JS template interpolation in output
  const v = newVersion;

  return (
    `  '${v}': {\n` +
    `    version: '${v}',\n` +
    `    publishedAt: '${publishedAt}',\n` +
    `    downloadUrl: ${BT}https://github.com/${GR}/releases/download/v${v}/baifenwang-auto-study.user.js${BT},\n` +
    `    changelog: [\n` +
    `      // TODO: fill in changelog entries for v${v}\n` +
    `      { type: 'feat', title: 'TODO', description: '' },\n` +
    `    ],\n` +
    `    source: {\n` +
    `      releaseUrl: ${BT}https://github.com/${GR}/releases/tag/v${v}${BT},\n` +
    `    },\n` +
    `  },\n`
  );
}

// ---------------------------------------------------------------------------
// Update operations
//
// Each operation is a function: (currentVer, newVer) => boolean
// Returns true if the file was actually changed.  Throws on error.
// ---------------------------------------------------------------------------

function updateConfigJS(cur, next) {
  const relPath = 'src/config.js';
  const { content } = readFile(relPath);
  const regex = /(SCRIPT_VERSION\s*=\s*)'[^']*'/;
  const match = content.match(regex);
  if (!match) throw new Error(`SCRIPT_VERSION not found in ${relPath}`);

  const newContent = content.replace(regex, `$1'${next}'`);
  if (newContent === content) {
    console.log(`  SKIP src/config.js — already ${next}`);
    return false;
  }

  if (DRY_RUN) previewSingle(match[0], `${match[1]}'${next}'`);
  writeFile(relPath, newContent);
  console.log(`  OK   src/config.js SCRIPT_VERSION: ${cur} → ${next}`);
  return true;
}

function updatePackageJSON(cur, next) {
  const relPath = 'package.json';
  const { content } = readFile(relPath);
  const pkg = JSON.parse(content);
  if (pkg.version === next) {
    console.log(`  SKIP package.json — already ${next}`);
    return false;
  }
  pkg.version = next;
  writeFile(relPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  OK   package.json: ${cur} → ${next}`);
  return true;
}

function updateMetablockJSON(cur, next) {
  const relPath = 'metablock.json';
  const { content } = readFile(relPath);
  const regex = /("version"\s*:\s*)"[^"]*"/;
  const match = content.match(regex);
  if (!match) throw new Error(`version field not found in ${relPath}`);

  const newContent = content.replace(regex, `$1"${next}"`);
  if (newContent === content) {
    console.log(`  SKIP metablock.json — already ${next}`);
    return false;
  }
  if (DRY_RUN) previewSingle(match[0], `"version": "${next}"`);
  writeFile(relPath, newContent);
  console.log(`  OK   metablock.json: ${cur} → ${next}`);
  return true;
}

function updateRollupConfig(relPath, label) {
  return (cur, next) => {
    const { content } = readFile(relPath);
    const regex = /(version:\s*)'[^']*'/;
    const match = content.match(regex);
    if (!match) throw new Error(`version override not found in ${relPath}`);

    const newContent = content.replace(regex, `$1'${next}'`);
    if (newContent === content) {
      console.log(`  SKIP ${relPath} — already ${next}`);
      return false;
    }
    if (DRY_RUN) previewSingle(match[0], `${match[1]}'${next}',`);
    writeFile(relPath, newContent);
    console.log(`  OK   ${label || relPath}: ${cur} → ${next}`);
    return true;
  };
}

function updateWorkerPackageJSON(cur, next) {
  const relPath = 'worker/package.json';
  let content;
  try {
    content = readFile(relPath).content;
  } catch {
    console.warn(`  WARN  worker/package.json not found — skipping`);
    return false;
  }
  const pkg = JSON.parse(content);
  if (pkg.version === next) {
    console.log(`  SKIP worker/package.json — already ${next}`);
    return false;
  }
  pkg.version = next;
  writeFile(relPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  OK   worker/package.json: ${cur} → ${next}`);
  return true;
}

function updatePackageLock(cur, next) {
  const relPath = 'package-lock.json';
  let content;
  try {
    content = readFile(relPath).content;
  } catch {
    console.warn(`  WARN  package-lock.json not found — skipping`);
    return false;
  }
  const pkg = JSON.parse(content);
  if (pkg.version === next && pkg.packages?.['']?.version === next) {
    console.log(`  SKIP package-lock.json — already ${next}`);
    return false;
  }
  pkg.version = next;
  if (pkg.packages?.['']) {
    pkg.packages[''].version = next;
  }
  writeFile(relPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  OK   package-lock.json: ${cur} → ${next}`);
  return true;
}

function updateWorkerPackageLock(cur, next) {
  const relPath = 'worker/package-lock.json';
  let content;
  try {
    content = readFile(relPath).content;
  } catch {
    console.warn(`  WARN  worker/package-lock.json not found — skipping`);
    return false;
  }
  const pkg = JSON.parse(content);
  if (pkg.version === next && pkg.packages?.['']?.version === next) {
    console.log(`  SKIP worker/package-lock.json — already ${next}`);
    return false;
  }
  pkg.version = next;
  if (pkg.packages?.['']) {
    pkg.packages[''].version = next;
  }
  writeFile(relPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  OK   worker/package-lock.json: ${cur} → ${next}`);
  return true;
}

function updateWorkerIndex(cur, next) {
  const relPath = 'worker/src/index.js';
  let content;
  try {
    content = readFile(relPath).content;
  } catch {
    console.warn(`  WARN  worker/src/index.js not found — skipping`);
    return false;
  }

  let changed = false;

  // --- 1. Update LATEST_VERSION ---
  const lvRegex = /(LATEST_VERSION\s*=\s*)'[^']*'/;
  const lvMatch = content.match(lvRegex);
  if (!lvMatch) {
    console.warn(`  WARN  worker/src/index.js: LATEST_VERSION not found — skipping`);
  } else {
    const oldLine = lvMatch[0];
    const newLine = `${lvMatch[1]}'${next}'`;
    if (oldLine !== newLine) {
      content = content.replace(oldLine, newLine);
      changed = true;
      if (DRY_RUN) previewSingle(oldLine, newLine);
      console.log(`  OK   worker/src/index.js LATEST_VERSION: ${cur} → ${next}`);
    }
  }

  // --- 2. Insert new RELEASES entry (idempotent) ---
  if (content.includes(`'${next}': {`)) {
    console.log(`  SKIP worker/src/index.js RELEASES — entry for ${next} already exists`);
  } else {
    const releasesOpen = 'const RELEASES = {\n';
    const insertAt = content.indexOf(releasesOpen);
    if (insertAt === -1) {
      console.warn(`  WARN  worker/src/index.js: RELEASES block not found — skipping insertion`);
    } else {
      const entry = buildReleaseEntry(next, todayISO());
      content = content.slice(0, insertAt + releasesOpen.length) + entry + content.slice(insertAt + releasesOpen.length);
      changed = true;
      console.log(`  OK   worker/src/index.js RELEASES: added entry for ${next}`);
    }
  }

  if (changed) writeFile(relPath, content);
  return changed;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log(`\nBumping version: ${BUMP_TYPE}${DRY_RUN ? ' (dry-run)' : ''}\n`);

// 1. Read current version from the single source of truth
const configFile = readFile('src/config.js');
const versionMatch = configFile.content.match(/SCRIPT_VERSION\s*=\s*'([^']+)'/);
if (!versionMatch) {
  console.error('ERROR: Could not find SCRIPT_VERSION in src/config.js');
  process.exit(1);
}

const currentVersion = versionMatch[1];
let newVersion;
try {
  newVersion = bumpVersion(currentVersion, BUMP_TYPE);
} catch (err) {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
}

console.log(`  ${currentVersion} → ${newVersion}\n`);

// 2. Run all operations in order
const operations = [
  ['src/config.js',            updateConfigJS],
  ['package.json',             updatePackageJSON],
  ['package-lock.json',        updatePackageLock],
  ['metablock.json',           updateMetablockJSON],
  ['rollup.config.js',         updateRollupConfig('rollup.config.js', 'rollup.config.js')],
  ['rollup.min.config.js',     updateRollupConfig('rollup.min.config.js', 'rollup.min.config.js')],
  ['worker/package.json',      updateWorkerPackageJSON],
  ['worker/package-lock.json', updateWorkerPackageLock],
  ['worker/src/index.js',      updateWorkerIndex],
];

let changed = 0;
let skipped = 0;
const errors = [];

for (const [label, op] of operations) {
  try {
    const didChange = op(currentVersion, newVersion);
    if (didChange) changed++; else skipped++;
  } catch (err) {
    errors.push({ label, message: err.message });
    console.error(`  FAIL ${label}: ${err.message}`);
  }
}

// 3. Summary
console.log(`\n${'─'.repeat(52)}`);
console.log(`  Changed: ${changed}  Skipped: ${skipped}  Errors: ${errors.length}`);

if (DRY_RUN) {
  console.log(`\n  Dry-run complete. Run without --dry-run to apply changes.`);
} else if (errors.length === 0) {
  console.log(`\n  Version bumped to ${newVersion}.`);
  console.log(`  Next steps:`);
  console.log(`    1. Fill in the changelog in worker/src/index.js (marked TODO)`);
  console.log(`    2. Update worker/src/index.js publishedAt if needed`);
  console.log(`    3. Run: npm run build`);
  console.log(`    4. Commit: git add -A && git commit -m "chore(release): bump to v${newVersion}"`);
  console.log(`    5. Deploy worker: cd worker && npm run deploy`);
} else {
  console.log(`\n  Completed with ${errors.length} error(s). Check output above.`);
  process.exit(1);
}

console.log();
