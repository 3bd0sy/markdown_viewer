/* ═══════════════════════════════════════════════
   plotly.service.js — Chart rendering.
   Plotly is loaded on demand and every chart node is
   purged before it is discarded; the browser allows
   only ~16 live WebGL contexts.
   ═══════════════════════════════════════════════ */

class PlotlyService {
  constructor(store, i18n) {
    this.store = store;
    this.i18n = i18n;
  }

  async _ensureLib() {
    if (window.Plotly) return true;
    try {
      await LazyLoader.ensureGlobal("Plotly", VENDOR.plotly);
      return !!window.Plotly;
    } catch (e) {
      Logger.warn("Plotly failed to load", e);
      return false;
    }
  }

  /** Draw every chart node that has not been plotted yet. */
  async renderAll(previewEl = DOM.el("preview")) {
    const nodes = DOM.qsa("div[data-plotly-src]", previewEl).filter(
      (node) => node.dataset.plotted !== "1",
    );
    if (!nodes.length) return;

    if (!(await this._ensureLib())) {
      nodes.forEach((node) => {
        node.innerHTML = `<p class="mm-err">${Utils.esc(this.i18n.t("libraryError"))}</p>`;
      });
      return;
    }

    for (const node of nodes) {
      await this._plot(node);
      await Utils.yieldToBrowser();
    }
  }

  async _plot(node) {
    try {
      const cfg = JSON.parse(node.getAttribute("data-plotly-src"));
      const layout = {
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: this.store.isDark ? "#e2e4e9" : "#111111" },
        margin: { t: 40, l: 40, r: 20, b: 40 },
        ...(cfg.layout ?? {}),
      };

      // react() reuses the existing context instead of leaking one per render
      const draw = node._fullLayout ? Plotly.react : Plotly.newPlot;
      await draw(node, cfg.data ?? cfg, layout, {
        responsive: true,
        displayModeBar: false,
      });
      node.dataset.plotted = "1";
    } catch (e) {
      node.innerHTML =
        `<p class="mm-err">${Utils.esc(this.i18n.t("chartError"))}: ` +
        `${Utils.esc(e.message)}</p>`;
    }
  }

  /** Re-theme existing charts without rebuilding them. */
  refreshTheme(previewEl = DOM.el("preview")) {
    if (!window.Plotly) return;
    DOM.qsa("div[data-plotly-src]", previewEl).forEach((node) => {
      if (!node._fullLayout) return;
      Plotly.relayout(node, {
        "font.color": this.store.isDark ? "#e2e4e9" : "#111111",
      }).catch(() => {});
    });
  }

  /** Release GPU resources held by a node about to be removed. */
  static dispose(node) {
    if (window.Plotly && node._fullLayout) {
      try {
        Plotly.purge(node);
      } catch {
        /* already gone */
      }
    }
  }
}
