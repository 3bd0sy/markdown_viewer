/* ═══════════════════════════════════════════════
   diagram-exporter.js — Save one diagram as PNG or SVG.

   PNG goes through a fresh render with htmlLabels:false.
   The previous implementation passed the config as the
   4th argument of mermaid.render(), which is the
   container parameter — the setting was ignored and the
   foreignObject text never reached the canvas, so the
   PNG came out blank.
   ═══════════════════════════════════════════════ */

class DiagramExporter {
  constructor({ store, i18n, mermaid }) {
    this.store = store;
    this.i18n = i18n;
    this.mermaid = mermaid;
    this._stage = null;
  }

  async save(sourceId, format, btn) {
    const original = btn?.textContent;
    if (btn) {
      btn.disabled = true;
      btn.textContent = this.i18n.t("diagramSaving");
    }

    try {
      const svgEl = await this._resolveSvg(sourceId, format);
      if (!svgEl) {
        DOM.flashStatus(this.i18n.t("diagramNotReady"));
        return;
      }

      const { width, height } = Utils.getSvgDimensions(svgEl);
      const clone = Utils.cloneSvgForExport(svgEl, width, height);

      if (format === "svg") {
        const markup = new XMLSerializer().serializeToString(clone);
        Utils.dlBlob(
          new Blob([markup], { type: "image/svg+xml" }),
          `diagram-${sourceId}.svg`,
        );
        return;
      }

      const dataUrl = await Utils.svgToPngDataUrl(clone);
      if (!dataUrl) {
        DOM.flashStatus(this.i18n.t("pngFailed"));
        return;
      }
      Utils.dlBlob(Utils.dataUrlToBlob(dataUrl), `diagram-${sourceId}.png`);
    } catch (e) {
      Logger.error("diagram export failed", e);
      DOM.flashStatus(`${this.i18n.t("exportError")} ${e.message}`);
    } finally {
      this._clearStage();
      if (btn) {
        btn.disabled = false;
        btn.textContent = original;
      }
    }
  }

  /**
   * SVG export reuses the on-screen node.
   * PNG needs a foreignObject-free re-render, staged
   * off-screen so getBBox still works.
   */
  async _resolveSvg(sourceId, format) {
    const body = document.getElementById(`${sourceId}-body`);

    if (format !== "png") {
      if (body?.querySelector("svg")) return body.querySelector("svg");
      // Not drawn yet (still below the fold) — draw it now
      if (body) await this.mermaid.renderInto(body, this.store.renderToken);
      return body?.querySelector("svg") ?? null;
    }

    const source = document.getElementById(sourceId)?.textContent?.trim();
    if (!source) return body?.querySelector("svg") ?? null;

    const svg = await this.mermaid.renderSource(source, {
      htmlLabels: false,
      flowchart: { htmlLabels: false, useMaxWidth: false },
    });

    // Stays attached until save() finishes: getBBox needs a
    // rendered element, and the PNG pass reads geometry.
    this._clearStage();
    this._stage = document.createElement("div");
    this._stage.className = "offscreen-stage";
    document.body.appendChild(this._stage);
    this._stage.innerHTML = svg;
    return this._stage.querySelector("svg");
  }

  _clearStage() {
    this._stage?.remove();
    this._stage = null;
  }
}
