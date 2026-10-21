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
Volver a jugar (o ver) la mejor expedición desde la misma semilla. «Mejor» = la expedición con mayor puntaje final en `Save` (hoy no se guarda nada de ella: hay que guardar semilla, auto, piloto y pactos elegidos al cerrar una expedición con récord). Dónde se dispara (decidido por el dueño 2026-10-21): botón «Repetir la mejor» en la pantalla de resultados de ENCORE y en la cartelera (afiche del récord). Repetir = jugarla de nuevo con esa configuración fija.

## Alcance
- Toca: encore.ts, outro.ts, net.ts, rng.ts, savefmt.ts, menu/cartelera.ts (migración del guardado si suma campos). `main.ts` solo las líneas del wip: el agente entrega ese parche aparte y lo integra el orquestador.
- No toca: nada fuera de eso sin coordinar con el orquestador.

## Cómo verificar
- `npm run verificar -- --nivel tanda`; `npm run sim -- --encore --seeds N` dos veces con la expedición guardada y comparar que el puntaje final sea idéntico; `npm test` (savefmt) y e2e pc 1 semilla.

## Notas
Decisión 2026-10-21: retomar desde el wip de la rama `worktree-agent-a7022662f82c8e51a` (`1afafd8` + `f123ad7` con lo que estaba sin commitear; toca 9 archivos, ~350 commits detrás de master; el worktree ya se cerró). Cómo: worktree nuevo desde master, `git cherry-pick 1afafd8 f123ad7` (o aplicar el diff), resolver conflictos; NO tocar ni rebasear el worktree viejo (el orquestador lo borra al integrar). Sin git destructivo.
Worktree `.claude/worktrees/agent-a7022662f82c8e51a` (commit 1afafd8).
