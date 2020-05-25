const emptyMatchAdvance = (input, index, unicode) => {
  if (!unicode || index < 0 || index + 1 >= input.length) {
    return 1;
  }
  const c1 = input.charCodeAt(index);
  if (c1 < 0xD800 || c1 > 0xDBFF) {
    return 1;
  }
  const c2 = input.charCodeAt(index + 1);
  return c2 < 0xDC00 || c2 > 0xDFFF ? 1 : 2;
};

/**
 * Encapsulation of matcher variables.
 *
 * @interface
 * @memberof UnionReplacer
 */
class MatchingContext {
  /**
   * @interface
   * @hideconstructor
   */
  constructor(replacer) {
    /**
     * The {@link UnionReplacer} instance being used.
     *
     * @name UnionReplacer.MatchingContext#replacer
     * @type {UnionReplacer}
     * @readonly
     */
    this.replacer = replacer;
    /**
     * Last match, as returned by {@link RegExp#exec}.
     *
     * @name UnionReplacer.MatchingContext#match
     * @type {RegExpExecArray|null}
     * @readonly
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec#Return_value
     */
    this.match = null;
    /** @private */
    this.lastIndex = 0;
  }

  /**
   * Advance matching position `n` characters after the match end position.
   *
   * @param {number} n - Number of characters to skip. Zero and negative values
   *   are valid, but introduce risk of infinite processing. It is then user
   *   responsibility to prevent it.
   */
  skip(n) {
    this.lastIndex = this.match.index + this.match[0].length + n;
  }

  /**
   * Set matching position to `n` characters from match start.
   *
   * @param {number} n - Number of characters jump. Values less than or equal
   *   to match length are valid, but introduce risk of infinite processing.
   *   It is then user responsibility to prevent it.
   */
  jump(n) {
    this.lastIndex = this.match.index + n;
  }

  /**
   * Reset matching position according to standard regexp match position advancing.
   */
  reset() {
    const { index } = this.match;
    const mlen = this.match[0].length;
    this.lastIndex = index + (mlen > 0
      ? mlen
      : emptyMatchAdvance(this.match.input, index, this.replacer.regexp.unicode));
  }

  /**
   * Determine whether the current match is at the input start.
   *
   * @returns {boolean} `true` if current match is at input start, `false` otherwise.
   */
  atStart() {
    return this.match && this.match.index === 0;
  }

  /**
   * Determine whether the current match is at the input end.
   *
   * @returns {boolean} `true` if current match is at input end, `false` otherwise.
   */
  atEnd() {
    const { match } = this;
    return match && (match.index + match[0].length >= match.input.length);
  }
}

export default MatchingContext;
