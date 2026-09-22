/* ═══════════════════════════════════════════════
   markdown-parser.js — Markdown → HTML string.
   Pure: no DOM writes, no async work.

   Pipeline:
     source
       → footnotes
       → extractMath
       → grids          (returns markers + map)
       → callouts
       → tabs
       → marked.lexer
       → _processTokensToHtml  (grid markers resolved here)
       → restoreMath
       → freezeCheckboxes

   Grid items re-enter the full pipeline recursively,
   so Mermaid, Plotly, tables, math, and code blocks
   survive inside grid cells.
   ═══════════════════════════════════════════════ */

class MarkdownParser {
  constructor({ registry, highlighter, i18n }) {
    this.registry = registry;
    this.highlighter = highlighter;
    this.i18n = i18n;
  }

  /* ═══════════ Key factory ═══════════ */

  /**
   * Content-derived DOM keys.
   * Identical blocks appearing twice get a suffix so
   * each occurrence maps to its own node.
   */
  _makeKeyFactory() {
    const seen = new Map();
    return (prefix, text) => {
      const base = `${prefix}${Utils.hash(text)}`;
      const count = (seen.get(base) ?? 0) + 1;
      seen.set(base, count);
      return count === 1 ? base : `${base}_${count}`;
    };
  }

  /* ═══════════ Public entry point ═══════════ */

  parse(source) {
    /* ── 1) Preprocessors in order ──────────── */

    // Footnotes must run before math so `$` inside a
    // footnote body is protected like any other text.
    const withFootnotes = Preprocessors.footnotes(source);

    // Protect LaTeX spans before any HTML generation.
    const { src: afterMath, map: mathMap } =
      Preprocessors.extractMath(withFootnotes);

    // Grids run on raw Markdown and store item content
    // verbatim. They must run BEFORE callouts and tabs
    // so item bodies keep their original container syntax.
    const { src: afterGrids, grids } = Preprocessors.grids(afterMath);

    // Callouts and tabs generate single-line HTML blocks
    // that marked.lexer can consume as one piece.
    let src = Preprocessors.callouts(afterGrids);
    src = Preprocessors.tabs(src);

    /* ── 2) Context ─────────────────────────── */

    const ctx = {
      t: (key) => this.i18n.t(key),
      key: this._makeKeyFactory(),
      highlight: (code, lang) => this.highlighter.highlight(code, lang),
      // Grid definition map for the current scope.
      // Resolved by _renderGrid when a marker is seen.
      grids,
    };

    /* ── 3) Lex + process ───────────────────── */

    const tokens = marked.lexer(src);
    let html = this._processTokensToHtml(tokens, ctx);

    html = Preprocessors.restoreMath(html, mathMap);
    return Preprocessors.freezeCheckboxes(html);
  }

  /* ═══════════ Token processing ═══════════ */

  /**
   * Convert a token array to HTML.
   *
   * Called at the top level, and recursively from
   * _renderGridItem for every grid item body.
   *
   * Special cases:
   *   - html token matching `<!--MD-GRID:N-->`
   *         → resolved to <div class="md-grid">...</div>
   *   - code token
   *         → routed through BlockRegistry (Mermaid, Plotly, …)
   *   - everything else
   *         → batched and handed to marked.parser
   *
   * Batch rendering preserves tokens.links so reference-style
   * links keep working across the whole block.
   */
  _processTokensToHtml(tokens, ctx) {
    let html = "";
    let batch = [];

    /** Render buffered tokens in one marked.parser() call. */
    const flush = () => {
      if (!batch.length) return;
      batch.links = tokens.links || {};
      html += marked.parser(batch);
      batch = [];
    };

    for (const tok of tokens) {
      /* ── A) Grid marker ───────────────────── */
      if (tok.type === "html") {
        const text = String(tok.text || "").trim();
        const m = /^<!--MD-GRID:(\d+)-->$/.exec(text);
        if (m) {
          flush();
          const gridDef = ctx.grids?.[+m[1]];
          html += this._renderGrid(gridDef, ctx);
          continue;
        }
      }

      /* ── B) Code block → BlockRegistry ────── */
      if (tok.type === "code") {
        const lang = (tok.lang || "").toLowerCase().trim();
        const BlockClass = this.registry.get(lang) ?? CodeBlock;

        flush(); // flush before we splice in custom HTML

        try {
          html += BlockClass.render(tok, ctx);
        } catch (e) {
          Logger.error(`block "${lang}" failed to render`, e);
          html += `<p class="mm-err">${Utils.esc(e.message)}</p>`;
        }
        continue;
      }

      /* ── C) Everything else ───────────────── */
      batch.push(tok);
    }

    flush();
    return html;
  }

  /* ═══════════ Grid rendering ═══════════ */

  /**
   * Turn a grid definition into HTML.
   *
   * Each item is processed by _renderGridItem, which runs
   * the full pipeline on the item's raw Markdown. Nested
   * grids inside items are handled transparently because
   * each item gets its own grids map.
   */
  _renderGrid(gridDef, ctx) {
    if (!gridDef || !gridDef.items?.length) return "";

    /* ── 1) Normalize columns and gap ──────── */
    const cols = this._normalizeGridColumns(gridDef.columns);
    const gap = Number.isFinite(gridDef.gap) ? gridDef.gap : 16;
    const colCount = this._gridColumnCount(cols);

    /* ── 2) Build item HTML ────────────────── */
    const itemsHtml = gridDef.items
      .map((item) => {
        const span = this._normalizeGridSpan(item.span, colCount);
        const inner = this._renderGridItem(item.content, ctx);
        const spanStyle = span > 1 ? ` style="grid-column: span ${span}"` : "";
        return `<div class="md-grid-item"${spanStyle}>${inner}</div>`;
      })
      .join("");

    /* ── 3) Wrap in the container ──────────── */
    return (
      `<div class="md-grid" ` +
      `style="--md-grid-cols: ${Utils.attr(cols)}; ` +
      `--md-grid-gap: ${gap}px">` +
      itemsHtml +
      `</div>`
    );
  }

  /**
   * Process one grid item's raw Markdown.
   *
   * Runs the same pipeline as the top-level parse, but with
   * a fresh grids map. This keeps nested grid markers
   * scoped to their own item and prevents index collisions
   * with markers in the parent document.
   */
  _renderGridItem(rawMarkdown, parentCtx) {
    /* ── 1) Preprocessors on the item body ─── */
    const withFootnotes = Preprocessors.footnotes(rawMarkdown);
    const { src: afterMath, map: mathMap } =
      Preprocessors.extractMath(withFootnotes);

    // Nested grids inside this item — their own map.
    const { src: afterGrids, grids } = Preprocessors.grids(afterMath);

    let src = Preprocessors.callouts(afterGrids);
    src = Preprocessors.tabs(src);

    /* ── 2) Child context ──────────────────── */
    // Inherit t / key / highlight from the parent, but
    // replace `grids` with this item's own map so nested
    // markers resolve against the correct definitions.
    const childCtx = { ...parentCtx, grids };

    /* ── 3) Lex + process ──────────────────── */
    const tokens = marked.lexer(src);
    let html = this._processTokensToHtml(tokens, childCtx);

    html = Preprocessors.restoreMath(html, mathMap);
    return html;
  }

  /* ═══════════ Grid helpers ═══════════ */

  /**
   * Accept only a safe subset of grid-template-columns.
   *
   * Valid inputs:
   *   "3"          → repeat(3, minmax(0, 1fr))
   *   "2fr 1fr"    → as-is
   *   "1fr 2fr 1fr"→ as-is
   *
   * Anything else falls back to a two-column layout.
   */
  _normalizeGridColumns(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return "repeat(2, minmax(0, 1fr))";

    // Integer track count (1..12)
    if (/^\d+$/.test(raw)) {
      const n = parseInt(raw, 10);
      if (n >= 1 && n <= 12) {
        return `repeat(${n}, minmax(0, 1fr))`;
      }
    }

    // fr-based track list: "2fr 1fr", "1fr 2fr 1fr", …
    if (/^(?:\d+(?:\.\d+)?fr)(?:\s+\d+(?:\.\d+)?fr)*$/.test(raw)) {
      return raw;
    }

    return "repeat(2, minmax(0, 1fr))";
  }

  /**
   * Clamp an item's span between 1 and the column count.
   * Empty / invalid values become 1.
   */
  _normalizeGridSpan(value, columnCount) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(n, columnCount);
  }

  /**
   * Derive the track count from a normalized column spec.
   * Used to clamp span values.
   */
  _gridColumnCount(spec) {
    const rep = spec.match(/repeat\(\s*(\d+)/);
    if (rep) return parseInt(rep[1], 10);
    return spec.split(/\s+/).filter(Boolean).length || 2;
  }

  /* ═══════════ Default wiring ═══════════ */

  /** Default wiring used by the app. */
  static createRegistry() {
    return new BlockRegistry()
      .register(MermaidBlock)
      .register(PlotlyBlock)
      .register(MapBlock)
      .register(VideoBlock)
      .register(Model3DBlock);
  }
}
