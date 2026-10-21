#!/bin/sh
# PostToolUse(Edit|Write) sobre src/balance.json: ida y vuelta con la planilla; avisa solo si falla.
f=$(python3 -c 'import json,sys;print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null)
case "$f" in *src/balance.json) ;; *) exit 0;; esac
cd "$(dirname "$0")/../.." || exit 0
salida=$(npm run -s balance:check 2>&1) && exit 0
echo "balance:check falló tras editar src/balance.json:" >&2; echo "$salida" | tail -15 >&2; exit 2
