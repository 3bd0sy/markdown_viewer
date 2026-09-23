/* ═══════════════════════════════════════════════
   map.block.js — ```map  →  "lat, lng, zoom[, layer[, WxH]]"

   Extended syntax:
     41.015, 28.979                      → default zoom 13, layer mapnik
     41.015, 28.979, 15                  → custom zoom
     41.015, 28.979, 13, hot             → humanitarian layer
     41.015, 28.979, 13, mapnik, 800x500 → custom size for Word export

   Supported layers (no API key required):
     • mapnik  → standard OpenStreetMap
     • hot     → humanitarian (OpenStreetMap France)
   ═══════════════════════════════════════════════ */

class MapBlock extends BaseBlock {
  static langs = ["map"];

  /* Layers available in the OSM embed viewer. */
  static LAYERS = {
    mapnik: { label: "Standard", i18n: "mapLayerStandard" },
    hot: { label: "Humanitarian", i18n: "mapLayerHumanitarian" },
  };

  static render(tok, ctx) {
    /* ── 1) Parse extended syntax ────────────── */
    const parts = String(tok.text || "")
      .split(",")
      .map((p) => p.trim());

    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    const zoom = parts[2] ? parseFloat(parts[2]) : 13;

    const layer = parts[3] && MapBlock.LAYERS[parts[3]] ? parts[3] : "mapnik";

    /* Size (used only for Word export; preview uses 100%). */
    const size = parts[4] || "600x400";

    /* ── 2) Validate ─────────────────────────── */
    const invalid =
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      Number.isNaN(zoom) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180 ||
      zoom < 1 ||
      zoom > 19;

    if (invalid) {
      return `<p class="mm-err">${Utils.esc(
        ctx.t("invalidMapCoords"),
      )}: ${Utils.esc(tok.text)}</p>`;
    }

    /* ── 3) Build the OSM iframe URL ─────────── */
    const key = ctx.key("map", tok.text);
    const span = 0.05 / (zoom / 10);
    const bbox = `${lng - span},${lat - span},${lng + span},${lat + span}`;

    const iframeSrc =
      `https://www.openstreetmap.org/export/embed.html` +
      `?bbox=${bbox}&amp;layer=${layer}`;

    /* ── 4) Layer toggle buttons ─────────────── */
    const layerButtons = Object.entries(MapBlock.LAYERS)
      .map(([id, spec]) => {
        const label = ctx.t(spec.i18n) || spec.label;
        const active = id === layer ? " is-active" : "";
        return (
          `<button type="button" class="map-layer-btn${active}"` +
          ` data-map-layer="${id}"` +
          ` title="${Utils.attr(label)}">` +
          `${Utils.esc(label)}</button>`
        );
      })
      .join("");

    /* ── 5) Body ─────────────────────────────── */
    const body = `
      <div class="map-host"
           data-lat="${lat}"
           data-lng="${lng}"
           data-zoom="${zoom}"
           data-layer="${layer}"
           data-size="${Utils.attr(size)}">
        <iframe class="embed-frame"
          src="${iframeSrc}"
          height="350"
          loading="lazy"
          referrerpolicy="no-referrer"
          allowfullscreen
          title="OpenStreetMap"></iframe>

        <div class="map-toolbar">
          <div class="map-layers">${layerButtons}</div>
          <button type="button"
                  class="map-copy-btn"
                  data-map-copy="${lat}, ${lng}"
                  title="${Utils.attr(ctx.t("copyCoords"))}"
                  aria-label="${Utils.attr(ctx.t("copyCoords"))}">📋</button>
        </div>
      </div>`;

    return BaseBlock.shell({
      key,
      dot: "#22c55e",
      label: ctx.t("openStreetMap"),
      labelKey: "openStreetMap",
      sub: `${lat}, ${lng}`,
      body,
    });
  }
}
