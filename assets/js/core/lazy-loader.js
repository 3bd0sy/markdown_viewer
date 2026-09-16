/* ═══════════════════════════════════════════════
   lazy-loader.js — Load heavy vendor bundles on
   first use instead of blocking startup.
   Plotly (~3MB), docx, PptxGenJS and model-viewer
   are only needed by a minority of documents.
   ═══════════════════════════════════════════════ */

class LazyLoader {
  static _pending = new Map();

  /** Inject a <script> once; repeated calls share one promise. */
  static script(src, { module = false } = {}) {
    if (LazyLoader._pending.has(src)) return LazyLoader._pending.get(src);

    const promise = new Promise((resolve, reject) => {
      const tag = document.createElement("script");
      tag.src = src;
      if (module) tag.type = "module";
      tag.async = true;
      tag.onload = () => resolve();
      tag.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(tag);
    });

    LazyLoader._pending.set(src, promise);
    return promise;
  }

  /** Load `src` unless `globalName` is already defined. */
  static async ensureGlobal(globalName, src, opts) {
    if (window[globalName]) return window[globalName];
    await LazyLoader.script(src, opts);
    return window[globalName];
  }
}

/** Vendor paths kept in one place so the offline setup stays truthful. */
const VENDOR = {
  plotly: "assets/vendor/plotly.min.js",
  docx: "assets/vendor/docx.umd.js",
  pptx: "assets/vendor/pptxgen.js",
  modelViewer: "assets/vendor/model-viewer.min.js",
};
