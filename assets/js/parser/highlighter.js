/* ═══════════════════════════════════════════════
   highlighter.js — Cached syntax highlighting.

   hljs.highlightAuto() probes every registered
   language and used to run on every code block on
   every keystroke. Auto-detection is gone; results
   are memoised by (language + source).
   ═══════════════════════════════════════════════ */

class Highlighter {
  static MAX_ENTRIES = 400;

  constructor() {
    this.cache = new Map();
  }

  /** Returns highlighted HTML, or escaped plain text when unknown. */
  highlight(code, lang) {
    const key = `${lang}\u0000${code}`;
    const hit = this.cache.get(key);
    if (hit !== undefined) {
      this.cache.delete(key); // refresh LRU position
      this.cache.set(key, hit);
      return hit;
    }

    let html;
    try {
      html =
        lang && hljs.getLanguage(lang)
          ? hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
          : Utils.esc(code);
    } catch (e) {
      Logger.debug("highlight failed", lang, e);
      html = Utils.esc(code);
    }

    if (this.cache.size >= Highlighter.MAX_ENTRIES) {
      this.cache.delete(this.cache.keys().next().value);
    }
    this.cache.set(key, html);
    return html;
  }

  clear() {
    this.cache.clear();
  }
}
