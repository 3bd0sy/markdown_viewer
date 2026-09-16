/* ═══════════════════════════════════════════════
   dom.js — Cached element lookups + delegated events.
   All inline onclick handlers were replaced by
   data-action attributes routed through here.
   ═══════════════════════════════════════════════ */

class DOM {
  static _cache = new Map();

  /** getElementById with a cache that self-heals when nodes are replaced. */
  static el(id) {
    const cached = DOM._cache.get(id);
    if (cached && cached.isConnected) return cached;
    const found = document.getElementById(id);
    if (found) DOM._cache.set(id, found);
    return found;
  }

  static qs(selector, root = document) {
    return root.querySelector(selector);
  }

  static qsa(selector, root = document) {
    return [...root.querySelectorAll(selector)];
  }

  static on(target, type, handler, opts) {
    target.addEventListener(type, handler, opts);
    return () => target.removeEventListener(type, handler, opts);
  }

  /**
   * Delegated click router.
   * Any element with data-action bubbles to a single listener,
   * so preview content can be swapped freely without rebinding.
   */
  static delegateClicks(root, routes) {
    root.addEventListener("click", (event) => {
      const target = event.target.closest("[data-action]");
      if (!target || !root.contains(target)) return;
      const action = target.dataset.action;
      const handler = routes[action];
      if (!handler) return;
      event.preventDefault();
      handler(target, event);
    });
  }

  static setText(id, value) {
    const node = DOM.el(id);
    if (node) node.textContent = value;
  }

  /** Show a transient message in the export status slot. */
  static flashStatus(text, ms = 2500) {
    const node = DOM.el("xstatus");
    if (!node) return;
    node.textContent = text;
    clearTimeout(DOM._statusTimer);
    if (ms) DOM._statusTimer = setTimeout(() => (node.textContent = ""), ms);
  }
}
