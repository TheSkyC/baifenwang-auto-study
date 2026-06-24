/**
 * @file Page version compatibility checker
 *
 * Detects the page version from DOM and compares against a white/black list
 * to determine compatibility status.  Conservative strategy: only mark as
 * "tested" when explicitly verified; everything else is "unknown".
 */

import { info, warn, error } from './logger.js';
import { SCRIPT_VERSION } from '../config.js';

/**
 * Compatibility map — tested versions only.
 * Only add versions after manual testing confirms full functionality.
 *
 * Format:
 *   'x.y.z': 'tested'     - Fully compatible, tested personally
 *   'x.y.z': 'incompatible' - Known to break (future use)
 */
const COMPATIBILITY_MAP = {
  '1.0.20': 'tested',
  // Add more as you test new versions
};

/**
 * Status descriptions for each compatibility level.
 * Icons are SVG strings imported from icons.js.
 */
const STATUS_INFO = {
  tested: {
    iconKey: 'versionTested',
    color: '#52c41a',
    message: '完全兼容',
  },
  unknown: {
    iconKey: 'versionUnknown',
    color: '#faad14',
    message: '未在此版本测试',
  },
  incompatible: {
    iconKey: 'versionIncompatible',
    color: '#ff4d4f',
    message: '已知不兼容',
  },
  missing: {
    iconKey: 'versionMissing',
    color: '#8c8c8c',
    message: '未检测到版本号',
  },
};

/**
 * Check the page version and determine compatibility status.
 *
 * @returns {Object} Compatibility result
 * @property {string} status - 'tested' | 'unknown' | 'incompatible' | 'missing'
 * @property {string} [pageVersion] - Detected page version (if found)
 * @property {string} scriptVersion - Current script version
 * @property {string} iconKey - Icon key name for icons.js lookup
 * @property {string} color - Status color (CSS)
 * @property {string} message - Human-readable status description
 */
export function checkPageVersion() {
  // Try multiple selectors — CSS Modules hash may change
  const selectors = [
    '.versions___2-l4L',                    // Current CSS Module hash
    '[class*="versions"]',                  // Partial match fallback
    '.ant-layout-footer [class*="version"]', // Common Ant Design footer pattern
  ];

  let versionEl = null;
  for (const selector of selectors) {
    versionEl = document.querySelector(selector);
    if (versionEl) break;
  }

  // Case 1: Version element not found
  if (!versionEl) {
    const info_status = STATUS_INFO.missing;
    warn('未检测到页面版本号元素');
    return {
      status: 'missing',
      scriptVersion: SCRIPT_VERSION,
      ...info_status,
    };
  }

  // Case 2: Parse version number
  const match = versionEl.textContent.match(/版本号[：:]\s*([\d.]+)/);
  if (!match) {
    const info_status = STATUS_INFO.missing;
    warn('版本号格式异常:', versionEl.textContent);
    return {
      status: 'missing',
      scriptVersion: SCRIPT_VERSION,
      ...info_status,
    };
  }

  const pageVersion = match[1];
  const knownStatus = COMPATIBILITY_MAP[pageVersion];

  // Case 3: Known tested version
  if (knownStatus === 'tested') {
    const info_status = STATUS_INFO.tested;
    info(`页面版本: ${pageVersion}, 脚本版本: ${SCRIPT_VERSION}, 兼容性: 已测试`);
    return {
      status: 'tested',
      pageVersion,
      scriptVersion: SCRIPT_VERSION,
      ...info_status,
    };
  }

  // Case 4: Known incompatible version
  if (knownStatus === 'incompatible') {
    const info_status = STATUS_INFO.incompatible;
    error(`页面版本 ${pageVersion} 与脚本不兼容`);
    return {
      status: 'incompatible',
      pageVersion,
      scriptVersion: SCRIPT_VERSION,
      ...info_status,
    };
  }

  // Case 5: Unknown version (default — conservative strategy)
  const info_status = STATUS_INFO.unknown;
  warn(`页面版本: ${pageVersion}, 脚本版本: ${SCRIPT_VERSION}, 兼容性: 未知 (未测试)`);
  return {
    status: 'unknown',
    pageVersion,
    scriptVersion: SCRIPT_VERSION,
    ...info_status,
  };
}
