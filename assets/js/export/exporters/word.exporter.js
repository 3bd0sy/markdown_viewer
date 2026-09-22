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

  static DIAGRAM_LANGS = new Set(["mermaid", "plotly"]);

  async run() {
    const docx = await LazyLoader.ensureGlobal("docx", VENDOR.docx);
    if (!docx) throw new Error(this.i18n.t("libraryError"));

    DOM.flashStatus(this.i18n.t("preparingDiagrams"), 0);
    const imageMap = await this.captureDiagrams();

    const builder = new DocxBuilder(docx, imageMap, this.i18n.isRtl);
    const blob = await builder.build(this.markdown);
    Utils.dlBlob(blob, this.filename());
  }

  async captureDiagrams() {
    const tokens = marked
      .lexer(this.markdown)
      .filter(
        (tok) =>
          tok.type === "code" &&
          WordExporter.DIAGRAM_LANGS.has((tok.lang || "").toLowerCase().trim()),
      );

    if (!tokens.length) return {};

    const stage = document.createElement("div");
    stage.className = "offscreen-stage";
    document.body.appendChild(stage);

    const imageMap = {};
    try {
      for (let index = 0; index < tokens.length; index++) {
        const tok = tokens[index];
        const lang = (tok.lang || "").toLowerCase().trim();
        try {
          const dataUrl =
            lang === "mermaid"
              ? await this._captureMermaid(tok.text, stage, imageMap, index)
              : await this._capturePlotly(tok.text, stage, imageMap, index);
          if (!dataUrl) {
            Logger.warn(`diagram ${index} (${lang}) produced no image`);
          }
        } catch (e) {
          Logger.warn(`diagram ${index} (${lang}) failed to export`, e);
        }
        await Utils.yieldToBrowser();
      }
    } finally {
      stage.remove();
    }
    return imageMap;
  }

  async _captureMermaid(source, stage, imageMap, index) {
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
    stage.innerHTML = "";
    return dataUrl;
  }

  async _capturePlotly(source, stage, imageMap, index) {
    if (typeof Plotly === "undefined") {
      Logger.warn(`diagram ${index} (plotly): Plotly.js is not loaded`);
      return null;
    }

    let spec;
    try {
      spec = JSON.parse(source);
    } catch (e) {
      Logger.warn(`diagram ${index} (plotly): invalid JSON spec`, e);
      return null;
    }

    const width = Math.round(spec.layout?.width) || 640;
    const height = Math.round(spec.layout?.height) || 400;

    const host = document.createElement("div");
    stage.appendChild(host);

    let dataUrl = null;
    try {
      await Plotly.newPlot(
        host,
        spec.data || [],
        {
          ...spec.layout,
          width,
          height,
          paper_bgcolor: "#ffffff",
          plot_bgcolor: "#ffffff",
        },
        { staticPlot: true, responsive: false },
      );

      // 2x for print quality — same convention as the mermaid path.
      dataUrl = await Plotly.toImage(host, {
        format: "png",
        width: width * 2,
        height: height * 2,
      });

      if (dataUrl) {
        const fitted = Utils.fitImageSize(width, height);
        imageMap[index] = {
          dataUrl,
          width: fitted.width,
          height: fitted.height,
        };
      }
    } finally {
      try {
        Plotly.purge(host);
      } catch (e) {
        Logger.warn(`diagram ${index} (plotly): purge failed`, e);
      }
      host.remove();
    }

    return dataUrl;
  }
}
