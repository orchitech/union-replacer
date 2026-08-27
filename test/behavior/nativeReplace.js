/**
 * The ground truth these tests are written against: what
 * `String.prototype.replace` does with one single rule, run on its own.
 *
 * `UnionReplacer` joins all rules into one alternation and then slices the
 * combined match back apart. Every helper here answers "what would this one
 * rule alone have produced at this one offset?", so that the sliced-apart
 * result can be held against it.
 *
 * The trick throughout is a sticky probe: the rule's source recompiled with
 * the replacer's flags, `y` forced on and `g` off, its `lastIndex` parked at
 * the offset in question. That pins the rule to exactly the match being
 * examined while still letting `$\`` and `$'` see the whole subject, just as
 * they do inside `UnionReplacer`.
 */

// `y` makes the probe match at lastIndex and nowhere else; `g` would make
// String.prototype.replace loop over every match instead of just this one.
const stickyFlags = (flags) => `${flags.replace(/[gy]/g, '')}y`;

// Probes are single use: String.prototype.replace advances their lastIndex.
const probeAt = (pattern, flags, index) => {
  const probe = new RegExp(pattern.source, stickyFlags(flags));
  probe.lastIndex = index;
  return probe;
};

/**
 * Find the rule the combined regexp routes a match at `index` to. Alternation
 * is ordered, so that is simply the first rule matching at that offset.
 *
 * @param {Array<UnionReplacer.ReplaceTuple>} rules - The replacer's rules.
 * @param {string} flags - Flags the replacer was built with.
 * @param {string} subject - Input being processed.
 * @param {number} index - Offset of the match.
 * @returns {object|null} `{ order, rule, match }`, or `null` if none matches.
 */
const firingRuleAt = (rules, flags, subject, index) => {
  for (let order = 0; order < rules.length; order++) {
    const match = probeAt(rules[order][0], flags, index).exec(subject);
    if (match !== null) {
      return { order, rule: rules[order], match };
    }
  }
  return null;
};

/**
 * Produce the replacement text `String.prototype.replace` yields for one rule
 * at one offset, with the surrounding subject trimmed back off.
 *
 * @param {UnionReplacer.ReplaceTuple} rule - The rule that fired.
 * @param {string} flags - Flags the replacer was built with.
 * @param {string} subject - Input being processed.
 * @param {number} index - Offset of the match.
 * @param {number} matchLength - Length of the matched text.
 * @returns {string} Just the replaced region.
 */
const replacementAt = (rule, flags, subject, index, matchLength) => {
  const replaced = subject.replace(probeAt(rule[0], flags, index), rule[1]);
  const tailLength = subject.length - (index + matchLength);
  return replaced.slice(index, replaced.length - tailLength);
};

/**
 * Capture the argument list `String.prototype.replace` passes to a replacement
 * function for one pattern at one offset.
 *
 * @param {RegExp} pattern - Pattern of the rule that fired.
 * @param {string} flags - Flags the replacer was built with.
 * @param {string} subject - Input being processed.
 * @param {number} index - Offset of the match.
 * @returns {Array|null} The arguments, or `null` if the pattern did not match.
 */
const argumentsAt = (pattern, flags, subject, index) => {
  let captured = null;
  subject.replace(probeAt(pattern, flags, index), (...args) => {
    captured = args;
    return '';
  });
  return captured;
};

module.exports = { firingRuleAt, replacementAt, argumentsAt };
