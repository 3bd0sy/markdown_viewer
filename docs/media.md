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

Images inserted via Markdown syntax `![alt](url)` display inline. Supported:

- PNG, JPG, JPEG
- SVG
- WebP
- GIF

[← Back to README](../README.md)
