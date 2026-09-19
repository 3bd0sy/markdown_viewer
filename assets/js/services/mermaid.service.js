/* ═══════════════════════════════════════════════
   mermaid.service.js — The rendering bottleneck,
   contained.

   Three problems this class exists to solve:
   1. mermaid keeps global config, so any two renders
      that need different settings must be serialized
      behind a lock.
   2. mermaid.render() is expensive; rendering every
      diagram in a document up front froze the thread.
      Diagrams are now queued and drawn only when they
      approach the viewport.
   3. A thrown diagram used to abort the whole loop.
      Each diagram is validated and isolated.
   ═══════════════════════════════════════════════ */

class MermaidService {
  /** Render near the viewport, not only inside it. */
  static ROOT_MARGIN = "800px 0px";

  constructor(store, i18n) {
    this.store = store;
    this.i18n = i18n;
    this.observer = null;
    this.lock = Promise.resolve();
    this.seq = 0;
    this.queue = Promise.resolve();
  }

  /* ── Configuration ──────────────────────────── */
  /** Palette split by mode. Feeds every diagram that uses the
   *  generic (non-diagram-specific) Mermaid variables: flowchart,
   *  class, state, ER, packet, C4, mindmap.
   *  This single object fixes complaints #5, #6, #12, #30. */
  static PALETTE = {
    light: {
      primaryColor: "#dbeafe",
      primaryTextColor: "#1e3a5f",
      primaryBorderColor: "#3b82f6",
      lineColor: "#6b7280",
      secondaryColor: "#f0fdf4",
      tertiaryColor: "#fef9c3",
    },
    dark: {
      primaryColor: "#2d3348",
      primaryTextColor: "#e2e4e9",
      primaryBorderColor: "#60a5fa",
      lineColor: "#9aa1ad",
      secondaryColor: "#1f2937",
      tertiaryColor: "#3a3520",
    },
  };
  get baseConfig() {
    const palette = this.store.isDark
      ? MermaidService.PALETTE.dark
      : MermaidService.PALETTE.light;

    return {
      startOnLoad: false,
      theme: this.store.isDark ? "dark" : "base",
      htmlLabels: true, // required for text wrapping inside nodes
      markdownAutoWrap: true,
      securityLevel: "strict",
      flowchart: { htmlLabels: true, useMaxWidth: true, wrappingWidth: 220 },

      themeVariables: {
        ...palette,
        fontSize: "14px",
        // Diagram-specific namespaces — Mermaid does NOT fall back
        // to the generic variables above for these diagram types.
        xyChart: {
          backgroundColor: "transparent",
          plotColorPalette: this.store.isDark
            ? "#60a5fa, #34d399, #f472b6, #fbbf24"
            : "#2563eb, #059669, #db2777, #d97706",
          titleColor: palette.primaryTextColor,
          xAxisLabelColor: palette.primaryTextColor,
          xAxisTitleColor: palette.primaryTextColor,
          xAxisTickColor: palette.lineColor,
          xAxisLineColor: palette.lineColor,
          yAxisLabelColor: palette.primaryTextColor,
          yAxisTitleColor: palette.primaryTextColor,
          yAxisTickColor: palette.lineColor,
          yAxisLineColor: palette.lineColor,
        },
      },
      // Sankey has its own top-level config, not under themeVariables
      sankey: {
        linkColor: "target",
        nodeAlignment: "justify",
      },
    };
  }

  init() {
    mermaid.initialize(this.baseConfig);
  }

  /**
   * Serialize everything that touches mermaid's global
   * config: normal renders, fullscreen HQ renders, exports.
   */
  withLock(task) {
    const run = this.lock.then(task, task);
    this.lock = run.then(
      () => {},
      () => {},
    );
    return run;
  }

  /* ── Single render ──────────────────────────── */

  /**
   * Render one source string to SVG markup.
   * `overrides` are merged over the base config and
   * reverted before the lock is released.
   */
  async renderSource(source, overrides = null) {
    return this.withLock(async () => {
      const base = this.baseConfig;
      if (overrides) mermaid.initialize({ ...base, ...overrides });

      const id = `mmr-${this.seq++}`; // never reused: no id collisions
      try {
        // Validate first so mermaid does not inject its own error DOM
        const valid = await mermaid.parse(source, { suppressErrors: true });
        if (valid === false) throw new Error("syntax error");
        const { svg } = await mermaid.render(id, source);
        return svg;
      } finally {
        document.getElementById(id)?.remove();
        document.getElementById(`d${id}`)?.remove();
        if (overrides) mermaid.initialize(base);
      }
    });
  }

  /** Draw into one .mm-body element, unless the render was cancelled. */
  async renderInto(body, token) {
    if (!this.store.isCurrent(token)) return;
    if (body.querySelector("svg")) return; // already drawn and reused

    const sourceEl = document.getElementById(body.id.replace(/-body$/, ""));
    const source = sourceEl?.textContent?.trim();
    if (!source) return;

    try {
      const svg = await this.renderSource(source);
      if (!this.store.isCurrent(token)) return;
      body.innerHTML = svg;
      MermaidService.postProcess(body.querySelector("svg"));
    } catch (e) {
      body.innerHTML =
        `<div class="mm-err">${Utils.esc(this.i18n.t("mermaidError"))}: ` +
        `${Utils.esc(e.message || "syntax error")}</div>`;
    }
  }

  /* ── Lazy queue ─────────────────────────────── */

  /**
   * Queue every undrawn diagram in the preview.
   * Work starts when a diagram nears the viewport and
   * yields to the browser between diagrams.
   */
  schedule(token, previewEl) {
    this.observer?.disconnect();

    const pending = DOM.qsa(".mm-body", previewEl).filter(
      (body) => !body.querySelector("svg"),
    );
    if (!pending.length) {
      this.store.diagramsReady = Promise.resolve();
      return;
    }

    let chain = Promise.resolve();
    const enqueue = (body) => {
      chain = chain.then(async () => {
        await this.renderInto(body, token);
        await Utils.yieldToBrowser(); // let the browser paint between diagrams
      });
      this.store.diagramsReady = chain;
    };

    this.observer = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          enqueue(entry.target);
        });
      },
      {
        root: Utils.getScrollParent(previewEl) ?? null,
        rootMargin: MermaidService.ROOT_MARGIN,
      },
    );

    pending.forEach((body) => {
      body.innerHTML = '<div class="mm-skeleton" aria-hidden="true"></div>';
      this.observer.observe(body);
    });

    this.store.diagramsReady = chain;
  }

  /** Force every diagram to finish. Exporters call this. */
  async renderAll(previewEl = DOM.el("preview")) {
    this.observer?.disconnect();
    const token = this.store.renderToken;
    const pending = DOM.qsa(".mm-body", previewEl).filter(
      (body) => !body.querySelector("svg"),
    );
    for (const body of pending) {
      await this.renderInto(body, token);
    }
  }

  /** Theme changed — drop every drawn SVG so they are redrawn. */
  reset(previewEl = DOM.el("preview")) {
    this.observer?.disconnect();
    this.init();
    DOM.qsa(".mm-body", previewEl).forEach((body) => (body.innerHTML = ""));
  }

  /* ── SVG post-processing ────────────────────── */

  /**
   * Pads on every side, not just left/top.
   * The old version only handled left-edge clipping (flowchart
   * node labels). quadrantChart clips on the RIGHT (data-point
   * labels extending past the plot boundary, complaint #17) —
   * a diagram with its own axis system, not a flowchart node.
   */
  static padViewBox(svgEl, pad = { left: 28, top: 12, right: 28, bottom: 12 }) {
    const viewBox = svgEl?.getAttribute("viewBox");
    if (!viewBox) return;
    const parts = viewBox
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (parts.length !== 4 || parts.some(Number.isNaN)) return;
    const [x, y, w, h] = parts;
    if (svgEl.dataset.mmPadded === "1") return; // idempotent guard
    svgEl.setAttribute(
      "viewBox",
      `${x - pad.left} ${y - pad.top} ${w + pad.left + pad.right} ${h + pad.top + pad.bottom}`,
    );
    svgEl.dataset.mmPadded = "1";
  }

  /** Widen legend badges that mermaid sizes from a stale text metric. */
  static fixBadges(svgEl) {
    const selectors = [
      ".legend > g",
      '[class*="legend"] > g',
      '[class*="Legend"] > g',
    ];
    selectors.forEach((selector) => {
      let groups;
      try {
        groups = svgEl.querySelectorAll(selector);
      } catch {
        return;
      }
      groups.forEach((group) => {
        const textEl = group.querySelector("text");
        const rectEl = group.querySelector("rect");
        if (!textEl || !rectEl) return;
        try {
          const box = textEl.getBBox();
          if (box.width <= 0) return;
          const needed = box.width + 24;
          const current = parseFloat(rectEl.getAttribute("width") || "0");
          if (needed > current) rectEl.setAttribute("width", needed);
        } catch {
          /* not rendered yet */
        }
      });
    });
  }

  /** Detects which family a rendered SVG belongs to, from classes
   *  Mermaid itself attaches to the root <g>. Needed because a
   *  flowchart fix (left padding) and a quadrant fix (all-sides
   *  padding) are not interchangeable. */
  static detectType(svgEl) {
    if (svgEl.querySelector(".quadrant-point")) return "quadrant";
    if (svgEl.querySelector(".sankey-link")) return "sankey";
    if (svgEl.classList.contains("xychart") || svgEl.querySelector(".plot"))
      return "xychart";
    return "generic";
  }

  static postProcess(svgEl, fullscreen = false) {
    if (!svgEl) return;
    svgEl.style.direction = "ltr";

    const type = MermaidService.detectType(svgEl);
    const pad = fullscreen
      ? { left: 32, top: 16, right: 32, bottom: 16 }
      : { left: 28, top: 12, right: 12, bottom: 12 };

    if (type === "quadrant") pad.right = fullscreen ? 60 : 48;
    MermaidService.padViewBox(svgEl, pad);
    MermaidService.fixBadges(svgEl);
  }
}
