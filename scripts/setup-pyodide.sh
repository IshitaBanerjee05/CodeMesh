#!/usr/bin/env bash
set -euo pipefail
VERSION="0.29.4"
BASE="https://cdn.jsdelivr.net/pyodide/v${VERSION}/full"
DIR="$(cd "$(dirname "$0")/.." && pwd)/apps/desktop/src/renderer/pyodide"
mkdir -p "$DIR"
for file in pyodide.mjs pyodide.asm.js pyodide.asm.wasm pyodide-lock.json python_stdlib.zip; do
  echo "Downloading $file"
  curl -fL "$BASE/$file" -o "$DIR/$file"
done
echo "Pyodide ${VERSION} is ready in ${DIR}"
