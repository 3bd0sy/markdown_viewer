/* ═══════════════════════════════════════════════
   theme.service.js — Light/dark switching and the
   layout mode tabs (split / edit / preview).
   ═══════════════════════════════════════════════ */

class ThemeService {
  static STORAGE_KEY = "md-theme";
  static MODES = ["split", "edit", "preview"];

  constructor(store) {
    this.store = store;
    this.mode = "split";
  }

  restore() {
    let isDark = false;
    try {
      isDark = localStorage.getItem(ThemeService.STORAGE_KEY) === "dark";
    } catch {
      /* storage blocked */
    }
    this._paint(isDark);
    this.store.isDark = isDark;
  }

  toggle() {
    const isDark = !this.store.isDark;
    try {
      localStorage.setItem(ThemeService.STORAGE_KEY, isDark ? "dark" : "light");
    } catch {
      /* ignore */
    }
    this._paint(isDark);
    this.store.setDark(isDark); // listeners re-render diagrams and charts
  }

  _paint(isDark) {
    DOM.el("app")?.classList.toggle("dark", isDark);
    const btn = DOM.el("tbtn");
    if (btn) btn.textContent = isDark ? "☀️" : "🌙";
  }

  /** Switch pane layout; `btn` is the tab that was clicked. */
  setMode(mode, btn) {
    if (!ThemeService.MODES.includes(mode)) return;
    this.mode = mode;

    DOM.qsa(".tab").forEach((tab) => {
      const active = tab === btn;
      tab.classList.toggle("on", active);
      tab.setAttribute("aria-selected", String(active));
    });

    const app = DOM.el("app");
    app.classList.toggle("edit-mode", mode === "edit");
    app.classList.toggle("preview-mode", mode === "preview");
  }
}
