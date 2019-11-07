import pkg from './package.json';

export default [
  {
    input: 'src/UnionReplacer.js',
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' },
      { file: pkg.browser, name: 'UnionReplacer', format: 'umd' },
    ],
  },
];
