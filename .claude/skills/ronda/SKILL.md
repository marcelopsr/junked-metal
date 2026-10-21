---
name: ronda
description: Arma la ronda de propuestas (AskUserQuestion 4×4) a partir del tablero docs/todos (ideas, hallazgos y preguntas) agrupada por tema, con la recomendada primera; lo elegido pasa a elegida. Usar con /ronda [tema] o cuando la cola de elegidas baja de 3.
user-invocable: true
---

# /ronda [tema]

Las rondas del dueño son de 16: 4 preguntas × 4 opciones, cada opción un paquete sustancial (no ajustes sueltos), las 4 preguntas sobre un mismo tema, multiselección, la recomendada primera y marcada «(Recomendado)», cada opción con qué incluye, qué se va a ver, qué implica (archivos, costo, riesgo, qué deja afuera). Ver `docs/traspaso/memoria/preguntas.md` y `cerrar-con-propuestas.md`.

1. `node scripts/todos.mjs` y leer `docs/todos/README.md`: secciones Preguntas para el dueño, Ideas (por prioridad) y lo `elegida` que ya está. Si el dueño dio un tema, filtrar por `area` o por palabra clave en el título.
2. Agrupar las ideas en 4 preguntas de un mismo tema (por ejemplo: contenido ENCORE, Paseo libre, pulido visual y UX, infraestructura y online). Cada pregunta mezcla hasta 4 TODOs afines; si hay menos de 4 por tema, completar con propuestas nuevas que salgan de `docs/ROADMAP-1.0.md`, `docs/traspaso/hecho/` (madurez «a medias») o de los hallazgos abiertos. Las preguntas pendientes para el dueño (`estado: pregunta`) van primero, como opciones de su pregunta.
3. Lanzar la ronda con AskUserQuestion (4 preguntas, 4 opciones, `multiSelect: true`). Cada opción nombra el slug entre paréntesis para poder marcarlo después.
4. Con la respuesta: `node scripts/todos.mjs estado <slug> elegida` por cada elegido; los nuevos que no existían se crean con `docs/plantillas/todo.md` (`estado: elegida`, `origen: pedido`); una pregunta respondida pasa a `elegida` o `descartada` (con `motivo`) y la decisión se anota en el TODO y, si es de producto, como ADR en `docs/decisiones/`.
5. Seguir con `/encargar` sobre los elegidos, de a 3 con archivos disjuntos. Cuando la cola de elegidas baja de 3, otra ronda sin que el dueño lo pida (regla: hasta que diga «basta»).
