const fs = require('fs');
const jasmineDiff = require('jasmine-diff');
const itProducesDocumentedOutput = require('./itProducesDocumentedOutput');
const UnionReplacer = require('../../dist/union-replacer.cjs');

/*
 * Executable documentation: run the examples a Markdown document shows off and
 * check they really produce the output the document claims they do.
 *
 * How a document is read
 * ----------------------
 * 1. A fenced ```js block whose last statement is a `console.log(...)` is an
 *    *example*, and the *unlabelled* fence immediately following it holds its
 *    *expected output*. A js block without a `console.log` is setup or
 *    illustration only, and is never run.
 * 2. A block opening with a `// no...` comment is skipped outright. The README
 *    uses that for its deliberately-bad "without UnionReplacer" counterparts,
 *    which must not be executed.
 *
 * How an example is made runnable
 * -------------------------------
 * The snippet is rewritten -- by UnionReplacer itself, which is a fair
 * dogfooding of the library -- into the body of a function:
 *   - `require(...)` lines are commented out. The module under test is handed
 *     in through the context object instead, so the document can show the
 *     honest `require('union-replacer')` a reader would write.
 *   - `const`/`let`/`var` declarations become assignments onto `this`. This is
 *     the load-bearing trick: the example's variables land on the shared
 *     context object rather than dying with the function scope, which is what
 *     lets a later example use something an earlier one defined (the README
 *     builds `htmlEscaper` in one example and reuses it in the next). Enabled
 *     with `stackSnippets`.
 *   - the trailing `console.log(expr)` becomes `return expr`, turning the
 *     example's printed output into the spec's actual value.
 * The rewritten body then runs under `with (this)` against that context
 * object, and its return value is compared with the expected-output fence.
 */

// 1 = indent, 2 = fence, 3 = fence char, 4 = info string, 5 = contents.
const DOC_BLOCK_RE = /^( *)(([`~])\3{2,})[ \t]*(.*?)\s+([\s\S]*?)(?:^ *\2\3*[ \t]*$|(?![\s\S]))/gm;

const HEADING_RE = /^#{1,6}[ \t]+(.*?)[ \t]*$/gm;

const cleanupFencedCodeBlockContents = (contents, indent) => {
  let code = contents.trim();
  if (indent.length > 0) {
    code = code.replace(new RegExp(`^ {1,${indent.length}}`, 'gm'), '');
  }
  return code;
};

// Rewrites an example into a runnable function body, reporting through the
// user context whether it ended in a `console.log` worth asserting on.
const testify = new UnionReplacer([
  [/^(?:[ \t\w{}.]+=)?\s*\brequire\b.*$/, '// $&'],
  [/^[ \t]*(var|const|let)[ \t]*\b/, '/* $1 */ this.'],
  [/^[ \t]*console\.log\b(.*?)\s*(?![\s\S])/, function returnLoggedValue(match, logExpr) {
    this.logged = true;
    return `return ${logExpr};\n`;
  }],
]);

const runnableCode = (snippet) => {
  const logging = { logged: false };
  const code = testify.replace(snippet, logging);
  return logging.logged ? code : null;
};

// Titles of the headings preceding each offset, so specs can be named after
// the document section they came from rather than an opaque ordinal.
const headingsOf = (md) => {
  const headings = [];
  let heading;
  while ((heading = HEADING_RE.exec(md)) !== null) {
    headings.push({ index: heading.index, title: heading[1] });
  }
  return headings;
};

const headingBefore = (headings, index) => headings
  .reduce((title, heading) => (heading.index < index ? heading.title : title), '');

const itProducesTheDocumentedOutputs = (md, opts) => {
  const headings = headingsOf(md);
  let pendingExample = null;
  let block;
  while ((block = DOC_BLOCK_RE.exec(md)) !== null) {
    const [, indent, , , infoStr, contents] = block;
    const snippet = cleanupFencedCodeBlockContents(contents, indent);
    const exampleToRun = pendingExample;
    pendingExample = null;

    if (opts.snippetExcludeRe.test(snippet)) {
      // Deliberately not executable, e.g. a "how not to do it" counterpart.
    } else if (infoStr === 'js') {
      pendingExample = runnableCode(snippet);
    } else if (infoStr === '' && exampleToRun) {
      itProducesDocumentedOutput(headingBefore(headings, block.index), exampleToRun, snippet);
    }
  }
};

/**
 * Declare a suite checking that every example in a Markdown document produces
 * the output the document documents for it.
 *
 * @param {string} file - Path of the Markdown document to read.
 * @param {object} context - Values the examples may use as plain identifiers,
 *   typically the module the document is about.
 * @param {object} [options] - Reading options.
 * @param {boolean} [options.stackSnippets=false] - Whether later examples can
 *   see the variables earlier ones declared.
 * @param {RegExp} [options.snippetExcludeRe] - Blocks whose contents match are
 *   never executed.
 */
const describeMarkdownDocBehavior = (file, context, options) => {
  let docContext = { ...context };
  const opts = {
    stackSnippets: false,
    snippetExcludeRe: /^\s*(?:\/\/|\/\*)\s*no\b/i,
    ...options,
  };
  const refreshDocContext = () => {
    if (!opts.stackSnippets) {
      docContext = { ...context };
    }
    return docContext;
  };

  describe(file, () => {
    beforeEach(function prepareForExampleRun() {
      this.subject = refreshDocContext();
      jasmine.addMatchers(jasmineDiff(jasmine, {
        colors: true,
        inline: true,
      }));
    });
    const md = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    itProducesTheDocumentedOutputs(md, opts);
  });
};

module.exports = describeMarkdownDocBehavior;
