/* ═══════════════════════════════════════════════
   docx-tabs-renderer.js — `=== "Title"` tab groups
   rendered as ONE bordered window (a single-cell Word
   table) containing a shared header, then each tab's own
   section header + content, separated by a thin rule.

   Each tab body is raw Markdown (Preprocessors.tabsForDocx()
   never renders it to HTML), so it goes through the same
   full pipeline as a grid cell — Mermaid, tables, code,
   callouts, nested grids and nested tabs all export as
   real Word objects.

   FIX vs. the pre-split code: buildContent() now scopes
   contentWidth down to the window's own usable width (the
   window is a table cell with 180-twip margins each side)
   via DocxContext.withScope(). Previously this.contentWidth
   stayed at the page's full width even inside the tabs
   window, so a table or grid placed inside a tab could
   overflow the window's frame. No other behavior changes.
   ═══════════════════════════════════════════════ */

class DocxTabsRenderer {
  constructor({ context, inline, renderTokens }) {
    this.ctx = context;
    this.inline = inline;
    this.renderTokens = renderTokens;
    this.d = context.d;
  }

  render(tabDef) {
    const {
      Table,
      TableRow,
      TableCell,
      Paragraph,
      BorderStyle,
      WidthType,
      TableLayoutType,
      ShadingType,
      VerticalAlign,
    } = this.d;

    const tabs = tabDef?.tabs || [];
    if (!tabs.length) return [];

    // Handle a single tab without creating a tabs window.
    if (tabs.length === 1) {
      return this._buildTabContent(tabs[0].body, tabs[0].title);
    }

    const frame = {
      style: BorderStyle.SINGLE,
      size: 6,
      color: DOCX_THEME.colors.codeBdr,
    };
    const noBorder = { style: BorderStyle.NIL, size: 0, color: "FFFFFF" };

    const contentWidth = this.ctx.contentWidth;
    const cellMargin = 180;
    const children = [];

    children.push(this.buildWindowHeader(tabs.length));

    tabs.forEach((tab, index) => {
      const title = String(tab.title || `Tab ${index + 1}`).trim();
      const body = String(tab.body || "");
      const tabText = `${title}\n${body}`;
      const isRtl = DocxTextUtils.hasRtl(tabText);

      children.push(this.buildSectionHeader(title, index, tabs.length, isRtl));

      const bodyElements = this.buildContent(
        body,
        tabText,
        contentWidth - cellMargin * 2,
      );

      if (bodyElements.length) {
        children.push(...bodyElements);
      } else {
        children.push(new Paragraph({}));
      }

      if (index < tabs.length - 1) {
        children.push(this.buildSeparator());
      }
    });

    const cell = new TableCell({
      width: { size: contentWidth, type: WidthType.DXA },
      margins: {
        top: 120,
        bottom: 120,
        left: cellMargin,
        right: cellMargin,
      },
      shading: { fill: DOCX_THEME.colors.codeBg, type: ShadingType.CLEAR },
      borders: {
        top: noBorder,
        bottom: noBorder,
        left: noBorder,
        right: noBorder,
        insideHorizontal: noBorder,
        insideVertical: noBorder,
      },
      verticalAlign: VerticalAlign.TOP,
      children,
    });

    return [
      new Table({
        width: { size: contentWidth, type: WidthType.DXA },
        columnWidths: [contentWidth],
        layout: TableLayoutType.FIXED,
        visuallyRightToLeft: false,
        borders: {
          top: frame,
          bottom: frame,
          left: frame,
          right: frame,
          insideHorizontal: noBorder,
          insideVertical: noBorder,
        },
        rows: [new TableRow({ cantSplit: true, children: [cell] })],
      }),
      new Paragraph({ children: [], spacing: { before: 0, after: 160 } }),
    ];
  }

  buildWindowHeader(count) {
    const { Paragraph, TextRun, ShadingType, AlignmentType } = this.d;
    const C = DOCX_THEME.colors;

    const title =
      count === 1
        ? this.ctx.t("tabsSingle", "Code example")
        : this.ctx.t("tabsChooseOne", "Choose one of");

    let countText =
      count === 1
        ? this.ctx.t("tabsCountOne", "1 option")
        : this.ctx.t("tabsCountMany", "%n options");
    countText = countText.replace(/%n/g, String(count));

    return new Paragraph({
      alignment: AlignmentType.LEFT,
      bidirectional: false,
      shading: { fill: C.codeHdr, type: ShadingType.CLEAR },
      spacing: { before: 0, after: 80, line: 320 },
      children: [
        new TextRun({ text: "●", color: C.winRed, size: 18, font: "Arial" }),
        new TextRun({ text: "  ", size: 14 }),
        new TextRun({ text: "●", color: C.winYellow, size: 18, font: "Arial" }),
        new TextRun({ text: "  ", size: 14 }),
        new TextRun({ text: "●", color: C.winGreen, size: 18, font: "Arial" }),
        new TextRun({
          text: `     ${title} (${countText})`,
          bold: true,
          size: 18,
          color: C.codeTextDark,
          font: DOCX_THEME.fonts.mono,
        }),
      ],
    });
  }

  buildSectionHeader(title, index, total, isRtl) {
    const { TextRun, ShadingType } = this.d;
    const C = DOCX_THEME.colors;

    const children = [
      new TextRun({
        text: "▸ ",
        bold: true,
        size: 18,
        color: C.codeMuted,
        font: DOCX_THEME.fonts.mono,
        rightToLeft: false,
      }),
      new TextRun({
        text: DocxTextUtils.decode(title),
        bold: true,
        size: 18,
        color: C.codeMuted,
        font: DOCX_THEME.fonts.mono,
        ...(isRtl ? { rightToLeft: true } : {}),
      }),
    ];

    if (total > 1) {
      children.push(
        new TextRun({
          text: `  (${index + 1}/${total})`,
          size: 16,
          color: C.codeMuted,
          font: DOCX_THEME.fonts.mono,
          rightToLeft: false,
        }),
      );
    }

    return this.inline.paragraphAuto(title, {
      blockType: "heading",
      inherited: isRtl,
      children,
      shading: { fill: C.tableAlt, type: ShadingType.CLEAR },
      spacing: { before: index === 0 ? 0 : 80, after: 60 },
    });
  }

  buildSeparator() {
    const { Paragraph, BorderStyle } = this.d;
    return new Paragraph({
      children: [],
      spacing: { before: 80, after: 80 },
      border: {
        top: {
          style: BorderStyle.SINGLE,
          size: 6,
          color: DOCX_THEME.colors.hr,
        },
      },
    });
  }

  /**
   * Re-run one tab's raw Markdown through the full DOCX
   * pipeline, scoped so its own grids/tabs, its direction,
   * its code-header suppression, and its usable width don't
   * leak into or out of the surrounding container.
   *
   * @param {string} rawMarkdown
   * @param {string} directionText  title+body used to decide
   *        this tab's fixed direction (see the class doc
   *        comment in docx-context.js about tabDirection
   *        being a single flag for the whole tab body).
   * @param {number} [usableWidth]  the window's usable width;
   *        defaults to the current context width when the
   *        caller doesn't have a narrower figure on hand.
   */
  buildContent(
    rawMarkdown,
    directionText = rawMarkdown,
    usableWidth = this.ctx.contentWidth,
  ) {
    try {
      const prepared = Preprocessors.prepareForDocx(rawMarkdown);
      const tokens = marked.lexer(prepared.src);
      const meaningful = tokens.filter((token) => token.type !== "space");

      // Code-only tabs do not need a second macOS-style header.
      const suppressCodeHeader =
        meaningful.length > 0 &&
        meaningful.every((token) => token.type === "code");

      return this.ctx.withScope(
        {
          gridMap: prepared.grids,
          tabMap: prepared.tabs,
          tabDirection: DocxTextUtils.hasRtl(String(directionText)),
          suppressCodeHeader,
          contentWidth: usableWidth,
        },
        () => this.renderTokens(tokens),
      );
    } catch (e) {
      Logger.warn("docx: tab content failed to process", e);
      return [
        new this.d.Paragraph({
          children: [
            this.inline.run({
              text: "⚠ تعذّر عرض محتوى هذا التبويب",
              italics: true,
              color: "999999",
            }),
          ],
        }),
      ];
    }
  }
}
