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
    const livePreview = previewEl && previewEl.isConnected ? previewEl : DOM.el("preview");
    if (!livePreview || !this.ready || this._queued) return;
    this._queued = true;

    requestAnimationFrame(async () => {
      const target = livePreview;
      if (!target || !target.isConnected) {
        this._queued = false;
        return;
      }
      this._queued = false;
      try {
        window.MathJax.typesetClear?.([target]);
        await window.MathJax.startup?.promise;
        await window.MathJax.typesetPromise([target]);
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
    let fired = false;

    const fire = () => {
      if (fired) return;
      if (!window.MathJax?.startup?.promise?.then) return;
      fired = true;
      window.MathJax.startup.promise
        .then(() => onReady?.())
        .catch(() => { });
    };

    const script = DOM.el("MathJax-script");
    if (script) script.addEventListener("load", fire, { once: true });

    const poll = setInterval(() => {
      if (window.MathJax?.startup?.promise?.then) {
        clearInterval(poll);
        fire();
      }
    }, 100);

    setTimeout(() => clearInterval(poll), 30000);
  }
}
