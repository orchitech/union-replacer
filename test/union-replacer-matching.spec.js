const itMatchesStringReplace = require('./behavior/itMatchesStringReplace');

// Where the match boundaries land is the library's own business: it drives one
// combined regexp rather than the rule's, and then has to advance past each
// match itself. These are the edge cases where that is easy to get wrong --
// empty matches, matches at the very start or end, surrogate pairs -- each one
// pinned to what String.prototype.replace does with the same single rule.
const CASES = [
  ['ignores unicode surrogate pairs by default', '=\uD83D\uDC362=', /\b/g, '_'],
  ['respects unicode surrogate pairs with the u flag', '=\uD83D\uDC362=', /\b/gu, '_'],
  ['works with surrogate pairs at the beggining and end', '\uD83D\uDC362', /\b/gu, '_'],
  ['treats leading match', 'abc', /^./g, '_'],
  ['treats trailing match', 'abc', /.$/g, '_'],
  ['treats consecutive matches', 'abc', /./g, '$`'],
  ['works when nothing matched', 'abc', /[^\s\S]/g, '_'],
];

describe('UnionReplacer.prototype.replace matching', () => {
  CASES.forEach((testCase) => itMatchesStringReplace(...testCase));
});
