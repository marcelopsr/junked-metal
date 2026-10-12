# QA final 2: recorrido de ENCORE con 1 jugador

Fecha 2026-10-12. Base: 5fb7082 (ya incluía los arreglos de QA 1). Headless (Chromium de Playwright, `?mute&seed=3`), PC 1280x720 y celular 390x844. Script: `scratch/qa1/run.mjs` (no versionado salvo la carpeta de capturas); capturas en `scratch/qa1/`.

Recorrido cubierto: menú, Largar, escenario 1, teleportador (sin evento, OVERLOAD y BOSS_GUEST), QUEDARSE y decisión, pacto, ruta, escenario con variante, votación, ¡ENCORE!, vuelta 1 con escenario terrestre (jardín), FINAL ACT (cortacercos), victoria, resultados con reporte, pantalla ENCORE con récord y secreto. 0 errores de consola en ambos tamaños; ninguna fase trabada.

| # | Falla | Dónde | Arreglo | Estado |
|---|---|---|---|---|
| 1 | Reporte de resultados: "Pactos tomados" y "Rutas elegidas" salían del panel (PC, tapados por la foto) y en celular se partían letra por letra | `src/menu.css` `#overEnc` | `li` con `flex-wrap`, valor con `flex: 1 1 11em` y `white-space: normal` | Arreglada, recapturada PC y celular |
| 2 | Tras ganar en ENCORE aparecía "Seguir jugando" (modo sin fin de Supervivencia, no definido para ENCORE) | `src/main.ts` `endRun` (`more`) | `more = win && !endless && !erun` | Arreglada (lógica; botón oculto) |
| 3 | Contador de segundos de la barra ("14 S") se partía en dos renglones con títulos largos (SOBRECARGA) | `src/hud.css` `#encAsk .encHd b` | `white-space: nowrap` | Arreglada en CSS (el título largo se parte, el tiempo no) |
| 4 | Pacto/ruta: tarjeta B verde con VENTAJA/COSTO ilegibles; subtítulo del Director sobre la guía de controles; pacto en celular | varios | Ya corregidos en 5fb7082 (QA 1) | Verificada en capturas |

## Pendiente (no verificado o fuera de alcance)

- Cofres y máquina: se vio el escenario con variante pero no se condujo hasta ellos para abrirlos (el reporte muestra "Cofres abiertos 0"). Requiere mover el auto hasta `goalBlips()`; no hay hook.
- En el escenario terrestre (jardín) se ven franjas horizontales más claras en el cielo/niebla; no se investigó si es de la zona o de la escena de ENCORE.
- Aviso de radio "SEÑAL" del jefe (decodificación) tapa el reloj y la barra de jefe unos segundos en celular.
- Pantalla de resultados en celular: la foto polaroid se superpone al borde derecho del panel (diseño previo, no de ENCORE).
- Patio (el otro mundo terrestre) no salió en la semilla 3; solo jardín.

## Pendientes cerrados

Capturas antes/después en `scratch/qa6/` (`shot.mjs` y `sky.mjs` las generan; `probe.mjs` fue el diagnóstico).

- **Aviso de radio sobre el reloj (celular 390x844):** causa real, la regla de escritorio `#hud:has(#bossbar:not(.hidden)) ~ #banner { top: +74px }` (`src/hud.css`) tiene más especificidad que la regla táctil `#banner { top: +176px }` y la pisaba cuando hay barra de jefe; el aviso quedaba en y=84..178 sobre el reloj (64..115). Arreglo: la misma regla `:has` dentro del bloque táctil con `top: +192px` (bajo la barra, 114..193). Medido: aviso en y=202, reloj y barra libres (`radio-cel-antes.png` / `radio-cel-despues.png`). Sin tocar: celular apaisado (`celh`) sigue con la regla de arriba, no se probó con jefe.
- **Franjas claras en el jardín:** no eran del cielo ni de ENCORE sino las "franjas de corte" del césped (`mow` en `frontBuild`, `src/world.ts`): 6 decales con `alpha: 0.08` que con la luz HDR se veían como bandas pálidas de borde duro hasta el horizonte (con `mow` oculto desaparecen; con `alpha 0.02` quedan casi imperceptibles). Es previo a ENCORE (existe desde bf38d96, zona Jardín), así que también afectaba a Supervivencia `?zone=jardin`. Arreglo: `alpha: 0.02`. Capturas `cielo-jardin-medio-antes.png` / `-despues.png` y `horizonte`.
- Verificado: `npx tsc --noEmit -p .` OK; `npm run shots -- --changed` 92 capturas OK (sin diff contra referencia pedida).
