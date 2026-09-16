/* ═══════════════════════════════════════════════
   pptx.exporter.js — One slide per top-level heading.

   Content is intentionally shallow: headings, bullet
   text and diagram images. Tables and code keep their
   source text.
   ═══════════════════════════════════════════════ */

class PptxExporter extends BaseExporter {
  static id = "pptx";
  static extension = "pptx";
  static MAX_BULLETS = 8;

  async run() {
    const PptxGenJS =
      window.PptxGenJS ??
      (await LazyLoader.ensureGlobal("PptxGenJS", VENDOR.pptx));
    if (!PptxGenJS) throw new Error(this.i18n.t("libraryError"));

    DOM.flashStatus(this.i18n.t("preparingDiagrams"), 0);
    const images = await new WordExporter(this.ctx).captureDiagrams();

    const deck = new PptxGenJS();
    deck.layout = "LAYOUT_16x9";

    const slides = this._toSlides(marked.lexer(this.markdown));
    let diagramIndex = 0;

    for (const slide of slides) {
      const page = deck.addSlide();
      page.addText(slide.title, {
        x: 0.5, y: 0.4, w: 9, h: 0.8,
        fontSize: 26, bold: true, color: "1F3864",
        align: this._align(slide.title),
      });

      if (slide.diagrams.length) {
        const image = images[diagramIndex + slide.diagrams[0]];
        if (image?.dataUrl) {
          page.addImage({ data: image.dataUrl, x: 1.2, y: 1.4, w: 7, h: 3.6 });
        }
      } else if (slide.bullets.length) {
        page.addText(
          slide.bullets.slice(0, PptxExporter.MAX_BULLETS).map((text) => ({
            text,
            options: { bullet: true, breakLine: true },
          })),
          {
            x: 0.7, y: 1.4, w: 8.6, h: 3.8,
            fontSize: 16, color: "1A1A1A",
            align: this._align(slide.bullets[0] ?? ""),
          },
        );
      }
      diagramIndex += slide.diagrams.length;
    }

    const blob = await deck.write({ outputType: "blob" });
    Utils.dlBlob(blob, this.filename());
  }

  _align(text) {
    return Utils.hasArabic(text) ? "right" : "left";
  }

  /** Group tokens into slides, splitting on h1/h2. */
  _toSlides(tokens) {
    const slides = [];
    let current = null;
    let mermaidCount = 0;

    const start = (title) => {
      current = { title, bullets: [], diagrams: [] };
      slides.push(current);
    };

    for (const tok of tokens) {
      if (tok.type === "heading" && tok.depth <= 2) {
        start(tok.text);
        continue;
      }
      if (!current) start(this.i18n.t("appTitle"));

      if (tok.type === "heading") {
        current.bullets.push(tok.text);
      } else if (tok.type === "paragraph") {
        current.bullets.push(tok.text.replace(/[*_`]/g, ""));
      } else if (tok.type === "list") {
        tok.items.forEach((item) =>
          current.bullets.push(item.text.replace(/[*_`]/g, "")),
        );
      } else if (tok.type === "code") {
        const lang = (tok.lang || "").toLowerCase().trim();
        if (lang === "mermaid") {
          current.diagrams.push(mermaidCount);
          mermaidCount++;
        }
      }
    }
    return slides.filter((slide) => slide.title);
  }
}
