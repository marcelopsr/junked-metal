# Entornos

## Servidores (pm2, `ecosystem.config.cjs`)

| Servidor | Puerto | Para |
| --- | --- | --- |
| `rc-dev` | 5173 | el dueño, con recarga (HMR) |
| `rc-test` … `rc-test-6` | 5174-5179 | pruebas headless, sin HMR, con watcher: siempre sirven el código actual |
| `rc-demo` | 4173 | build de producción (`npm run demo:refresh` para actualizarlo) |
| `rc-test-<carpeta>` | 5200-5299 | uno por git worktree (`npm run test:restart` lo levanta si falta; `test:down` lo borra al cerrar) |

**Nadie reinicia los de prueba** (hook `guard.sh` lo bloquea): si parece viejo, correr de nuevo; si está caído, la herramienta lo levanta. `npm run test:ls` muestra estado, dueño y candados. Si se reinició la Mac: `npm run pm2:start`.

## Navegador

Un solo Chromium headless de Playwright con la GPU real del Mac, abierto solo durante la tanda y cerrado al terminar; nunca el panel del navegador a mano para verificar, nunca nada que robe el foco. Inspección manual puntual: `http://localhost:5173/?mute`.

## Candados

`shots`, `sim`, `evo` y `e2e` de varios agentes comparten un servidor; `perf` es exclusivo. Latido cada 10 s, se libera solo si el dueño murió; `npm run test:unlock` para los colgados. No correr mediciones pesadas en paralelo con otros encargos.

## Worktrees

Cada agente de construcción trabaja en su worktree (`.claude/worktrees/<nombre>`, rama propia). Al terminar: integrar o encolar la rama, `npm run test:down`, borrar el worktree. Las ramas `worktree-agent-*` ya integradas se borran.

## Publicado

Portada en GitHub Pages (`marcelopsr/junked-metal`, solo `portada/`); juego detrás de Cloudflare Access (Worker `jm-login`); servidor en la VPS (`server/README.md`). `npm run publicar` hace todo y corta al primer fallo.

Detalle de todo esto: `.claude/rules/pruebas-herramientas.md`.
