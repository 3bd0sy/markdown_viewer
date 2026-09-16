/* ═══════════════════════════════════════════════
   preview-renderer.js — The render pipeline.

   parse → diff-swap → translate → schedule diagrams
   → charts → TOC → math → stats

   Only the parse and swap steps are synchronous; every
   heavy step is deferred or lazy, so a large paste no
   longer blocks the main thread.
   ═══════════════════════════════════════════════ */

class PreviewRenderer {
  constructor({ store, bus, i18n, parser, mermaid, plotly, math, toc }) {
    this.store = store;
    this.bus = bus;
    this.i18n = i18n;
    this.parser = parser;
    this.mermaid = mermaid;
    this.plotly = plotly;
    this.math = math;
    this.toc = toc;
    this._modelViewerRequested = false;
  }

  get previewEl() {
    return DOM.el("preview");
  }

  get editorEl() {
    return DOM.el("editor");
  }

  /**
   * @param {boolean} force  rebuild even if the text is unchanged
   *                         (theme or language switch)
   */
  async render({ force = false } = {}) {
    const markdown = this.editorEl.value;
    if (!force && markdown === this.store.lastMarkdown) return;
    this.store.lastMarkdown = markdown;

    const token = this.store.nextRenderToken();
    this.bus.emit(Events.RENDER_START, token);

    let html;
    try {
      html = Logger._enabled("debug")
        ? await Logger.time("parse", () => this.parser.parse(markdown))
        : this.parser.parse(markdown);
    } catch (e) {
      // A broken token must not blank the preview
      Logger.error("parse failed", e);
      return;
    }
    if (!this.store.isCurrent(token)) return;

    const stats = DomDiffer.swap(
      this.previewEl,
      html,
      DomDiffer.defaultDispose,
    );
    Logger.debug(
      `swap: ${stats.reused} reused, ${stats.created} new, ${stats.dropped} dropped`,
    );

    // Reused nodes keep their old labels until this runs
    this.i18n.apply(this.previewEl);

    this.mermaid.schedule(token, this.previewEl);
    this.plotly.renderAll(this.previewEl);
    this.toc.build(this.previewEl);
    this.math.typeset(this.previewEl);
    this._ensureModelViewer();
    this._updateStats(markdown);

    this.bus.emit(Events.RENDER_DONE, token);
  }

  /** Rebuild from scratch — used after a theme change. */
  async rerenderAll() {
    this.mermaid.reset(this.previewEl);
    this.plotly.refreshTheme(this.previewEl);
    this.store.invalidate();
    await this.render({ force: true });
  }

  _updateStats(markdown) {
    const trimmed = markdown.trim();
    DOM.setText("sw", trimmed ? trimmed.split(/\s+/).length : 0);
    DOM.setText("sl", markdown.split("\n").length);
    DOM.setText("sc", markdown.length);
  }

  /** <model-viewer> is only fetched when a 3D block exists. */
  _ensureModelViewer() {
    if (this._modelViewerRequested) return;
    if (!DOM.qs("model-viewer", this.previewEl)) return;
    this._modelViewerRequested = true;
    LazyLoader.script(VENDOR.modelViewer, { module: true }).catch((e) => {
      Logger.warn("model-viewer failed to load", e);
    });
  }
}
