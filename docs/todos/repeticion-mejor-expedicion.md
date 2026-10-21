---
titulo: Repetición de la mejor expedición
estado: elegida
area: juego
prioridad: media
origen: pendiente
desde: 2026-10-21
viejo_id: T39
---

## Qué y por qué
Volver a ver la mejor expedición desde la misma semilla.

## Alcance
- Toca: main.ts, encore.ts.
- No toca: nada fuera de eso sin coordinar con el orquestador.

## Cómo verificar
- `npm run verificar -- --nivel tanda` + misma semilla reproduce; e2e.

## Notas
Decisión 2026-10-21: retomar desde el wip. Partir de la rama `worktree-agent-a7022662f82c8e51a` (1afafd8), rebasear sobre master (main.ts cambió mucho) y terminar.
Worktree `.claude/worktrees/agent-a7022662f82c8e51a` (commit 1afafd8).
