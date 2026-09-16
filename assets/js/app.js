/* ═══════════════════════════════════════════════
   app.js — Composition root.

   Builds every service, wires the delegated event
   router, and starts the first render. Loaded last.
   ═══════════════════════════════════════════════ */

class MarkdownEditorApp {
  constructor() {
    this.bus = new EventBus();
    this.store = new Store(this.bus);

    this.i18n = new I18n(this.store);
    this.theme = new ThemeService(this.store);
    this.storage = new StorageService(this.store, this.i18n);

    this.mermaid = new MermaidService(this.store, this.i18n);
    this.plotly = new PlotlyService(this.store, this.i18n);
    this.math = new MathService();

    this.highlighter = new Highlighter();
    this.parser = new MarkdownParser({
      registry: MarkdownParser.createRegistry(),
      highlighter: this.highlighter,
      i18n: this.i18n,
    });

    this.toc = new TocBuilder(this.i18n);
    this.renderer = new PreviewRenderer({
      store: this.store,
      bus: this.bus,
      i18n: this.i18n,
      parser: this.parser,
      mermaid: this.mermaid,
      plotly: this.plotly,
      math: this.math,
      toc: this.toc,
    });

    this.editor = new EditorController({
      store: this.store,
      bus: this.bus,
      renderer: this.renderer,
      storage: this.storage,
    });
    this.scrollSync = new ScrollSyncController({
      editorEl: DOM.el("editor"),
      previewEl: DOM.el("preview"),
    });
    this.dragDrop = new DragDropHandler({
      store: this.store,
      editor: this.editor,
    });
    this.codeRunner = new CodeRunner(this.i18n);
    this.viewer = new FullscreenViewer({
      store: this.store,
      i18n: this.i18n,
      mermaid: this.mermaid,
    });
    this.diagramExporter = new DiagramExporter({
      store: this.store,
      i18n: this.i18n,
      mermaid: this.mermaid,
    });

    this.exports = ExportManager.createDefault({
      store: this.store,
      i18n: this.i18n,
      mermaid: this.mermaid,
      getMarkdown: () => DOM.el("editor").value,
      waitForMath: () => this.math.whenIdle(),
    });
  }

  /* ═══════════ Bootstrap ═══════════ */

  async start() {
    this.i18n.restore();
    this.theme.restore();

    marked.use({ gfm: true, breaks: false });
    this.mermaid.init();

    DOM.el("editor").value = this.storage.load();
    this.i18n.apply(document);

    this.editor.attach();
    this.dragDrop.attach();
    this._bindActions();
    this._bindSubscriptions();
    this._bindLifecycle();
    this._paintScrollSync(this.scrollSync.restore());

    await this.renderer.render();
    this.math.bindStartup(() => this.math.typeset());
  }

  /* ═══════════ Event routing ═══════════ */

  /** Reflects sync state on the toolbar button. */
  _paintScrollSync(enabled) {
    const btn = DOM.el("syncbtn");
    if (!btn) return;
    btn.classList.toggle("active", enabled);
    btn.setAttribute("aria-pressed", String(enabled));
  }
  get isZen() {
    return DOM.el("app")?.classList.contains("zen-mode") ?? false;
  }

  _bindActions() {
    const routes = {
      /* Toolbar */
      fmt: (el) => this.editor.format(el.dataset.fmt),
      dir: (el) => this.editor.setDirection(el.dataset.dir),
      theme: () => this.theme.toggle(),
      lang: () => this.i18n.toggle(),
      mode: (el) => this.theme.setMode(el.dataset.mode, el),

      "zen-toggle": () => this._paintZen(this.theme.toggleZen()),

      "scroll-sync-toggle": () =>
        this._paintScrollSync(this.scrollSync.toggle()),

      /* Export */
      "export-toggle": () => this.exports.toggleMenu(),
      export: (el) => this.exports.run(el.dataset.format),

      /* Stats bar */
      save: () => this.storage.save(),
      clear: () => {
        this.storage.clear();
        this.renderer.render({ force: true });
      },

      /* Preview content */
      "diagram-fullscreen": (el) => this.viewer.open(el.dataset.id),
      "diagram-save": (el) =>
        this.diagramExporter.save(el.dataset.id, el.dataset.format, el),
      "copy-code": (el) => this.codeRunner.copy(el),
      "run-code": (el) => this.codeRunner.run(el),
      "toc-toggle": () => this.toc.toggle(),
    };

    // One listener for the whole app; preview content can be
    // swapped freely without rebinding anything.
    DOM.delegateClicks(document.body, routes);

    // Close the export menu on any outside click
    DOM.on(document, "click", (event) => {
      if (!event.target.closest("#export-dd")) this.exports.closeMenu();
    });

    DOM.on(document, "keydown", (event) => {
      if (event.key === "Escape") this.exports.closeMenu();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        this.storage.save();
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "z"
      ) {
        event.preventDefault();
        this._paintZen(this.theme.toggleZen());
      }
    });
  }

  _bindSubscriptions() {
    // Diagrams and charts carry baked-in theme colours,
    // so a theme switch has to redraw them.
    this.bus.on(Events.THEME_CHANGED, () => {
      this.mermaid.init();
      this.renderer.rerenderAll();
    });

    // Language only touches labels: data-i18n covers the
    // whole document, so no re-render is needed.
    this.bus.on(Events.LANG_CHANGED, () => this.i18n.apply(document));
  }

  _bindLifecycle() {
    DOM.on(window, "beforeunload", () => {
      this.store.releaseAllBlobUrls();
    });

    // Pause background work while the tab is hidden
    DOM.on(document, "visibilitychange", () => {
      if (document.hidden) this.mermaid.observer?.disconnect();
      else this.mermaid.schedule(this.store.renderToken, DOM.el("preview"));
    });
  }
  _paintZen(isZen) {
    DOM.el("zenbtn")?.setAttribute("aria-pressed", String(isZen));
  }
}

/* ── Launch ─────────────────────────────────── */
const App = new MarkdownEditorApp();
window.MDApp = App; // console handle for debugging

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => App.start());
} else {
  App.start();
}
