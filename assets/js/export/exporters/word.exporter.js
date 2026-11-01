/* ═══════════════════════════════════════════════
   word.exporter.js — DOCX export.

   Diagrams are re-rendered from the Markdown source
   rather than scraped from the preview, including
   diagrams nested inside DOCX tabs and grids.
   ═══════════════════════════════════════════════ */

class WordExporter extends BaseExporter {
  static id = "word";
  static extension = "docx";
  static DIAGRAM_LANGS = new Set(["mermaid", "plotly"]);

  async run() {
    const docx = await LazyLoader.ensureGlobal("docx", VENDOR.docx);
    if (!docx) throw new Error(this.i18n.t("libraryError"));

    DOM.flashStatus(this.i18n.t("preparingDiagrams"), 0);
    const fullMathMap = this._collectMathMaps(this.markdown);
    const imageSources = this._collectImageSources(this.markdown);

    const [diagramMap, mapImages, mathImages, capturedImages] = await Promise.all([
      this.captureDiagrams(),
      this._captureMaps(),
      this._captureMath(fullMathMap),
      this._captureImages(imageSources),
    ]);

    const imageMap = Object.assign(Object.create(null), diagramMap, {
      map: mapImages,
      math: mathImages,
      images: capturedImages.images,
      inlineSvgs: capturedImages.inlineSvgs,
    });

    // Pass the I18n service so DOCX chrome uses the active UI language.
    const builder = new DocxBuilder(docx, imageMap, this.i18n.isRtl, this.i18n);

    const blob = await builder.build(this.markdown);
    Utils.dlBlob(blob, this.filename());
  }

  async _captureMaps() {
    if (typeof MapService === "undefined") {
      Logger.warn("MapService not loaded — maps will not be embedded in Word");
      return [];
    }

    try {
      return await MapService.collectFromMarkdown(this.markdown);
    } catch (e) {
      Logger.warn("word: map capture failed", e);
      return [];
    }
  }

  /**
   * Collect every Math placeholder from the document tree,
   * including formulas hidden inside nested grids, tabs, and
   * callout bodies that are re-processed in separate DOCX passes.
   */
  _collectMathMaps(markdown) {
    const result = Object.create(null);

    const visit = (source) => {
      const prepared = Preprocessors.prepareForDocx(source);
      if (prepared?.math) Object.assign(result, prepared.math);

      const tokens = marked.lexer(prepared.src);
      for (const tok of tokens) {
        if (tok.type !== "html") continue;

        const raw = String(tok.text || "").trim();
        const gridMatch = /^<!--MD-GRID:(\d+)-->$/.exec(raw);
        if (gridMatch) {
          const gridDef = prepared.grids?.[+gridMatch[1]];
          for (const item of gridDef?.items || []) {
            visit(item.content);
          }
          continue;
        }

        const tabsMatch = /^<!--MD-TABS:(\d+)-->$/.exec(raw);
        if (tabsMatch) {
          const tabDef = prepared.tabs?.[+tabsMatch[1]];
          for (const tab of tabDef?.tabs || []) {
            visit(tab.body);
          }
        }
      }
    };

    visit(markdown);
    return result;
  }

  /**
   * Collect diagram code fences in the same recursive document order
   * used by DocxBuilder: top-level content → grids/tabs at their marker
   * position → nested grids/tabs recursively.
   */
  _collectDiagramTokens(markdown) {
    const result = [];

    const visit = (source) => {
      const prepared = Preprocessors.prepareForDocx(source);
      const tokens = marked.lexer(prepared.src);

      for (const tok of tokens) {
        if (tok.type === "code") {
          const lang = (tok.lang || "").toLowerCase().trim();

          if (WordExporter.DIAGRAM_LANGS.has(lang)) {
            result.push(tok);
          }
          continue;
        }

        if (tok.type !== "html") continue;

        const raw = String(tok.text || "").trim();

        const gridMatch = /^<!--MD-GRID:(\d+)-->$/.exec(raw);
        if (gridMatch) {
          const gridDef = prepared.grids?.[+gridMatch[1]];

          for (const item of gridDef?.items || []) {
            visit(item.content);
          }
          continue;
        }

        const tabsMatch = /^<!--MD-TABS:(\d+)-->$/.exec(raw);
        if (tabsMatch) {
          const tabDef = prepared.tabs?.[+tabsMatch[1]];

          for (const tab of tabDef?.tabs || []) {
            visit(tab.body);
          }
        }
      }
    };

    visit(markdown);
    return result;
  }

  async captureDiagrams() {
    const tokens = this._collectDiagramTokens(this.markdown);
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
    // htmlLabels:false produces SVG text the canvas can draw.
    const svg = await this.ctx.mermaid.renderSource(
      source,
      {
        theme: "base",
        htmlLabels: false,
        flowchart: { htmlLabels: false, useMaxWidth: false },
      },
      true,
    );

    stage.innerHTML = svg;
    const svgEl = stage.querySelector("svg");
    if (!svgEl) return null;

    const { width, height } = Utils.getSvgDimensions(svgEl);
    const fitted = Utils.fitImageSize(width, height);

    // Render at 2x for print quality.
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
      imageMap[index] = {
        dataUrl,
        width: fitted.width,
        height: fitted.height,
      };
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

      // Render at 2x for print quality.
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

  /** Collect Markdown and HTML image sources through nested DOCX containers. */
  _collectImageSources(markdown) {
    const images = new Map();
    const inlineSvgs = new Map();
    const visitedSources = new Set();

    const collectHtml = (html, prepared) => {
      const segments = DocxMediaUtils.parseHtmlFragment(html);
      DocxMediaUtils.collectSegments(segments, images, inlineSvgs);

      const visitMarkers = (items) => {
        for (const item of items || []) {
          if (item.type === "container-marker") {
            const gridMatch = /^MD-GRID:(\d+)$/.exec(item.marker);
            if (gridMatch) {
              for (const gridItem of prepared.grids?.[+gridMatch[1]]?.items || []) visit(gridItem.content);
            }
            const tabsMatch = /^MD-TABS:(\d+)$/.exec(item.marker);
            if (tabsMatch) {
              for (const tab of prepared.tabs?.[+tabsMatch[1]]?.tabs || []) visit(tab.body);
            }
          }
          if (item.children) visitMarkers(item.children);
        }
      };
      visitMarkers(segments);
    };

    const scanInline = (tokens, prepared) => {
      for (const token of tokens || []) {
        if (token.type === "image") {
          DocxMediaUtils.addImageSource(token.href || token.src, images);
        } else if (token.type === "html") {
          collectHtml(token.text || token.raw || "", prepared);
        }
        if (token.tokens) scanInline(token.tokens, prepared);
        if (token.items) {
          for (const item of token.items) scanInline(item.tokens, prepared);
        }
      }
    };

    const visit = (source) => {
      const markdownSource = String(source ?? "");
      if (visitedSources.has(markdownSource)) return;
      visitedSources.add(markdownSource);
      const prepared = Preprocessors.prepareForDocx(markdownSource);
      const tokens = marked.lexer(prepared.src);

      for (const token of tokens || []) {
        if (token.type === "html") {
          const raw = String(token.text || "");
          collectHtml(raw, prepared);
          const trimmed = raw.trim();
          const gridMatch = /^<!--MD-GRID:(\d+)-->$/.exec(trimmed);
          if (gridMatch) {
            for (const item of prepared.grids?.[+gridMatch[1]]?.items || []) visit(item.content);
            continue;
          }
          const tabsMatch = /^<!--MD-TABS:(\d+)-->$/.exec(trimmed);
          if (tabsMatch) {
            for (const tab of prepared.tabs?.[+tabsMatch[1]]?.tabs || []) visit(tab.body);
          }
          continue;
        }

        if (token.type === "table") {
          for (const cell of token.header || []) scanInline(cell.tokens, prepared);
          for (const row of token.rows || []) for (const cell of row) scanInline(cell.tokens, prepared);
          continue;
        }
        if (token.type !== "code") scanInline(token.tokens, prepared);
      }
    };

    visit(markdown);
    return { images, inlineSvgs };
  }

  async _captureImages({ images, inlineSvgs }) {
    const captured = {
      images: Object.create(null),
      inlineSvgs: Object.create(null),
    };
    const jobs = [
      ...[...images.entries()].map(([key, source]) => ({ key, source, kind: "image" })),
      ...[...inlineSvgs.entries()].map(([key, source]) => ({ key, source, kind: "svg" })),
    ];

    if (jobs.length > DocxMediaUtils.MAX_IMAGES_PER_DOCUMENT) {
      Logger.warn(
        `word: document has ${jobs.length} image assets; only the first ${DocxMediaUtils.MAX_IMAGES_PER_DOCUMENT} will be embedded`,
      );
    }

    const limitedJobs = jobs.slice(0, DocxMediaUtils.MAX_IMAGES_PER_DOCUMENT);
    let next = 0;
    const worker = async () => {
      while (next < limitedJobs.length) {
        const job = limitedJobs[next++];
        try {
          const image = job.kind === "svg"
            ? await DocxMediaUtils.rasterizeSvg(job.source)
            : await DocxMediaUtils.rasterizeImage(job.source);
          captured[job.kind === "svg" ? "inlineSvgs" : "images"][job.key] = image;
        } catch (error) {
          Logger.warn(`word: image was not embedded (${job.kind === "svg" ? "inline SVG" : job.source})`, error);
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(3, limitedJobs.length) }, worker));
    return captured;
  }

  async _captureMath(mathMap) {
    if (Object.keys(mathMap).length === 0) return {};

    const imageMap = {};

    for (const key in mathMap) {
      const source = String(mathMap[key] ?? "").trim();
      const normalized = source
        .replace(/^\${1,2}|\${1,2}$/g, "")
        .trim();

      // Export as a native Word equation instead of PNG. This keeps the
      // formula editable in Word and avoids huge rasterized images.
      imageMap[key] = { text: normalized || source };
    }

    return imageMap;
  }
}
