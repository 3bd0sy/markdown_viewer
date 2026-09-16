/* ═══════════════════════════════════════════════
   editor-controller.js — Textarea behaviour.

   The render debounce scales with document size: short
   notes stay responsive, long documents stop trying to
   re-render mid-paste.
   ═══════════════════════════════════════════════ */

class EditorController {
  static SHORT_DELAY = 250;
  static LONG_DELAY = 600;
  static LONG_DOC_CHARS = 20000;

  constructor({ store, bus, renderer, storage }) {
    this.store = store;
    this.bus = bus;
    this.renderer = renderer;
    this.storage = storage;
    this._timer = null;
  }

  get el() {
    return DOM.el("editor");
  }

  attach() {
    DOM.on(this.el, "input", () => {
      this.scheduleRender();
      this.storage.autosave();
      this.bus.emit(Events.CONTENT_CHANGED);
    });

    // Tab inserts indentation instead of leaving the field
    DOM.on(this.el, "keydown", (event) => {
      if (event.key !== "Tab" || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      this.insertAtCursor("  ");
    });
  }

  /** Debounce interval grows with the document length. */
  scheduleRender() {
    clearTimeout(this._timer);
    const delay =
      this.el.value.length > EditorController.LONG_DOC_CHARS
        ? EditorController.LONG_DELAY
        : EditorController.SHORT_DELAY;
    this._timer = setTimeout(() => this.renderer.render(), delay);
  }

  renderNow() {
    clearTimeout(this._timer);
    return this.renderer.render();
  }

  _applyEdit(result) {
    if (!result) return;
    const el = this.el;
    el.value = result.value;
    el.selectionStart = result.start;
    el.selectionEnd = result.end;
    el.focus();
    this.scheduleRender();
    this.storage.autosave();
  }

  format(type) {
    const el = this.el;
    this._applyEdit(
      FormatCommands.wrap(el.value, el.selectionStart, el.selectionEnd, type),
    );
  }

  setDirection(dir) {
    const el = this.el;
    this._applyEdit(
      FormatCommands.direction(el.value, el.selectionStart, el.selectionEnd, dir),
    );
  }

  insertAtCursor(text) {
    const el = this.el;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = el.value.slice(0, start) + text + el.value.slice(end);
    this._applyEdit({
      value,
      start: start + text.length,
      end: start + text.length,
    });
  }
}
