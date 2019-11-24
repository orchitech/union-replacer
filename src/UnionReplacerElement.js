const createStringReplacer = (replacementStr) => function stringReplacer(ctx) {
  const m = ctx.match;
  const groups = m.groups || {};
  return replacementStr.replace(/\$([1-9]\d*)|\$([&`'$])|\$<([^\d\s>][^\s>]*)>/g,
    (s, capture, special, namedCapture) => {
      if (capture && +capture < m.length) {
        return m[+capture];
      }
      if (special) {
        switch (special) {
          case '$': return '$';
          case '&': return m[0];
          case '`': return m.input.slice(0, m.index);
          case "'": return m.input.slice(m.index + m[0].length);
          default: throw new Error();
        }
      }
      if (namedCapture && namedCapture in groups) {
        return groups[namedCapture];
      }
      return s;
    });
};

const wrapStringReplaceFn = (replacementFn) => function callStringReplaceFn(ctx) {
  const m = ctx.match;
  const info = m.groups ? [m.index, m.input, m.groups] : [m.index, m.input];
  return replacementFn.apply(this, [...m, ...info]);
};

/**
 * Single pattern and replacement encapsulation.
 * @private
 */
class UnionReplacerElement {
  constructor(pattern, replacement, extended) {
    if (pattern.constructor !== RegExp) {
      throw new TypeError(`Replacement pattern ${pattern} is not a RegExp.`);
    }
    this.pattern = pattern;
    if (typeof replacement === 'function') {
      this.replacementFn = extended
        ? replacement
        : wrapStringReplaceFn(replacement);
    } else {
      const replacementStr = String(replacement);
      this.replacementFn = createStringReplacer(replacementStr);
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

  /* eslint-disable no-unused-vars */
  narrowMatch(ctx, totalCaptures) { // eslint-disable-line no-unused-vars
    // Much faster than modifying the match whit `splice()` on V8
    const m0 = ctx.match;
    const m1 = m0.slice(this.captureNum, this.captureNum + this.captureCount);
    m1.index = m0.index;
    m1.input = m0.input;
    m1.groups = m0.groups;
    ctx.match = m1;
  }
}

export default UnionReplacerElement;
