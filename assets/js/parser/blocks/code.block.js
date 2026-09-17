/* ═══════════════════════════════════════════════
   code.block.js — every other fence language.
   Also the fallback when no registered block matches.
   ═══════════════════════════════════════════════ */

class CodeBlock extends BaseBlock {
  static langs = ["__default__"];
  static RUNNABLE = new Set(["javascript", "js"]);

  static render(tok, ctx) {
    const lang = (tok.lang || "").toLowerCase().trim();
    const highlighted = ctx.highlight(tok.text, lang);
    const key = ctx.key("code", `${lang}\u0000${tok.text}`);

    const runBtn = CodeBlock.RUNNABLE.has(lang)
      ? `<button class="run-btn" data-action="run-code"
                 data-i18n="runCode">${Utils.esc(ctx.t("runCode"))}</button>`
      : "";

    return `
    <div class="code-wrap" data-key="${Utils.attr(key)}">
      <div class="code-hdr">

      <div class="code-dots" aria-hidden="true">
        <span class="dot dot-red"></span>
        <span class="dot dot-yellow"></span>
        <span class="dot dot-green"></span>
      </div>

      <span class="code-lang">${Utils.esc(lang || "text")}</span>
        <div class="code-actions">
          ${runBtn}
          <button class="copy-btn" data-action="copy-code"
                  data-i18n="copyCode">${Utils.esc(ctx.t("copyCode"))}</button>
        </div>
      </div>
      <pre><code class="hljs">${highlighted}</code></pre>
      <div class="code-output" hidden></div>
    </div>`;
  }
}
