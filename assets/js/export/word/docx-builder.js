/* ═══════════════════════════════════════════════
   docx-builder.js — Markdown tokens → DOCX document.

   Stateless with respect to the DOM: it receives the
   markdown and a map of pre-rendered diagram images
   keyed by their order of appearance.

   Direction is NOT decided here. Every block asks
   DirectionResolver, which holds one policy for the
   whole document — the only way headings, lists and
   tables can share an edge.
   ═══════════════════════════════════════════════ */

class DocxBuilder {
  /* ── Palette ────────────────────────────────── */
  static COLORS = {
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
    tableHdr: "2E5496",
    tableAlt: "EEF3FA",
    link: "0563C1",
    hr: "CCCCCC",
    footer: "888888",
  };

  static HLJS_COLORS = {
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
  };
  static FONTS = {
    mono: "Courier New",
    body: "Arial",
    head: "Arial",
  };

  /** Run-level RTL flag: a run carrying any RTL letter
      gets w:rtl. This is about the characters in the run,
      not about which edge the paragraph sits on — that is
      the resolver's job. */
  static HAS_RTL_RE = /[\u0591-\u07FF\u0860-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;

  /* ── Page geometry (twips) ──────────────────── */
  static PAGE = {
    width: 12240,
    height: 15840,
    margin: 1440,
  };

  /**
   * @param {object} docx      window.docx namespace
   * @param {object} imageMap  { [mermaidIndex]: {dataUrl,width,height} }
   * @param {DirectionResolver|boolean} direction
   *        A resolver (preferred), or a boolean for the
   *        legacy "whole document is RTL" call style.
   */
  constructor(docx, imageMap = {}, direction = true) {
    this.d = docx;
    this.imageMap = imageMap;
    this.dir = DocxBuilder._asResolver(direction);
    this.mermaidIndex = 0;
    this.contentWidth = DocxBuilder.PAGE.width - DocxBuilder.PAGE.margin * 2;
  }

  /**
   * Accept either a resolver or a boolean, so older call
   * sites keep working. Failing loudly beats silently
   * guessing a direction policy.
   */
  static _asResolver(direction) {
    if (direction && typeof direction.resolveBlock === "function") {
      return direction;
    }
    if (typeof DirectionResolver === "undefined") {
      throw new Error(
        "DocxBuilder needs direction-resolver.js loaded before it.",
      );
    }
    return DirectionResolver.fixed(direction !== false);
  }

  /* ═══════════ Direction ═══════════ */

  /** Flatten a token tree down to plain text. */
  static tokenText(tok) {
    if (!tok) return "";
    if (typeof tok === "string") return tok;
    if (tok.tokens?.length) {
      return tok.tokens.map(DocxBuilder.tokenText).join("");
    }
    return tok.text ?? tok.raw ?? "";
  }

  /**
   * Ask the document policy for this block's direction.
   *
   * @param {string} text       the WHOLE block's text
   * @param {string} blockType  heading | paragraph | list |
   *                            table | blockquote | code
   * @param {object} [options]
   * @param {boolean|null} [options.inherited]  parent's
   *        direction; nested content never re-decides
   * @param {'rtl'|'ltr'|null} [options.explicit]  author
   *        override, reserved for markdown directives
   */
  resolveBlock(text, blockType = "paragraph", options = {}) {
    const { explicit = null, inherited = null } = options;
    if (explicit === null && inherited !== null) return inherited;
    return this.dir.resolveBlock(text, blockType, { explicit });
  }

  /* ═══════════ Public entry point ═══════════ */

  async build(markdown) {
    const { Document, Packer } = this.d;
    this.mermaidIndex = 0;

    // Safety net: the exporter should resolve the document
    // first, but a forgotten call must not fall back to
    // per-block guessing.
    if (!this.dir.resolved) this.dir.resolveDocument(markdown);

    let src = Preprocessors.footnotes(markdown);
    src = Preprocessors.callouts(src);
    src = Preprocessors.tabs(src);
    const tokens = marked.lexer(src);
    const children = this.processTokens(tokens);

    const doc = new Document({
      creator: "Markdown Editor",
      title: "Converted Document",
      numbering: this._numbering(),
      styles: this._styles(),
      sections: [
        {
          properties: {
            page: {
              size: {
                width: DocxBuilder.PAGE.width,
                height: DocxBuilder.PAGE.height,
              },
              margin: {
                top: DocxBuilder.PAGE.margin,
                right: DocxBuilder.PAGE.margin,
                bottom: DocxBuilder.PAGE.margin,
                left: DocxBuilder.PAGE.margin,
              },
            },
          },
          footers: { default: this._footer() },
          children,
        },
      ],
    });

    return Packer.toBlob(doc);
  }

  /* ═══════════ Document chrome ═══════════ */

  _numbering() {
    const { LevelFormat, AlignmentType } = this.d;

    // lvlJc stays LEFT: Word writes it that way even for
    // Arabic lists. The marker side comes from w:bidi on
    // the list paragraph, not from here.
    const levels = (format, texts) =>
      [0, 1, 2, 3].map((level) => ({
        level,
        format,
        text: texts(level),
        alignment: AlignmentType.LEFT,
        style: {
          paragraph: {
            indent: { left: 720 * (level + 1), hanging: 360 },
          },
        },
      }));

    return {
      config: [
        {
          reference: "bullets",
          levels: levels(LevelFormat.BULLET, (l) => ["•", "◦", "▪", "–"][l]),
        },
        {
          reference: "numbers",
          levels: levels(LevelFormat.DECIMAL, (l) => `%${l + 1}.`),
        },
      ],
    };
  }

  _styles() {
    const C = DocxBuilder.COLORS;
    const { head, body } = DocxBuilder.FONTS;

    const heading = (id, name, size, color, outline, before, after) => ({
      id,
      name,
      basedOn: "Normal",
      next: "Normal",
      quickFormat: true,
      run: { size, bold: true, font: head, color },
      paragraph: { spacing: { before, after }, outlineLevel: outline },
    });

    return {
      // No paragraph default on purpose: an alignment here
      // would be inherited by every paragraph and would
      // reintroduce the wrong-edge bug through the style
      // chain instead of through w:jc.
      default: {
        document: {
          run: { font: body, size: 22 },
        },
      },
      paragraphStyles: [
        heading("Heading1", "Heading 1", 36, C.h1, 0, 360, 120),
        heading("Heading2", "Heading 2", 32, C.h2, 1, 300, 100),
        heading("Heading3", "Heading 3", 28, C.h3, 2, 240, 80),
        heading("Heading4", "Heading 4", 24, C.h4, 3, 200, 60),
        heading("Heading5", "Heading 5", 22, C.h5, 4, 160, 40),
        heading("Heading6", "Heading 6", 22, C.h6, 5, 120, 40),
      ],
    };
  }

  _footer() {
    const { Footer, Paragraph, TextRun, AlignmentType, PageNumber } = this.d;
    const style = {
      font: DocxBuilder.FONTS.body,
      size: 18,
      color: DocxBuilder.COLORS.footer,
    };

    return new Footer({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ children: [PageNumber.CURRENT], ...style }),
            new TextRun({ text: " / ", ...style }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], ...style }),
          ],
        }),
      ],
    });
  }

  /* ═══════════ Run helpers ═══════════ */

  /** TextRun with w:rtl set when it carries RTL letters. */
  run(opts = {}) {
    const { TextRun } = this.d;
    const hasText = Object.prototype.hasOwnProperty.call(opts, "text");
    const text = hasText ? Utils.decodeHtmlEntities(opts.text) : undefined;
    const rtl = text !== undefined && DocxBuilder.HAS_RTL_RE.test(String(text));

    return new TextRun({
      font: DocxBuilder.FONTS.body,
      ...(rtl ? { rightToLeft: true } : {}),
      ...opts,
      ...(text !== undefined ? { text } : {}),
    });
  }

  /**
   * Paragraph whose side comes from the document policy.
   *
   * No w:jc is emitted. Word evaluates jc in the context of
   * w:bidi, and jc="right" on a bidi paragraph lands on the
   * physical LEFT edge. w:bidi alone picks the side.
   * Pass `alignment` explicitly only for CENTER or
   * JUSTIFIED, which are direction-neutral.
   */
  paragraphAuto(text = "", opts = {}) {
    const { Paragraph } = this.d;
    const {
      blockType = "paragraph",
      explicit = null,
      inherited = null,
      ...paragraphOptions
    } = opts;

    return new Paragraph({
      ...paragraphOptions,
      bidirectional: this.resolveBlock(text, blockType, {
        explicit,
        inherited,
      }),
    });
  }

  codeRun(text, color = DocxBuilder.COLORS.codeTextDark) {
    const { TextRun } = this.d;
    return new TextRun({
      text: text || " ",
      font: DocxBuilder.FONTS.mono,
      size: 18,
      color,
    });
  }

  static classColor(className, inherited) {
    let color = inherited || DocxBuilder.COLORS.codeTextDark;
    for (const cls of String(className || "").split(/\s+/)) {
      const clean = cls
        .replace(/^hljs-/, "")
        .replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
      color = DocxBuilder.HLJS_COLORS[clean] || color;
    }
    return color;
  }

  /* ═══════════ Syntax highlighting ═══════════ */

  /** Highlighted source → one array of TextRun per line. */
  highlightLines(code, lang) {
    let html;
    try {
      html =
        lang && hljs.getLanguage(lang)
          ? hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
          : Utils.esc(code);
    } catch {
      html = Utils.esc(code);
    }

    const template = document.createElement("template");
    template.innerHTML = html;
    const lines = [[]];

    const pushText = (text, color) => {
      String(text)
        .split("\n")
        .forEach((part, index) => {
          if (index > 0) lines.push([]);
          if (part) lines[lines.length - 1].push(this.codeRun(part, color));
        });
    };

    const walk = (node, color) => {
      if (node.nodeType === Node.TEXT_NODE) {
        pushText(node.nodeValue || "", color);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const next = DocxBuilder.classColor(node.className, color);
      node.childNodes.forEach((child) => walk(child, next));
    };

    template.content.childNodes.forEach((node) =>
      walk(node, DocxBuilder.COLORS.codeTextDark),
    );

    return lines.map((line) => (line.length ? line : [this.codeRun(" ")]));
  }

  /* ═══════════ Inline tokens ═══════════ */

  parseInline(tokens, inherited = {}) {
    if (!tokens?.length) return [];

    const { TextRun, ExternalHyperlink, ShadingType, UnderlineType } = this.d;
    const C = DocxBuilder.COLORS;
    const runs = [];

    for (const tok of tokens) {
      switch (tok.type) {
        case "text":
        case "escape":
          runs.push(
            this.run({ text: tok.text ?? tok.raw ?? "", ...inherited }),
          );
          break;

        case "softbreak":
          runs.push(this.run({ text: " ", ...inherited }));
          break;

        case "br":
          runs.push(new TextRun({ break: 1 }));
          break;

        case "strong":
          runs.push(
            ...this.parseInline(tok.tokens, { ...inherited, bold: true }),
          );
          break;

        case "em":
          runs.push(
            ...this.parseInline(tok.tokens, { ...inherited, italics: true }),
          );
          break;

        case "del":
          runs.push(
            ...this.parseInline(tok.tokens, { ...inherited, strike: true }),
          );
          break;

        case "codespan":
          runs.push(
            this.run({
              text: tok.text,
              font: DocxBuilder.FONTS.mono,
              size: 18,
              color: "1A1A1A",
              shading: { fill: "EFEFEF", type: ShadingType.CLEAR },
            }),
          );
          break;

        case "link": {
          const inner = this.parseInline(
            tok.tokens ?? [{ type: "text", text: tok.text ?? tok.href ?? "" }],
            {
              ...inherited,
              color: C.link,
              underline: { type: UnderlineType.SINGLE },
            },
          );
          runs.push(
            new ExternalHyperlink({ link: tok.href || "#", children: inner }),
          );
          break;
        }

        case "image":
          runs.push(
            this.run({
              text: `[Image: ${tok.text || tok.href || ""}]`,
              italics: true,
              color: "888888",
              ...inherited,
            }),
          );
          break;

        case "html": {
          const stripped = String(tok.text || "")
            .replace(/<[^>]+>/g, "")
            .trim();
          if (stripped) runs.push(this.run({ text: stripped, ...inherited }));
          break;
        }

        default:
          if (tok.tokens) runs.push(...this.parseInline(tok.tokens, inherited));
          break;
      }
    }

    return runs;
  }

  /* ═══════════ Block dispatch ═══════════ */

  processTokens(tokens) {
    const elements = [];

    for (const tok of tokens) {
      let result;
      try {
        result = this.processToken(tok);
      } catch (e) {
        // One bad token must not abort the document
        Logger.warn(`docx: token "${tok.type}" failed`, e);
        continue;
      }
      if (Array.isArray(result)) elements.push(...result);
      else if (result != null) elements.push(result);
    }

    return elements;
  }

  processToken(tok) {
    switch (tok.type) {
      case "heading":
        return this.doHeading(tok);
      case "paragraph":
        return this.doParagraph(tok);
      case "code":
        return this.doCode(tok);
      case "blockquote":
        return this.doBlockquote(tok);
      case "list":
        return this.doList(tok, 0);
      case "table":
        return this.doTable(tok);
      case "hr":
        return this.doHr();
      case "html":
        return this.doHtml(tok);
      case "space":
        return this.doSpacer();
      default:
        return null;
    }
  }

  /* ═══════════ Heading ═══════════ */

  doHeading(tok) {
    const { HeadingLevel } = this.d;
    const levels = {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
      4: HeadingLevel.HEADING_4,
      5: HeadingLevel.HEADING_5,
      6: HeadingLevel.HEADING_6,
    };

    const text = DocxBuilder.tokenText(tok);

    // blockType "heading" maps to the baseline policy:
    // an English heading between two Arabic ones keeps
    // the document's edge instead of jumping.
    return this.paragraphAuto(text, {
      blockType: "heading",
      heading: levels[tok.depth] ?? HeadingLevel.HEADING_1,
      children: this.parseInline(tok.tokens ?? [{ type: "text", text }]),
    });
  }

  /* ═══════════ Paragraph ═══════════ */

  doParagraph(tok) {
    const text = DocxBuilder.tokenText(tok);
    return this.paragraphAuto(text, {
      blockType: "paragraph",
      children: this.parseInline(
        tok.tokens ?? [{ type: "text", text: tok.text ?? "" }],
      ),
      spacing: { before: 60, after: 100 },
    });
  }

  /* ═══════════ Code / Mermaid ═══════════ */

  doCode(tok) {
    const {
      Paragraph,
      TextRun,
      ImageRun,
      AlignmentType,
      BorderStyle,
      ShadingType,
    } = this.d;

    const C = DocxBuilder.COLORS;
    const lang = (tok.lang || "").toLowerCase().trim();
    const isMermaid = lang === "mermaid";
    const barColor = isMermaid ? C.mermaidBar : C.codeBdr;
    const elements = [];

    const image = isMermaid ? this.imageMap[this.mermaidIndex++] : null;

    if (isMermaid && image?.dataUrl) {
      try {
        elements.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: Utils.dataUrlToUint8Array(image.dataUrl),
                transformation: {
                  width: image.width || 480,
                  height: image.height || 280,
                },
              }),
            ],
            spacing: { after: 160 },
          }),
        );
        return elements;
      } catch (e) {
        Logger.warn("docx: image embed failed, falling back to source", e);
      }
    }

    const headerFill = isMermaid ? "F3E8FF" : C.codeHdr;
    const headerChildren = [];

    if (!isMermaid) {
      headerChildren.push(
        new TextRun({ text: "●", color: C.winRed, size: 18, font: "Arial" }),
        new TextRun({ text: "  ", size: 14 }),
        new TextRun({ text: "●", color: C.winYellow, size: 18, font: "Arial" }),
        new TextRun({ text: "  ", size: 14 }),
        new TextRun({ text: "●", color: C.winGreen, size: 18, font: "Arial" }),
        new TextRun({ text: "     ", size: 14 }),
      );
    }

    const tabLabel = isMermaid
      ? "⬡  Mermaid Diagram"
      : `  ${lang ? lang.toUpperCase() : "CODE"}  `;

    headerChildren.push(
      new TextRun({
        text: tabLabel,
        bold: true,
        size: 16,
        color: isMermaid ? C.mermaidLbl : C.codeMuted,
        font: DocxBuilder.FONTS.mono,
        shading: { fill: "FFFFFF", type: ShadingType.CLEAR },
      }),
    );

    elements.push(
      new Paragraph({
        children: headerChildren,
        shading: { fill: headerFill, type: ShadingType.CLEAR },
        spacing: { before: 180, after: 0, line: 320 },
        indent: { left: 360, right: 360 },
        alignment: AlignmentType.LEFT,
        bidirectional: false,
        border: {
          top: { style: BorderStyle.SINGLE, size: 6, color: barColor },
          left: { style: BorderStyle.SINGLE, size: 6, color: barColor },
          right: { style: BorderStyle.SINGLE, size: 6, color: barColor },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: barColor },
        },
      }),
    );

    const lineStyle = (fill, opts = {}) => ({
      shading: { fill, type: ShadingType.CLEAR },
      spacing: { before: 0, after: 0, line: 276 },
      indent: { left: 360, right: 360 },
      alignment: AlignmentType.LEFT,
      bidirectional: false,
      border: {
        left: { style: BorderStyle.SINGLE, size: 6, color: barColor },
        right: { style: BorderStyle.SINGLE, size: 6, color: barColor },
        ...(opts.last
          ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: barColor } }
          : {}),
      },
    });

    if (isMermaid) {
      const lines = String(tok.text || "").split("\n");
      lines.forEach((line, i) => {
        elements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line || " ",
                font: DocxBuilder.FONTS.mono,
                size: 18,
                color: C.codeTextDark,
              }),
            ],
            ...lineStyle(C.mermaidBg, { last: i === lines.length - 1 }),
          }),
        );
      });
    } else {
      const lines = this.highlightLines(tok.text || "", lang);
      lines.forEach((runs, i) => {
        elements.push(
          new Paragraph({
            children: runs,
            ...lineStyle(C.codeBg, { last: i === lines.length - 1 }),
          }),
        );
      });
    }

    elements.push(
      new Paragraph({ children: [], spacing: { before: 0, after: 160 } }),
    );

    return elements;
  }

  /* ═══════════ Blockquote ═══════════ */

  doBlockquote(tok) {
    const { BorderStyle, ShadingType } = this.d;
    const C = DocxBuilder.COLORS;
    const elements = [];

    // One decision for the whole quote: its lines belong
    // together and must share an edge.
    const quoteText = DocxBuilder.tokenText(tok);
    const rtl = this.resolveBlock(quoteText, "blockquote");

    for (const child of tok.tokens ?? []) {
      if (child.type === "blockquote") {
        elements.push(...this.doBlockquote(child));
        continue;
      }

      const style = {
        color: "1F2937",
        font: DocxBuilder.FONTS.body,
        ...(rtl ? { rightToLeft: true } : {}),
      };

      const inline = child.tokens
        ? this.parseInline(child.tokens, style)
        : [this.run({ text: child.text ?? "", ...style })];

      elements.push(
        this.paragraphAuto(quoteText, {
          blockType: "blockquote",
          inherited: rtl,
          children: inline,
          // Physical sides: w:ind start/end are Strict-schema
          // names that older Word builds ignore.
          indent: rtl ? { right: 720 } : { left: 720 },
          spacing: { before: 60, after: 60 },
          shading: { fill: C.quoteBg, type: ShadingType.CLEAR },
          border: rtl
            ? {
                right: {
                  style: BorderStyle.THICK,
                  size: 16,
                  color: C.quoteBar,
                },
              }
            : {
                left: {
                  style: BorderStyle.THICK,
                  size: 16,
                  color: C.quoteBar,
                },
              },
        }),
      );
    }

    return elements;
  }

  /* ═══════════ Lists ═══════════ */

  doList(tok, level, inherited = null) {
    const { Paragraph, TextRun } = this.d;
    const reference = tok.ordered ? "numbers" : "bullets";
    const elements = [];

    // ONE decision for the whole list, taken before the
    // loop. Deciding per item is what made bullets
    // alternate sides inside a single list.
    const listText = (tok.items ?? []).map(DocxBuilder.tokenText).join(" ");
    const rtl =
      inherited !== null && inherited !== undefined
        ? inherited
        : this.resolveBlock(listText, "list");

    for (const item of tok.items ?? []) {
      const inlineTokens = [];
      const nested = [];

      // Separate this item's own content from nested lists
      for (const child of item.tokens ?? []) {
        if (child.type === "list") nested.push(child);
        else if (child.tokens) inlineTokens.push(...child.tokens);
        else inlineTokens.push(child);
      }

      const prefix = item.task
        ? [
            new TextRun({
              text: item.checked ? "☑ " : "☐ ",
              font: DocxBuilder.FONTS.body,
              color: item.checked ? "27AE60" : "AAAAAA",
            }),
          ]
        : [];

      elements.push(
        new Paragraph({
          numbering: { reference, level: Math.min(level, 3) },
          children: [
            ...prefix,
            ...this.parseInline(inlineTokens, rtl ? { rightToLeft: true } : {}),
          ],
          spacing: { before: 40, after: 40 },
          bidirectional: rtl,
        }),
      );

      // Nested lists inherit; they never re-decide
      for (const sub of nested) {
        elements.push(...this.doList(sub, level + 1, rtl));
      }
    }

    return elements;
  }

  /* ═══════════ Tables ═══════════ */

  doTable(tok) {
    const {
      Table,
      TableRow,
      TableCell,
      Paragraph,
      BorderStyle,
      WidthType,
      ShadingType,
      VerticalAlign,
    } = this.d;

    const C = DocxBuilder.COLORS;
    const columnCount = tok.header?.length || 0;
    if (!columnCount) return [];

    const columnWidth = Math.floor(this.contentWidth / columnCount);
    const edge = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
    const borders = { top: edge, bottom: edge, left: edge, right: edge };

    // Header and body decide together, once
    const tableText = [
      ...(tok.header ?? []).map(DocxBuilder.tokenText),
      ...(tok.rows ?? []).flatMap((row) => row.map(DocxBuilder.tokenText)),
    ].join(" ");
    const isRtl = this.resolveBlock(tableText, "table");

    const makeCell = (
      tokens = [],
      { isHeader = false, isAlt = false } = {},
    ) => {
      const inline = this.parseInline(
        tokens.length ? tokens : [{ type: "text", text: "" }],
        {
          bold: isHeader,
          color: isHeader ? "FFFFFF" : "1A1A1A",
          font: DocxBuilder.FONTS.body,
          ...(isRtl ? { rightToLeft: true } : {}),
        },
      );

      const shading = isHeader
        ? { shading: { fill: C.tableHdr, type: ShadingType.CLEAR } }
        : isAlt
          ? { shading: { fill: C.tableAlt, type: ShadingType.CLEAR } }
          : {};

      return new TableCell({
        borders,
        width: { size: columnWidth, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        verticalAlign: VerticalAlign.CENTER,
        ...shading,
        children: [new Paragraph({ children: inline, bidirectional: isRtl })],
      });
    };

    const rows = [
      new TableRow({
        tableHeader: true,
        children: tok.header.map((cell) =>
          makeCell(cell.tokens ?? [], { isHeader: true }),
        ),
      }),
      ...(tok.rows ?? []).map(
        (row, index) =>
          new TableRow({
            children: row.map((cell) =>
              makeCell(cell.tokens ?? [], { isAlt: index % 2 === 1 }),
            ),
          }),
      ),
    ];

    return [
      new Table({
        width: { size: this.contentWidth, type: WidthType.DXA },
        columnWidths: Array(columnCount).fill(columnWidth),
        rows,
        // w:bidiVisual — column order, a separate concern
        // from the paragraph direction inside each cell.
        visuallyRightToLeft: isRtl,
      }),
      new Paragraph({ children: [], spacing: { before: 120, after: 80 } }),
    ];
  }

  /* ═══════════ Horizontal rule ═══════════ */

  doHr() {
    const { Paragraph, BorderStyle } = this.d;
    return new Paragraph({
      children: [],
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 6,
          color: DocxBuilder.COLORS.hr,
        },
      },
      spacing: { before: 200, after: 200 },
    });
  }

  /* ═══════════ Raw HTML ═══════════ */

  doHtml(tok) {
    const raw = String(tok.text || "");

    const calloutMatch = raw.match(/data-callout="(\w+)"/);
    if (calloutMatch) return this._doCallout(calloutMatch[1], raw);

    if (/class="md-tabs"/.test(raw)) return this._doTabs(raw);

    const text = Utils.decodeHtmlEntities(raw.replace(/<[^>]+>/g, "")).trim();
    if (!text) return null;

    return this.paragraphAuto(text, {
      blockType: "paragraph",
      children: [this.run({ text, color: "888888", italics: true })],
      spacing: { before: 60, after: 60 },
    });
  }

  _doCallout(type, rawHtml) {
    const { TextRun, ShadingType, BorderStyle } = this.d;

    const PALETTE = {
      note: { bar: "0969DA", bg: "DDF4FF", fg: "0550AE" },
      info: { bar: "0969DA", bg: "DDF4FF", fg: "0550AE" },
      tip: { bar: "1A7F37", bg: "DAFBE1", fg: "116329" },
      success: { bar: "1A7F37", bg: "DAFBE1", fg: "116329" },
      warning: { bar: "9A6700", bg: "FFF8C5", fg: "7D4E00" },
      danger: { bar: "CF222E", bg: "FFEBE9", fg: "A40E26" },
      error: { bar: "CF222E", bg: "FFEBE9", fg: "A40E26" },
      quote: { bar: "6E7781", bg: "F6F8FA", fg: "57606A" },
    };
    const p = PALETTE[type] || PALETTE.note;

    const titleMatch = rawHtml.match(/class="md-callout-lbl">([^<]+)</);
    const title = titleMatch ? titleMatch[1] : type.toUpperCase();

    const bodyMatch = rawHtml.match(
      /<div class="md-callout-body">([\s\S]*?)<\/div>\s*<\/div>\s*$/,
    );
    const inner = bodyMatch ? bodyMatch[1] : "";

    const bodyText = inner
      .replace(/<\/(p|li|h[1-6]|div)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const fullText = `${title} ${bodyText}`;
    const isRtl = this.resolveBlock(fullText, "blockquote");

    const borderSpec = isRtl
      ? { right: { style: BorderStyle.THICK, size: 24, color: p.bar } }
      : { left: { style: BorderStyle.THICK, size: 24, color: p.bar } };

    const indent = isRtl ? { right: 240 } : { left: 240 };

    const elements = [];

    elements.push(
      this.paragraphAuto(title, {
        blockType: "blockquote",
        inherited: isRtl,
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 18,
            color: p.fg,
            font: DocxBuilder.FONTS.body,
          }),
        ],
        shading: { fill: p.bg, type: ShadingType.CLEAR },
        border: borderSpec,
        spacing: { before: 140, after: 0 },
        indent,
      }),
    );

    const blocks = bodyText.split(/\n\n+/);
    blocks.forEach((block, i) => {
      elements.push(
        this.paragraphAuto(block, {
          blockType: "blockquote",
          inherited: isRtl,
          children: [new TextRun({ text: block, size: 22 })],
          shading: { fill: p.bg, type: ShadingType.CLEAR },
          border: borderSpec,
          spacing: { before: 0, after: i === blocks.length - 1 ? 180 : 80 },
          indent,
        }),
      );
    });

    return elements;
  }

  _doTabs(rawHtml) {
    const { TextRun } = this.d;

    const titles = [
      ...rawHtml.matchAll(/class="md-tab[^"]*"[^>]*>([^<]+)<\/button>/g),
    ].map((m) => m[1].trim());

    const panels = [];
    const panelRe =
      /<div class="md-tab-panel[^"]*"[^>]*>([\s\S]*?)(?=<div class="md-tab-panel|<\/div>\s*<\/div>\s*$)/g;
    let m;
    while ((m = panelRe.exec(rawHtml)) !== null) panels.push(m[1]);

    const elements = [];

    panels.forEach((panel, i) => {
      const title = titles[i] || `Tab ${i + 1}`;

      const text = panel
        .replace(/<\/(p|li|h[1-6]|div|pre)>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      const isRtl = this.resolveBlock(`${title} ${text}`, "blockquote");

      const indent = isRtl ? { right: 240 } : { left: 240 };

      elements.push(
        this.paragraphAuto(title, {
          blockType: "heading",
          inherited: isRtl,
          children: [
            new TextRun({
              text: `▸ ${title}`,
              bold: true,
              size: 22,
              color: DocxBuilder.COLORS.h2,
            }),
          ],
          spacing: { before: i === 0 ? 160 : 240, after: 60 },
        }),
      );

      if (text) {
        elements.push(
          this.paragraphAuto(text, {
            blockType: "blockquote",
            inherited: isRtl,
            children: [new TextRun({ text, size: 22 })],
            spacing: { after: 120 },
            indent,
          }),
        );
      }
    });

    return elements;
  }

  /* ═══════════ Spacer ═══════════ */

  doSpacer() {
    const { Paragraph } = this.d;
    return new Paragraph({
      children: [],
      spacing: { before: 80, after: 80 },
    });
  }
}
