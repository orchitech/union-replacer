/**
 * Replacement callback function, as [defined for `String.prototype.replace`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_function_as_a_parameter).
 *
 * @callback UnionReplacer.StringReplaceCb
 * @param {string} substring
 * @param {...*} args
 * @returns {string}
 */

/**
 * Extended replacement callback function that provides more options during processing.
 *
 * @callback UnionReplacer.ExtendedReplaceCb
 * @param {UnionReplacer.MatchingContext} ctx
 * @returns {string}
 */

/**
 * Particular replace with ECMAScript string replacement.
 *
 * @typedef UnionReplacer.ReplaceWithString
 * @type {Array<RegExp|string>}
 * @property {RegExp} 0 - Particular regexp to match.
 * @property {string} 1 - Replacement string, as [defined for `String.prototype.replace`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter).
 */

/**
 * Particular replace with ECMAScript callback replacement.
 *
 * @typedef UnionReplacer.ReplaceWithCb
 * @type {Array<RegExp|UnionReplacer.StringReplaceCb>}
 * @property {RegExp} 0 - Particular regexp to match.
 * @property {UnionReplacer.StringReplaceCb} 1 - Replacement callback, as [defined for `String.prototype.replace`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_function_as_a_parameter).
 */

/**
 * Particular replace with extended callback replacement (UnionReplacer specific).
 *
 * @typedef UnionReplacer.ReplaceWithExtendedCb
 * @type {Array<RegExp|UnionReplacer.ExtendedReplaceCb|true>}
 * @property {RegExp} 0 - Particular regexp to match.
 * @property {UnionReplacer.ExtendedReplaceCb} 1 - Replacement callback accepting
 *   {@link UnionReplacer.MatchingContext}.
 * @property {true} 2 - Flag `true` marking the callback as {@link UnionReplacer.ExtendedReplaceCb}.
 */

/**
 * Particular replace with explicitly set ECMAScript callback replacement.
 * Leads to the same behavior as {@link UnionReplacer.ReplaceWithCb}.
 *
 * @typedef UnionReplacer.ReplaceWithUnextendedCb
 * @type {Array<RegExp|UnionReplacer.StringReplaceCb|false>}
 * @property {RegExp} 0 - Particular regexp to match.
 * @property {UnionReplacer.StringReplaceCb} 1 - Replacement callback accepting
 *   {@link UnionReplacer.MatchingContext}.
 * @property {false} 2 - Flag `false` marking the callback as {@link UnionReplacer.StringReplaceCb}.
 */

/**
 * Particular replace definition similiar to {@link String#replace} arguments specified
 * as an array (tuple) with the following items:
 * 1. RegExp to match. The flags are ignored.
 * 2. Replacement string or function to be applied if the pattern matches.
 *    Replacement strings:
 *      - Syntax is the same as for {@link String#replace}:
 *        {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter|Specifying a string as a parameter}
 *      - ES2018 named capture groups follow the proposal syntax `$<name>`.
 *    Replacement function is by default the {@link String#replace}-style callback:
 *      - The same as for {@link String#replace}:
 *        {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_function_as_a_parameter|Specifying a function as a parameter}
 *      - If ES2018 named capture groups are used, their values are passed
 *        as the last argument just like in the standard JavaScript replacements:
 *        `(match, p1, ..., pn, offset, string, namedCaptures) => { ... }`.
 *        Unlike numbered captures that are narrowed for the particular match,
 *        this extra `namedCaptures` parameter would contain keys for all the named
 *        capture groups within the replacer and the values of "foreign" named captures
 *        would be always `undefined`.
 *    Replacement callback can also be specified as `extended`. Then only one
 *    parameter is passed, an instance of {@link UnionReplacer.MatchingContext}.
 *    This variant is more powerful.
 * 3. Optional `extended` flag - if true, the {@link UnionReplacer.MatchingContext}
 *    will be passed to the replacement function instead of {@link String#replace}-ish
 *    parameters.
 *
 * @typedef UnionReplacer.ReplaceTuple
 * @type {UnionReplacer.ReplaceWithString|
 *   UnionReplacer.ReplaceWithCb|
 *   UnionReplacer.ReplaceWithExtendedCb|
 *   UnionReplacer.ReplaceWithUnextendedCb}
 */

/**
 * Interface for processors of string chunks during replacement process.
 *
 * @interface UnionReplacer.ReplacementBuilder
 * @template T
 */

/**
 * Process unmatched slice of the input string.
 *
 * @method UnionReplacer.ReplacementBuilder#addSubjectSlice
 * @param {string} subject - String to be processed.
 * @param {number} start - Zero-based index at which to begin extraction.
 * @param {number} end - Zero-based index before which to end extraction.
 * The character at this index will not be included.
 * @example builder.addSubjectSlice('example', 1, 2);
 */

/**
 * Process replaced match.
 *
 * @method UnionReplacer.ReplacementBuilder#addReplacedString
 * @param {string} string - String to be processed.
 * @example builder.addReplacedString('example');
 */

/**
 * Build output to be returned by {@link UnionReplacer#replace(2)}.
 *
 * @method UnionReplacer.ReplacementBuilder#build
 * @returns {T} Output to be returned by {@link UnionReplacer#replace(2)}.
 * @example const x = builder.build();
 */
