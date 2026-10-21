# Pruebas: qué herramienta para qué

Detalle completo (servidores, candados, tiempos): [../../../.claude/rules/pruebas-herramientas.md](../../../.claude/rules/pruebas-herramientas.md). Todo es headless y se corre UNA vez al final de la tanda.

| Quiero saber si... | Uso |
|---|---|
| Compila | `npx tsc --noEmit -p .` |
| La lógica pura sigue bien | `npm test` (o `npx vitest run --changed --passWithNoTests`) |
| El balance aguanta | `npm run sim -- --seeds 1,2 --secs 600` (duelos con `--duel`) |
| Se ve bien / no cambió lo visual | `npm run shots -- --changed`, `-- --diff` |
| No bajó el rendimiento | `npm run perf -- --changed` |
| Una expedición ENCORE se completa | `npm run e2e` |
| Todo junto, por niveles | `npm run verificar -- --nivel rapido\|tanda\|puerta` |
| El servidor responde | `npm run test:server` |
| El entorno está sano | `npm run doctor` |
| Los docs están bien | `npm run docs:check` |

Los hooks `__*` solo existen contra un servidor de desarrollo, no en el build.
Receta: [../manual/03-verificar-una-tanda.md](../manual/03-verificar-una-tanda.md). Servidores: [../manual/09-worktrees-y-servidores.md](../manual/09-worktrees-y-servidores.md).
