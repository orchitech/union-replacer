/*! UnionReplacer 1.0 | orchi.tech | (c) 2019 Orchitech Solutions, s.r.o. | MIT License */

/**
 * UnionReplacer provides a simple and easy-to-use alternative for more complex lexers.
 * From the user perspective, it's just a natural extension of {@link String#replace}
 * functionality. The processing is driven by a single native regular expression
 * combined from user-supplied patterns, which makes it very efficient.
 */

/**
 * Single pattern and replacement encapsulation.
 * @private
 */
class UnionReplacerRule {
  constructor(pattern, replacement) {
    if (pattern.constructor !== RegExp) {
      throw new TypeError(`Replacement pattern ${pattern} is not a RegExp.`);
    }
    this.pattern = pattern;
    if (typeof replacement === 'function') {
      this.replacementFn = replacement;
    } else {
      this.replacementFn = this.stringReplacer;
      this.replacementArg = String(replacement);
    }
  }

  compile(captureNum) {
    let captureCount = 0;
    // regexp adapted from https://github.com/slevithan/xregexp
    const parts = /(\(\?<)(?=[^!=])|(\()(?!\?)|\\([1-9]\d*)|\\[\s\S]|\[(?:[^\\\]]|\\[\s\S])*\]/g;
    const patternStr = this.pattern.source.replace(parts,
      (match, parenNamed, paren, backref) => {
        if (paren || parenNamed) {
          captureCount++;
        } else if (backref) {
          if (+backref > captureCount) {
            throw new SyntaxError(`Octal or backreference to undefined capture group ${backref} in ${this.pattern}`);
          }
          // renumber backreference
          return `\\${+backref + captureNum}`;
        }
        return match;
      });
    this.captureNum = captureNum;
    this.capturePatternStr = `(${patternStr})`;
    this.captureCount = captureCount + 1;
  }

  stringReplacer(...args) {
    const match = args[0];
    // offset and on...
    let argIndex = this.captureCount;
    const offset = args[argIndex++];
    const string = args[argIndex++];
    const namedCaptures = args[argIndex++] || {};
    return this.replacementArg.replace(/\$([1-9]\d*)|\$([&`'$])|\$<([^\d\s>][^\s>]*)>/g,
      (m, capture, special, namedCapture) => {
        if (capture && +capture <= this.captureCount - 1) {
          return args[+capture];
        }
        if (special) {
          switch (special) {
            case '$': return '$';
            case '&': return match;
            case '`': return string.substring(0, offset);
            case "'": return string.substring(offset + match.length);
            default: throw new Error();
          }
        }
        if (namedCapture && namedCapture in namedCaptures) {
          return namedCaptures[namedCapture];
        }
        return m;
      });
  }
}

// Sum number of capture groups within the provided rules
const unionReplacerCountCaptureGroups = (rules) => rules
  .reduce((num, rule) => num + rule.captureCount, 0);

/**
 * Class encapsulating several {@link String#replace}-like replacements
 * combined into a single one-pass text processor.
 */
class UnionReplacer {
  /**
   * Create a union replacer and optionally initialize it with set of replace rules.
   * @param {Array} [replaces] Optional array of replaces.
   * @example new UnionReplacer([[/\$foo\b/, 'bar']], [/\\(.)/, '$1']])
   * @example new UnionReplacer()
   * @see #addReplacement
   */
  constructor(replaces) {
    /** @private */
    this.rules = [];
    /** @private */
    this.compiled = false;
    if (replaces) {
      replaces.forEach((replace) => this.addReplacement(replace[0], replace[1]));
    }
  }

  /**
   * Append a match and replace entry to this replacer. The order of `addReplacement`
   * calls is important: if any pattern is matched, the corresponding amount of input
   * is consumed and subsequent patterns will not match on such part of the input.
   *
   * @param {RegExp} pattern Regexp to match. The flags are ignored.
   * @param {(string|Function)} replacement Replacement string or function to be
   *   applied if the pattern matches.
   *   Replacement strings:
   *     - Syntax is the same as for {@link String#replace}:
   *       {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter|Specifying a string as a parameter}
   *     - ES2018 named capture groups follows the proposal syntax `$<name>`
   *   Replacement function:
   *     - The same as for {@link String#replace}:
   *       {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_function_as_a_parameter|Specifying a function as a parameter}
   *     - Eventual extra parameters passed by the JavaScript engine after the last
   *       standard parameter "string" are just handed over without change. This is
   *       mainly relevant for ES2018 named capture groups, which adds extra parameter
   *       with named capture group matches, i.e.
   *       `(match, p1, ..., pn, offset, string, namedCaptures) => { ... }`.
   *       Unlike numbered captures that are narrowed for the particular match,
   *       this extra `namedCaptures` parameter would contain keys for all the named capture
   *       groups within the replacer and the values of "foreign" named captures would be
   *       always `undefined`.
   * @throws {SyntaxError} Octal escapes are not allowed in patterns.
   * @throws Will throw an error if the replacer is frozen, i.e. compiled.
   * @see {@link https://github.com/orchitech/union-replacer/blob/master/README.md#alternation-semantics|Alternation semantics}
   */
  addReplacement(pattern, replacement) {
    if (this.compiled) {
      throw new Error('Dynamic rule changes not yet supported.');
    }
    const rule = new UnionReplacerRule(pattern, replacement);
    rule.compile(unionReplacerCountCaptureGroups(this.rules) + 1);
    this.rules.push(rule);
  }

  /**
   * Process the configured replaces and prepare internal data structures.
   * It is not needed to call this method explicitly as it is done automatically
   * on first use on of the replacer.
   * Calling this method makes sense to validate the replacer's pattern set
   * and to fail early eventually.
   * Currently it causes the replacements to be frozen, i.e. a subsequent
   * {@link UnionReplacer#addReplacement} call would fail.
   * Forward compatibility:
   * - Freezing the replacements is not guaranteed behavior in the future.
   * - If string-supplied regular expression patterns were allowed in methods like
   *   {@link UnionReplacer#addReplacement}, it would also allow invalid patterns
   *   to be supplied. Some sort of regexp syntax errors would be detected when
   *   building the replacer and other would be detected at the #compile time.
   * @throws {SyntaxError} Invalid regular expression pattern encountered. This
   *   currently occurs when named capture groups of the same name are supplied
   *   in different replacement patterns.
   */
  compile() {
    this.totalCaptureGroups = unionReplacerCountCaptureGroups(this.rules);
    const regexpStr = this.rules.map((rule) => rule.capturePatternStr).join('|');
    this.regexp = new RegExp(regexpStr, 'gm');
    this.compiled = true;
  }

  /**
   * Perform search and replace with the combined patterns and use corresponding
   * replacements for the particularly matched patterns.
   * @param {String} string Input to search and process.
   * @returns {String} New string with the matches replaced.
   * @see #addReplacement
   */
  replace(string) {
    if (!this.compiled) {
      this.compile();
    }
    return string.replace(this.regexp, (...args) => {
      const rule = this.rules.find((item) => typeof args[item.captureNum] !== 'undefined');
      const newargs = args
        .slice(rule.captureNum, rule.captureNum + rule.captureCount)
        .concat(args.slice(1 + this.totalCaptureGroups));
      return rule.replacementFn(...newargs);
    });
  }
}

export default UnionReplacer;
