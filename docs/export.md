# 📤 Export

Export your document to multiple formats with one click.

[← Back to README](../README.md)

---

## Supported Formats

| Format         | Extension | Preserves                                             |
| -------------- | --------- | ----------------------------------------------------- |
| **Word**       | `.docx`   | Formatting, tables, colors, diagrams (as images), RTL |
| **PDF**        | `.pdf`    | Print-perfect layout, light theme forced              |
| **PowerPoint** | `.pptx`   | Headings as slides, images                            |
| **Markdown**   | `.md`     | Raw source                                            |
| **Plain Text** | `.txt`    | Stripped text                                         |

---

## How to Export

Click **Export** in the top-right corner and choose a format.

The export runs asynchronously with a progress indicator. Large documents
with many diagrams may take a few seconds.

---

## Word Export Details

### What's preserved

- **Headings** → Word Heading 1-6 styles
- **Paragraphs** → Native Word paragraphs
- **Tables** → Native Word tables with header styling
- **Lists** → Bulleted/numbered lists (level-aware)
- **Task lists** → ☑ / ☐ symbols
- **Code blocks** → Monospace with syntax colors and macOS-style header
- **Images** → Markdown and HTML images are embedded as PNG when fetch/conversion succeeds; otherwise a safe link/alt placeholder is used. SVG/vector and animated formats become static images.
- **Callouts** → Colored boxes with an accent bar; images and links in the body are preserved, but rich formatting is flattened
- **Tabs** → Static sequential sections in a framed table; a single-tab title is omitted
- **Footnotes** → Flattened reference and list text at the end (not native Word footnotes)
- **Blockquotes** → Indented with accent bar; complex nested blocks are lossy
- **HR** → Horizontal rule
- **Links** → Clickable hyperlinks
- **Math** → Editable native Word Math (OMML) for the supported LaTeX subset; unsupported commands stop the export with an error. See the [Word export support guide](word-export-support.md) for the full command and content matrix.
- **Mermaid** → Pre-rendered SVG → PNG embedded
- **Plotly** → PNG screenshot at high DPI
- **Video / audio / iframe** → Clickable source links; video posters may be embedded as PNG (playback is not preserved)

### RTL Support

- Headings, lists, tables all share the same edge
- Accent bars flip: left in LTR, right in RTL
- Callout backgrounds adapt
- Word's `w:bidi` used correctly (not buggy `w:jc="right"`)

### Not preserved

- Interactive Plotly charts (flattened to PNG)
- Runnable JavaScript (code source only)
- Video/audio playback and 3D model interaction (sources are exported as links; video posters may be static images)

---

## PDF Export

PDF export uses the browser's **print** engine:

- Theme forced to **light**
- Action buttons hidden
- All tab panels expanded sequentially
- Page breaks avoid splitting blocks

---

## PPTX Export

Each `## Heading 2` becomes a new slide. Content between headings becomes
the slide body.

Images (Mermaid, Plotly) are embedded as PNG.

---

## Vendor Libraries

The Word/PPTX exporters load vendor libraries on demand:

- `docx` → for Word
- `PptxGenJS` → for PowerPoint

If they fail to load, an error appears in the export status area.

Run `tools/download-vendors.sh` to fetch them.

---

## Tips

- **Diagrams render before export**: The exporter waits for Mermaid/Plotly
  to finish before generating the file.
- **Large documents**: Export runs in chunks to keep the UI responsive.
- **Encoding**: All exports use UTF-8.

[← Back to README](../README.md)
