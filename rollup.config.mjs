import { createRequire } from 'node:module';
import { babel } from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const pkg = createRequire(import.meta.url)('./package.json');

export default [
  {
    input: 'src/UnionReplacer.js',
    plugins: [
      nodeResolve(),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        comments: false,
        presets: [
          [
            '@babel/env', {
              modules: false,
              targets: {
                // `not dead` nowadays excludes IE 11, so it has to be re-added
                // afterwards in order to keep the ES5-compatible output.
                browsers: '> 1%, not op_mini all, not dead, IE 11',
                node: 8,
                esmodules: false,
              },
              useBuiltIns: false,
              loose: true,
            },
          ],
        ],
      }),
    ],
    output: [
      { file: pkg.main, format: 'cjs', exports: 'default' },
      { file: pkg.module, format: 'es' },
      {
        file: pkg.browser, name: 'UnionReplacer', format: 'umd', exports: 'default',
      },
    ],
  },
];
