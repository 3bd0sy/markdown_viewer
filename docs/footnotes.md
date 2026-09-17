# 🔗 Footnotes

Reference-style footnotes with proper numbering and back-links.

[← Back to README](../README.md)

---

## Syntax

This is a claim[^1] and another[^note].

[^1]: First footnote.

[^note]: Second footnote with **bold** and `code`.

---

## Result

Rendered in the preview as:

- A superscript link: <sup>**[1]**</sup> where the reference appears
- A horizontal separator at the end
- A numbered list with back-links (↩)

---

## Features

- ✅ Automatic **renumbering** regardless of definition order
- ✅ **Markdown inside footnotes** works (bold, italic, code, links)
- ✅ **Back-link** (↩) returns to the exact reference in the text
- ✅ Named or numeric keys — both work
- ✅ Export to Word: footnotes appear at the end as a numbered list

---

## Example with formatting

According to research[^study], this is true.

[^study]:
    See the [full paper](https://example.com) and the
    **methodology** section on page 42.

---

## Accessibility

- Each reference has `id="fnref-KEY"` — links to `#fn-KEY`
- Each footnote has `id="fn-KEY"` — links back to `#fnref-KEY`
- Screen readers announce the reference as a link

[← Back to README](../README.md)
