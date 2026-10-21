#!/bin/sh
# SubagentStart: todo subagente recibe el pie de encargo del repo como contexto (JSON hookSpecificOutput.additionalContext).
cd "$(dirname "$0")/../.." || exit 0
pie=docs/plantillas/pie-encargo.md
[ -f "$pie" ] || exit 0
{
  echo "## Pie de encargo del repo (hook SubagentStart)"
  cat "$pie"
  echo
  echo "Reglas por tema en .claude/rules/ (se cargan solas al tocar sus archivos). Si el encargo no nombra archivos, meta medible y verificación, pedirlos antes de empezar. Si tsc marca errores en archivos fuera de tu alcance, no los toques: anotalos en el informe."
} | python3 -c 'import json,sys;print(json.dumps({"hookSpecificOutput":{"hookEventName":"SubagentStart","additionalContext":sys.stdin.read()}}))'
