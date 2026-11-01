/* ═══════════════════════════════════════════════
   docx-grid-renderer.js — CSS-grid-like layout blocks
   (Preprocessors.grids()) rendered as a fixed-layout
   Word table with invisible borders. Each cell's raw
   Markdown is re-run through the full token pipeline,
   so nested tables, code, Mermaid, callouts, tabs and
   grids inside a cell export as real Word objects.

   FIX vs. the pre-split code: renderItemChildren() now
   scopes contentWidth down to the cell's own usable width
   (cellWidth minus its own margins) via DocxContext.
   withScope(). Previously this.contentWidth stayed at the
   page's full width even inside a narrow grid cell, so a
   table or nested grid placed inside a grid cell sized
   itself against the wrong (too wide) figure and could
   overflow the cell. No other behavior changes.
   ═══════════════════════════════════════════════ */

class DocxGridRenderer {
  constructor({ context, inline, renderTokens }) {
    this.ctx = context;
    this.inline = inline;
    this.renderTokens = renderTokens;
    this.d = context.d;
  }

  render(gridDef) {
    const {
      Table,
      TableRow,
      TableCell,
      Paragraph,
      BorderStyle,
      WidthType,
      VerticalAlign,
      TableLayoutType,
    } = this.d;

    if (!gridDef || !gridDef.items?.length) return null;

    const contentWidth = this.ctx.contentWidth;

    // ── 1) Column count + per-track widths (sum === contentWidth) ──
    const { count, widths } = this.parseColumns(gridDef.columns, contentWidth);

    // ── 2) Non-visible cell borders (layout table only) ──
    const noBorder = { style: BorderStyle.NIL, size: 0, color: "FFFFFF" };
    const cellBorders = {
      top: noBorder,
      bottom: noBorder,
      left: noBorder,
      right: noBorder,
      insideHorizontal: noBorder,
      insideVertical: noBorder,
    };

    const cellMargins = { top: 100, bottom: 100, left: 140, right: 140 };

    const pushEmptyCell = (row, index) => {
      row.push(
        new TableCell({
          width: { size: widths[index] ?? widths[0], type: WidthType.DXA },
          borders: cellBorders,
          verticalAlign: VerticalAlign.TOP,
          children: [new Paragraph({})],
        }),
      );
    };

    const rows = [];
    let row = [];
    let used = 0;

    // Fill any unused tracks in the current row with blank
    // cells, push the row, and reset for the next one.
    const flushRow = () => {
      while (used < count) {
        pushEmptyCell(row, used);
        used++;
      }
      if (row.length) rows.push(new TableRow({ children: row }));
      row = [];
      used = 0;
    };

    for (const item of gridDef.items) {
      const span = this.clampSpan(item.span, count);

      // Doesn't fit what's left of the current row → close it
      // (padding the remainder with blank cells) and start a
      // fresh one before placing this item.
      if (used > 0 && used + span > count) {
        flushRow();
      }

      const cellWidth = widths
        .slice(used, used + span)
        .reduce((sum, w) => sum + w, 0);

      // One bad item must not take down the whole grid — or
      // the rest of the document. Fall back to an empty cell
      // and keep going.
      let children;
      try {
        // The cell's usable width is narrower than cellWidth
        // by its own left/right margins — anything nested
        // inside (a table, another grid) must size itself
        // against THAT, not the raw track width.
        const usableWidth = cellWidth - cellMargins.left - cellMargins.right;
        children = this.renderItemChildren(item.content, usableWidth);
      } catch (e) {
        if (e?.code === "DOCX_MATH_CONVERSION") throw e;
        Logger.warn("docx: grid item failed to process", e);
        children = [];
      }

      const cellOpts = {
        width: { size: cellWidth || widths[used] || 1, type: WidthType.DXA },
        borders: cellBorders,
        margins: cellMargins,
        verticalAlign: VerticalAlign.TOP,
        children: children.length ? children : [new Paragraph({})],
      };
      if (span > 1) cellOpts.columnSpan = span;

      row.push(new TableCell(cellOpts));
      used += span;

      // Row is exactly full → flush now so the next item
      // starts a clean row.
      if (used >= count) flushRow();
    }

    // Trailing partial row (last item didn't fill the row).
    if (row.length) flushRow();

    return [
      new Table({
        width: { size: contentWidth, type: WidthType.DXA },
        columnWidths: widths,
        layout: TableLayoutType.FIXED,
        visuallyRightToLeft:
          this.ctx.tabDirection !== null
            ? this.ctx.tabDirection
            : !!this.ctx.dir.baseline,
        borders: cellBorders,
        rows,
      }),
      new Paragraph({ children: [], spacing: { before: 80, after: 120 } }),
    ];
  }

  /**
   * Re-run one grid cell's raw Markdown through the full
   * DOCX pipeline, scoped so its own grids/tabs and its
   * own usable width don't leak into (or inherit from) the
   * surrounding container.
   *
   * @param {string} rawMarkdown
   * @param {number} [cellWidth]  usable width for THIS cell;
   *        defaults to the current context width when the
   *        caller doesn't have a narrower figure on hand.
   */
  renderItemChildren(rawMarkdown, cellWidth = this.ctx.contentWidth) {
    try {
      const prepared = Preprocessors.prepareForDocx(rawMarkdown);

      return this.ctx.withScope(
        {
          gridMap: prepared.grids,
          tabMap: prepared.tabs,
          contentWidth: cellWidth,
        },
        () => {
          const tokens = marked.lexer(prepared.src);
          return this.renderTokens(tokens);
        },
      );
    } catch (e) {
      if (e?.code === "DOCX_MATH_CONVERSION") throw e;
      Logger.warn("docx: grid item failed to process", e);
      return [
        new this.d.Paragraph({
          children: [
            this.inline.run({
              text: "⚠ تعذّر عرض محتوى هذا العنصر",
              italics: true,
              color: "999999",
            }),
          ],
        }),
      ];
    }
  }

  /**
   * Parse a columns spec into a track count and per-track
   * widths that sum EXACTLY to totalWidth (Word is picky
   * about columnWidths summing to the table width under
   * TableLayoutType.FIXED — leftover twips from Math.floor
   * rounding are folded into the last track).
   *
   * Accepts:
   *   3                          → three equal columns
   *   "repeat(3, ...)"           → three equal columns
   *   "2fr 1fr"                  → 2/3 and 1/3 of total width
   *   "1fr 2fr 1fr"              → weighted distribution
   */
  parseColumns(spec, totalWidth) {
    // Integer count
    if (typeof spec === "number" || /^\d+$/.test(String(spec ?? "").trim())) {
      const n = Math.max(1, Math.min(parseInt(spec, 10) || 2, 12));
      return {
        count: n,
        widths: this.distributeWidths(totalWidth, Array(n).fill(1)),
      };
    }

    const raw = String(spec ?? "").trim();

    // repeat(N, ...) form
    const repMatch = raw.match(/repeat\(\s*(\d+)/);
    if (repMatch) {
      const n = Math.max(1, Math.min(parseInt(repMatch[1], 10), 12));
      return {
        count: n,
        widths: this.distributeWidths(totalWidth, Array(n).fill(1)),
      };
    }

    // fr-based track list
    const parts = raw.split(/\s+/).filter(Boolean);
    if (!parts.length) {
      return {
        count: 2,
        widths: this.distributeWidths(totalWidth, [1, 1]),
      };
    }

    const frValues = parts.map((p) => {
      const m = p.match(/^([\d.]+)fr$/);
      return m ? parseFloat(m[1]) : 1;
    });

    return {
      count: parts.length,
      widths: this.distributeWidths(totalWidth, frValues),
    };
  }

  /**
   * Distribute totalWidth across `weights` proportionally,
   * as whole twips, with the rounding remainder folded into
   * the last track so the sum is always exactly totalWidth.
   */
  distributeWidths(totalWidth, weights) {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0) || 1;
    const widths = weights.map((w) =>
      Math.floor((totalWidth * w) / totalWeight),
    );
    const used = widths.reduce((sum, w) => sum + w, 0);
    const remainder = totalWidth - used;
    if (widths.length) widths[widths.length - 1] += remainder;
    return widths;
  }

  /**
   * Clamp a span value between 1 and the column count.
   * Invalid / missing values become 1.
   */
  clampSpan(value, count) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(n, count);
  }
}
