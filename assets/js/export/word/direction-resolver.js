/* ═══════════════════════════════════════════════
   direction-resolver.js — Document-level direction
   policy.

   Paragraph direction is a local decision; a document's
   visual spine is not. Deciding per line made headings
   and list items alternate edges, so the direction is
   resolved once for the document and then applied per
   BLOCK, with a policy that depends on the block type.

   Unicode's first-strong rule is a paragraph heuristic,
   and the standard explicitly allows a higher-level
   protocol to override it. That protocol is this class.
   ═══════════════════════════════════════════════ */

class DirectionResolver {
  static MODES = ["auto", "rtl", "ltr"];

  /* ── Strong character classes ───────────────── */
  static RTL_RE = /[\u0591-\u07FF\u0860-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/g;
  static LTR_RE = /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]/g;

  /** `<!-- dir: rtl -->` anywhere in the source. */
  static DIRECTIVE_RE = /<!--\s*dir\s*:\s*(rtl|ltr)\s*-->/i;

  /* ── Block policies ─────────────────────────────
     baseline  — always follows the document
     cohesive  — one decision for the whole block
     deviating — may break away when decisive
     ltr       — never right-to-left                */
  static POLICY = {
    heading: "baseline",
    list: "cohesive",
    table: "cohesive",
    blockquote: "cohesive",
    paragraph: "deviating",
    code: "ltr",
    mermaid: "ltr",
  };

  /* ── Tunable thresholds ─────────────────────── */

  /** Share of strong characters that must be RTL for an
      auto-detected document to count as RTL. Technical
      Arabic carries a lot of Latin, so this is low. */
  static BASELINE_SHARE = 0.25;

  /** How one-sided a block must be to leave the baseline. */
  static FLIP_SHARE = 0.85;

  /** Minimum strong characters before a deviation is
      even considered. Short headings and one-line items
      stay put, which is what removes the jitter. */
  static MIN_STRONG = { deviating: 25, cohesive: 60 };

  constructor(mode = "auto") {
    this.mode = DirectionResolver.MODES.includes(mode) ? mode : "auto";
    this.baseline = true;
    this.source = "default";
    /** Guards against a caller that forgot resolveDocument(). */
    this.resolved = false;
  }

  /* ── Counting ───────────────────────────────── */

  static count(text) {
    const value = String(text ?? "");
    return {
      rtl: (value.match(DirectionResolver.RTL_RE) || []).length,
      ltr: (value.match(DirectionResolver.LTR_RE) || []).length,
    };
  }

  /** Code, URLs and markup are Latin by nature and would
      drag every technical Arabic document toward LTR. */
  static stripNoise(markdown) {
    return String(markdown ?? "")
      .replace(/^```[\s\S]*?^```/gm, " ")
      .replace(/`[^`\n]*`/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/https?:\/\/\S+/g, " ");
  }

  /* ── Step 1: the document baseline ──────────── */

  /**
   * Resolve once, before any block is built.
   * Priority: directive → user mode → auto detection.
   * @returns {boolean} true when the document is RTL
   */
  resolveDocument(markdown) {
    this.resolved = true;

    const directive = DirectionResolver.DIRECTIVE_RE.exec(markdown);
    if (directive) {
      this.baseline = directive[1].toLowerCase() === "rtl";
      this.source = "directive";
      return this.baseline;
    }

    if (this.mode !== "auto") {
      this.baseline = this.mode === "rtl";
      this.source = "user";
      return this.baseline;
    }

    const { rtl, ltr } = DirectionResolver.count(
      DirectionResolver.stripNoise(markdown),
    );
    const total = rtl + ltr;
    this.baseline =
      total === 0 ? true : rtl / total >= DirectionResolver.BASELINE_SHARE;
    this.source = "auto";

    Logger.debug(
      `document direction: ${this.baseline ? "RTL" : "LTR"} ` +
        `(${rtl} rtl / ${ltr} ltr, source=${this.source})`,
    );
    return this.baseline;
  }

  /* ── Step 2: per-block application ──────────── */

  /**
   * Lock the resolver to a fixed baseline. Used when the
   * caller passes a boolean instead of a resolver.
   */
  static fixed(isRtl) {
    const resolver = new DirectionResolver(isRtl ? "rtl" : "ltr");
    resolver.resolveDocument("");
    return resolver;
  }

  /**
   * @param {string} text  the WHOLE block's text, never one line
   * @param {string} type  heading | list | table | blockquote |
   *                       paragraph | code | mermaid
   * @param {object} [opts]
   * @param {'rtl'|'ltr'|null} [opts.explicit]  author override,
   *        reserved for the markdown-directive phase
   * @returns {boolean} true when this block is RTL
   */
  resolveBlock(text, type = "paragraph", { explicit = null } = {}) {
    // Closest declaration wins — nothing outranks the author
    if (explicit === "rtl") return true;
    if (explicit === "ltr") return false;

    const policy = DirectionResolver.POLICY[type] ?? "deviating";
    if (policy === "ltr") return false;
    if (policy === "baseline") return this.baseline;

    return this._deviate(text, DirectionResolver.MIN_STRONG[policy] ?? 25);
  }

  /** Leave the baseline only when decisively one-sided. */
  _deviate(text, minStrong) {
    const { rtl, ltr } = DirectionResolver.count(text);
    const total = rtl + ltr;
    if (total < minStrong) return this.baseline;

    const rtlShare = rtl / total;
    if (this.baseline && rtlShare <= 1 - DirectionResolver.FLIP_SHARE)
      return false;
    if (!this.baseline && rtlShare >= DirectionResolver.FLIP_SHARE) return true;
    return this.baseline;
  }
}
