# 🎨 Callouts & Admonitions

Highlight important information with colored, icon-labeled boxes.

[← Back to README](../README.md)

---

## Syntax

```

:::type optional-custom-title
Your content here.
Supports **Markdown**, `code`, lists, and code blocks.
:::

```

---

## Supported Types

| Type      | Icon | Color  | Use for             |
| --------- | :--: | :----: | ------------------- |
| `note`    |  ℹ️  |  Blue  | General information |
| `info`    |  📘  |  Blue  | Technical notes     |
| `tip`     |  💡  | Green  | Helpful suggestions |
| `success` |  ✅  | Green  | Positive outcomes   |
| `warning` |  ⚠️  | Yellow | Cautions            |
| `danger`  |  🚨  |  Red   | Critical warnings   |
| `error`   |  ⛔  |  Red   | Errors, failures    |
| `quote`   |  💬  |  Gray  | Citations           |

---

## Examples

### Basic note

```markdown
:::note
This is a **helpful** note with `inline code`.
:::
```

### Custom title

```markdown
:::warning Title goes here
Content with a custom heading.
:::
```

### With a list

```markdown
:::tip
Steps:

- First do this
- Then do that
  :::
```

### With a code block

````markdown
:::danger
Do **not** run this:

```bash
rm -rf / --no-preserve-root
```

:::
````

---

## Word Export

Callouts export as colored boxes with a left (or right, in RTL) accent bar.
See [export.md](export.md).

[← Back to README](../README.md)
