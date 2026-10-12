# R1: primera vertical slice jugable de ENCORE (1 jugador)

Fecha 2026-10-11. Sobre la auditoría R0 (`R0_SURVIVOR.md`, `R0_LUNA_CAMARAS_INPUT.md`, `R0_MENU_SAVE_RED_TESTS.md`). Alcance: solo, sin cooperativo, sin red, sin MultiScreen, sin guardado de run a mitad. Todos los valores de balance son provisorios.

## Qué se hizo

Bucle jugable completo, de punta a punta, verificado en headless (ver pruebas):

1. **Escenarios encadenados en la Luna.** A los `teleS` s del escenario aterriza el cohete de `moon_goals.ts`, que ahora es el **teleportador**: en ENCORE, abordarlo ya no llama `endRun(true)` sino que abre la decisión QUEDARSE / AVANZAR con ventana visible (barra + segundos, botones Z/X o clic/toque, cruceta del joystick). Quedarse: `stayS` s más con la amenaza subiendo al doble de ritmo y después la decisión vuelve a abrirse (durante la estadía se puede AVANZAR YA). Si vence la ventana de decisión, el show avanza solo.
2. **Avanzar** limpia el escenario (enemigos, gemas, pickups, ácido, naves, eventos, objetivos, cohete) y lo rearma con semilla derivada `stageSeed(runSeed, loop, escenario)`, **conservando** auto, armas, pasivas, nivel, XP y vida. La dificultad sube por escenario sumando segundos virtuales al reloj de dificultad (`paceOf`), aplicados en vida de los bichos, tasa y tope de aparición, tabla de bichos, formaciones y enjambres.
3. **Contador de escenario** en el HUD, dentro del reloj (`ESCENARIO 2/4`, en celular `ESC 2/4`; con otra vuelta suma `· VUELTA 2`). El reloj principal muestra el tiempo total de la expedición.
4. **Votación tras el escenario 4** ("BAMBALINAS": arena vacía sin apariciones, ventana `voteS` s): **¡ENCORE!** (loop+1, vuelve al escenario 1, más difícil) o **FINAL ACT**. Si vence, ¡ENCORE!.
5. **FINAL ACT:** arena lunar vacía, entra la `aspiradora` tras `bossIntroS` s. Derrotarla (las dos barras) es victoria: `endRun(true)` con la frase del Director en la pantalla de resultados. Es el único jefe que cierra la partida en ENCORE (`finalKind`; el gusano lunar no sale).
6. **Director mínimo.** Frases cortas por el aviso de radio existente (`banner`, tag DIRECTOR) al empezar, al aterrizar el teleportador, al abrirse la decisión, al quedarse, al avanzar, en la votación, en ENCORE!, en FINAL ACT, al entrar el jefe y al ganar. Presentador de show, sin revelar identidad. La variante sale del escenario, nunca del `rng()` de la partida (Director Bible: "la elección de voz no consume el RNG").
7. **Supervivencia intacta.** Todo cuelga de `erun` (null en Supervivencia), `paceS = 0` y `calm = false`: las expresiones numéricas quedan idénticas.
8. **Menú:** `#scr-encore` sin "Modo en construcción"; una línea describe el bucle.
9. **Dev:** `?encore[&seed=N]` arranca ENCORE directo; hooks `__enc.info()/land()/board()/pick(0|1)/tick(s)`.

## Archivos tocados

- `src/encore.ts` (nuevo): estado puro y fases (`newRun`, `tick`, `boarded`, `pick`, `bossDown`, `ask`, `tag`, `paceOf`, `stageSeed`, `sceneIdx`), constantes `ENC` con `ponytail:` y frases del Director.
- `test/encore.test.ts` (nuevo): 8 pruebas del flujo.
- `src/main.ts`: estado `erun/encPrior/paceS` (:222, :251), `encPlan/encEnter/encApply/encPick` (:314-360), `startRun` (:293, :304), `endRun` (:378), `kill` (:771), `GOAL_IO.win` (:807), `update` (:814-815 y compuertas `calm`: aparición, `lunaEv`, `skyTick`, `shipsTick`, `goalsTick`; `tp` en aparición/formaciones/enjambre; `spawnEnemy` con `paceS`), jefe `boss_intro` (:1035) y sin `rocketLand` en ENCORE (:1050), teclado Z/X (:1351), HUD (:1458), cruceta (:1604), hooks dev (:1870).
- `src/moon_goals.ts`: `GOAL_IO.tele` (el rótulo de la barra dice TELEPORTADOR · ACTIVANDO).
- `src/ui.ts`: `hudEnc()`.
- `index.html`: `#encTag` en el reloj, `#encAsk`, texto de `#scr-encore`.
- `src/hud.css`: estilos de `#encTag` y `#encAsk` (tokens `--jm-*` con respaldo, sin emojis).
- Cambios sin commitear del usuario (index.html, main.ts, menu.ts, menu.css): no se revirtieron; se trabajó encima.

## Pruebas y resultados reales

- `npx tsc --noEmit -p .`: sin errores.
- `npx vitest run test/encore.test.ts`: 8/8.
- `npm test`: 11 archivos, 89/89.
- **Supervivencia igual que antes:** `npm run sim -- --seeds 1,2 --secs 600` en este árbol y en un worktree temporal de `HEAD` (ya borrado): resultado idéntico. Semilla 1: 166.9 s, nv 4, 24 bajas, gomitas3 helado1; semilla 2: 600 s, nv 36, 2068 bajas, petardos5 trompo3 chispero3 globos5 bengalas1 clips1. (El árbol de trabajo tiene cambios del usuario que no tocan la ruta del sim.)
- **Recorrido completo en headless** (Chromium del repo contra rc-test, `?mute&encore&seed=3`, script en scratchpad, no versionado): abordaje real del cohete (7 s dentro de la zona) → decisión abierta con 18 s → QUEDARSE → estadía vencida vuelve a preguntar con `stays: 1`, `stayT: 60` → AVANZAR → escenario 2 (`seed` derivada, `pace: 120`, nivel y vida conservados, `prior` suma el tiempo anterior) → escenarios 3 y 4 → votación (`enemies: 0`) → FINAL ACT → entra `aspiradora` a los ~12 s → `__killBoss` x3 → pantalla "VICTORIA" con el texto "¡GANADORES! NO CONFUNDAN ESTO CON HABER ESCAPADO. ¡La aspiradora robot quedó sin batería y sin propósito de vida!". 0 errores de consola, en PC (1280x720) y celular (390x844). Capturas vistas (decisión, votación, jefe) y el HUD se lee bien en ambos.
- **Menú real:** Jugar → ENCORE → Largar arranca en la Luna con `erun` activo (verificado por DOM y `__enc.info()`).

## Lo que no se verificó

- Una partida real a mano de 40 minutos: los tiempos (`teleS`, `stayS`, `paceStageS`) no tienen playtest. El bot (`__sim`) no entiende ENCORE.
- Si se muere o vence una ventana mientras hay cartas de nivel abiertas: los relojes de fase se detienen con `state === "level"` (diseñado así), no se probó el borde.
- Cruceta del joystick (14/15) y toque de los botones: por código, no con dispositivo.
- Balance del FINAL ACT: la aspiradora no escala con la vuelta ni con el equipo.
- Perf con loops largos (no hay acumulación conocida: cada escenario libera lo suyo, pero no se midió).

## Riesgos y atajos deliberados

- El teleportador **reutiliza el modelo del cohete** (`obj_cohete`): visualmente sigue siendo un cohete. Ubicación fija a `luna_cohete_dist` (80 m) en dirección aleatoria; el radar marca el cohete desde que aterriza: no hay búsqueda con pistas (D-026) todavía.
- El escenario nuevo es **la misma esfera lunar** sin cráteres (`moonReset`), con el auto donde estaba: no hay otra geografía ni transición visual (solo sacudida y el aviso). La "arena exclusiva" del FINAL ACT es esa misma luna vacía.
- El reloj de escenario se reinicia en 0 (`time`) y la dificultad va aparte (`paceS`); `endRun` suma `encPrior`, así que `save.best` y el logro "diez" (10 min) cuentan el tiempo total de la expedición, mezclado con Supervivencia. Decidir si ENCORE debe tener su propio récord.
- Un solo jefe final fijo (`aspiradora`, R0 §10); el sorteo secreto entre `FINALS` (D-029) queda pendiente. Los jefes finales ignoran `hpMul` y no escalan por vuelta.
- Z/X para decidir, no 1/2: 1/2 eligen carta y un mismo golpe de tecla cruzaría ambas acciones.
- El texto del recuadro de controles del arranque sigue diciendo "sobrevive 10 minutos" (no se tocó).
- El aviso de radio es una cola de 3 con ~5 s por mensaje; con muchas frases seguidas (votación → FINAL ACT) llegan con retraso. Si el Director habla demasiado, bajar `secs` o priorizar.
- Los 4 escenarios, voto y final son lineales: no hay rutas ramificadas (D-005) ni chatarra compartida, pactos, cofres especiales ni memoria entre runs (el playbook pide guardar 1 memoria).

## Siguiente lote sugerido

1. Playtest con las 3 preguntas del playbook y ajustar `ENC` (sobre todo `teleS`, `stayRamp`, `paceStageS`).
2. Teleportador propio (modelo, pistas progresivas y evento de carga de 'defensa' al activarlo) en vez del cohete.
3. Guardado de checkpoint al completar escenario (`savefmt.ts`/`Save`), reanudar y récord propio de ENCORE.
4. Segundo bioma o variaciones de la luna por escenario y arena propia para el FINAL ACT; sorteo del jefe secreto con pistas.
5. Director: memoria entre runs (1 evento real guardado), estados de ánimo y cola de prioridad en lugar del `banner` simple.
