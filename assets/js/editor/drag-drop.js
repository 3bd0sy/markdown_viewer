/* ═══════════════════════════════════════════════
   drag-drop.js — Drop images and 3D models onto the
   editor to insert the matching markdown.
   ═══════════════════════════════════════════════ */

class DragDropHandler {
  static MODEL_EXT = /\.(glb|gltf)$/i;
  static MODEL_MIME = new Set(["model/gltf-binary", "model/gltf+json"]);

  constructor({ store, editor }) {
    this.store = store;
    this.editor = editor;
  }

  static isModel(file) {
    return (
      DragDropHandler.MODEL_EXT.test(file.name || "") ||
      DragDropHandler.MODEL_MIME.has(file.type)
    );
  }

  attach() {
    const el = this.editor.el;

    DOM.on(el, "dragover", (event) => {
      const items = [...(event.dataTransfer?.items ?? [])];
      const supported = items.some(
        (item) =>
          item.type.startsWith("image/") ||
          DragDropHandler.MODEL_MIME.has(item.type) ||
          item.kind === "file",
      );
      if (!supported) return;
      event.preventDefault();
      el.classList.add("drag-over");
    });

    DOM.on(el, "dragleave", () => el.classList.remove("drag-over"));

    DOM.on(el, "drop", async (event) => {
      el.classList.remove("drag-over");
      const files = [...(event.dataTransfer?.files ?? [])];
      if (!files.length) return;

      const model = files.find(DragDropHandler.isModel);
      if (model) {
        event.preventDefault();
        const url = await this.createModelUrl(model, files);
        this.editor.insertAtCursor(`\n\`\`\`3d\n${url}\n\`\`\`\n`);
        return;
      }

      const image = files.find((file) => file.type.startsWith("image/"));
      if (!image) return;
      event.preventDefault();
      const url = this.store.trackBlobUrl(image);
      const alt =
        image.name.replace(/\.[^.]+$/, "").replace(/\s+/g, "-") || "image";
      this.editor.insertAtCursor(`![${alt}](${url})`);
    });
  }

  /**
   * .glb is self-contained. .gltf references external
   * buffers and textures, so its URIs are rewritten to
   * blob URLs for the files dropped alongside it.
   */
  async createModelUrl(modelFile, droppedFiles) {
    if (!/\.gltf$/i.test(modelFile.name || "")) {
      return this.store.trackBlobUrl(modelFile);
    }

    const urls = new Map();
    for (const file of droppedFiles) {
      const url = this.store.trackBlobUrl(file);
      urls.set(file.name, url);
      urls.set(file.name.split(/[\\/]/).pop(), url);
    }

    try {
      const gltf = JSON.parse(await modelFile.text());
      const rewrite = (uri) => {
        if (!uri || /^(data:|https?:|blob:)/i.test(uri)) return uri;
        return urls.get(uri) ?? urls.get(uri.split(/[\\/]/).pop()) ?? uri;
      };
      (gltf.buffers ?? []).forEach((b) => b.uri && (b.uri = rewrite(b.uri)));
      (gltf.images ?? []).forEach((i) => i.uri && (i.uri = rewrite(i.uri)));
      return this.store.trackBlobUrl(
        new Blob([JSON.stringify(gltf)], { type: "model/gltf+json" }),
      );
    } catch (e) {
      Logger.warn("gltf rewrite failed, using raw file", e);
      return this.store.trackBlobUrl(modelFile);
    }
  }
}
