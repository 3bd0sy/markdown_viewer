/* ═══════════════════════════════════════════════
   preprocessors.js — Source transforms applied
   before marked sees the text.
   ═══════════════════════════════════════════════ */

class Preprocessors {
  /** Fenced code blocks, so transforms can skip their contents. */
  static FENCE_RE = /^([ \t]{0,3})(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^[ \t]{0,3}\2[^\n]*$|$)/gm;

  /* ── Footnotes ──────────────────────────────── */

  /**
   * Turns [^key] into a superscript link and appends
   * the definition list at the end of the document.
   */
  static footnotes(src) {
    const defs = new Map();

    src = src.replace(/^\[\^([^\]]+)\]:[ \t]*(.+)$/gm, (_, key, value) => {
      defs.set(key, value);
      return "";
    });

    let counter = 0;
    src = src.replace(/\[\^([^\]]+)\]/g, (_, key) => {
      counter++;
      const safe = Utils.esc(key);
      return (
        `<sup><a href="#fn-${safe}" id="fnref-${safe}" ` +
        `style="color:var(--info)">[${counter}]</a></sup>`
      );
    });

    if (!defs.size) return src;

    let out = `${src}\n\n---\n\n`;
    for (const [key, value] of defs) {
      const safe = Utils.esc(key);
      out +=
        `<p id="fn-${safe}" class="footnote-item">` +
        `<a href="#fnref-${safe}" style="color:var(--info)">↩</a> ` +
        `<strong>[${safe}]</strong> ${Utils.esc(value)}</p>\n`;
    }
    return out;
  }

  /* ── Math protection ────────────────────────── */

  /**
   * Replace LaTeX spans with opaque keys so marked
   * cannot mangle them. Fenced code is skipped, so a
   * `$` inside a shell snippet stays a `$`.
   */
  static extractMath(src) {
    const map = Object.create(null);
    let index = 0;

    const swap = (segment) =>
      segment
        .replace(/\$\$([\s\S]+?)\$\$/g, (match) => {
          const key = `«MATH_${index++}»`;
          map[key] = match;
          return key;
        })
        .replace(/\$(?!\s)([^\n$]+?)(?<!\s)\$/g, (match) => {
          const key = `«MATH_${index++}»`;
          map[key] = match;
          return key;
        });

    let out = "";
    let cursor = 0;
    const fence = new RegExp(Preprocessors.FENCE_RE.source, "gm");
    let match;

    while ((match = fence.exec(src)) !== null) {
      out += swap(src.slice(cursor, match.index));
      out += match[0]; // fenced block passes through untouched
      cursor = match.index + match[0].length;
    }
    out += swap(src.slice(cursor));

    return { src: out, map };
  }

  /** Single pass — the old version scanned the whole string per equation. */
  static restoreMath(html, map) {
    return html.replace(/«MATH_\d+»/g, (key) => map[key] ?? key);
  }

  /** Checkbox inputs in the preview are display-only. */
  static freezeCheckboxes(html) {
    return html.replace(
      /<input type="checkbox"([^>]*)>/gi,
      (_, rest) => `<input type="checkbox"${rest} disabled>`,
    );
  }
}
