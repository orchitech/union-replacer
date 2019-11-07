class UnionReplacerRule {
  constructor(pattern, replacement) {
    if (pattern.constructor !== RegExp) {
      throw new TypeError(`Replacement pattern ${pattern} is not a RegExp.`)
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
            throw new SyntaxError(`Octal or backreference to undefined capture group ${backref} in ${pattern}`)
          }
          // renumber backreference
          return `\\${+backref + captureNum}` 
        }
        return match;
      }
    );
    this.captureNum = captureNum;
    this.capturePatternStr = `(${patternStr})`
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
      }
    );
  }
}

const unionReplacerCountCaptureGroups = rules =>
  rules.reduce((num, rule) => num + rule.captureCount, 0);

class UnionReplacer {
  constructor(replaces) {
    this.rules = [];
    this.compiled = false;
    if (replaces) {
      replaces.forEach(replace => this.addReplacement(replace[0], replace[1]));
    }
  }

  addReplacement(pattern, replacement) {
    if (this.compiled) {
      throw new Error('Dynamic rule changes not yet supported.');
    }
    let rule = new UnionReplacerRule(pattern, replacement);
    rule.compile(unionReplacerCountCaptureGroups(this.rules) + 1);
    this.rules.push(rule)
  }

  compile() {
    this.totalCaptureGroups = unionReplacerCountCaptureGroups(this.rules);
    const regexpStr = this.rules.map(rule => rule.capturePatternStr).join('|');
    this.regexp = new RegExp(regexpStr, 'gm');
    this.compiled = true;
  }

  replace(string) {
    if (!this.compiled) {
      this.compile();
    }
    return string.replace(this.regexp, (...args) => {
      const rule = this.rules.find(rule => typeof args[rule.captureNum] !== 'undefined');
      const newargs = args
        .slice(rule.captureNum, rule.captureNum + rule.captureCount)
        .concat(args.slice(1 + this.totalCaptureGroups));
      return rule.replacementFn(...newargs)
    });
  }
}

module.exports = UnionReplacer;
