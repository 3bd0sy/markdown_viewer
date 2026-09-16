/* ═══════════════════════════════════════════════
   base.exporter.js — Contract for every exporter.
   ═══════════════════════════════════════════════ */

class BaseExporter {
  /** Menu id, matched against data-format in the markup. */
  static id = "";
  /** Default file extension. */
  static extension = "";

  constructor(context) {
    this.ctx = context; // { store, i18n, mermaid, getMarkdown }
  }

  get i18n() {
    return this.ctx.i18n;
  }

  get markdown() {
    return this.ctx.getMarkdown();
  }

  /** Derive a filename from the first heading. */
  filename() {
    const match = this.markdown.match(/^#{1,3}\s+(.+)$/m);
    const raw = match?.[1] ?? "document";
    const clean = raw
      .trim()
      .replace(/\*\*?|__?|~~|`/g, "")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .substring(0, 80)
      .trim();
    return `${clean || "document"}.${this.constructor.extension}`;
  }

  async run() {
    throw new Error("BaseExporter.run must be overridden");
  }
}
