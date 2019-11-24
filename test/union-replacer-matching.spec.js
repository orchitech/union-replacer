const UnionReplacer = require('../dist/union-replacer.cjs');

const itMatchesLikeStringReplace = (cases) => {
  cases.forEach((c) => {
    const name = c.shift();
    it(`${name} like String.prototype.replace`, () => {
      const input = c.shift();
      expect(new UnionReplacer([c], c[0].flags).replace(input))
        .toBe(input.replace(c[0], c[1]));
    });
  });
};

describe('UnionReplacer.prototype.replace matching', () => {
  itMatchesLikeStringReplace([
    ['ignores unicode surrogate pairs by default', '=\uD83D\uDC362=', /\b/g, '_'],
    ['respects unicode surrogate pairs with the u flag', '=\uD83D\uDC362=', /\b/gu, '_'],
    ['works with surrogate pairs at the beggining and end', '\uD83D\uDC362', /\b/gu, '_'],
    ['treats leading match', 'abc', /^./g, '_'],
    ['treats trailing match', 'abc', /^./g, '_'],
    ['treats consecutive matches', 'abc', /./g, '$`'],
    ['works when nothing matched', 'abc', /[^\s\S]/g, '_'],
  ]);
});
