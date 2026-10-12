# Auditoría T28: `src/main.ts` (2546 l) y `src/weapons.ts` (869 l)

Fecha 2026-10-12. Solo lectura; líneas aproximadas (pueden correr ±10).

## Conclusión corta

- **Código muerto real: casi nada.** Se revisaron ~30 variables de estado sueltas (`jingleT`, `fpsT`, `dustT`, `moteT`, `netBytes`, `encLog`, `saidSecrets`, `pactOff`, `lampBoost`, `evtPre`, …): todas se leen y se escriben. No hay flags sin uso.
- **`weapons.ts` está bien**: una clase por arma (~40-70 l cada una), tablas en `balance.json`. No partir.
- **El problema de `main.ts` es tamaño y estado global, no sobre-ingeniería**: ~120 `let` de módulo y `update()` de ~540 l. La ganancia está en partir, no en borrar.

## (a) Qué borrar

| Prioridad | Qué | Dónde | Nota |
|---|---|---|---|
| Baja | `class Lanza { update() {} }` | weapons.ts ~318 | Es un marcador: su efecto vive en la embestida de `main.ts` (~1356, ~1632-1644). Se puede dejar; borrarla obliga a otro camino en `makeWeapon`. **No tocar.** |
| Baja | `__minis`, `__ants`, `__carObj`, `__scene` | main.ts ~2510-2520 | Hooks dev; verificar con `grep -r "__ants\|__minis\|__carObj" scripts/` antes de borrar. Si ningún script los usa, fuera. |
| Baja | `netBytes` | main.ts 518, 545, ~2464 | Solo para `test:net`. Mantener si `test:net` sigue vivo. |

Nada más con evidencia de estar muerto. No se encontró `TODO`/código comentado relevante.

## (b) Qué simplificar

1. **`update()` (main.ts ~1312-1850, ~540 l)**: partir en funciones internas por fase sin mover estado: `tickEncore`, `tickWeather` (ciclo de luz + lluvia ~1318-1340), `tickDrive` (manejo, polvo, trucos ~1390-1450), `tickRam` (embestida + Lanza ~1620-1650), `tickSpawner`, `tickPickups`. Riesgo bajo, mejora lectura; mismo orden de llamadas = mismo resultado.
2. **Estado suelto de la partida (~100-160, 266-276, 1851-1856)**: agrupar en un objeto `run = { time, kills, xp, level, ... }` que `clearRun()` (~238) recrea entero. Elimina la clase de bug "olvidé resetear X en clearRun". Riesgo medio (muchas referencias); hacerlo después de partir.
3. **Lanza**: la lógica de embestida lee `BAL.armas.lanza` directo desde main. Aceptable; si se mueve, `Lanza.ramMul(st)` en weapons.ts. Opcional.
4. **`__info` (~2484)**: una sola línea de ~400 caracteres con ternario triple; partir por estado. Cosmético.

## (c) Partición propuesta de `main.ts`

Patrón: cada módulo exporta funciones y recibe un `ctx` (o importa un `run-state.ts` con el estado compartido). Empezar por lo que menos estado comparte.

| Orden | Módulo nuevo | Contenido (líneas aprox.) | ~l | Depende de (cruza) | Riesgo |
|---|---|---|---|---|---|
| 1 | `dev-hooks.ts` | `devReady`, objeto `window.__*` (~2369-2546), `botStep` + `DUEL_TEAMS` (~2320-2368), `LAB`, `dmgBy`, `god` | ~230 | Casi todo el estado (lee/escribe `time`, `weapons`, `enemies`, `state`, `startRun`, `toMenu`, `gainXp`...). Pasarle un objeto `api` con getters/setters, o dejar el `Object.assign(window, …)` en main y mover solo `__sim`/`__encBot`/`__bossDuel`/`__lab` como funciones. | Medio: scripts e2e/sim/shots dependen de estos nombres exactos. Solo build dev (`import.meta.env.DEV`) → bonus: sale del bundle de producción con import dinámico. |
| 2 | `net-client.ts` | `net*`, `NET_HZ`, `netSnap`, `netHostMsg`, `netClientMsg/Begin/Tick`, `netEnd/Back/Host/Join`, `netShots`, pools (~507-695) | ~190 | `players`, `enemies`, `weapons`, `state`, `offers/cardBy`, `startRun`, `choose`, `applyCommand`. | Medio: online. Interfaz clara (Msg/Snap ya tipados). |
| 3 | `encore-run.ts` | `erun`, `dirq`, `encPrior`, `paceS`, `pfx`, `encExtra/encG`, `encLog`, `tip`, `say`, `encPlan`, `encEnter`, `moonPt/moonPlace/carPlace`, `ARRIVE`, `encScene`, `finalArena`, `minorShip`, `encApply`, `encSecrets`, `encPick`, `votes/encVote` (~266-500) | ~230 | `lead`, `runSeed`, `time`, `kills`, `runScrap`, `recompute`, `spawnEnemy`, `persist`, `state`. `update()` llama `E.tick/dirTick` (~1315). | Medio-alto: es el modo más nuevo y con más estado cruzado. |
| 4 | `coop.ts` | `TOP/BOTTOM/QUAD`, `vpOf`, `mate*` (~696-836), `hurtP`, `coopHp/coopRate` | ~140 | `players`, `lead`, `st`, `abil/abilOn`, `god`, `hurt`. | Bajo-medio. |
| 5 | `outro.ts` (o dentro de `replay.ts`) | `endRun`, `grant`/`runAch`, `outroAt`, `ts/outroZ/outroT/...`, `startOutro`, `outroTick`, `endOutro`, `skipOutro`, `goEndless` (~837-940, ~1947) | ~110 | `bank`, `save`, estadísticas de partida (`bestStreak`, `kills`...), `openOver`, `toMenu`, `cam`. | Bajo: flujo lineal, fácil de ver en shots (`__outro`). |
| 6 | `bestiary-preview.ts` | `previewKey`, `pedTpl`, `PED_H`, `BATK`, `DOG_LANE`, `TAR_JUMP`, `beast`, `beastTick` (~2016-2305) | ~290 | Solo menú: `scene`, `cam`, `shot`, `SHOTS`. Comparte poco con la partida. | **Bajo, el mejor primer candidato junto a dev-hooks.** |
| 7 | `loading.ts` | tareas `T_*`, `worldTask`, `afterFrames`, `launchRun`, `loadKart/Duel/Match3`, `go*/enter*` (~1076-1185) | ~110 | `scene`, `state`, `music`, `reset`. | Bajo. |

Queda en `main.ts`: bootstrap del motor (~1-95), estado de partida, `startRun/clearRun`, combate (`damage/explode/kill/spawnEnemy` ~1186-1311), `update()`, HUD (~1957-2001), cámara (~2002-2015) y el loop de cuadro (~2306). Estimado final: ~1100-1200 l.

### Dependencias que cruzan (el riesgo real)

- `state`, `lead`, `players`, `enemies`, `weapons`, `time`, `simulating`, `save` los usan casi todos los módulos. Opción mínima: `run-state.ts` exporta un objeto mutable `S` con esos campos; los `let` pasan a `S.x`. Es el cambio con más líneas tocadas: hacerlo **una sola vez**, mecánico, antes de mover módulos 2-5.
- Ciclos de import: `encore-run` y `net-client` necesitan `startRun`/`spawnEnemy` de main. Evitarlo pasando callbacks en un `init(ctx)` en vez de importar main.
- `update()` llama a encore, coop, outro y net: queda como orquestador.

## Cómo verificar sin cambiar comportamiento

Antes de tocar nada, guardar línea base; repetir tras cada módulo movido (un módulo por commit):

```bash
npx tsc --noEmit -p .
npm test
npm run sim -- --seeds 1,2,3 --secs 600 --json > /tmp/base-sim.json
npm run sim -- --encore --seeds 1,2 --json > /tmp/base-enc.json
npm run sim -- --duel perro,aspiradora --seeds 1,2 --json > /tmp/base-duel.json
npm run e2e
npm run shots -- --diff        # solo para 5 (outro) y 6 (bestiario): sesiones de resultados y bestiario
```

- Comparar `diff` de los JSON de `sim`: deben ser **idénticos** (misma semilla = mismo resultado; `sim` fija `Math.random`). Cualquier diferencia = cambió el orden de llamadas en `update()`.
- `net-client`: además `test:net` si existe en `package.json`.
- `dev-hooks`: `e2e`/`shots`/`sim` ya ejercitan `__sim`, `__encBot`, `__bossDuel`, `__tick`, `__lab`; si pasan, los hooks siguen enchufados.
- `npm run build` al final (si dev-hooks pasa a import dinámico, confirmar que el bundle de prod baja de tamaño).

## Orden recomendado

1. `bestiary-preview.ts` y `dev-hooks.ts` (poco estado compartido, ~520 l fuera).
2. Partir `update()` en funciones internas (sin mover archivo).
3. `run-state.ts` mecánico.
4. `outro`, `loading`, `coop`, `net-client`, `encore-run` en ese orden.

`weapons.ts`: no requiere cambios.
