/**
 * Whether this engine implements ES2025 duplicate named capture groups and so
 * accepts one capture group name used in separate alternatives of a pattern.
 *
 * Rules are joined into a single alternation, so a name reused across rules
 * produces exactly such a pattern. Engines predating ES2025 reject it, which
 * makes this the deciding fact for the whole feature.
 *
 * The probe builds the pattern for real rather than sniffing a version: it is
 * the same `new RegExp` call `UnionReplacer` itself ends up making.
 *
 * @type {boolean}
 */
const duplicateNamedGroupsSupported = (() => {
  try {
    // eslint-disable-next-line prefer-regex-literals
    return !!new RegExp('(?<v>a)|(?<v>b)');
  // eslint-disable-next-line no-unused-vars
  } catch (e) {
    return false;
  }
})();

module.exports = duplicateNamedGroupsSupported;
