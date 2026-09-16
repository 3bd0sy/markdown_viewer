/* ═══════════════════════════════════════════════
   i18n.js — Language lookup and DOM application.
   Preview blocks carry data-i18n too, so switching
   language never requires re-rendering diagrams.
   ═══════════════════════════════════════════════ */

class I18n {
  static CYCLE = ["ar", "en"];
  static RTL_LANGS = new Set(["ar"]);
  static STORAGE_KEY = "md-lang";

  constructor(store, tables = TRANSLATIONS) {
    this.store = store;
    this.tables = tables;
  }

  /** Read the persisted language once at boot. */
  restore() {
    let lang = "ar";
    try {
      lang = localStorage.getItem(I18n.STORAGE_KEY) || "ar";
    } catch {
      /* storage blocked — fall back to default */
    }
    if (!this.tables[lang]) lang = "ar";
    this.store.lang = lang;
    return lang;
  }

  t(key) {
    return this.tables[this.store.lang]?.[key] ?? this.tables.en[key] ?? key;
  }

  get isRtl() {
    return I18n.RTL_LANGS.has(this.store.lang);
  }

  /**
   * Apply translations to a subtree.
   * Called after every preview swap so reused nodes
   * pick up the current language.
   */
  apply(root = document) {
    DOM.qsa("[data-i18n]", root).forEach((el) => {
      el.textContent = this.t(el.dataset.i18n);
    });

    DOM.qsa("[data-i18n-tip]", root).forEach((el) => {
      const value = this.t(el.dataset.i18nTip);
      el.title = value;
      el.setAttribute("aria-label", value);
    });

    if (root === document) this._applyDocumentChrome();
  }

  _applyDocumentChrome() {
    const html = DOM.el("html-root");
    if (html) {
      html.lang = this.store.lang;
      html.dir = this.isRtl ? "rtl" : "ltr";
    }

    const langBtn = DOM.el("langbtn");
    if (langBtn) {
      const next =
        I18n.CYCLE[(I18n.CYCLE.indexOf(this.store.lang) + 1) % I18n.CYCLE.length];
      langBtn.textContent = next === "ar" ? "ع" : next.toUpperCase();
    }
  }

  toggle() {
    const index = I18n.CYCLE.indexOf(this.store.lang);
    const next = I18n.CYCLE[(index + 1) % I18n.CYCLE.length];
    try {
      localStorage.setItem(I18n.STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    this.store.setLang(next);
    this.apply(document);
  }
}
