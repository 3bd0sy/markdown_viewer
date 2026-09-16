/* ═══════════════════════════════════════════════
   markdown-parser.js — Markdown → HTML string.
   Pure: no DOM writes, no async work.
   ═══════════════════════════════════════════════ */

class MarkdownParser {
  constructor({ registry, highlighter, i18n }) {
    this.registry = registry;
    this.highlighter = highlighter;
    this.i18n = i18n;
  }

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

  parse(source) {
    const ctx = {
      t: (key) => this.i18n.t(key),
      key: this._makeKeyFactory(),
      highlight: (code, lang) => this.highlighter.highlight(code, lang),
    };

    const withFootnotes = Preprocessors.footnotes(source);
    const { src: safe, map: mathMap } = Preprocessors.extractMath(withFootnotes);

    const tokens = marked.lexer(safe);
    let html = "";
    let batch = [];

    /**
     * Render buffered tokens in one marked.parser() call.
     * Parsing token-by-token dropped tokens.links, which
     * broke reference-style links, and was far slower.
     */
    const flush = () => {
      if (!batch.length) return;
      batch.links = tokens.links || {};
      html += marked.parser(batch);
      batch = [];
    };

    for (const tok of tokens) {
      if (tok.type !== "code") {
        batch.push(tok);
        continue;
      }

      const lang = (tok.lang || "").toLowerCase().trim();
      const BlockClass = this.registry.get(lang) ?? CodeBlock;
      flush();

      try {
        html += BlockClass.render(tok, ctx);
      } catch (e) {
        Logger.error(`block "${lang}" failed to render`, e);
        html += `<p class="mm-err">${Utils.esc(e.message)}</p>`;
      }
    }
    flush();

    html = Preprocessors.restoreMath(html, mathMap);
    return Preprocessors.freezeCheckboxes(html);
  }

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
