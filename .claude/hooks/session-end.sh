#!/bin/sh
# SessionEnd: informe fijo de la sesión en .claude/trabajo/sesiones/<fecha>-<id>.md:
# commits desde el HEAD de arranque (lo guarda session-start.sh), árbol, TODOs por estado, verificaciones del día.
cd "$(dirname "$0")/../.." || exit 0
sid=$(python3 -c 'import json,sys;print(json.load(sys.stdin).get("session_id","x")[:8])' 2>/dev/null)
marca="${TMPDIR:-/tmp}/rcfight-head-${sid:-x}"
head0=$(cat "$marca" 2>/dev/null); rm -f "$marca"
mkdir -p .claude/trabajo/sesiones
out=".claude/trabajo/sesiones/$(date +%Y-%m-%d-%H%M)-${sid:-x}.md"
{
  echo "# Sesión ${sid:-?} · $(date '+%Y-%m-%d %H:%M')"
  echo; echo "Rama: $(git rev-parse --abbrev-ref HEAD 2>/dev/null) · HEAD: $(git log -1 --format='%h %s' 2>/dev/null)"
  if [ -n "$head0" ] && git cat-file -e "$head0" 2>/dev/null; then
    echo; echo "## Commits de la sesión (desde $head0)"; git log --format='- %h %s' "$head0"..HEAD 2>/dev/null | head -40
  fi
  echo; echo "## Árbol al cerrar"; echo '```'; git status --short 2>/dev/null | grep -v '^?? assets-src/' | head -30; echo '```'
  [ -f docs/todos/README.md ] && { echo; echo "## TODOs"; sed -n '5p' docs/todos/README.md; }
  hoy=$(date +%Y-%m-%d); v=$(ls .verificar/"$hoy"T*.md 2>/dev/null)
  if [ -n "$v" ]; then echo; echo "## Verificaciones de hoy"; for f in $v; do echo "- $f: $(sed -n '1p' "$f")"; done; fi
  echo; echo "Ver docs/traspaso/HANDOFF.md para el estado curado."
} > "$out"
exit 0
