/**
 * @file Rollup config for minified production build.
 * Uses terser to compress output while keeping the userscript header intact.
 */
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import metablock from 'rollup-plugin-userscript-metablock';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/baifenwang-auto-study.min.user.js',
    format: 'iife',
    name: 'BaifenwangAutoStudy',
    sourcemap: false,
  },
  plugins: [
    resolve(),
    commonjs(),
    // terser runs BEFORE metablock so the header stays readable
    terser({
      format: {
        comments: false,
      },
    }),
    metablock({
      file: './metablock.json',
      override: {
        version: '1.0.0',
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
