# 🗂️ Tabs

Show the same content in multiple formats — perfect for multi-language
code samples, before/after comparisons, or alternative configurations.

[← Back to README](../README.md)

---

## Syntax

Indent each tab's content with **4 spaces** or **1 tab**:

```

=== "Tab Title 1"
Content of tab 1
Can span multiple lines

=== "Tab Title 2"
Content of tab 2

```

---

## Example: Multi-language code

```markdown
=== "JavaScript"
`js
    console.log("Hello");
    `

=== "Python"
`python
    print("Hello")
    `

=== "Rust"
`rust
    println!("Hello");
    `
```

---

## Features

- ✅ Renders as a **macOS-style window** with traffic-light dots
- ✅ Active tab is highlighted with a subtle pill background
- ✅ Keyboard navigation: **← / →** to switch
- ✅ State persists across re-renders (powered by `data-key`)
- ✅ Prints all tabs sequentially in PDF/Word
- ✅ Full RTL support inside tab panels

---

## Accessibility

- Uses `role="tablist"` / `role="tab"` / `role="tabpanel"`
- `aria-selected` reflects active state
- Non-active panels have the `hidden` attribute

---

## Tips

- **Nest callouts inside tabs**: works out of the box.
- **Nest tabs inside tabs**: not supported (Mermaid-style limitation).
- **Many tabs**: the nav bar scrolls horizontally with hidden scrollbar.

[← Back to README](../README.md)
