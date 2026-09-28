/* ═══════════════════════════════════════════════
   docx-callout-renderer.js — Admonition-style callouts
   (note/tip/warning/danger/quote) rendered as a tinted,
   side-bordered block. The body text is extracted from
   the already-rendered HTML rather than re-parsed as
   Markdown — callouts do not currently support nested
   Markdown constructs, so this renderer (unlike Grid and
   Tabs) doesn't need a renderTokens callback.
   ═══════════════════════════════════════════════ */

class DocxCalloutRenderer {
  constructor({ context, inline }) {
    this.ctx = context;
    this.inline = inline;
    this.d = context.d;
  }

  render(type, rawHtml) {
    const { ShadingType, BorderStyle } = this.d;

    const PALETTE = {
      tip: { bar: "1A7F37", bg: "DAFBE1", fg: "116329" },
      note: { bar: "0969DA", bg: "DDF4FF", fg: "0550AE" },
      info: { bar: "0969DA", bg: "DDF4FF", fg: "0550AE" },
      error: { bar: "CF222E", bg: "FFEBE9", fg: "A40E26" },
      quote: { bar: "6E7781", bg: "F6F8FA", fg: "57606A" },
      danger: { bar: "CF222E", bg: "FFEBE9", fg: "A40E26" },
      success: { bar: "1A7F37", bg: "DAFBE1", fg: "116329" },
      warning: { bar: "9A6700", bg: "FFF8C5", fg: "7D4E00" },
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
    const isRtl = this.ctx.resolveBlock(fullText, "blockquote");

    const borderSpec = isRtl
      ? { right: { style: BorderStyle.THICK, size: 24, color: p.bar } }
      : { left: { style: BorderStyle.THICK, size: 24, color: p.bar } };

    const indent = isRtl ? { right: 240 } : { left: 240 };

    const elements = [];

    elements.push(
      this.inline.paragraphAuto(title, {
        blockType: "blockquote",
        inherited: isRtl,
        children: [
          new this.inline.runs({
            text: title,
            bold: true,
            size: 18,
            color: p.fg,
            font: DOCX_THEME.fonts.body,
            rightToLeft: isRtl,
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
        this.inline.paragraphAuto(block, {
          blockType: "blockquote",
          inherited: isRtl,
          children: [
            new this.inline.runs({ text: block, size: 22, rightToLeft: isRtl }),
          ],
          shading: { fill: p.bg, type: ShadingType.CLEAR },
          border: borderSpec,
          spacing: { before: 0, after: i === blocks.length - 1 ? 180 : 80 },
          indent,
        }),
      );
    });

    return elements;
  }
}
