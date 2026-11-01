# 🎬 Media (Video & 3D)

Embed YouTube videos and 3D models.

[← Back to README](../README.md)

---

## Video

````markdown
```video
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```
````

Supported sources:

- YouTube (`youtube.com/watch?v=...`, `youtu.be/...`)
- Vimeo (`vimeo.com/...`)
- Direct MP4 / WebM URLs

---

## 3D Models

```model3d
https://modelviewer.dev/shared-assets/models/Astronaut.glb
```

Supported formats:

- `.glb` (recommended)
- `.gltf`

The `<model-viewer>` element is **lazy-loaded** — it's only fetched when the
first 3D block appears in the document.

### Features

- 🖱️ Drag to rotate
- 🔍 Scroll to zoom
- 📱 AR-ready on supported devices
- 🌗 Environment lighting adapts to theme

---

## Drag & Drop

You can also **drag an image**, **`.glb`**, or **`.gltf`** file directly
onto the editor, and the correct block will be inserted automatically.

---

## Supported Image Types

Images inserted via Markdown syntax `![alt](url)` display inline in the preview. Supported:

- PNG, JPG, JPEG
- SVG
- WebP
- GIF

### Word Export

Markdown images and HTML `<img>` elements are embedded in `.docx` as PNG images when the source can be fetched and rasterized. JPEG, GIF, WebP, AVIF, SVG, and image data URIs are converted to static PNG when the browser can decode them; GIF animation and SVG editability are not retained. Images inside supported tables, grids, tabs, and callouts follow the same path. HTML video/audio/iframe sources become clickable links, and a video poster is embedded when possible.

Remote image servers must allow browser CORS requests. If a fetch is blocked, the document keeps the available alt text and a safe source link and logs a warning; the export does not bypass CORS. Relative URLs resolve against the editor page. Local `file://` URLs may be blocked by browser security policy.

[← Back to README](../README.md)
