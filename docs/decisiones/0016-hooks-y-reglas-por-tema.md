# Hooks de guardarraíl y reglas por tema en .claude

Fecha: 2026-10-21 · Estado: aceptada

## Contexto
`CLAUDE.md` crecía sin límite y los guardarraíles eran solo texto. Commit `550ad6f` (harness). Reglas en [.claude/rules](../../.claude/rules/balance.md).

## Decisión
Hooks (`guard`, `tsc-post`, `stop-verificar`, `precompact-handoff`) hacen cumplir lo que importa; las reglas por tema (`balance`, `havok`, `rendimiento`, `dev-hooks`, `pruebas-herramientas`) se cargan por ruta (`paths`).

## Alternativas
Todo en un CLAUDE.md gigante.

## Consecuencias
CLAUDE.md queda como índice. Una regla nueva va a su archivo de tema.
