/* ═══════════════════════════════════════════════
   word.exporter.js — DOCX export.

   Diagrams are re-rendered from the markdown source
   rather than scraped from the preview, so lazily
   drawn (or off-screen) diagrams still make it into
   the file, and the order always matches the document.
   ═══════════════════════════════════════════════ */

class WordExporter extends BaseExporter {
  static id = "word";
  static extension = "docx";

  async run() {
    const docx = await LazyLoader.ensureGlobal("docx", VENDOR.docx);
    if (!docx) throw new Error(this.i18n.t("libraryError"));

    DOM.flashStatus(this.i18n.t("preparingDiagrams"), 0);
    const imageMap = await this.captureDiagrams();

    const builder = new DocxBuilder(docx, imageMap, this.i18n.isRtl);
    const blob = await builder.build(this.markdown);
    Utils.dlBlob(blob, this.filename());
  }

  /**
   * Render every mermaid fence to a PNG.
   * @returns {Promise<object>} keyed by diagram order
   */
  async captureDiagrams() {
    const sources = marked
      .lexer(this.markdown)
      .filter(
        (tok) =>
          tok.type === "code" &&
          (tok.lang || "").toLowerCase().trim() === "mermaid",
      )
      .map((tok) => tok.text);

    if (!sources.length) return {};

    const stage = document.createElement("div");
    stage.className = "offscreen-stage";
    document.body.appendChild(stage);

    const imageMap = {};
    try {
      for (let index = 0; index < sources.length; index++) {
        try {
          const dataUrl = await this._capture(
            sources[index],
            stage,
            imageMap,
            index,
          );
          if (!dataUrl) Logger.warn(`diagram ${index} produced no image`);
        } catch (e) {
          Logger.warn(`diagram ${index} failed to export`, e);
        }
        await Utils.yieldToBrowser();
      }
    } finally {
      stage.remove();
    }
    return imageMap;
  }

  async _capture(source, stage, imageMap, index) {
    // theme:base keeps diagrams legible on a white page;
    // htmlLabels:false produces real SVG text the canvas can draw.
    const svg = await this.ctx.mermaid.renderSource(source, {
      theme: "base",
      htmlLabels: false,
      flowchart: { htmlLabels: false, useMaxWidth: false },
    });

    stage.innerHTML = svg;
    const svgEl = stage.querySelector("svg");
    if (!svgEl) return null;

    const { width, height } = Utils.getSvgDimensions(svgEl);
    const fitted = Utils.fitImageSize(width, height);

    // 2x for print quality
    if (width > 0) svgEl.setAttribute("width", width * 2);
    if (height > 0) svgEl.setAttribute("height", height * 2);

    const background = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect",
    );
    background.setAttribute("width", "100%");
    background.setAttribute("height", "100%");
    background.setAttribute("fill", "#ffffff");
    svgEl.insertBefore(background, svgEl.firstChild);

    const dataUrl = await Utils.svgToPngDataUrl(svgEl);
    if (dataUrl) {
      imageMap[index] = { dataUrl, width: fitted.width, height: fitted.height };
    }
    return dataUrl;
  }
}
