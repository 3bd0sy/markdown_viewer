/* ═══════════════════════════════════════════════
   plotly.block.js — ```plotly (JSON payload)
   ═══════════════════════════════════════════════ */

class PlotlyBlock extends BaseBlock {
  static langs = ["plotly"];

  static render(tok, ctx) {
    const key = ctx.key("pl", tok.text);
    const id = `plotly-${key}`;

    const body = `
      <div id="${id}" class="plotly-host"
           data-plotly-src="${Utils.attr(tok.text)}"></div>`;

    return BaseBlock.shell({
      key,
      dot: "#7f4af5",
      label: ctx.t("plotlyChart"),
      labelKey: "plotlyChart",
      body,
    });
  }
}
