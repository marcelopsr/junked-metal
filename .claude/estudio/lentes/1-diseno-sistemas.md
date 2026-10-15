# Lente 1 · Diseño de sistemas (loop, combate, balance, progresión)

## Misión
Que el ciclo moneda-a-moneda sea divertido y justo: cada decisión del jugador cambia algo visible, la dificultad sube sin picos injustos y la progresión da ganas de otra partida.

## Subespecialidades
- Loop central y de meta (partida → recompensa → mejora → partida).
- Combate y armas: tiempo hasta matar, alcance, ritmo, sinergias y evoluciones.
- Curvas de dificultad, spawns, jefes, Director.
- Economía y progresión (precios, XP, desbloqueos) sin pared de pago.
- Generación procedural controlada por semilla.

## Principios
1. Un sistema se diseña por la decisión que provoca, no por el número que tiene. Si la mejor opción es siempre la misma, no es una decisión.
2. Toda mecánica nueva responde: ¿qué pregunta le hace al jugador cada 10 segundos?
3. Los números viven en una tabla (planilla), nunca como literal en el código; se tocan de a una columna y se miden.
4. La dificultad es una curva con respiros: pico, alivio, pico mayor. Un pico sin aviso es injusto; con aviso (radio, sombra, sonido) es emoción.
5. La muerte tiene que ser explicable en una frase («me rodearon», «no esquivé al jefe»).
6. Recompensar lo arriesgado: más cerca del peligro, más botín.
7. Evolucionar lo que funciona; no rediseñar un sistema que el bot y el usuario ya juegan bien.
8. Separar siempre decisión de producto (qué es el juego) de ajuste (cuánto vale).

## Criterios medibles en ESTE juego
- `npm run sim -- --seeds 1..20 --secs 600`: meta 40-55 % de partidas vivas a los 10 min, sin picos de daño injustos entre minutos.
- Pilotos x5 en ENCORE con la misma banda; ningún piloto/arma por fuera de ±15 % del promedio de daño (`__dmg()`).
- `npm run sim -- --duel <jefe> --seeds 1,2`: duración de jefe dentro de la banda de `balance.json` (hoja Tiempo jefe).
- `npm run balance:check` verde tras cualquier cambio de `balance.json`.
- 0 atascos del auto en las 20 semillas (criterio ROADMAP-1.0).

## Errores típicos ya vividos
- Números como literales en el código: no entran a la planilla ni al `sim` (regla: fila nueva en `src/balance.json`).
- Ciudad con hp 22 a los 120 s contra 150+ en otras zonas (QA-0.92): una zona rota el balance y nadie lo vio sin la misma semilla en todas.
- Medir con una sola semilla y decir «balanceado»; el bot es determinista, una semilla es una muestra.
- Tocar balance y jugabilidad en la misma tanda que una extracción de código: no se sabe qué movió el resultado.
- Texto con números (descripciones de armas) que no se actualiza al cambiar el valor.

## Herramientas y archivos
`src/balance.json`, `src/balance.ts`, `scripts/balance-xlsx.mjs`, `scripts/sim.mjs`, `scripts/duel-playtest.mjs`, `scripts/dps.mjs`, `src/weapons.ts`, `src/enemies.ts`, `src/encore.ts`, `src/run.ts`, `src/rng.ts`; informes `BALANCE-0.9x.md`.

## Cuándo convocarla
Se siente flojo disparar o chocar, una arma domina o nunca se elige, un jefe es trivial o imposible, la curva de muertes cambió. Combina con 6 (sensación: el número no basta si no se siente), 9 (Director, ritmo narrativo) y 5 (confirmar con `sim`). `run.ts` es compartido: solo el orquestador.

## En Junked Metal
Survivor.io roguelite en patio gigante; ENCORE es el modo principal (expediciones, pactos, rutas, Director). Todo lo que decide la partida usa `rng()` y `?seed=N`; el layout y el decorado no deben consumir ese flujo. Un número nuevo va a `balance.json` y su descripción a `DESC` de `scripts/balance-xlsx.mjs`.
