#!/bin/sh
# PostToolUse(Edit|Write) sobre docs/todos/*.md: valida la cabecera y regenera el tablero al instante.
f=$(python3 -c 'import json,sys;print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null)
case "$f" in *docs/todos/*.md) ;; *) exit 0;; esac
case "$f" in *README.md|*FORMATO.md) exit 0;; esac
cd "$(dirname "$0")/../.." || exit 0
salida=$(node scripts/todos.mjs 2>&1) && exit 0
echo "TODO inválido tras editar $f:" >&2; echo "$salida" | tail -5 >&2; exit 2
