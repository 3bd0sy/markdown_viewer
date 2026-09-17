# 💻 Code Blocks

Syntax-highlighted code with optional in-browser execution.

[← Back to README](../README.md)

---

## Basic Syntax

```language
` ` `language

code here
```

Supported languages: **any** of the 190+ [highlight.js languages](https://github.com/highlightjs/highlight.js/blob/main/SUPPORTED_LANGUAGES.md).

---

## Highlighted Example

````markdown
```python
def fibonacci(n: int) -> list[int]:
    seq = [0, 1]
    while len(seq) < n:
        seq.append(seq[-1] + seq[-2])
    return seq[:n]
```
````

---

## Running JavaScript

Add the **Run** button to any JavaScript block. The code executes in a
sandboxed `<iframe>` with `allow-scripts` only — no DOM access, no cookies,
5-second timeout.

````markdown
```javascript
const fib = (n) => (n <= 1 ? n : fib(n - 1) + fib(n - 2));
console.log(Array.from({ length: 10 }, (_, i) => fib(i)));
```
````

### What's captured

- `console.log()`, `console.error()`, `console.warn()`
- The **return value** of the last expression
- Runtime errors with the error message
- **5-second timeout** — long-running code is killed

---

## Copy Button

Every code block has a **Copy** button that copies the raw source
(not the highlighted HTML).

---

## Theming

Code blocks follow the current theme:

| Theme | Background | Style               |
| ----- | ---------- | ------------------- |
| Light | `#ffffff`  | GitHub-style colors |
| Dark  | `#0d1117`  | GitHub Dark         |

The header bar shows **macOS traffic lights** (● ● ●) and the language name
as a tab.

---

## Print / PDF

When printing:

- Background forced to **white**
- Action buttons hidden
- Code text kept intact with proper wrapping

[← Back to README](../README.md)
