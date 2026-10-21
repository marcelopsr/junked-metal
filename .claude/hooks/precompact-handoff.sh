#!/bin/sh
# PreCompact: deja un handoff mínimo con el estado del árbol antes de perder contexto.
cd "$(dirname "$0")/../.." || exit 0
mkdir -p .claude/trabajo; out=.claude/trabajo/HANDOFF-auto.md
ult=$(ls -t .verificar/*.md 2>/dev/null | head -1)
{
  echo "# Handoff automático (PreCompact) — $(date '+%Y-%m-%d %H:%M')"
  echo; echo "Rama: $(git rev-parse --abbrev-ref HEAD 2>/dev/null) · HEAD: $(git log -1 --format='%h %s' 2>/dev/null)"
  echo; echo "## Árbol"; echo '```'; git status --short | head -60; echo '```'
  echo; echo "## Diff"; echo '```'; git diff --stat HEAD | tail -25; echo '```'
  if [ -n "$ult" ]; then echo; echo "## Último verificar: $ult"; sed -n '/^## Pendiente/,/^## /p' "$ult" | head -30; fi
  echo; echo "## Completar a mano (sección 17.3 de ARRANQUE.md)"; echo "- Objetivo vigente:"; echo "- Siguiente acción concreta:"
} > "$out"
echo "Handoff escrito en $out: completar objetivo y siguiente acción si hay contexto." 
