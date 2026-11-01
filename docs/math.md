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

## Word Export

Word export converts the supported LaTeX subset to editable native Word Math
(OMML), including fractions, binomial coefficients, roots, scripts, common
operators (including `\\mid`, `\\nmid`, `\\top`, `\\bot`, closed contour
integrals, and common relation/arrow symbols), and matrix environments. This is
a supported subset rather than a complete LaTeX engine: unsupported commands
stop the export with a diagnostic instead of being silently dropped. The browser
preview and PDF path continue to use MathJax. See the [Word export support
guide](word-export-support.md) for the full command list and known limitations.

[← Back to README](../README.md)
