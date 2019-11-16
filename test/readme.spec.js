const path = require('path');
const markdownDocBehavior = require('./markdown-doc-behavior');
const UnionReplacer = require('../dist/union-replacer.cjs');

const readme = path.join(__dirname, '..', 'README.md');
markdownDocBehavior(readme, { UnionReplacer }, { stackSnippets: true });
