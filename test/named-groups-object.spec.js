const UnionReplacer = require('../dist/union-replacer.cjs');

// The named groups object handed to a replacement is the *combined* regexp's,
// not the matched rule's own. A rule therefore sees the names its siblings
// declared, valued undefined, and a rule declaring none still receives the
// object as long as some other rule does.
//
// This is deliberate and documented -- see "Named capture groups" under
// Limitations in the README, and UnionReplacer.ReplaceTuple in src/typedefs.js.
// It is the one place the library knowingly parts company with
// String.prototype.replace, which passes each pattern only its own names, so
// it cannot be covered by the string-replace-equivalence specs.
//
// These specs pin the contract down so it cannot drift unnoticed. Should the
// object ever be narrowed per rule, this file is what has to change, together
// with both pieces of documentation above.

// Object.keys rather than a plain toEqual: what matters here is which names
// are present at all, and a key valued undefined is easy to miss otherwise.
const groupsPassedTo = (rules, probeIndex, input) => {
  let groups = 'no groups argument';
  const probed = rules.map(([pattern, replacement], i) => (i === probeIndex
    ? [pattern, (...args) => {
      const last = args[args.length - 1];
      if (typeof last === 'object' && last !== null) {
        groups = last;
      }
      return '';
    }]
    : [pattern, replacement]));
  new UnionReplacer(probed).replace(input);
  return groups;
};

describe('the named groups object', () => {
  it('carries the names of every rule, not just the matched one', () => {
    const groups = groupsPassedTo([
      [/(?<mine>a)/, ''],
      [/(?<theirs>z)/, 'Z'],
    ], 0, 'a');
    expect(Object.keys(groups).sort()).toEqual(['mine', 'theirs']);
    expect(groups.mine).toBe('a');
  });

  it('leaves the names of other rules undefined', () => {
    const groups = groupsPassedTo([
      [/(?<mine>a)/, ''],
      [/(?<theirs>z)/, 'Z'],
    ], 0, 'a');
    expect('theirs' in groups).toBe(true);
    expect(groups.theirs).toBeUndefined();
  });

  it('reaches a rule that declares no named groups of its own', () => {
    const groups = groupsPassedTo([
      [/(a)(b)/, ''],
      [/(?<theirs>z)/, 'Z'],
    ], 0, 'ab');
    expect(Object.keys(groups)).toEqual(['theirs']);
  });

  it('is absent when no rule in the replacer declares a named group', () => {
    expect(groupsPassedTo([
      [/(a)(b)/, ''],
      [/(z)/, 'Z'],
    ], 0, 'ab')).toBe('no groups argument');
  });

  it('is the same combined object an extended callback sees', () => {
    let seen = null;
    new UnionReplacer([
      [/(?<mine>a)/, (ctx) => { seen = ctx.match.groups; return ''; }, true],
      [/(?<theirs>z)/, 'Z'],
    ]).replace('a');
    expect(Object.keys(seen).sort()).toEqual(['mine', 'theirs']);
  });

  describe('as seen by string replacements', () => {
    it('resolves $<name> declared by another rule', () => {
      // String.prototype.replace would leave this literal: the rule's own
      // pattern has no such group. It resolves here, to empty, because the
      // name does exist in the combined regexp.
      expect(new UnionReplacer([
        [/(a)/, '<$<theirs>>'],
        [/(?<theirs>z)/, 'Z'],
      ]).replace('a')).toBe('<>');
    });

    it('leaves $<name> literal when no rule declares it', () => {
      expect(new UnionReplacer([
        [/(?<mine>a)/, '<$<mine>|$<nobody>>'],
      ]).replace('a')).toBe('<a|$<nobody>>');
    });
  });
});
