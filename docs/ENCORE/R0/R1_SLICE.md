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

## Cofres

En cada escenario con variante (no en votación ni FINAL ACT) hay 3 cofres y 1 máquina de opciones repartidos alrededor de la llegada, a 40-110 m. Solo en ENCORE (`GOAL_IO.tele`); Supervivencia no cambia.

- **Colocación** (`shopPlan` en `moon_goals.ts`, llamada desde `encScene`): hash propio de (semilla, escenario), sin gastar el `rng()` de la partida; los 4 objetos van a ~90° entre sí con jitter, y la máquina cae en un cuadrante distinto en cada escenario.
- **Activación**: patrón zona + permanecer (radio 4,5 m, 1,6 s), con la barra del jefe como progreso (`goalBar`). Sin fondos: aviso cada 4 s y no avanza.
- **Cofre**: cuesta tornillos de la run (`chestPrice`: 30 x (1 + 0,6 por cofre abierto) x (1 + 0,25 por escenario)); se descuentan de `runScrap` y se ve en la barra. Abre `openChest()` (evolución o fusión si hay, si no cartas de nivel).
- **Máquina de opciones**: cobra 25 % de la vida actual (no abre con vida muy baja) y ofrece 3 cartas con `offersFor()`.
- **Modelos**: plantillas `obj_cofre_pago` y `obj_maquina` (instancias) más el aro de zona existente. Radar: puntos "obj" mientras no se usan.
- **Pegamento** (`main.ts`): `GOAL_IO.scrap / hpFrac / pay / offer`, `shopReset()` al iniciar ENCORE, `shopPlan` en `encScene`.
- **Verificado**: `tsc` y `vitest` (104 pruebas). **No verificado**: aspecto, balance de precios, sim ni capturas; sin prueba unitaria propia. Valores provisorios.

## Rutas

Al AVANZAR (tras la oferta de pactos, si la hay) y si queda un escenario por jugar, el Director abre la fase `route`: **2 destinos** (dos variantes distintas de `VARIANTS`) en `#encAsk`, con riesgo (COSTO) y recompensa (VENTAJA). Z / X eligen (mando: cruceta izquierda / derecha; táctil: botones); no hay rechazo. Con la ventana vencida (`ENC.routeS`, 15 s) se toma el primero. El escenario se carga recién al elegir (evento `advance`); también se pasa por la ruta cuando el teleportador avanza solo.

- **Datos** (`src/encore.ts`): cada `Variant` suma `risk` (texto) y `reward` (`Fx`: multiplicadores de XP o tornillos). Hoy: LA TARIMA +10% XP; EL LADO OSCURO +30% XP; CAMPO DE CRÁTERES +30% tornillos; SOL DE FRENTE +15% tornillos y +15% XP. El texto de la oferta sale de `fxText(reward)`, o sea de los números que se aplican.
- **Selección determinista** (`routeOffer`): hash propio `mix` de (semilla, vuelta, escenario siguiente, variante); no gasta el `rng()` de la partida.
- **Aplicación**: `Run.route` guarda el destino elegido; `variantOf` lo devuelve (cráteres, ritmo de eventos, llegada y nave salen de ahí) y `pactFx` multiplica su `reward` junto con los pactos. Se borra al salir del escenario (`reset`), así que vale solo en ese escenario. Sin ruta (votación, ¡ENCORE!, vuelta nueva) manda el sorteo de siempre.
- **UI**: reusa la forma de la oferta de pactos (`pacts` en `ask`), sin cambios en `ui.ts` / `hud.css` / `index.html`.
- **Director**: frase `route_offer` tras aceptar o rechazar el pacto (o sola); al elegir, el anuncio de la variante elegida.
- **Pruebas**: `test/encore.test.ts` (describe "rutas": 6 nuevas; los flujos existentes ahora pasan por `route`).
- **Límites**: los tornillos se cobran al terminar la partida con el `pfx` vigente (igual que DOBLE O CHATARRA), así que la recompensa en tornillos cuenta solo si el destino sigue activo al morir. No verificado: aspecto en compu y celular, ni juego real (solo `tsc` y `vitest`). Valores provisorios.

## R3

Solo en ENCORE; Supervivencia no cambia. Lógica pura en `src/encore.ts`, pegamento en `main.ts` / `ui.ts` / `hud.css` / `index.html`.

- **Eventos del teleportador** (`teleEvent`, `boarded`): al abordar sale `OVERLOAD`, `BOSS_GUEST` o `NINGUNO`, por hash propio de (semilla, vuelta, escenario), sin gastar el `rng()`. Probabilidad `eventP0 + eventStep * (vuelta * 4 + escenario)`, tope `eventMax` (0,20 + 0,08 por escenario, máx. 0,75); la mitad inferior es OVERLOAD y la superior BOSS_GUEST.
  - **OVERLOAD** (fase `overload`, `overloadS` = 25 s): `main.ts` fuerza `swarmT = 0` cada `overloadEvery` (6 s), así que reusa el enjambre existente, x`overloadK` (2,5) y tope `overloadMax` (80). Al vencer la carga, `tele_ready`.
  - **BOSS_GUEST** (fase `guest`): aparece uno de `GUESTS` (rey, cortadora, tarántula, gato) con `spawnEnemy`; sin reloj. `main.ts` detecta que la instancia salió de `enemies` y llama `guestDown` → `tele_ready`.
  - Durante el evento no se puede decidir; la barra de jefe y la de sobrecarga (`ask`) ya existentes lo muestran.
- **Cola del Director** (`newDirQ`, `dirPush`, `dirTick`, `PRI`): una frase a la vez, `dirGapS` (5 s) entre inicios, prioridad (hitos del show 3-5, avisos menores 1-2; empate por llegada), tope `dirCap` (4, se pierde la de menor prioridad) y caducidad `dirTtlS` (15 s). Se muestra en un subtítulo propio `#dirSub` (`ui.ts dirSub`, abajo al centro, placa de chapa como la radio), así que ya no compite con los avisos de radio. El anuncio de variante también pasa por la cola.
- **Memoria** (`save.encore`): se suman `lastLoop` y `lastCause` (causa = fuente de daño principal de la última derrota; "" si ganó), saneados en `parseSave` (letras, números y puntuación simple, máx. 40). Las expediciones (`runs`) y la mejor vuelta (`best.loop`) ya existían. `openingLine` arma la primera frase de la run: "Volvió quien cayó en la vuelta N…", "Otra vez aquí… mejor vuelta M" u "Otra vez aquí" (sin expediciones previas, la frase de siempre).
- **Pruebas**: `test/encore.test.ts` (eventos, cola, memoria) y `test/save.test.ts` (campos nuevos y saneo); los flujos viejos superan el evento antes de decidir.
- **No verificado**: aspecto y posición de `#dirSub` en compu y celular, juego real (solo `tsc` y `vitest`), balance de OVERLOAD (tamaño y ritmo de los enjambres) y de las probabilidades; el archivo `dialogue_cues.csv` no se tocó (las frases nuevas viven en `LINES`). Valores provisorios.

## R5: jefe secreto, pistas, arena del FINAL ACT, reporte y tornillos

Fecha 2026-10-12. Solo modo ENCORE; Supervivencia intacta (`erun` null: la cuenta de tornillos da lo mismo que antes).

- **Jefe secreto** (`finalOf(seed)` en `src/encore.ts`): hash de la semilla de la run (sin `rng()`), fijo en todas las vueltas, entre `aspiradora` y `cortacercos` (`FINAL_POOL`). `perro` queda fuera con un comentario `ponytail:`: su salto usa `UP` del mundo y su embestida ejes del mundo, mientras el resto de su IA está en el marco local de la esfera; fuera del polo salta y embiste torcido. Entra cuando `enemies.ts` lo pase al marco local como la tarántula y el gato. `main.ts` (`encPlan`) ya no usa `ENC.finalBoss` (eliminado).
- **Pistas** (`HINTS`, `hint(r)`): 4 frases por jefe, una por escenario (se repiten en cada vuelta), sin nombrarlo. Se encolan con `dirPush` (`say("hint")`, prioridad 2) al empezar la run y tras cada `advance` / `encore`, detrás de la frase de la variante. No hay en la votación ni en el FINAL ACT.
- **Arena del FINAL ACT** (`ARENA`, `arenaPlan`, `finalArena()` en `main.ts`): auto de vuelta en la salida (`moonPlace`), 8 cráteres en anillo a 36 m (`deform`), 6 focos con haz alto (`spotsPlan` en `moon_goals.ts`, se limpian con `goalsClear`), luz de show violeta y cálida (`evShow` en `moon_events.ts`, se apaga con `evReset`), menos meteoritos (`evPace`) y cielo algo más activo (`skyPace`).
- **Reporte** (`report(r, { chests, cause })`): vueltas, escenarios superados (`cleared`), pactos tomados (`Run.taken`), rutas (`Run.went`), cofres abiertos (`chestsOpened()` de `moon_goals.ts`), jefe secreto revelado y causa de fin. `endRun` lo pasa en `res.enc`; `openOver` (`menu.ts`) lo dibuja en `#overEnc` (nuevo en `index.html`, oculto fuera de ENCORE).
- **Tornillos**: antes `earned` multiplicaba todo por el `pfx.scrap` vigente al morir. Ahora `recompute()` liquida (`scrapExtra(bruto, ultimo, k)`) lo ganado con el efecto que se va cada vez que cambia (pacto aceptado, salida de escenario), `encExtra` lo acumula y `endRun` suma el tramo final. Las maldiciones (`curseK`) siguen multiplicando el total.
- **Pruebas**: `test/encore.test.ts` +5 (sorteo, pistas, arena, reporte, tornillos). `npx tsc --noEmit -p .` limpio; `npx vitest run` 126/126.
- **No verificado**: la arena y la luz de show no se vieron en pantalla (sin captura); los focos usan `put` de `moon_goals.ts` y el tinte repinta la sonda del cielo una vez al entrar al FINAL ACT. Conviene `?encore&seed=N` con `__enc` hasta `final` y una captura.

## R7a/b: ENCORE para 2 en compu (pantalla dividida)

Fecha 2026-10-12. Primer paso del cooperativo local. Todo cuelga de `coop` (main.ts): con 1 jugador `mate` es null y ENCORE y Supervivencia no cambian (`sim --seeds 1 --secs 600` igual que en R1: 166.9 s, nv 4, 24 bajas).

- **Menú:** botón `Jugadores · 1/2` en `#scr-encore` (`encCfg` en `menu.ts`). En táctil no aparece y siempre es 1, como `raceCfg.players`. Dev: `?encore&players=2`; `__enc.mate()` y `__enc.hurt(n, 1|2)`.
- **Pantalla dividida:** J1 arriba, J2 abajo (`TOP` / `BOTTOM`), segunda `FreeCamera` y `setSplit` una sola vez (dos `addCamera` repiten el postproceso). La cámara del J2 (`mateCam`) es la persecución "actual" en el marco de la luna; los modos de cámara son solo del que guía.
- **Luna:** `moonCar` guarda el "arriba" de cada auto en un `WeakMap` por cuerpo (antes un solo `carBody/carUp`); la cámara lenta de la habilidad también lleva los dos cuerpos.
- **Input:** J1 = teclado sin las teclas de Teclado 2 + primer joystick (`pollInput({ skip, pad })`); J2 = segundo joystick si hay dos, si no Teclado 2 (`coopCtl`, `pollPlayer` de la carrera; el objeto hace de turbo).
- **Enemigos:** persiguen al auto vivo más cercano; la aparición alterna entre los dos autos; el reciclado mide al más cercano. El J2 embiste (daño de embestida simple) y recibe contacto y ácido.
- **Vida por auto:** si cae el otro, queda fuera hasta el próximo escenario (`mateDown`, vuelve con la vida llena en `encEnter`). Si cae el que guía, el otro pasa a guiar (`mateLead`: se cruzan auto, vida, armas, cámaras e input; cada jugador conserva su mitad de pantalla). Si caen los 2, termina la partida.
- **Compartido** (`ponytail:`): XP, nivel, armas, pasivas, tornillos y pactos. El J2 dispara **copias** de las armas desde su auto (`mateArm`, se rehacen al cambiar armas o niveles): no se tocó `weapons.ts`, pero el daño total se duplica con 2.
- **HUD:** vida del otro jugador compacta sobre la línea divisoria (`#mateHp`, `hudMate`); "FUERA" cuando cayó.
- **R7b (2026-10-12), J2 completo:**
  - **Salto y habilidad del J2:** Teclado 2 suma `KEYS2` (input.ts): salto `/` (Slash) o Numpad 0, habilidad `´` (Quote) o Numpad 1; con segundo joystick, `pollMate` usa el mapeo de siempre (`PAD`, forzado a gatillos) en vez del de la carrera. Salto propio (`carJump`, enfriamiento y coyote en `Mate`). La habilidad es la misma y con enfriamiento compartido: sale desde el auto de quien la dispara (`abilCar`: petardos alrededor suyo, burbuja en su auto, EMP desde ahí); el escudo protege y cura a los dos.
  - **Cofres, máquina y teleportador:** `goalsTick` recibe los autos vivos: cualquiera junta celdas, mantiene la antena, compra y aborda. La máquina cobra vida a quien la activa (`GOAL_IO.hpFrac/pay(…, who)`). Cartas: compartidas como las armas y elige cualquiera (los menús ya leen todos los controles); el título dice quién abrió (`byTag`: "Cofre · J2").
  - **Eventos de la luna:** `lunaEv`, `skyTick`, `shipsTick` reciben los autos vivos (0 = el que guía: sonido y reloj del horizonte). Cada meteorito, erupción y tiro del cielo cae cerca de uno al azar y cada nave elige un blanco (`pickIdx` en rng.ts: con 1 auto no gasta `rng()`, así la semilla da lo mismo); el daño va a quien golpea (`hurtWho`). El gusano ya perseguía al más cercano; ahora su salida también golpea al otro.
  - **Recuadro de controles:** en coop (`#hint.coop`) se pega a la división desde la mitad de arriba y suma una línea con las teclas del J2 (`#hintJ2`).
  - `ponytail:` la erupción se ubica delante de la cámara del que guía aunque apunte al otro auto.
- **Verificado R7b:** `tsc` limpio, `vitest` 127/127 (nueva: con 2 autos los meteoritos dañan a los dos). Sin `sim`, capturas ni recorrido headless de esta parte.
- **Verificado R7a:** `tsc`, `vitest` 126/126, recorrido headless (dos cámaras, J2 maneja con flechas, J2 cae y revive al avanzar, J1 cae y J2 guía, los 2 caen → cierre), 0 errores de consola, captura vista de la pantalla dividida. Sin playtest con dos personas ni con dos joysticks reales.

## R7c: ENCORE de 3 a 4 en compu (2x2)

Fecha 2026-10-12. `mate` pasó a `mates: Mate[]` (main.ts), cada uno con su número de jugador `pn` y su entrada `in`; `coop` es la cantidad de jugadores (1 = solo). Con 1 y 2 el comportamiento es el de R7a/b (mismo orden de aparición, mismos cuadros arriba/abajo, mismo `#mateHp`).

- **Menú:** `Jugadores · 1/2/3/4` en `#scr-encore` (`encCfg.players`, `encMax()` en menu.ts). Oculto en táctil. J3 y J4 solo con joystick: el selector saltea 3 si hay menos de 3 joysticks y 4 si hay menos de 4, y lo avisa en el botón ("3 o 4 piden 3 o 4 joysticks"); se rehace al conectar o desconectar un control y `launchRun` vuelve a recortar al largar. Dev: `?encore&players=3|4`.
- **Grilla:** 2 = arriba/abajo (`TOP`/`BOTTOM`); 3-4 = 2x2 (`QUAD`: J1 arriba izq., J2 arriba der., J3 abajo izq., J4 abajo der.; `vpOf(pn)`). Con 3 el cuarto cuadro queda negro (`#quadVoid`). Cada jugador conserva su cuadro aunque pase a guiar.
- **Input:** J1 teclado WASD + joystick 0; J2 flechas (Teclado 2) o joystick 1 (`pollMate`); J3 y J4 joysticks 2 y 3 (`pollPad` en input.ts, mapeo de siempre en gatillos).
- **HUD:** con 3-4, una vida compacta por cuadro en su esquina de abajo (`hudQuad` en ui.ts, `#quadHp`); con 2 sigue `#mateHp`.
- **Enemigos y eventos:** persiguen al auto vivo más cercano de los N; la aparición rota entre el que guía y cada compañero vivo; reciclado, contacto, embestida, ácido, salida del gusano, gemas, pilas y cofres miran a todos. Los eventos de la luna reciben los N autos vivos (`who` = índice en `liveM()` + 1).
- **Caídas:** un compañero caído queda fuera hasta el próximo escenario (`mateDown`); si cae el que guía, guía el primer compañero vivo (`mateLead` cruza auto, vida, armas, cámara y número de jugador). Si caen todos, termina la partida.
- **Rendimiento** (`ponytail:` en render.ts): con 3-4 cuadros (2 o más cámaras extra en `setSplit`, que ahora lleva una lista) la escala de render baja al 70 % de la elegida y partículas y distancia de dibujo pasan a Bajo; el pasto no cambia (se arma con el mundo). Techo: escala medida por tiempo de cuadro real.
- `ponytail:` las copias de armas son por compañero: con 4 el daño total se cuadruplica (balance sin ajustar, como en R7a).
- **Escala coop:** vida de bichos y jefes × (1 + 0,6·(N−1)) (`coop_vida_por_jugador`) y aparición, tope de vivos y enjambres × (1 + 0,35·(N−1)) (`coop_ritmo_por_jugador`) en `ritmo` de balance.json; con 1 jugador ×1. Naves de la luna (`COOP.n` en moon_events.ts, lo asigna main.ts): vida de cada nave × vida coop, meteoritos por segundo y aliens que suelta la nodriza × ritmo coop; cofres, daños y eventos no escalan.
- **Verificado R7c:** `tsc` limpio, `vitest` 127/127. Sin recorrido headless, capturas, `perf` ni prueba con 3-4 joysticks reales.

### Qué falta (y para 3-4 jugadores)
- Probar 3-4 con joysticks reales y medir `perf` de la grilla 2x2; el cuarto cuadro con 3 podría mostrar el radar en vez de negro.
- Del que guía siguen: combo de manejo, recolección con imán y el indicador de habilidad del HUD (muestra su tecla). Los ataques especiales de jefes (barrido, cables, salto, succión) y la pelota apuntan solo a él.
- Niebla, `moonTick` y el cielo se calculan con la cámara del que guía; números de daño y flechas de jefe solo se proyectan en su mitad.
- Balance sin ajustar para 2 (armas duplicadas, misma cantidad de bichos).

## R6a: estado por jugador, sin red

Fecha 2026-10-12. Primera fase de `R6_RED.md` §5: separar el estado por jugador en `main.ts`, sin red.

- **`Player`** (`id` = número de participante 1-4, `car` — `null` = caído hasta el próximo escenario —, `hp`/`maxHp`/`boost`, `in` = su entrada, `cam` y estado de cámara `h`/`up`/`tgt`, copias de armas `weapons`/`sig`, salto y contacto propios). Lista `players`; J1 es siempre `players[0]`.
- **`lead`** = el jugador que guía (antes los globales `car`, `hp`, `maxHp`, `boost` y `leadPn`): usa la cámara principal `cam` con sus modos, el `input` global y las armas de verdad. Se retiraron `mates`, `Mate` y `leadPn`; `others()` = los que no guían en orden de jugador y `liveM()` = los vivos de esos (sus índices 1.. siguen siendo los `who` de los eventos).
- **Mismo código para todos:** HUD 2x2 (`players.map`), curas del pacto y del escudo (`for p of players`), daño por jugador `hurtP(p, …)` (el que guía pasa por `hurt()`, los demás por `mateHurt`), dev `__enc.hurt` por id. Si cae el que guía, `mateLead` ya no cruza número de jugador: cambia `lead` y se intercambian la cámara principal y la extra.
- **Comandos:** `applyCommand(playerId, cmd)` con `card` (cartas; la reparación cura a quien elige), `reroll`, `enc` (pactos, rutas y votos del teleportador) y `buy` (máquina de opciones: tornillos y vida de quien compra, vía `GOAL_IO.pay`). Teclado, joystick, botones, cartas (`showOffers`) y el bot entran por ahí. Los menús siguen siendo locales y mandan como el que guía.
- **Compartido (igual que antes):** XP, nivel, armas, pasivas, tornillos y pactos.
- Diferencia conocida (solo coop 3-4): tras dos cambios de guía con un caído que volvió, el orden de `others()` es siempre por número de jugador; antes podía quedar desordenado. Cambia qué compañero recibe la próxima aparición o el lugar de llegada, nada más.
- **Verificado R6a:** `tsc` limpio, `vitest` 128/128, `sim --seeds 1 --secs 600` = 166.9 s, nv 4, 24 bajas (igual que R1). Sin recorrido headless del cooperativo ni capturas.
- Falta para R6b: `InputSource` remota, `damage/kill` como eventos, ofertas de cartas por jugador sin pausa global, `simRng`/`visRng`.

## R6b: online de 2 con PeerJS

Fecha 2026-10-12. Opción A de `R6_RED.md`: `peerjs` 1.5.5 (versión fija), `src/net.ts` importado dinámico (chunk `bundler-*.js` ~87 kB fuera de la carga inicial).

- **Sala:** el anfitrión abre `jm-` + código de 6 (sin 0/O/1/I); acepta un solo invitado. El cliente abre dos canales: `u` no fiable (inputs cada cuadro, snapshots a 15 Hz) y `r` fiable (`go` con la semilla, comandos `c`, `end`).
- **Anfitrión (J1):** simula todo con `coop = 2` sin pantalla dividida; `players[1].in` = último input remoto (validado y acotado). Comandos del cliente por `applyCommand` (solo `enc`). Snapshot JSON redondeado: autos (pos, cuaternión, velocidad, vida), bichos a 70 m del J2 (tope 120, id estable, tipo, pos, rotación, vida), tiempo, XP, nivel, tornillos y `erun` (fase y ventana abierta).
- **Cliente (J2):** arma la run con la misma semilla, pasa a `state = "net"` con la física apagada y no corre `update()`; interpola 100 ms (extrapola con la velocidad hasta 0,2 s), bichos como `Enemy` de muestra, HUD normal, cámara principal sobre su auto. Las ventanas del teleportador se responden con los mismos botones y van al anfitrión.
- **UI:** en `#scr-encore`, "Online: crear sala", campo de código, "Unirse con código" y estado. Corte: el anfitrión sigue solo (`mateClear`, aviso); el cliente vuelve a ENCORE con el motivo. Fin de partida del anfitrión = `end` al cliente.
- `ponytail:` sin rejoin (R6d), sin TURN propio (STUN por defecto de PeerJS), sin compensar latencia ni predecir el auto propio, sin proyectiles/gemas/efectos/cartas en el cliente, autos con el modelo del garaje local, JSON sin deltas.
- **Verificado R6b:** `tsc` limpio, `vitest` 128/128, `build` OK. Prueba headless de 2 páginas: la señalización por PeerJS Cloud funciona (oferta y respuesta llegan), pero el DataChannel no abre ni siquiera con PeerJS a pelo en Chromium headless de esta Mac (ICE sin pareja): falta probar en dos navegadores reales. Sin medir kB/s ni RTT.

## Contenido 2

Fecha 2026-10-12. Solo datos en `src/encore.ts` (más pruebas); sin tocar `main.ts`, `menu.ts` ni `balance.json`.

- **Pactos (+4, ahora 10):** ENSAYO GENERAL (+15% daño y velocidad / +20% daño recibido, 2 esc.), ENTRADAS AGOTADAS (+25% XP y tornillos / -20% vida máx. y +15% enemigos, resto de la run), CAMERINO BLINDADO (+30% vida máx. / -15% velocidad, 2 esc.), SEGURO DE ESCENA (+1 vida/s y -15% daño recibido / -15% daño, 2 esc.). Solo usan efectos de `Fx` ya aplicados por `pactFx`. `ponytail:` valores sin playtest.
- **Director:** cada momento tiene 3 frases. `line()` elige con hash de (semilla, momento) más el avance de escenario: varía entre runs, es determinista, no usa `rng()` y nunca repite la misma en dos escenarios seguidos.
- **Variantes (+2, ahora 6):** LLUVIA DE CHATARRA (lado oscuro, meteoritos x0.45, caza, +40% tornillos) y NOCHE DE ESTRENO (de frente al Sol, cielo x0.7, abductora, +25% XP). Usan solo `at/rain/quake/sky/ship/craters` existentes; `moon_*.ts` no cambió. Con 6 variantes y 4 escenarios, la mezcla Fisher-Yates sigue sin repetir dentro de la vuelta (salen 4 de 6); la vuelta 0 empieza en LA TARIMA. `at` ya no es único entre variantes (la prueba pide solo que las 4 primeras lo sean).
