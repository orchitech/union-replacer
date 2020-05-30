import UnionReplacer = require('union-replacer');

new UnionReplacer([]);
new UnionReplacer(); // $ExpectError
new UnionReplacer([/foo/, 'bar']); // $ExpectError
new UnionReplacer([['foo', 'bar']]); // $ExpectError

new UnionReplacer([[/foo/, 'bar']]);
new UnionReplacer([[/foo/, 'bar', true]]); // $ExpectError
new UnionReplacer([[/foo/, 'bar', false]]); // $ExpectError

new UnionReplacer([[/foo/, (m: string, index: number): string => '']]);
new UnionReplacer([[/foo/, (m: string, index: number): number => 1]]); // $ExpectError
new UnionReplacer([[/foo/, (m: string): string => m, false]]);
new UnionReplacer([[/foo/, (m: string): string => m, true]]); // $ExpectError

new UnionReplacer([[/foo/, (ctx: UnionReplacer.MatchingContext): string => '', true]]);
new UnionReplacer([[/foo/, (ctx: UnionReplacer.MatchingContext): number => 1, true]]); // $ExpectError
new UnionReplacer([[/foo/, (ctx: UnionReplacer.MatchingContext): string => '', false]]); // $ExpectError

const replacer: UnionReplacer = new UnionReplacer([
  [/foo/, (m, index) => {
    m; // $ExpectType string
    return '';
  }],
  [/bar/, (ctx: UnionReplacer.MatchingContext) => {
    ctx; // $ExpectType MatchingContext
    ctx.match; // $ExpectType RegExpExecArray | null
    return '';
  }, true],
]);

replacer.replace('foobar'); // $ExpectType string

class MyBuilder implements UnionReplacer.ReplacementBuilder<number> {
  addSubjectSlice(subject: string, start: number, end: number) {}
  addReplacedString(string: string) {}
  build() { return 1; }
}
replacer.replace('foobar', {}, new MyBuilder()); // $ExpectType number
