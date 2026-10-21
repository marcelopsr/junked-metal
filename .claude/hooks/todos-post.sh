#!/bin/sh
# PostToolUse(Edit|Write) sobre docs/todos/*.md: valida la cabecera y regenera el tablero de esa raíz al instante.
. "$(dirname "$0")/lib.sh"
f=$(campo file_path)
case "$f" in *docs/todos/*.md) ;; *) exit 0;; esac
case "$f" in *README.md|*FORMATO.md) exit 0;; esac
cd "$(raiz "$f")" || exit 0
salida=$(node scripts/todos.mjs 2>&1) && exit 0
echo "TODO inválido tras editar $f:" >&2; echo "$salida" | tail -5 >&2; exit 2
