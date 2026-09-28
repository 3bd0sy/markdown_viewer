/* ═══════════════════════════════════════════════
   docx-builder.js — Markdown → DOCX orchestrator.

   This file only wires the pieces together: a
   DocxContext holds every mutable field the pipeline
   needs, DocxDocument wraps the rendered content in a
   page, and DocxTokenRenderer dispatches each marked.js
   token to the renderer responsible for it (see
   renderers/ for headings/paragraphs, code, tables,
   grids, callouts, tabs and map images).

   Direction is NOT decided here. Every block asks
   DocxContext.resolveBlock(), which holds one policy for
   the whole document — the only way headings, lists and
   tables can share an edge.

   Load order (all globals, no bundler):
     docx-theme.js
     docx-text-utils.js
     docx-context.js
     docx-document.js
     renderers/docx-inline-renderer.js
     renderers/docx-code-renderer.js
     renderers/docx-table-renderer.js
     renderers/docx-map-renderer.js
     renderers/docx-grid-renderer.js
     renderers/docx-callout-renderer.js
     renderers/docx-tabs-renderer.js
     renderers/docx-basic-renderer.js
     renderers/docx-token-renderer.js
     docx-builder.js               ← this file, last

   The exact order among the renderer files themselves
   isn't load-bearing (they only reference each other
   inside method bodies, evaluated at call time, not at
   file-parse time) — but docx-theme.js and
   docx-text-utils.js should come first since several
   renderers use them, and docx-builder.js must come last
   since its constructor instantiates everything above.

   Public API is unchanged from before the split:
       new DocxBuilder(docx, imageMap, direction, i18n)
       await builder.build(markdown)
   so WordExporter, Preprocessors, markdown-parser.js and
   the preview CSS needed NO changes for this refactor.
   ═══════════════════════════════════════════════ */

class DocxBuilder {
  /**
   * @param {object} docx      window.docx namespace
   * @param {object} imageMap  { [diagramIndex]: {dataUrl,width,height}, map: [...] }
   *        one shared index across every diagram type
   *        (Mermaid, Plotly, …), in raw source order —
   *        see WordExporter.captureDiagrams()
   * @param {DirectionResolver|boolean} direction
   *        A resolver (preferred), or a boolean for the
   *        legacy "whole document is RTL" call style.
   * @param {object|null} i18n
   */
  constructor(docx, imageMap = {}, direction = true, i18n = null) {
    this.context = new DocxContext({ docx, imageMap, direction, i18n });
    this.document = new DocxDocument(this.context);

    const inline = new DocxInlineRenderer(this.context);

    this.tokens = new DocxTokenRenderer({ context: this.context, inline });
  }

  async build(markdown) {
    this.context.resetForBuild();

    // Safety net: the exporter should resolve the document
    // first, but a forgotten call must not fall back to
    // per-block guessing.
    if (!this.context.dir.resolved) {
      this.context.dir.resolveDocument(markdown);
    }

    // DOCX uses a dedicated preprocessing path so tab bodies
    // remain raw Markdown until they reach the DOCX pipeline.
    const prepared = Preprocessors.prepareForDocx(markdown);

    this.context.setRootMaps({ grids: prepared.grids, tabs: prepared.tabs });

    const tokens = marked.lexer(prepared.src);
    const children = this.tokens.renderTokens(tokens);

    return this.document.pack(children);
  }
}
