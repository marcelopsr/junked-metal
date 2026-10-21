# Determinismo con rng() y semillas; Math.random solo visual

Fecha: sin confirmar · Estado: aceptada

## Contexto
Reproducir partidas y comparar balance exige resultados repetibles. Ver [rng.ts](../../src/rng.ts) y [CLAUDE.md](../../CLAUDE.md).

## Decisión
Todo lo que decide la partida usa `rng()` con semilla (`?seed=N`); `Math.random` solo para efectos visuales. `sim` además fija `Math.random`.

## Alternativas
Aleatoriedad libre: partidas no comparables.

## Consecuencias
Misma semilla desde carga limpia da el mismo resultado (Havok diverge algo entre partidas seguidas). El pasto usa base fija: el Detalle no cambia la semilla.
