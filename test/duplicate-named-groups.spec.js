const itReplacesLikeStringReplace = require('./behavior/itReplacesLikeStringReplace');
const duplicateNamedGroupsSupported = require('./behavior/duplicateNamedGroupsSupported');
const withoutDuplicateNamedGroupSupport = require('./behavior/withoutDuplicateNamedGroupSupport');
const UnionReplacer = require('../dist/union-replacer.cjs');

// Rules are joined into one alternation, so a capture group name reused across
// rules yields `(?<v>...)|(?<v>...)`. Every engine used to reject that outright.
// ES2025 made it legal and V8 has shipped it, which is what puts the rule sets
// below within reach at all.
//
// The duplicates always land in separate alternatives -- one per rule, and
// within a rule only where the rule's own pattern already had them -- which is
// precisely the shape ES2025 permits. Nothing here relies on the library
// knowing any of that: matches are routed by capture index, never by name, so
// the point of these specs is that a shared name changes nothing. Whichever
// rule fires still sees exactly the match String.prototype.replace would have
// given it alone.
//
// Patterns are built through `re()` rather than written as regexp literals. A
// literal with a repeated group name is a *parse* error on an engine without
// the ES2025 support, which would stop this whole file from loading, and
// ESLint rejects one too. Going through a function keeps the source a string
// until the engine has been asked whether it can take it.
const re = (source) => new RegExp(source);

const compile = (rules) => rules.map(([source, replacement]) => [re(source), replacement]);

// Rename every capture group apart, so that a rule set sharing a name can be
// held against an otherwise identical one that shares none. Only names *across*
// rules are separated -- a rule repeating a name within its own pattern still
// does so afterwards, which is what makes the two sets comparable at all.
const uniquify = (rules) => rules.map(([source, replacement], i) => [
  source
    .replace(/\(\?<([^!=][^>]*)>/g, (m, name) => `(?<${name}_${i}>`)
    .replace(/\\k<([^>]+)>/g, (m, name) => `\\k<${name}_${i}>`),
  replacement.replace(/\$<([^>]+)>/g, (m, name) => `$<${name}_${i}>`),
]);

// Held as sources, not patterns: a scenario is only ever compiled once the
// engine is known to accept it.
const SCENARIOS = [
  {
    name: 'a shared name used once per rule',
    rules: [['(?<v>a)', '<$<v>>'], ['(?<v>b)', '[$<v>]']],
  },
  {
    name: "a shared name used twice within one rule's own pattern",
    rules: [['(?<v>a)|(?<v>A)', '<$<v>>'], ['(?<v>b)', '[$<v>]']],
  },
  {
    name: 'a shared name used twice within every rule',
    rules: [['(?<v>a)|(?<v>A)', '<$<v>>'], ['(?<v>b)|(?<v>B)', '[$<v>]']],
  },
  {
    // The mix the two cases above are the extremes of.
    name: 'rules mixing one instance of a shared name with several',
    rules: [
      ['(?<v>a)|(?<v>A)', '<$<v>>'],
      ['(?<v>b)', '[$<v>]'],
      ['(?<v>c)|(?<v>C)|(?<v>ç)', '{$<v>}'],
    ],
  },
  {
    name: 'a shared name beside a unique named group',
    rules: [['(?<v>a)(?<x>1)', '<$<v>$<x>>'], ['(?<v>b)(?<y>2)', '[$<v>$<y>]']],
  },
  {
    name: 'a shared name beside unnamed groups',
    rules: [['(a)(?<v>b)(c)', '<$1$<v>$2>'], ['(x)(?<v>y)', '[$1$<v>]']],
  },
  {
    // Named and unnamed captures are numbered together, so what $1 means
    // depends on where the named ones sit. The two rules order them
    // differently on purpose.
    name: 'named and unnamed groups interleaved in different orders',
    rules: [
      ['(?<v>a)(1)(?<x>b)(2)', '<$<v>|$1|$<x>|$2>'],
      ['(3)(?<v>c)(4)(?<y>d)', '[$1|$<v>|$2|$<y>]'],
    ],
  },
  {
    name: 'a shared name inside nested groups',
    rules: [['((?<v>a)(b))', '<$1|$2|$3|$<v>>'], ['((x)(?<v>y))', '[$1|$2|$3|$<v>]']],
  },
  {
    name: 'a shared name with a numeric backreference',
    rules: [['(?<v>a)(.)\\2', '<$<v>|$1|$2>'], ['(?<v>b)(.)\\2', '[$<v>|$1|$2]']],
  },
  {
    // \k<v> is left as written when the rules are joined. It still has to
    // resolve to the firing rule's own group rather than the sibling's.
    name: 'a shared name with a named backreference',
    rules: [['(?<v>a)\\k<v>', '<$<v>>'], ['(?<v>b)\\k<v>', '[$<v>]']],
  },
  {
    name: 'three rules sharing a name with different capture counts',
    rules: [
      ['(?<v>a)(1)(2)', '<$<v>|$1|$2>'],
      ['(?<v>b)(3)', '[$<v>|$1]'],
      ['(?<v>c)', '{$<v>}'],
    ],
  },
  {
    // Nobody's `v` participates when the optional group is skipped, so the
    // shared name is undefined for every rule at once.
    name: 'a shared name that need not participate',
    rules: [['x(?<v>1)?', '<$&|$<v>>'], ['y(?<v>2)?', '[$&|$<v>]']],
  },
  {
    // Repetition revisits both alternatives; only the last one entered counts.
    name: 'a shared name inside a repeated group',
    rules: [['(?:(?<v>a)|(?<v>A))+', '<$&|$<v>>'], ['(?<v>b)', '[$<v>]']],
  },
  {
    name: 'a shared name reachable through either alternative of one rule',
    rules: [['(?<v>a)b|c(?<v>d)', '<$<v>>'], ['(?<v>e)', '[$<v>]']],
  },
];

const INPUTS = [
  '', 'a', 'A', 'b', 'B', 'ab', 'ba', 'aA', 'bB', 'aAbB', 'AB', 'aBAb',
  'a1', 'b2', 'a12', 'b3', 'c', 'C', 'ç', 'abc', 'xy', 'abcxy', 'aa',
  'bb', 'aab', 'x1y2', '3c4d', 'x', 'y', 'a1b2c3d4', ' a b ', 'a\nb', 'xyxy',
  'abab', 'zzz', 'aaa', 'axbxc', 'ab1cd2', 'AaBb', 'xxyy', 'cd', 'e', 'abcde',
];

const FLAG_SETS = ['gm', 'g', 'gi', 'gu', 'gs', 'm', ''];

// The rule set the engine is asked about, kept apart from the scenarios so
// that the question can be put on any engine at all.
const SHARED_NAME_RULES = [['(?<v>a)', '<$<v>>'], ['(?<v>b)', '[$<v>]']];

describe('duplicate named capture groups', () => {
  // This one runs everywhere, and is the reason the rest may not have to.
  // Whichever way it goes, one of the two suites below is left declaring
  // nothing but a pending spec, and a suite that skips itself proves nothing
  // on its own -- a CI matrix quietly losing an engine would still go green.
  // So state the engine's answer as an assertion rather than as a condition,
  // and let it fail if the skipping turns out to have been unwarranted.
  const verdict = duplicateNamedGroupsSupported ? 'accepted' : 'rejected';
  it(`are ${verdict} by the engine running these specs`, () => {
    const build = () => new UnionReplacer(compile(SHARED_NAME_RULES));
    if (duplicateNamedGroupsSupported) {
      expect(build().replace('ab')).toBe('<a>[b]');
    } else {
      expect(build).toThrowError(SyntaxError);
    }
  });

  describe('where the engine supports them', () => {
    if (!duplicateNamedGroupsSupported) {
      it('behave like String.prototype.replace', () => {
        pending('this engine does not implement ES2025 duplicate named capture groups');
      });
      return;
    }

    FLAG_SETS.forEach((flags) => {
      SCENARIOS.forEach((scenario) => {
        itReplacesLikeStringReplace(
          `handle ${scenario.name} (flags '${flags}')`,
          compile(scenario.rules),
          INPUTS,
          flags,
        );
      });
    });

    it('produce what the same rules produce with no name shared at all', () => {
      SCENARIOS.forEach((scenario) => {
        const shared = new UnionReplacer(compile(scenario.rules));
        const separate = new UnionReplacer(compile(uniquify(scenario.rules)));
        INPUTS.forEach((input) => {
          expect(shared.replace(input))
            .withContext(`${scenario.name}, input ${JSON.stringify(input)}`)
            .toBe(separate.replace(input));
        });
      });
    });

    it('hand each rule the shared name as a single value, never a collection', () => {
      const seen = [];
      const inspect = (ctx) => {
        seen.push(ctx.match.groups.v);
        expect(Array.isArray(ctx.match.groups.v)).toBe(false);
        return '';
      };
      new UnionReplacer([
        [re('(?<v>a)|(?<v>A)'), inspect, true],
        [re('(?<v>b)'), inspect, true],
      ]).replace('aAb');
      expect(seen).toEqual(['a', 'A', 'b']);
    });

    // Object.keys rather than a whole-object comparison: what is at stake is
    // which names are there at all, and a shared one appearing twice or a
    // sibling's undefined one going missing is easy to overlook otherwise.
    it('name a shared group once in the combined named groups object', () => {
      let keys = null;
      new UnionReplacer([
        [re('(?<v>a)|(?<v>A)'), (ctx) => { keys = Object.keys(ctx.match.groups); return ''; }, true],
        [re('(?<v>b)(?<w>c)'), 'x'],
      ]).replace('a');
      expect(keys).toEqual(['v', 'w']);
    });
  });

  // Reachable on any engine, so this path keeps being exercised even where
  // every engine to hand has grown the support.
  describe('where the engine does not support them', () => {
    it('make the combined regexp unbuildable', () => {
      withoutDuplicateNamedGroupSupport(() => {
        expect(() => new UnionReplacer(compile(SHARED_NAME_RULES)))
          .toThrowError(SyntaxError);
      });
    });

    it('leave rule sets with unique names working', () => {
      withoutDuplicateNamedGroupSupport(() => {
        const replacer = new UnionReplacer([[/(?<v>a)/, '<$<v>>'], [/(?<w>b)/, '[$<w>]']]);
        expect(replacer.replace('ab')).toBe('<a>[b]');
      });
    });

    // `(?<=a)` and `(?<!a)` open the same way a named group does. Reading them
    // as groups named `=a` and `!a` would be harmless until two rules used the
    // same assertion, and would then reject a perfectly fine rule set.
    it('do not make a lookbehind assertion look like a repeated name', () => {
      withoutDuplicateNamedGroupSupport(() => {
        const replacer = new UnionReplacer([
          [/(?<=x)(?<v>a)/, '<$<v>>'],
          [/(?<=x)(?<w>b)/, '[$<w>]'],
          [/(?<!q)(?<y>c)/, '{$<y>}'],
        ]);
        expect(replacer.replace('xaxbc')).toBe('x<a>x[b]{c}');
      });
    });

    it('do not disturb the pattern type check', () => {
      withoutDuplicateNamedGroupSupport(() => {
        expect(() => new UnionReplacer([['notaregexp', 'x']])).toThrowError(TypeError);
      });
    });

    it('are emulated only for as long as it takes', () => {
      const real = RegExp;
      withoutDuplicateNamedGroupSupport(() => {});
      expect(RegExp).toBe(real);
      expect(/x/.constructor).toBe(real);
    });
  });
});
