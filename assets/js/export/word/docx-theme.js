/* ═══════════════════════════════════════════════
   docx-theme.js — Shared visual constants for the
   Word export pipeline (colors, fonts, page geometry,
   RTL detection regex, syntax-highlight palette).

   Pure data: no renderer, no DOCX classes. Changing a
   color or a font here never requires touching a
   renderer file.
   ═══════════════════════════════════════════════ */

const DOCX_THEME = {
  colors: {
    h1: "1F3864",
    h2: "2E5496",
    h3: "2E75B6",
    h4: "4472C4",
    h5: "808080",
    h6: "999999",

    codeBg: "FFFFFF",
    codeHdr: "F6F8FA",
    codeTextDark: "24292F",
    codeMuted: "6E7781",
    codeBdr: "D0D7DE",

    winRed: "FF5F56",
    winYellow: "FFBD2E",
    winGreen: "27C93F",

    mermaidBg: "FDF6FF",
    mermaidBar: "A855F7",
    mermaidLbl: "7B2D8B",

    quoteBg: "F0F4F8",
    quoteBar: "2E75B6",

    plotlyBg: "ECFEFF",
    plotlyBar: "0891B2",
    plotlyLbl: "0E7490",

    tableHdr: "2E5496",
    tableAlt: "EEF3FA",

    link: "0563C1",
    hr: "CCCCCC",
    footer: "888888",
  },

  hljsColors: {
    keyword: "CF222E",
    selectorTag: "116329",
    literal: "0550AE",
    number: "0550AE",
    string: "0A3069",
    regexp: "0A3069",
    title: "8250DF",
    function: "8250DF",
    builtIn: "953800",
    type: "953800",
    class: "953800",
    attr: "0550AE",
    attribute: "0550AE",
    variable: "953800",
    params: "24292F",
    comment: "6E7781",
    doctag: "CF222E",
    meta: "6E7781",
    tag: "116329",
    name: "116329",
    section: "8250DF",
    bullet: "0A3069",
    symbol: "0550AE",
    subst: "24292F",
  },

  lang: { latin: "en-US", bidi: "ar-SA" },

  fonts: {
    mono: "Courier New",
    body: "Arial",
    head: "Arial",
  },

  page: {
    width: 12240,
    height: 15840,
    margin: 1440,
  },

  /** Run-level RTL flag: a run carrying any RTL letter
      gets w:rtl. This is about the characters in the run,
      not about which edge the paragraph sits on — that is
      the resolver's job. */
  hasRtl: /[\u0591-\u07FF\u0860-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/,
};
