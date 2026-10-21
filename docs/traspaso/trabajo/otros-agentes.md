# Seguir con otro agente (Antigravity, Gemini, Codex, Cursor)

El dueño alterna herramientas cuando se queda sin tokens. Todo lo durable vive en el repo en Markdown plano, así que cualquier agente puede continuar; lo que cambia es qué aplica el harness solo y qué hay que cumplir a mano.

## Qué leer, en orden

1. `AGENTS.md` (raíz): entrada única. Gemini además `GEMINI.md`.
2. [../INDICE.md](../INDICE.md) → [../HANDOFF.md](../HANDOFF.md) → `npm run todos` (tablero).
3. `.claude/rules/*.md` cuando se toque su área (son documentación, no configuración).

## Equivalencias

| En Claude Code | En otros agentes |
| --- | --- |
| Hooks de `.claude/hooks/` bloquean reiniciar `rc-test*`, git destructivo, `rm -rf` | No hay hook: cumplirlo a mano. Lista en [guardarrailes.md](guardarrailes.md) |
| Hook corre `tsc` tras editar y pide `verificar` al cerrar | Correr `npx tsc --noEmit -p .` y `npm run verificar -- --nivel tanda` uno mismo |
| AskUserQuestion (4×4, recomendada primera) | La herramienta de pregunta de opción múltiple que tenga el agente; si no hay, opciones numeradas en texto, recomendada primera, y esperar |
| Subagentes `sonnet-bajo` / `opus-bajo` con el TODO como encargo | Subagentes propios (Gemini `invoke_subagent`) con el texto de `npm run todos -- encargo <slug>`; si no hay subagentes, hacerlo en la sesión de a un TODO |
| Memoria personal de Claude | [../memoria/](../memoria/README.md), ya en el repo |
| `graphify query` (CLI instalada en la Mac) | Igual: es un comando, no depende de Claude |
| Hook PreCompact escribe `HANDOFF-auto.md` | Actualizar [../HANDOFF.md](../HANDOFF.md) a mano antes de cortar |

## Lo que todo agente puede y no puede

- Puede: leer todo el repo (incluido `.claude/`), correr cualquier script de `package.json`, `git` local (add, commit, worktree, log, diff), `graphify`, el navegador headless de las herramientas.
- No puede: editar `.claude/settings.json`, `.claude/hooks/` ni `CLAUDE.md`; `git push`; reiniciar o parar `rc-test*`; levantar servidores fuera de pm2; abrir el juego con foco para verificar.
- Al cerrar: estado del TODO (`npm run todos -- estado <slug> …`), `HANDOFF.md` al día, `npm run docs:check`, y propuestas para seguir.

## Relevo entre herramientas

El relevo es el `HANDOFF.md` más el tablero: quien entra lee, dice en 3 líneas dónde quedamos y sigue con el TODO en curso o el primero elegido. No hace falta ningún archivo de relevo por herramienta. Trabajo en curso de otro agente se reconoce por el worktree y la rama en el tablero (`tomado_por`, `rama`); no se pisa.
