# Mapa del código (`src/`)

La tabla completa archivo por archivo está en [CLAUDE.md](../../../CLAUDE.md) (sección «Mapa del código»); no se copia. Acá, por responsabilidad. Relaciones: `graphify query "<pregunta>"`.

- **Arranque y partida:** `main.ts` (bootstrap, loop `update()`), `run.ts` / `run_state.ts` / `run_tick.ts` / `run_loader.ts` (semilla, estado, tick, carga por modo), `combat.ts`, `hud_tick.ts`.
- **Mundo:** `world.ts`, `world_layout.ts`, `grass.ts`, `zones/` (un archivo por escenario; `libre*.ts` son los barrios del Paseo libre).
- **Autos y física:** `car.ts`, `run_drive.ts`, `car_genes.ts` (+ `.json`), `carGlb.ts`. Trampas: [../../../.claude/rules/havok.md](../../../.claude/rules/havok.md).
- **Enemigos:** `enemies.ts` (`DEF`, `Enemy`, `spawnTable`), `enemies/ai/` (un archivo por jefe o familia), `enemies/logic.ts`, `menu/beast_data.ts` (bestiario).
- **Armas:** `weapons.ts` (registro `CLASSES`), `weapons/` (una clase por arma, `base.ts` con `WEAPONS` y `FUSIONS`, `passives.ts`, `offers.ts`).
- **Balance:** `balance.json` + `balance.ts`; reglas en [../../../.claude/rules/balance.md](../../../.claude/rules/balance.md).
- **Render y arte:** `render.ts`, `fx.ts`, `models.ts` y `models/`, `kit3d.ts`, `glb.ts`.
- **Interfaz:** `ui.ts`, `hud.css`, `icons.ts`, `menu.ts` + `menu.css` + `menu/`, `style.css`, `intro.ts`, `replay.ts`, `outro.ts`.
- **Audio:** `sfx.ts`, `radio.ts`, `audio/` (contexto, música, efectos, ambiente).
- **Modos:** ver [modos.md](modos.md).
- **Red:** `net.ts`, `net_client.ts`, `coop.ts`, `quickchat.ts`.
- **Guardado:** `savefmt.ts` (formato y migración, probado), `Save` en `menu.ts`.
- **Soporte de dev:** `dev-hooks.ts` y `devbot.ts` (solo `import.meta.env.DEV`), `rng.ts`. Reglas: [../../../.claude/rules/dev-hooks.md](../../../.claude/rules/dev-hooks.md).
- **Laboratorios (no son modos):** `art_lab.ts`, `folded*.ts`, `bench_lod.ts`, `evo_probe.ts`.
