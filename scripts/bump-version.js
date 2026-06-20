/**
 * @file Version bump helper script
 * Usage: node scripts/bump-version.js [patch|minor|major]
 *
 * Reads the current version from src/config.js, bumps it, and writes it back.
 * Also updates package.json, metablock.json, and rollup.config.js to keep them in sync.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(__dirname, '../src/config.js');
const PKG_PATH = path.resolve(__dirname, '../package.json');
const META_PATH = path.resolve(__dirname, '../metablock.json');
const ROLLUP_PATH = path.resolve(__dirname, '../rollup.config.js');

const BUMP_TYPE = process.argv[2] || 'patch';

if (!['patch', 'minor', 'major'].includes(BUMP_TYPE)) {
  console.error('Usage: node scripts/bump-version.js [patch|minor|major]');
  process.exit(1);
}

// Read current version from config.js
const configContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
const versionMatch = configContent.match(/SCRIPT_VERSION\s*=\s*['"]([^'"]+)['"]/);
if (!versionMatch) {
  console.error('Could not find SCRIPT_VERSION in src/config.js');
  process.exit(1);
}

const currentVersion = versionMatch[1];
const [major, minor, patch] = currentVersion.split('.').map(Number);

let newVersion;
switch (BUMP_TYPE) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
  default:
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

// Update src/config.js
const updatedConfig = configContent.replace(
  /SCRIPT_VERSION\s*=\s*['"][^'"]+['"]/,
  `SCRIPT_VERSION = '${newVersion}'`
);
fs.writeFileSync(CONFIG_PATH, updatedConfig, 'utf-8');
console.log(`Updated src/config.js: ${currentVersion} → ${newVersion}`);

// Update package.json
const pkgContent = fs.readFileSync(PKG_PATH, 'utf-8');
const pkg = JSON.parse(pkgContent);
pkg.version = newVersion;
fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
console.log(`Updated package.json: ${currentVersion} → ${newVersion}`);

// Update metablock.json
const metaContent = fs.readFileSync(META_PATH, 'utf-8');
const updatedMeta = metaContent.replace(
  /"version"\s*:\s*"[^"]+"/,
  `"version": "${newVersion}"`
);
fs.writeFileSync(META_PATH, updatedMeta, 'utf-8');
console.log(`Updated metablock.json: ${currentVersion} → ${newVersion}`);

// Update rollup.config.js — sync the metablock override version
const rollupContent = fs.readFileSync(ROLLUP_PATH, 'utf-8');
const updatedRollup = rollupContent.replace(
  /(version:\s*)'[^']+'/,
  `$1'${newVersion}'`
);
fs.writeFileSync(ROLLUP_PATH, updatedRollup, 'utf-8');
console.log(`Updated rollup.config.js: ${currentVersion} → ${newVersion}`);

console.log(`\nDone! Version bumped to ${newVersion}`);