/* ═══════════════════════════════════════════════
   event-bus.js — Minimal pub/sub so services stay
   decoupled (theme change, language change, render
   completion) instead of calling each other directly.
   ═══════════════════════════════════════════════ */

class EventBus {
  constructor() {
    this._handlers = new Map();
  }

  on(event, handler) {
    if (!this._handlers.has(event)) this._handlers.set(event, new Set());
    this._handlers.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    this._handlers.get(event)?.delete(handler);
  }

  emit(event, payload) {
    const set = this._handlers.get(event);
    if (!set) return;
    for (const handler of [...set]) {
      try {
        handler(payload);
      } catch (e) {
        Logger.error(`handler failed for "${event}"`, e);
      }
    }
  }
}

/** Canonical event names — avoids typo-driven silent failures. */
const Events = {
  THEME_CHANGED: "theme:changed",
  LANG_CHANGED: "lang:changed",
  RENDER_START: "render:start",
  RENDER_DONE: "render:done",
  CONTENT_CHANGED: "content:changed",
};
