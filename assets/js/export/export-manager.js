/* ═══════════════════════════════════════════════
   export-manager.js — Menu + exporter dispatch.
   Adding a format means registering one class.
   ═══════════════════════════════════════════════ */

class ExportManager {
  constructor(context) {
    this.ctx = context;
    this.exporters = new Map();
    this.busy = false;
  }

  register(ExporterClass) {
    this.exporters.set(ExporterClass.id, ExporterClass);
    return this;
  }

  toggleMenu(force) {
    const menu = DOM.el("export-menu");
    if (!menu) return;
    const open = force ?? menu.hidden;
    menu.hidden = !open;
    DOM.el("xbtn")?.setAttribute("aria-expanded", String(open));
  }

  closeMenu() {
    this.toggleMenu(false);
  }

  async run(formatId) {
    this.closeMenu();
    if (this.busy) return;

    const ExporterClass = this.exporters.get(formatId);
    if (!ExporterClass) {
      Logger.warn(`no exporter registered for "${formatId}"`);
      return;
    }

    const btn = DOM.el("xbtn");
    this.busy = true;
    if (btn) btn.disabled = true;
    DOM.flashStatus(this.ctx.i18n.t("exporting"), 0);

    try {
      await new ExporterClass(this.ctx).run();
      DOM.flashStatus(this.ctx.i18n.t("exportDone"));
    } catch (e) {
      Logger.error(`export "${formatId}" failed`, e);
      DOM.flashStatus(
        `${this.ctx.i18n.t("exportError")} ${e.message ?? ""}`,
        5000,
      );
    } finally {
      this.busy = false;
      if (btn) btn.disabled = false;
    }
  }

  static createDefault(context) {
    return new ExportManager(context)
      .register(WordExporter)
      .register(PdfExporter)
      .register(MarkdownExporter)
      .register(TextExporter)
      .register(PptxExporter);
  }
}
