---
name: codebase-discovery
description: >-
  Explores and maps the Junked Metal (rc_fight) architecture, modules, game modes,
  data flow, and symbol relationships using the graphify knowledge graph before
  reading full source files. Activate this skill at the start of any task that spans
  multiple modules, investigates unfamiliar behavior, or maps dependencies across
  src/main.ts, src/duel.ts, src/kart.ts, src/match3.ts, src/enemies.ts, src/weapons.ts,
  or src/models.ts. Do not activate for trivial single-file edits where the target
  lines are already known.
---

# Codebase Discovery (Graphify-First)

**Nivel de razonamiento recomendado:** `Gemini Flash — Low` para consultas rápidas de ubicación; `Gemini Flash — Medium` o `High` cuando se mapean interacciones entre múltiples modos o subsistemas.

## 1. Regla de Oro: `graphify` Antes de Leer Archivos Grandes
`src/main.ts` (~111 KB), `src/menu.ts` (~112 KB), `src/duel.ts` (~71 KB), `src/kart.ts` (~64 KB), `src/models.ts` (~63 KB) y `src/world.ts` (~58 KB) son módulos densos. **Nunca los leas enteros de entrada.**

Ejecuta primero consultas acotadas sobre el grafo (`graphify-out/graph.json`):

```bash
# 1. Explicar un nodo o función específica (muestra líneas exactas y conexiones)
graphify explain "src_main_update"
graphify explain "Enemy"

# 2. Buscar relaciones o caminos entre dos conceptos
graphify path "Car" "Enemy" --undirected

# 3. Consulta abierta sobre el grafo
graphify query "spawner de jefes y fases"
```

- Si un nombre es ambiguo (como `update()`), `graphify` devolverá los IDs exactos por archivo (`src_main_update`, `src_enemies_enemy_update`, `src_weapons_agua_update`) para reintentar.
- Para navegación temática amplia, lee primero [`graphify-out/wiki/index.md`](../../graphify-out/wiki/index.md) y el artículo de la comunidad correspondiente en `graphify-out/wiki/`.

## 2. Mapa Arquitectónico por Dominio

| Dominio | Archivos Clave | Entrypoints / Símbolos |
|---|---|---|
| **Loop Principal y Supervivencia** | `src/main.ts`, `src/run.ts`, `src/abilities.ts`, `src/pilots.ts`, `src/achievements.ts` | `update()`, `startRun()`, `endRun()`, `outroTick()`, hooks `__sim`, `__play`, `__lab`, `__bossDuel` |
| **Manejo y Vehículo** | `src/car.ts`, `src/carGlb.ts`, `src/input.ts` | `Car`, `drive()`, `CARS`, `pollPlayer()` |
| **Combate y Enemigos** | `src/enemies.ts`, `src/weapons.ts`, `src/fx.ts` | `Enemy`, `DEF`, `spawnTable()`, `Weapon`, `levelOffers()`, `FX`, `impact()` |
| **Modelos 3D y Mundo** | `src/models.ts`, `src/glb.ts`, `src/world.ts`, `assets-src/` | `template()`, `carModel()`, `buildWorld()`, `spawnPoint()`, VAT GLBs en `public/models/` |
| **Render y Audio** | `src/render.ts`, `src/bjs.ts`, `src/sfx.ts` | `pbr()`, `M`, `applyGfx()`, `LOOK`, fachada `@babylonjs/core` (`src/bjs.ts`), `SFX`, `music()` |
| **Menús, UI y Guardado** | `src/menu.ts`, `src/menuscene.ts`, `src/ui.ts`, `src/savefmt.ts`, `src/icons.ts` | `Save`, `parseSave()`, `openOffers()`, `hudDrive()`, `pixelateIcon()` |
| **Modo Carrera / Globos** | `src/kart.ts`, `src/race.css` | `startRace()`, `startBattle()`, `__race` |
| **Modo Demolición (BattleBots)** | `src/duel.ts`, `src/duel_build.ts`, `src/duel_fabricacion.ts`, `src/duel_paint.ts` | `stepDuelPhysics()`, armado RoboCraft (`fabricar`), `__duel` |
| **Modo Chatarra Alineada (Match-3)** | `src/match3.ts`, `src/match3_logic.ts`, `src/match3_scene.ts` | Gabinete arcade 3D, grilla 8×8 determinista |
| **Balance ("La Biblia")** | `src/balance.json`, `src/balance.ts`, `scripts/balance-*.mjs` | `BAL`, `costos()`, `precio()`, `xpNeed()` |

## 3. Lectura Focalizada y Mantenimiento del Grafo
1. Una vez ubicado el símbolo y rango de líneas con `graphify`, usa `view_file` con `StartLine` y `EndLine` precisos.
2. Revisa si existe un documento de arquitectura o GDD vigente en `docs/` (`docs/ART_DIRECTION.md`, `docs/BATTLE_ARCHITECTURE.md`, `docs/DEMOLICION_GDD.md`, `docs/SURVIVAL_EXPERIENCE_PLAN.md`, `docs/MATCH3_ARCADE.md`).
3. **Al finalizar cualquier tanda que modifique código:** ejecuta `graphify update .` para mantener el grafo sincronizado (solo AST, sin costo de API).
