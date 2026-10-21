#!/bin/sh
# Funciones comunes de los hooks. Uso: . "$(dirname "$0")/lib.sh"
# campo <clave>: lee tool_input.<clave> del JSON de stdin (python3, o node si no hay python3).
campo() {
  if command -v python3 >/dev/null 2>&1; then python3 -c 'import json,sys;print(json.load(sys.stdin).get("tool_input",{}).get(sys.argv[1],""))' "$1" 2>/dev/null
  else node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).tool_input[process.argv[1]]||"")}catch(e){console.log("")}})' "$1"; fi
}
# raiz <archivo>: raíz del repo o worktree al que pertenece el archivo (no la del árbol principal).
raiz() {
  d=$(dirname "$1"); [ -d "$d" ] || d=.
  git -C "$d" rev-parse --show-toplevel 2>/dev/null || (cd "$(dirname "$0")/../.." && pwd)
}
