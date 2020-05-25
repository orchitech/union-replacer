const template = env.opts.template || '';
const targetTs = template.includes('tsd-jsdoc');

const sourceIncludes = [
  'src/UnionReplacer.js',
  'src/MatchingContext.js',
  'src/typedefs.js',
];

if (!targetTs) {
  sourceIncludes.push('src/typedefs-tscompat.js');
}

module.exports = {
  source: { include: sourceIncludes },
  plugins: [
    './node_modules/tsd-jsdoc/dist/plugin',
    'plugins/markdown',
  ],
  opts: {
    package: 'package.json',
    readme: 'README.md',
  },
};
