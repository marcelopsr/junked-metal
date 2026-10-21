# 10. Cerrar una sesión

Objetivo: dejar el estado legible para la próxima sesión.

1. `npm run todos estado <slug> <estado>` por cada TODO que cambió (`en-lote`, `hecha`, `descartada` con `motivo`).
2. Actualizar la sección 5 de [../../HANDOFF-PROYECTOS.md](../../HANDOFF-PROYECTOS.md) con lo hecho y lo abierto (plantilla 17.3 en [../../../.claude/trabajo/ARRANQUE.md](../../../.claude/trabajo/ARRANQUE.md)).
3. En worktree: `npm run test:down`.
4. `npm run docs:check` (enlaces, cabeceras, tope de 80 líneas).
5. Cerrar con una pregunta de próximas tareas vía AskUserQuestion.

Se verifica: `npm run docs:check` sin avisos y `npm run todos` sin errores.

Trampas:
- El tablero `docs/todos/README.md` es generado: no se edita a mano.
- Separar en el cierre implementado, verificado, observado y pendiente.
- Commits solo si el dueño lo pide.
