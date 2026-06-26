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
        version: '1.1.0',
      },
    }),

    // Align metablock values at a consistent column (Greasy Fork convention).
    {
      name: 'align-metablock',
      renderChunk(code) {
        const VALUE_COL = 19; // values align at this 0-based column
        return code.replace(
          /^(\/\/ @\S+)( +)(\S)/gm,
          (_match, key, _spaces, value) => {
            const pad = VALUE_COL - key.length;
            return key + ' '.repeat(Math.max(1, pad)) + value;
          },
        );
      },
    },
  ],
};