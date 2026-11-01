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

  static readBraceGroup(source, offset = 0) {
    if (!source || source[offset] !== "{") return null;
    let depth = 0;

    for (let i = offset; i < source.length; i++) {
      const ch = source[i];
      if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          return {
            value: source.slice(offset + 1, i),
            rest: source.slice(i + 1),
          };
        }
      }
    }

    return null;
  }

  static decodeLatexToken(token) {
    const map = {
      alpha: "α",
      beta: "β",
      gamma: "γ",
      delta: "δ",
      epsilon: "ε",
      theta: "θ",
      lambda: "λ",
      mu: "μ",
      pi: "π",
      sigma: "σ",
      omega: "ω",
      Omega: "Ω",
      Phi: "Φ",
      sum: "∑",
      prod: "∏",
      int: "∫",
      lim: "lim",
      infty: "∞",
      cdot: "⋅",
      times: "×",
      pm: "±",
      neq: "≠",
      approx: "≈",
      ldots: "…",
      cdots: "⋯",
      dots: "…",
      sqrt: "√",
      left: "",
      right: "",
      mathbb: null,
      mathcal: null,
      mathit: null,
    };

    return map[token] ?? null;
  }

  static parseLatexMathNode(expression, docxLib) {
    const nodes = DocxMathParser.parseSequence(expression, docxLib);
    if (!nodes.length) return null;
    return nodes.length === 1 ? nodes[0] : nodes;
  }

  static parseLatexMathSequence(expression, docxLib) {
    return DocxMathParser.parseSequence(expression, docxLib);
  }

  static createMathNode(latexText, docxLib) {
    return DocxMathParser.createMathNode(latexText, docxLib);
  }

  parseMathAwareText(rawText, inherited = {}) {
    const text = String(rawText ?? "");
    const pattern = /«MATH_[^»]+»/g;
    const mathMap = this.ctx.imageMap?.math || Object.create(null);
    const runs = [];
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        runs.push(this.runs({ text: text.slice(lastIndex, match.index), ...inherited }));
      }

      const mathKey = match[0];
      const entry = mathMap[mathKey];
      if (!entry) {
        throw new DocxMathConversionError(`Unresolved Word Math placeholder ${mathKey}.`, mathKey);
      }

      const expression = typeof entry === "string" ? entry : entry.text;
      if (!expression) {
        throw new DocxMathConversionError(`Word Math placeholder ${mathKey} has no LaTeX source.`, mathKey);
      }

      const mathNode = DocxInlineRenderer.createMathNode(expression, this.d);
      if (!mathNode) {
        throw new DocxMathConversionError(`LaTeX conversion produced no Word Math node for ${mathKey}.`, expression);
      }
      this.ctx.resolvedMathKeys?.add(mathKey);
      runs.push(mathNode);
      lastIndex = pattern.lastIndex;
    }

    if (lastIndex < text.length) {
      runs.push(this.runs({ text: text.slice(lastIndex), ...inherited }));
    }
    return runs.flat(Infinity);
  }

  imageRun({ src, alt = "", title = "", width = "", height = "" }, inherited = {}) {
    const { ImageRun, ExternalHyperlink } = this.d;
    const source = String(src ?? "");
    const isInlineSvg = source.startsWith("svg:");
    const safeSource = isInlineSvg ? "" : DocxMediaUtils.normalizeImageSource(source);
    const key = isInlineSvg ? source : DocxMediaUtils.imageKey(safeSource || source);
    const image = isInlineSvg
      ? this.ctx.imageMap?.inlineSvgs?.[key]
      : this.ctx.imageMap?.images?.[key];

    if (image?.dataUrl && typeof ImageRun === "function") {
      try {
        const maxWidth = Math.max(1, Math.floor((this.ctx.contentWidth || DOCX_THEME.page.width) / 15));
        const transformation = DocxMediaUtils.fitDimensions(image, width, height, maxWidth, 600);
        return new ImageRun({
          data: Utils.dataUrlToUint8Array(image.dataUrl),
          transformation,
          altText: {
            name: title || alt || "Image",
            description: alt || title || "",
            title: title || "",
          },
        });
      } catch (error) {
        Logger.warn("docx: embedded image could not be created", error);
      }
    }

    const label = alt || title || (safeSource ? "image" : "unsupported image");
    const fallback = this.run({
      text: `[Image: ${label}]`,
      italics: true,
      color: "888888",
      ...inherited,
    });
    const href = DocxMediaUtils.safeLink(safeSource);
    return href && ExternalHyperlink
      ? new ExternalHyperlink({ link: href, children: [fallback] })
      : fallback;
  }

  renderHtmlSegments(segments, inherited = {}) {
    const { TextRun, ExternalHyperlink } = this.d;
    const output = [];

    for (const segment of segments || []) {
      if (segment.type === "text") {
        output.push(...this.parseMathAwareText(segment.text, inherited));
      } else if (segment.type === "break") {
        output.push(new TextRun({ break: 1 }));
      } else if (segment.type === "image") {
        output.push(this.imageRun(segment, inherited));
      } else if (segment.type === "svg") {
        const key = DocxMediaUtils.svgKey(segment.markup);
        const image = this.ctx.imageMap?.inlineSvgs?.[key];
        output.push(image?.dataUrl
          ? this.imageRun({ src: key, alt: segment.alt })
          : this.run({ text: `[Image: ${segment.alt || "SVG image"}]`, italics: true, color: "888888", ...inherited }));
      } else if (segment.type === "container-marker") {
        output.push(this.run({ text: `[${segment.marker}]`, ...inherited }));
      } else if (segment.type === "link") {
        const children = this.renderHtmlSegments(segment.children, inherited);
        const href = DocxMediaUtils.safeLink(segment.href);
        output.push(href && ExternalHyperlink
          ? new ExternalHyperlink({ link: href, children })
          : children);
      } else if (segment.type === "media") {
        if (segment.poster?.src) output.push(this.imageRun(segment.poster, inherited));
        const href = DocxMediaUtils.safeLink(segment.src);
        const label = segment.title || segment.src || (segment.kind === "audio" ? "audio file" : "video file");
        if (href && ExternalHyperlink) {
          output.push(new ExternalHyperlink({
            link: href,
            children: [this.run({ text: `[${segment.kind === "audio" ? "Audio" : "Video"}: ${label}]`, ...inherited })],
          }));
        } else if (label) {
          output.push(this.run({ text: `[${segment.kind === "audio" ? "Audio" : "Video"}: ${label}]`, ...inherited }));
        } else {
          output.push(...this.renderHtmlSegments(segment.children, inherited));
        }
      }
    }
    return output.flat(Infinity);
  }

  mediaLinkParagraph(kind, source, label = "") {
    const { ExternalHyperlink } = this.d;
    const href = DocxMediaUtils.safeLink(source);
    const text = label || source || `${kind} file`;
    const child = this.run({ text: `[${kind}: ${text}]`, color: DOCX_THEME.colors.link });
    const children = href && ExternalHyperlink
      ? [new ExternalHyperlink({ link: href, children: [child] })]
      : [child];
    return this.paragraphAuto(text, {
      blockType: "paragraph",
      children,
      spacing: { before: 60, after: 80 },
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
        case "escape": {
          const rawText = tok.text ?? tok.raw ?? "";
          runs.push(this.parseMathAwareText(rawText, inherited));
          break;
        }

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
          runs.push(this.imageRun({
            src: tok.href || tok.src,
            alt: tok.text || "",
            title: tok.title || "",
          }, inherited));
          break;

        case "html": {
          const segments = DocxMediaUtils.parseHtmlFragment(tok.text || tok.raw || "");
          runs.push(this.renderHtmlSegments(segments, inherited));
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
