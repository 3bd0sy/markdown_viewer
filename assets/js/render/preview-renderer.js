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
    this._bindTabClicks();
    this._bindMapActions();
  }

  _bindTabClicks() {
    this.previewEl.addEventListener("click", (event) => {
      const btn = event.target.closest(".md-tabs .md-tab");
      if (!btn) return;

      const wrap = btn.closest(".md-tabs");
      const index = btn.dataset.tabIndex;
      if (wrap.dataset.activeTab === index) return;

      wrap.dataset.activeTab = index;

      wrap.querySelectorAll(".md-tab").forEach((b) => {
        const active = b.dataset.tabIndex === index;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", active ? "true" : "false");
      });

      wrap.querySelectorAll(".md-tab-panel").forEach((p) => {
        const active = p.dataset.panelIndex === index;
        p.classList.toggle("is-active", active);
        if (active) p.removeAttribute("hidden");
        else p.setAttribute("hidden", "");
      });
    });

    this.previewEl.addEventListener("keydown", (event) => {
      const btn = event.target.closest(".md-tabs .md-tab");
      if (!btn) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

      const wrap = btn.closest(".md-tabs");
      const tabs = Array.from(wrap.querySelectorAll(".md-tab"));
      const idx = tabs.indexOf(btn);
      const next =
        event.key === "ArrowRight"
          ? tabs[(idx + 1) % tabs.length]
          : tabs[(idx - 1 + tabs.length) % tabs.length];

      next.focus();
      next.click();
      event.preventDefault();
    });
  }

  _bindMapActions() {
    /* ── Layer switching ─────────────────────── */
    this.previewEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".map-layer-btn");
      if (!btn) return;

      const host = btn.closest(".map-host");
      if (!host) return;

      const layer = btn.dataset.mapLayer;
      const iframe = host.querySelector("iframe");
      if (!iframe) return;

      /* Rebuild the iframe src with the new layer. */
      const lat = host.dataset.lat;
      const lng = host.dataset.lng;
      const zoom = parseFloat(host.dataset.zoom) || 13;

      const span = 0.05 / (zoom / 10);
      const bbox =
        `${parseFloat(lng) - span},${parseFloat(lat) - span},` +
        `${parseFloat(lng) + span},${parseFloat(lat) + span}`;

      iframe.src =
        `https://www.openstreetmap.org/export/embed.html` +
        `?bbox=${bbox}&amp;layer=${layer}`;

      host.dataset.layer = layer;

      /* Update button states. */
      host.querySelectorAll(".map-layer-btn").forEach((b) => {
        b.classList.toggle("is-active", b.dataset.mapLayer === layer);
      });
    });

    /* ── Copy coordinates ────────────────────── */
    this.previewEl.addEventListener("click", async (e) => {
      const btn = e.target.closest(".map-copy-btn");
      if (!btn) return;

      const text = btn.dataset.mapCopy;
      try {
        await navigator.clipboard.writeText(text);
        const original = btn.textContent;
        btn.textContent = "✓";
        btn.classList.add("is-copied");
        setTimeout(() => {
          btn.textContent = original;
          btn.classList.remove("is-copied");
        }, 1500);
      } catch {
        Logger.warn("map: copy failed");
      }
    });
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
    this.previewEl.querySelectorAll(".md-tabs").forEach((wrap) => {
      const active = wrap.dataset.activeTab;
      if (!active || active === "0") return;
      const btn = wrap.querySelector(`.md-tab[data-tab-index="${active}"]`);
      if (btn) btn.click();
    });
    Logger.debug(
      `swap: ${stats.reused} reused, ${stats.created} new, ${stats.dropped} dropped`,
    );

    const previewEl = this.previewEl;


    // Reused nodes keep their old labels until this runs
    this.i18n.apply(previewEl);

    this.mermaid.schedule(token, previewEl);
    this.plotly.renderAll(previewEl);
    this.toc.build(previewEl);
    this.math.typeset(previewEl);
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
