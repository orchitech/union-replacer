const UnionReplacer = require('../dist/union-replacer.cjs');

describe('MatchingContext', () => {
  /**
   * @example
   * @param mctx
   */
  function startEndReplace(mctx) {
    const l = mctx.match[0].length;
    const s = mctx.atStart() ? 'S' : '_';
    const e = mctx.atEnd() ? 'E' : '_';
    return `[${s}${e}:${l}]`;
  }
  it('recognizes start and end', () => {
    const r = new UnionReplacer([[/^x|y|z$/, startEndReplace, true]]);
    expect(r.replace('xyz')).toBe('[S_:1][__:1][_E:1]');
  });
  it('recognizes start = end match and empty end', () => {
    const r = new UnionReplacer([[/x|$/, startEndReplace, true]]);
    expect(r.replace('x')).toBe('[SE:1][_E:0]');
  });
  it('recognizes empty start and empty end', () => {
    const r = new UnionReplacer([[/^|$/, startEndReplace, true]]);
    expect(r.replace('x')).toBe('[S_:0]x[_E:0]');
  });
  it('recognizes empty start and empty on empty string', () => {
    const r = new UnionReplacer([[/^|$/, startEndReplace, true]]);
    expect(r.replace('')).toBe('[SE:0]');
  });
});
