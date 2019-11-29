requirejs.config({
  packages: [
    {
      name: 'benchmark',
      location: '../../node_modules/benchmark',
      main: 'benchmark',
    },
    {
      name: 'lodash',
      location: '../../node_modules/lodash',
      main: 'lodash',
    },
    {
      name: 'platform',
      location: '../../node_modules/platform',
      main: 'platform',
    },
    {
      name: 'UnionReplacer',
      location: '../../dist',
      main: 'union-replacer.umd',
    },
    {
      name: 'Logger',
      location: '.',
      main: 'logger',
    },
    {
      name: 'perf',
      location: '.',
      main: 'perf',
    },
  ],
});
