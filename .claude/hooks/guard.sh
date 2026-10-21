#!/bin/sh
# PreToolUse(Bash): corta comandos prohibidos en este repo (ver CLAUDE.md). exit 2 = bloqueado, el motivo va a Claude.
cmd=$(python3 -c 'import json,sys;print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null)
[ -z "$cmd" ] && exit 0
bloquear() { echo "BLOQUEADO por .claude/hooks/guard.sh: $1" >&2; exit 2; }
echo "$cmd" | grep -Eq 'pm2[[:space:]]+(restart|stop|delete|reload|kill)[[:space:]]+(rc-test|all([[:space:]]|$))' && bloquear "nadie reinicia/para/borra rc-test* ni pm2 entero: se autogestionan y sirven el código actual; basta correr de nuevo (npm run test:ls para ver estado)."
echo "$cmd" | grep -Eq 'pm2[[:space:]]+(restart|stop|delete|reload|kill)[[:space:]]*$' && bloquear "pm2 sin nombre de proceso."
echo "$cmd" | grep -Eq '(^|[;&|][[:space:]]*)git[[:space:]]+(restore|stash|clean)([[:space:]]|$)' && bloquear "git restore/stash/clean pisan el trabajo de otros agentes en este árbol. Si el usuario lo pidió, que lo corra él."
echo "$cmd" | grep -Eq 'git[[:space:]]+reset[[:space:]]+(--hard|--merge)' && bloquear "git reset --hard/--merge destruye cambios locales."
echo "$cmd" | grep -Eq 'git[[:space:]]+checkout[[:space:]]+(--|\.|-f|[^[:space:]]+[[:space:]]+--[[:space:]])' && bloquear "git checkout de archivos descarta cambios locales (cambiar de rama con un nombre solo sí vale)."
echo "$cmd" | grep -Eq 'git[[:space:]]+push.*(--force|-f([[:space:]]|$))' && bloquear "push forzado."
echo "$cmd" | grep -Eq '(pkill|killall)[[:space:]].*(vite|pm2|node)' && bloquear "no matar servidores a mano: los maneja pm2."
echo "$cmd" | grep -Eq 'rm[[:space:]]+-[a-zA-Z]*r[a-zA-Z]*f?[[:space:]]+' && ! echo "$cmd" | grep -Eq 'rm[[:space:]]+-[a-zA-Z]*[[:space:]]+(\./)?(\.shots|\.perf|\.e2e|\.verificar|\.evo|dist|node_modules|scratch|/private/tmp|/tmp)' && bloquear "rm -rf solo sobre .shots/.perf/.e2e/.verificar/.evo/dist/node_modules/scratch/tmp."
exit 0
