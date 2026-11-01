# Word Export Support Matrix

This guide describes the current `.docx` export behavior. It documents a practical LaTeX-to-OMML subset, not complete MathJax or TeX compatibility. A command not listed here either has a clearly stated approximation or fails explicitly so the export does not silently produce a wrong equation.

**Output terms:** **Native Word** means editable Word structure or OMML; **Image** means a static embedded image; **Text fallback** means content survives without its original structure or behavior; **Limited** means some formatting or layout is approximated.

## Mathematics

The editor preview and PDF use MathJax. Word export uses the parser in `assets/js/export/word/docx-math-parser.js` and converts supported equations to native Office Math (OMML).

### Structures and commands

| LaTeX | Word output | Notes |
| --- | --- | --- |
| `$…$`, `$$…$$`, `\(…\)`, `\[…\]` | Native OMML in a paragraph | Display delimiters do not create a separate centered display block. |
| `{…}`; `(…)`; `[…]` | Grouping and growing delimiters | Plain braces group and are not printed. Use `\{`, `\}` for literal brace glyphs. `\left`, `\right`, `\middle` and sizing modifiers do not scale delimiters. |
| `x_i`, `x^2`, `x_{i}^{2}` | Native subscript / superscript | Brace both script values for predictable combined scripts. |
| `\frac`, `\dfrac`, `\tfrac` | Native fraction | Braced or single-token arguments work; `\tfrac12` means 1 over 2. |
| `\binom`, `\tbinom`, `\dbinom` | Native two-row matrix in round delimiters | All aliases currently have the same appearance. |
| `\sqrt{x}`, `\sqrt[n]{x}` | Native radical, optional degree | |
| `\underbrace{x+y}_{n}`, `\overbrace{x+y}^{n}` | Native OMML group character | Lower/upper annotation is supported through ordinary scripts. |
| `\underline{x}`, `\overline{x}`, `\bar{x}` | Native OMML bar/accent | `\bar` and `\overline` currently use the same over-accent. |
| `\vec`, `\overrightarrow`, `\overleftarrow`, `\hat`, `\widehat`, `\tilde`, `\widetilde`, `\dot`, `\ddot`, `\dddot`, `\acute`, `\grave`, `\breve`, `\check`, `\mathring` | Native OMML accent | Combining-mark glyph appearance depends on Word's math font. |
| `\overset{a}{b}`, `\stackrel{a}{b}`, `\underset{a}{b}` | Native upper/lower limit structure | `\stackrel` is represented as an upper annotation. |
| `\boxed{x}`, `\phantom{x}` | Native OMML border box / phantom | These use generic OMML components supplied to the bundled docx writer. |
| `\text{…}`, `\operatorname{…}` | Plain text inside the equation | Text and whitespace are retained; rich formatting and nested brace parsing are not supported. |
| `\textbf`, `\textit`, `\textnormal`, `\textrm`, `\textsf`, `\texttt` | Plain text inside the equation | Group text, including spaces, is retained; the requested font style is not. |
| `\mathbb{N}`, `\mathbb{Z}`, `\mathbb{Q}`, `\mathbb{R}`, `\mathbb{C}`, `\mathbb{P}`, `\mathbb{H}` | Unicode blackboard-bold glyph | Other single-letter arguments fall back to the ordinary glyph. |
| `\sum`, `\prod`, `\coprod`, `\int`, `\iint`, `\iiint`, `\oint`, `\oiint`, `\oiiint` | Native OMML n-ary operator | Sub/superscript bounds and bounds without a body are supported. |
| `\bigcup`, `\bigcap`, `\bigvee`, `\bigwedge`, `\bigoplus`, `\bigotimes`, `\bigodot`, `\biguplus`, `\bigsqcup` | Native OMML n-ary operator | Also supports limits and operands. |
| `\begin{matrix}`, `pmatrix`, `bmatrix`, `Bmatrix`, `vmatrix`, `Vmatrix`, `cases` … `\end{…}` | Native OMML matrix | Rows use `\\`; columns use `&`. `cases` is approximate: braces appear on both sides. |
| `\pmod{n}` | Modulus in round delimiters | `\bmod` and `\mod` become a spaced “mod” text run. |
| `\not=`, `\not<`, `\not>`, `\not\in`, `\not\ni`, `\not\mid`, `\not\parallel`, `\not\equiv`, `\not\sim`, `\not\approx`, `\not\subset`, `\not\subseteq`, `\not\supset`, `\not\supseteq`, `\not\lesssim`, `\not\gtrsim` | Negated relation glyph | Other `\not` forms fail explicitly. |
| `\xrightarrow`, `\xleftarrow`, `\xleftrightarrow`, `\xRightarrow`, `\xLeftarrow`, `\xLeftrightarrow`, `\xhookrightarrow`, `\xhookleftarrow`, `\xtwoheadrightarrow`, `\xmapsto` | Native extensible arrow | Upper label required; optional lower label uses `[…]`. |

### Supported symbol-command catalog

Every name below is present in `DocxMathParser.COMMANDS` and tested against the guide. Use the leading backslash in LaTeX. Structural commands are listed in the previous table.

- **Greek lowercase:** `alpha`, `beta`, `gamma`, `delta`, `epsilon`, `varepsilon`, `zeta`, `eta`, `theta`, `vartheta`, `iota`, `kappa`, `varkappa`, `lambda`, `mu`, `nu`, `xi`, `omicron`, `pi`, `varpi`, `rho`, `varrho`, `sigma`, `varsigma`, `tau`, `upsilon`, `phi`, `varphi`, `chi`, `psi`, `omega`.
- **Greek uppercase:** `Gamma`, `Delta`, `Theta`, `Lambda`, `Xi`, `Pi`, `Sigma`, `Upsilon`, `Phi`, `Psi`, `Omega`.
- **Arithmetic and binary operators:** `cdot`, `cdotp`, `centerdot`, `dotplus`, `times`, `div`, `pm`, `mp`, `ast`, `star`, `circ`, `bullet`, `opbullet`, `diamond`, `Diamond`, `oplus`, `ominus`, `otimes`, `oslash`, `odot`, `uplus`, `sqcup`, `sqcap`, `bigcirc`, `circledast`, `circledcirc`, `circleddash`, `boxplus`, `boxminus`, `boxtimes`, `boxdot`, `ltimes`, `rtimes`, `divideontimes`, `wr`, `amalg`.
- **Relations:** `neq`, `ne`, `approx`, `equiv`, `le`, `leq`, `leqq`, `nleq`, `ge`, `geq`, `geqq`, `ngeq`, `lt`, `gt`, `nless`, `ngtr`, `lesssim`, `gtrsim`, `prec`, `nprec`, `succ`, `nsucc`, `to`, `rightarrow`, `leftarrow`, `implies`, `impliedby`, `iff`, `in`, `ni`, `owns`, `notin`, `mid`, `shortmid`, `nmid`, `parallel`, `shortparallel`, `nparallel`, `perp`, `propto`, `doteq`, `sim`, `simeq`, `backsim`, `cong`, `asymp`, `triangleq`, `coloneqq`, `eqqcolon`, `risingdotseq`, `fallingdotseq`, `bowtie`, `smile`, `frown`, `vdash`, `dashv`, `models`, `Vdash`, `vDash`, `nvdash`, `therefore`, `because`, `precedes`, `preceq`, `succeq`, `ll`, `gg`, `leqslant`, `geqslant`, `subset`, `subseteq`, `subsetneq`, `sqsubset`, `sqsubseteq`, `supset`, `supseteq`, `supsetneq`, `sqsupset`, `sqsupseteq`, `nsubseteq`, `nsupseteq`.
- **Sets, logic, and lattice symbols:** `cup`, `union`, `cap`, `intersection`, `setminus`, `smallsetminus`, `complement`, `top`, `bot`, `forall`, `exists`, `nexists`, `neg`, `lnot`, `land`, `wedge`, `lor`, `vee`, `emptyset`, `varnothing`.
- **Arrows:** `mapsto`, `longmapsto`, `longrightarrow`, `longleftarrow`, `Longrightarrow`, `Longleftarrow`, `leftrightarrow`, `longleftrightarrow`, `Longleftrightarrow`, `Leftrightarrow`, `Rightarrow`, `Leftarrow`, `uparrow`, `downarrow`, `Uparrow`, `Downarrow`, `updownarrow`, `Updownarrow`, `nearrow`, `searrow`, `swarrow`, `nwarrow`, `twoheadrightarrow`, `twoheadleftarrow`, `rightharpoonup`, `leftharpoonup`, `rightleftharpoons`, `leftrightharpoons`, `circlearrowleft`, `circlearrowright`, `hookrightarrow`, `hookleftarrow`, `gets`.
- **Functions and named operators:** `sin`, `cos`, `tan`, `cot`, `sec`, `csc`, `sinh`, `cosh`, `tanh`, `coth`, `arcsin`, `arccos`, `arctan`, `log`, `ln`, `exp`, `min`, `max`, `sup`, `inf`, `lim`, `limsup`, `liminf`, `varlimsup`, `varliminf`, `injlim`, `projlim`, `deg`, `sgn`, `lg`, `det`, `gcd`, `lcm`, `ker`, `dim`, `hom`, `arg`, `Pr`, `rank`, `tr`, `trace`, `mod`, `bmod`, `pmod`.
- **Other symbols and delimiters:** `infty`, `partial`, `nabla`, `ldots`, `cdots`, `dots`, `vdots`, `ddots`, `degree`, `angle`, `measuredangle`, `sphericalangle`, `triangle`, `bigtriangleup`, `bigtriangledown`, `triangleleft`, `triangleright`, `lhd`, `rhd`, `square`, `hbar`, `ell`, `wp`, `Re`, `Im`, `aleph`, `beth`, `gimel`, `daleth`, `mho`, `eth`, `imath`, `jmath`, `dagger`, `ddagger`, `prime`, `backprime`, `bigstar`, `blacksquare`, `lozenge`, `clubsuit`, `diamondsuit`, `heartsuit`, `spadesuit`, `lvert`, `rvert`, `vert`, `midvert`, `Vert`, `lVert`, `rVert`, `lbrack`, `rbrack`, `langle`, `rangle`, `lfloor`, `rfloor`, `lceil`, `rceil`, `lbrace`, `rbrace`, `colon`, `backslash`, `lgroup`, `rgroup`, `llbracket`, `rrbracket`, `ulcorner`, `urcorner`, `llcorner`, `lrcorner`.

The escaped delimiter `\|` emits a double vertical bar. Spacing commands are `\,`, `\:`, `\;`, `\!`, `\ `, `\quad`, `\qquad`, `\enspace`, and `\thinspace`; positive spacing is reduced to a regular space and `\!` is removed.

### Known limitations

- This is a curated subset, not a full LaTeX or MathJax implementation. Any unlisted command or environment fails the export with an explicit diagnostic.
- `aligned`, `array`, `align`, `equation`, and `smallmatrix` environments are unsupported. Use the listed matrix environments only.
- Display delimiters remain inline in the containing Word paragraph; they are not separate centered equations.
- Text/font style commands preserve content but generally do not preserve the requested font or style. `\mathbb` maps the listed capitals; other values fall back to ordinary characters.
- Explicit delimiter sizing and some accent glyphs are approximations. Matrix row breaks support plain `\\`; optional row spacing such as `\\[6pt]` is not implemented.
- Brace both script values in combined scripts, for example `x_{i}^{2}`.
- Errors for unsupported syntax cancel DOCX export; no LaTeX-source fallback is substituted.

## Markdown and embedded content

| Input | Word output | Fidelity / limitations |
| --- | --- | --- |
| Headings `#` through `######` | Word heading styles 1–6 | Native paragraphs. |
| Paragraphs and inline text | Word paragraphs and runs | RTL/LTR direction is applied to text runs and blocks. |
| `**bold**`, `*italic*`, `~~strike~~` | Bold, italic, and strike-through runs | Native for ordinary inline Markdown tokens. |
| Inline code and fenced code | Monospace runs/paragraphs; syntax highlighting where recognized | Code is source text, not executable. |
| Links | Clickable external links | Native hyperlinks. |
| Markdown tables | Native Word tables | Header styling and alternating row fill; columns are equal width and Markdown alignment is not retained. |
| Ordered, unordered, and nested lists | Word numbering | Up to four numbering levels; task boxes are `☑`/`☐` glyphs, not interactive controls. Ordered-list start values are not retained. |
| Blockquotes | Shaded paragraphs with direction-aware accent edge | Complex nested block structures are lossy. |
| Horizontal rules | Border on an empty paragraph | Native approximation. |
| Callouts | Tinted paragraphs with title and accent edge | Images and links in the body are kept; rich formatting, arbitrary nested layout, and full Markdown structure are not preserved. Supported grid/tab markers are rendered recursively. |
| Tabs (`=== "Title"`) | Sequential static sections in a framed table | Not interactive. A one-tab group's title is omitted. |
| Grids (`:::grid`) | Invisible-border Word layout table | Column counts, fractional tracks, and spans are represented; CSS gap is not. Images within cells are embedded when available. |
| Footnotes | Reference and list text | Not native Word footnotes; superscript, backlinks, and list formatting are lost. |
| Mermaid fences | PNG when capture succeeds; otherwise labeled source text | Static image, not editable diagram. See [documented Mermaid types](diagrams.md). |
| Plotly fences | PNG when capture succeeds; otherwise JSON/source text | Static image, not interactive; Plotly must be available in the page at export time. See [chart syntax](charts.md). |
| `map` fences | Static map image when fetched; otherwise a text caption | Not interactive; image capture requires network access. See [map syntax](maps.md). |
| Markdown images `![alt](url)` | Embedded PNG when fetch and conversion succeed; otherwise `[Image: alt]` with a safe source link where possible | Browser-decodable JPEG, GIF, WebP, AVIF, SVG, and image data URIs are rasterized to PNG. GIF animation and vector editability are not retained. |
| HTML `<img>` and `<figure>` | Embedded PNG plus available caption text; otherwise alt/source fallback | `width` and `height` are respected within page bounds. HTML layout and styling are not preserved. |
| HTML `<video>`, `<audio>`, and `<iframe>` | Clickable source link or readable text fallback; a video `poster` is embedded as an image when possible | Playback and embedded frame interaction are not preserved. |
| HTML inline `<svg>` | Rasterized PNG when safely parsed and converted; otherwise an alt/text fallback | Scripts, event handlers, foreign objects, and external references are removed; SVG is not editable in Word. |

## Containers and limitations

Grid cells and tab bodies are reprocessed through the Word renderer, so supported content can be nested there. Do not rely on these combinations for faithful Word output:

- Complex blocks such as code, tables, or lists nested inside a list item or blockquote are not fully rendered.
- Callout body formatting is flattened; image and media-link segments are handled, but diagram fences inside callouts are not rasterized as diagrams.
- Math in image alt text or tab titles is not resolved as an equation.
- Remote images require successful CORS-enabled fetches; inaccessible URLs, blocked local files, invalid data URIs, and oversized images fall back to a text/link placeholder. The exporter does not bypass browser CORS.
- Images are limited to 80 collected sources per document, remote files to 20 MB each, and raster dimensions to 2048 px; later sources are skipped with a warning.
- Non-math renderer errors may be logged and skipped; math conversion errors cancel the export.

## Export QA checklist

- [ ] Assert expected OMML structure or glyphs for each new math command.
- [ ] Verify packed DOCX XML for any new OMML structures.
- [ ] Confirm math placeholders are resolved and unsupported commands still fail clearly.
- [ ] Test diagram image capture and fallback paths.
- [ ] Keep the guide and feature documentation synchronized with the parser.

## Implementation references

- LaTeX parser: `assets/js/export/word/docx-math-parser.js`
- Export pipeline: `assets/js/export/exporters/word.exporter.js`, `assets/js/export/word/docx-builder.js`
- Renderers: `assets/js/export/word/renderers/`
- Regression suite: `tests/docx-math-export.test.js`
- Related guides: [Export](export.md), [Math](math.md)
