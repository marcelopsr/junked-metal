# 01. Arrancar una sesión

Objetivo: saber dónde quedamos antes de tocar nada. Fuente: [../../../.claude/trabajo/ARRANQUE.md](../../../.claude/trabajo/ARRANQUE.md).

1. `npm run todos` (regenera y valida el tablero) y leer [../../todos/README.md](../../todos/README.md): preguntas para el dueño, elegidas, en curso.
2. `git log -5` y `git status`.
3. Leer `.claude/trabajo/HANDOFF-auto.md` si existe (lo escribe el hook PreCompact) y la sección 5 de [../../HANDOFF-PROYECTOS.md](../../HANDOFF-PROYECTOS.md).
4. Para entender código: `graphify query "<pregunta>"` antes de grep.
5. Decir dónde quedamos y qué sigue. Preguntas solo con AskUserQuestion.

Se verifica: el resumen coincide con `git status` y el tablero.

Trampas:
- `git status` suele traer archivos ajenos sin commitear (imágenes en `assets-src/`, TODOs): no tocarlos.
- En un worktree, ver [09-worktrees-y-servidores.md](09-worktrees-y-servidores.md).
