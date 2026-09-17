# ∑ Math (LaTeX)

Render beautiful mathematical equations with MathJax.

[← Back to README](../README.md)

---

## Inline Math

Wrap in single dollar signs:

```markdown
The energy is $E = mc^2$.
```

Result: The energy is _E = mc²_.

---

## Display Math

Wrap in double dollar signs on their own lines:

$$
\int_{-\infty}^{\infty} e^{-x^2}\, dx = \sqrt{\pi}
$$

---

## Common Examples

### Euler's Formula

$$e^{i\pi} + 1 = 0$$

### Matrices

$$
\begin{pmatrix} a & b \\ c & d \end{pmatrix}
\begin{pmatrix} x \\ y \end{pmatrix}
=
\begin{pmatrix} ax + by \\ cx + dy \end{pmatrix}
$$

### Summations

$$\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$$

### Greek Letters

$\alpha, \beta, \gamma, \delta, \epsilon, \theta, \lambda, \mu, \pi, \sigma, \omega$

---

## Protection

Math is **protected from Markdown parsing** via `Preprocessors.extractMath()`.
This means:

- `$` inside code blocks stays literal (`$HOME`, `${VAR}`)
- Underscores inside math don't trigger emphasis
- `\\` for line breaks works correctly

---

## Print / Word Export

Math is rendered as **MathJax SVG** and embedded directly in Word/PDF
exports as images. See [export.md](export.md).

[← Back to README](../README.md)
