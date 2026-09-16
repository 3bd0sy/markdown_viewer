/* ═══════════════════════════════════════════════
   markdown.exporter.js — Raw source download.
   ═══════════════════════════════════════════════ */

class MarkdownExporter extends BaseExporter {
  static id = "md";
  static extension = "md";

  async run() {
    const blob = new Blob([this.markdown], {
      type: "text/markdown;charset=utf-8",
    });
    Utils.dlBlob(blob, this.filename());
  }
}
