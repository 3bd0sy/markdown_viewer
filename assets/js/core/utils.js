/* ═══════════════════════════════════════════════
   utils.js — Pure helpers. No app state, no side
   effects outside the returned value (dlBlob aside).
   ═══════════════════════════════════════════════ */

class Utils {
  /* ── HTML escaping ──────────────────────────── */

  static esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /** Alias used when the value lands inside an attribute. */
  static attr(s) {
    return Utils.esc(s);
  }

  static ENTITY_MAP = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&nbsp;": "\u00a0",
    "&#x27;": "'",
    "&#x2F;": "/",
  };

  static decodeHtmlEntities(text) {
    return String(text ?? "").replace(
      /&(?:amp|lt|gt|quot|#39|nbsp|#x27|#x2F);/g,
      (m) => Utils.ENTITY_MAP[m] ?? m,
    );
  }

  static hasArabic(text) {
    return /[\u0600-\u06FF]/.test(String(text ?? ""));
  }

  /* ── Security ───────────────────────────────── */

  /** Rejects javascript:, data:, vbscript: and other non-media schemes. */
  static sanitizeMediaUrl(raw) {
    const url = String(raw ?? "").trim();
    try {
      const parsed = new URL(url, location.href);
      if (!["https:", "http:", "blob:"].includes(parsed.protocol)) return "";
      return parsed.href;
    } catch {
      return /^[\w\-./]+$/.test(url) ? url : "";
    }
  }

  /* ── Hashing ────────────────────────────────── */

  /**
   * cyrb53 — fast, stable, 53-bit content hash.
   * Used to build DOM keys so unchanged blocks can be
   * transplanted between renders instead of rebuilt.
   */
  static hash(str) {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 =
      Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
      Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 =
      Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
      Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  static slugify(text) {
    return String(text)
      .toLowerCase()
      .trim()
      .replace(/[^\w\u0600-\u06FF\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  /* ── Scheduling ─────────────────────────────── */

  static debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  /**
   * Hand control back to the browser so it can paint.
   * Called between diagram renders to keep the UI alive.
   */
  static yieldToBrowser() {
    if (window.scheduler?.postTask) {
      return window.scheduler
        .postTask(() => {}, { priority: "user-visible" })
        .catch(() => {});
    }
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  static nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  /* ── DOM geometry ───────────────────────────── */

  /** Nearest scrollable ancestor — IntersectionObserver root. */
  static getScrollParent(el) {
    let node = el?.parentElement;
    while (node) {
      const { overflowY } = getComputedStyle(node);
      if (/(auto|scroll|overlay)/.test(overflowY)) return node;
      node = node.parentElement;
    }
    return null;
  }

  /** viewBox → getBBox → getBoundingClientRect, in that order. */
  static getSvgDimensions(svgEl) {
    const vb = svgEl?.viewBox?.baseVal;
    if (vb?.width && vb?.height) {
      return { x: vb.x || 0, y: vb.y || 0, width: vb.width, height: vb.height };
    }
    try {
      const b = svgEl.getBBox();
      if (b.width && b.height) {
        return { x: b.x || 0, y: b.y || 0, width: b.width, height: b.height };
      }
    } catch {
      /* getBBox throws when the element is not rendered */
    }
    const r = svgEl?.getBoundingClientRect?.() ?? { width: 0, height: 0 };
    return {
      x: 0,
      y: 0,
      width: r.width || 800,
      height: r.height || 600,
    };
  }

  /** Deep clone with export-safe dimensions and text-wrap CSS injected. */
  static cloneSvgForExport(svgEl, width, height) {
    const dims = Utils.getSvgDimensions(svgEl);
    width = width || dims.width;
    height = height || dims.height;

    const clone = svgEl.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", width);
    clone.setAttribute("height", height);
    clone.setAttribute("viewBox", `${dims.x} ${dims.y} ${width} ${height}`);

    const style = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "style",
    );
    style.textContent = `
      .edgeLabel foreignObject,
      .node foreignObject,
      .label foreignObject { overflow: visible; }
      .label div, .nodeLabel, .edgeLabel div, .edgeLabel span {
        max-width: 200px;
        white-space: normal !important;
        overflow-wrap: anywhere;
        word-break: break-word;
        line-height: 1.3;
        text-align: center;
        display: block;
      }`;
    clone.insertBefore(style, clone.firstChild);
    return clone;
  }

  static fitImageSize(width, height, maxW = 480, maxH = 320) {
    const scale = Math.min(maxW / width, maxH / height, 1);
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
    };
  }

  /* ── Binary conversions ─────────────────────── */

  /** Rasterize an SVG element to a PNG data URL. Resolves null on failure. */
  static async svgToPngDataUrl(svgEl, scale = 2) {
    const { width, height } = Utils.getSvgDimensions(svgEl);
    if (!width || !height) return null;

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const ctx = canvas.getContext("2d");

    const clone = Utils.cloneSvgForExport(svgEl, width, height);
    const svgData = new XMLSerializer().serializeToString(clone);
    const dataUri =
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
          resolve(canvas.toDataURL("image/png"));
        } catch (e) {
          Logger.warn("canvas.toDataURL failed", e);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = dataUri;
    });
  }

  static dataUrlToUint8Array(dataUrl) {
    const base64 = dataUrl.split(",")[1] || "";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  static dataUrlToBlob(dataUrl) {
    const mime =
      dataUrl.match(/^data:([^;,]+)/)?.[1] || "application/octet-stream";
    return new Blob([Utils.dataUrlToUint8Array(dataUrl)], { type: mime });
  }

  /* ── Download ───────────────────────────────── */

  static dlBlob(blob, filename) {
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
