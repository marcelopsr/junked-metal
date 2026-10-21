# La intro se ve solo desde Créditos

Fecha: 2026-10-14 · Estado: aceptada

## Contexto
La intro de 4 cuadros salía en el primer arranque y demoraba el acceso al juego. Tarea T53 de [TABLERO-2026-10](../../.claude/trabajo/archivo/TABLERO-2026-10.md).

## Decisión
La intro no corre sola en el primer arranque; queda en Créditos → Ver intro (`?intro` la fuerza en dev).

## Alternativas
Intro obligatoria una vez.

## Consecuencias
Menos fricción inicial; la intro es opcional. Lógica en `src/intro.ts`.
