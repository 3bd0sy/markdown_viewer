/* ═══════════════════════════════════════════════
   default-document.js — Starter document shown on
   first load and after "Clear".
   ═══════════════════════════════════════════════ */

const DEFAULT_CONTENT = `# Welcome to the Editor ✨

## [F1] Flowchart
\`\`\`mermaid
flowchart TD
  A([Start]) --> B{Data valid?}
  B -- Yes --> C[Process Data]
  B -- No  --> D[Error Message]
  C --> E[(Database)]
  E --> F([Complete])
  D --> F
\`\`\`

## [F2] Task Lists
- [x] UI Design
- [x] Mermaid Support
- [ ] Test new features
- [ ] Release v7

## [F3] LaTeX Math
Euler's formula: $e^{i\\pi} + 1 = 0$

$$
\\int_{-\\infty}^{\\infty} e^{-x^2}\\, dx = \\sqrt{\\pi}
$$

## [F4] Run JavaScript
\`\`\`javascript
// Click Run to execute
const fib = n => n <= 1 ? n : fib(n - 1) + fib(n - 2);
const result = Array.from({ length: 8 }, (_, i) => fib(i));
console.log('Fibonacci:', result.join(', '));
result
\`\`\`

## [F5] Interactive Plotly Chart
\`\`\`plotly
{
  "data": [
    {"x":[1,2,3,4,5],"y":[10,15,13,17,12],"type":"scatter","name":"Series A","mode":"lines+markers"},
    {"x":[1,2,3,4,5],"y":[7,11,9,14,8],"type":"scatter","name":"Series B","mode":"lines+markers"}
  ],
  "layout":{"title":"Interactive Chart","paper_bgcolor":"transparent","plot_bgcolor":"transparent"}
}
\`\`\`

## [F6] OpenStreetMap
\`\`\`map
41.015, 28.979, 13
\`\`\`

## [F7] Footnotes
This text has a footnote[^1] and another[^note].

[^1]: First footnote text.
[^note]: Second footnote with **bold**.

## [F8] SOLID Principles
\`\`\`mermaid
mindmap
  root((SOLID))
    SRP
      Single Responsibility
      One reason to change
    OCP
      Open for Extension
      Closed for Modification
    LSP
      Substitutability
    ISP
      Small Interfaces
    DIP
      Depend on Abstractions
\`\`\`

## [F9] Comparison Table
| Language | Performance | Use Case   |
|----------|-------------|------------|
| Python   | Medium      | AI / Data  |
| Rust     | Very High   | Systems    |
| Go       | High        | Backend    |

## [F10] Python Code
\`\`\`python
def fibonacci(n: int) -> list[int]:
    seq = [0, 1]
    while len(seq) < n:
        seq.append(seq[-1] + seq[-2])
    return seq[:n]

print(fibonacci(10))
\`\`\`

> Drag an image or a .glb model onto the editor to insert it.

## [F11] Callouts
:::note
هذه ملاحظة جانبية للمساعدة.
:::

:::warning عنوان مخصص
تحذير يحتوي على قائمة:
- عنصر أول
- عنصر ثانٍ
:::

## [F12] Tabs
=== "JavaScript"
    \`\`\`js
    console.log("Hello");
    \`\`\`

=== "Python"
    \`\`\`python
    print("Hello")
    \`\`\`

`;
