# 02. Encargar un TODO a un agente

Objetivo: que un subagente haga una tarea acotada con un encargo autocontenido. Formato del TODO: [../../todos/FORMATO.md](../../todos/FORMATO.md).

1. Elegir el TODO en `docs/todos/` (estado `elegida`). Si no existe, copiar [../../plantillas/todo.md](../../plantillas/todo.md).
2. Tomarlo: `npm run todos -- tomar <slug> --cuenta mac --rama <rama>` (queda `en-curso`).
3. Imprimir el encargo: `npm run todos -- encargo <slug>` (cuerpo + pie de `.claude/trabajo/pie-encargo.md`) y pasarlo como prompt.
4. Elegir agente de esfuerzo bajo (`sonnet-bajo`, `opus-bajo`, `estudio-constructor`; ver la tabla de ARRANQUE.md). Hasta 3 en paralelo, solo con archivos disjuntos; `main.ts`, `render.ts` y `balance.json` los toca uno a la vez.
5. El encargo debe llevar propiedad de archivos, exclusiones y validación (plantilla 17.2 en ARRANQUE.md).
6. Al volver: revisar el diff, y `npm run todos -- estado <slug> en-lote` o `hecha`.

Se verifica: [03-verificar-una-tanda.md](03-verificar-una-tanda.md) UNA vez al final.

Trampas:
- Prohibir a los agentes `git checkout/restore/stash/reset`; el hook `.claude/hooks/guard.sh` también los corta.
- Un problema ajeno que aparece se anota como TODO nuevo, no se arregla de paso.
