/**
 * Declare a spec running one rewritten documentation example and comparing its
 * result against the output block documented right below it.
 *
 * The example is compiled with `with (this)`, so that names the shared
 * documentation context carries -- both the injected module and the variables
 * earlier examples declared -- resolve as plain identifiers, exactly as they
 * read in the document.
 *
 * @param {string} heading - Nearest preceding document heading, used to name
 *   the spec.
 * @param {string} code - The example rewritten into a runnable function body.
 * @param {string} expected - Contents of the documented output block.
 */
function itProducesDocumentedOutput(heading, code, expected) {
  it(`the example under "${heading}" produces the output documented below it`, function runExample() {
    /* eslint-disable-next-line no-new-func */
    const runCode = new Function(`with (this) {\n  ${code}\n}\n`);
    expect(runCode.call(this.subject)).toBe(expected);
  });
}

module.exports = itProducesDocumentedOutput;
