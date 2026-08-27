const RecordingBuilder = require('./RecordingBuilder');
const groupNames = require('./groupNames');
const { firingRuleAt, replacementAt } = require('./nativeReplace');
const UnionReplacer = require('../../dist/union-replacer.cjs');

/**
 * Hold every match of one replacer run against the single rule that should
 * have handled it, as `String.prototype.replace` would have run it alone.
 *
 * @param {Array<UnionReplacer.ReplaceTuple>} rules - Rules to build with.
 * @param {string} flags - Flags to build the replacer with.
 * @param {string} subject - Input to process.
 */
const expectEveryMatchToBeNative = (rules, flags, subject) => {
  const recorded = new UnionReplacer(rules, flags).replace(subject, {}, new RecordingBuilder());
  const where = `flags '${flags}', input ${JSON.stringify(subject)}`;

  recorded.matches.forEach((actual) => {
    const firing = firingRuleAt(rules, flags, subject, actual.index);
    expect(firing).withContext(`${where}: nothing matches at offset ${actual.index}`).not.toBeNull();
    if (firing === null) {
      return;
    }
    const native = firing.match;
    const at = `${where}, rule ${firing.order} at offset ${actual.index}`;

    // Positional captures, sliced back into the rule's own numbering and arity.
    expect(actual.captures).withContext(`${at}: captures`).toEqual(Array.from(native));
    expect(actual.index).withContext(`${at}: index`).toBe(native.index);
    expect(actual.input).withContext(`${at}: input`).toBe(subject);

    // The firing rule's own named captures hold that rule's own values.
    groupNames(firing.rule[0].source).forEach((name) => {
      expect(actual.groups[name]).withContext(`${at}: groups.${name}`).toBe(native.groups[name]);
    });

    expect(actual.replaced).withContext(`${at}: replacement`)
      .toBe(replacementAt(firing.rule, flags, subject, actual.index, native[0].length));
  });
};

/**
 * Declare a spec asserting that a replacer routes every match to the right
 * rule and hands that rule a match indistinguishable from the one it would
 * have seen under `String.prototype.replace` on its own.
 *
 * Unlike `itMatchesStringReplace`, this looks inside the run rather than at the
 * final string, so a rule set of any size can be checked match by match.
 *
 * @param {string} name - What the case demonstrates, used to name the spec.
 * @param {Array<UnionReplacer.ReplaceTuple>} rules - Rules to build with.
 * @param {Array<string>} inputs - Subjects to process, each checked in full.
 * @param {string} [flags=gm] - Flags to build the replacer with.
 */
function itReplacesLikeStringReplace(name, rules, inputs, flags = 'gm') {
  it(`${name} like String.prototype.replace`, () => {
    inputs.forEach((subject) => {
      expectEveryMatchToBeNative(rules, flags, subject);
    });
  });
}

module.exports = itReplacesLikeStringReplace;
