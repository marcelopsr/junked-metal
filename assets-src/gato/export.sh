#!/usr/bin/env bash
# Regenera gato.blend, gato_raw.glb y public/models/gato.glb (desde la raíz del repo).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BLENDER="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
EXTRA=()
for a in "$@"; do EXTRA+=("$a"); done
cd "$ROOT"
"$BLENDER" -b --python assets-src/gato/gato.py -- "${EXTRA[@]}"
echo "OK: public/models/gato.glb"
