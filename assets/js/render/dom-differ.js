/* ═══════════════════════════════════════════════
   dom-differ.js — Swap preview content while keeping
   expensive nodes alive.

   The old pipeline assigned innerHTML, which destroyed
   every rendered SVG, every loaded iframe and every
   Plotly instance — so the diagram cache could never
   hit. Nodes carrying data-key are now moved from the
   old tree into the new one.
   ═══════════════════════════════════════════════ */

class DomDiffer {
  /**
   * @param {HTMLElement} container  live preview element
   * @param {string} html            freshly parsed markup
   * @param {(el:HTMLElement)=>void} onDispose  called for dropped nodes
   * @returns {{reused:number, created:number, dropped:number}}
   */
  static swap(container, html, onDispose = () => {}) {
    const stage = document.createElement("div");
    stage.innerHTML = html;

    // Index the nodes currently on screen
    const live = new Map();
    DOM.qsa("[data-key]", container).forEach((el) => {
      if (!live.has(el.dataset.key)) live.set(el.dataset.key, el);
    });

    const incoming = DOM.qsa("[data-key]", stage);
    let reused = 0;

    for (const fresh of incoming) {
      const existing = live.get(fresh.dataset.key);
      if (!existing) continue;
      live.delete(fresh.dataset.key);
      fresh.replaceWith(existing); // transplant the live node
      reused++;
    }

    // Whatever is left was removed from the document
    live.forEach((el) => {
      try {
        onDispose(el);
      } catch (e) {
        Logger.debug("dispose failed", e);
      }
    });

    // One mutation instead of N
    container.replaceChildren(...stage.childNodes);

    return {
      reused,
      created: incoming.length - reused,
      dropped: live.size,
    };
  }

  /** Release resources held by a node that is being discarded. */
  static defaultDispose(el) {
    const plotHosts = el.matches?.("div[data-plotly-src]")
      ? [el]
      : DOM.qsa("div[data-plotly-src]", el);
    plotHosts.forEach(PlotlyService.dispose);

    DOM.qsa("iframe", el).forEach((frame) => (frame.src = "about:blank"));
    DOM.qsa("video", el).forEach((video) => {
      video.pause?.();
      video.removeAttribute("src");
      video.load?.();
    });
  }
}
