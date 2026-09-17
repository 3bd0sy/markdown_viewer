# 📋 Tables & Lists

GitHub-flavored tables, nested lists, and task lists.

[← Back to README](../README.md)

---

## Tables

### Basic Table

```markdown
| Column 1 | Column 2 | Column 3 |
| -------- | -------- | -------- |
| A        | B        | C        |
| D        | E        | F        |
```

### With Alignment

| Left | Center | Right |
| :--- | :----: | ----: |
| A    |   B    |     C |
| D    |   E    |     F |

- `:---` → left
- `:---:` → center
- `---:` → right

---

## Lists

### Unordered

- Item 1
- Item 2
  - Nested 2.1
  - Nested 2.2
- Item 3

### Ordered

1. First
2. Second
   1. Nested
   2. Nested
3. Third

### Task Lists

- [x] Completed task
- [ ] Pending task
- [ ] Another pending task

---

## RTL Support

In RTL documents:

- **Bullets shift to the right** automatically
- **Numbers align right**
- **Nested lists indent from the right**
- **Checkboxes appear on the right**

This is handled via **logical CSS properties** (`padding-inline-start`)
— no `[dir="rtl"]` overrides needed.

---

## Word Export

- Tables become native Word tables with header styling
- Lists become Word bulleted/numbered lists (level-aware)
- Task lists use ☑ / ☐ symbols with color

[← Back to README](../README.md)
