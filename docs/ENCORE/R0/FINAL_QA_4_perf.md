# FINAL_QA_4 — rendimiento ENCORE

Mac con GPU real, Chrome headless, `npm run perf -- --only <sesión> --vp pc` (180 cuadros fijos a 1/60 s, servidor `rc-test-<worktree>`), commit base 06801ba.

## Sesiones nuevas (`scripts/scenarios.mjs`, solo vp pc)

`encore1`, `encore2`, `encore4`: `?mute&seed=3&encore&players=N`, god, anillos de bichos de la Luna; con 4 jugadores se simulan 4 joysticks (`navigator.getGamepads`). Cada una tiene el shot `luna` y el shot `final` (salta escenarios con `__enc` hasta la fase `final`; falla si no llega).

| Escenario | ms/cuadro | p95 | cpu | draws | tris (k) | mallas | heap MB |
|---|---|---|---|---|---|---|---|
| encore1-luna | 3.5 | 6.3 | 1.6 | 90 | 280.2 | 205 | 66.8 |
| encore1-final | 2.8 | 3.8 | 1.0 | 66 | 218.7 | 157 | 73.0 |
| encore2-luna | 6.2 | 9.7 | 2.4 | 193 | 574.6 | 229 | 68.5 |
| encore2-final | 3.3 | 4.4 | 1.4 | 153 | 452.1 | 172 | 75.9 |
| encore4-luna | 6.9 | 12.4 | 4.1 | 512 | 972.5 | 286 | 88.3 |
| encore4-final | 5.2 (5.5 en repetición) | 9.3 | 3.5 | 521 | 951.5 | 222 | 81.6 |

4 jugadores: 6.9 ms promedio y 12.4 ms p95, por debajo de los 16 ms. No se aplicó ningún ajuste (los draws escalan con las cámaras, 90 -> 193 -> 512, pero hay margen).

## Regresión `pc-partida-pausa`: no es real

| Commit | ms | p95 | draws | tris k | mallas | heap MB |
|---|---|---|---|---|---|---|
| 9882e8b^ (antes de ENCORE), corrida 1 | 4.4 | 7.8 | 123 | 577.7 | 958 | 87.2 |
| 9882e8b^, corrida 2 | 4.7 | 5.5 | 123 | 577.7 | 958 | 87.1 |
| 06801ba, corrida 1 | 4.0 | 4.6 | 123 | 577.7 | 958 | 87.3 |
| 06801ba, corrida 2 | 4.2 | 4.8 | 123 | 577.7 | 958 | 87.1 |

Draws, triángulos y mallas (exactos) son idénticos antes y después; los ms están dentro del ruido (~10-15 %) e incluso son menores ahora. El +98 % ms / +39 % draws vino de la máquina cargada en la medición anterior. Sin bisección ni arreglo necesarios.
