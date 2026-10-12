# QA final 7: pactos nuevos, ENSAYO DE MEDIANOCHE y quedarse en ENCORE

Fecha 2026-10-12. Contenido sin commitear en `src/encore.ts` (pactos `cobro`, `bis`, `permanencia`; variante ENSAYO DE MEDIANOCHE; secreto `eco`). Mismo método que `FINAL_QA_6_balance.md`: `npm run sim -- --encore`, 1 jugador, sin `--encores` (FINAL ACT tras el primer ciclo), una corrida a la vez contra rc-test.

## Opciones nuevas del bot (política, por defecto = comportamiento de QA 6)

| Opción | Efecto |
|---|---|
| `--pacts all` | acepta la ranura 0 de cada oferta de pactos |
| `--pacts id,id` | acepta ese pacto; si la oferta (al azar) no lo trae, **lo fuerza** en la ranura 0 (medición: sin esto cada pacto aparecería en pocas corridas) |
| `--stay N` | en el teleportador se queda N veces por escenario (cada quedada dura `stayS`; 3 = secreto `eco`) |
| `--route rand` | destino al azar con la semilla (`Math.random` sembrado por el sim) |
| `--route medianoche` | fuerza esa variante (parte del nombre) como destino en todos los escenarios elegibles |

Código: `scripts/sim.mjs` (flags) y el hook `__encBot` de `src/main.ts` (imprescindible: la política vive ahí; solo se leen `o.pacts/stay/route`). `src/devbot.ts` y `src/encore.ts` sin cambios.

## Resultados (G = ganó el FINAL ACT, M(n) = murió en el escenario n, 0-index)

La semilla 4 muere a los 64 s en el escenario 0 con cualquier política (antes de cualquier pacto o destino): se excluye de las tasas.

| Política | S1 | S2 | S3 | S5 | S6 | Ganó (sem. 1,2,3,5,6) |
|---|---|---|---|---|---|---|
| Base (como QA 6) | M3 590 s | G 783 s | M2 433 s | G 790 s | G 980 s | 3/5 |
| `--pacts cobro` | G 651 s | M1 294 s | G 1053 s | M2 372 s | G 974 s | 3/5 |
| `--pacts bis` | M1 261 s | M1 169 s | G 693 s | G 882 s | G 974 s | 3/5 |
| `--pacts permanencia` | M3 591 s | M1 286 s | G 964 s | M2 449 s | G 977 s | 2/5 |
| `--route medianoche` | G 658 s | G 761 s | G 757 s | G 631 s | G 978 s | 5/5 |

Políticas combinadas (semillas 1 a 4):

| Política | S1 | S2 | S3 | S4 | Ganó (sin S4) |
|---|---|---|---|---|---|
| `--pacts all --stay 1 --route rand` (pedida) | M0 202 s (en la quedada) | G 1049 s | M2 596 s | M0 64 s | 1/3 |
| solo `--pacts all` | G 683 s | M1 286 s | M2 454 s | M0 64 s | 1/3 |
| solo `--stay 1` | M0 202 s | M1 284 s | M2 586 s | M0 64 s | 0/3 |
| solo `--route rand` | M3 618 s | M2 542 s | M2 432 s | M0 64 s | 0/3 |

## Lectura

- **Ningún pacto desborda**: las tres con tasas dentro del ruido de la base (3/5, 3/5, 2/5) y ninguna con victoria trivial (los G tardan 650 a 1050 s, como la base) ni muerte segura. Con n=5 y un bot cuyo resultado depende de la racha de cartas (cada decisión distinta cambia el rng y la corrida diverge por completo, ver S2 de la base contra todas las demás) no se puede separar un efecto de menos de ~30 puntos. `bis` (spawn x1.35 con dmg/xp x1.25) mata antes en 2 de 5 (escenario 1) pero gana 3 de 3 de las otras; `permanencia` es el más flojo (2/5) sin pasar de la base.
- **ENSAYO DE MEDIANOCHE 5/5**: lo más alto de la tabla y flipa dos semillas que la base pierde (S1, S3). Su recompensa (xp x1.3 y scrap x1.3) es la única variante con dos recompensas altas a la vez, y el bot no esquiva meteoritos ni erupciones, así que el riesgo (lluvia 0.5, sismos 1.4) casi no le cuesta. No es "trivial" (tiempos 631 a 978 s, iguales a la base) y n=5 no basta para tocarla: **sin cambios**; si un playtest humano la siente generosa, bajar `reward` a `xp: 1.2, scrap: 1.2` (el producto pasa de 1.69 a 1.44, como LLUVIA DE CHATARRA 1.4).
- **Quedarse** (`--stay 1`) es el peor: 0/3. Cada quedada suma 60 s (escenario de 210 s) al mismo riesgo y la única recompensa es el secreto `eco` (al 3.º). Es una decisión del jugador, no un número del contenido nuevo: no se tocó. El bot además se queda parado sobre el teleportador.
- Los ids `eco` y la rama de 3 quedadas no se midieron (`--stay 3`): con la mortalidad de `--stay 1` el bot casi no llega. Queda cubierto por `test/encore.test.ts` (`eco` en `found`).

## Ajustes

Ninguno a `src/encore.ts` (los números del contenido nuevo quedan como estaban).

## Verificación

`npm test`: 11 archivos, 136 pruebas OK. `npx tsc --noEmit -p .`: OK con mis cambios (antes de las corridas); al cierre falla en `src/menu.ts` (1238, 1265, 1292: falta `proyector` en `Record<Kind, ...>`), ajeno a este encargo (otro agente agregó el enemigo `proyector` a world/balance).

## T53 (2026-10-12): quedarse tentador (H17), recompensa de MEDIANOCHE (H16) y minijefe proyector (H13)

Cambios: cada QUEDARSE suma +10 % de tornillos acumulable en toda la expedición (`ENC.stayScrap`, `Run.stayN`, aplicado en `pactFx`) y suelta un cofre extra (`dropPickup` en `encApply`, ev `stay`); el botón del teleportador lo dice ("QUEDARSE · COFRE EXTRA Y +10% TORNILLOS"). La amenaza no cambia. ENSAYO DE MEDIANOCHE: `reward` xp 1.2 / scrap 1.2 y `mini: "proyector"` (nuevo campo opcional `Variant.mini`; en `main.ts` el minijefe de esa variante es el enemigo, no una nave). Bot: `ORBIT_R.proyector = 14`. Retrato: `BEAST_PORTRAITS` es `Partial`, no hace falta nada.

Corridas (semillas 1,2,3,5,6, comparadas con las tablas de arriba):

| Política | S1 | S2 | S3 | S5 | S6 | Ganó |
|---|---|---|---|---|---|---|
| `--stay 1` (antes: S1 M0, S2 M1, S3 M2 = 0/3) | G 894 s | M0 188 s | M3 782 s | G 937 s | G 1215 s | 3/5 |
| `--route medianoche` (antes 5/5) | G 663 s | G 707 s | G 817 s | M1 286 s | G 984 s | 4/5 |

Lectura: quedarse ya no es el peor (de 0/3 a 3/5, ruido de n=5 incluido). MEDIANOCHE baja de 5/5 a 4/5 con tiempos parecidos; la muerte de S5 es en el escenario 1, con el proyector y la recompensa menor; con n=5 no se separa del ruido. Verificación: `npm test` 139 OK; `tsc` solo los 3 errores previos de `proyector` en `menu.ts`.
