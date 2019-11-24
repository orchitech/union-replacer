/**
 * String processing builder that builds a string output in the same way
 * how String.prototype.replace implementation does it.
 */
class ReplacementStringBuilder {
  constructor() {
    this.output = '';
  }

  addSubjectSlice(subject, start, end) {
    this.output += subject.slice(start, end);
  }

  addReplacedString(string) {
    this.output += string;
  }

  build() {
    return this.output;
  }
}

export default ReplacementStringBuilder;
