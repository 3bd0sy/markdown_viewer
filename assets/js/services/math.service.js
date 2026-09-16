/* ═══════════════════════════════════════════════
   math.service.js — MathJax typesetting.
   Typeset runs are coalesced: a burst of renders
   produces one pass, not one per render.
   ═══════════════════════════════════════════════ */

class MathService {
  constructor() {
    this._queued = false;
  }

  get ready() {
    return !!window.MathJax?.typesetPromise;
  }

  /** Typeset the preview once the current frame settles. */
  typeset(previewEl = DOM.el("preview")) {
    if (!previewEl || !this.ready || this._queued) return;
    this._queued = true;

    requestAnimationFrame(async () => {
      this._queued = false;
      try {
        window.MathJax.typesetClear?.([previewEl]);
        await window.MathJax.typesetPromise([previewEl]);
      } catch (e) {
        Logger.debug("typeset failed", e);
      }
    });
  }

  /** Resolves once the current typeset pass has settled. */
  async whenIdle() {
    if (!this.ready) return;
    try {
      await window.MathJax.startup?.promise;
      await window.MathJax.typesetPromise();
    } catch {
      /* typeset errors must not block an export */
    }
  }

  /** Bind to the async MathJax script so the first pass is not missed. */
  bindStartup(onReady) {
    const script = DOM.el("MathJax-script");
    const fire = () => {
      window.MathJax?.startup?.promise?.then(onReady)?.catch(() => {});
    };
    if (script) script.addEventListener("load", fire);
    if (window.MathJax?.startup?.promise) fire();
  }
}
