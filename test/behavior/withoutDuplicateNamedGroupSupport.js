const groupNames = require('./groupNames');

const hasDuplicateGroupNames = (source) => {
  const names = groupNames(source);
  return names.some((name, i) => names.indexOf(name) !== i);
};

/**
 * Run `body` against a `RegExp` that rejects any repeated capture group name,
 * the way every engine behaved before ES2025.
 *
 * Half the CI matrix runs such an engine, but only half, and the local one is
 * whatever the developer happens to have. This makes that path reachable
 * everywhere, so it cannot quietly stop being covered.
 *
 * The emulation reaches the code under test because `UnionReplacer` builds its
 * combined pattern with `new RegExp(...)`. It is installed on
 * `RegExp.prototype.constructor` as well, since `UnionReplacerElement` checks
 * patterns with `pattern.constructor` and would otherwise reject every rule.
 *
 * @param {function(): *} body - Callback to run under the emulated engine.
 * @returns {*} Whatever `body` returns.
 */
const withoutDuplicateNamedGroupSupport = (body) => {
  const RealRegExp = RegExp;
  const emulated = function EmulatedRegExp(pattern, flags) {
    const source = pattern instanceof RealRegExp ? pattern.source : String(pattern);
    if (hasDuplicateGroupNames(source)) {
      throw new SyntaxError(`Invalid regular expression: /${source}/: Duplicate capture group name`);
    }
    return flags === undefined ? new RealRegExp(pattern) : new RealRegExp(pattern, flags);
  };
  emulated.prototype = RealRegExp.prototype;
  const constructorDescriptor = Object.getOwnPropertyDescriptor(RealRegExp.prototype, 'constructor');
  global.RegExp = emulated;
  Object.defineProperty(RealRegExp.prototype, 'constructor', {
    ...constructorDescriptor,
    value: emulated,
  });
  try {
    return body();
  } finally {
    global.RegExp = RealRegExp;
    Object.defineProperty(RealRegExp.prototype, 'constructor', constructorDescriptor);
  }
};

module.exports = withoutDuplicateNamedGroupSupport;
