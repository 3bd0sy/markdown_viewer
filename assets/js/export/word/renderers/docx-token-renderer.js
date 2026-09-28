/* ═══════════════════════════════════════════════
   docx-token-renderer.js — Single dispatch point from a
   marked.js token to the renderer responsible for it.

   Grid/callout/tabs markers embedded in "html" tokens are
   recognized HERE, not inside DocxBasicRenderer, so that
   BasicRenderer never needs a reference to the container
   renderers — only TokenRenderer knows about all of them,
   and every container renderer recurses back through
   TokenRenderer.renderTokens() rather than calling another
   renderer directly. That one-way dependency

       DocxBuilder → DocxTokenRenderer → {renderers} → DocxContext

   is what keeps

       Tabs → Grid → Tabs → Grid

   from turning into a circular import between renderer
   files.
   ═══════════════════════════════════════════════ */

class DocxTokenRenderer {
  constructor({ context, inline }) {
    this.ctx = context;
    this.inline = inline;

    this.basic = new DocxBasicRenderer({ context, inline });
    this.code = new DocxCodeRenderer(context);
    this.table = new DocxTableRenderer({ context, inline });
    this.map = new DocxMapRenderer(context);
    this.callout = new DocxCalloutRenderer({ context, inline });

    this.grid = new DocxGridRenderer({
      context,
      inline,
      renderTokens: (tokens) => this.renderTokens(tokens),
    });

    this.tabs = new DocxTabsRenderer({
      context,
      inline,
      renderTokens: (tokens) => this.renderTokens(tokens),
    });
  }

  renderTokens(tokens) {
    const elements = [];

    for (const tok of tokens || []) {
      let result;
      try {
        result = this.renderToken(tok);
      } catch (e) {
        // One bad token must not abort the document
        Logger.warn(`docx: token "${tok.type}" failed`, e);
        continue;
      }
      if (Array.isArray(result)) elements.push(...result);
      else if (result != null) elements.push(result);
    }

    return elements;
  }

  renderToken(tok) {
    switch (tok.type) {
      case "heading":
        return this.basic.heading(tok);
      case "paragraph":
        return this.basic.paragraph(tok);
      case "blockquote":
        return this.basic.blockquote(tok);
      case "list":
        return this.basic.list(tok, 0);
      case "hr":
        return this.basic.hr();
      case "space":
        return this.basic.spacer();
      case "table":
        return this.table.render(tok);
      case "code": {
        // "map" fences are diverted to DocxMapRenderer here,
        // before DocxCodeRenderer ever sees the token — see
        // the note at the top of docx-code-renderer.js.
        const lang = (tok.lang || "").toLowerCase().trim();
        return lang === "map" ? this.map.render(tok) : this.code.render(tok);
      }
      case "html":
        return this.renderHtml(tok);
      default:
        return null;
    }
  }

  renderHtml(tok) {
    const raw = String(tok.text || "");
    const trimmed = raw.trim();

    // ── Grid marker ──────────────────────────
    const gridMatch = /^<!--MD-GRID:(\d+)-->$/.exec(trimmed);
    if (gridMatch) {
      const gridDef = this.ctx.gridMap?.[+gridMatch[1]];
      return this.grid.render(gridDef);
    }

    // ── Tabs marker ──────────────────────────
    const tabsMatch = /^<!--MD-TABS:(\d+)-->$/.exec(trimmed);
    if (tabsMatch) {
      const tabDef = this.ctx.tabMap?.[+tabsMatch[1]];
      return this.tabs.render(tabDef);
    }

    // ── Callout ──────────────────────────────
    const calloutMatch = raw.match(/data-callout="(\w+)"/);
    if (calloutMatch) return this.callout.render(calloutMatch[1], raw);

    // ── Plain HTML fallback ──────────────────
    return this.basic.html(tok);
  }
}
