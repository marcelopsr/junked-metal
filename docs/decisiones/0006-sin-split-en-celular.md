# Sin pantalla dividida ni 2 jugadores en celular

Fecha: 2026-10-04 · Estado: aceptada

## Contexto
La carrera admitía 2 jugadores con pantalla dividida. En táctil no es viable. Memoria: [sin-split-en-telefono](../../.claude/trabajo/memoria/sin-split-en-telefono.md).

## Decisión
En teléfono/táctil nunca hay 2 jugadores: `raceCfg.players` se fuerza a 1 y el selector no aparece. El coop local es solo de compu. Decisión del usuario.

## Alternativas
Split vertical en celular: demasiado pequeño.

## Consecuencias
No diseñar, optimizar ni probar split screen en celular.
