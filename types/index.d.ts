// Generated type definitions for union-replacer 2.0.0-beta.2
// File created by tsd-jsdoc and scripts/tsd-postprocess.js.
// Do not modify directly.

export = UnionReplacer;
export as namespace UnionReplacer;

/**
 * <p>Create a UnionReplacer instance performing the specified replaces.</p>
 * @example
 * replacer = new UnionReplacer([[/\$foo\b/, 'bar'], [/\\(.)/, '$1']]);
 * @example
 * // Simple URI encoder
 * replacer = new UnionReplacer([
 *   [/ /, '+'],
 *   [/[^\w.,-]/, (m) => `%${m.charCodeAt(0).toString(16)}`],
 * ]);
 * @example
 * replacer = new UnionReplacer([[/\$foo\b/, 'bar'], [/\\(.)/, '$1']], 'gi');
 * @param replaces - <p>Replaces to be performed
 * specified as an array of {@link UnionReplacer.ReplaceTuple} array tuples.
 * The order of elements in <code>replaces</code> is important: if any pattern is matched,
 * the corresponding amount of input is consumed and subsequent patterns
 * will not match on such part of the input.</p>
 * @param [flags = gm] - <p>Flags for replacement, defaults to 'gm'.</p>
 */
declare class UnionReplacer {
    constructor(replaces: UnionReplacer.ReplaceTuple[], flags?: string);
    readonly flags: string;
    /**
     * <p>Build the underlying combined regular expression. This method has no effect
     * since v2.0, as the builder-like functionality has been removed and underlying
     * data structures are prepared in the constructor.</p>
     */
    compile(): void;
    /**
     * <p>Perform search and replace with the combined patterns and use corresponding
     * replacements for the particularly matched patterns.</p>
     * @param subject - <p>Input to search and process.</p>
     * @param [userCtx = {}] - <p>User-provided context to be passed as <code>this</code>
     * when calling replacement functions and as a parameter of the builder calls.</p>
     * @returns <p>New string with the matches replaced. Or any type when a
     * custom builder is provided.</p>
     */
    replace(subject: string, userCtx?: any): string;
    /**
     * <p>Perform search and replace with the combined patterns and use corresponding
     * replacements for the particularly matched patterns. Pass the resulting chunks
     * to an user-provided {@link UnionReplacer.ReplacementBuilder} instead of
     * concatenating them into one string.</p>
     * @example
     * replacer.replace('foo');
     * @param subject - <p>Input to search and process.</p>
     * @param userCtx - <p>User-provided context to be passed as <code>this</code> when
     * calling replacement functions and as a parameter of the builder calls.</p>
     * @param builder - <p>Collects and builds
     * the result from unmatched subject slices and replaced matches. A custom
     * builder allows for creating arbitrary structures based on matching or
     * streaming these chunks without building any output.</p>
     * @returns <p>Result built by the builder.</p>
     */
    replace<T>(subject: string, userCtx: any, builder: UnionReplacer.ReplacementBuilder<T>): T;
}

declare namespace UnionReplacer {
    /**
     * <p>Encapsulation of matcher variables.</p>
     */
    interface MatchingContext {
        /**
         * <p>The {@link UnionReplacer} instance being used.</p>
         */
        replacer: UnionReplacer;
        /**
         * <p>Last match, as returned by {@link RegExp#exec}.</p>
         */
        match: RegExpExecArray | null;
        /**
         * <p>Advance matching position <code>n</code> characters after the match end position.</p>
         * @param n - <p>Number of characters to skip. Zero and negative values
         * are valid, but introduce risk of infinite processing. It is then user
         * responsibility to prevent it.</p>
         */
        skip(n: number): void;
        /**
         * <p>Set matching position to <code>n</code> characters from match start.</p>
         * @param n - <p>Number of characters jump. Values less than or equal
         * to match length are valid, but introduce risk of infinite processing.
         * It is then user responsibility to prevent it.</p>
         */
        jump(n: number): void;
        /**
         * <p>Reset matching position according to standard regexp match position advancing.</p>
         */
        reset(): void;
        /**
         * <p>Determine whether the current match is at the input start.</p>
         * @returns <p><code>true</code> if current match is at input start, <code>false</code> otherwise.</p>
         */
        atStart(): boolean;
        /**
         * <p>Determine whether the current match is at the input end.</p>
         * @returns <p><code>true</code> if current match is at input end, <code>false</code> otherwise.</p>
         */
        atEnd(): boolean;
    }
    /**
     * <p>Replacement callback function, as <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_function_as_a_parameter">defined for <code>String.prototype.replace</code></a>.</p>
     */
    type StringReplaceCb = (substring: string, ...args: any[]) => string;
    /**
     * <p>Extended replacement callback function that provides more options during processing.</p>
     */
    type ExtendedReplaceCb = (ctx: UnionReplacer.MatchingContext) => string;
    /**
     * <p>Particular replace with ECMAScript string replacement.</p>
     * @property 0 - <p>Particular regexp to match.</p>
     * @property 1 - <p>Replacement string, as <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter">defined for <code>String.prototype.replace</code></a>.</p>
     */
    type ReplaceWithString = [RegExp, string];
    /**
     * <p>Particular replace with ECMAScript callback replacement.</p>
     * @property 0 - <p>Particular regexp to match.</p>
     * @property 1 - <p>Replacement callback, as <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_function_as_a_parameter">defined for <code>String.prototype.replace</code></a>.</p>
     */
    type ReplaceWithCb = [RegExp, UnionReplacer.StringReplaceCb];
    /**
     * <p>Particular replace with extended callback replacement (UnionReplacer specific).</p>
     * @property 0 - <p>Particular regexp to match.</p>
     * @property 1 - <p>Replacement callback accepting
     * {@link UnionReplacer.MatchingContext}.</p>
     * @property 2 - <p>Flag <code>true</code> marking the callback as {@link UnionReplacer.ExtendedReplaceCb}.</p>
     */
    type ReplaceWithExtendedCb = [RegExp, UnionReplacer.ExtendedReplaceCb, true];
    /**
     * <p>Particular replace with explicitly set ECMAScript callback replacement.
     * Leads to the same behavior as {@link UnionReplacer.ReplaceWithCb}.</p>
     * @property 0 - <p>Particular regexp to match.</p>
     * @property 1 - <p>Replacement callback accepting
     * {@link UnionReplacer.MatchingContext}.</p>
     * @property 2 - <p>Flag <code>false</code> marking the callback as {@link UnionReplacer.StringReplaceCb}.</p>
     */
    type ReplaceWithUnextendedCb = [RegExp, UnionReplacer.StringReplaceCb, false];
    /**
     * <p>Particular replace definition similiar to {@link String#replace} arguments specified
     * as an array (tuple) with the following items:</p>
     * <ol>
     * <li>RegExp to match. The flags are ignored.</li>
     * <li>Replacement string or function to be applied if the pattern matches.
     * Replacement strings:
     * <ul>
     * <li>Syntax is the same as for {@link String#replace}:
     * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter|Specifying a string as a parameter}</li>
     * <li>ES2018 named capture groups follow the proposal syntax <code>$&lt;name&gt;</code>.
     * Replacement function is by default the {@link String#replace}-style callback:</li>
     * <li>The same as for {@link String#replace}:
     * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_function_as_a_parameter|Specifying a function as a parameter}</li>
     * <li>If ES2018 named capture groups are used, their values are passed
     * as the last argument just like in the standard JavaScript replacements:
     * <code>(match, p1, ..., pn, offset, string, namedCaptures) =&gt; { ... }</code>.
     * Unlike numbered captures that are narrowed for the particular match,
     * this extra <code>namedCaptures</code> parameter would contain keys for all the named
     * capture groups within the replacer and the values of &quot;foreign&quot; named captures
     * would be always <code>undefined</code>.
     * Replacement callback can also be specified as <code>extended</code>. Then only one
     * parameter is passed, an instance of {@link UnionReplacer.MatchingContext}.
     * This variant is more powerful.</li>
     * </ul>
     * </li>
     * <li>Optional <code>extended</code> flag - if true, the {@link UnionReplacer.MatchingContext}
     * will be passed to the replacement function instead of {@link String#replace}-ish
     * parameters.</li>
     * </ol>
     */
    type ReplaceTuple = UnionReplacer.ReplaceWithString | UnionReplacer.ReplaceWithCb | UnionReplacer.ReplaceWithExtendedCb | UnionReplacer.ReplaceWithUnextendedCb;
    /**
     * <p>Interface for processors of string chunks during replacement process.</p>
     */
    interface ReplacementBuilder<T> {
        /**
         * <p>Process unmatched slice of the input string.</p>
         * @example
         * builder.addSubjectSlice('example', 1, 2);
         * @param subject - <p>String to be processed.</p>
         * @param start - <p>Zero-based index at which to begin extraction.</p>
         * @param end - <p>Zero-based index before which to end extraction.
         * The character at this index will not be included.</p>
         */
        addSubjectSlice(subject: string, start: number, end: number): void;
        /**
         * <p>Process replaced match.</p>
         * @example
         * builder.addReplacedString('example');
         * @param string - <p>String to be processed.</p>
         */
        addReplacedString(string: string): void;
        /**
         * <p>Build output to be returned by {@link UnionReplacer#replace(2)}.</p>
         * @example
         * const x = builder.build();
         * @returns <p>Output to be returned by {@link UnionReplacer#replace(2)}.</p>
         */
        build(): T;
    }
}
