# Guardarraíles mecánicos

Lo que antes era solo texto en `CLAUDE.md` ahora lo aplica el harness (`.claude/settings.json`, hooks en `.claude/hooks/`, versionados). Montados el 2026-10-21.

| Hook | Momento | Qué hace |
| --- | --- | --- |
| `guard.sh` | antes de cada Bash | Bloquea `pm2 restart/stop/delete/reload/kill` de `rc-test*` o `all`, `git restore/stash/clean`, `reset --hard`, `checkout` de archivos (cambiar de rama sí vale), push forzado, `git push` sin el marcador `# push-ok` (lo pone solo el orquestador cuando el dueño pidió el push), `branch -D`, `worktree remove --force`, `switch -f`, `pkill`/`kill $(lsof…)` de servidores, `find -delete` y `rm -r` fuera de `.shots .perf .e2e .verificar .evo dist node_modules scratch /tmp` (mira cada argumento, quita opciones globales de git como `-C` y detecta subshells, `xargs` y `sh -c`). `npm run harness:check` lo prueba con 60 casos. Devuelve el motivo a Claude. |
| `tsc-post.sh` | tras Edit/Write de un `.ts` en `src/` o `test/` | Corre `npx tsc --noEmit -p .` con 20 s de gracia entre corridas; avisa solo si falla. |
| `stop-verificar.sh` | al cerrar el turno | Si hay cambios en `src/` o `test/` y no hay `.verificar/<hoy>*.md`, pide correr `verificar` o decir en una línea que la tanda sigue. Una vez por parada. |
| `todos-post.sh` | tras Edit/Write de `docs/todos/*.md` | Valida la cabecera y regenera el tablero al instante. |
| `balance-check.sh` | tras Edit/Write de `src/balance.json` | Corre `balance:check`; avisa solo si falla. |
| `session-start.sh` | al abrir sesión | Inyecta rama, árbol, worktrees, tablero y handoff (arranque en frío). |
| `subagent-start.sh` | al lanzar un subagente | Inyecta el pie de encargo (`docs/plantillas/pie-encargo.md`) como `additionalContext`. |
| `guard-edit.sh` | antes de Edit/Write | Bloquea editar a mano `docs/todos/README.md` y `docs/README.md` (generados) y la configuración del harness (`settings.json`, `hooks/`) salvo `CLAUDE_HARNESS_EDIT=1` en la sesión del orquestador. |
| `subagent-stop.sh` | al terminar un subagente | Guarda su informe final en `.claude/trabajo/informes/<fecha>-<id>.md` (evidencia aunque el chat se compacte). |
| `precompact-handoff.sh` | antes de compactar contexto | Escribe `.claude/trabajo/HANDOFF-auto.md` con rama, árbol, diff y el Pendiente del último verificar. |

## Pre-commit de git (`scripts/git-hooks/pre-commit`, `npm run hooks:install`)

Frena el commit si lo staged trae archivos de credenciales o un token conocido (OpenAI, Anthropic, AWS, GitHub, Slack, Google, Cloudflare, `JM_SECRET`); si toca `docs/`, regenera el tablero y corre `docs:check`. El pre-push corre `harness:check`, `docs:check`, `todos.check` y `tsc` antes de subir (lo mismo que el CI primero). `npm run harness:check` prueba todo el harness en 2 s (lo corren `verificar --nivel rapido` y el CI). `npm run limpiar` (`-- --dias 7 --seco`) borra capturas, perf, e2e e informes viejos, poda worktrees y lista ramas sin integrar.

## Permisos

- `allow`: todas las pruebas y lecturas del repo (`npm test`, `test:*`, `shots`, `sim`, `e2e`, `perf`, `evo`, `verificar`, `check`, `balance:*`, `doctor`, `todos`, `docs:check`, `pm2 status/logs`, `graphify`, `git` de lectura, lecturas del navegador integrado).
- `deny`: lo que el guard también corta (doble protección): reiniciar `rc-test*`, `pm2 kill`, push forzado, `reset --hard`, `clean -f`, `stash`, `restore`.

## Reglas por tema (`.claude/rules/`)

Se cargan solas cuando se toca un archivo de su alcance (`paths:` en el frontmatter): `havok.md`, `rendimiento.md`, `balance.md`, `dev-hooks.md`, `pruebas-herramientas.md`. `CLAUDE.md` quedó con lo que aplica siempre (dirección de arte, flujo, mapa del código, lo imprescindible de servidores).

## Si un hook molesta

Se ajusta el script, no se desactiva el hook. Un bloqueo del guard que el dueño quiera igual lo corre él. Probar un cambio del guard con un script aparte: el hook también lee el texto del comando que lo prueba.
