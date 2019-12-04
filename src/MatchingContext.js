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
 */
class MatchingContext {
  constructor(replacer) {
    this.replacer = replacer;
    this.match = null;
    this.lastIndex = 0;
  }

  skip(n) {
    this.lastIndex = this.match.index + this.match[0].length + n;
  }

  jump(n) {
    this.lastIndex = this.match.index + n;
  }

  reset() {
    const { index } = this.match;
    const mlen = this.match[0].length;
    this.lastIndex = index + (mlen > 0
      ? mlen
      : emptyMatchAdvance(this.match.input, index, this.replacer.regexp.unicode));
  }

  atStart() {
    return this.match.index === 0;
  }

  atEnd() {
    const { match } = this;
    return match.index + match[0].length >= match.input.length;
  }
}

export default MatchingContext;
