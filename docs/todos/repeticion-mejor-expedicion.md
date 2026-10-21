---
titulo: Repetición de la mejor expedición
estado: pregunta
area: juego
prioridad: media
origen: pendiente
desde: 2026-10-21
viejo_id: T39
motivo: Hay un wip en la rama worktree-agent-a7022662f82c8e51a: decidir si se retoma o se descarta
---

## Qué y por qué
Volver a ver la mejor expedición desde la misma semilla.

## Alcance
- Toca: main.ts, encore.ts.
- No toca: nada fuera de eso sin coordinar con el orquestador.

## Cómo verificar
- `npm run verificar -- --nivel tanda` + misma semilla reproduce; e2e.

## Notas
Worktree `.claude/worktrees/agent-a7022662f82c8e51a` (commit 1afafd8).
