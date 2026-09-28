/* ═══════════════════════════════════════════════
   docx-context.js — Single source of mutable state for
   one DOCX export pass: the docx namespace, image map,
   direction policy, i18n, per-scope grid/tab maps, and
   the "current tab" presentation flags.

   Any renderer that needs to recurse into raw Markdown
   (grid cells, tab bodies) does it through withScope(),
   which swaps a set of fields for the duration of a
   callback and restores them afterwards — even on error.
   This replaces the manual

       const old = this.gridMap;
       try { ... } finally { this.gridMap = old; }

   pattern that used to be repeated in every recursive
   renderer, and is what makes

       Tab → Grid → Tab → Grid

   safe to nest without one recursion clobbering another's
   state. It also carries `contentWidth`, so a table or
   grid nested inside a tab/grid cell sizes itself against
   the cell's real usable width instead of the full page
   width — see the `contentWidth` override in
   docx-tabs-renderer.js and docx-grid-renderer.js.
   ═══════════════════════════════════════════════ */

class DocxContext {
  /**
   * @param {object} docx      window.docx namespace
   * @param {object} imageMap  { [diagramIndex]: {dataUrl,width,height}, map: [...] }
   *        one shared index across every diagram type
   *        (Mermaid, Plotly, …), in raw source order —
   *        see WordExporter.captureDiagrams()
   * @param {DirectionResolver|boolean} direction
   * @param {object|null} i18n
   */
  constructor({ docx, imageMap = {}, direction = true, i18n = null }) {
    this.d = docx;
    this.imageMap = imageMap;
    this.i18n = i18n;
    this.dir = DocxContext.asResolver(direction);

    /* One counter for every pre-rendered diagram type
       (Mermaid, Plotly, …), advancing in document order. */
    this.diagramIndex = 0;
    this.mapIndex = 0;

    this.contentWidth = DOCX_THEME.page.width - DOCX_THEME.page.margin * 2;

    /* Per-scope preprocessing maps. Swapped via withScope()
       while recursively rendering grids/tabs, restored after. */
    this.gridMap = [];
    this.tabMap = [];

    /* Tab-local presentation state. */
    this.tabDirection = null;
    this.suppressCodeHeader = false;
  }

  /**
   * Accept either a resolver or a boolean, so older call
   * sites keep working. Failing loudly beats silently
   * guessing a direction policy.
   */
  static asResolver(direction) {
    if (direction && typeof direction.resolveBlock === "function") {
      return direction;
    }
    if (typeof DirectionResolver === "undefined") {
      throw new Error(
        "DocxBuilder needs direction-resolver.js loaded before it.",
      );
    }
    return DirectionResolver.fixed(direction !== false);
  }

  /**
   * Ask the document policy for this block's direction.
   *
   * @param {string} text       the WHOLE block's text
   * @param {string} blockType  heading | paragraph | list |
   *                            table | blockquote | code
   * @param {object} [options]
   * @param {boolean|null} [options.inherited]  parent's
   *        direction; nested content never re-decides
   * @param {'rtl'|'ltr'|null} [options.explicit]  author
   *        override, reserved for markdown directives
   */
  resolveBlock(text, blockType = "paragraph", options = {}) {
    const { explicit = null, inherited = null } = options;

    if (explicit === null && inherited !== null) return inherited;

    if (explicit === null && this.tabDirection !== null) {
      return this.tabDirection;
    }

    return this.dir.resolveBlock(text, blockType, { explicit });
  }

  setRootMaps({ grids = [], tabs = [] }) {
    this.gridMap = grids;
    this.tabMap = tabs;
  }

  resetForBuild() {
    this.diagramIndex = 0;
    this.mapIndex = 0;
  }

  /** i18n lookup with a hard fallback — never throws. */
  t(key, fallback) {
    try {
      const value = this.i18n?.t(key);
      return value && value !== key ? String(value) : fallback;
    } catch {
      return fallback;
    }
  }

  nextDiagram() {
    return this.imageMap?.[this.diagramIndex++] || null;
  }

  nextMap() {
    return this.imageMap?.map?.[this.mapIndex++] || null;
  }

  /**
   * Swap a set of fields for the duration of `callback`,
   * restoring the previous values afterwards — even if
   * callback throws. Used by grid cells and tab bodies to
   * recurse into their own raw Markdown without leaking
   * state into (or inheriting stale state from) the
   * surrounding container.
   *
   * @param {object} overrides   fields to set on this context
   * @param {Function} callback  runs with the overrides applied
   */
  withScope(overrides, callback) {
    const previous = {};

    for (const key of Object.keys(overrides)) {
      previous[key] = this[key];
      this[key] = overrides[key];
    }

    try {
      return callback();
    } finally {
      Object.assign(this, previous);
    }
  }
}
