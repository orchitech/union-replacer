/**
 * A {@link UnionReplacer.ReplacementBuilder} that keeps a record of every
 * single match on its way through, while still building the ordinary output
 * string.
 *
 * `UnionReplacer.prototype.replace` only returns the final string, so there is
 * otherwise no way to inspect how an input was split into matches and which
 * rule each one was routed to. Tests use the recorded matches to compare each
 * one individually against what `String.prototype.replace` would have done.
 */
class RecordingBuilder {
  constructor() {
    /** @type {Array<object>} One entry per match, in the order they occurred. */
    this.matches = [];
    /** @type {string} The output an ordinary replace would have returned. */
    this.output = '';
  }

  addSubjectSlice(subject, start, end) {
    this.output += subject.slice(start, end);
  }

  addReplacedString(replaced, ctx) {
    this.matches.push({
      index: ctx.match.index,
      input: ctx.match.input,
      captures: Array.from(ctx.match),
      groups: ctx.match.groups,
      replaced,
    });
    this.output += replaced;
  }

  build() {
    return this;
  }
}

module.exports = RecordingBuilder;
