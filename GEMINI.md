# Junked Metal: harness para Gemini / Antigravity

Leer primero `AGENTS.md` (entrada única para todo agente) y seguir sus enlaces: `docs/traspaso/INDICE.md`, `docs/traspaso/trabajo/otros-agentes.md`, `.claude/rules/`. Este archivo solo agrega lo propio de Gemini.

## Modelo y alcance

- **Solo modelos Gemini** para trabajo principal, revisiones y subagentes (`invoke_subagent` con `inherit`, `flash_lite`, `flash` o `pro`); no delegar en otros proveedores sin autorización del dueño (decisión del 2026-10-10).
- Routing de razonamiento sin pedir permiso: Flash Low para ediciones localizadas y docs; Flash Medium (predeterminado) para features, UI y tests; Flash High o Pro para arquitectura, Havok, rendimiento WebGL, `balance.json` o `savefmt.ts`.
- `.claude/`, `CLAUDE.md` y `~/.claude/` son del sistema de Claude: se pueden **leer** como referencia (`.claude/rules/` es documentación), nunca modificar. Los hooks de Claude no corren acá: las reglas que ellos aplican solas (no reiniciar `rc-test*`, sin git destructivo, verificar al cerrar) hay que cumplirlas a mano.
- Permitido: cualquier script de `package.json`, `npx tsc`, `git` local (add, commit, worktree, log, diff), `graphify`, el navegador headless de las herramientas contra `:5173`, `:5174` y los `52xx` de worktrees. Prohibido: `git push`, borrar datos, levantar servidores fuera de pm2.

## Equivalencias

| Claude Code | Gemini / Antigravity |
| --- | --- |
| AskUserQuestion | `ask_question` (opción múltiple, recomendada primera; nunca preguntas sueltas en texto) |
| Subagentes `*-bajo` con el TODO como encargo | `invoke_subagent` con el texto de `npm run todos -- encargo <slug>` |
| Hooks (`guard`, `tsc-post`, `stop-verificar`) | Disciplina manual: `npx tsc --noEmit -p .` tras editar, `npm run verificar` al cerrar |
| Memoria personal | `docs/traspaso/memoria/` (ya está en el repo) |

## Skills de Antigravity (`.agents/skills/`)

Cargar solo las proporcionales a la tarea: `codebase-discovery` (graphify), `implementation-strategy`, `frontend-design` (dentro de `docs/ART_DIRECTION.md` vigente, no del estilo viejo), `data-and-balance`, `testing`, `browser-verification` (headless), `code-review`, `security-review`, `performance-review`, `final-verification`. Flujo chico: implementación → `final-verification`. Flujo grande: discovery → strategy → implementación → testing → browser-verification → code-review → final-verification.

## Cierre de cada tarea

Nunca cerrar solo con «implementación completada»: evidencia (`npm run verificar`), estado del TODO (`npm run todos -- estado <slug> en-lote|hecha`), `docs/traspaso/HANDOFF.md` al día y, con `ask_question`, 2-4 propuestas para seguir (ver `docs/traspaso/memoria/cerrar-con-propuestas.md`). El registro de producto que antes vivía en `docs/archivo/harness-viejo/PRODUCT_EVOLUTION.md` ahora es `docs/todos/` + `docs/decisiones/`.

## Evolución de la geometría de los autos (relevo del 2026-10-13)

Línea autorizada con autonomía total para Gemini: leer `docs/evo-colab/RELEVO-gemini.md`, `docs/EVO_VEHICULOS.md`, `docs/evo-colab/PROTOCOLO.md` y `plantillas/`. Archivos propios: `docs/evo-colab/*`, `docs/EVO_VEHICULOS.md`, `src/car_genes.*`, `src/evo_probe.ts`, `scripts/evo*`. Herramienta: `npm run evo`. Un commit local por ciclo, sin push.
