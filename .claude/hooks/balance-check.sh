#!/bin/sh
# PostToolUse(Edit|Write) sobre src/balance.json: ida y vuelta con la planilla en la raíz que corresponda; avisa solo si falla.
. "$(dirname "$0")/lib.sh"
f=$(campo file_path)
case "$f" in *src/balance.json) ;; *) exit 0;; esac
cd "$(raiz "$f")" || exit 0
[ -d node_modules ] || exit 0
salida=$(npm run -s balance:check 2>&1) && exit 0
echo "balance:check falló tras editar src/balance.json:" >&2; echo "$salida" | tail -15 >&2; exit 2
