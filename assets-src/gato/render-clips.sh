#!/usr/bin/env bash
# PNG de referencia para jump/spin (y resto de acciones del render= en gato.py).
# Uso: ./assets-src/gato/render-clips.sh [DIR]   (default: assets-src/gato/renders)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${1:-$ROOT/assets-src/gato/renders}"
BLENDER="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
cd "$ROOT"
"$BLENDER" -b --python assets-src/gato/gato.py -- "export=0" "render=$OUT"
echo "PNG en: $OUT"
