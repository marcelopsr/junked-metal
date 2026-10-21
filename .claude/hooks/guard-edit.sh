#!/bin/sh
# PreToolUse(Edit|Write): no editar a mano archivos generados ni la configuración del harness desde un agente.
. "$(dirname "$0")/lib.sh"
f=$(campo file_path)
[ -z "$f" ] && exit 0
bloquear() { printf 'BLOQUEADO por .claude/hooks/guard-edit.sh: %s\n' "$1" >&2; exit 2; }
case "$f" in
  */docs/todos/README.md|docs/todos/README.md) bloquear "docs/todos/README.md es generado: editar el TODO y correr node scripts/todos.mjs." ;;
  */docs/README.md|docs/README.md) bloquear "docs/README.md es generado: npm run docs:index." ;;
  */.claude/settings.json|.claude/settings.json|*/.claude/hooks/*|.claude/hooks/*)
    [ "${CLAUDE_HARNESS_EDIT:-}" = "1" ] && exit 0
    bloquear "la configuración del harness (.claude/settings.json, .claude/hooks/) la cambia solo el orquestador con el dueño: exportar CLAUDE_HARNESS_EDIT=1 en esa sesión si corresponde." ;;
esac
exit 0
