<div align="center">

# ✦ Markdown Editor

**A feature-rich, browser-based Markdown editor with live preview,
RTL/LTR support, diagrams, charts, math, and export to Word / PDF / PPTX.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-8.0.0-green.svg)](CHANGELOG.md)
[![AI Prompt](https://img.shields.io/badge/AI_Prompt-included-purple.svg)](prompt.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[English](README.md) · [العربية](README.ar.md)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Live Demo](#-live-demo)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**Markdown Editor** is a self-contained, zero-backend editor that turns plain
Markdown into rich, interactive documents — right in the browser. It supports
**diagrams** (Mermaid), **charts** (Plotly), **math** (LaTeX), **interactive
maps**, **runnable JavaScript**, **3D models**, and **professional export** to
Word, PDF, and PowerPoint.

Built with an **Arabic-first** mindset: full RTL support at every level — from
paragraph alignment to list indentation to Word export.

### ✨ Why this editor?

| Feature                                   | This editor | Typical editors |
| ----------------------------------------- | :---------: | :-------------: |
| Live preview with DOM diffing             |     ✅      |       ⚠️        |
| Native RTL/LTR in one document            |     ✅      |       ❌        |
| Mermaid + Plotly + LaTeX + Maps           |     ✅      |       ⚠️        |
| Run JavaScript in a sandbox               |     ✅      |       ❌        |
| Export to `.docx` with RTL                |     ✅      |       ❌        |
| Callouts, tabs, footnotes                 |     ✅      |       ⚠️        |
| Grid layout container (`:::grid`)         |     ✅      |       ❌        |
| Local document library                    |     ✅      |       ⚠️        |
| No build step, no dependencies to install |     ✅      |       ❌        |

---

## 🎁 Features

Click any feature to open its full documentation.

### ✍️ Authoring

| Feature            | Description                                                          |            Docs            |
| ------------------ | -------------------------------------------------------------------- | :------------------------: |
| **Callouts**       | Note, tip, warning, danger, info, success, error, quote boxes        |   [📖](docs/callouts.md)   |
| **Tabs**           | MkDocs-style tabbed content for multi-language examples              |     [📖](docs/tabs.md)     |
| **Code Blocks**    | Syntax highlighting for 190+ languages, optional execution           | [📖](docs/code-blocks.md)  |
| **Math**           | LaTeX via MathJax — inline `$x$` and display `$$…$$`                 |     [📖](docs/math.md)     |
| **Footnotes**      | `[^1]` references with proper numbering and back-links               |  [📖](docs/footnotes.md)   |
| **Tables & Lists** | GitHub-style tables, nested lists, task lists                        | [📖](docs/tables-lists.md) |
| **RTL / LTR**      | Automatic direction per block, mixed documents supported             |   [📖](docs/rtl-ltr.md)    |
| **Grid Layout**    | CSS Grid containers: columns, spans, fractional widths, nested grids |     [📖](docs/grid.md)     |

### 📊 Visualizations

| Feature              | Description                                                                                 |          Docs          |
| -------------------- | ------------------------------------------------------------------------------------------- | :--------------------: |
| **Mermaid Diagrams** | Flowcharts, sequence, class, state, ER, Gantt, mindmap, timeline, git, and more (22+ types) | [📖](docs/diagrams.md) |
| **Plotly Charts**    | Interactive line, bar, scatter, pie, 3D charts                                              |  [📖](docs/charts.md)  |
| **Maps**             | OpenStreetMap embeds with custom coordinates                                                |   [📖](docs/maps.md)   |
| **Media**            | YouTube embeds, 3D GLB/GLTF models via `<model-viewer>`                                     |  [📖](docs/media.md)   |

### 🚀 Productivity

| Feature                | Description                                                  |                   Docs                   |
| ---------------------- | ------------------------------------------------------------ | :--------------------------------------: |
| **Export**             | Word (.docx), PDF, PowerPoint (.pptx), Markdown, Plain Text  |           [📖](docs/export.md)           |
| **Keyboard Shortcuts** | Full shortcut map for power users                            |         [📖](docs/shortcuts.md)          |
| **Autosave**           | Saves to `localStorage` automatically                        |   [📖](docs/architecture.md#autosave)    |
| **Scroll Sync**        | Synchronize editor and preview scrolling                     |  [📖](docs/architecture.md#scroll-sync)  |
| **Library**            | Local document library with dropdown, autosave, seed content |          [📖](docs/library.md)           |
| **AI Prompt**          | Ready-made prompt to generate feature-rich Markdown with AI  |             [📖](prompt.md)              |
| **Fullscreen Viewer**  | Zoom, pan, and save diagrams as PNG/SVG                      | [📖](docs/diagrams.md#fullscreen-viewer) |

---

## 🚀 Quick Start

### Option 1 — Open directly (no build)

```bash
git clone https://github.com/your-username/markdown-editor.git
cd markdown-editor
# Open index.html in your browser
```

### Option 2 — Local server (recommended)

```bash
# Python 3
python3 -m http.server 8080

# Node.js
npx serve .

# PHP
php -S localhost:8080
```

Then visit **http://localhost:8080**.

### Optional: Download vendor libraries

The project ships without heavy vendor files (MathJax, Mermaid, Plotly,
docx, pptxgenjs). To download them all:

```bash
chmod +x tools/download-vendors.sh
./tools/download-vendors.sh
```

---

## 🖥️ Live Demo

> 🎬 **[Try it live →](https://your-username.github.io/markdown-editor/)**

---

## 🛠️ Tech Stack

| Layer               | Technology                                         |
| ------------------- | -------------------------------------------------- |
| Markdown parsing    | [marked](https://marked.js.org/)                   |
| Syntax highlighting | [highlight.js](https://highlightjs.org/)           |
| Diagrams            | [Mermaid](https://mermaid.js.org/)                 |
| Charts              | [Plotly.js](https://plotly.com/javascript/)        |
| Math                | [MathJax](https://www.mathjax.org/)                |
| Word export         | [docx](https://docx.js.org/)                       |
| PPTX export         | [PptxGenJS](https://gitbrent.github.io/PptxGenJS/) |
| 3D models           | [<model-viewer>](https://modelviewer.dev/)         |
| Architecture        | Vanilla ES2020+ — no framework, no build           |

---

## 📂 Project Structure

```
markdown-editor/
├── index.html
├── README.md
├── docs/
├── tools/
│   └── download-vendors.sh
└── assets/
    ├── css/
    ├── vendor/
    └── js/
        ├── core/
        ├── i18n/
        ├── content/
        ├── services/
        ├── parser/
        │   ├── blocks/
        │   └── preprocessors.js
        ├── render/
        ├── editor/
        ├── viewer/
        ├── export/
        └── app.js
```

Full architecture → [docs/architecture.md](docs/architecture.md)

---

## 📚 Documentation

Complete guides for every feature:

### Authoring

- [Callouts & Admonitions](docs/callouts.md) — 8 types with custom titles
- [Tabs](docs/tabs.md) — MkDocs-style tabbed content
- [Code Blocks](docs/code-blocks.md) — Highlighting, line numbers, running JS
- [Math (LaTeX)](docs/math.md) — Inline and display equations
- [Footnotes](docs/footnotes.md) — References with back-links
- [Tables & Lists](docs/tables-lists.md) — Nested, task lists, alignment
- [RTL / LTR](docs/rtl-ltr.md) — Direction handling

### Layout

- [Grid Layout](docs/grid.md) — Columns, spans, fractional widths, nested grids

### Visualizations

- [Mermaid Diagrams](docs/diagrams.md) — All 22+ diagram types with examples
- [Plotly Charts](docs/charts.md) — Interactive data visualization
- [Maps](docs/maps.md) — OpenStreetMap embeds
- [Media](docs/media.md) — Video, 3D models

### Productivity

- [Library](docs/library.md) — Local document storage with dropdown and autosave
- [Export](docs/export.md) — Word, PDF, PPTX, Markdown, Text
- [Keyboard Shortcuts](docs/shortcuts.md) — Complete shortcut reference
- [Architecture](docs/architecture.md) — How the editor works internally
- [**AI Prompt**](docs/prompt.md) — Ready-to-use prompt for generating rich Markdown

---

### Adding a new block type

See [docs/architecture.md#adding-a-block](docs/architecture.md#adding-a-block).

### Adding a language

See [docs/architecture.md#adding-a-language](docs/architecture.md#adding-a-language).

---

---

## 🤖 AI Prompt

Building content from scratch can be slow. This project ships with a
**ready-to-use prompt** designed for any LLM (Claude, GPT-4, Gemini) that
generates **feature-rich Markdown** using every capability the editor
supports — diagrams, callouts, tabs, grids, math, code, and more.

### How to use

1. Open [`prompt.md`](docs/prompt.md).
2. Copy the entire prompt.
3. Replace `[المحتوى/العنوان المطلوب]` with your topic.
4. Send it to your favorite LLM.
5. Paste the result into the editor.

### What you get

The prompt instructs the model to produce documents that include:

- **Structured sections** with proper heading hierarchy
- **Mermaid diagrams** — flowchart, sequence, class, ER, gantt, mindmap
- **Callouts** — note, tip, warning, danger, success, info, quote
- **Tabs** — multi-language code comparisons
- **Grid layouts** — KPI cards, chart+table side-by-side, nested grids
- **Math** — LaTeX equations when relevant
- **Code blocks** — 190+ languages with syntax highlighting
- **Tables, lists, footnotes** — with proper alignment and structure

### Example

```text
Topic: Introduction to Kubernetes for Developers

→ Produces ~600 lines of Markdown
→ 5 Mermaid diagrams (flowchart, sequence, state, gantt, mindmap)
→ 4 callouts (note, warning, tip, success)
→ 2 tab groups (YAML vs JSON, kubectl vs helm)
→ 1 grid layout (3-column KPI cards)
→ 8 code blocks (bash, yaml, go, dockerfile)
→ 3 tables (comparison, spec, decision matrix)
```

> 💡 **Tip**: The prompt respects the topic's language. Write your topic in
> Arabic and get Arabic content; write in English and get English content.

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE).

---

## 🙏 Acknowledgments

- [marked](https://github.com/markedjs/marked) — Markdown parser
- [highlight.js](https://github.com/highlightjs/highlight.js) — Syntax highlighter
- [Mermaid](https://github.com/mermaid-js/mermaid) — Diagram engine
- [Plotly.js](https://github.com/plotly/plotly.js) — Charts
- [MathJax](https://github.com/mathjax/MathJax) — Math rendering
- [docx](https://github.com/dolanmiu/docx) — Word generation
- [PptxGenJS](https://gitbrent.github.io/PptxGenJS/) — PowerPoint generation
- [<model-viewer>](https://modelviewer.dev/) — 3D model viewer

---

<div align="center">

**Made with ❤️ for the Arabic developer community**

⭐ If this project helped you, please consider giving it a star!

</div>
