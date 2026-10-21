---
name: relevo
description: Prepara el relevo a otra herramienta o cuenta (Antigravity, Gemini, Codex, otro Claude): handoff completo, TODOs sin estados colgados, documentación verde, commit local y el prompt de arranque para pegar. Usar con /relevo o cuando el dueño dice que se queda sin tokens.
user-invocable: true
---

# /relevo

El relevo es el repo: `docs/traspaso/HANDOFF.md` + el tablero. Quien entra (cualquier agente) lee `AGENTS.md` y sigue. Este skill deja todo eso consistente en un par de minutos.

1. **Agentes vivos:** si hay subagentes corriendo, esperar su informe o pedirles que entreguen lo que tienen; no dejar trabajo en un worktree sin anotar.
2. **TODOs:** cada `en-curso` tiene `rama` real y su worktree existe (`git worktree list`); si el trabajo quedó a medias, anotarlo en «Notas» del TODO (qué está hecho, qué falta, qué se verificó). Lo que no se empezó vuelve a `elegida`. `node scripts/todos.mjs`.
3. **HANDOFF.md:** reescribir `docs/traspaso/HANDOFF.md` con la plantilla `docs/plantillas/handoff-sesion.md`: objetivo vigente, rama y árbol (qué hay sin commitear y por qué), worktrees vivos, elegidas, preguntas abiertas, verificación (qué se corrió y resultado), siguiente acción concreta. Sin bitácora: se reemplaza entero.
4. **Documentación:** `docs/traspaso/hecho/` y `problemas/` si hubo cambios; `npm run docs:check`; `npm run harness:check`.
5. **Commit local** de lo que esté terminado (`tipo(área): qué`); lo a medias queda en su worktree y se nombra en el handoff. Sin push salvo pedido (`# push-ok`).
6. **Prompt de arranque** para pegar en la otra herramienta, impreso en un bloque:

```text
Seguimos Junked Metal (repo rc_fight). Leé AGENTS.md y después docs/traspaso/INDICE.md y docs/traspaso/HANDOFF.md.
Corré `node scripts/todos.mjs` y mirá docs/todos/README.md. Decime en 3 líneas dónde quedamos y qué sigue, y seguí con
el TODO en curso o el primero elegido. Reglas del dueño en docs/traspaso/memoria/. Preguntas solo con opción múltiple.
```

Para Gemini/Antigravity agregar «Leé también GEMINI.md». Para otro Claude Code en otra máquina: `npm install`, `npm run hooks:install` y, si quiere el harness entero, el `CLAUDE.md` no viaja (ADR 0015): alcanza con `AGENTS.md`, que carga igual. En esta Mac el hook SessionStart ya inyecta tablero y handoff.
