const RecordingBuilder = require('./RecordingBuilder');
const { argumentsAt } = require('./nativeReplace');
const UnionReplacer = require('../../dist/union-replacer.cjs');

/**
 * Declare a spec asserting that replacement functions are called with exactly
 * the argument list `String.prototype.replace` would have passed them: the
 * match, the rule's own captures in its own numbering, the offset, the whole
 * input, and a named-groups object only where the rule itself defines names.
 *
 * The rules are built here rather than taken ready-made, because every
 * replacement has to be a recording probe for the arguments to be observable.
 *
 * @param {string} name - What the case demonstrates, used to name the spec.
 * @param {Array<RegExp>} patterns - Patterns to build the rules from.
 * @param {Array<string>} inputs - Subjects to process, each checked in full.
 * @param {string} [flags=gm] - Flags to build the replacer with.
 */
function itCallsReplacementLikeStringReplace(name, patterns, inputs, flags = 'gm') {
  it(`${name} like String.prototype.replace`, () => {
    const calls = [];
    const rules = patterns.map((pattern, order) => [pattern, (...args) => {
      calls.push({ order, args });
      return '';
    }]);
    const replacer = new UnionReplacer(rules, flags);

    inputs.forEach((subject) => {
      calls.length = 0;
      // The builder records one entry per match, in step with the calls above.
      // It is the only trustworthy source of each match's offset here, since
      // the argument list that would otherwise carry it is what is under test.
      const recorded = replacer.replace(subject, {}, new RecordingBuilder());
      calls.forEach(({ order, args }, i) => {
        const { index } = recorded.matches[i];
        const at = `flags '${flags}', input ${JSON.stringify(subject)}`;
        expect(args).withContext(`${at}, rule ${order} at offset ${index}`)
          .toEqual(argumentsAt(patterns[order], flags, subject, index));
      });
    });
  });
}

module.exports = itCallsReplacementLikeStringReplace;
