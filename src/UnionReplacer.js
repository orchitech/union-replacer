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

/**
 * Class encapsulating several {@link String#replace}-like replacements
 * combined into a single one-pass text processor.
 */
class UnionReplacer {
  /**
   * @typedef {Array.<(RegExp|string|Function|boolean)>} Replace
   * Replacement definition (similiar to {@link String#replace} arguments) with following items:
   * - {RegExp} pattern - RegExp to match. The flags are ignored.
   * - {(string|Function)} replacement - Replacement string or function to be
   *   applied if the pattern matches.
   *   Replacement strings:
   *     - Syntax is the same as for {@link String#replace}:
   *       {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter|Specifying a string as a parameter}
   *     - ES2018 named capture groups follow the proposal syntax `$<name>`.
   *   Replacement function is by default the {@link String#replace}-style function:
   *     - The same as for {@link String#replace}:
   *       {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_function_as_a_parameter|Specifying a function as a parameter}
   *     - If ES2018 named capture groups are used, their values are passed
   *       as the last argument just like in the standard JavaScript replacements:
   *       `(match, p1, ..., pn, offset, string, namedCaptures) => { ... }`.
   *       Unlike numbered captures that are narrowed for the particular match,
   *       this extra `namedCaptures` parameter would contain keys for all the named
   *       capture groups within the replacer and the values of "foreign" named captures
   *       would be always `undefined`.
   *   Replacement function can also be specified as `extended`. Then only one parameter is
   *   passed, an instance of {@link MatchingContext}. This variant is more powerful.
   * - {boolean} [extend] - If truthy, the {@link MatchingContext} will be passed
   *   to the replacement function instead of {@link String#replace}-ish parameters.
   */

  /**
   * Create a union replacer and optionally initialize it with set of replace elements.
   *
   * @param {Replace[]} replaces - Initial replaces, can be omitted in favorof `flagsArg`.
   * Appends a match and replace entry to this replacer. The order of elements in `replaces`
   * is important: if any pattern is matched, the corresponding amount of input
   * is consumed and subsequent patterns will not match on such part of the input.
   * @throws {SyntaxError} Octal escapes are not allowed in patterns.
   * @throws Will throw an error if the replacer is frozen, i.e. Compiled.
   * @see {@link https://github.com/orchitech/union-replacer/blob/master/README.md#alternation-semantics|Alternation semantics}
   * @param {string} flags - Flags for replacement, defaults to 'gm'.
   * @example replacer = new UnionReplacer([[/\$foo\b/, 'bar'], [/\\(.)/, '$1']], 'gi');
   * @example replacer = new UnionReplacer([[/\$foo\b/, 'bar'], [/\\(.)/, '$1']]);
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
    /** @private */
    this.compiled = false;
    replaces.forEach((replace) => {
      const element = new UnionReplacerElement(...replace);
      element.compile(countCaptureGroups(this.elements) + 1);
      this.elements.push(element);
    });
  }

  /**
   * Process the configured replaces and prepare internal data structures.
   * It is not needed to call this method explicitly as it is done automatically
   * on first use on of the replacer.
   * Calling this method makes sense to validate the replacer's pattern set
   * and to fail early eventually.
   * Currently it causes the replacements to be frozen.
   * Forward compatibility:
   * - Freezing the replacements is not guaranteed behavior in the future.
   * - If string-supplied regular expression patterns were allowed, it would also
   *   allow invalid patterns to be supplied. Some sort of regexp syntax errors would
   *   be detected when building the replacer and other would be detected at the #compile time.
   *
   * @throws {SyntaxError} Invalid regular expression pattern encountered. This
   *   currently occurs when named capture groups of the same name are supplied
   *   in different replacement patterns.
   *
   * @example compile();
   */
  compile() {
    this.totalCaptureGroups = countCaptureGroups(this.elements);
    const regexpStr = this.elements.length > 0
      ? this.elements.map((element) => element.capturePatternStr).join('|')
      : '^[^\\s\\S]';
    this.regexp = new RegExp(regexpStr, this.flags);
    this.compiled = true;
  }

  /**
   * Perform search and replace with the combined patterns and use corresponding
   * replacements for the particularly matched patterns.
   *
   * @param {string} subject - Input to search and process.
   * @param {object} [userCtx={}] - User-provided context to be passed as `this` when
   *   calling replacement functions and as a parameter of the builder calls.
   * @param {object} [builder=new ReplacementStringBuilder()] - Collects and builds
   *   the result from unmatched subject slices and replaced matches. A custom
   *   builder allows for creating arbitrary structures based on matching or
   *   streaming these chunks without building any output.
   * @returns {string|*} New string with the matches replaced. Or any type when a
   *   custom builder is provided.
   *
   * @example replacer.replace('x');
   */
  replace(subject, userCtx = {}, builder = new ReplacementStringBuilder()) {
    this.compiled || this.compile();
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
