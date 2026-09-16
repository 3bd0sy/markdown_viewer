/* ═══════════════════════════════════════════════
   store.js — Single source of truth for app state.
   Holds data only; behaviour lives in the services.
   ═══════════════════════════════════════════════ */

class Store {
  constructor(bus) {
    this.bus = bus;

    /* ── Appearance ───────────────────────────── */
    this.isDark = false;
    this.lang = "ar";

    /* ── Render bookkeeping ───────────────────── */
    this.lastMarkdown = null; // skips no-op renders
    this.renderToken = 0; // bumped to cancel stale async work
    this.diagramsReady = Promise.resolve();

    /* ── Resource tracking ────────────────────── */
    this.blobUrls = new Set();
  }

  /** Invalidate any in-flight async render and return the new token. */
  nextRenderToken() {
    return ++this.renderToken;
  }

  isCurrent(token) {
    return token === this.renderToken;
  }

  /** Force the next render to rebuild even if the text is unchanged. */
  invalidate() {
    this.lastMarkdown = null;
  }

  setDark(isDark) {
    this.isDark = isDark;
    this.bus.emit(Events.THEME_CHANGED, isDark);
  }

  setLang(lang) {
    this.lang = lang;
    this.bus.emit(Events.LANG_CHANGED, lang);
  }

  /* ── Blob URL registry ────────────────────────
     Object URLs live until explicitly revoked, so
     every one created is tracked and released.      */

  trackBlobUrl(fileOrBlob) {
    const url = URL.createObjectURL(fileOrBlob);
    this.blobUrls.add(url);
    return url;
  }

  releaseBlobUrl(url) {
    if (!this.blobUrls.delete(url)) return;
    URL.revokeObjectURL(url);
  }

  releaseAllBlobUrls() {
    this.blobUrls.forEach((url) => URL.revokeObjectURL(url));
    this.blobUrls.clear();
  }
}
