/*! UnionReplacer 1.0 | orchi.tech | (c) 2019 Orchitech Solutions, s.r.o. | MIT License */

/**
 * UnionReplacer provides a simple and easy-to-use alternative for more complex lexers.
 * From the user perspective, it's just a natural extension of {@link String#replace}
 * functionality. The processing is driven by a single native regular expression
 * combined from user-supplied patterns, which makes it very efficient.
 */

import UnionReplacerElement from './UnionReplacerElement';
import ReplacementStringBuilder from './ReplacementStringBuilder';
import MatchingContext from './MatchingContext';

// Sum number of capture groups within the provided elements
const countCaptureGroups = (elements) => elements
  .reduce((num, element) => num + element.captureCount, 0);

// Performance-critical
const findMatchingElementEs6 = (elements, fullMatch) => elements
  .find((element) => fullMatch[element.captureNum] !== undefined);
// ...but avoid polyfill
const findMatchingElementEs5 = (elements, fullMatch) => {
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (fullMatch[element.captureNum] !== undefined) {
      return element;
    }
  }
  return undefined;
};
const findMatchingElement = Array.prototype.find
  ? findMatchingElementEs6
  : findMatchingElementEs5;

function compile() {
  this.totalCaptureGroups = countCaptureGroups(this.elements);
  const regexpStr = this.elements.length > 0
    ? this.elements.map((element) => element.capturePatternStr).join('|')
    : '^[^\\s\\S]';
  this.regexp = new RegExp(regexpStr, this.flags);
}

/**
 * Class encapsulating several {@link String#replace}-like replacements
 * combined into a single one-pass text processor.
 */
class UnionReplacer {
  /**
   * Create a UnionReplacer instance performing the specified replaces.
   *
   * @param {Array<UnionReplacer.ReplaceTuple>} replaces - Replaces to be performed
   *   specified as an array of {@link UnionReplacer.ReplaceTuple} array tuples.
   *   The order of elements in `replaces` is important: if any pattern is matched,
   *   the corresponding amount of input is consumed and subsequent patterns
   *   will not match on such part of the input.
   * @param {string} [flags=gm] - Flags for replacement, defaults to 'gm'.
   * @throws {SyntaxError} Invalid regular expression pattern encountered. This
   *   currently occurs when named capture groups of the same name are supplied
   *   in different replacement patterns.
   * @throws {SyntaxError} Octal escapes are not allowed in patterns.
   * @see {@link https://github.com/orchitech/union-replacer/blob/master/README.md#alternation-semantics|Alternation semantics}
   * @example replacer = new UnionReplacer([[/\$foo\b/, 'bar'], [/\\(.)/, '$1']]);
   * @example
   * // Simple URI encoder
   * replacer = new UnionReplacer([
   *   [/ /, '+'],
   *   [/[^\w.,-]/, (m) => `%${m.charCodeAt(0).toString(16)}`],
   * ]);
   * @example replacer = new UnionReplacer([[/\$foo\b/, 'bar'], [/\\(.)/, '$1']], 'gi');
   * @see RegExp#flags
   */
  constructor(replaces, flags = 'gm') {
    /**
     * @readonly
     * @type {string}
     */
    this.flags = flags;
    /** @private */
    this.elements = [];
    replaces.forEach((replace) => {
      const element = new UnionReplacerElement(...replace);
      element.compile(countCaptureGroups(this.elements) + 1);
      this.elements.push(element);
    });
    compile.call(this);
  }

  /**
   * Build the underlying combined regular expression. This method has no effect
   * since v2.0, as the builder-like functionality has been removed and underlying
   * data structures are prepared in the constructor.
   *
   * @deprecated Since v2.0.
   */
  // eslint-disable-next-line class-methods-use-this
  compile() {
  }

  /**
   * Perform search and replace with the combined patterns and use corresponding
   * replacements for the particularly matched patterns.
   *
   * @method UnionReplacer#replace
   * @variation 1
   * @param {string} subject - Input to search and process.
   * @param {object} [userCtx={}] - User-provided context to be passed as `this`
   *   when calling replacement functions and as a parameter of the builder calls.
   * @returns {string} New string with the matches replaced. Or any type when a
   *   custom builder is provided.
   */

  /**
   * Perform search and replace with the combined patterns and use corresponding
   * replacements for the particularly matched patterns. Pass the resulting chunks
   * to an user-provided {@link UnionReplacer.ReplacementBuilder} instead of
   * concatenating them into one string.
   *
   * @variation 2
   * @template T
   * @param {string} subject - Input to search and process.
   * @param {object} userCtx - User-provided context to be passed as `this` when
   *   calling replacement functions and as a parameter of the builder calls.
   * @param {UnionReplacer.ReplacementBuilder<T>} builder - Collects and builds
   *   the result from unmatched subject slices and replaced matches. A custom
   *   builder allows for creating arbitrary structures based on matching or
   *   streaming these chunks without building any output.
   * @returns {T} Result built by the builder.
   * @example replacer.replace('foo');
   */
  replace(subject, userCtx = {}, builder = new ReplacementStringBuilder()) {
    const ctx = new MatchingContext(this);
    // Allow for reentrancy
    const savedLastIndex = this.regexp.lastIndex;
    try {
      this.regexp.lastIndex = 0;
      let prevLastIndex = 0;
      while ((ctx.match = this.regexp.exec(subject)) !== null) {
        const element = findMatchingElement(this.elements, ctx.match);
        element.narrowMatch(ctx, this.totalCaptureGroups);
        ctx.reset();
        builder.addSubjectSlice(subject, prevLastIndex, ctx.match.index, ctx, userCtx);
        const replaced = element.replacementFn.call(userCtx, ctx);
        builder.addReplacedString(replaced, ctx, userCtx);
        prevLastIndex = Math.min(ctx.match.index + ctx.match[0].length, ctx.lastIndex);
        // Also would solve eventual reentrant calls, but needed anyway
        this.regexp.lastIndex = ctx.lastIndex;
        if (!this.regexp.global) {
          break;
        }
      }
      builder.addSubjectSlice(subject, prevLastIndex, subject.length, ctx, userCtx);
      return builder.build();
    } finally {
      this.regexp.lastIndex = savedLastIndex;
    }
  }
}

export default UnionReplacer;
