/**
 * Collect the capture group names defined in a regexp source, in order of
 * appearance and including duplicates.
 *
 * Escapes and character classes are skipped, so that `\(?<x>` and `[(?<x>]`
 * are not mistaken for group definitions. Lookbehind assertions are skipped
 * too, so that `(?<=a)` and `(?<!a)` do not read as groups named `=a`/`!a`.
 *
 * @param {string} source - Regexp source to scan.
 * @returns {Array<string>} The names found, duplicates included.
 */
const groupNames = (source) => {
  const names = [];
  const scanner = /\(\?<([^!=][^>]*)>|\\[\s\S]|\[(?:[^\\\]]|\\[\s\S])*\]/g;
  let part;
  while ((part = scanner.exec(source)) !== null) {
    if (part[1] !== undefined) {
      names.push(part[1]);
    }
  }
  return names;
};

module.exports = groupNames;
