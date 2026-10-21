# Handoff

Estado al cerrar la última sesión larga. Se reescribe entero, no se acumula. Lo automático (árbol, diff, último verificar) lo deja el hook PreCompact en `.claude/trabajo/HANDOFF-auto.md`.

## 2026-10-21

**Objetivo vigente:** harness montado (hooks, reglas por tema, permisos, TODOs repo-vivo, traspaso); seguir con la cola de TODOs elegidos.

**Rama y árbol:** `master` en `550ad6f` (commit del harness) más la documentación de traspaso sin commitear. Sin cambios en `src/`. Hay PNG nuevos sin versionar en `assets-src/imagegen-production/encore-v1/raw/` (referencias de ChatGPT pendientes de registrar en `docs/art_direction/visual_reference_register.md`).

**Worktrees vivos:** `.claude/worktrees/agent-a7022662f82c8e51a` (rama `worktree-agent-a7022662f82c8e51a`, wip de la repetición de la mejor expedición, 1afafd8) y `.claude/worktrees/arte-3d` (rama `exp/arte-3d`). Las otras 25 ramas `worktree-agent-*` ya integradas se borraron.

**Elegidas (ver [tablero](../todos/README.md)):** repetición de la mejor expedición (retomar desde el wip, rebasear), gravedad en bajadas + hielo en Paseo libre, enseñar al bot a salir del pozo de la pileta, quitar Demolición de master, mover PACTS a balance.json.

**Preguntas abiertas para el dueño:** mail real (necesita credenciales SMTP).

**Verificación:** `npm run todos`, `todos.check`, `docs:check` y `verificar --nivel rapido --seco` en verde; el guard de hooks probado con 11 comandos. No se corrió nada que toque el juego (no hubo cambios en `src/`).

**Siguiente acción concreta:** encargar los 5 TODOs elegidos de a 3 en paralelo (archivos disjuntos: repetición toca main.ts y encore.ts; Demolición toca menu.ts, kit.css, main.ts: no van juntos), cada uno con `npm run todos encargo <slug>`.
