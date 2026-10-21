# 03. Verificar una tanda

Objetivo: probar en proporción al cambio, una sola vez, al final. Detalle: [../../../.claude/rules/pruebas-herramientas.md](../../../.claude/rules/pruebas-herramientas.md).

1. Hacer todos los cambios de la tanda primero.
2. `npm run verificar -- --nivel rapido`: tsc + vitest --changed + docs:check (lógica sin visual).
3. `npm run verificar -- --nivel tanda`: rapido + `shots --changed` + sim 2 semillas (si el diff toca balance o lógica) + e2e pc 1 semilla (si toca `src/`).
4. `npm run verificar -- --nivel puerta` (solo el orquestador, antes de una versión): tsc, `test:todo`, `balance:check`, build, e2e pc y cel x5, `sim --encore` 20 semillas, shots completos.
5. `--seco` imprime el plan sin correr nada.
6. Informe en `.verificar/<fecha>.md` (Implementado / Verificado / Observado / Pendiente) y logs en `.verificar/<fecha>/`. Pegar esas secciones en el entregable.

Se verifica: exit 0 y el informe sin pasos fallidos.

Trampas:
- Si una fase falla, la siguiente no arranca.
- «Observado» solo lista PNG: una captura no prueba lógica; hay que mirarlas.
- Correr con `run_in_background` y esperar la señal; no abrir el panel del navegador a mano.
