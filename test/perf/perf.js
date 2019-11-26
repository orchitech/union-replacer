(function run() {
  const outputBox = document.getElementById('log');
  const suites = [];
  const benchmarkOptions = {
    async: true,
  };

  function log(msg) {
    outputBox.insertAdjacentHTML('beforeend', msg.replace(/\n/g, '<br>'));
  }

  function scrollToEnd() {
    window.scroll(0, document.body.scrollHeight);
  }

  const suiteOptions = {

    onStart: function () {
      log('\n' + this.name + ':');
    },

    onCycle: function (event) {
      log('\n' + String(event.target));
      scrollToEnd();
    },

    onComplete: function () {
      log('\nFastest is ' + this.filter('fastest').map('name') + '\n');
      // Remove current suite from queue
      suites.shift();
      if (suites.length) {
        // Run next suite
        suites[0].run();
      } else {
        log('\nFinished.');
      }
      scrollToEnd();
    },

  };

  // Expose as global
  window.run = function runSuites() {
    log('Testing UnionReplacer.\n');
    suites[0].run();
  };

  /**
   * Start of perf suites
   */
  (function start() {
    const htmlEscapes = [
      [/</, '&lt;'],
      [/>/, '&gt;'],
      [/"/, '&quot;'],
      [/&/, '&amp;'],
    ];

    const htmlEscaper = new UnionReplacer(htmlEscapes);

    const mdHighlighter = new UnionReplacer([
      [/^(`{3,}).*\n([\s\S]*?)(^\1`*\s*?$|\Z)/, function replace(match, fence1, pre, fence2) {
        let block = '<b>' + fence1 + '</b><br />\n';
        block += '<pre>' + htmlEscaper.replace(pre) + '</pre><br />\n';
        block += '<b>' + fence2 + '</b>';
        return block;
      }],

      [/(^|[^`])(`+)(?!`)(.*?[^`]\2)(?!`)/, function replace(match, lead, delim, code) {
        return htmlEscaper.replace(lead) + '<code>' + htmlEscaper.replace(code) + '</code>';
      }],

      [/[*~=+_-`]+/, '<b>$&</b>'],
      [/\n/, '<br />\n'],
    ].concat(htmlEscapes));

    const toBeMarkdownHighlighted = '\
      **Markdown** code to be "highlighted"\n\
      with special care to fenced code blocks:\n\
      ````\n\
      _Markdown_ within fenced code blocks is not *processed*:\n\
      ```\n\
      Even embedded "fence strings" work well with **UnionEscaper**\n\
      ```\n\
      ````\n\
      *CommonMark is sweet & cool.*';

    const mdHighlightRe = /(^(`{3,}).*\n([\s\S]*?)(^\2`*\s*?$|\Z))|((^|[^`])(`+)(?!`)(.*?[^`]\7)(?!`))|([*~=+_-`]+)|(\n)|(<)|(>)|(")|(&)/gm;

    const suite = new Benchmark.Suite('Starting test', suiteOptions)
      .add('UnionReplacer method: \'UnionReplacer.prototype.replace\'', function highlight() {
        mdHighlighter.replace(toBeMarkdownHighlighted);
      }, benchmarkOptions)
      .add('String replace method', function highlight() {
        const myHtmlEscape = function escape(str) { return str; };
        toBeMarkdownHighlighted.replace(mdHighlightRe,
          function asd(match, fenced, fence1, pre, fence2, codespan, lead, delim,
            code, special, nl, lt, gt, quot, amp) {
            if (fenced) {
              let block = '<b>' + fence1 + '</b><br />\n';
              block += '<pre>' + htmlEscaper.replace(pre) + '</pre><br />\n';
              block += '<b>' + fence2 + '</b>';
              return block;
            }
            if (codespan) {
              return myHtmlEscape(lead) + '<code>' + myHtmlEscape.replace(code) + '</code>';
            }
            if (special) {
              return '<b>' + special + '</b>';
            }
            if (nl) {
              return '<br />\n';
            }
            if (lt) {
              return '<';
            }
            if (gt) {
              return '>';
            }
            if (quot) {
              return '"';
            }
            if (amp) {
              return '&';
            }
            return null;
          });
      }, benchmarkOptions);

    suites.push(suite);
  }());
}());
