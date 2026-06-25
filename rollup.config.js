/**
 * @file Rollup build configuration
 * Bundles src/index.js into a single userscript with auto-generated metadata.
 */

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import metablock from 'rollup-plugin-userscript-metablock';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/baifenwang-auto-study.user.js',
    format: 'iife',
    name: 'BaifenwangAutoStudy',
    sourcemap: false,
  },
  plugins: [
    resolve(),
    commonjs(),
    metablock({
      file: './metablock.json',
      override: {
        version: '1.0.0',
      },
    }),

    // Post-process metablock: add one extra space between key and value
    // so values align at the conventional column width.
    {
      name: 'fix-metablock-spacing',
      renderChunk(code) {
        return code.replace(/^(\/\/ @\S+)( +)(\S)/gm, '$1 $2$3');
      },
    },
  ],
};