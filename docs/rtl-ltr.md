# 🌍 RTL / LTR Support

Bidirectional text support for Arabic, Hebrew, Persian, and mixed content.

[← Back to README](../README.md)

---

## How It Works

The editor uses a **two-layer** system:

### Layer 1 — Character level (runs)

Every `TextRun` is checked for RTL characters. If found, `w:rtl` is set on
the run. This handles **mixed content inside a single line**:

```

اِنْتَهَى this is English وَبَدَأَ هذا مرة أخرى.

```

Each fragment is displayed with the correct shaping and order.

### Layer 2 — Paragraph level (blocks)

Each **block** (heading, paragraph, list, table, blockquote, code) decides
its direction via `DirectionResolver`, based on:

1. **Explicit** directive: `<!-- dir: rtl -->` anywhere
2. **User mode**: RTL / LTR / Auto
3. **Auto-detection**: strong-character ratio

---

## Direction Policies

| Block        | Policy    | Behavior                                 |
| ------------ | --------- | ---------------------------------------- |
| `heading`    | baseline  | Always follows the document              |
| `paragraph`  | deviating | May flip if 85%+ one-sided and ≥25 chars |
| `list`       | cohesive  | One decision for the whole list          |
| `table`      | cohesive  | One decision for the whole table         |
| `blockquote` | cohesive  | One decision per quote                   |
| `code`       | ltr       | Always left-to-right                     |

---

## Logical CSS Properties

The preview uses **logical properties** so RTL works automatically:

```css
#preview ul,
#preview ol {
  padding-inline-start: 20px; /* ← left in LTR, right in RTL */
}

#preview blockquote {
  border-inline-start: 3px solid; /* ← side follows direction */
}
```

**No `[dir="rtl"]` overrides needed.**

---

## Mixed Documents

You can have Arabic and English blocks in the same document, and each
block decides independently:

هذا نص عربي يجب أن يبدأ من اليمين.

This English paragraph starts from the left.

// Code is always LTR
const x = 42;

---

## Word Export

`DirectionResolver` powers the Word export too:

- Headings, lists, tables all share the same edge
- RTL mode picks physical right-edge borders
- Word's `w:bidi` is used instead of `w:jc="right"` (which is buggy)

---

## Manual Override

Add a directive anywhere in the document:

`` `markdown

<!-- dir: rtl -->

` ``

From that point on, the document is RTL. Use `<!-- dir: ltr -->` to switch
back.

---

## Auto-Detection Thresholds

The document is considered RTL if **25%+** of strong characters are RTL.
This is low on purpose — technical Arabic contains a lot of Latin.

You can tune it in `direction-resolver.js`:

static BASELINE_SHARE = 0.25;
static FLIP_SHARE = 0.85;

[← Back to README](../README.md)
