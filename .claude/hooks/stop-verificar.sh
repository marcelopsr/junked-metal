#!/bin/sh
# Stop: si hay cambios en src/ o test/ más nuevos que el último informe de verificar, pide correrlo una vez (solo la primera vez por parada).
python3 -c 'import json,sys;sys.exit(1 if json.load(sys.stdin).get("stop_hook_active") else 0)' 2>/dev/null || exit 0
cd "$(dirname "$0")/../.." || exit 0
cambiados=$(git diff --name-only HEAD -- src test 2>/dev/null; git ls-files --others --exclude-standard src test 2>/dev/null)
[ -z "$cambiados" ] && exit 0
ult=$(ls -t .verificar/*.md 2>/dev/null | head -1)
if [ -n "$ult" ]; then
  nuevo=0
  for f in $cambiados; do [ -f "$f" ] && [ "$f" -nt "$ult" ] && { nuevo=1; break; }; done
  [ "$nuevo" = 0 ] && exit 0
fi
printf '{"decision":"block","reason":"Hay cambios en src/ o test/ más nuevos que el último informe de verificar. Si la tanda terminó: npm run verificar -- --nivel tanda (o rapido si no hay nada visual) y resumir Implementado/Verificado/Pendiente. Si la tanda sigue o los cambios son de otro agente, decirlo en una línea y cerrar."}\n'
