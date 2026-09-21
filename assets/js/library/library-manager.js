/* ═══════════════════════════════════════════════
   library-manager.js — Simple document library.

   A flat list of documents + a dropdown menu.
   No hierarchy, no collections, no links.

   Public API:
     init()      — load state, seed on first run
     mount(btn, menu)
     create(title, content)
     open(id)
     delete(id)
     saveCurrent()
     list()
   ═══════════════════════════════════════════════ */

class LibraryManager {
  static DOCS_KEY = "md-editor:docs:v1";
  static ACTIVE_KEY = "md-editor:active-doc:v1";
  static SAVE_DEBOUNCE = 400;

  constructor({ bus, i18n, getEditor, setEditor, onOpen } = {}) {
    this.bus = bus || null;
    this.i18n = i18n || null;
    this.getEditor = getEditor || (() => "");
    this.setEditor = setEditor || (() => {});
    this.onOpen = onOpen || (() => {});

    this.docs = []; // flat array
    this.activeId = null;
    this._saveTimer = null;
    this._isOpen = false;

    this.btn = null;
    this.menu = null;
  }

  /* ── Lifecycle ─────────────────────────────── */

  init() {
    this._load();

    if (!this.docs.length) {
      // First run → seed with whatever is currently in the editor
      const seed = this.getEditor() || "";
      const doc = this._newDoc(this._autoTitle(seed), seed);
      this.docs.push(doc);
      this.activeId = doc.id;
      this._persist();
      this._persistActive();
      return;
    }

    // Restore last active, else fall back to most recent
    const stored = localStorage.getItem(LibraryManager.ACTIVE_KEY);
    const found = stored && this.docs.find((d) => d.id === stored);
    this.activeId = found ? stored : this._mostRecent().id;

    const active = this.getActive();
    if (active) this.setEditor(active.content || "");
    this._persistActive();
  }

  /* ── Storage ───────────────────────────────── */

  _load() {
    try {
      const raw = localStorage.getItem(LibraryManager.DOCS_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        // normalize + drop malformed entries
        this.docs = arr.filter(
          (d) => d && typeof d.id === "string" && typeof d.content === "string",
        );
      }
    } catch (e) {
      Logger.warn("library: load failed", e);
    }
  }

  _persist() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(
          LibraryManager.DOCS_KEY,
          JSON.stringify(this.docs),
        );
      } catch (e) {
        Logger.warn("library: save failed", e);
      }
    }, LibraryManager.SAVE_DEBOUNCE);
  }

  _persistActive() {
    try {
      localStorage.setItem(LibraryManager.ACTIVE_KEY, this.activeId || "");
    } catch {
      /* ignore */
    }
  }

  /* ── Public API ────────────────────────────── */

  getActive() {
    return this.docs.find((d) => d.id === this.activeId) || null;
  }

  /** Sorted list — most recently updated first. */
  list() {
    return [...this.docs].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  create(title, content) {
    const doc = this._newDoc(title || "Untitled", content || "");
    this.docs.push(doc);
    this.activeId = doc.id;
    this.setEditor(doc.content);
    this._persist();
    this._persistActive();
    this._renderMenu();
    return doc;
  }

  open(id) {
    if (id === this.activeId) return false;
    const doc = this.docs.find((d) => d.id === id);
    if (!doc) return false;

    this.saveCurrent(); // flush current content before switching

    this.activeId = id;
    this.setEditor(doc.content);
    this._persistActive();
    this.onOpen(doc);
    this._renderMenu();
    return true;
  }

  delete(id) {
    const idx = this.docs.findIndex((d) => d.id === id);
    if (idx < 0) return false;

    this.docs.splice(idx, 1);

    if (this.activeId === id) {
      if (this.docs.length) {
        const next = this._mostRecent();
        this.activeId = next.id;
        this.setEditor(next.content);
        this.onOpen(next);
      } else {
        // Never leave the user with an empty library
        const fresh = this._newDoc("Untitled", "");
        this.docs.push(fresh);
        this.activeId = fresh.id;
        this.setEditor("");
      }
    }

    this._persist();
    this._persistActive();
    this._renderMenu();
    return true;
  }

  /** Write the editor's current content into the active doc. */
  saveCurrent() {
    const doc = this.getActive();
    if (!doc) return;

    const content = this.getEditor();

    // Skip redundant writes
    if (doc.content === content) return;

    doc.content = content;
    doc.updatedAt = Date.now();

    // Auto-title from the first meaningful line, if still default
    if (doc.title === "Untitled" && content.trim()) {
      doc.title = this._autoTitle(content);
    }

    this._persist();
  }

  /* ── Menu UI ───────────────────────────────── */

  mount(btnEl, menuEl) {
    if (!btnEl || !menuEl) return;
    this.btn = btnEl;
    this.menu = menuEl;

    // Toggle on button click
    btnEl.addEventListener("click", (e) => {
      e.stopPropagation();
      this._isOpen ? this.close() : this.openMenu();
    });

    // Menu interactions
    menuEl.addEventListener("click", (e) => {
      e.stopPropagation();

      const actionEl = e.target.closest("[data-lib-action]");
      if (actionEl) {
        const action = actionEl.dataset.libAction;
        if (action === "new") {
          this.saveCurrent();
          this.create("Untitled", "");
          this.close();
        } else if (action === "delete") {
          const id = actionEl.closest("[data-doc-id]")?.dataset.docId;
          if (!id) return;
          const msg = this.i18n?.t("deleteDocument") || "Delete this document?";
          if (confirm(msg)) this.delete(id);
        }
        return;
      }

      const item = e.target.closest("[data-doc-id]");
      if (item) {
        this.open(item.dataset.docId);
        this.close();
      }
    });

    // Click outside → close
    document.addEventListener("click", () => this.close());

    // Escape → close
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });
  }

  openMenu() {
    if (!this.menu) return;
    this._isOpen = true;
    this.menu.hidden = false;
    this.btn.setAttribute("aria-expanded", "true");
    this._renderMenu();
  }

  close() {
    if (!this._isOpen) return;
    this._isOpen = false;
    if (this.menu) this.menu.hidden = true;
    if (this.btn) this.btn.setAttribute("aria-expanded", "false");
  }

  _renderMenu() {
    if (!this.menu) return;
    const t = (k, f) => this.i18n?.t(k) || f;
    const items = this.list()
      .map((d) => this._renderItem(d))
      .join("");

    this.menu.innerHTML =
      `<div class="lib-menu-header">` +
      `<span>${Utils.esc(t("libraryLabel", "Documents"))}</span>` +
      `<button type="button" class="lib-menu-new" ` +
      `data-lib-action="new" ` +
      `title="${Utils.attr(t("newDocument", "New document"))}">＋</button>` +
      `</div>` +
      `<div class="lib-menu-list">` +
      (items ||
        `<div class="lib-menu-empty">${Utils.esc(
          t("libraryEmpty", "No saved documents"),
        )}</div>`) +
      `</div>`;
  }

  _renderItem(doc) {
    const isActive = doc.id === this.activeId;
    const when = this._relative(doc.updatedAt);
    return (
      `<div class="lib-menu-item${isActive ? " is-active" : ""}" ` +
      `data-doc-id="${Utils.attr(doc.id)}">` +
      `<div class="lib-menu-item-main">` +
      `<div class="lib-menu-item-title">${Utils.esc(doc.title || "Untitled")}</div>` +
      `<div class="lib-menu-item-meta">${Utils.esc(when)}</div>` +
      `</div>` +
      `<button type="button" class="lib-menu-item-del" ` +
      `data-lib-action="delete" ` +
      `title="${Utils.attr(this.i18n?.t("delete") || "Delete")}" ` +
      `aria-label="${Utils.attr(this.i18n?.t("delete") || "Delete")}">✕</button>` +
      `</div>`
    );
  }

  /* ── Helpers ───────────────────────────────── */

  _mostRecent() {
    return this.list()[0];
  }

  _newDoc(title, content) {
    const now = Date.now();
    return {
      id: `d_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      title,
      content,
      createdAt: now,
      updatedAt: now,
    };
  }

  _autoTitle(content) {
    if (!content || !content.trim()) return "Untitled";
    const first = content.split("\n").find((l) => l.trim());
    if (!first) return "Untitled";
    return (
      first
        .replace(/^#+\s*/, "")
        .trim()
        .slice(0, 60) || "Untitled"
    );
  }

  _relative(ts) {
    const diff = Date.now() - (ts || 0);
    const s = Math.floor(diff / 1000);
    if (s < 60) return "just now";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d`;
    return new Date(ts).toLocaleDateString();
  }
}
