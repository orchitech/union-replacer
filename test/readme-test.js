const fs = require('fs');
const UnionReplacer = require("../src/UnionReplacer")
require('colors');
const Diff = require('diff');

const readme = fs.readFileSync(__dirname + '/../README.md', 'utf8');
var docContext = {
  asserted: false,
  actual: null,
  UnionReplacer: UnionReplacer
};
const docBlockRe = /^(([`~])\2{2,})[ \t]*(.*?)\s+([\s\S]*?)(?:^\1\2*[ \t]*$|(?![\s\S]))/gm;
const testify = new UnionReplacer([
  [/^(?:[ \t\w{}.]+=)?\s*\brequire\b.*$/, '// $&'],
  [/^[ \t]*(var|const|let)\b/, '/* $1 */'],
  [/^[ \t]*console\.log\((.*?)\)[;\s]*(?![\s\S])/, 'actual = $1; asserted = true;']
]);

let m, total = 0, failed = 0, passed = 0;
while ((m = docBlockRe.exec(readme)) !== null) {
  let infoStr = m[3];
  let code = m[4].trim().replace(/\r?\n/, '\n');
  let asserted = docContext.asserted;
  docContext.asserted = false;

  if (/^.*no unionreplacer/i.test(code)) {
    continue;
  }

  if (infoStr === 'js') {
    code = testify.replace(code);
    (new Function(`with (this) {\n  ${code}\n}`)).call(docContext);
  } else if (infoStr === '' && asserted) {
    total++;
    if (code === docContext.actual) {
      passed++;
    } else {
      failed++;
      console.log('Assertion failed:');
      let diff = Diff.diffWordsWithSpace(code, docContext.actual);
      diff.forEach((part) => {
        let color = part.added ? 'green' : part.removed ? 'red' : 'grey';
        process.stderr.write(part.value[color]);
      });
      process.stderr.write('\n');
    }
  }
}

console.log(`Evaluated ${total} assertions, passed: ${passed}, failed: ${failed}.`);
