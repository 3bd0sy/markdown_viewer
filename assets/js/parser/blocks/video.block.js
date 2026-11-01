/* ═══════════════════════════════════════════════
   video.block.js — ```video  →  YouTube or direct URL
   ═══════════════════════════════════════════════ */

class VideoBlock extends BaseBlock {
  static langs = ["video"];
  static YT_RE = /(?:youtube(?:-nocookie)?\.com|youtu\.be|m\.youtube\.com|music\.youtube\.com)/i;
  static YT_ID_RE = /(?:[?&]v=|youtu\.be\/|\/(?:embed|shorts|live)\/)([a-zA-Z0-9_-]{11})/i;

  static extractVideoId(url) {
    const source = String(url ?? "").trim();
    if (!source) return null;

    try {
      const parsed = new URL(source, location?.href || "https://example.com");
      const host = parsed.hostname.toLowerCase();
      const isYouTubeHost = /(?:^|\.)youtube(?:-nocookie)?\.com$/.test(host)
        || host === "youtu.be"
        || host === "m.youtube.com"
        || host === "music.youtube.com";

      if (!isYouTubeHost) return null;

      const queryValue = parsed.searchParams.get("v");
      if (queryValue && /^[a-zA-Z0-9_-]{11}$/.test(queryValue)) return queryValue;

      const pathValue = parsed.pathname.match(/\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/i)?.[1];
      if (pathValue) return pathValue;

      if (host === "youtu.be") {
        const shortId = parsed.pathname.replace(/^\/+/, "").split("/")[0];
        if (/^[a-zA-Z0-9_-]{11}$/.test(shortId)) return shortId;
      }

      return null;
    } catch {
      return source.match(VideoBlock.YT_ID_RE)?.[1] ?? null;
    }
  }

  static extractStartSeconds(url) {
    const source = String(url ?? "").trim();
    if (!source) return "";

    try {
      const parsed = new URL(source, location?.href || "https://example.com");
      const candidates = [parsed.searchParams.get("t"), parsed.searchParams.get("start")];
      for (const candidate of candidates) {
        if (!candidate) continue;
        const match = String(candidate).match(/(\d+)/);
        if (match) return match[1];
      }
      return "";
    } catch {
      const match = source.match(/[?&](?:t|start)=(\d+)/i);
      return match?.[1] ?? "";
    }
  }

  static render(tok, ctx) {
    const raw = tok.text.trim();
    const url = Utils.sanitizeMediaUrl(raw);
    if (!url) {
      return `<p class="mm-err">${Utils.esc(ctx.t("invalidVideoURL"))}: ${Utils.esc(raw)}</p>`;
    }

    const key = ctx.key("vid", raw);
    const videoId = VideoBlock.extractVideoId(url);
    const isYouTube = Boolean(videoId);
    let body;

    if (isYouTube) {
      const start = VideoBlock.extractStartSeconds(url);
      const embedUrl = new URL(`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`);
      if (start) embedUrl.searchParams.set("start", start);
      body = `
        <iframe class="embed-frame" height="380" loading="lazy"
          src="${embedUrl.toString()}"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen title="YouTube video"></iframe>`;
    } else {
      body = `<video class="embed-video" src="${Utils.attr(url)}" controls preload="none"></video>`;
    }

    return BaseBlock.shell({
      key,
      dot: "#f87171",
      label: ctx.t(isYouTube ? "youTube" : "video"),
      labelKey: isYouTube ? "youTube" : "video",
      body,
      style: "overflow:hidden",
    });
  }
}
