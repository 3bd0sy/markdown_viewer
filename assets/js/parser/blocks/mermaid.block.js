/* ═══════════════════════════════════════════════
   mermaid.block.js — ```mermaid

   The source is kept in a hidden div that survives
   every render, and the drawn SVG lives in a sibling
   body. The wrapper's data-key is derived from the
   source, so an unchanged diagram is transplanted
   between renders instead of redrawn.
   ═══════════════════════════════════════════════ */

class MermaidBlock extends BaseBlock {
  static langs = ["mermaid"];

  static render(tok, ctx) {
    const key = ctx.key("mm", tok.text);
    const id = `mm-${key}`;

    const actions = `
      <button class="mm-save" data-action="diagram-fullscreen" data-id="${id}"
              data-i18n-tip="fullscreen" title="Fullscreen">⛶</button>
      <button class="mm-save" data-action="diagram-save" data-id="${id}"
              data-format="png" data-i18n="savePNG">${Utils.esc(ctx.t("savePNG"))}</button>
      <button class="mm-save" data-action="diagram-save" data-id="${id}"
              data-format="svg" data-i18n="saveSVG">${Utils.esc(ctx.t("saveSVG"))}</button>`;

    const body = `
      <div id="${id}" class="mm-src" hidden>${Utils.esc(tok.text)}</div>
      <div class="mm-body" id="${id}-body"></div>`;

    return BaseBlock.shell({
      key,
      dot: "",
      label: ctx.t("mermaidDiagram"),
      labelKey: "mermaidDiagram",
      actions,
      body,
    });
  }
}
