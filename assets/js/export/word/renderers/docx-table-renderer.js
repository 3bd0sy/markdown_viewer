/* ═══════════════════════════════════════════════
   docx-table-renderer.js — Markdown tables → native
   Word tables (header row, zebra striping, RTL column
   order via w:bidiVisual).

   Reads this.ctx.contentWidth fresh on every render(),
   not a cached copy — so a table nested inside a tab or
   grid cell (which temporarily narrows contentWidth via
   DocxContext.withScope()) automatically sizes itself to
   the cell's real usable width instead of the full page.
   ═══════════════════════════════════════════════ */

class DocxTableRenderer {
  constructor({ context, inline }) {
    this.ctx = context;
    this.inline = inline;
    this.d = context.d;
  }

  render(tok) {
    const {
      Table,
      TableRow,
      TableCell,
      Paragraph,
      BorderStyle,
      WidthType,
      ShadingType,
      VerticalAlign,
    } = this.d;

    const C = DOCX_THEME.colors;
    const columnCount = tok.header?.length || 0;
    if (!columnCount) return [];

    const contentWidth = this.ctx.contentWidth;
    const columnWidth = Math.floor(contentWidth / columnCount);
    const edge = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
    const borders = { top: edge, bottom: edge, left: edge, right: edge };

    // Header and body decide together, once
    const tableText = [
      ...(tok.header ?? []).map(DocxTextUtils.tokenText),
      ...(tok.rows ?? []).flatMap((row) => row.map(DocxTextUtils.tokenText)),
    ].join(" ");
    const isRtl = this.ctx.resolveBlock(tableText, "table");

    const makeCell = (
      tokens = [],
      { isHeader = false, isAlt = false } = {},
    ) => {
      const inline = this.inline.parseInline(
        tokens.length ? tokens : [{ type: "text", text: "" }],
        {
          bold: isHeader,
          color: isHeader ? "FFFFFF" : "1A1A1A",
          font: DOCX_THEME.fonts.body,
          ...(isRtl ? { rightToLeft: true } : {}),
        },
      );

      const shading = isHeader
        ? { shading: { fill: C.tableHdr, type: ShadingType.CLEAR } }
        : isAlt
          ? { shading: { fill: C.tableAlt, type: ShadingType.CLEAR } }
          : {};

      return new TableCell({
        borders,
        width: { size: columnWidth, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        verticalAlign: VerticalAlign.CENTER,
        ...shading,
        children: [new Paragraph({ children: inline, bidirectional: isRtl })],
      });
    };

    const rows = [
      new TableRow({
        tableHeader: true,
        children: tok.header.map((cell) =>
          makeCell(cell.tokens ?? [], { isHeader: true }),
        ),
      }),
      ...(tok.rows ?? []).map(
        (row, index) =>
          new TableRow({
            children: row.map((cell) =>
              makeCell(cell.tokens ?? [], { isAlt: index % 2 === 1 }),
            ),
          }),
      ),
    ];

    return [
      new Table({
        width: { size: contentWidth, type: WidthType.DXA },
        columnWidths: Array(columnCount).fill(columnWidth),
        rows,
        // w:bidiVisual — column order, a separate concern
        // from the paragraph direction inside each cell.
        visuallyRightToLeft: isRtl,
      }),
      new Paragraph({ children: [], spacing: { before: 120, after: 80 } }),
    ];
  }
}
