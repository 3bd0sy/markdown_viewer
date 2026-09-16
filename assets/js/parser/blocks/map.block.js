/* ═══════════════════════════════════════════════
   map.block.js — ```map  →  "lat, lng, zoom"
   ═══════════════════════════════════════════════ */

class MapBlock extends BaseBlock {
  static langs = ["map"];

  static render(tok, ctx) {
    const [lat, lng, zoom = 13] = tok.text
      .split(",")
      .map((part) => parseFloat(part.trim()));

    const invalid =
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180;

    if (invalid) {
      return `<p class="mm-err">${Utils.esc(ctx.t("invalidMapCoords"))}: ${Utils.esc(tok.text)}</p>`;
    }

    const key = ctx.key("map", tok.text);
    const span = 0.05 / (zoom / 10);
    const bbox = `${lng - span},${lat - span},${lng + span},${lat + span}`;

    // loading="lazy" keeps off-screen maps off the network
    const body = `
      <iframe class="embed-frame"
        src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&amp;layer=mapnik"
        height="350" loading="lazy" referrerpolicy="no-referrer"
        allowfullscreen title="OpenStreetMap"></iframe>`;

    return BaseBlock.shell({
      key,
      dot: "#22c55e",
      label: ctx.t("openStreetMap"),
      labelKey: "openStreetMap",
      // Coordinates sit outside the data-i18n node so a
      // language switch cannot overwrite them.
      sub: `${lat}, ${lng}`,
      body,
    });
  }
}
