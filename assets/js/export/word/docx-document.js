/* ═══════════════════════════════════════════════
   docx-document.js — The DOCX shell around the
   rendered content: page geometry, numbering
   definitions, paragraph styles, and the page footer.

   DocxBuilder does not know any of this; it only calls
   pack(children).
   ═══════════════════════════════════════════════ */

class DocxDocument {
  constructor(ctx) {
    this.ctx = ctx;
    this.d = ctx.d;
  }

  create(children) {
    const { Document } = this.d;

    return new Document({
      creator: "Markdown Editor",
      title: "Converted Document",
      numbering: this.numbering(),
      styles: this.styles(),
      sections: [
        {
          properties: {
            page: {
              size: {
                width: DOCX_THEME.page.width,
                height: DOCX_THEME.page.height,
              },
              margin: {
                top: DOCX_THEME.page.margin,
                right: DOCX_THEME.page.margin,
                bottom: DOCX_THEME.page.margin,
                left: DOCX_THEME.page.margin,
              },
            },
          },
          footers: { default: this.footer() },
          children,
        },
      ],
    });
  }

  async pack(children) {
    const { Packer } = this.d;
    return Packer.toBlob(this.create(children));
  }

  numbering() {
    const { LevelFormat, AlignmentType } = this.d;

    // lvlJc stays LEFT: Word writes it that way even for
    // Arabic lists. The marker side comes from w:bidi on
    // the list paragraph, not from here.
    const levels = (format, texts) =>
      [0, 1, 2, 3].map((level) => ({
        level,
        format,
        text: texts(level),
        alignment: AlignmentType.LEFT,
        style: {
          paragraph: {
            indent: { left: 720 * (level + 1), hanging: 360 },
          },
        },
      }));

    return {
      config: [
        {
          reference: "bullets",
          levels: levels(LevelFormat.BULLET, (l) => ["•", "◦", "▪", "–"][l]),
        },
        {
          reference: "numbers",
          levels: levels(LevelFormat.DECIMAL, (l) => `%${l + 1}.`),
        },
      ],
    };
  }

  styles() {
    const C = DOCX_THEME.colors;
    const { head, body } = DOCX_THEME.fonts;

    const heading = (id, name, size, color, outline, before, after) => ({
      id,
      name,
      basedOn: "Normal",
      next: "Normal",
      quickFormat: true,
      run: { size, bold: true, font: head, color },
      paragraph: { spacing: { before, after }, outlineLevel: outline },
    });

    return {
      // No paragraph default on purpose: an alignment here
      // would be inherited by every paragraph and would
      // reintroduce the wrong-edge bug through the style
      // chain instead of through w:jc.
      default: {
        document: {
          run: {
            font: body,
            size: 22,
            language: {
              value: DOCX_THEME.lang.latin,
              bidirectional: DOCX_THEME.lang.bidi,
            },
          },
        },
      },
      paragraphStyles: [
        heading("Heading1", "Heading 1", 36, C.h1, 0, 360, 120),
        heading("Heading2", "Heading 2", 32, C.h2, 1, 300, 100),
        heading("Heading3", "Heading 3", 28, C.h3, 2, 240, 80),
        heading("Heading4", "Heading 4", 24, C.h4, 3, 200, 60),
        heading("Heading5", "Heading 5", 22, C.h5, 4, 160, 40),
        heading("Heading6", "Heading 6", 22, C.h6, 5, 120, 40),
      ],
    };
  }

  footer() {
    const { Footer, Paragraph, TextRun, AlignmentType, PageNumber } = this.d;
    const style = {
      font: DOCX_THEME.fonts.body,
      size: 18,
      color: DOCX_THEME.colors.footer,
    };

    return new Footer({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ children: [PageNumber.CURRENT], ...style }),
            new TextRun({ text: " / ", ...style }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], ...style }),
          ],
        }),
      ],
    });
  }
}
