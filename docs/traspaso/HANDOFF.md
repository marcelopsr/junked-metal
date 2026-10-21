# Handoff

Estado al cerrar la última sesión larga. Se reescribe entero, no se acumula. Lo automático (árbol, diff, último verificar) lo deja el hook PreCompact en `.claude/trabajo/HANDOFF-auto.md`.

## 2026-10-21

**Objetivo vigente:** harness montado y portable (hooks de sesión, kit versionado en `.claude/`, `AGENTS.md`/`GEMINI.md` como entrada para otros agentes, CI con docs:check, skills `/encargar` y `/cerrar-tanda`); seguir con la cola de TODOs elegidos.

**Rama y árbol:** `master` (el HEAD real lo da `git log -1`; este archivo no lo repite para no quedar viejo). Harness y traspaso commiteados; sin cambios en `src/`. Hay PNG nuevos sin versionar en `assets-src/imagegen-production/encore-v1/raw/` (referencias de ChatGPT pendientes de registrar en `docs/art_direction/visual_reference_register.md`).

**Worktrees vivos:** ninguno. El wip de la repetición quedó commiteado en la rama `worktree-agent-a7022662f82c8e51a` (`f123ad7` sobre `1afafd8`; retomar con cherry-pick, ver el TODO); `exp/arte-3d` conservada con ficha en `hecho/laboratorio-arte-3d.md`. Carpetas huérfanas de worktrees borradas (2,8 GB); `npm run limpiar` corrió.

**Elegidas (ver [tablero](../todos/README.md)):** repetición de la mejor expedición (retomar desde el wip, rebasear), gravedad en bajadas + hielo en Paseo libre, enseñar al bot a salir del pozo de la pileta, quitar Demolición de master, mover PACTS a balance.json.

**Preguntas abiertas para el dueño:** mail real (necesita credenciales SMTP).

**Verificación:** `harness:check` (60 casos del guard, 13 hooks), smoke test en un worktree real (hooks por raíz, test:restart/down), `todos.check`, `docs:check`, CI de GitHub en verde (`revisar.yml`), revisor independiente y ensayo de relevo en frío aplicados. No se corrió nada que toque el juego (no hubo cambios en `src/`).

**Siguiente acción concreta:** encargar los 5 TODOs elegidos con `/encargar`, de a 3 con archivos disjuntos. `main.ts` y `balance.json` los integra el orquestador: el agente de repetición trabaja en encore.ts/outro.ts/net.ts/rng.ts y entrega el parche de main.ts aparte; igual Demolición (main.ts) y PACTS (balance.json). La repetición ya tiene decisión de producto (botón en resultados y cartelera): lista para encargar.
