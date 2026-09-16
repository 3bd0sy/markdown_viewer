/* ═══════════════════════════════════════════════
   video.block.js — ```video  →  YouTube or direct URL
   ═══════════════════════════════════════════════ */

class VideoBlock extends BaseBlock {
  static langs = ["video"];
  static YT_RE = /youtu(?:be\.com|\.be)/;
  static YT_ID_RE = /(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/;

  static render(tok, ctx) {
    const raw = tok.text.trim();
    const url = Utils.sanitizeMediaUrl(raw);
    if (!url) {
      return `<p class="mm-err">${Utils.esc(ctx.t("invalidVideoURL"))}: ${Utils.esc(raw)}</p>`;
    }

    const key = ctx.key("vid", raw);
    const isYouTube = VideoBlock.YT_RE.test(url);
    let body;

    if (isYouTube) {
      const videoId = url.match(VideoBlock.YT_ID_RE)?.[1] ?? "";
      body = `
        <iframe class="embed-frame" height="380" loading="lazy"
          src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}"
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
