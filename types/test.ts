import UnionReplacer = require('union-replacer');

/**
 * Compile-time assertion that `value` is of exactly the expected type.
 * Usage: `expectType<string>()(someValue)`.
 */
type Exact<Expected, Actual> =
  (<T>() => T extends Expected ? 1 : 2) extends (<T>() => T extends Actual ? 1 : 2)
    ? unknown
    : never;
const expectType = <Expected>() => <Actual>(
  value: Actual & Exact<Expected, Actual>,
): void => { void value; };

new UnionReplacer([]);
// @ts-expect-error - replaces are mandatory
new UnionReplacer();
// @ts-expect-error - a single tuple is not an array of tuples
new UnionReplacer([/foo/, 'bar']);
// @ts-expect-error - patterns must be regular expressions
new UnionReplacer([['foo', 'bar']]);

new UnionReplacer([[/foo/, 'bar']]);
// @ts-expect-error - string replacements cannot be extended
new UnionReplacer([[/foo/, 'bar', true]]);
// @ts-expect-error - string replacements take no extended flag at all
new UnionReplacer([[/foo/, 'bar', false]]);

new UnionReplacer([[/foo/, (m: string, index: number): string => '']]);
// @ts-expect-error - replacement functions must return a string
new UnionReplacer([[/foo/, (m: string, index: number): number => 1]]);
new UnionReplacer([[/foo/, (m: string): string => m, false]]);
// @ts-expect-error - extended replacements receive a MatchingContext
new UnionReplacer([[/foo/, (m: string): string => m, true]]);

new UnionReplacer([[/foo/, (ctx: UnionReplacer.MatchingContext): string => '', true]]);
// @ts-expect-error - replacement functions must return a string
new UnionReplacer([[/foo/, (ctx: UnionReplacer.MatchingContext): number => 1, true]]);
// @ts-expect-error - non-extended replacements receive the match, not a MatchingContext
new UnionReplacer([[/foo/, (ctx: UnionReplacer.MatchingContext): string => '', false]]);

const replacer: UnionReplacer = new UnionReplacer([
  [/foo/, (m, index) => {
    expectType<string>()(m);
    return '';
  }],
  [/bar/, (ctx: UnionReplacer.MatchingContext) => {
    expectType<UnionReplacer.MatchingContext>()(ctx);
    expectType<RegExpExecArray | null>()(ctx.match);
    return '';
  }, true],
]);

expectType<string>()(replacer.replace('foobar'));

class MyBuilder implements UnionReplacer.ReplacementBuilder<number> {
  addSubjectSlice(subject: string, start: number, end: number) {}
  addReplacedString(string: string) {}
  build() { return 1; }
}
expectType<number>()(replacer.replace('foobar', {}, new MyBuilder()));
