#!/bin/sh
# PostToolUse(Edit|Write): tras tocar un .ts de src/ o test/ corre tsc (con 20 s de gracia entre corridas) y avisa solo si falla.
f=$(python3 -c 'import json,sys;print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null)
case "$f" in */src/*.ts|*/test/*.ts|src/*.ts|test/*.ts) ;; *) exit 0;; esac
marca="${TMPDIR:-/tmp}/rcfight-tsc-$(id -u)"
ahora=$(date +%s); ult=$(cat "$marca" 2>/dev/null || echo 0)
[ $((ahora - ult)) -lt 20 ] && exit 0
echo "$ahora" > "$marca"
cd "$(dirname "$0")/../.." || exit 0
salida=$(npx tsc --noEmit -p . 2>&1) && exit 0
echo "tsc falló tras editar $f:" >&2; echo "$salida" | head -20 >&2; exit 2
