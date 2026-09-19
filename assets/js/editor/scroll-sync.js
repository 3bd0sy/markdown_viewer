/* ═══════════════════════════════════════════════
   scroll-sync.js — Mirrors scroll position between
   the editor and the preview pane.

   Position is expressed as a ratio (0..1) of how far
   the pane has scrolled, not as a pixel offset: the
   two panes almost never have the same content height,
   so a pixel-for-pixel mirror would drift immediately.
   ═══════════════════════════════════════════════ */

class ScrollSyncController {
  static STORAGE_KEY = "md-scroll-sync";

  /**
   * @param {object} opts
   * @param {HTMLElement} opts.editorEl
   * @param {HTMLElement} opts.previewEl
   */
  constructor({ editorEl, previewEl }) {
    this.editorEl = editorEl;
    this.previewEl = previewEl;
    this.enabled = false;
    // Set while one pane's scroll is being applied to the other,
    // so that programmatic scroll does not re-trigger itself and
    // bounce back and forth between the two listeners.
    this._applying = false;
    this._detachEditor = null;
    this._detachPreview = null;
    this.enable();
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    this._detachEditor = DOM.on(this.editorEl, "scroll", () =>
      this._mirror(this.editorEl, this.previewEl),
    );
    this._detachPreview = DOM.on(this.previewEl, "scroll", () =>
      this._mirror(this.previewEl, this.editorEl),
    );
    this._persist(true);
  }

  disable() {
    if (!this.enabled) return;
    this.enabled = false;
    this._detachEditor?.();
    this._detachPreview?.();
    this._detachEditor = null;
    this._detachPreview = null;
    this._persist(false);
  }

  toggle() {
    if (this.enabled) this.disable();
    else this.enable();
    return this.enabled;
  }

  _persist(enabled) {
    try {
      localStorage.setItem(
        ScrollSyncController.STORAGE_KEY,
        enabled ? "1" : "0",
      );
    } catch {
      /* ignore */
    }
  }

  /**
   * Apply `source`'s scroll ratio to `target`.
   * requestAnimationFrame both smooths the mirrored scroll and
   * gives the browser one tick to finish `source`'s own scroll
   * before `_applying` is cleared.
   */
  _mirror(source, target) {
    if (this._applying) return;
    this._applying = true;

    const sourceRange = source.scrollHeight - source.clientHeight;
    const ratio = sourceRange > 0 ? source.scrollTop / sourceRange : 0;
    const targetRange = target.scrollHeight - target.clientHeight;

    target.scrollTop = ratio * Math.max(targetRange, 0);

    requestAnimationFrame(() => {
      this._applying = false;
    });
  }
}
