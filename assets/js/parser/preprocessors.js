/* ═══════════════════════════════════════════════
   preprocessors.js — Source transforms applied
   before marked sees the text.

   Order matters:
     footnotes → extractMath → grids → callouts → tabs

   Each transform works on raw Markdown text and,
   where possible, returns content that marked.lexer
   can consume in a single piece (no blank lines
   inside generated HTML blocks).
   ═══════════════════════════════════════════════ */

class Preprocessors {
  /** Fenced code blocks, so transforms can skip their contents. */
  static FENCE_RE =
    /^([ \t]{0,3})(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^[ \t]{0,3}\2[^\n]*$|$)/gm;

  /* ═══════════════════════════════════════════════
     Fence protection helpers
     ═══════════════════════════════════════════════ */

  /** Replace every fenced block with a single-line placeholder. */
  static _maskFences(src) {
    const fences = [];
    const masked = String(src).replace(Preprocessors.FENCE_RE, (m) => {
      const key = `«FENCE_${fences.length}»`;
      fences.push(m);
      return key;
    });
    return { masked, fences };
  }

  /** Bring fenced blocks back from placeholders. */
  static _restoreFences(text, fences) {
    return String(text).replace(/«FENCE_(\d+)»/g, (_, i) => fences[+i]);
  }

  /** Remove blank lines — but never inside <pre> blocks. */
  static _stripBlankLines(html) {
    const pres = [];
    const masked = String(html).replace(/<pre\b[\s\S]*?<\/pre>/gi, (m) => {
      const key = `«PRE_${pres.length}»`;
      pres.push(m);
      return key;
    });
    const stripped = masked.replace(/\n\s*\n/g, "\n");
    return stripped.replace(/«PRE_(\d+)»/g, (_, i) => pres[+i]);
  }

  /**
   * Collapse newlines outside <pre> blocks into a single space.
   * Purpose: keep an HTML fragment on one logical line so that
   * marked.lexer does not split it into several tokens.
   */
  static _collapseNewlinesOutsidePre(html) {
    const pres = [];
    const PLACEHOLDER = "\u0002PRE_";
    const END_MARK = "\u0002";

    const masked = String(html).replace(/<pre\b[\s\S]*?<\/pre>/gi, (m) => {
      const key = `${PLACEHOLDER}${pres.length}${END_MARK}`;
      pres.push(m);
      return key;
    });

    const collapsed = masked.replace(/\s*\n\s*/g, " ");

    return collapsed.replace(
      new RegExp(`${PLACEHOLDER}(\\d+)${END_MARK}`, "g"),
      (_, idx) => pres[+idx],
    );
  }

  /* ═══════════════════════════════════════════════
     Footnotes
     ═══════════════════════════════════════════════ */

  static footnotes(src) {
    const defs = new Map();

    src = src.replace(/^\[\^([^\]]+)\]:[ \t]*(.+)$/gm, (_, key, value) => {
      defs.set(key, value);
      return "";
    });

    // Number each key exactly once — definitions reuse the same number.
    const numbers = new Map();
    let counter = 0;

    src = src.replace(/\[\^([^\]]+)\]/g, (_, key) => {
      if (!numbers.has(key)) numbers.set(key, ++counter);
      const num = numbers.get(key);
      const safe = Utils.esc(key);
      return (
        `<sup class="fn-ref">` +
        `<a href="#fn-${safe}" id="fnref-${safe}" data-fn-num="${num}">[${num}]</a>` +
        `</sup>`
      );
    });

    if (!defs.size) return src;

    let out = `${src}\n\n<hr class="fn-sep">\n<div class="fn-list">\n`;
    for (const [key, value] of defs) {
      const safe = Utils.esc(key);
      const num = numbers.get(key) ?? "?";
      // Render inline markdown (bold, code, links) inside the footnote body.
      const rendered = marked.parseInline(value);
      out +=
        `<p id="fn-${safe}" class="fn-item">` +
        `<a href="#fnref-${safe}" class="fn-back" title="العودة للمرجع">↩</a> ` +
        `<span class="fn-num">[${num}]</span> ` +
        `<span class="fn-text">${rendered}</span>` +
        `</p>\n`;
    }
    out += `</div>\n`;
    return out;
  }

  /* ═══════════════════════════════════════════════
     Math protection
     ═══════════════════════════════════════════════ */

  /**
   * Replace LaTeX spans with opaque keys so marked cannot
   * mangle them. Fenced code is skipped, so a `$` inside a
   * shell snippet stays a `$`.
   */
  static extractMath(src) {
    const map = Object.create(null);
    let index = 0;

    const swap = (segment) =>
      segment
        .replace(/\$\$([\s\S]+?)\$\$/g, (match) => {
          const key = `«MATH_${index++}»`;
          map[key] = match;
          return key;
        })
        .replace(/\$(?!\s)([^\n$]+?)(?<!\s)\$/g, (match) => {
          const key = `«MATH_${index++}»`;
          map[key] = match;
          return key;
        });

    let out = "";
    let cursor = 0;
    const fence = new RegExp(Preprocessors.FENCE_RE.source, "gm");
    let match;

    while ((match = fence.exec(src)) !== null) {
      out += swap(src.slice(cursor, match.index));
      out += match[0]; // fenced block passes through untouched
      cursor = match.index + match[0].length;
    }
    out += swap(src.slice(cursor));

    return { src: out, map };
  }

  /** Single pass — the old version scanned the whole string per equation. */
  static restoreMath(html, map) {
    return html.replace(/«MATH_\d+»/g, (key) => map[key] ?? key);
  }

  /* ═══════════════════════════════════════════════
     Checkbox freeze
     ═══════════════════════════════════════════════ */

  /** Checkbox inputs in the preview are display-only. */
  static freezeCheckboxes(html) {
    return html.replace(
      /<input type="checkbox"([^>]*)>/gi,
      (_, rest) => `<input type="checkbox"${rest} disabled>`,
    );
  }

  /* ═══════════════════════════════════════════════
     Callouts / Admonitions

     Syntax:
       :::type optional-title
       body (supports Markdown)
       :::
     ═══════════════════════════════════════════════ */

  static CALLOUT_TYPES = {
    note: { label: "Note", icon: "ℹ️" },
    info: { label: "Info", icon: "📘" },
    tip: { label: "Tip", icon: "💡" },
    success: { label: "Success", icon: "✅" },
    warning: { label: "Warning", icon: "⚠️" },
    danger: { label: "Danger", icon: "🚨" },
    error: { label: "Error", icon: "⛔" },
    quote: { label: "Quote", icon: "💬" },
  };

  /**
   * Line-based state machine. Runs before marked.lexer.
   * Emits a single-line <div> per callout so marked.lexer
   * keeps each callout as one HTML block.
   */
  static callouts(src) {
    const lines = String(src).split("\n");
    const out = [];
    let i = 0;

    const TYPE_RE = /^:::[ \t]*(\w+)[ \t]*(.*?)[ \t]*$/;
    const CLOSE_RE = /^:::[ \t]*$/;

    while (i < lines.length) {
      const openM = lines[i].match(TYPE_RE);
      if (!openM) {
        out.push(lines[i++]);
        continue;
      }

      const type = openM[1].toLowerCase();
      const spec = Preprocessors.CALLOUT_TYPES[type];
      if (!spec) {
        out.push(lines[i++]);
        continue;
      }

      const customTitle = (openM[2] || "").trim();
      const heading = customTitle || spec.label;
      i++;

      // Gather body lines until the closing `:::` or the
      // start of another recognized callout.
      const bodyLines = [];
      while (i < lines.length) {
        if (CLOSE_RE.test(lines[i])) {
          i++;
          break;
        }
        const peek = lines[i].match(TYPE_RE);
        if (peek && Preprocessors.CALLOUT_TYPES[peek[1].toLowerCase()]) {
          break;
        }
        bodyLines.push(lines[i++]);
      }

      const body = bodyLines.join("\n").trim();

      // Empty callout — still emit a header-only box.
      if (!body) {
        out.push(
          `<div class="md-callout md-callout-${type}" data-callout="${type}">` +
            `<div class="md-callout-hdr">` +
            `<span class="md-callout-icon" aria-hidden="true">${spec.icon}</span>` +
            `<span class="md-callout-lbl">${Utils.esc(heading)}</span>` +
            `</div>` +
            `</div>`,
        );
        continue;
      }

      let innerHtml;
      try {
        innerHtml = marked.parse(body);
      } catch (e) {
        Logger.warn("callout body failed to parse", e);
        innerHtml = `<p>${Utils.esc(body)}</p>`;
      }

      // Keep the whole block on one logical line for marked.lexer.
      innerHtml = Preprocessors._collapseNewlinesOutsidePre(innerHtml);

      out.push(
        `<div class="md-callout md-callout-${type}" data-callout="${type}">` +
          `<div class="md-callout-hdr">` +
          `<span class="md-callout-icon" aria-hidden="true">${spec.icon}</span>` +
          `<span class="md-callout-lbl">${Utils.esc(heading)}</span>` +
          `</div>` +
          `<div class="md-callout-body">${innerHtml}</div>` +
          `</div>`,
      );
    }

    return out.join("\n");
  }

  /* ═══════════════════════════════════════════════
     Tabs — MkDocs Material style

     Syntax:
       === "Tab Title"
           indented body (4 spaces or 1 tab)
     ═══════════════════════════════════════════════ */

  static tabs(src) {
    const { masked, fences } = Preprocessors._maskFences(src);
    const expanded = Preprocessors._expandTabs(masked, fences);
    return Preprocessors._restoreFences(expanded, fences);
  }

  static _expandTabs(chunk, fences) {
    const lines = chunk.split("\n");
    const out = [];
    let i = 0;

    while (i < lines.length) {
      const startM = lines[i].match(/^===[ \t]+["'](.+?)["'][ \t]*$/);
      if (!startM) {
        out.push(lines[i++]);
        continue;
      }

      const tabs = [];

      // Collect consecutive tab headers and their indented bodies.
      while (i < lines.length) {
        const hm = lines[i].match(/^===[ \t]+["'](.+?)["'][ \t]*$/);
        if (!hm) break;
        const title = hm[1];
        i++;

        const body = [];
        while (i < lines.length) {
          const line = lines[i];
          if (line.trim() === "") {
            body.push("");
            i++;
            continue;
          }
          if (/^( {4}|\t)/.test(line)) {
            body.push(line.replace(/^( {4}|\t)/, ""));
            i++;
            continue;
          }
          break;
        }
        while (body.length && body[body.length - 1] === "") body.pop();
        tabs.push({ title, body: body.join("\n") });
      }

      if (!tabs.length) continue;

      // Content-derived key so DomDiffer preserves tab state.
      const fingerprint = tabs
        .map((t) => t.title + "\u0000" + t.body)
        .join("\u0001");
      const tabsKey = "tabs-" + Utils.hash(fingerprint);

      // macOS-style window dots for the nav bar.
      const dots =
        `<span class="code-dots" aria-hidden="true">` +
        `<span class="dot dot-red"></span>` +
        `<span class="dot dot-yellow"></span>` +
        `<span class="dot dot-green"></span>` +
        `</span>`;

      const navButtons = tabs
        .map(
          (t, idx) =>
            `<button type="button" class="md-tab${idx === 0 ? " is-active" : ""}"` +
            ` data-tab-index="${idx}"` +
            ` role="tab" aria-selected="${idx === 0 ? "true" : "false"}">` +
            `${Utils.esc(t.title)}</button>`,
        )
        .join("");

      const nav = dots + `<span class="md-tabs-sep"></span>` + navButtons;

      const panelsHtml = tabs
        .map((t, idx) => {
          const restored = Preprocessors._restoreFences(t.body, fences);
          const html = Preprocessors._stripBlankLines(marked.parse(restored));
          return (
            `<div class="md-tab-panel${idx === 0 ? " is-active" : ""}"` +
            ` role="tabpanel" data-panel-index="${idx}"` +
            `${idx !== 0 ? " hidden" : ""}>${html}</div>`
          );
        })
        .join("");

      out.push(
        `<div class="md-tabs" data-key="${Utils.attr(tabsKey)}">` +
          `<div class="md-tabs-nav" role="tablist">${nav}</div>` +
          `<div class="md-tabs-panels">${panelsHtml}</div>` +
          `</div>`,
      );
    }

    return out.join("\n");
  }

  /* ═══════════════════════════════════════════════
     Layout Blocks — Grid Container
     ═══════════════════════════════════════════════ */

  static grids(src) {
    const map = [];
    const lines = String(src).split("\n");
    const out = [];
    let i = 0;

    const OPEN_ANY = /^:::[ \t]*(\w[\w-]*)(.*)$/;
    const CLOSE = /^:::[ \t]*$/;
    const GRID_RE = /^:::[ \t]*grid\b(.*)$/i;
    const ITEM_RE = /^:::[ \t]*item\b(.*)$/i;

    /** Extract columns / gap / span from the opening line. */
    const parseOpts = (s) => {
      const o = {};
      if (!s) return o;

      const colQ = s.match(/columns\s*=\s*["']([^"']+)["']/i);
      const colN = s.match(/columns\s*=\s*(\d+)(?!\w)/i);
      const gap = s.match(/gap\s*=\s*(\d+)/i);
      const span = s.match(/span\s*=\s*(\d+)/i);

      if (colQ) o.columns = colQ[1].trim();
      else if (colN) o.columns = parseInt(colN[1], 10);

      if (gap) o.gap = parseInt(gap[1], 10);
      if (span) o.span = parseInt(span[1], 10);
      return o;
    };

    /**
     * Read lines until the matching `:::` at depth 0.
     * Depth tracking allows nested containers (callouts, tabs,
     * nested grids) inside the body without ending early.
     */
    const readUntilClose = (startDepth = 1) => {
      const buf = [];
      let depth = startDepth;
      while (i < lines.length) {
        const line = lines[i];

        if (CLOSE.test(line)) {
          depth--;
          i++;
          if (depth === 0) return buf;
          buf.push(line);
          continue;
        }

        if (OPEN_ANY.test(line)) depth++;

        buf.push(line);
        i++;
      }
      return buf; // unclosed — return whatever was collected
    };

    /** Parse one complete grid block and return its marker. */
    const readGrid = () => {
      const gm = lines[i].match(GRID_RE);
      const opts = parseOpts(gm[1] || "");
      i++; // consume the `:::grid` line

      const items = [];
      while (i < lines.length) {
        const line = lines[i];

        if (CLOSE.test(line)) {
          i++; // consume the grid's closing `:::`
          break;
        }

        const im = line.match(ITEM_RE);
        if (im) {
          const itemOpts = parseOpts(im[1] || "");
          i++; // consume the `:::item` line
          const body = readUntilClose(1);
          items.push({
            span: itemOpts.span || 1,
            content: body.join("\n").trim(),
          });
          continue;
        }

        // Content outside an explicit `:::item` — treat it as
        // an implicit item, so hand-written grids without item
        // wrappers still produce a cell.
        const implicitBody = [];
        while (
          i < lines.length &&
          !CLOSE.test(lines[i]) &&
          !ITEM_RE.test(lines[i])
        ) {
          implicitBody.push(lines[i]);
          i++;
        }
        const trimmed = implicitBody.join("\n").trim();
        if (trimmed) {
          items.push({ span: 1, content: trimmed });
        }
      }

      const id = map.length;
      map.push({ columns: opts.columns, gap: opts.gap, items });
      return `<!--MD-GRID:${id}-->`;
    };

    while (i < lines.length) {
      if (GRID_RE.test(lines[i])) {
        out.push("");
        out.push(readGrid());
        out.push("");
        continue;
      }
      out.push(lines[i]);
      i++;
    }

    return { src: out.join("\n"), grids: map };
  }
}
