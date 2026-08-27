const UnionReplacer = require('../../dist/union-replacer.cjs');

/**
 * Declare a spec asserting that a replacer built from one single rule returns
 * exactly what `String.prototype.replace` returns for that same rule.
 *
 * This is the simplest shape of the library's core promise, and the right tool
 * whenever a single pattern is enough to make the point.
 *
 * @param {string} name - What the case demonstrates, used to name the spec.
 * @param {string} input - Subject to process.
 * @param {RegExp} pattern - The rule's pattern; its flags are used for the
 *   replacer too, so that both sides really do run the same search.
 * @param {string|function(...*): string} replacement - The rule's replacement.
 */
function itMatchesStringReplace(name, input, pattern, replacement) {
  it(`${name} like String.prototype.replace`, () => {
    expect(new UnionReplacer([[pattern, replacement]], pattern.flags).replace(input))
      .toBe(input.replace(pattern, replacement));
  });
}

module.exports = itMatchesStringReplace;
