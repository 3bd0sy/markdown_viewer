/* ═══════════════════════════════════════════════
   toc-builder.js — Collapsible table of contents.
   Built from the rendered headings and prepended to
   the preview.
   ═══════════════════════════════════════════════ */

class TocBuilder {
  static MIN_HEADINGS = 2;
  static ICON_RE = /[📋▾▸↩⬡∑⊞≡]/g;

  constructor(i18n) {
    this.i18n = i18n;
    this.collapsed = false;
  }

  build(previewEl) {
    const headings = DOM.qsa("h1,h2,h3", previewEl);
    if (headings.length < TocBuilder.MIN_HEADINGS) return;

    const items = headings
      .map((heading, index) => {
        if (!heading.id) {
          heading.id = `toc-${index}-${Utils.slugify(heading.textContent).slice(0, 40)}`;
        }
        const level = Number(heading.tagName[1]);
        const text = heading.textContent.replace(TocBuilder.ICON_RE, "").trim();
        return (
          `<li class="toc-item toc-l${level}">` +
          `<a href="#${Utils.attr(heading.id)}">${Utils.esc(text)}</a></li>`
        );
      })
      .join("");

    const block = document.createElement("div");
    block.className = "toc-block";
    block.innerHTML = `
      <div class="toc-hdr" data-action="toc-toggle" role="button" tabindex="0">
        <span aria-hidden="true">📋</span>
        <span class="toc-title" data-i18n="tocTitle">${Utils.esc(this.i18n.t("tocTitle"))}</span>
        <span class="toc-toggle" id="toc-toggle">${Utils.esc(
          this.i18n.t(this.collapsed ? "tocShow" : "tocHide"),
        )}</span>
      </div>
      <ul class="toc-list" id="toc-list"${this.collapsed ? " hidden" : ""}>${items}</ul>`;

    previewEl.insertBefore(block, previewEl.firstChild);
  }

  toggle() {
    const list = DOM.el("toc-list");
    const toggle = DOM.el("toc-toggle");
    if (!list) return;
    this.collapsed = !list.hidden;
    list.hidden = this.collapsed;
    if (toggle) {
      toggle.textContent = this.i18n.t(this.collapsed ? "tocShow" : "tocHide");
    }
  }
}
