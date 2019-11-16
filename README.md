# UnionReplacer

UnionReplacer provides one-pass global search and replace functionality
using multiple regular expressions and corresponging replacements.
Otherwise the behavior matches `String.prototype.replace(regexp, newSubstr|function)`.

## Outline

### Installation and usage

In browsers:
```html
<script src="https://unpkg.com/union-replacer/dist/union-replacer.umd.js" />
```

Using [npm](https://www.npmjs.com/):
```bash
npm install union-replacer
```

In [Node.js](http://nodejs.org/):
```js
const UnionReplacer = require('union-replacer');
```

### Synopsis

```
replacer = new UnionReplacer([replace_pairs])
replacer.addReplacement(regexp, newSubstr|function)
newStr = replacer.replace(str)
```

### Parameters

- `replace_pairs`: array of `[regexp, replacement]` arrays, a shorthand for multiple calls of `UnionReplacer.prototype.addReplacement()`
- `function`: see [Specifying a function as a parameter
](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_function_as_a_parameter)
- `newSubstr`: see [Specifying a string as a parameter
](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter)

## Examples

### Convenient one-pass escaping of HTML special chars
```js
const htmlEscapes = [
  [/</, '&lt;'],
  [/>/, '&gt;'],
  [/"/, '&quot;'],

  // not affected by the previous replacements producing '&'
  [/&/, '&amp;']
];
const htmlEscaper = new UnionReplacer(htmlEscapes);
const toBeHtmlEscaped = '<script>alert("inject & control")</script>';
console.log(htmlEscaper.replace(toBeHtmlEscaped));
```
Output:
```
&lt;script&gt;alert(&quot;inject &amp; control&quot;)&lt;/script&gt;
```

### Simple Markdown highlighter

Highlighting Markdown special characters while preserving code blocks and spans.
Only a subset of Markdown syntax is supported for simplicity.
~~~js
const mdHighlighter = new UnionReplacer([

  // opening fence = at least three backticks
  // closing fence = opening fence or longer
  // regexp backreferences are ideal to match this
  [/^(`{3,}).*\n([\s\S]*?)(^\1`*\s*?$|\Z)/, (match, fence1, pre, fence2) => {
    let block = `<b>${fence1}</b><br />\n`
    block += `<pre>${htmlEscaper.replace(pre)}</pre><br />\n`
    block += `<b>${fence2}</b>`
    return block;
  }],

  // Code spans are delimited by two same-length backtick strings.
  // Note that backreferences within the regexp are numbered as usual,
  // i.e. \1 still means first capturing group.
  // Union replacer renumbers them when composing the final internal regexp.
  [/(^|[^`])(`+)(?!`)(.*?[^`]\2)(?!`)/, (match, lead, delim, code) => {
    return `${htmlEscaper.replace(lead)}<code>${htmlEscaper.replace(code)}</code>`
  }],

  // Subsequent replaces are performed only outside code blocks and spans.
  [/[*~=+_-`]+/, '<b>$&</b>'],
  [/\n/, '<br />\n']

// HTML entity-like strings would be interpreted too
].concat(htmlEscapes));

const toBeMarkdownHighlighted = '\
**Markdown** code to be "highlighted"\n\
with special care to fenced code blocks:\n\
````\n\
_Markdown_ within fenced code blocks is not *processed*:\n\
```\n\
Even embedded "fence strings" work well with **UnionEscaper**\n\
```\n\
````\n\
*CommonMark is sweet & cool.*';

console.log(mdHighlighter.replace(toBeMarkdownHighlighted));
~~~
Produces:
~~~
<b>**</b>Markdown<b>**</b> code to be &quot;highlighted&quot;<br />
with special care to fenced code blocks:<br />
<b>````</b><br />
<pre>_Markdown_ within fenced code blocks is not *processed*:
```
Even embedded &quot;fence strings&quot; work well with **UnionEscaper**
```
</pre><br />
<b>````</b><br />
<b>*</b>CommonMark is sweet &amp; cool.<b>*</b>
~~~

### Conservative markdown escaping

The code below escapes text, so that special Markdown sequences are
protected from interpreting. Two considerations are applied:
1. Avoid messing the output with too many unnecessary escapings.
2. GFM autolinks are a special case, as escaping the special chars in them
   would cripple the result of rendering. We need to detect them and keep
   them untouched.

```js
const mdEscaper = new UnionReplacer([

  // Keep urls untouched (simplified for demonstration purposes).
  // The same should apply for GFM email autolinks.
  [/\bhttps?:\/\/(?!\.)(?:\.?[\w-]+)+(?:[^\s<]*?)(?=[?!.,:*~]*(?:\s|$))/, '$&'],

  // global backslash escapes
  [/[\\*_[\]`&<>]/, '\\$&'],

  // backslash-escape at line start
  [/^(?:~~~|=+)/, '\\$&'],

  // strike-through w/o lookbehinds
  [/~+/, m => m.length == 2 ? `\\${m}` : m],

  // backslash-escape at line start if followed by space
  [/^(?:[-+]|#{1,6})(?=\s)/, '\\$&'],

  // backslash-escape the dot to supress ordered list
  [/^(\d+)\.(?=\s)/, '$1\\. ']
]);

const toBeMarkdownEscaped = '\
A five-*starred* escaper:\n\
1. Would preserve _underscored_ in the http://example.com/_underscored_/ URL.\n\
2. Would also preserve backspaces (\\) in http://example.com/\\_underscored\\_/.';

console.log(mdEscaper.replace(toBeMarkdownEscaped));
```
Produces:
```
A five-\*starred\* escaper:
1\.  Would preserve \_underscored\_ in the http://example.com/_underscored_/ URL.
2\.  Would also preserve backspaces (\\) in http://example.com/\_underscored\_/.
```

## Background

The library has been created to support complex text processing in situations
when certain configurability is desired.
The initial need occured when using the [Turndown](https://github.com/domchristie/turndown)
project. It is a an excellent and flexible tool, but we faced several hard-to-solve
difficulties with escaping special sequences.

### Without `UnionReplacer`

When text processing with several patterns is required, there are two approaches:
1. Iterative processing of the full text, such as
   ```js
   // No UnionEscaper
   return unsafe
     .replace(/&/g, '&amp;')
     .replace(/</g, '&lt;')
     .replace(/>/g, '&gt;')
     .replace(/"/g, '&quot;')
   ```
   The issue is not only the performance. Since the subsequent replacements are
   performed on a partially-processed result, the developer has to ensure that
   no intermediate steps affect the processing. E.g.:
   ```js
   // No UnionEscaper
   return 'a "tricky" task'
     .replace(/"/g, '&quot;')
     .replace(/&/g, '&amp;')
   // desired: 'a &quot;tricky&quot; task'
   // actual: 'a &amp;quot;tricky&amp;quot; task'
   ```
   So _'a "tricky" task'_ became _'a &amp;quot;tricky&amp;quot; task'_. This
   particular task is manageable with carefuly choosing the processing order.
   But when the processing is context-dependent, iterative processing becomes
   impossible.
2. One-pass processing using regexp with alternations, which is correct, but
   it might easily become overly complex, hard to read and hard to manage. As
   one can see, the result seems pretty static and very fragile in terms of
   keeping track of all the individual capture groups:
   ```js
   // No UnionEscaper
   const mdHighlightRe = /(^(`{3,}).*\n([\s\S]*?)(^\2`*\s*?$|\Z))|((^|[^`])(`+)(?!`)(.*?[^`]\7)(?!`))|([*~=+_-`]+)|(\n)|(<)|(>)|(")|(&)/gm
   return md.replace(mdHighlightRe,
     (match, fenced, fence1, pre, fence2, codespan, lead, delim, code, special, nl, lt, gt, quot, amp) => {
       if (fenced) {
         let block = `<b>${fence1}</b><br />\n`
         block += `<pre>${htmlEscaper.replace(pre)}</pre><br />\n`
         block += `<b>${fence2}</b>`
         return block;
       } else if (codespan) {
         return `${myHtmlEscape(lead)}<code>${myHtmlEscape.replace(code)}</code>`
       } else if (special) {
         return `<b>${special}</b>`
       } else if (nl) {
         return '<br />\n'
       } // else etc.
     });
     ```

### Introducing `UnionReplacer`

Iterative processing is simple and well-readable, though it is very limited.
Developers are often trading simplicity for bugs. 

While regexp with alternations is the way to go, we wanted to provide an easy
way to build it, use it and even allow its variable composition in runtime.

Instead of using a single long regular regexp, developers can use an array
of individual smaller regexps, which will be merged together by the
`UnionReplacer` class. Its usage is as simple as in the iterative processing
approach.

## Features

- Fast. The processing is one-pass and native regexps are used. There might
  be a tiny resource penalty when initially constructing the internal
  compound regexp.
- Supports regexp backreferences. Backreferences in the compound regexp are
  renumbered, so that the user does not have to care about it.
- Supports also ES2018 named capture group. See limitations.
- You can reuse everything used with `String.prototype.replace()`, namely:
  - String replacements work the very same.
  - Function replacements work the same with just a subtle difference for
    ES2018 named capture groups.
- Standard regexp alternation semantics. The first replace that matches
  consumes the match from input, no matter how long the match is. An example
  follows.

### Alternation semantics

```js
// The order of replaces is important
const replacer1 = new UnionReplacer([
  [/foo/, '(FOO)'],    // when foo is matched, subsequent parts are not examined
  [/.+/, '(nonfoo)'] // no mather that this also matches foo
]);
// replacer1 still eats the rest of the inputwhen foo is not matched
const replacer2 = new UnionReplacer([
  [/foo/, '(FOO)'],
  [/.+?(?=foo|$)/, '(nonfoo)'] // non-greedy match up to next foo or line end
]);
const text = 'foobarfoobaz'
replacer1.replace(text); // (FOO)(nonfoo)
replacer2.replace(text); // (FOO)(nonfoo)(FOO)(nonfoo)
```

### Performance

Most important, the code is compact, slightly over 100 lines.

In runtime, `UnionReplacer` performs one-pass processing driven by
a single native regexp.
The replacements are always done as an arrow function internally, even for
string replacements. The eventual performance impact of this would be
engine-dependent.

Feel free to benchmark the library and please share the results.

## Limitations

### Named capture groups

ES2018 named capture groups work with the following limitations:
- Replacement functions are always provided with all the named captures, i.e. not limited to the matched rule.
- Capture group names must be unique amongst all capture rules.

### Octal escapes

Not supported. The syntax is the same as backreferences (`\1`) and
their interpretation is input-dependent even in native regexps.
It is better to avoid them completely and use hex escapes instead (`\xNN`).

### Regexp flags

Any flags in paticular search regexps are ignored.
The resulting replacement is always global (`g`) and multiline (`m`).
