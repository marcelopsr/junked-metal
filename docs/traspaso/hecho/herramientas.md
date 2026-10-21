# Hecho: herramientas y harness

Guía completa: [`docs/HARNESS.md`](../../HARNESS.md); reglas de uso y filosofía «verificar en proporción al cambio» en [`CLAUDE.md`](../../../CLAUDE.md). Todo es headless (un Chromium de Playwright con la GPU real del Mac, banderas en `scripts/lib/browser.mjs`) y solo corre contra servidores de desarrollo: los hooks `__*` no existen en el build.

## Fichas

- **Pruebas de lógica.** `npm test` (Vitest, `test/*.test.ts` y `test/encore/`), `npm run test:server` (node:test), `test:lento` para `*.lento.test.ts`, `test:todo` para todo. Madurez: estable.
- **shots.** Capturas pc 1280x720 y celu 390x844 de menús, partida, bestiario, carrera; `--diff`, `--update`, `--changed`, `--only`, un solo `--vp`. `scripts/shots.mjs`, escenarios en `scripts/scenarios.mjs`, mapa archivo a sesión en `scripts/lib/changed.mjs`, cache por hash. Tolerancia 1 %. Madurez: estable.
- **sim.** El bot juega sin dibujar, por semilla: `--seeds`, `--secs`, `--duel`, `--encore`, `--pacts all`, `--par N`, `--json`; informa atascos y daño por fuente. `scripts/sim.mjs`, bot en `src/devbot.ts`. Madurez: estable.
- **perf.** ms por cuadro, draw calls, triángulos, mallas, heap; guarda `.perf/*.json`. `scripts/perf.mjs`, exclusivo (frena lectores). Madurez: estable; el ruido de ms/cuadro es 10-15 %. `perf:cel` en `scripts/perf-cel.mjs`.
- **e2e.** Una expedición ENCORE con el bot, PNG por paso en `.e2e/<fecha>/`, falla ante errores de consola. `scripts/e2e.mjs`, `--vp pc,cel --seed N`. Madurez: estable.
- **evo.** Evolución de la geometría de un auto con DE y Pareto, reporte HTML en `.evo/`. `scripts/evo.mjs`, `src/evo_probe.ts`. Madurez: usable.
- **verificar.** Comando único: `npm run verificar -- --nivel rapido|tanda|puerta [--seco]`; escribe `.verificar/<fecha>.md` con Implementado, Verificado, Observado y Pendiente. `scripts/verificar.mjs`. Diseño: [PRUEBAS-infra](../../../.claude/trabajo/PRUEBAS-infra.md). Madurez: estable.
- **Servidores de prueba.** Grupo de 6 (`rc-test` :5174 y `rc-test-2..6`), alquilados por `launch()`, candado lector/escritor con latido; un servidor por worktree (`rc-test-<carpeta>`, puertos 5200-5299). `npm run test:restart|test:ls|test:unlock|test:down`. Madurez: usable; ver [problemas/servidores-de-prueba.md](../problemas/servidores-de-prueba.md).
- **publicar.** Tests, build, e2e, deploy a VPS y Worker, chequeos de producción; `--seco`, `--sin-e2e`, `--commit`. `scripts/publicar.mjs`. Madurez: usable; se corre solo con OK del usuario.
- **Balance a planilla.** `npm run balance:xlsx` genera `balance.xlsx`; `balance:import` valida y escribe; `balance:check` prueba la ida y vuelta. `scripts/balance-*.mjs`. También `npm run dps` (DPS analítico) y `npm run oleadas`. Madurez: estable; la planilla todavía no está subida a Drive.
- **Medición de arte.** `scripts/ref_measure.py` y `ref_palette.py` miden contraste y paleta contra las láminas registradas. Generación de imágenes: `scripts/imagegen.mjs`, `imagegen_import.py`, `scripts/creative-*.mjs` (ComfyUI local).
- **Diagnóstico.** `npm run doctor` y `doctor:fix` revisan el entorno; `npm run carga` mide el servidor.
- **TODOs y docs.** `npm run todos` genera [`docs/todos/README.md`](../../todos/README.md); `npm run docs:check` revisa enlaces, cabeceras y el tope de 80 líneas. Formato: [FORMATO](../../todos/FORMATO.md).
- **graphify.** Grafo de conocimiento en `graphify-out/` (`graphify query|path|explain`, `graphify update .`); no versionado. Madurez: usable.
- **pm2.** `ecosystem.config.cjs`: `rc-dev` :5173 (HMR), `rc-demo` :4173 (build), grupo `rc-test*`. `npm run pm2:start|pm2:status|pm2:logs`, `demo:refresh`. Nadie reinicia `rc-test*` a mano.
- **Guardarraíles.** `.claude/hooks/` (`guard.sh`, `tsc-post.sh`, `stop-verificar.sh`, `precompact-handoff.sh`), reglas por tema en `.claude/rules/` y permisos en `.claude/settings.json`.

## Qué correr según lo tocado

Siempre `npx tsc --noEmit -p .`; lógica `vitest --changed`; visual `shots --changed`; balance `sim` con 1-2 semillas; `build` solo antes de push. Suites completas solo para renovar referencias o en la puerta de versión.
