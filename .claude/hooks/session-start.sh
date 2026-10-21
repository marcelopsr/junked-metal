#!/bin/sh
# SessionStart: arranque en frío automático (rama, tablero, handoff, worktrees). Lo que imprime entra como contexto.
cd "$(dirname "$0")/../.." || exit 0
sid=$(python3 -c 'import json,sys;print(json.load(sys.stdin).get("session_id","x")[:8])' 2>/dev/null); git rev-parse HEAD > "${TMPDIR:-/tmp}/rcfight-head-${sid:-x}" 2>/dev/null
echo "## Arranque en frío (hook SessionStart)"
echo "Rama: $(git rev-parse --abbrev-ref HEAD 2>/dev/null) · HEAD: $(git log -1 --format='%h %s' 2>/dev/null)"
n=$(git status --short 2>/dev/null | grep -vc '^?? assets-src/'); [ "$n" -gt 0 ] && echo "Árbol: $n cambios sin commitear (git status)"
wt=$(git worktree list 2>/dev/null | tail -n +2 | awk '{print $NF}' | tr '\n' ' '); [ -n "$wt" ] && echo "Worktrees vivos: $wt"
if [ -f docs/todos/README.md ]; then
  echo; echo "### Tablero (docs/todos/README.md)"
  sed -n '5p' docs/todos/README.md
  awk '/^## (En curso|Preguntas para el dueño|Elegidas por prioridad)/{p=1} /^## (En lote|Ideas)/{p=0} p' docs/todos/README.md | grep -E '^\| \[|^## ' | sed 's/^## /- /' | head -25
fi
[ -f docs/traspaso/HANDOFF.md ] && { echo; echo "### Handoff (docs/traspaso/HANDOFF.md)"; sed -n '/^## /,$p' docs/traspaso/HANDOFF.md | head -22; }
if [ -f .claude/trabajo/HANDOFF-auto.md ]; then
  ha=$(sed -n 's/.*HEAD: \([0-9a-f]\{7\}\).*/\1/p' .claude/trabajo/HANDOFF-auto.md | head -1); hn=$(git rev-parse --short=7 HEAD 2>/dev/null); fh=$(sed -n '1s/.*— //p' .claude/trabajo/HANDOFF-auto.md)
  if [ -n "$ha" ] && [ "$ha" = "$hn" ]; then echo "HANDOFF-auto.md ($fh) es del HEAD actual: la sesión anterior se cortó a mitad de algo; leerlo (.claude/trabajo/HANDOFF-auto.md)."; else echo "HANDOFF-auto.md ($fh, HEAD $ha) es más viejo que el HEAD actual ($hn): ignorarlo."; fi
fi
echo; echo "Protocolo: docs/traspaso/INDICE.md. Decir en 3 líneas dónde quedamos y qué sigue; preguntas solo con AskUserQuestion."
