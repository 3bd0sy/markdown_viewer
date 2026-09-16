/* ═══════════════════════════════════════════════
   storage.service.js — Persist the document body.
   Autosave is debounced so typing never hits
   localStorage on every keystroke.
   ═══════════════════════════════════════════════ */

class StorageService {
  static KEY = "md_saved";
  static AUTOSAVE_MS = 4000;

  constructor(store, i18n) {
    this.store = store;
    this.i18n = i18n;
    this.autosave = Utils.debounce(() => this.save(true), StorageService.AUTOSAVE_MS);
  }

  load() {
    try {
      return localStorage.getItem(StorageService.KEY) ?? DEFAULT_CONTENT;
    } catch {
      return DEFAULT_CONTENT;
    }
  }

  save(silent = false) {
    const indicator = DOM.el("saveindicator");
    try {
      localStorage.setItem(StorageService.KEY, DOM.el("editor").value);
      if (indicator) indicator.textContent = this.i18n.t("saved");
    } catch (e) {
      if (indicator) {
        indicator.textContent =
          e.name === "QuotaExceededError"
            ? this.i18n.t("saveQuotaError")
            : this.i18n.t("saveError");
      }
      Logger.warn("save failed", e);
    }
    if (silent || !indicator) return;
    indicator.classList.add("show");
    setTimeout(() => indicator.classList.remove("show"), 1800);
  }

  clear() {
    try {
      localStorage.removeItem(StorageService.KEY);
    } catch {
      /* ignore */
    }
    DOM.el("editor").value = DEFAULT_CONTENT;
    this.store.invalidate();
  }
}
