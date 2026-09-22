# 📚 Library

A lightweight, local-first document library. Create, open, and delete
multiple Markdown documents without leaving the editor — everything
stored in your browser.

[← Back to README](../README.md)

---

## Overview

The Library replaces the single-document save model with a small
**flat list of documents**. There is no hierarchy, no folders, no
graphs. Just a dropdown menu of everything you've written.

**All data is stored locally** in `localStorage` — nothing is sent to
a server, and nothing leaves your browser.

---

## Opening the Library

Click the **📚 book icon** in the top toolbar. A dropdown menu opens
below it, listing every document, sorted by last-modified time
(most recent first).

```
┌──────────────────────────────────────┐
│ Toolbar          [📚] [Export] [🌙] │
└──────────────────────┬───────────────┘
                       │
                       ▼
              ┌─────────────────────┐
              │ Documents        ＋ │
              ├─────────────────────┤
              │ ● My First Doc   ✕ │
              │   just now          │
              ├─────────────────────┤
              │   Notes          ✕ │
              │   2h ago            │
              └─────────────────────┘
```

---

## Actions

### Create a new document

Click the **＋** button in the menu header.

- A new empty document is created.
- It becomes the active document immediately.
- The editor switches to the new (empty) document.
- The menu closes.

If the current document had unsaved content, it is flushed to the
Library **before** creating the new one.

### Open a document

Click on any document in the list.

- The current document's content is saved.
- The editor loads the selected document.
- The preview re-renders.
- The menu closes.

### Delete a document

Hover over a document in the list. A **✕** button appears.

Click it and confirm the prompt.

- The document is removed from the Library.
- If it was the **active** document:
  - The most recently modified remaining document is opened.
- If it was the **last** document:
  - A new document is created with the **default welcome content**.
  - This guarantees the Library is never empty.

> 💡 **Why seed a fresh document?** So you never land on a blank
> screen after deleting your last note. The default content gives you
> a starting point with examples of every feature.

### Close the menu

- Click anywhere outside the menu.
- Press **Esc**.

---

## Autosave

Every keystroke updates the active document in the Library after a
**400 ms debounce**. You never need to press a save button.

The save indicator in the status bar shows the current state:

| Icon | Meaning                                   |
| :--: | ----------------------------------------- |
|  ⏳  | Saving — debounce in progress             |
|  💾  | Saved — write to `localStorage` succeeded |
|  ⚠️  | Error — quota exceeded or write failed    |

### Quota

`localStorage` gives each origin roughly **5 MB**. That's enough for:

- ~10,000 short documents, **or**
- ~500 documents with embedded base64 images, **or**
- ~50 large documents with many diagrams.

If you hit the quota, the indicator shows **⚠️ Error** and the write
silently fails. Delete old documents to free space, or export them
to `.md` and remove them from the Library.

---

## Auto-titling

New documents are titled automatically from the **first line** of
their content:

- If the first line starts with `#`, the leading `#` symbols are
  stripped.
- If the first line is empty, the document remains titled
  _Untitled_.
- Titles are truncated to 60 characters.

The title in the dropdown updates after the next save.

**Examples:**

| First line in editor | Title in dropdown |
| -------------------- | ----------------- |
| `# Project Plan`     | `Project Plan`    |
| `## Chapter 1`       | `Chapter 1`       |
| `Just some text`     | `Just some text`  |
| _(empty document)_   | `Untitled`        |

---

## Storage keys

The Library uses two `localStorage` keys:

| Key                       | Contents                          |
| ------------------------- | --------------------------------- |
| `md-editor:docs:v1`       | Array of all documents            |
| `md-editor:active-doc:v1` | ID of the currently open document |

Each document has the following shape:

```json
{
  "id": "d_ltxyz_ab12",
  "title": "Project Plan",
  "content": "# Project Plan\n\n...",
  "createdAt": 1730000000000,
  "updatedAt": 1730000042000
}
```

> ⚠️ **Do not edit these keys manually.** Changing the format may
> break the Library on the next load. To back up your documents,
> export each one to `.md`.

---

## Behavior on first run

When the editor opens for the first time:

1. The Library checks `localStorage` for existing documents.
2. If none exist, the current editor content (the default welcome
   document) is saved as the first document.
3. That document becomes the active document.

Thereafter, the Library always loads the **last active document**
from the previous session.

---

## Behavior after "Clear"

The **🗑 Clear** button in the status bar clears the **current
document's content** — it does **not** delete the document from the
Library. The document remains in the list, now empty.

To delete the document entirely, use the **✕** button in the Library
dropdown.

---

## Keyboard shortcuts

| Shortcut     | Action                                |
| ------------ | ------------------------------------- |
| `Ctrl` + `S` | Flush the current document to storage |
| `Esc`        | Close the Library dropdown            |

> **Note**: The Library saves automatically. `Ctrl+S` is only useful
> when you want to force an immediate flush before closing the tab.

---

## Limitations

The current version of the Library is intentionally minimal:

- **No folders or hierarchies** — the list is flat.
- **No search** — all documents are visible in the dropdown.
- **No renaming** — titles are auto-derived from content.
- **No manual reordering** — sorted by last-modified time only.
- **No cloud sync** — local `localStorage` only.
- **No import** — documents can be exported but not imported.

These limits keep the feature simple and fast. Future versions may
add folders, search, and sync without changing the current user
experience.

---

## Related

- [Export](export.md) — export a document to `.md`, `.docx`, `.pdf`
- [Architecture](architecture.md) — how the Library integrates with
  the render pipeline

[← Back to README](../README.md)
