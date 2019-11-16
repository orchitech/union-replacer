const fs = require('fs');
const jasmineDiff = require('jasmine-diff');
const UnionReplacer = require('../dist/union-replacer.cjs');

const cleanupFencedCodeBlockContents = (contents, indent) => {
  let code = contents.trim();
  if (indent.length > 0) {
    code = code.replace(new RegExp(`^ {1,${indent.length}}`, 'gm'), '');
  }
  return code;
};

const itProducesTheClaimedOutputs = (md, opts) => {
  let asserted = false;
  const docBlockRe = /^( *)(([`~])\3{2,})[ \t]*(.*?)\s+([\s\S]*?)(?:^ *\2\3*[ \t]*$|(?![\s\S]))/gm;
  const testify = new UnionReplacer([
    [/^(?:[ \t\w{}.]+=)?\s*\brequire\b.*$/, '// $&'],
    [/^[ \t]*(var|const|let)[ \t]*\b/, '/* $1 */ this.'],
    [/^[ \t]*console\.log\b(.*?)\s*(?![\s\S])/, (m, logExpr) => {
      asserted = true;
      return `return ${logExpr};\n`;
    }],
  ]);
  const input = md.replace(/\r?\n/, '\n');
  let m;
  let lastRunnableSnippet = false;
  let number = 0;
  while ((m = docBlockRe.exec(input)) !== null) {
    const indent = m[1];
    const infoStr = m[4];
    const snippet = cleanupFencedCodeBlockContents(m[5], indent);
    const snippetToRun = lastRunnableSnippet;
    lastRunnableSnippet = false;

    if (opts.snippetExcludeRe.test(snippet)) {
      // ignore
    } else if (infoStr === 'js') {
      lastRunnableSnippet = testify.replace(snippet);
      lastRunnableSnippet = asserted && lastRunnableSnippet;
    } else if (infoStr === '' && snippetToRun) {
      number += 1;
      it(`produces the claimed output from snippet number ${number}`, function runSnippet() {
        /* eslint-disable-next-line no-new-func */
        const runCode = new Function(`with (this) {\n  ${snippetToRun}\n}\n`);
        expect(runCode.call(this.subject)).toBe(snippet);
      });
    }
  }
};

const markdownDocBehavior = (file, context, options) => {
  let docContext = { ...context };
  const opts = {
    stackSnippets: false,
    snippetExcludeRe: /^\s*(?:\/\/|\/\*)\s*no\b/i,
  };
  Object.assign(opts, options);
  const refreshDocContext = () => {
    if (!opts.stackSnippets) {
      docContext = { ...context };
    }
    return docContext;
  };

  describe(file, () => {
    beforeEach(function prepareForSnippetRun() {
      this.subject = refreshDocContext();
      jasmine.addMatchers(jasmineDiff(jasmine, {
        colors: true,
        inline: true,
      }));
    });
    const md = fs.readFileSync(file, 'utf8');
    itProducesTheClaimedOutputs(md, opts);
  });
};

module.exports = markdownDocBehavior;
