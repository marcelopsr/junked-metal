# Verificación

Filosofía del dueño: **probar en proporción al cambio** y **una sola vez al final de la tanda**; no revisar toda la casa cada vez. Vale para toda prueba, no solo capturas. Siempre headless.

## Un comando

`npm run verificar -- --nivel rapido|tanda|puerta [--seco]` (`scripts/verificar.mjs`).

| Nivel | Qué corre | Cuándo |
| --- | --- | --- |
| `rapido` | tsc, vitest `--changed`, docs:check, harness:check | lógica sin efecto visual; antes de un commit chico |
| `tanda` | rapido + `shots --changed` + sim 2 semillas (si el diff toca balance o jugabilidad) + e2e pc 1 semilla (si toca `src/`) | al cerrar la tanda de un encargo |
| `puerta` | tsc, test:todo, balance:check, build, e2e pc y cel ×5, sim ENCORE 20 semillas, shots pc y cel completos | solo el orquestador, antes de una versión o de publicar |

Deja `.verificar/<fecha>.md` con Implementado / Verificado / Observado / Pendiente y un log por paso. Esas secciones van al informe del agente. El hook Stop recuerda correrlo si hay cambios en `src/` sin informe de hoy.

## Qué más, según lo tocado

- Rendimiento posible (render, modelos, partículas, cantidades): `npm run perf -- --changed`.
- Balance o contenido nuevo: `npm run sim` con 12-24 semillas, metas en `.claude/rules/balance.md`.
- Visual: capturar, medir con `scripts/ref_measure.py` y comparar contra las referencias registradas antes de entregar (`docs/art_direction/visual_reference_register.md`).
- `npm run build`: solo antes de push o si se tocó config, imports dinámicos o assets.
- Suites completas: solo para renovar referencias (`shots -- --update`) o si el dueño lo pide.

## Evidencia honesta

Separar siempre *implementado*, *verificado* (qué comando, resultado), *observado* (una captura no prueba lógica), *pendiente* e *hipótesis*. Detalle de cada herramienta: `.claude/rules/pruebas-herramientas.md`.
