/* ═══════════════════════════════════════════════
   model3d.block.js — ```3d / ```glb / ```gltf

   <model-viewer> is a custom element; the library is
   fetched lazily by PreviewRenderer the first time a
   block of this type reaches the page.
   ═══════════════════════════════════════════════ */

class Model3DBlock extends BaseBlock {
  static langs = ["3d", "glb", "gltf"];

  static render(tok, ctx) {
    const raw = tok.text.trim();
    const src = Utils.sanitizeMediaUrl(raw);
    if (!src) {
      return `<p class="mm-err">${Utils.esc(ctx.t("invalidVideoURL"))}: ${Utils.esc(raw)}</p>`;
    }

    const key = ctx.key("m3d", raw);
    const body = `
      <model-viewer class="model-host" src="${Utils.attr(src)}"
        alt="3D model" auto-rotate camera-controls loading="lazy"></model-viewer>`;

    return BaseBlock.shell({
      key,
      dot: "#f59e0b",
      label: ctx.t("model3D"),
      labelKey: "model3D",
      body,
      style: "overflow:visible",
    });
  }
}
