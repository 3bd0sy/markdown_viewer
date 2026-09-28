/* ═══════════════════════════════════════════════
   docx-code-renderer.js — Fenced code blocks: regular
   syntax-highlighted source, and the Mermaid/Plotly
   diagram fences that fall back to a labeled source
   block when no pre-rendered image is available.

   ```map fences are NOT handled here — DocxTokenRenderer
   checks the fence language before dispatching and sends
   "map" straight to DocxMapRenderer, so this file never
   needs a reference to that renderer.
   ═══════════════════════════════════════════════ */

class DocxCodeRenderer {
  constructor(context) {
    this.ctx = context;
    this.d = context.d;
  }

  codeRun(text, color = DOCX_THEME.colors.codeTextDark) {
    const { TextRun } = this.d;
    return new TextRun({
      text: text || " ",
      font: DOCX_THEME.fonts.mono,
      size: 18,
      color,
      noProof: true,
    });
  }

  static classColor(className, inherited) {
    let color = inherited || DOCX_THEME.colors.codeTextDark;
    for (const cls of String(className || "").split(/\s+/)) {
      const clean = cls
        .replace(/^hljs-/, "")
        .replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
      color = DOCX_THEME.hljsColors[clean] || color;
    }
    return color;
  }

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
      const next = DocxCodeRenderer.classColor(node.className, color);
      node.childNodes.forEach((child) => walk(child, next));
    };

    template.content.childNodes.forEach((node) =>
      walk(node, DOCX_THEME.colors.codeTextDark),
    );

    return lines.map((line) => (line.length ? line : [this.codeRun(" ")]));
  }

  render(tok) {
    const {
      Paragraph,
      TextRun,
      ImageRun,
      AlignmentType,
      BorderStyle,
      ShadingType,
    } = this.d;

    const C = DOCX_THEME.colors;
    const lang = (tok.lang || "").toLowerCase().trim();
    const isMermaid = lang === "mermaid";
    const isPlotly = lang === "plotly";
    // Any language WordExporter.captureDiagrams() pre-renders
    // to a PNG. Add new diagram types to BOTH this check and
    // WordExporter.DIAGRAM_LANGS — never to just one side, or
    // the shared image index goes out of sync.
    const isDiagram = isMermaid || isPlotly;
    const barColor = isMermaid
      ? C.mermaidBar
      : isPlotly
        ? C.plotlyBar
        : C.codeBdr;
    const elements = [];

    // One shared counter for every diagram type, incremented
    // only when we actually see a diagram fence — regular code
    // blocks never touch it. This is what keeps this index
    // aligned with WordExporter's single-pass raw-source scan.
    const image = isDiagram ? this.ctx.nextDiagram() : null;

    if (isDiagram && image?.dataUrl) {
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

    // No image (capture failed, or the export ran without
    // WordExporter's pre-render step) → fall back to a
    // labeled source block, same chrome as a regular code
    // block but tinted per diagram type.
    const headerFill = isMermaid ? "F3E8FF" : isPlotly ? C.plotlyBg : C.codeHdr;
    const headerChildren = [];

    if (!isDiagram) {
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
      : isPlotly
        ? "📊  Plotly Chart"
        : `  ${lang ? lang.toUpperCase() : "CODE"}  `;

    headerChildren.push(
      new TextRun({
        text: tabLabel,
        bold: true,
        size: 16,
        color: isMermaid ? C.mermaidLbl : isPlotly ? C.plotlyLbl : C.codeMuted,
        font: DOCX_THEME.fonts.mono,
        shading: { fill: "FFFFFF", type: ShadingType.CLEAR },
      }),
    );

    if (!this.ctx.suppressCodeHeader) {
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
    }

    const lineStyle = (fill, opts = {}) => ({
      shading: { fill, type: ShadingType.CLEAR },
      spacing: {
        before: 0,
        after: 0,
        line: 276,
      },
      indent: { left: 360, right: 360 },
      alignment: AlignmentType.LEFT,
      bidirectional: false,
      border: {
        ...(this.ctx.suppressCodeHeader && opts.first
          ? {
              top: {
                style: BorderStyle.SINGLE,
                size: 6,
                color: barColor,
              },
            }
          : {}),
        left: { style: BorderStyle.SINGLE, size: 6, color: barColor },
        right: { style: BorderStyle.SINGLE, size: 6, color: barColor },
        ...(opts.last
          ? {
              bottom: {
                style: BorderStyle.SINGLE,
                size: 6,
                color: barColor,
              },
            }
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
                font: DOCX_THEME.fonts.mono,
                size: 18,
                color: C.codeTextDark,
                noProof: true,
              }),
            ],
            ...lineStyle(C.mermaidBg, {
              first: i === 0,
              last: i === lines.length - 1,
            }),
          }),
        );
      });
    } else if (isPlotly) {
      // The fence body is JSON ({ data, layout }) — syntax-
      // highlight it as such rather than showing flat mono
      // text, same as any other language falls back to source.
      const lines = this.highlightLines(tok.text || "", "json");
      lines.forEach((runs, i) => {
        elements.push(
          new Paragraph({
            children: runs,
            ...lineStyle(C.plotlyBg, {
              first: i === 0,
              last: i === lines.length - 1,
            }),
          }),
        );
      });
    } else {
      const lines = this.highlightLines(tok.text || "", lang);
      lines.forEach((runs, i) => {
        elements.push(
          new Paragraph({
            children: runs,
            ...lineStyle(C.codeBg, {
              first: i === 0,
              last: i === lines.length - 1,
            }),
          }),
        );
      });
    }

    elements.push(
      new Paragraph({ children: [], spacing: { before: 0, after: 160 } }),
    );

    return elements;
  }
}
