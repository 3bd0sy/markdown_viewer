/* ═══════════════════════════════════════════════
   docx-callout-renderer.js — Admonition-style callouts
   (note/tip/warning/danger/quote) rendered as a tinted,
   side-bordered block. Its already-rendered HTML body is
   parsed into text/media segments; grid and tab markers
   recurse through the shared token renderer.
   ═══════════════════════════════════════════════ */

class DocxCalloutRenderer {
  constructor({ context, inline, renderTokens = null }) {
    this.ctx = context;
    this.inline = inline;
    this.renderTokens = renderTokens;
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

    const inner = DocxMediaUtils.extractCalloutBody(rawHtml);
    const bodySegments = DocxMediaUtils.parseHtmlFragment(inner);
    const bodyText = bodySegments
      .map((segment) => {
        if (segment.type === "break") return "\n";
        if (segment.type === "text") return segment.text;
        if (segment.type === "image" || segment.type === "svg") return segment.alt || "image";
        if (segment.type === "media") return segment.title || segment.src || segment.kind;
        if (segment.type === "link") return segment.children.map((child) => child.text || child.alt || "").join("");
        return "";
      })
      .join("")
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
        children: this.inline.parseInline(
          [{ type: "text", text: title }],
          {
            bold: true,
            size: 18,
            color: p.fg,
            font: DOCX_THEME.fonts.body,
            rightToLeft: isRtl,
          },
        ),
        shading: { fill: p.bg, type: ShadingType.CLEAR },
        border: borderSpec,
        spacing: { before: 140, after: 0 },
        indent,
      }),
    );

    const bodyBlocks = [];
    let currentBlock = [];
    const flushBlock = () => {
      if (currentBlock.length) bodyBlocks.push(currentBlock);
      currentBlock = [];
    };

    for (const segment of bodySegments) {
      if (segment.type === "container-marker") {
        flushBlock();
        const match = /^(MD-GRID|MD-TABS):(\d+)$/.exec(segment.marker);
        const rendered = match && this.renderTokens
          ? this.renderTokens([{ type: "html", text: `<!--${segment.marker}-->` }])
          : [];
        if (rendered?.length) elements.push(...rendered);
        else currentBlock.push({ type: "text", text: `[${segment.marker}]` });
      } else if (segment.type === "break") {
        flushBlock();
      } else {
        currentBlock.push(segment);
      }
    }
    flushBlock();

    bodyBlocks.forEach((segments, index) => {
      const text = segments
        .map((segment) => segment.type === "text" ? segment.text : segment.alt || segment.src || "")
        .join(" ")
        .trim();
      elements.push(
        this.inline.paragraphAuto(text, {
          blockType: "blockquote",
          inherited: isRtl,
          children: this.inline.renderHtmlSegments(segments, { size: 22, rightToLeft: isRtl }),
          shading: { fill: p.bg, type: ShadingType.CLEAR },
          border: borderSpec,
          spacing: { before: 0, after: index === bodyBlocks.length - 1 ? 180 : 80 },
          indent,
        }),
      );
    });

    return elements;
  }
}
