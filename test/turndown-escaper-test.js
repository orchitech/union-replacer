const cmark = require('cmark-gfm');
const { JSDOM } = require('jsdom');
const UnionReplacer = require('../dist/union-replacer.cjs');

const escapeOpts = {
  gfmStrikethrough: true,
  gfmStrikethroughOptimizeForDoubleTilde: true,
  gfmAutolinkUrlBreak: false,
  gfmAutolinkWwwBreak: false,
  gfmAutolinkBreaker: '<!-- -->',
  gfmAutolinkAllowedTransformations: ['commonmark', 'entities', 'link'],
  gfmAutolinkAllowAddHttpScheme: false,
};

const toBackSlashEscape = (c) => `\\${c}`;

const htmlEntityReferences = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  _: '&lowbar;',
  '*': '&ast;',
  ';': '&semi;',
};
const toHtmlEntityReference = (c) => {
  const ret = htmlEntityReferences[c];
  if (!ret) {
    // Script code error
    throw new Error(`'${c}' not convertable to HTML entity reference.`);
  }
  return ret;
};

const escapeTildes = (tildes, charEscape, offset, string, ctx) => {
  if (!escapeOpts.gfmStrikethrough) {
    return tildes;
  }
  if (!escapeOpts.gfmStrikethroughOptimizeForDoubleTilde) {
    return tildes.replace(/./g, (c) => charEscape(c));
  }
  // An unescaped leading or trailing tilde can break a surrounding strike-through.
  // This could be smarter if we knew the current node context.
  const atStart = (!ctx || ctx.atStart) && offset === 0;
  const atEnd = (!ctx || ctx.atEnd) && offset + tildes.length >= string.length;
  let lead = '';
  let mid = tildes;
  let trail = '';
  if (atStart && mid.length > 0) {
    lead = charEscape(mid.charAt(0));
    mid = mid.substring(1);
  }
  if (atEnd && mid.length > 0) {
    trail = charEscape(mid.charAt(mid.length - 1));
    mid = mid.slice(0, -1);
  }
  if (mid.length === 2) {
    mid = `${charEscape(mid.charAt(0))}${mid.substring(1)}`;
  }
  return `${lead}${mid}${trail}`;
};

/**
 * GFM autolink extension processor according to the spec and cmark-gfm.
 * Considerations:
 * 1. An autolink-like sequence just can be present in any text node.
 * 2. Although autolinks should have been rendered to an HTML `<a>` tag when
 *    processing HTML produced by a Markdown rendered, this is not always
 *    the case. The HTML can have any origin including hand-writing and WYSIWYG.
 * 3. No matter how a link-like sequence appeared in a text node,
 *    a GFM autolink-enabled parser would just interpret it when we put it
 *    in the resulting Markdown.
 * 4. The result would be crippled when autolink is MD-escaped in a common way.
 *    This was actually the biggest pain in author's back-translation tests.
 *    Let's consider a HTML text with a common URL sequence `www.example.org/a_b`
 *    and a URL sequence with punctuation and a "footnote star"
 *    `See https://orchi.tech...*`.
 *    The usual MD escaping would lead to `www.example.org/a\_b` and
 *    `https://orchi.tech...\*`. Which then renders as
 *    `<a href="http://www.example.org/a%5C_b`">` and
 *    `<a href="https://orchi.tech...%5C">`, while displaying the backslash
 *    in the back-translated output. This is not really what was meant.
 * 5. There are little to no options how to prevent GFM autolink processing
 *    in Markdown. A HTML comment might be applied, e.g.
 *    `https<!-- -->://orchi.tech`. This is something a) not really expected
 *    and b) the user likely appreciates autolinking of apparent links in the
 *    text input.
 * 6. The rule of thumb is based on the HTML1 -> GFM1 -> HTML2 -> GFM2
 *    backtranslation test.
 *     1. GFM1 and GFM2 must be semantically equivalent.
 *     2. HTML2 should appear the same as HTML1 except constructs unsupported
 *        in GFM. When autolinks are the concern, there must be the same
 *        apparent text and the link should point to the URL that was present
 *        in HTML1, although not as a HTML link.
 *     3. The produced GFM should be "expected" by the user. As GFM is a markup
 *        language intended to be hand-written, the user should be able t
 *        hand-edit the output without "surprises".
 *     4. GFM1 and GFM2 should be syntactically same, if possible.
 *
 * That's why we develop this escaper to significantly improve Turndown's
 * reliability. It is based on GFM spec and cmark-gfm as a reference
 * implementation. cmark-gfm has been preferred over the spec.
 *
 * Remarks for GFM autolinks:
 * 1. cmark-gfm considers `<` as valid for autolink detection and trims
 *    the resulting link afterwards. So `https://or_chi.tech.<` leads to
 *    autolinking of `https://or_chi.tech`, although this wouldn't form
 *    autolink without the trailing `<`.
 * 2. '>' is generally considered a valid part of GFM autolinks. But we
 *    are looking for the most likely input satisfying MD->HTML->MD
 *    backtranslation test, so we treat it as a delimiter too.
 * 3. Except _no underscores in the last two segments of the domain_,
 *    cmark-gfm has very loose rules on domain segments. I.e. `http://x..` would
 *    be treated as an autolink to `http://x`, while the trailing dots are
 *    treated as trailing punctuation during processing.
 * 4. As we work with processed HTML, HTML entity reference rule makes
 *    little sense for detection. The other way around, we must not generate
 *    output that would match this rule.
 * 5. When it is necessary, we convert the link to the standard
 *    CommonMark autolink construct to best match the rule of thumb.
 *
 * @see https://github.github.com/gfm/#autolinks-extension-
 * @see https://github.com/github/cmark-gfm/blob/21f7420f42cd970732c65155befccb68e5b0144a/extensions/autolink.c
 */
const GFM_AUTOLINK_REPLACE = (() => {
  const buildRegExp = () => {
    // Equivalent to \t\n\f\r\p{Zs}
    const C_SP = ' \\t\\n\\f\\r\xA0\u1680\u2000-\u200A\u202F\u205F\u3000';
    // Equivalent to \p{Pc}\p{Pd}\p{Pe}\p{Pf}\p{Pi}\p{Po}\p{Ps}
    const C_PUNCT = '_\u203F\u2040\u2054\uFE33\uFE34\uFE4D-\uFE4F\uFF3F\\-\u058A\u05BE\u1400\u1806\u2010-\u2015\u2E17\u2E1A\u2E3A\u2E3B\u2E40\u301C\u3030\u30A0\uFE31\uFE32\uFE58\uFE63\uFF0D\\)\\]\\}\u0F3B\u0F3D\u169C\u2046\u207E\u208E\u2309\u230B\u232A\u2769\u276B\u276D\u276F\u2771\u2773\u2775\u27C6\u27E7\u27E9\u27EB\u27ED\u27EF\u2984\u2986\u2988\u298A\u298C\u298E\u2990\u2992\u2994\u2996\u2998\u29D9\u29DB\u29FD\u2E23\u2E25\u2E27\u2E29\u3009\u300B\u300D\u300F\u3011\u3015\u3017\u3019\u301B\u301E\u301F\uFD3E\uFE18\uFE36\uFE38\uFE3A\uFE3C\uFE3E\uFE40\uFE42\uFE44\uFE48\uFE5A\uFE5C\uFE5E\uFF09\uFF3D\uFF5D\uFF60\uFF63\xBB\u2019\u201D\u203A\u2E03\u2E05\u2E0A\u2E0D\u2E1D\u2E21\xAB\u2018\u201B\u201C\u201F\u2039\u2E02\u2E04\u2E09\u2E0C\u2E1C\u2E20!-#%-\'\\*,\\.\\/:;\\?@\\\xA1\xA7\xB6\xB7\xBF\u037E\u0387\u055A-\u055F\u0589\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u166D\u166E\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u1805\u1807-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2016\u2017\u2020-\u2027\u2030-\u2038\u203B-\u203E\u2041-\u2043\u2047-\u2051\u2053\u2055-\u205E\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00\u2E01\u2E06-\u2E08\u2E0B\u2E0E-\u2E16\u2E18\u2E19\u2E1B\u2E1E\u2E1F\u2E2A-\u2E2E\u2E30-\u2E39\u2E3C-\u2E3F\u2E41\u2E43-\u2E4E\u3001-\u3003\u303D\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFE10-\uFE16\uFE19\uFE30\uFE45\uFE46\uFE49-\uFE4C\uFE50-\uFE52\uFE54-\uFE57\uFE5F-\uFE61\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF07\uFF0A\uFF0C\uFF0E\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3C\uFF61\uFF64\uFF65\\(\\[\\{\u0F3A\u0F3C\u169B\u201A\u201E\u2045\u207D\u208D\u2308\u230A\u2329\u2768\u276A\u276C\u276E\u2770\u2772\u2774\u27C5\u27E6\u27E8\u27EA\u27EC\u27EE\u2983\u2985\u2987\u2989\u298B\u298D\u298F\u2991\u2993\u2995\u2997\u29D8\u29DA\u29FC\u2E22\u2E24\u2E26\u2E28\u2E42\u3008\u300A\u300C\u300E\u3010\u3014\u3016\u3018\u301A\u301D\uFD3F\uFE17\uFE35\uFE37\uFE39\uFE3B\uFE3D\uFE3F\uFE41\uFE43\uFE47\uFE59\uFE5B\uFE5D\uFF08\uFF3B\uFF5B\uFF5F\uFF62';
    // Standard domain character match
    const MC_SD = `[^${C_SP}${C_PUNCT}]`;
    const MC_D3 = `(?:${MC_SD}|[-_])`; // 3rd+ level domain char
    const MC_D12 = `(?:${MC_SD}|-)`; // 1st and 2nd level domain char
    const MC_AFTER_D = '[^ <\\t\\n\\f\\r]'; // after-domain char
    const M_D = `(?![-_.<>])(?:(?:${MC_D3}*\\.)*${MC_D12}*\\.)?${MC_D12}*(?!${MC_D3})`;
    const M_URL = '[hH][tT][tT][pP][sS]?://|[fF][tT][pP]://';
    const M_WWW = 'www\\.';
    const M_BEFORE = `(?:\\b|_)(?=${M_URL})|(?:^|[${C_SP}*_(]|~+)(?=${M_WWW})`;
    return new RegExp(`(${M_BEFORE})(((${M_URL})|(${M_WWW}))${M_D}${MC_AFTER_D}*)`, 'g');
  };

  /**
   * Escape eventual punctuation string after / before GFM autolink.
   *
   * @private
   * @param {String} str Punctuation string to be escaped.
   * // FIXME @param {Boolean} outterAtEnd Whether we are the end of the text node.
   * @returns {String} Escaped result.
   */
  const escape = (str, charEscape, ctx) => str
    .replace(/([_*<>[\]]|&(?=[a-z][a-z\d]*;|#\d{1,7};|#x[\da-f]{1,6};))|(^;)|(~+)/gi,
      (m, single, semi, tildes, offset, string) => {
        if (single) {
          return charEscape(single);
        }
        if (semi && ctx.unterminatedEntity) {
          return charEscape(semi);
        }
        if (tildes) {
          return escapeTildes(tildes, charEscape, offset, string, ctx);
        }
        return m;
      });

  const transforms = {
    keep: (link, trail) => `${link}${trail}`,
    commonmark: (link, trail, ctx) => {
      ctx.unterminatedEntity = false;
      // unlike backslash escapes, entity-like sequences are interpreted
      const outLink = link.replace(/&([a-z]+|#\d{1,7}|#x[0-9a-f]{1,6});/gi, '&amp;$1;');
      const addScheme = ctx.scheme ? '' : 'http://';
      const outTrail = escape(trail, toBackSlashEscape, ctx);
      return `<${addScheme}${outLink}>${outTrail}`;
    },
    entities: (link, trail, ctx) => {
      const outTrail = escape(trail, toHtmlEntityReference, ctx);
      return `${link}${outTrail}`;
    },
    link: (link, trail, ctx) => {
      ctx.unterminatedEntity = false;
      const outLinkText = escape(trail, toBackSlashEscape, {});
      const outLinkRef = outLinkText.replace(/[()]/g, '\\$1');
      const addScheme = ctx.scheme ? '' : 'http://';
      const outTrail = escape(trail, toBackSlashEscape, ctx);
      return `[${outLinkText}](${addScheme}${outLinkRef})${outTrail}`;
    },
    breakup: (link, trail, ctx) => {
      ctx.unterminatedEntity = false;
      const linkRest = link.substring(ctx.linkStart.length) + trail;
      const linkRestOut = escape(linkRest, toBackSlashEscape, ctx);
      return `${ctx.linkStart}${escapeOpts.gfmAutolinkBreaker}${linkRestOut}`;
    },
  };

  const pickGfmAutolinkTransformer = (link, trail, ctx) => {
    if (ctx.scheme && escapeOpts.gfmAutolinkUrlBreak) {
      return transforms.breakup;
    }
    if (ctx.www && escapeOpts.gfmAutolinkWwwBreak) {
      return transforms.breakup;
    }
    const backslashEscapedTrail = escape(trail, toBackSlashEscape, ctx);
    if (backslashEscapedTrail === trail) {
      return transforms.keep;
    }
    const applicableTransforms = {};
    if (ctx.scheme || escapeOpts.gfmAutolinkAllowAddHttpScheme) {
      applicableTransforms.commonmark = transforms.commonmark;
      applicableTransforms.link = transforms.link;
    }
    if (!trail.includes('~')) {
      applicableTransforms.entities = transforms.entities;
    }
    for (let i = 0; i < escapeOpts.gfmAutolinkAllowedTransformations.length; i++) {
      const transform = escapeOpts.gfmAutolinkAllowedTransformations[i];
      if (applicableTransforms[transform]) {
        return applicableTransforms[transform];
      }
    }
    return transforms.breakup;
  };

  /**
   * Process GFM autolink-like sequence in a text node.
   *
   * @private
   * @param {String} m Autolink sequence match.
   * @param {String} lead Character preceding the autolink.
   * @param {String} linkMatch To-be-right-trimmed autolink sequence according to the spec.
   * @returns {String} Escaped GFM autolink-like sequence.
   */
  const processGfmAutolink = (m, before, linkMatch, linkStart, scheme, www, offset, string) => {
    let trail = '';
    let linkEnd = linkMatch.search(/[<>]/);
    let link = linkMatch;
    if (linkEnd >= 0) {
      trail = link.substring(linkEnd);
      link = link.substring(0, linkEnd);
    }
    // Trailing punctuation and ')'
    linkEnd = link.search(/[?!.,:*_~'";)]+$/i);
    if (linkEnd >= 0) {
      // treat matching ')' as part of the link
      let popen = 0;
      let pclose = 0;
      for (let i = 0; i < link.length; i++) {
        switch (link.charAt(i)) {
          case '(':
            popen++;
            break;
          case ')':
            pclose++;
            if (i >= linkEnd && pclose <= popen) {
              linkEnd = i + 1;
            }
            break;
          default:
            break;
        }
      }
      trail = link.substring(linkEnd) + trail;
      link = link.substring(0, linkEnd);
    }
    const ctx = {
      scheme,
      www,
      linkStart,
      atEnd: offset + m.length >= string.length,
      unterminatedEntity: /&[a-z]+$/i.test(link),
    };
    const outBefore = escape(before, toBackSlashEscape, { atStart: true });
    const transform = pickGfmAutolinkTransformer(link, trail, ctx);
    const out = transform(link, trail, ctx);
    return `${outBefore}${out}`;
  };

  return [buildRegExp(), processGfmAutolink];
})();

const GFM_AUTOLINK_EMAIL_REPLACE = [
  /[-+.\w]+@(?:[-\w]+\.)+[-\w]*[^\W_](?![-@\w])/g,
  (m) => m.replace(/_/g, '\\$&'),
];

const GFM_STRIKETROUGH_REPLACE = [
  /~+/,
  (m, offset, string) => escapeTildes(m, toBackSlashEscape, offset, string),
];

const mdEscaper = new UnionReplacer([
  // GFM extensiona replaces take priority over the rest.
  // GFM autolink rules should be avoided when we already are in a link.
  GFM_AUTOLINK_REPLACE,
  GFM_AUTOLINK_EMAIL_REPLACE,
  // should precede ^~~~
  GFM_STRIKETROUGH_REPLACE,

  // global backslash escapes
  [/[\\*_[\]`&<>]/, '\\$&'],

  // backslash-escape at eventual line start
  // TODO: horizontal rule, ...
  [/^(?:~~~|=+)/, '\\$&'],

  // backslash-escape at eventual line start if followed by space
  [/^(?:[-+]|#{1,6})(?=\s)/, '\\$&'],

  // backslash-escape the dot to supress ordered list
  [/^(\d+)\.(?=\s)/, '$1\\. '],
]);

// EXACT TESTS

const tests = [
  ['http://www.pokemon.com/Pikachu_(Electric)*', '<http://www.pokemon.com/Pikachu_(Electric)>\\*'],
  ['http://www.pokemon.com/Pikachu_((Electric)*', '<http://www.pokemon.com/Pikachu_((Electric)>\\*'],
  ['http://www.pokemon.com/Pikachu_(Electric))*', '<http://www.pokemon.com/Pikachu_(Electric)>)\\*'],
  ['http://www.pokemon.com/Pikachu_((Electric))*', '<http://www.pokemon.com/Pikachu_((Electric))>\\*'],
  ['www.example.com...', 'www.example.com...'],
  ['*www.example.com@www.example.com*', '\\*www.example.com@www.example.com&ast;'],
  ['_https://orchi.tech...*', '\\_<https://orchi.tech>...\\*'],
  ['_www.example.org/a_(, cool', '\\_www.example.org/a_(, cool'],
  ['_zdepa@pepa.cz*', '\\_zdepa@pepa.cz\\*'],
  ['pe_pa@pe_pa.cz@pe_pa.cz*', 'pe\\_pa@pe\\_pa.cz@pe\\_pa.cz\\*'],
  ['pepa@www.example.org,_x', 'pepa@www.example.org,\\_x'],
  ['www.example.org,_x', 'www.example.org,_x'],
  ['www.example.org/~ ', 'www.example.org/~ '],
  ['www.example.org/~.', 'www.example.org/~.'],
  ['www.example.org/~~.', 'www.<!-- -->example.org/\\~~.'],
  ['~~www.example.org/~~.', '\\~~www.<!-- -->example.org/\\~~.'],
  ['www.example.org/~~~.', 'www.example.org/~~~.'],
  ['www.example.org/~', 'www.<!-- -->example.org/\\~'],
  ['x~y', 'x~y'],
  ['x~~y', 'x\\~~y'],
  ['x~~~y', 'x~~~y'],
  ['~y', '\\~y'],
  ['~~y', '\\~~y'],
  ['~~~y', '\\~\\~~y'],
  ['~~~~y', '\\~~~~y'],
  ['x~', 'x\\~'],
  ['x~~', 'x~\\~'],
  ['x~~~', 'x\\~~\\~'],
  ['x~~~~', 'x~~~\\~'],
  ['~', '\\~'],
  ['~~', '\\~\\~'],
  ['~~~', '\\~~\\~'],
  ['~~~~', '\\~\\~~\\~'],
  ['~~~~~', '\\~~~~\\~'],
  ['@www.example.com/_', '@www.example.com/\\_'],
  ['xxx.www.example.com/_,x_', 'xxx.www.example.com/\\_,x\\_'],
  // This is OK contrary to the GFM spec, stating:
  // > All such recognized autolinks can only come at the beginning of a line,
  // > after whitespace, or any of the delimiting characters *, _, ~, and (.
  // --> this rule should be perhaps applied only to www autolinks
  ['.http://example.org/,_x', '.http://example.org/,_x'],
  [' .www.example.com/_,x_', ' .www.example.com/\\_,x\\_'],
  ['www.example.org/&noop;', 'www.example.org/&noop&semi;'],
];

tests.forEach((test) => {
  const input = test[0];
  const expected = test[1];
  const actual = mdEscaper.replace(input);
  /* eslint-disable no-console */
  console.log(`[${actual === expected ? 'PASS' : 'FAIL'}] '${input}': '${actual}' == '${expected}'`);
  /* eslint-enable no-console */
});

// BACK-TRANSLATION TESTS
// https://github.com/clear-code/redmine_common_mark/blob/master/init.rb:
// https://github.com/gitlabhq/gitlabhq/blob/master/lib/banzai/filter/markdown_engines/common_mark.rb:
const cmarkOptions = {
  validateUtf8: true,
  smart: false,
  liberalHtmltag: false,
  footnotes: false,
  strikethroughDoubleTilde: true, /* exactly two tildes -> setting */
  sourcepos: false,
  hardbreaks: false,
  unsafe: false,
  nobreaks: false,
  githubPreLang: false,
  fullInfoString: false,
  extensions: {
    autolink: true,
    strikethrough: true,
    table: true,
    tagfilter: true,
    // tasklist: false, // not mentioned in GitLab
  },
};

const htmlEscaper = new UnionReplacer([
  [/</, '&lt;'],
  [/>/, '&gt;'],
  [/"/, '&quot;'],
  [/&/, '&amp;'],
]);

const htmlNode = (str) => {
  const html = `<html>${str}</html>`;
  return new JSDOM(html).window.document.getElementsByTagName('html')[0];
};

const textNode = (str) => htmlNode(htmlEscaper.replace(str));

tests.forEach((test) => {
  const input = test[0];
  const inputNode = textNode(input);
  const inputTextContent = inputNode.textContent.trim();

  const md = mdEscaper.replace(input);
  const html = cmark.renderHtmlSync(md, cmarkOptions);
  const outputNode = htmlNode(html);
  const backtranslatedTextContent = outputNode.textContent.trim();

  if (inputTextContent !== backtranslatedTextContent) {
    /* eslint-disable no-console */
    console.log(`['FAIL'}] '${input}'`);
    console.log(`Expected text content:       '${inputTextContent}'`);
    console.log(`Backtranslated text content: '${backtranslatedTextContent}'`);
    /* eslint-enable no-console */
  }
});
