/* ═══════════════════════════════════════════════
   code-runner.js — Run a JS block inside a sandboxed
   iframe (allow-scripts only: no DOM, no cookies, no
   same-origin access).
   ═══════════════════════════════════════════════ */

class CodeRunner {
  static TIMEOUT_MS = 5000;

  constructor(i18n) {
    this.i18n = i18n;
  }

  /** Copy the code of the block containing `btn`. */
  async copy(btn) {
    const code = btn.closest(".code-wrap")?.querySelector("code")?.innerText;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      return; // clipboard blocked; nothing useful to report
    }
    const original = this.i18n.t("copyCode");
    btn.textContent = this.i18n.t("copied");
    btn.classList.add("ok");
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove("ok");
    }, 2000);
  }

  run(btn) {
    const wrap = btn.closest(".code-wrap");
    const code = wrap?.querySelector("code")?.innerText ?? "";
    const output = wrap?.querySelector(".code-output");
    if (!output) return;

    const frame = document.createElement("iframe");
    frame.sandbox = "allow-scripts";
    frame.style.display = "none";
    document.body.appendChild(frame);

    const logs = [];
    let finished = false;

    const cleanup = () => {
      finished = true;
      window.removeEventListener("message", onMessage);
      frame.remove();
    };

    const show = (text, isError) => {
      output.textContent = text;
      output.classList.toggle("is-error", !!isError);
      output.hidden = false;
    };

    const onMessage = (event) => {
      if (event.source !== frame.contentWindow || finished) return;
      const { type, data, result } = event.data ?? {};

      if (type === "__md_log") {
        logs.push(data);
        return;
      }
      if (type === "__md_err") {
        cleanup();
        show(`❌ ${data}`, true);
        return;
      }
      if (type === "__md_done") {
        cleanup();
        const tail = result !== undefined ? `→ ${result}` : "";
        show([...logs, tail].join("\n").trim() || this.i18n.t("noOutput"), false);
      }
    };

    window.addEventListener("message", onMessage);
    frame.src = this._buildSandboxUrl(code);

    setTimeout(() => {
      if (finished) return;
      cleanup();
      show(`⏱ ${CodeRunner.TIMEOUT_MS / 1000}s timeout`, true);
    }, CodeRunner.TIMEOUT_MS);
  }

  _buildSandboxUrl(code) {
    const bridge = `
      const stringify = (value) => {
        try {
          return typeof value === 'object' && value !== null
            ? JSON.stringify(value, null, 2) : String(value);
        } catch { return String(value); }
      };
      window.console = {
        log: (...args) => parent.postMessage(
          { type: '__md_log', data: args.map(stringify).join(' ') }, '*'),
        error: (...args) => parent.postMessage(
          { type: '__md_log', data: args.map(stringify).join(' ') }, '*'),
        warn: (...args) => parent.postMessage(
          { type: '__md_log', data: args.map(stringify).join(' ') }, '*'),
      };
      window.onerror = (message) => {
        parent.postMessage({ type: '__md_err', data: message }, '*');
        return true;
      };
      try {
        const __result = (function () { ${code}\n })();
        parent.postMessage({ type: '__md_done', result: stringify(__result) }, '*');
      } catch (e) {
        parent.postMessage({ type: '__md_err', data: e.message }, '*');
      }`;

    const html = `<!doctype html><meta charset="utf-8"><script>${bridge}<\/script>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    setTimeout(() => URL.revokeObjectURL(url), CodeRunner.TIMEOUT_MS + 1000);
    return url;
  }
}
