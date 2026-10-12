# R0 — Menú, modos, guardado, red, tests y herramientas

Auditoría de solo lectura (ENC-004, ENC-005). Referencias `archivo:línea` medidas sobre el working tree del 2026-10-11, que incluye cambios sin commitear que **siguen moviéndose** mientras se audita (ver §7): los números de línea pueden correrse unas pocas líneas.

## 1. Menú (`src/menu.ts`, `index.html`)

- Tipo de pantallas: `export type Scr` (`menu.ts:201`) = `title | main | garage | shop | config | bestiary | beast | credits | daily | pause | over | race | duel | match3 | play | modes | encore` (`encore` es nuevo, sin commit).
- Pila de pantallas: `const stack: Scr[]` (`:202`), `go(s)` empuja y llama `show()`, `back()` saca, `reset(s|null)` reemplaza la pila (`null` = en juego, sin menú). `show()` (`:208`) alterna `.scr.on` por `id="scr-<nombre>"` y llama al `render*` de cada pantalla (`renderMain`, `renderPlay`, `renderDaily`, `renderGarage`, `renderShop`, `renderRace`, `renderBestiary`, `renderConfig`). **Las pantallas son `<section id="scr-X">` estáticas en `index.html`**; no hay router ni registro: agregar pantalla = nueva `<section>` + nombre en `Scr` (+ `render` opcional en `show()`).
- Un único listener delegado `fe.addEventListener("click")` en `initMenu` (`menu.ts:1520`+) despacha por `data-go` (navegar) o `data-act` (acción). Acciones de lanzamiento: `race`, `battle`, `duelgo`, `match3go`, `play`/`playgo`, `playmenu`, `daily`, `endless`, `encorego`, `resume`, `quit`.
- Contrato menú→juego: `type Api` (`menu.ts:173`) = `{ scene, play(daily?, encore?), resume, quit, pause, endless, race, battle, duel, match3 }`. `main.ts:635` lo cumple con `initMenu({ scene, play: launchRun, resume, quit: toMenu, pause, endless: goEndless, race: () => goRace(), battle: () => goRace(true), duel: goDuel, match3: goMatch3 })`.
- `index.html` menú principal (`#scr-main`, `:136`): `Jugar` (primary), `Desafío diario` (`data-go="daily"`), `Más modos` (`data-go="modes"`), Garaje, Taller, y links Chatarroteca/Configuración/Créditos/Instalar. `#scr-modes` (`:~182`) lista Carrera (`data-go="race"`), Demolición (`data-go="duel"`), Junket Crush (`data-go="match3"`). `#scr-play` = ficha de largada de Supervivencia (zona, maldiciones ocultas, `playgo`).
- `refreshModes()` (`menu.ts:432`): se llama desde `show()` para `modes` y `match3`. Rellena `#progRace` (pistas completadas/medallas, desde `bestRace`, `medalOf`, `raceCfg`), `#progM3` y `#m3Brief` (nivel y estrellas de Junket Crush; lee `localStorage["rc_match3_v1"]` con respaldo en `save.m3.stars`, `:445`). Es solo texto de progreso, no lanza nada.
- Entrada/foco: teclado, gamepad (`menuPad`, `menu.ts:361`) y mouse comparten `move()` por foco espacial; `activate()` hace `el.click()`. Toda pantalla nueva con `button` queda navegable gratis.

## 2. Cómo arranca cada modo (`src/main.ts`)

Estado global: `let state: "menu"|"play"|"level"|"pause"|"over"|"outro"|"race"|"duel"|"match3"` (`main.ts:86`). No hay máquina formal: cada `go*/enter*` fija `state` a mano.

| Modo | Menú | `main.ts` | Notas |
|---|---|---|---|
| Supervivencia | `playmenu`→`#scr-play`→`playgo` → `api.play()` | `launchRun(d, enc)` `:568` → `launch([T_BICHOS,T_AUTOS,T_PLANTILLAS,worldTask(zoneFor(d)),T_EFECTOS], "Encendiendo el auto", () => startRun(d))` → `startRun` `:248` | Semilla: `forceSeed \|\| ?seed= \|\| (daily ? dailySeed() : newSeed())` (`:257`), `seedRng(runSeed)`, `makeProfile(runSeed)` (clima/plaga/minijefes). Cierre `endRun` `:325`, `toMenu` `:406` |
| Diario | `data-go="daily"` → `act=daily` → `api.play(true)` | `launchRun(true)`; zona forzada "patio", semilla `dailySeed()` = fecha AAAAMMDD (`menu.ts:386`) | Récord en `save.daily` (`main.ts:~351`) |
| Sin fin | botón `endless` en `#scr-over` | `goEndless` `:1357`: vuelve a `state="play"` sobre la misma run | Récord `save.endless` |
| Carrera / Batalla de globos | `data-go="race"` → `act=race`/`battle` | `goRace(battle)` `:579` → `loadKart()` (import dinámico `./kart`) → `enterRace` | `state="race"`; `onExit` vuelve a `reset("main")` |
| Demolición (duelo) | `data-go="duel"` → `act=duelgo` | `goDuel` `:606` → `loadDuel()` (`./duel`) → `enterDuel` | `state="duel"` |
| Junket Crush (match3) | `data-go="match3"` → `act=match3go` | `goMatch3` `:618` → `loadMatch3()` → `enterMatch3`: `startMatch3(seed)`, seed = `?seed=` o 20261007 | `state="match3"` |
| Folded (banco) | solo dev: `?folded` | `main.ts:~640`: reusa `state="match3"` y `folded_lab` | Sin entrada de menú (ponytail documentado) |
| ENCORE (nuevo, sin commit) | `Jugar`→`data-go="encore"`→`#scr-encore`→`act=encorego` → `api.play(false,true)` | `launchRun(false,true)` fija `encore=true`; `zoneFor` devuelve `"luna"` (`:247`) | Hoy es Supervivencia en la Luna; `encore` NO se limpia en `startRun`, solo lo reasigna cada `launchRun` |

Patrón común de los modos secundarios (reutilizable por ENCORE): `modeOpts() = { scene, cam, onExit }` (`:~600`), módulo en chunk aparte con `init*`, `clearRun(); menuOff(); state="x"; reset(null); $("hud").classList.add("hidden")`, y salida por `onExit → state="menu"; music("menu"); reset("main")`. Carga con `launch(tareas, etiqueta, go, frames)` de `loading.ts:123`.

Atajos dev (`import.meta.env.DEV`): `?race[&players=2]`, `?duel`, `?match3`, `?folded`, `?lab`, `?seed=N`, `?zone=`, `?mute`, `?tornillos=N` (solo localhost, `menu.ts:~71`); consola `__play(seed)`, `__sim(secs)`, `__bossDuel(kind, opts)`, `__bot`, `__tick(n)`, `__race`, `__duel`, `__match3`.

## 3. Guardado

- Un solo objeto `save: Save` (`menu.ts:70`) cargado con `parseSave(localStorage["rcfight2"], DEFAULT, deps)`. Tipo `Save` `menu.ts:33`; `DEFAULT` `:~53`. Todo el progreso de **meta** vive ahí: tornillos, mejoras (`perm`), autos, pilotos, logros, bestiario, `runs` (top 5 con `seed`), `daily`, `endless`, `m3`, controles, imagen.
- Escritura: `persist()` (`:82`, debounce 300 ms) → `flush()` (`:81`) = `localStorage` + respaldo IndexedDB `junkedmetal/kv/save` (`idb`, `:87`); `pagehide` hace flush; si localStorage está vacío y hay respaldo, restaura y recarga. Exportar/importar `.json` (`exportSave` `:103`, `importSave` `:110`) pasan por el mismo `parseSave`.
- **No hay run guardada.** El estado de una partida son ~decenas de `let` de módulo en `main.ts` (`time`, `level`, `weapons`, `passives`, `enemies`, `hp`, `runSeed`, `profile`, `bank`, `driveMul`...); no existe snapshot, ni pausa persistente, ni retomar tras recargar. Lo único que sobrevive a una run es lo que `endRun` vuelca a `save` (`:338-352`: récord, `runs`, `daily`, stats, tornillos).
- Otras claves de localStorage (fuera de `Save`, sin versión ni migración): `rcfight-race` (`kart_cfg.ts:9`), `rcfight-times` (`kart_cfg.ts:16`), `duel_paint` (`duel_paint.ts:10`), `duel_build` (`duel_build.ts:279`), coach del duelo (`duel_fabricacion.ts:385`), `rc_match3_v1` (lectura en `menu.ts:445`). `loading.ts:44` lee `rcfight2` directo para pintar el auto de la pantalla de carga.

### `src/savefmt.ts` (109 líneas, sin DOM, con tests)

- `parseSave(raw, D, deps)`: `JSON.parse` en `try`; JSON roto → `structuredClone(D)`. Descarta arrays mal tipados (`seen, runs, cars, unlocked, ach`), valida ids contra `deps` (habilidades, armas, maldiciones, tipos de bicho, zonas), acota rangos (`num`, `one`), calcos, colores `#rrggbb`, `m3`. Devuelve `{...D, ...s, ...mezclas}` (los campos nuevos toman el DEFAULT solos).
- **Migraciones: NO hay `schemaVersion` global.** Son banderas sueltas, de una sola vez, por campo: `lookv !== 6` (estilo cartoon), `gfxv >= 1` y `gfxv >= 2` (Imagen v1/v2), más migraciones implícitas de controles (`binds`, tecla suelta → ranura) y `taa→fxaa`. Patrón: `if (!(s.gfxv >= N)) { ...transformar...; s.gfxv = N }`.
- Implicación ENCORE: el diseño pide `schemaVersion`, `checksum`, `revision`, escritura atómica (`04_SAVE_AND_STATE.md`). Hoy no existe nada de eso; el patrón más barato es sumar un campo propio (`encore?: {...}`) con su validador dentro de `parseSave` y una bandera `encv`.

## 4. RNG

- `src/rng.ts` (12 líneas): mulberry32 con estado de módulo único `s`. `seedRng(n)`, `rng()`, `newSeed()` (usa `Math.random`). `main.ts:75` siembra con 20260929 para el patio fijo; `startRun` re-siembra con `runSeed`.
- **Un solo stream global**: todo lo que decide la partida (spawns, drops, cartas, `makeProfile(seed, r = rng)` en `run.ts:91`) consume la misma secuencia. El orden de llamadas importa; agregar un `rng()` en medio cambia toda la run. `Math.random` queda solo para lo visual (CLAUDE.md); aun así `scripts/sim.mjs` lo reemplaza por un generador con semilla (`seedMath`) por si acaso.
- Gap para ENCORE: el diseño pide `rngStreams` (varios flujos) y snapshot de estado RNG; hoy `s` no se exporta (no hay `getState/setState`) y no hay streams nombrados. `makeProfile` ya acepta `r` inyectable, patrón aprovechable.

## 5. Red / multijugador

- **No existe red.** `grep` de `WebSocket|RTCPeer|WebRTC|EventSource|BroadcastChannel` en `src/` = 0 resultados. Único `navigator.serviceWorker.register("./sw.js")` (`menu.ts:1494`, solo producción) para PWA/offline. No hay signaling, STUN/TURN, servidor, ni capa de transporte.
- Local multijugador: solo Carrera con 2 jugadores en pantalla dividida en compu (teclado + joystick; en táctil siempre 1, decisión del usuario, CLAUDE.md). Supervivencia es 1 jugador y estado global de módulo (un `car`, un `hp`, un `weapons`), sin concepto de `participantId` ni input router.
- Todo `02_NETWORKING_AND_MIGRATION.md` (host autoritativo, epochs, rejoin, votos) es construcción desde cero. `main.ts` no es una simulación separable del DOM/Babylon (`sim.mjs` lo admite: "no corre en Node puro"), así que host autoritativo con dominio puro implica extraer lógica primero. Recomendación R0: ENCORE R1-R4 en **local 1-4 jugadores sin red**, con la capa Domain pura (tipos `Command/DomainEvent` de `01_ARCHITECTURE.md`) y diferir transporte; no se justifica server/WebRTC hasta que el dominio sea testeable en Node.

## 6. Tests y herramientas

**Vitest** (`npm test` = `vitest run`; CI `.github/workflows/pages.yml` corre `npm ci`, `npm test`, `npm run build` antes de publicar). 10 archivos en `test/` (~760 líneas), todo lógica pura sin DOM/Babylon:

| Archivo | Cubre |
|---|---|
| `save.test.ts` | `parseSave`: JSON roto, tipos, ids, rangos, migraciones lookv/gfxv, controles, perfiles, taller, colores |
| `run.test.ts` | `rng` (misma semilla = misma secuencia), `makeProfile` determinista |
| `balance.test.ts`, `importer.test.ts`, `stats.test.ts` | `balance.json`→`BAL`, importador de planilla, `passiveStats`/XP/pilotos |
| `match3.test.ts`, `match3_balance.test.ts` | lógica y campaña de Junket Crush (bot codicioso) |
| `moon.test.ts`, `moon_events.test.ts` | ayudantes de la Luna y eventos (lluvia, erupción) |
| `duel_build.test.ts` | plantillas de construcción del duelo |

No hay tests de: `menu.ts` (flujo de pantallas), `main.ts`, `kart`, `weapons`, `enemies`, ni e2e. `tsc --noEmit` va dentro de `npm run build`.

**`scripts/`** (headless Chromium Playwright con GPU real, contra pm2 `rc-test` :5174 vía `npm run test:restart`; `scripts/lib/browser.mjs` fija banderas ANGLE/Metal y `freeze` 1/60 s):
- `sim.mjs` (`npm run sim`): partidas completas del bot y duelos de jefe (`--duel`, `--seeds`, `--secs`, `--zone luna`, `--par`, `--json`); usa `__play`/`__sim`/`__bossDuel`. Determinista por semilla con carga limpia. `src/devbot.ts` (103 líneas, solo dev): `botSteer`, orbita el patio, esquiva, elige mejoras; **asume Supervivencia** (un jugador, `HALF`).
- `shots.mjs` + `scenarios.mjs` (395 líneas): 163 capturas por sesión (menu, taller, lab, partida, tactil, carrera, duel, match3, folded, luna...); `--diff/--update/--changed/--only/--vp`. `scripts/lib/changed.mjs` mapea archivos tocados→sesiones (`menu|kit.css|loading|intro`→`menu, taller`; `main.ts`→`menu, lab, partida, carrera`). Un `scr-encore` nuevo no tiene sesión propia.
- `perf.mjs`: ms/cuadro, draws, triángulos, heap → `.perf/*.json`. `duel-playtest.mjs`, `bench-check.mjs`, `cinematic-check.mjs`, `doctor.mjs`, `balance-*.mjs`, `creative-*.mjs`/`comfy-status.mjs` (arte), `assets-optimize.mjs`, `test-restart.mjs`.

Baseline R0 (ENC-005): NO ejecutado en esta auditoría (solo lectura, y otro agente edita el árbol). Falta registrar `npm test`, `tsc --noEmit` y `shots --diff` como línea base antes de R1.

## 7. Cambios sin commitear del usuario (`git diff`, 4 archivos)

Dos oleadas independientes en el mismo working tree:
1. **Chatarroteca: filtros** (usuario): `index.html` suma `<div id="bfilts" class="tabs hidden">`; `menu.ts` suma `let bfilt` (`todos|agiles|blindados|jefes`), botones `data-bfilt` solo en la pestaña Bichos, `isAgile` (`speed>=8.5`, no jefe) / `isArmored` (`mass>=5 || hp>=40`, no jefe), lista filtrada `filteredKinds`, handler `d.bfilt` y span `.b-kills`; `menu.css` suma `#bfilts`, `.b-kills`. Sin efecto en juego ni guardado.
2. **Efectos de manejo** (`main.ts`, `update()`): chirrido (`SFX.brakeScreech`) y humo `FX.tireFriction` al derrapar sobre cemento/tierra/garaje; chispas bajo el faro al rasar tambores (`heavyProps` importado de `world`). Solo cosmético, con `Math.random` y `!simulating`.
3. **Enganche ENCORE ya iniciado** (detectado durante la auditoría, probablemente otra sesión): `Scr` suma `"encore"`; `Api.play(daily?, encore?)`; `index.html` cambia el botón primary de `playmenu` a `data-go="encore"` y agrega `#scr-encore` (botón `encorego`); `main.ts` suma `let encore`, `zoneFor` → `"luna"` y `launchRun(d, enc)`. **Efecto colateral**: `Jugar` ya no abre `#scr-play`; Supervivencia (zona, curse, kit) queda inalcanzable desde el menú porque ningún otro botón apunta a `data-go="play"`/`playmenu`. Verificar si es intencional.

## 8. Recomendaciones

**ENCORE como modo PRINCIPAL del menú, Survivor secundario**
- Lo ya puesto (botón `Jugar` → `scr-encore` → `encorego`) es el camino correcto y mínimo. Falta: (a) botón "Supervivencia" visible (en `#scr-main` o dentro de `#scr-modes`, que ya agrupa los modos secundarios con descripción y progreso vía `refreshModes`) que haga `data-act="playmenu"`; (b) en `show()` un `if (s === "encore") renderEncore()` cuando haya estado (¿run en curso?, récord); (c) que `launchRun` no reutilice el mismo flag `encore` suelto: mejor pasar un `mode: "survivor"|"encore"` a `startRun` y limpiarlo en `clearRun`/`toMenu` (hoy `__play` y `Diario` dependen de que el último `launchRun` lo haya reseteado).
- Para ENCORE real (Director, rutas, 1-4 jugadores) conviene módulo propio `src/encore/` en chunk dinámico como `duel`/`match3`/`kart` (`loadEncore()` + `initEncore(modeOpts())` + `enterEncore()` con `state="encore"`), y que Survivor siga como adaptador de combate (CLAUDE.md lo llama "Adapters: combate y spawn de Survivor"). Extender `state` de `main.ts:86`, `Api` (`menu.ts:173`), `changed.mjs` (regla `encore`→sesión nueva) y `scenarios.mjs` (sesión `encore_menu`).
- Pruebas mínimas al cerrar el enganche: `npx tsc --noEmit -p .`, `npm test`, `npm run shots -- --only menu` (y diff), y comprobar con click que Supervivencia, Diario, Carrera, Demolición y Junket Crush siguen lanzándose.

**Punto mínimo para guardar el estado de una run ENCORE**
- Dónde: dentro de `Save` (`menu.ts:33`), campo opcional `encoreRun?: EncoreRunSnap | null`, validado en `parseSave` con bandera `encv` (mismo patrón que `gfxv`). Así reutiliza `persist()`, el respaldo IndexedDB y export/import sin infraestructura nueva. Reglas del diseño aplicables hoy: `schemaVersion`, `runId`, `runSeed`, `revision`, `savedAt`, `activeDuration`.
- Cuándo (confirmado por `04_SAVE_AND_STATE.md`): **solo al completar un escenario, antes del viaje** (autoguardado confirmado), no a mitad de combate. Por eso el snapshot mínimo es chico: `runSeed`, índice de escenario/loop, `scrap`, inventario/armas/pasivas por `instanceId`, XP/nivel, pactos, `bossId` secreto, flags de secretos y estado RNG.
- Prerrequisito técnico: exportar estado de `rng.ts` (`getRngState/setRngState`) o, mejor, derivar un stream por escenario `seed = hash(runSeed, stageIdx)` (más simple y sobrevive a cambios de orden). Con eso no hace falta serializar el RNG global.
- Serialización del equipo: `main.ts` ya tiene `__team()` (`weapons.map(w => [id, lv, evolved])` + `passives`) y `DUEL_TEAMS`/`makeWeapon` para reconstruirlo, que es el formato de snapshot más barato que ya existe.
- Atomicidad: `flush()` escribe todo `save` de una vez (localStorage síncrono): suficiente para un solo jugador local. El commit "temp + checksum + rename" del diseño solo hace falta con backend/multi-host (diferir).
- Test obligatorio: ampliar `test/save.test.ts` con migración/validación del snapshot (descarta `instanceId` duplicados, `scrap < 0`, `schemaVersion` desconocido) y un test de round-trip.

## 9. Resumen de riesgos
1. `Jugar` ya no llega a Supervivencia (§7.3). 2. `state`/`launchRun` con flags sueltos (`encore`, `daily`, `forceSeed`). 3. RNG global único, sin streams ni estado exportable. 4. `Save` sin `schemaVersion`; migración por banderas. 5. Cero red, cero dominio separable del DOM. 6. Sin tests de menú/flujo; baseline sin registrar.
