# QA final 6: evolución en cofre y balance provisorio de ENCORE

Fecha 2026-10-12. Base 24b6ba0. Headless (Chromium de Playwright), `npm run sim -- --encore` (nuevo) contra el servidor del worktree. Script de la prueba del cofre: `scratch/qa8/evo.mjs`.

## 1. Cofre con evolución

Hook nuevo `__enc.evo(id)` (main.ts): arma a nivel 5 más su pasiva (lo que exige `evoOffer`). Con `lanza` + su pasiva, `__enc.shop("cofre")` y 240 cuadros parado sobre el aro: el estado pasa a `level` con una sola carta `offer evo` ("Evolución Ariete"). Sin errores de consola. Funciona sin cambios en el juego: el hueco de QA 2 era solo de cobertura.

## 2. Balance con bots

Modo nuevo `npm run sim -- --encore [--players 1,2,4] [--seeds ..] [--encores N] [--follow]` (`__encBot` en main.ts). Política del bot: aborda el teleportador al aterrizar (no lo conduce hasta él, por eso cada escenario dura 150 s salvo evento), siempre AVANZAR, rechaza pactos, primer destino y en la votación va al FINAL ACT (`--encores N` = N vueltas ¡ENCORE! antes). "Tiempo" = segundos totales de la expedición; "s/escenario" = vuelta.escenario:segundos.

### 1 jugador (semillas 1 a 6)

| Semilla | Resultado | Dónde | Tiempo | Nv | s por escenario |
|---|---|---|---|---|---|
| 1 | murió | esc. 4 (OVERLOAD) | 618 s | 19 | 150 / 150 / 150 / 168 |
| 2 | GANÓ el FINAL ACT | - | 783 s | 26 | 150 / 150 / 285 / 199 |
| 3 | murió | esc. 3 | 432 s | 9 | 150 / 150 / 132 |
| 4 | murió | esc. 1 | 64 s | 3 | 64 |
| 5 | GANÓ | - | 790 s | 13 | 150 / 150 / 150 / 340 |
| 6 | GANÓ | - | 980 s | 37 | 497 / 150 / 150 / 183 |

Semilla 2 con `--encores 2` (tres vueltas y FINAL ACT): GANÓ a los 2081 s, nv 49; el escenario más lento 196 s (jefe invitado u OVERLOAD).

### 2 y 4 jugadores (semillas 1 a 3)

El bot solo maneja a J1. Con compañeros quietos (tal cual quedan al nacer) J1 muere en el escenario 1 casi siempre; con `--follow` (compañeros recolocados junto al bot cada 0,75 s, cota optimista) se ve otra cosa:

| Jug. | Semilla | Compañeros quietos | `--follow` |
|---|---|---|---|
| 2 | 1 | murió esc. 2 (232 s) | murió esc. 4 (573 s) |
| 2 | 2 | murió esc. 1 (141 s) | GANÓ (868 s) |
| 2 | 3 | murió esc. 1 (110 s) | GANÓ (775 s) |
| 4 | 1 | murió esc. 4 (609 s) | GANÓ (642 s) |
| 4 | 2 | murió esc. 1 (82 s) | GANÓ (1008 s) |
| 4 | 3 | murió esc. 1 (118 s) | GANÓ (1002 s) |

El bot no maneja a los compañeros: "quietos" es el peor caso y "pegados" el mejor; el cooperativo real (cuatro personas con armas propias) cae en medio y no se puede medir con este bot. Solo cuenta la vida de J1 (los compañeros caídos vuelven en el escenario siguiente).

## Conclusión

No es desproporcionado: con 1 jugador el bot gana 3 de 6, las muertes caen entre el escenario 1 (semilla 4, mala racha de cartas: el mismo bot muere a los 167 s en Supervivencia) y el 4, y el FINAL ACT se venció en 3 de 3 de las partidas que llegaron, sin ser un paseo (la última vuelta de la semilla 2 tardó 150 a 196 s por escenario). Con compañeros pegados al bot, 2 y 4 jugadores ganan 5 de 6. No se tocó ningún `ponytail:` de encore.ts ni las filas `coop_*`. Para afinar de verdad hace falta un bot de compañeros o playtest humano en cooperativo.

## Verificación

- `npx tsc --noEmit -p .` sin errores; `npx vitest run`: 11 archivos, 133 pruebas OK.
- Supervivencia sin cambios: `npm run sim -- --seeds 1 --secs 600` da 166.9 s, nv 4, 24 bajas.
