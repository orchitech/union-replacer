const path = require('path');
const describeMarkdownDocBehavior = require('./behavior/describeMarkdownDocBehavior');
const UnionReplacer = require('../dist/union-replacer.cjs');

// The README's examples are executable documentation: each one is really run
// and its result held against the output block the README prints below it, so
// the documented behaviour cannot quietly drift away from the actual one.
// See describeMarkdownDocBehavior for how an example is turned into a spec.
describeMarkdownDocBehavior(
  path.join(__dirname, '..', 'README.md'),
  // The examples open with `require('union-replacer')`; that line is commented
  // out and the module handed in here instead.
  { UnionReplacer },
  // The README deliberately builds on itself -- the Markdown highlighter reuses
  // the htmlEscaper defined by the HTML escaping example above it.
  { stackSnippets: true },
);
