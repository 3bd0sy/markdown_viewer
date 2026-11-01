/* ═══════════════════════════════════════════════
   docx-media-utils.js — Safe image collection helpers
   shared by the DOCX exporter and inline renderers.
   All embedded images are rasterized to PNG because
   the bundled docx ImageRun writer stores images as PNG.
   ═══════════════════════════════════════════════ */

class DocxMediaUtils {
  static MAX_DATA_URL_LENGTH = 16 * 1024 * 1024;
  static MAX_REMOTE_BYTES = 20 * 1024 * 1024;
  static MAX_RASTER_DIMENSION = 2048;
  static MAX_IMAGES_PER_DOCUMENT = 80;
  static IMAGE_TIMEOUT_MS = 15000;

  static decode(value) {
    const text = String(value ?? "");
    return typeof DocxTextUtils !== "undefined"
      ? DocxTextUtils.decode(text)
      : text.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
  }

  static baseUrl() {
    if (typeof document !== "undefined" && document.baseURI) return document.baseURI;
    if (typeof location !== "undefined" && location.href) return location.href;
    return "https://localhost/";
  }

  static normalizeImageSource(value) {
    const source = DocxMediaUtils.decode(value);
    if (!source || /[\u0000-\u001F]/.test(source)) return "";

    if (/^data:/i.test(source)) {
      if (source.length > DocxMediaUtils.MAX_DATA_URL_LENGTH) return "";
      return /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp|svg\+xml)(?:;[^,]*)?,/i.test(source)
        ? source
        : "";
    }

    try {
      const url = new URL(source, DocxMediaUtils.baseUrl());
      const protocol = url.protocol.toLowerCase();
      const sameLocalFile = protocol === "file:" && new URL(DocxMediaUtils.baseUrl()).protocol === "file:";
      if (!["http:", "https:", "blob:"].includes(protocol) && !sameLocalFile) return "";
      if (url.username || url.password) return "";
      return url.href;
    } catch {
      return "";
    }
  }

  static imageKey(value) {
    const normalized = DocxMediaUtils.normalizeImageSource(value);
    return normalized ? `img:${Utils.hash(normalized)}:${normalized.length}` : "";
  }

  static svgKey(markup) {
    const source = String(markup ?? "");
    return `svg:${Utils.hash(source)}:${source.length}`;
  }

  static safeLink(value) {
    const source = DocxMediaUtils.decode(value);
    if (!source || /[\u0000-\u0020]/.test(source)) return "";
    try {
      const url = new URL(source, DocxMediaUtils.baseUrl());
      if (!["http:", "https:", "mailto:"].includes(url.protocol.toLowerCase())) return "";
      if (url.username || url.password) return "";
      return url.href;
    } catch {
      return "";
    }
  }

  static parseAttributes(tag) {
    const attrs = Object.create(null);
    const source = String(tag ?? "")
      .replace(/^\s*<[a-z][\w:-]*/i, "")
      .replace(/\/?>\s*$/, "");
    const pattern = /([^\s=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let match;
    while ((match = pattern.exec(source)) !== null) {
      const name = match[1].toLowerCase();
      if (name.startsWith("on")) continue;
      attrs[name] = DocxMediaUtils.decode(match[2] ?? match[3] ?? match[4] ?? "");
    }
    return attrs;
  }

  static firstSrcset(source) {
    const raw = String(source ?? "").trim();
    if (!raw) return "";

    let quote = null;
    for (let index = 0; index < raw.length; index += 1) {
      const ch = raw[index];

      if (quote) {
        if (ch === quote) quote = null;
        continue;
      }

      if (ch === '"' || ch === "'") {
        quote = ch;
        continue;
      }

      if (/\s/.test(ch)) {
        const remainder = raw.slice(index + 1).trimStart();
        if (!remainder) return raw.slice(0, index).trim();
        if (/^(?:\d+(?:\.\d+)?(?:[wx])?)(?:\s*(?:,|$))?/i.test(remainder)) {
          return raw.slice(0, index).trim();
        }
      }

      if (ch === ",") {
        const remainder = raw.slice(index + 1).trimStart();
        if (!remainder) return raw.slice(0, index).trim();
        if (/^(?:[a-z]+:|\/|\.|#)/i.test(remainder)) {
          return raw.slice(0, index).trim();
        }
      }
    }

    return raw;
  }

  /**
   * Parse the safe, useful subset of HTML used by Markdown media.
   * Unknown tags are discarded while their text remains. Scripts,
   * styles and templates are removed with their contents.
   */
  static parseHtmlFragment(html) {
    const preservedSvgs = [];
    const maskedSvgs = String(html ?? "").replace(/<svg\b[^>]*>[\s\S]*?<\/svg\s*>/gi, (svg) => {
      const marker = `\u0001DOCX_SVG_${preservedSvgs.length}\u0001`;
      preservedSvgs.push(svg);
      return marker;
    });
    const source = maskedSvgs
      .replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
      .replace(/\u0001DOCX_SVG_(\d+)\u0001/g, (_, index) => preservedSvgs[Number(index)]);
    const tokens = source.match(/<!--[\s\S]*?-->|<\/?[a-z][\w:-]*(?:"[^"]*"|'[^']*'|[^'">])*>|[^<]+|</gi) || [];
    const pushText = (segments, text) => {
      const decoded = DocxMediaUtils.decode(text).replace(/\u00a0/g, " ");
      if (decoded) segments.push({ type: "text", text: decoded });
    };

    const parseRange = (start, end) => {
      const segments = [];
      let index = start;
      while (index < end) {
        const token = tokens[index];
        const opening = token.match(/^<([a-z][\w:-]*)\b/i);
        const closing = token.match(/^<\/([a-z][\w:-]*)\b/i);
        const name = (opening?.[1] || closing?.[1] || "").toLowerCase();

        if (!opening) {
          if (closing && /^(p|div|li|h[1-6]|figcaption|section|article)$/.test(name)) {
            segments.push({ type: "break" });
          } else if (token.startsWith("<!--")) {
            const marker = token.match(/^<!--(MD-(?:GRID|TABS):\d+)-->$/);
            if (marker) segments.push({ type: "container-marker", marker: marker[1] });
          } else if (!closing && token !== "<") {
            pushText(segments, token);
          }
          index += 1;
          continue;
        }

        const attrs = DocxMediaUtils.parseAttributes(token);
        const isVoid = /\/>$/.test(token) || /^(img|source|br|hr|meta|link|input|area|base|col|embed|param|track|wbr)$/.test(name);
        if (name === "img") {
          segments.push({
            type: "image",
            src: attrs.src || DocxMediaUtils.firstSrcset(attrs.srcset),
            alt: attrs.alt || "",
            title: attrs.title || "",
            width: attrs.width || "",
            height: attrs.height || "",
          });
          index += 1;
          continue;
        }
        if (name === "br") {
          segments.push({ type: "break" });
          index += 1;
          continue;
        }
        if (isVoid || !["svg", "a", "video", "audio", "iframe"].includes(name)) {
          index += 1;
          continue;
        }

        let closeIndex = -1;
        let depth = 1;
        for (let cursor = index + 1; cursor < end; cursor += 1) {
          const candidate = tokens[cursor];
          const openTag = candidate.match(/^<([a-z][\w:-]*)\b/i);
          const closeTag = candidate.match(/^<\/([a-z][\w:-]*)\b/i);
          if (openTag?.[1].toLowerCase() === name && !/\/>$/.test(candidate)) depth += 1;
          if (closeTag?.[1].toLowerCase() === name && --depth === 0) {
            closeIndex = cursor;
            break;
          }
        }
        const bodyEnd = closeIndex < 0 ? end : closeIndex;
        const innerTokens = tokens.slice(index + 1, bodyEnd);
        const inner = innerTokens.join("");

        if (name === "svg") {
          const markup = token + inner + (closeIndex < 0 ? "" : tokens[closeIndex]);
          segments.push({ type: "svg", markup, alt: DocxMediaUtils.svgDescription(markup) });
        } else if (name === "a") {
          segments.push({ type: "link", href: attrs.href || "", children: parseRange(index + 1, bodyEnd) });
        } else {
          const sourceTag = innerTokens.find((child) => /^<source\b/i.test(child));
          const sourceAttrs = sourceTag ? DocxMediaUtils.parseAttributes(sourceTag) : {};
          const children = parseRange(index + 1, bodyEnd);
          const fallbackLink = children.find((child) => child.type === "link" && child.href);
          const poster = attrs.poster
            ? { type: "image", src: attrs.poster, alt: attrs.title || `${name} poster` }
            : null;
          segments.push({
            type: "media",
            kind: name === "iframe" ? "video" : name,
            src: attrs.src || sourceAttrs.src || DocxMediaUtils.firstSrcset(sourceAttrs.srcset) || fallbackLink?.href || "",
            title: attrs.title || "",
            poster,
            children,
          });
        }
        index = closeIndex < 0 ? end : closeIndex + 1;
      }
      return segments;
    };

    return parseRange(0, tokens.length);
  }

  static svgDescription(markup) {
    const title = String(markup).match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1];
    if (title) return DocxMediaUtils.decode(title.replace(/<[^>]+>/g, "")).trim() || "SVG image";
    const text = String(markup)
      .replace(/<(?:style|script|desc)\b[^>]*>[\s\S]*?<\/(?:style|script|desc)\s*>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 160) || "SVG image";
  }

  static addImageSource(source, imageSources) {
    const normalized = DocxMediaUtils.normalizeImageSource(source);
    const key = normalized ? DocxMediaUtils.imageKey(normalized) : "";
    if (key && !imageSources.has(key)) imageSources.set(key, normalized);
  }

  static collectFromHtml(html, imageSources, inlineSvgs) {
    for (const segment of DocxMediaUtils.parseHtmlFragment(html)) {
      if (segment.type === "image" && segment.src) DocxMediaUtils.addImageSource(segment.src, imageSources);
      else if (segment.type === "svg") inlineSvgs.set(DocxMediaUtils.svgKey(segment.markup), segment.markup);
      else if (segment.type === "media") {
        if (segment.poster?.src) DocxMediaUtils.addImageSource(segment.poster.src, imageSources);
        DocxMediaUtils.collectSegments(segment.children, imageSources, inlineSvgs);
      } else if (segment.type === "link") {
        DocxMediaUtils.collectSegments(segment.children, imageSources, inlineSvgs);
      }
    }
  }

  static collectSegments(segments, imageSources, inlineSvgs) {
    for (const segment of segments || []) {
      if (segment.type === "image" && segment.src) DocxMediaUtils.addImageSource(segment.src, imageSources);
      else if (segment.type === "svg") inlineSvgs.set(DocxMediaUtils.svgKey(segment.markup), segment.markup);
      else if (segment.type === "media") {
        if (segment.poster?.src) DocxMediaUtils.addImageSource(segment.poster.src, imageSources);
        DocxMediaUtils.collectSegments(segment.children, imageSources, inlineSvgs);
      } else if (segment.type === "link") {
        DocxMediaUtils.collectSegments(segment.children, imageSources, inlineSvgs);
      }
    }
  }

  static sanitizeSvg(markup) {
    if (typeof DOMParser === "undefined" || typeof XMLSerializer === "undefined") return null;
    const parsed = new DOMParser().parseFromString(String(markup ?? ""), "image/svg+xml");
    if (parsed.querySelector("parsererror")) return null;
    const root = parsed.documentElement;
    if (!root || root.localName?.toLowerCase() !== "svg") return null;

    root.querySelectorAll("script, foreignObject, iframe, object, embed").forEach((node) => node.remove());
    [root, ...root.querySelectorAll("*")].forEach((node) => {
      Array.from(node.attributes || []).forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim();
        const safeDataImage = /^data:image\/(?:png|jpe?g|gif|webp|bmp);base64,/i.test(value);
        if (name.startsWith("on")) node.removeAttribute(attribute.name);
        else if (["href", "xlink:href"].includes(name) && value && !value.startsWith("#") && !safeDataImage) node.removeAttribute(attribute.name);
        else if ((name === "style" || /url\s*\(/i.test(value)) && /url\s*\(\s*(?!#|data:image\/(?:png|jpe?g|gif|webp|bmp);base64,)/i.test(value)) node.removeAttribute(attribute.name);
      });
    });
    root.querySelectorAll("style").forEach((node) => {
      const css = node.textContent || "";
      if (/@import|expression\s*\(|javascript\s*:/i.test(css) || /url\s*\(\s*(?!#|data:image\/(?:png|jpe?g|gif|webp|bmp);base64,)/i.test(css)) {
        node.remove();
      }
    });

    const viewBox = (root.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
    if ((!root.getAttribute("width") || !root.getAttribute("height")) && viewBox.length === 4 && viewBox[2] > 0 && viewBox[3] > 0) {
      if (!root.getAttribute("width")) root.setAttribute("width", String(viewBox[2]));
      if (!root.getAttribute("height")) root.setAttribute("height", String(viewBox[3]));
    }
    return new XMLSerializer().serializeToString(root);
  }

  static imageElement(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const timeout = setTimeout(() => reject(new Error("Image load timed out")), DocxMediaUtils.IMAGE_TIMEOUT_MS);
      const finish = (error) => {
        clearTimeout(timeout);
        image.onload = null;
        image.onerror = null;
        if (error) reject(error);
        else resolve(image);
      };
      image.onload = () => finish();
      image.onerror = () => finish(new Error("Image could not be loaded (network or CORS restriction)"));
      try {
        const url = new URL(source, DocxMediaUtils.baseUrl());
        const current = new URL(DocxMediaUtils.baseUrl());
        if (["http:", "https:"].includes(url.protocol) && url.origin !== current.origin) image.crossOrigin = "anonymous";
      } catch {
        // Data URLs do not need CORS; invalid values fail through the image loader.
      }
      image.src = source;
      if (image.complete && image.naturalWidth > 0) setTimeout(() => finish(), 0);
    });
  }

  static async loadRemoteImage(source) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeout = setTimeout(() => controller?.abort(), DocxMediaUtils.IMAGE_TIMEOUT_MS);
    try {
      if (typeof fetch !== "function") throw new Error("Fetch is unavailable for remote images");
      const response = await fetch(source, {
        mode: "cors",
        credentials: "omit",
        ...(controller ? { signal: controller.signal } : {}),
      });
      if (!response.ok) throw new Error(`Image request failed with HTTP ${response.status}`);
      const blob = await response.blob();
      if (blob.size > DocxMediaUtils.MAX_REMOTE_BYTES) throw new Error("Image exceeds the 20 MB export limit");
      const contentType = blob.type || response.headers.get("content-type") || "";
      if (contentType && !/^image\//i.test(contentType)) throw new Error(`URL did not return an image (${contentType})`);
      if (/svg\+xml/i.test(contentType) || /\.svg(?:$|[?#])/i.test(source)) {
        const sanitized = DocxMediaUtils.sanitizeSvg(await blob.text());
        if (!sanitized) throw new Error("Remote SVG is invalid or could not be sanitized");
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sanitized)}`;
      }
      return URL.createObjectURL(blob);
    } finally {
      clearTimeout(timeout);
    }
  }

  static async rasterizeImage(source) {
    const normalized = DocxMediaUtils.normalizeImageSource(source);
    if (!normalized) throw new Error("Unsupported or unsafe image source");
    let loadSource = normalized;
    let temporaryUrl = false;

    if (/^https?:/i.test(normalized)) {
      loadSource = await DocxMediaUtils.loadRemoteImage(normalized);
      temporaryUrl = /^blob:/i.test(loadSource);
    } else if (/^data:image\/svg\+xml/i.test(normalized)) {
      const comma = normalized.indexOf(",");
      const metadata = normalized.slice(0, comma);
      const payload = normalized.slice(comma + 1);
      let sourceText;
      if (/;base64/i.test(metadata)) {
        const binary = atob(payload);
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        sourceText = new TextDecoder().decode(bytes);
      } else {
        sourceText = decodeURIComponent(payload);
      }
      const sanitized = DocxMediaUtils.sanitizeSvg(sourceText);
      if (!sanitized) throw new Error("Data SVG is invalid or could not be sanitized");
      loadSource = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sanitized)}`;
    }

    try {
      const image = await DocxMediaUtils.imageElement(loadSource);
      const naturalWidth = image.naturalWidth || image.width;
      const naturalHeight = image.naturalHeight || image.height;
      if (!naturalWidth || !naturalHeight) throw new Error("Image has no intrinsic dimensions");

      const scale = Math.min(
        1,
        DocxMediaUtils.MAX_RASTER_DIMENSION / naturalWidth,
        DocxMediaUtils.MAX_RASTER_DIMENSION / naturalHeight,
      );
      const width = Math.max(1, Math.round(naturalWidth * scale));
      const height = Math.max(1, Math.round(naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable for image conversion");
      context.drawImage(image, 0, 0, width, height);
      return { dataUrl: canvas.toDataURL("image/png"), width, height };
    } finally {
      if (temporaryUrl) URL.revokeObjectURL(loadSource);
    }
  }

  static async rasterizeSvg(markup) {
    const sanitized = DocxMediaUtils.sanitizeSvg(markup);
    if (!sanitized) throw new Error("Inline SVG is invalid or could not be sanitized");
    const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sanitized)}`;
    return DocxMediaUtils.rasterizeImage(source);
  }

  static fitDimensions(image, requestedWidth, requestedHeight, maxWidth = 624, maxHeight = 624) {
    const naturalWidth = Math.max(1, Number(image?.width) || 1);
    const naturalHeight = Math.max(1, Number(image?.height) || 1);
    const parseDimension = (value) => {
      const match = String(value ?? "").trim().match(/^(\d+(?:\.\d+)?)(?:px)?$/i);
      return match ? Number(match[1]) : Number.NaN;
    };
    const width = parseDimension(requestedWidth);
    const height = parseDimension(requestedHeight);
    let targetWidth = Number.isFinite(width) && width > 0 ? width : naturalWidth;
    let targetHeight = Number.isFinite(height) && height > 0 ? height : naturalHeight;
    if (Number.isFinite(width) && width > 0 && !(Number.isFinite(height) && height > 0)) {
      targetHeight = (targetWidth * naturalHeight) / naturalWidth;
    } else if (Number.isFinite(height) && height > 0 && !(Number.isFinite(width) && width > 0)) {
      targetWidth = (targetHeight * naturalWidth) / naturalHeight;
    }
    const scale = Math.min(1, maxWidth / targetWidth, maxHeight / targetHeight);
    return {
      width: Math.max(1, Math.round(targetWidth * scale)),
      height: Math.max(1, Math.round(targetHeight * scale)),
    };
  }

  static extractCalloutBody(rawHtml) {
    const html = String(rawHtml ?? "");
    const opening = /<div\b([^>]*)>/gi;
    let match;
    while ((match = opening.exec(html)) !== null) {
      if (!/\bclass\s*=\s*(["'])[^"']*\bmd-callout-body\b[^"']*\1/i.test(match[1])) continue;
      const contentStart = opening.lastIndex;
      const tags = /<\/?div\b[^>]*>/gi;
      tags.lastIndex = contentStart;
      let depth = 1;
      let tag;
      while ((tag = tags.exec(html)) !== null) {
        if (/^<\//.test(tag[0])) depth -= 1;
        else if (!/\/\s*>$/.test(tag[0])) depth += 1;
        if (depth === 0) return html.slice(contentStart, tag.index);
      }
      return html.slice(contentStart);
    }
    return "";
  }
}
