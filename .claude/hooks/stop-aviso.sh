#!/bin/sh
# Stop: si el turno duró más de 2 minutos (una tanda con agentes o verificación), avisa al sistema con una notificación.
# Sin sonido propio (peon-ping ya suena). Solo en macOS con osascript; en otro sistema no hace nada.
command -v osascript >/dev/null 2>&1 || exit 0
sid=$(python3 -c 'import json,sys;print(json.load(sys.stdin).get("session_id","x"))' 2>/dev/null)
marca="${TMPDIR:-/tmp}/rcfight-turno-${sid:-x}"
[ -f "$marca" ] || exit 0
ini=$(cat "$marca"); ahora=$(date +%s); dur=$((ahora - ini)); rm -f "$marca"
[ "$dur" -lt 120 ] && exit 0
cd "$(dirname "$0")/../.." || exit 0
min=$((dur / 60))
res=$(sed -n '5p' docs/todos/README.md 2>/dev/null | sed 's/ · /, /g' | cut -c1-80)
osascript -e "display notification \"Tanda de ${min} min terminada. ${res}\" with title \"Junked Metal\"" >/dev/null 2>&1
exit 0
