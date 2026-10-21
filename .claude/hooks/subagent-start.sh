#!/bin/sh
# SubagentStart: todo subagente recibe el pie de encargo del repo como contexto.
cd "$(dirname "$0")/../.." || exit 0
echo "## Pie de encargo del repo (hook SubagentStart)"
cat .claude/trabajo/pie-encargo.md 2>/dev/null
echo
echo "Reglas por tema en .claude/rules/ (se cargan solas al tocar sus archivos). Si el encargo no nombra archivos, meta medible y verificación, pedirlos antes de empezar."
