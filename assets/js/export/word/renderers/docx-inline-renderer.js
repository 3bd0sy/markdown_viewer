/* ═══════════════════════════════════════════════
   docx-inline-renderer.js — Text-run level rendering:
   plain runs with automatic RTL flagging, the
   direction-aware paragraph wrapper every block-level
   renderer builds on, and marked.js inline tokens → runs.
   ═══════════════════════════════════════════════ */

class DocxInlineRenderer {
  constructor(context) {
    this.ctx = context;
    this.d = context.d;
  }

  /**
   * A Latin phrase: words joined by a single space or one of
   * _ . - / + # :  — kept together so runs() never splits
   * "Dry run" into two LTR runs with an RTL space between them.
   */
  static LATIN_PHRASE = /[A-Za-z][A-Za-z0-9]*(?:[ _.\-\/+#:][A-Za-z0-9]+)*/g;

  /** TextRun with w:rtl set when it carries RTL letters. */
  run(opts = {}) {
    const { TextRun } = this.d;
    const { rightToLeft, language, ...rest } = opts;
    const hasText = Object.prototype.hasOwnProperty.call(opts, "text");
    const text = hasText ? DocxTextUtils.decode(opts.text) : undefined;

    const hasRtl = text !== undefined && DocxTextUtils.hasRtl(text);
    const hasLatin = text !== undefined && /[A-Za-z]/.test(text);

    let rtl = rightToLeft === true;
    if (hasRtl) rtl = true;
    else if (hasLatin) rtl = false;

    const lang =
      language ??
      (hasRtl
        ? { bidirectional: DOCX_THEME.lang.bidi }
        : hasLatin
          ? { value: DOCX_THEME.lang.latin }
          : undefined);

    return new TextRun({
      font: DOCX_THEME.fonts.body,
      ...(rtl ? { rightToLeft: true } : {}),
      ...(lang ? { language: lang } : {}),
      ...rest,
      ...(text !== undefined ? { text } : {}),
    });
  }
  runs(opts = {}) {
    const text =
      typeof opts.text === "string" ? DocxTextUtils.decode(opts.text) : null;

    if (text === null || !DocxTextUtils.hasRtl(text)) return [this.run(opts)];

    const out = [];
    let last = 0;
    const re = new RegExp(DocxInlineRenderer.LATIN_PHRASE.source, "g");

    for (const m of text.matchAll(re)) {
      if (m.index > last) {
        out.push(
          this.run({
            ...opts,
            text: text.slice(last, m.index),
            rightToLeft: true,
          }),
        );
      }
      out.push(this.run({ ...opts, text: m[0], rightToLeft: false }));
      last = m.index + m[0].length;
    }
    if (last < text.length) {
      out.push(
        this.run({ ...opts, text: text.slice(last), rightToLeft: true }),
      );
    }
    return out;
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

    if (Array.isArray(paragraphOptions.children)) {
      paragraphOptions.children = paragraphOptions.children.flat(Infinity);
    }

    return new Paragraph({
      ...paragraphOptions,
      bidirectional: this.ctx.resolveBlock(text, blockType, {
        explicit,
        inherited,
      }),
    });
  }

  parseInline(tokens, inherited = {}) {
    if (!tokens?.length) return [];

    const { TextRun, ExternalHyperlink, ShadingType, UnderlineType } = this.d;
    const C = DOCX_THEME.colors;
    const runs = [];

    for (const tok of tokens) {
      switch (tok.type) {
        case "text":
        case "escape":
          runs.push(
            this.runs({ text: tok.text ?? tok.raw ?? "", ...inherited }),
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
              font: DOCX_THEME.fonts.mono,
              size: 18,
              color: "1A1A1A",
              noProof: true,
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

    return runs.flat(Infinity);
  }
}
