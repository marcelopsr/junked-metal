#!/bin/sh
# SessionStart: arranque en frío automático (rama, tablero, handoff, worktrees). Lo que imprime entra como contexto.
cd "$(dirname "$0")/../.." || exit 0
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
[ -f .claude/trabajo/HANDOFF-auto.md ] && echo "Hay .claude/trabajo/HANDOFF-auto.md (dejado por PreCompact): leerlo si la sesión anterior se cortó."
echo; echo "Protocolo: docs/traspaso/INDICE.md. Decir en 3 líneas dónde quedamos y qué sigue; preguntas solo con AskUserQuestion."
