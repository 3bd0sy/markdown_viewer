/* ═══════════════════════════════════════════════
   block-registry.js — Maps a fence language to the
   class that renders it.

   Adding a block type is now one file plus one
   register() call; parser.js never changes.
   ═══════════════════════════════════════════════ */

class BlockRegistry {
  constructor() {
    this.byLang = new Map();
  }

  register(BlockClass) {
    for (const lang of BlockClass.langs) {
      this.byLang.set(lang.toLowerCase(), BlockClass);
    }
    return this;
  }

  get(lang) {
    return this.byLang.get(String(lang || "").toLowerCase()) ?? null;
  }

  has(lang) {
    return this.byLang.has(String(lang || "").toLowerCase());
  }
}

/**
 * Base class for fence renderers.
 *
 * ctx provides:
 *   t(key)              → translated string
 *   key(prefix, text)   → stable data-key for node reuse
 */
class BaseBlock {
  static langs = [];

  static render(_tok, _ctx) {
    throw new Error("BaseBlock.render must be overridden");
  }

  /** Shared card chrome: coloured dot, label, optional actions. */
  static shell({ key, dot, label, labelKey, sub = "", actions = "", body, style = "" }) {
    return `
    <div class="mm-wrap" data-key="${Utils.attr(key)}"${style ? ` style="${style}"` : ""}>
      <div class="mm-hdr">
        <div class="mm-hdr-l">
          <div class="mm-dot"${dot ? ` style="background:${dot}"` : ""}></div>
          <span class="mm-lbl" data-i18n="${Utils.attr(labelKey)}">${Utils.esc(label)}</span>
          ${sub ? `<span class="mm-sub">${Utils.esc(sub)}</span>` : ""}
        </div>
        <div class="mm-hdr-r">${actions}</div>
      </div>
      ${body}
    </div>`;
  }
}
