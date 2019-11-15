import babel from 'rollup-plugin-babel';
import pkg from './package.json';

export default [
  {
    input: 'src/UnionReplacer.js',
    plugins: [
      babel({ exclude: 'node_modules/**' }),
    ],
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' },
      { file: pkg.browser, name: 'UnionReplacer', format: 'umd' },
    ],
  },
];
