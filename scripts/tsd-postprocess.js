// Postprocess generated type definitions:
// - introduce correctly typed tuples
// - add header and correct whitespace
// - rename to index.d.ts

const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');
const UnionReplacer = require('../dist/union-replacer.cjs');
const tsdConvertTupleArrays = require('./lib/tsdConvertTupleArrays');

const origFileName = `types/${pkg.name}.d.ts`;
const tsd = fs.readFileSync(origFileName, 'utf8');
const converted = tsdConvertTupleArrays(tsd, /^ReplaceWith/).replace(/\s*$/, '\n');

const intro = [
  `// Generated type definitions for ${pkg.name} ${pkg.version}`,
  `// File created by tsd-jsdoc and ${path.relative(process.cwd(), __filename)}.`,
  '// Do not modify directly.',
  '',
  `export = ${UnionReplacer.name};`,
  `export as namespace ${UnionReplacer.name};`,
];
const output = `${intro.join('\n')}\n\n${converted}`;
fs.writeFileSync('types/index.d.ts', output, 'utf8');
fs.unlinkSync(origFileName);
