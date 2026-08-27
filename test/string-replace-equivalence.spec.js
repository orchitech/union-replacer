const itReplacesLikeStringReplace = require('./behavior/itReplacesLikeStringReplace');
const itCallsReplacementLikeStringReplace = require('./behavior/itCallsReplacementLikeStringReplace');

// A rule never runs on its own. All rules are merged into a single alternation,
// and the combined match is then sliced back apart so that each rule sees only
// its own part of it. These specs pin that slicing down: whichever rule fires,
// it must be handed exactly the match, the captures and the replacement it
// would have received from String.prototype.replace had it run alone.
//
// Every case is checked match by match rather than on the final string, so a
// rule set of any size stays diagnosable when something goes wrong.

describe('UnionReplacer.prototype.replace', () => {
  // The combined regexp renumbers every group, yet $1 must still mean the
  // rule's own first group.
  itReplacesLikeStringReplace(
    "numbers each rule's captures from its own $1",
    [[/(a)(b)/, '<$1$2>'], [/(x)(y)(z)/, '[$1$2$3]'], [/(q)/, '{$1}']],
    ['ab', 'xyz', 'q', 'abxyzq', 'q xyz ab', 'ababab', 'nothing here'],
  );

  // Backreferences are rewritten when the rules are joined, so \1 has to keep
  // pointing at its own rule's first group and not at some earlier rule's.
  itReplacesLikeStringReplace(
    'keeps backreferences pointing at their own rule',
    [[/(\w)\1/, '<$1>'], [/(\d)-(\d)\2\1/, '[$1$2]']],
    ['aa', '1-221', 'aa1-221', 'bb cc', 'xx', 'ab'],
  );

  // $&, $`, $' and $$ are resolved by the library itself, and have to be read
  // against the whole subject rather than the slice the rule matched.
  itReplacesLikeStringReplace(
    'resolves match-context substitutions against the whole input',
    [[/b+/, "<$&|$`|$'|$$>"], [/z/, '[$&]']],
    ['abc', 'abbbc', 'zbz', 'b', 'aaabbbccc'],
  );

  // Named groups of the combined regexp are shared by all rules, so each rule
  // has to pick out only the ones it declared itself.
  itReplacesLikeStringReplace(
    'gives each rule its own named captures',
    [[/(?<first>a)(?<second>b)/, '<$<first>$<second>>'], [/(?<other>x)/, '[$<other>]']],
    ['ab', 'x', 'abx', 'xab', 'ab ab x'],
  );

  // Nesting makes a rule's capture count non-obvious, which is exactly what the
  // slicing depends on getting right.
  itReplacesLikeStringReplace(
    'counts nested groups when slicing a match apart',
    [[/((a)(b))/, '<$1|$2|$3>'], [/((x)((y)(z)))/, '[$1|$2|$3|$4|$5]']],
    ['ab', 'xyz', 'abxyz', 'xyzab'],
  );

  // Ordered alternation: the first rule that matches consumes the input, no
  // matter how much more a later rule would have taken.
  itReplacesLikeStringReplace(
    'lets the first matching rule consume the input',
    [[/foo/, '(FOO)'], [/.+?(?=foo|$)/, '(nonfoo)']],
    ['foobarfoobaz', 'foo', 'barfoo', 'bar'],
  );

  describe('replacement functions', () => {
    // With no named groups anywhere, the argument list ends at the input.
    itCallsReplacementLikeStringReplace(
      'receive the match, their own captures, the offset and the input',
      [/(a)(b)/, /(x)(y)(z)/, /q/],
      ['ab', 'xyz', 'q', 'abxyzq', 'q ab xyz'],
    );

    // Not covered here yet: rule sets that do declare named groups. The named
    // groups object handed to a replacement function is currently the combined
    // regexp's, so a rule also sees the names its siblings declared, and a rule
    // declaring none still gets an object. That is today's documented
    // behaviour -- see "Limitations" in the README -- and revisiting it is its
    // own separate piece of work, which is where those cases belong.
  });
});
