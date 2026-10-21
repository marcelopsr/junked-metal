---
name: cerrar-tanda
description: Cierre de una tanda de trabajo en Junked Metal: verificación en segundo plano, revisor independiente sobre el diff, estados de TODOs, handoff y documentación al día, commit local y ronda de propuestas. Usar con /cerrar-tanda o cuando no queda ningún agente en curso.
user-invocable: true
---

# /cerrar-tanda

Se corre cuando los agentes de la tanda terminaron e integraste sus ramas. Todo headless, en segundo plano lo largo.

1. **Verificar:** `npm run verificar -- --nivel tanda` con `run_in_background: true` (si solo hubo docs o lógica sin visual, `rapido`). Esperar la notificación; si falla una fase, arreglar o anotar TODO con `origen: hallazgo` y `prioridad: alta`.
2. **Revisar:** lanzar `estudio-revisor` (esfuerzo bajo) con el diff de la tanda (`git diff <base>..HEAD` o el árbol) y la lista de TODOs integrados; devuelve errores reales de corrección, Havok, rng, fugas y textos. Hallazgos críticos se arreglan antes de seguir; el resto entra como TODO.
3. **Informes:** los informes finales de los agentes quedan en `.claude/trabajo/informes/` (hook SubagentStop); enlazar el que corresponda desde «Notas» del TODO.
4. **Estados:** `npm run todos -- estado <slug> hecha` por cada TODO que quedó en master; `en-lote` si quedó en rama. Hallazgos nuevos → `docs/todos/<slug>.md` (`idea`, `origen: hallazgo`).
5. **Documentación:** si cambió lo que existe, `docs/traspaso/hecho/`; si algo se rompió y se arregló, `docs/traspaso/problemas/`; decisión del dueño → `docs/decisiones/`; regla nueva → `docs/traspaso/memoria/`. Reescribir `docs/traspaso/HANDOFF.md` (objetivo, árbol, elegidas, siguiente acción). `npm run docs:check`.
6. **Commit local** (`tipo(área): qué`, uno por tema; el pre-commit regenera el tablero). Sin push salvo pedido. Si la tanda cierra una versión: `npm run verificar -- --nivel puerta` y después `npm run publicar -- --seco`.
7. **Cerrar con propuestas:** resumen con Implementado / Verificado / Observado / Pendiente y una ronda de AskUserQuestion (hasta 4×4, multiselección, recomendada primera) con los siguientes TODOs o programas largos. Nunca una pregunta suelta en el texto.
