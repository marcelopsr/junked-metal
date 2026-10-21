---
name: encargar
description: Encargar un TODO de docs/todos/ a un agente de esfuerzo bajo en su propio worktree, con el pie de cierre, y registrar el estado. Usar con /encargar <slug> [<slug2> <slug3>] o cuando el orquestador decide lanzar un TODO elegido.
user-invocable: true
---

# /encargar <slug> [...]

Convierte un TODO en un agente corriendo. Hasta 3 slugs a la vez si sus alcances (sección «Toca») no se cruzan; `main.ts`, `render.ts`, `run.ts`, `world.ts`, `zones/common.ts`, `camera_rig.ts` y `balance.json` van de a uno.

Por cada slug:

1. Leer `docs/todos/<slug>.md`. Si falta «Qué y por qué», «Alcance» con archivos o «Cómo verificar», completarlo antes (preguntar al dueño solo si es decisión de producto).
2. Prompt del agente = salida de `npm run todos -- encargo <slug>` más estas líneas: «Estás en un git worktree: `npm run test:restart` al empezar y `npm run test:down` al cerrar. Verificá con `npm run verificar -- --nivel tanda` (o `rapido` si no hay nada visual) y pegá las secciones de `.verificar/<fecha>.md` en el informe. No commitees: el orquestador commitea en tu worktree al integrar.» (El hook SubagentStart repite el pie de cierre; no molesta.)
3. Lanzar con el Agent tool (`isolation: "worktree"`); el resultado dice la rama real (`worktree-agent-…`).
4. Recién ahí `npm run todos -- tomar <slug> --cuenta mac --rama <rama real>` (falla si otra sesión ya lo tiene con otra rama: no forzar).
5. Agente: `sonnet-bajo` para construir, `opus-bajo` si el TODO es diagnóstico o cruza capas, `experiencia` si es UI, `estudio-constructor` si tiene meta medible de arte. Siempre esfuerzo bajo. `run_in_background: true`.

Al recibir el informe de cada agente:

6. Revisar su diff en el worktree (y lanzar `estudio-revisor` si tocó algo compartido, guardado o `server/`).
7. Commitear en el worktree (`git -C <worktree> add -A && git -C <worktree> commit`; el guard permite `-C` para add/commit) e integrar en master con merge, o dejar la rama en cola; `npm run todos -- estado <slug> en-lote` (o `hecha` si ya está en master). Cerrar el worktree.
8. Resumen de 1-2 líneas por TODO y, cuando no quede nada en curso, ronda de AskUserQuestion con los siguientes (`/cerrar-tanda` si la tanda terminó).
