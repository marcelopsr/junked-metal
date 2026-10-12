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
- El escenario nuevo es **la misma esfera lunar** (`moonReset`), pero cada uno llega a otro lugar de la esfera y con otro ritmo de eventos (ver § Variantes). No hay otra geografía ni transición visual (solo sacudida y el aviso). La "arena exclusiva" del FINAL ACT es esa misma luna vacía.
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
4. Segundo bioma (las variantes de la luna ya existen, ver § Variantes; falta geografía propia y gusano como minijefe) y arena propia para el FINAL ACT; sorteo del jefe secreto con pistas.
5. Director: memoria entre runs (1 evento real guardado), estados de ánimo y cola de prioridad en lugar del `banner` simple.

## Variantes (escenarios que se sienten distintos)

Problema: los 4 escenarios de un ciclo eran la misma luna con el auto en el mismo lugar; solo cambiaban la semilla y la dificultad. Ahora cada escenario trae una **variante** (tabla `VARIANTS` en `src/encore.ts`, 4 filas de datos) que el Director anuncia por banner al llegar ("EL LADO OSCURO. SIN SOL NI PÚBLICO...", en vez de la frase suelta de `advance` / `encore`).

| Variante | Llega a | Cráteres extra | Meteoritos / erupciones / Sol y Tierra | Minijefe |
|---|---|---|---|---|
| LA TARIMA | la salida (polo, de día), sin mover el auto | 0 | x1 / x1 / x1 | el que elige la semilla |
| EL LADO OSCURO | lado oscuro (niebla negra, sin Sol: no lo lanza) | 5 de 4-8 m | x1,4 (más espaciados) / x0,55 (erupciones seguidas, alumbran) / x1 | nave abductora |
| CAMPO DE CRÁTERES | bajo la Tierra (mira hacia ella) | 10 de 5-11 m | x0,6 (llueve seguido) / x1,6 / x1 | caza rápido |
| SOL DE FRENTE | de frente al Sol (no hay noche) | 3 de 3-6 m | x1,2 / x1 / x0,55 (el Sol tira más) | nave bombardera |

- **Selección** (`variantOf(run)`): hash propio `mix` de (semilla, vuelta); sin gastar el `rng()` de la partida. Cada vuelta usa las 4 variantes sin repetir (Fisher-Yates determinista); en la vuelta 0 el escenario 1 es siempre LA TARIMA (es donde arranca el auto, no hace falta mover nada). La votación y el FINAL ACT no tienen variante (sin cambios).
- **Cráteres** (`craterPlan`): posiciones y radios del hash del escenario, nunca a menos de 14 m de la llegada; se aplican con `deform` tras `moonReset`. Máximo 10 para dejar sitio a los de meteoritos / gusano / naves bajo `DENT_CAP` (40).
- **Pegamento** (`main.ts`): `encScene()` (variante: ritmo, cráteres y llegada), `moonPlace()` (la misma lógica que `__luna.go`, que ahora la reutiliza), `minorShip()` (nave fija de la variante o la de `shipFor`).
- **Perillas nuevas** (neutras en Supervivencia, `x * 1`): `evPace(rain, quake)` en `moon_events.ts` y `skyPace(k)` en `moon_sky.ts`; se reinician en `evReset()` / `skyClear()`.
- **Dev:** `__enc.info()` suma `variant`.
- **Pruebas:** `test/encore.test.ts` (6 nuevas: sin repetir por vuelta, LA TARIMA primero, determinismo y variación por semilla, sin variante en votación / final, plan de cráteres, frases cortas sin voseo).
- **Verificado:** capturas headless en `scratch/encore-var-*.png` (LA TARIMA, SOL DE FRENTE, EL LADO OSCURO, CAMPO DE CRÁTERES), 0 errores de consola; Supervivencia igual que en `HEAD` (`sim --seeds 1,2 --secs 600`, patio y `--zone luna`).
- **Atajos y límites:** gusano lunar como minijefe de variante no entra (6000 de vida, pensado para el cierre de Supervivencia; el minijefe es una nave); el banner de la variante entra en la misma cola de 3 avisos de radio, así que se puede demorar unos segundos si la decisión llegó con avisos pendientes; la variante no cambia la dificultad (`paceOf` sigue siendo por escenario), solo el carácter; todos los multiplicadores son provisorios y sin playtest.

## Pactos (primera versión, un jugador)

Al elegir **AVANZAR** (teleportador o "AVANZAR YA" durante la estadía), si queda un escenario por jugar, el Director abre la fase `pact` antes de cargarlo: ofrece **2 pactos** o **RECHAZAR** (sin penalidad). Cada pacto = una ventaja y un costo, ambos en pantalla y con los mismos números que se aplican (el texto sale de la tabla: `fxText`). Se acepta uno o ninguno; la ventana (`pactS` = 15 s) vencida equivale a rechazar. Si vence la decisión del teleportador y el show avanza solo, **no hay oferta**; tampoco al pasar a la votación (tras el escenario 4), ni con menos de 2 pactos libres. Doc de diseño: `01_DESIGN/08_PACTS.md`; origen: `05_DATA/prototype_pacts.json`. Quedan fuera (necesitan cooperativo/secreto/máquinas): voto de equipo, privados hasta revelar, QUICK por segundos.

| Pacto | Dura | Ventaja | Costo |
|---|---|---|---|
| SALUD EN GARANTÍA | resto de la run | +35% daño | -30% vida máxima (recorta también la vida actual) |
| PRODUCCIÓN SORPRESA | próximos 2 escenarios | +50% XP | +30% enemigos (aparición, tope y enjambres) |
| DOBLE O CHATARRA | resto de la run | +50% tornillos (se cobran al terminar la partida) | +25% enemigos |
| PATROCINIO DEFECTUOSO | próximos 2 escenarios | +20% velocidad | +25% daño recibido |
| RETOQUE DE MAQUILLAJE | próximos 2 escenarios | repara 60% de la vida al aceptar | -20% daño |
| PROGRAMA NOCTURNO | próximo escenario | +2 vida/s | +40% enemigos |

- **Datos** (`src/encore.ts`): tabla `PACTS` (`gain` / `cost` con multiplicadores `Fx`: `dmg, speed, maxHp, xp, scrap, spawn, taken, regen`; `heal` instantáneo; `stages`, `Infinity` = resto de la run). Estado en el `Run`: `pacts: {id, left}[]` (`left` = escenarios que quedan contando el actual) y `offer`. Funciones puras: `pactOffer`, `pactFx`, `activePacts`, `fxText`; fases `pact`, eventos `pact_offer / pact_yes / pact_no`.
- **Selección determinista** (`pactOffer`): hash propio `mix` de (semilla, vuelta, escenario, pacto); no gasta el `rng()` de la partida; no repite pactos activos; quedarse no cambia la oferta.
- **Duración**: cada salida de escenario (`advance`, `vote`) descuenta uno; al llegar a 0 el pacto se va. Los de la run siguen tras ¡ENCORE!.
- **Aplicación** (`main.ts`): `pfx = E.pactFx(erun)` dentro de `recompute()` (daño, velocidad, XP, regeneración, daño recibido vía `st.armor`, vida máxima), `hordeK = horde * pfx.spawn` en aparición / tope / enjambre, `* pfx.scrap` en los tornillos de `endRun`, cura del `heal` en `encApply`. Todo neutro (x1, +0) en Supervivencia; `recompute()` también corre al cargar cada escenario para expirar pactos.
- **UI** (`ui.ts` `hudEnc`, `hud.css`, `index.html`): se reusa `#encAsk` (clase `pact`): dos cartas con nombre, VENTAJA en verde, COSTO en rojo y duración, barra de tiempo y botón RECHAZAR; en pantallas de hasta 520 px se apilan. Pactos activos como fichas compactas bajo el reloj (`#encPacts`: etiqueta + "N ESC" o "RUN", término completo en `title`).
- **Controles**: **Z / X** eligen el pacto 1 / 2 (como la decisión), **V** rechaza (C es cámara); mando: cruceta izquierda / derecha eligen, cruceta abajo rechaza; táctil: botones.
- **Director**: frases `pact_offer`, `pact_yes`, `pact_no` por el aviso de radio; tras aceptar o rechazar sigue el anuncio de la variante del escenario.
- **Pruebas**: `test/encore.test.ts` (8 nuevas: oferta de 2 distintos y estable, aceptar / rechazar / vencer, sin oferta con avance automático, hacia la votación o sin pactos libres, sin repetir activos, expiración por escenarios y persistencia tras ENCORE!, combinación de efectos, texto verdadero). Verificado solo con `tsc` y esa suite; **sin sim, capturas ni perf** (se hará al cierre del proyecto).
- **No verificado**: el aspecto de la oferta en compu y celular 390x844 (pendiente de captura), que la cruceta del mando y el toque funcionen en dispositivo, y que Supervivencia siga idéntico en `sim` (por diseño todo es x1 / +0 sin `erun`). Valores sin playtest (`ponytail:` en `PACTS`); `pactS` y los números se afinan con el playbook.
- **Límites**: acumular varios pactos de "enemigos" multiplica la presión (hasta x2,3 con los tres); no hay tope. Los pactos que suben la vida máxima no existen aún (al vencer SALUD EN GARANTÍA la vida máxima vuelve y suma la diferencia a la vida actual).
