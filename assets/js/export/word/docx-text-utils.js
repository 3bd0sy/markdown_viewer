/* ═══════════════════════════════════════════════
   docx-text-utils.js — Stateless text helpers shared
   by every renderer: flattening a marked.js token tree
   to plain text, RTL detection, and HTML-entity decoding.
   ═══════════════════════════════════════════════ */

class DocxTextUtils {
  /** Flatten a token tree down to plain text. */
  static tokenText(tok) {
    if (!tok) return "";
    if (typeof tok === "string") return tok;
    if (tok.tokens?.length) {
      return tok.tokens.map(DocxTextUtils.tokenText).join("");
    }
    return tok.text ?? tok.raw ?? "";
  }

  static hasRtl(text) {
    return DOCX_THEME.hasRtl.test(String(text || ""));
  }

  static decode(text) {
    return Utils.decodeHtmlEntities(String(text ?? ""));
  }
}
