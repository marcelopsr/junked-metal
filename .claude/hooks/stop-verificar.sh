#!/bin/sh
# Stop: si hay cambios en src/ y no hay informe de verificar de hoy, pide correrlo una vez (solo la primera vez por parada).
python3 -c 'import json,sys;sys.exit(1 if json.load(sys.stdin).get("stop_hook_active") else 0)' || exit 0
cd "$(dirname "$0")/../.." || exit 0
[ -z "$(git diff --name-only HEAD -- src test 2>/dev/null; git ls-files --others --exclude-standard src test 2>/dev/null)" ] && exit 0
hoy=$(date +%Y-%m-%d); ls .verificar/"$hoy"T*.md >/dev/null 2>&1 && exit 0
printf '{"decision":"block","reason":"Hay cambios en src/ o test/ sin informe de verificar de hoy. Si la tanda terminó: npm run verificar -- --nivel tanda (o rapido si no hay nada visual) y resumir Implementado/Verificado/Pendiente. Si la tanda sigue, decirlo en una línea y cerrar."}\n'
