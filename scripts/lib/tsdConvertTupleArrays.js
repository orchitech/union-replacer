// While TypesSript compiler might be a tool-of-choice for this task,
// we've indeed decided to let UnionReplacer show off its power.

const UnionReplacer = require('../../dist/union-replacer.cjs');

const TUPLE_ARRAY_TYPE_RE = /^([ \t]*(?:declare\s+)?type\s+(\w+)\s*=\s*)\(([^;\r\n]*)\)\[\];/gm;
const OP_BRACKETS = ['[', '{', '<', '('];
const CL_BRACKETS = [']', '}', '>', ')'];
const BRACKET_MAP = new Map(
  CL_BRACKETS.map((bracket, index) => [bracket, OP_BRACKETS[index]]),
);
const [OP_BRACKETS_RE, CL_BRACKETS_RE] = [OP_BRACKETS, CL_BRACKETS].map(
  (list) => new RegExp(`[${list.map((br) => `\\${br}`).join('')}]`),
);
const unionToListReplacer = new UnionReplacer([
  [/=>/, '$&'],
  [OP_BRACKETS_RE, function opBracket(m) { this.open(m); return m; }],
  [CL_BRACKETS_RE, function clBracket(m) { this.close(m); return m; }],
  [/\s*\|\s*/, function separator(m) { return this.atRoot() ? ', ' : m; }],
]);

/* eslint-disable lines-between-class-members */
class UnionToListConverter {
  constructor() { this.nestLevels = {}; }
  open(bracket) { this.nestLevels[bracket] += 1; }
  close(bracket) { this.nestLevels[BRACKET_MAP[bracket]] -= 1; }
  atRoot() { return Object.values(this.nestLevels).every((count) => count === 0); }
  convert(unionTypeDef) {
    OP_BRACKETS.forEach((bracket) => { this.nestLevels[bracket] = 0; });
    return unionToListReplacer.replace(unionTypeDef, this);
  }
}

/**
 * Convert tuple-like arrays to tuples.
 *
 * @param {string} tsd - Typescript declarations to perform conversion on.
 * @param {RegExp} nameRe - Pattern determining tuple type names to convert.
 * @returns {string} Converted typescript declarations.
 */
function tsdConvertTupleArrays(tsd, nameRe) {
  const unionToListConverter = new UnionToListConverter();
  return tsd.replace(TUPLE_ARRAY_TYPE_RE, (m, declarator, name, unionTypeDef) => {
    if (!nameRe.test(name)) {
      return m;
    }
    const typeList = unionToListConverter.convert(unionTypeDef);
    if (!unionToListConverter.atRoot()) {
      throw new SyntaxError(`Unbalanced brackets in union type definition '${unionTypeDef}'`);
    }
    return `${declarator}[${typeList}];`;
  });
}

module.exports = tsdConvertTupleArrays;
