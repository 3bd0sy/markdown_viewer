/* ═══════════════════════════════════════════════
   pdf.exporter.js — PDF via the browser print engine.

   No vendor library: the print engine is the only
   renderer that shapes Arabic correctly, keeps SVG
   vectorial and produces selectable text.

   The preview is cloned into an isolated iframe so
   the live document is never mutated.
   ═══════════════════════════════════════════════ */

class PdfExporter extends BaseExporter {
  static id = "pdf";
  static extension = "pdf";

  /** Stylesheets the printed document needs. */
  static STYLES = [
    "assets/vendor/highlight-atom-dark.min.css",
    "assets/css/main.css",
    "assets/css/preview.css",
    "assets/css/mermaid.css",
    "assets/css/code.css",
    "assets/css/render.css",
    "assets/css/print.css", // last: overrides everything above
  ];

  async run() {
    // 1. Lazy rendering means off-screen diagrams are still
    //    empty skeletons — force them all to finish first.
    DOM.flashStatus(this.i18n.t("preparingDiagrams"), 0);
    await this.ctx.mermaid.renderAll();
    await this.ctx.waitForMath();

    // 2. Clone the rendered preview
    const source = DOM.el("preview");
    const clone = source.cloneNode(true);
    PdfExporter._stripInteractive(clone);

    // 3. Build the isolated print document
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(frame);

    try {
      await PdfExporter._writeDocument(frame, clone, this.ctx.i18n);
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } finally {
      // Give the print dialog time to take its snapshot
      setTimeout(() => frame.remove(), 60000);
    }
  }

  /** Remove buttons, hidden sources and live widgets. */
  static _stripInteractive(root) {
    DOM.qsa(
      ".mm-hdr-r, .mm-save, .copy-btn, .run-btn, .code-output, .mm-skeleton, .mm-src",
      root,
    ).forEach((el) => el.remove());

    // Plotly renders to canvas/WebGL; replace each chart
    // with a static PNG snapshot of what is on screen.
    DOM.qsa("div[data-plotly-src]", root).forEach((node, index) => {
      const live = DOM.qsa("div[data-plotly-src]", DOM.el("preview"))[index];
      const canvas = live?.querySelector("canvas");
      if (!canvas) return;
      const img = document.createElement("img");
      try {
        img.src = canvas.toDataURL("image/png");
        img.style.cssText = "width:100%;height:auto";
        node.replaceWith(img);
      } catch {
        /* tainted canvas — leave the node as is */
      }
    });
  }

  static _writeDocument(frame, clone, i18n) {
    const links = PdfExporter.STYLES.map(
      (href) => `<link rel="stylesheet" href="${href}">`,
    ).join("\n");

    const doc = frame.contentDocument;
    doc.open();
    doc.write(`<!doctype html>
<html lang="${i18n.store.lang}" dir="${i18n.isRtl ? "rtl" : "ltr"}">
<head><meta charset="utf-8"><base href="${location.href}">${links}</head>
<body><div id="app"><div id="preview"></div></div></body>
</html>`);
    doc.close();

    doc.getElementById("preview").replaceWith(clone);

    // Wait until every stylesheet and image is applied,
    // otherwise print() captures an unstyled document.
    return new Promise((resolve) => {
      const done = () => setTimeout(resolve, 350);
      if (frame.contentDocument.readyState === "complete") done();
      else frame.addEventListener("load", done, { once: true });
    });
  }
}
