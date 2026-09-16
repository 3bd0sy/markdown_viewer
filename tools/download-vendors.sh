#!/bin/bash
# download-vendors.sh — fetch every vendor library locally.
# Run from the project root:  bash tools/download-vendors.sh

set -e
VENDOR="assets/vendor"
mkdir -p "$VENDOR/mathjax"

echo "Downloading vendor libraries..."

curl -sL -o "$VENDOR/marked.min.js" \
  "https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js"
echo "  marked 9.1.6"

curl -sL -o "$VENDOR/highlight.min.js" \
  "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"
curl -sL -o "$VENDOR/highlight-atom-dark.min.css" \
  "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css"
echo "  highlight.js 11.9.0"

curl -sL -o "$VENDOR/mermaid.min.js" \
  "https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.6.1/mermaid.min.js"
echo "  mermaid 10.6.1"

curl -sL -o "$VENDOR/docx.umd.js" \
  "https://unpkg.com/docx@8.5.0/build/index.umd.js"
echo "  docx 8.5.0"

curl -sL -o "$VENDOR/plotly.min.js" \
  "https://cdn.plot.ly/plotly-2.27.1.min.js"
echo "  plotly 2.27.1 (~3MB, now lazy-loaded)"

curl -sL -o "$VENDOR/pptxgen.js" \
  "https://unpkg.com/pptxgenjs@3.12.0/dist/pptxgen.bundle.js"
echo "  PptxGenJS 3.12.0"

# NEW: <model-viewer> was referenced by the 3D block but never shipped
curl -sL -o "$VENDOR/model-viewer.min.js" \
  "https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"
echo "  model-viewer 3.4.0"

echo ""
echo "MathJax needs npm:"
echo "   npm install mathjax@3"
echo "   cp -r node_modules/mathjax/es5/* $VENDOR/mathjax/"
echo ""
echo "Done. Files are in $VENDOR/"
