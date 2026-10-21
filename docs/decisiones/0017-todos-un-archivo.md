# TODOs: un archivo por tarea con tablero generado

Fecha: 2026-10-21 · Estado: aceptada

## Contexto
El `TABLERO.md` único chocaba entre agentes. Método `repo-vivo`; formato en [FORMATO](../todos/FORMATO.md).

## Decisión
Cada TODO es `docs/todos/<slug>.md` con cabecera YAML y es el encargo al agente; el tablero `README.md` se genera con `npm run todos`.

## Alternativas
Tablero único editado a mano.

## Consecuencias
Menos conflictos. El tablero viejo está en [TABLERO-2026-10](../../.claude/trabajo/archivo/TABLERO-2026-10.md); los ids viejos van en `viejo_id`.
