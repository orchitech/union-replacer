const UnionReplacer = require('../dist/union-replacer.cjs');

const RULES = [
  [/function(withGroup)/, (match, group) => `matched ${group}`],
  [/anotherfunc(foo)(?<named>bar)/, (...args) => {
    if (args.length !== 6
      || args[0] !== 'anotherfuncfoobar'
      || args[1] !== 'foo'
      || args[2] !== 'bar'
      || args[3] !== 0
      || args[4] !== 'anotherfuncfoobar'
      || typeof (args[5]) !== 'object'
      || args[5].named !== 'bar') {
      return `Replacement function received incorrect arguments: ${args.toString()}`;
    }
    return 'ok';
  }],
  [/1cd/, 'c$`'], // these two will be replaced to abc*,
  [/2cd/, "c$'"], // which will not be matched by the following rule
  [/abc/, 'bar'],
  [/(def)/, '$1 $2 $<foo>'],
  [/(#{1,6})/, '\\$1'],
  [/(={1,6})-\1/, '\\$1'],
  [/(?<foo1>named)/, '$<foo1>capture> groups'],
  [/(?<foo2>)empty/, '($<foo2>) was empty'],
  [/(?:noncapture) (groups)/, '$1 are allowed'],
  [/(lookahead)(?!foo)/, '$1 is allowed'],
  [/(?<=so is )(lookbehind)/, '$1 allowed'],
  [/^$/, 'empty string'],
  [/(multiple) (groups)/, '$2 $1 $$1 $&'],
  [/^(\d+)\.(?=\s)/, '$1\\.'],
];

const CASES = [
  ['functionwithGroup', 'matched withGroup'],
  ['anotherfuncfoobar', 'ok'],
  ['ab1cdef', 'abcabef'], // would be 'barabef' if rules were sequential
  ['ab2cdef', 'abcefef'], // would be 'barefef' if rules were sequential
  ['abc', 'bar'],
  ['def', 'def $2 $<foo>'],
  ['##', '\\##'],
  ['==-==', '\\=='],
  ['named', 'namedcapture> groups'],
  ['empty', '() was empty'],
  ['lookahead', 'lookahead is allowed'],
  ['noncapture groups', 'groups are allowed'],
  ['so is lookbehind', 'so is lookbehind allowed'],
  ['', 'empty string'],
  ['multiple groups', 'groups multiple $1 multiple groups'],
  ['1. before 2. item\n2. after 1. item', '1\\. before 2. item\n2\\. after 1. item'],
];

const FAILS = [
  [[/(ab)\2/, 'Unmatched backreference']],
  [[/\123/, 'Octals are not allowed']],
];

describe('UnionReplacer.js', () => {
  CASES.forEach((value) => {
    it(`should produce '${value[1]}' for '${value[0]}'`, () => {
      const replacer = new UnionReplacer(RULES);
      expect(replacer.replace(value[0])).toBe(value[1]);
    });
  });

  FAILS.forEach((value) => {
    it(`should fail for '${value}'`, () => {
      expect(() => {
        const replacer = new UnionReplacer(value);
        replacer.replace('');
      }).toThrowError(SyntaxError);
    });
  });

  // Temporarily disabled, pending its own separate work.
  //
  // Rules are joined into one alternation, so a capture group name reused by
  // two of them yields `(?<foo>...)|(?<foo>...)`. That used to be a SyntaxError
  // in every engine, which is what this asserted. ES2025 made the pattern legal
  // and V8 has shipped it, so on a current engine the combined regexp now
  // builds and nothing throws.
  //
  // Whether the library should support such rule sets, keep rejecting them, or
  // reject them only where the engine cannot cope is being decided separately,
  // along with the tests that will take this spec's place.
  xit('should fail for rules sharing a named capture group', () => {
    expect(() => {
      const replacer = new UnionReplacer([
        [/(?<foo>foo)/, 'Multiple named capture groups'],
        [/(?<foo>foo)/, 'with the same name are not allowed'],
      ]);
      replacer.replace('');
    }).toThrowError(SyntaxError);
  });

  it('passes through the input when no replaces are set', () => {
    const replacer = new UnionReplacer([], 'g');
    expect(replacer.replace('foo')).toBe('foo');
  });
});
