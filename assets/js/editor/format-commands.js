/* ═══════════════════════════════════════════════
   format-commands.js — Toolbar insertions.
   Pure text transforms; the controller applies them.
   ═══════════════════════════════════════════════ */

class FormatCommands {
  /** type → [prefix, suffix] wrapped around the selection. */
  static WRAPS = {
    bold: ["**", "**"],
    italic: ["*", "*"],
    icode: ["`", "`"],
    block: ["```python\n", "\n```"],
    mermaid: ["```mermaid\nflowchart LR\n  A[Start] --> B[End]\n", "```"],
    math: ["$$\n", "\n$$"],
    h2: ["## ", ""],
    list: ["- ", ""],
    table: ["| Col 1 | Col 2 |\n|-------|-------|\n| cell  | cell  |", ""],
  };

  static has(type) {
    return Object.prototype.hasOwnProperty.call(FormatCommands.WRAPS, type);
  }

  /**
   * Wrap the current selection.
   * @returns {{value:string, start:number, end:number}|null}
   */
  static wrap(value, start, end, type) {
    const pair = FormatCommands.WRAPS[type];
    if (!pair) {
      Logger.warn(`unknown format: ${type}`);
      return null;
    }
    const [before, after] = pair;
    const selected = value.slice(start, end);
    return {
      value: value.slice(0, start) + before + selected + after + value.slice(end),
      start: start + before.length,
      end: end + before.length,
    };
  }

  /**
   * Wrap whole lines in <div dir="…">.
   * Toggles off if already wrapped, flips if wrapped
   * in the opposite direction.
   */
  static direction(value, start, end, dir) {
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const newlineEnd = value.indexOf("\n", end);
    const lineEnd = newlineEnd === -1 ? value.length : newlineEnd;

    const block = value.slice(lineStart, lineEnd);
    const open = `<div dir="${dir}">`;
    const close = "</div>";
    const otherOpen = `<div dir="${dir === "rtl" ? "ltr" : "rtl"}">`;

    let replacement;
    if (block.startsWith(open) && block.endsWith(close)) {
      replacement = block.slice(open.length, -close.length).trim();
    } else if (block.startsWith(otherOpen) && block.endsWith(close)) {
      const inner = block.slice(otherOpen.length, -close.length).trim();
      replacement = `${open}\n\n${inner}\n\n${close}`;
    } else {
      replacement = `${open}\n\n${block}\n\n${close}`;
    }

    return {
      value: value.slice(0, lineStart) + replacement + value.slice(lineEnd),
      start: lineStart,
      end: lineStart + replacement.length,
    };
  }
}
