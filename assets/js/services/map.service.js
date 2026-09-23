/* ═══════════════════════════════════════════════
   map.service.js — Renders a static map image for
   Word/PDF export.

   Strategy:
     1. Try Wikimedia Maps (free, CORS-enabled, no key).
     2. Fall back to a plain placeholder on failure.

   The preview uses an interactive iframe; this service
   is only called during export.
   ═══════════════════════════════════════════════ */

class MapService {
  /** Cache by "lat,lng,zoom,WxH" to avoid re-fetching. */
  static _cache = new Map();

  /**
   * @returns {Promise<{dataUrl:string,width:number,height:number}|null>}
   */
  static async renderToImage({
    lat,
    lng,
    zoom = 13,
    width = 600,
    height = 400,
  } = {}) {
    const cacheKey = `${lat},${lng},${zoom},${width}x${height}`;
    if (MapService._cache.has(cacheKey)) {
      return MapService._cache.get(cacheKey);
    }

    /* Clamp zoom to Wikimedia's supported range. */
    const z = Math.max(1, Math.min(18, Math.round(zoom)));

    /* Wikimedia's URL uses a `{z},{lat},{lng},{w}x{h}` pattern. */
    const url =
      `https://maps.wikimedia.org/img/osm-intl,` +
      `${z},${lat},${lng},${width}x${height}.png`;

    try {
      const dataUrl = await MapService._fetchAsDataUrl(url);
      const result = { dataUrl, width, height };
      MapService._cache.set(cacheKey, result);
      return result;
    } catch (e) {
      Logger.warn("map: image fetch failed", e);
      return null;
    }
  }

  /**
   * Fetch a URL and return it as a base64 data URL.
   * Uses CORS; Wikimedia sends the required headers.
   */
  static async _fetchAsDataUrl(url) {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("FileReader failed"));
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Scan the markdown for ```map blocks and pre-render each
   * to an image. Returns an array in document order, so the
   * DOCX builder can index into it (like imageMap.mermaid).
   */
  static async collectFromMarkdown(markdown) {
    const re = /^```map[ \t]*\n([\s\S]*?)^```[ \t]*$/gm;
    const results = [];
    let m;

    while ((m = re.exec(markdown)) !== null) {
      const parts = m[1].split(",").map((p) => p.trim());
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      const zoom = parts[2] ? parseFloat(parts[2]) : 13;
      const size = (parts[4] || "600x400").toLowerCase();

      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        results.push(null);
        continue;
      }

      const [w, h] = size.split("x").map((n) => parseInt(n, 10) || 600);
      results.push(
        await MapService.renderToImage({
          lat,
          lng,
          zoom,
          width: Math.max(200, Math.min(w, 1200)),
          height: Math.max(150, Math.min(h, 800)),
        }),
      );
    }

    return results;
  }
}
