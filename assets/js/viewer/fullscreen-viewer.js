/* ═══════════════════════════════════════════════
   fullscreen-viewer.js — Pan/zoom overlay for a
   single diagram.

   The overlay re-renders the source at high quality
   (real SVG text instead of foreignObject) so it stays
   sharp at any zoom level. The render goes through the
   service lock, so it cannot corrupt a background
   render's configuration.
   ═══════════════════════════════════════════════ */

class FullscreenViewer {
  static MIN_SCALE = 0.05;
  static MAX_SCALE = 20;
  static PAN_STEP = 60;
  static PADDING = 48;

  constructor({ store, i18n, mermaid }) {
    this.store = store;
    this.i18n = i18n;
    this.mermaid = mermaid;

    this.scale = 1;
    this.tx = 0;
    this.ty = 0;
    this.dragging = false;
    this.startX = 0;
    this.startY = 0;
    this.lastTx = 0;
    this.lastTy = 0;
    this.pinchDistance = 0;
    this.overlay = null;
  }

  /* ── Lifecycle ──────────────────────────────── */

  async open(sourceId) {
    const source = document.getElementById(sourceId)?.textContent?.trim();
    if (!source) {
      Logger.warn(`no diagram source for id ${sourceId}`);
      return;
    }

    const overlay = this._ensureOverlay();
    const content = DOM.el("mm-fs-content");
    content.innerHTML = `<div class="mm-fs-loading">⟳ ${Utils.esc(
      this.i18n.t("renderingHQ"),
    )}</div>`;
    content.dataset.svgW = 800;
    content.dataset.svgH = 400;
    overlay.classList.add("open");

    try {
      const isFlowchart = /^(flowchart|graph)\b/i.test(source.trimStart());
      const svg = await this.mermaid.renderSource(source, {
        // Real SVG text stays crisp when scaled; only flowcharts
        // depend on foreignObject for wrapping.
        ...(isFlowchart ? { htmlLabels: false } : {}),
        flowchart: {
          htmlLabels: !isFlowchart,
          useMaxWidth: false,
          wrappingWidth: 220,
        },
        themeVariables: { fontSize: "15px" },
      });

      content.innerHTML = svg;
      this._prepareSvg(content);
      requestAnimationFrame(() => this.fit());
    } catch (e) {
      content.innerHTML = `<div class="mm-fs-error">✕ ${Utils.esc(e.message)}</div>`;
    }
  }

  close() {
    this.overlay?.classList.remove("open");
  }

  get isOpen() {
    return !!this.overlay?.classList.contains("open");
  }

  _prepareSvg(content) {
    const svgEl = content.querySelector("svg");
    if (!svgEl) return;

    const viewBox = svgEl.viewBox?.baseVal;
    const width = viewBox?.width > 10 ? viewBox.width : 900;
    const height = viewBox?.height > 10 ? viewBox.height : 600;

    svgEl.setAttribute("width", width);
    svgEl.setAttribute("height", height);
    svgEl.style.maxWidth = "none";
    svgEl.style.shapeRendering = "geometricPrecision";
    svgEl.style.textRendering = "optimizeLegibility";

    // Opaque backdrop so the diagram reads on any theme
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("width", "100%");
    bg.setAttribute("height", "100%");
    bg.setAttribute("fill", this.store.isDark ? "#1e1e2e" : "#ffffff");
    svgEl.insertBefore(bg, svgEl.firstChild);

    MermaidService.postProcess(svgEl, true);
    content.dataset.svgW = width;
    content.dataset.svgH = height;
  }

  /* ── Overlay construction ───────────────────── */

  _ensureOverlay() {
    if (this.overlay?.isConnected) return this.overlay;

    const overlay = document.createElement("div");
    overlay.id = "mm-fs-overlay";
    overlay.className = "mm-fs-overlay";
    overlay.innerHTML = `
      <div class="mm-fs-toolbar">
        <div class="mm-hdr-l">
          <div class="mm-dot"></div>
          <span class="mm-lbl" data-i18n="mermaidDiagram">${Utils.esc(
            this.i18n.t("mermaidDiagram"),
          )}</span>
        </div>
        <div class="mm-fs-controls">
          <button class="mm-fs-btn" data-fs="zoom-out" title="−">−</button>
          <span class="mm-fs-zlbl" id="mm-fs-zlbl">100%</span>
          <button class="mm-fs-btn" data-fs="zoom-in" title="+">+</button>
          <button class="mm-fs-btn" data-fs="fit" title="Fit (0)">⤢</button>
          <button class="mm-fs-btn mm-fs-close" data-fs="close" title="Esc">✕</button>
        </div>
      </div>
      <div class="mm-fs-canvas" id="mm-fs-canvas">
        <div class="mm-fs-backdrop" id="mm-fs-backdrop"></div>
        <div class="mm-fs-content" id="mm-fs-content"></div>
        <span class="mm-fs-hint">${Utils.esc(this.i18n.t("fsHint"))}</span>
      </div>`;

    document.body.appendChild(overlay);
    this.overlay = overlay;
    this._bindEvents(overlay);
    return overlay;
  }

  _bindEvents(overlay) {
    const canvas = overlay.querySelector("#mm-fs-canvas");

    overlay.querySelector("#mm-fs-backdrop")
      .addEventListener("click", () => this.close());

    overlay.addEventListener("click", (event) => {
      const action = event.target.closest("[data-fs]")?.dataset.fs;
      if (!action) return;
      if (action === "close") this.close();
      if (action === "fit") this.fit();
      if (action === "zoom-in") this._zoomFromCenter(1.25);
      if (action === "zoom-out") this._zoomFromCenter(0.8);
    });

    canvas.addEventListener("mousedown", (e) => this._onMouseDown(e));
    window.addEventListener("mousemove", (e) => this._onMouseMove(e));
    window.addEventListener("mouseup", () => this._onMouseUp());
    canvas.addEventListener("wheel", (e) => this._onWheel(e), { passive: false });
    canvas.addEventListener("touchstart", (e) => this._onTouchStart(e), { passive: false });
    canvas.addEventListener("touchmove", (e) => this._onTouchMove(e), { passive: false });
    canvas.addEventListener("touchend", (e) => this._onTouchEnd(e));
    document.addEventListener("keydown", (e) => this._onKeyDown(e));
  }

  /* ── Transform ──────────────────────────────── */

  _apply() {
    const content = DOM.el("mm-fs-content");
    if (!content) return;
    content.style.transform =
      `translate(${this.tx}px, ${this.ty}px) scale(${this.scale})`;
    DOM.setText("mm-fs-zlbl", `${Math.round(this.scale * 100)}%`);
  }

  fit() {
    const canvas = DOM.el("mm-fs-canvas");
    const content = DOM.el("mm-fs-content");
    if (!canvas || !content) return;

    const width = parseFloat(content.dataset.svgW) || 800;
    const height = parseFloat(content.dataset.svgH) || 600;
    const pad = FullscreenViewer.PADDING;

    this.scale = Math.min(
      (canvas.clientWidth - pad * 2) / width,
      (canvas.clientHeight - pad * 2) / height,
      1,
    );
    this.tx = (canvas.clientWidth - width * this.scale) / 2;
    this.ty = (canvas.clientHeight - height * this.scale) / 2;
    this._apply();
  }

  _zoomAt(factor, cx, cy) {
    const next = Math.min(
      Math.max(this.scale * factor, FullscreenViewer.MIN_SCALE),
      FullscreenViewer.MAX_SCALE,
    );
    const ratio = next / this.scale;
    this.tx = cx - (cx - this.tx) * ratio;
    this.ty = cy - (cy - this.ty) * ratio;
    this.scale = next;
    this._apply();
  }

  _zoomFromCenter(factor) {
    const canvas = DOM.el("mm-fs-canvas");
    if (!canvas) return;
    this._zoomAt(factor, canvas.clientWidth / 2, canvas.clientHeight / 2);
  }

  /* ── Pointer input ──────────────────────────── */

  _onMouseDown(event) {
    if (event.button !== 0) return;
    this.dragging = true;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.lastTx = this.tx;
    this.lastTy = this.ty;
    DOM.el("mm-fs-canvas")?.classList.add("dragging");
    event.preventDefault();
  }

  _onMouseMove(event) {
    if (!this.dragging) return;
    this.tx = this.lastTx + (event.clientX - this.startX);
    this.ty = this.lastTy + (event.clientY - this.startY);
    this._apply();
  }

  _onMouseUp() {
    if (!this.dragging) return;
    this.dragging = false;
    DOM.el("mm-fs-canvas")?.classList.remove("dragging");
  }

  _onWheel(event) {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    this._zoomAt(
      event.deltaY < 0 ? 1.12 : 1 / 1.12,
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
  }

  static _distance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  _onTouchStart(event) {
    event.preventDefault();
    if (event.touches.length === 1) {
      this.startX = event.touches[0].clientX;
      this.startY = event.touches[0].clientY;
      this.lastTx = this.tx;
      this.lastTy = this.ty;
    } else if (event.touches.length === 2) {
      this.pinchDistance = FullscreenViewer._distance(event.touches);
    }
  }

  _onTouchMove(event) {
    event.preventDefault();
    if (event.touches.length === 1) {
      this.tx = this.lastTx + (event.touches[0].clientX - this.startX);
      this.ty = this.lastTy + (event.touches[0].clientY - this.startY);
      this._apply();
      return;
    }
    if (event.touches.length !== 2) return;

    const distance = FullscreenViewer._distance(event.touches);
    const rect = event.currentTarget.getBoundingClientRect();
    this._zoomAt(
      distance / (this.pinchDistance || distance),
      (event.touches[0].clientX + event.touches[1].clientX) / 2 - rect.left,
      (event.touches[0].clientY + event.touches[1].clientY) / 2 - rect.top,
    );
    this.pinchDistance = distance;
  }

  _onTouchEnd(event) {
    if (event.touches.length === 1) {
      this.startX = event.touches[0].clientX;
      this.startY = event.touches[0].clientY;
      this.lastTx = this.tx;
      this.lastTy = this.ty;
    }
    this.pinchDistance = 0;
  }

  _onKeyDown(event) {
    if (!this.isOpen) return;
    if (["TEXTAREA", "INPUT"].includes(event.target.tagName)) return;

    const step = FullscreenViewer.PAN_STEP;
    switch (event.key) {
      case "Escape": this.close(); break;
      case "+": case "=": this._zoomFromCenter(1.25); break;
      case "-": this._zoomFromCenter(0.8); break;
      case "0": this.fit(); break;
      case "ArrowLeft": this.tx += step; this._apply(); break;
      case "ArrowRight": this.tx -= step; this._apply(); break;
      case "ArrowUp": this.ty += step; this._apply(); break;
      case "ArrowDown": this.ty -= step; this._apply(); break;
      default: return;
    }
    event.preventDefault();
  }
}
