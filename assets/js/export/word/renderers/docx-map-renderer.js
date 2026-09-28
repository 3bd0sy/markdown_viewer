/* ═══════════════════════════════════════════════
   docx-map-renderer.js — ```map fences: an embedded
   pre-fetched map image (via MapService/imageMap.map,
   in document order), or a plain caption fallback when
   no image was captured.
   ═══════════════════════════════════════════════ */

class DocxMapRenderer {
  constructor(context) {
    this.ctx = context;
    this.d = context.d;
  }

  render(tok) {
    const { Paragraph, TextRun, ImageRun, AlignmentType } = this.d;

    const img = this.ctx.nextMap();

    /* ── 1) Image available → embed it ──────── */
    if (img?.dataUrl) {
      try {
        return [
          new Paragraph({
            children: [
              new ImageRun({
                data: Utils.dataUrlToUint8Array(img.dataUrl),
                transformation: {
                  width: img.width || 600,
                  height: img.height || 400,
                },
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 120 },
          }),
        ];
      } catch (e) {
        Logger.warn("docx: map image embed failed", e);
      }
    }

    /* ── 2) No image → text fallback ─────────── */
    const text = `📍 Map: ${String(tok.text || "").trim()}`;
    return [
      new Paragraph({
        children: [new TextRun({ text, size: 20, color: "666666" })],
        spacing: { before: 100, after: 100 },
      }),
    ];
  }
}
