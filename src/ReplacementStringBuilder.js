/**
 * String processing builder that builds a string output in the same way
 * how String.prototype.replace implementation does it.
 *
 * @interface ReplacementStringBuilder
 */
class ReplacementStringBuilder {
  constructor() {
    this.output = '';
  }

  /**
   * Add section of a string to output.
   *
   * @param {string} subject - String to be processed.
   * @param {number} start - The zero-based index at which to begin extraction.
   * @param {number} end - The zero-based index before which to end extraction.
   * The character at this index will not be included.
   * @example builder.addSubjectSlice('example', 1, 2);
   */
  addSubjectSlice(subject, start, end) {
    this.output += subject.slice(start, end);
  }

  /**
   * Add replaced string to output.
   *
   * @param {string} string - String to be added.
   * @example builder.addReplacedString('example');
   */
  addReplacedString(string) {
    this.output += string;
  }

  /**
   * Build output string.
   *
   * @returns {string} Output string.
   * @example const x = builder.build();
   */
  build() {
    return this.output;
  }
}

export default ReplacementStringBuilder;
