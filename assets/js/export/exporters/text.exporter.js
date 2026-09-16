/* ═══════════════════════════════════════════════
   text.exporter.js — Markdown syntax stripped out.
   ═══════════════════════════════════════════════ */

class TextExporter extends BaseExporter {
  static id = "txt";
  static extension = "txt";

  /** Applied in order; each entry is [pattern, replacement]. */
  static RULES = [
    [/^```[\s\S]*?^```$/gm, ""],        // fenced blocks
    [/^#{1,6}\s+/gm, ""],               // headings
    [/\*\*(.+?)\*\*/g, "$1"],           // bold
    [/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "$1"], // italic
    [/`([^`]+)`/g, "$1"],               // inline code
    [/!\[.*?\]\(.*?\)/g, ""],           // images
    [/\[(.+?)\]\(.*?\)/g, "$1"],        // links
    [/^\s*[-*+]\s+/gm, "• "],           // bullets
    [/^\s*\d+\.\s+/gm, ""],             // ordered lists
    [/^>\s?/gm, ""],                    // blockquotes
    [/\n{3,}/g, "\n\n"],                // collapse blank runs
  ];

  async run() {
    const plain = TextExporter.RULES.reduce(
      (text, [pattern, replacement]) => text.replace(pattern, replacement),
      this.markdown,
    ).trim();

    Utils.dlBlob(
      new Blob([plain], { type: "text/plain;charset=utf-8" }),
      this.filename(),
    );
  }
}
