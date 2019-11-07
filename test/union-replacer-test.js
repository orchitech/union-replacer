UnionReplacer = require("../src/UnionReplacer")

function tests() {
  let replaces = [
    [/function(withGroup)/, (match, group) => {return `matched ${group}`}],
    [/anotherfunc(foo)(?<named>bar)/, (...args) => {
      if (args.length !== 6 || 
          args[0] !== 'anotherfuncfoobar' || 
          args[1] !== 'foo' || 
          args[2] !== 'bar' || 
          args[3] !== 0 || 
          args[4] !== 'anotherfuncfoobar' || 
          typeof (args[5]) !== 'object' ||
          args[5].named !== 'bar') {
        return `Replacement function received incorrect arguments: ${args}`
      } else {
        return "ok"
      }
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
  ]

  let replacer = new UnionReplacer(replaces);
  let cases = [
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

  let fails = [
    [[/(ab)\2/, "Unmatched backreference"]],
    [[/\123/, "Octals are not allowed"]],
    [
      [/(?<foo>foo)/, 'Multiple named capture groups'],
      [/(?<foo>foo)/, 'with the same name are not allowed']
    ]
  ]

  let passed = 0;
  cases.forEach(([input, output]) => {
    replaced = replacer.replace(input);
    if (replaced !== output) {
      console.log(`Replaced '${input}' to '${replaced}', expected '${output}'`);
    } else {
      passed++;
    }
  });

  fails.forEach(fail => {
    var failed = false;
    try {
      const replacer = new UnionReplacer(fail)
      replacer.replace("")
    } catch (error) {
      failed = true
    }
    if (failed) {
      passed++
    } else {
      console.log(`Error expected using ${fail} rules`);
    }
  });

  console.log(`Passed ${passed} of ${cases.length + fails.length} tests.`)
}

tests();
