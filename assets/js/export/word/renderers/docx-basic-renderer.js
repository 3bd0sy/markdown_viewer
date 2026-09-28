/* ═══════════════════════════════════════════════
   docx-basic-renderer.js — Headings, paragraphs,
   blockquotes, lists, horizontal rules, spacers, and
   the plain-HTML fallback paragraph.

   Grid / callout / tab markers embedded in "html" tokens
   are recognized and dispatched by DocxTokenRenderer, not
   here — this renderer only builds the italic fallback
   paragraph for HTML it doesn't otherwise understand.
   Keeping that dispatch out of this file means
   DocxBasicRenderer never needs a reference to the grid,
   tabs or callout renderers.
   ═══════════════════════════════════════════════ */

class DocxBasicRenderer {
  constructor({ context, inline }) {
    this.ctx = context;
    this.inline = inline;
    this.d = context.d;
  }

  /* ═══════════ Heading ═══════════ */

  heading(tok) {
    const { HeadingLevel } = this.d;
    const levels = {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
      4: HeadingLevel.HEADING_4,
      5: HeadingLevel.HEADING_5,
      6: HeadingLevel.HEADING_6,
    };

    const text = DocxTextUtils.tokenText(tok);

    // blockType "heading" maps to the baseline policy:
    // an English heading between two Arabic ones keeps
    // the document's edge instead of jumping.
    return this.inline.paragraphAuto(text, {
      blockType: "heading",
      heading: levels[tok.depth] ?? HeadingLevel.HEADING_1,
      children: this.inline.parseInline(tok.tokens ?? [{ type: "text", text }]),
    });
  }

  /* ═══════════ Paragraph ═══════════ */

  paragraph(tok) {
    const text = DocxTextUtils.tokenText(tok);
    return this.inline.paragraphAuto(text, {
      blockType: "paragraph",
      children: this.inline.parseInline(
        tok.tokens ?? [{ type: "text", text: tok.text ?? "" }],
      ),
      spacing: { before: 60, after: 100 },
    });
  }

  /* ═══════════ Blockquote ═══════════ */

  blockquote(tok) {
    const { BorderStyle, ShadingType } = this.d;
    const C = DOCX_THEME.colors;
    const elements = [];

    // One decision for the whole quote: its lines belong
    // together and must share an edge.
    const quoteText = DocxTextUtils.tokenText(tok);
    const rtl = this.ctx.resolveBlock(quoteText, "blockquote");

    for (const child of tok.tokens ?? []) {
      if (child.type === "blockquote") {
        elements.push(...this.blockquote(child));
        continue;
      }

      const style = {
        color: "1F2937",
        font: DOCX_THEME.fonts.body,
        ...(rtl ? { rightToLeft: true } : {}),
      };

      const inline = child.tokens
        ? this.inline.parseInline(child.tokens, style)
        : [this.inline.run({ text: child.text ?? "", ...style })];

      elements.push(
        this.inline.paragraphAuto(quoteText, {
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

  list(tok, level, inherited = null) {
    const { Paragraph, TextRun } = this.d;
    const reference = tok.ordered ? "numbers" : "bullets";
    const elements = [];

    // ONE decision for the whole list, taken before the
    // loop. Deciding per item is what made bullets
    // alternate sides inside a single list.
    const listText = (tok.items ?? []).map(DocxTextUtils.tokenText).join(" ");
    const rtl =
      inherited !== null && inherited !== undefined
        ? inherited
        : this.ctx.resolveBlock(listText, "list");

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
              font: DOCX_THEME.fonts.body,
              color: item.checked ? "27AE60" : "AAAAAA",
            }),
          ]
        : [];

      elements.push(
        new Paragraph({
          numbering: { reference, level: Math.min(level, 3) },
          children: [
            ...prefix,
            ...this.inline.parseInline(
              inlineTokens,
              rtl ? { rightToLeft: true } : {},
            ),
          ],
          spacing: { before: 40, after: 40 },
          bidirectional: rtl,
        }),
      );

      // Nested lists inherit; they never re-decide
      for (const sub of nested) {
        elements.push(...this.list(sub, level + 1, rtl));
      }
    }

    return elements;
  }

  /* ═══════════ Horizontal rule ═══════════ */

  hr() {
    const { Paragraph, BorderStyle } = this.d;
    return new Paragraph({
      children: [],
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 6,
          color: DOCX_THEME.colors.hr,
        },
      },
      spacing: { before: 200, after: 200 },
    });
  }

  /* ═══════════ Plain-HTML fallback ═══════════ */

  /**
   * Builds the italic fallback paragraph for an "html"
   * token that isn't a grid/callout/tabs marker. Those
   * markers are matched and routed by
   * DocxTokenRenderer.renderHtml() BEFORE this method ever
   * runs — see docx-token-renderer.js.
   */
  html(tok) {
    const raw = String(tok.text || "");
    const text = DocxTextUtils.decode(raw.replace(/<[^>]+>/g, "")).trim();
    if (!text) return null;

    return this.inline.paragraphAuto(text, {
      blockType: "paragraph",
      children: [this.inline.run({ text, color: "888888", italics: true })],
      spacing: { before: 60, after: 60 },
    });
  }

  /* ═══════════ Spacer ═══════════ */

  spacer() {
    const { Paragraph } = this.d;
    return new Paragraph({
      children: [],
      spacing: { before: 80, after: 80 },
    });
  }
}
