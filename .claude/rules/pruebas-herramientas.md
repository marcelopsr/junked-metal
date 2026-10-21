---
paths:
  - "scripts/**"
  - "ecosystem.config.cjs"
  - "package.json"
  - ".claude/**"
  - "test/**"
---

# Herramientas de prueba (headless, por línea de comandos)

Detalle completo de lo que `CLAUDE.md` resume en «Verificar». Reemplazan a abrir el panel del navegador a mano: el usuario no corre comandos, los corren el asistente y los encargos.

## Servidores y candados

Todas usan UN Chromium headless shell de Playwright con la GPU real del Mac (banderas ANGLE/Metal en `scripts/lib/browser.mjs`; sin ellas cae a SwiftShader por CPU, ~10x más lento) contra pm2 `rc-test` :5174.

**Nadie reinicia los servidores de prueba** (ni agentes ni herramientas; el hook `.claude/hooks/guard.sh` lo corta): se autogestionan, sirven SIEMPRE el código actual (Vite con watcher activo y HMR apagado: cada corrida carga la página de cero y toma el código nuevo; pm2 los revive con espera creciente si mueren, tope 1,5 GB). **¿Sirve mi código?** Sí, siempre: no hay sello ni aviso de servidor viejo; basta con correr de nuevo.

- **Grupo de 6 servidores (mismo árbol):** `rc-test` :5174 y `rc-test-2..6` :5175-5179 (pm2, sin recarga, `cacheDir` propio). Cada PROCESO (`shots`, `sim`, `e2e`, script suelto, `test:restart`) alquila solo un servidor libre vía `launch()` (`pickServer` en `scripts/lib/browser.mjs`; prefiere el último de su sesión, `RC_SRV=3` o `=5176` fuerza uno compartido), y solo lo levanta (`pm2 start`) si está caído; nunca lo reinicia por código viejo; si están los 6 ocupados espera al primero libre.
- `npm run test:restart` = «asegurar que están arriba» (nombre por compatibilidad): arriba = no hace nada; caído = lo levanta; colgado de verdad (online sin HTTP 30 s) = lo reinicia solo si nadie lo tiene alquilado, si no espera. `npm run test:ls` lista los 6 (estado, dueño, minutos activo, candados).
- **En un git worktree** cada uno tiene su servidor (`rc-test-<carpeta>`, puerto fijo 5200-5299 por ruta; `shots`/`perf`/`sim` lo usan solos): `npm run test:restart` primero (crea `node_modules` como symlink y levanta SU servidor solo si está caído; borra solo los `rc-test-*` de worktrees cuya carpeta ya no existe), después lo de siempre, y `npm run test:down` al cerrar (borra solo el de ese worktree: nunca el grupo ni otros worktrees).
- Scripts sueltos: `withBrowser(async (browser) => {...}, { timeoutMs })` (en `browser.mjs`) suelta candado y alquiler siempre; `open()` corta a los `RC_OPEN_MAX` s (200).
- **Multiagente:** candado lector/escritor por servidor (`lock` en `lib/browser.mjs`): `shots`, `sim`, `evo` y `e2e` de varios agentes corren a la vez sobre el mismo rc-test; `perf` es exclusivo (frena lectores nuevos y espera a que terminen los vivos) y así mide sin vecinos; el servidor nunca se reinicia a mitad de corrida.
- **Candado con latido:** cada candado propio se toca cada 10 s; sin latido 45 s, o más viejo que `RC_LOCK_TTL` (20 min), el que espera lo da por colgado, mata al dueño y lo libera; un proceso que se pasa del TTL se aborta solo (exit 124). `RC_WAIT_MAX` (15 min) topa la espera de un lector; un `test:restart` espera como mucho `RC_EXCL_WAIT` (3 min) a los lectores y, si se rinde, suelta la marca que frena lectores nuevos (reintentar o `test:unlock`). `npm run test:unlock` libera solo muertos/colgados/vencidos (`-- --force` libera todos, mata lectores vivos: último recurso). Con muchos agentes: cada uno en su worktree.
- Abren y cierran su navegador solos y no levantan servidores. Se corren UNA vez, al final de la tanda de cambios.

## Comandos

| Para | Comando | Tarda |
|---|---|---|
| Lógica pura: balance, importador de planilla, guardado (`src/savefmt.ts`), XP, pasivas y pilotos, perfiles de semilla | `npm test` | <1 s |
| Pruebas lentas (`*.lento.test.ts`, hoy `match3_balance`, ~30 s; `npm test` no las corre) | `npm run test:lento`; `npm run test:todo` corre todo (lo usan `publicar` y el workflow de Pages) | ~30 s |
| Balance: partidas del bot y duelos contra jefes, sin dibujar | `npm run sim -- --seeds 1,2,3 --secs 600` · `npm run sim -- --duel perro,aspiradora --seeds 1,2 [--adds 100 --max 180 --god --team N]` · `--par 2` · `--json` | ~12 s por semilla de 600 s |
| Ver cómo quedó: menús, bestiario, lab, partida, cartas, carrera (compu 1280x720 y celu 390x844) | `npm run shots` (`-- --only garaje --vp cel`; un solo `--vp`) y leer las PNG de `.shots/actual/` | ~30 s |
| Detectar cambios visuales no queridos | `npm run shots -- --diff` (diferencias en `.shots/diff/`, exit 1 si algo cambió); `-- --update` acepta lo capturado como nueva referencia (`.shots/ref/`) | ~30 s |
| Rendimiento: ms/cuadro, draw calls, triángulos, mallas, memoria JS, tiempo hasta portada | `npm run perf` (`-- --only lab --vp pc --frames 180`) guarda `.perf/AAAA-MM-DD-HHMM.json` y muestra el % contra la medición anterior | ~65 s |
| Evolucionar la geometría de un auto (DE + Pareto NSGA-II, siluetas, vistas, reporte HTML) | `npm run evo -- --car buggy --pop 20 --gens 12 --seed 1` · `-- --from <corrida>` · `-- --export <corrida> --id iNN --motivo "..."` · `-- --reset`; reporte en `.evo/<auto>/<corrida>/index.html`, historial en `evo/historial.json` | ~2 min |
| E2E de ENCORE: una expedición con el bot, PNG por paso en `.e2e/<fecha>/`, exit 1 si falla un paso o hay error de consola (`consola: ...`) | `npm run e2e` (`scripts/e2e.mjs`, `-- --vp pc|cel|pc,cel --seed N`) | ~1 min |
| Publicar: tests, build, e2e, deploy a la VPS y al Worker, chequeos de producción; corta al primer fallo | `npm run publicar` (`-- --seco` solo imprime, `--sin-e2e`, `--commit "msg"` commitea y pushea al final y agrega a `portada/novedades.json` hasta 3 entradas feat/fix desde `.publicado`; `--sin-novedades`) | varios min |
| Comando único por niveles (lo usan los encargos) | `npm run verificar -- --nivel rapido\|tanda\|puerta [--seco]` (`scripts/verificar.mjs`): `rapido` = tsc + vitest --changed + docs:check; `tanda` = rapido + shots --changed (caché por hash) + sim 2 semillas (si el diff toca balance/lógica) + e2e pc 1 semilla (si toca `src/`); `puerta` = tsc, test:todo, balance:check, build, e2e pc,cel ×5, sim --encore 20 semillas, shots pc y cel completos. Escribe `.verificar/<fecha>.md` (Implementado / Verificado / Observado / Pendiente) con logs por paso | según nivel |
| En lote (viejo) | `npm run check` corre en paralelo tsc, vitest --changed y shots --changed | ~40 s |

## Cómo funcionan por dentro

- **Pruebas selectivas:** `npm run shots -- --changed` (y `perf -- --changed`) elige las sesiones según `git diff` (mapa en `scripts/lib/changed.mjs`; `--base <ref>` compara contra otro commit); si no hay nada visual sale sin abrir el navegador.
- Los escenarios viven en `scripts/scenarios.mjs` (una sesión = una carga de página; cada shot es un paso con `act(page)`); los usan `shots` y `perf`. Agregar uno es agregar un objeto. Todo avanza con `__tick` y esperas por condición.
- `shots` y `perf` detienen el bucle de dibujo y fijan 1/60 s por cuadro (`freeze` en `lib/browser.mjs`): sin eso dos corridas difieren 5-10 % de píxeles. Tolerancia del diff: 1 % (`tol` por shot; la carrera usa 8 % por el `Math.random` de kart.ts).
- `sim` reemplaza `Math.random` por un generador con la semilla antes de arrancar (las armas solo lo usan en efectos visuales): misma semilla = mismo resultado. Informa `atascos` (n y segundos máximos) y `dano_recibido` por fuente (`--json`); un error de consola en una semilla se imprime en stderr.
- **Pool de navegadores:** `scripts/lib/pool.mjs` (`pool(n, items, fn)`) reparte trabajos con un Chromium por trabajador; lo usa `sim --par N` (3 por defecto).
- `perf`: draws, triángulos, mallas y heap son exactos; ms/cuadro tiene ~10-15 % de ruido (se marca solo más del 20 %). Es del Mac con su GPU: sirve para comparar antes/después, no como FPS de un celular.
- Solo funcionan contra un servidor de desarrollo (los hooks `__*` no existen en el build de `rc-demo`). `.shots/`, `.perf/`, `.e2e/`, `.verificar/` no se versionan.
- ponytail: `sim` no corre en Node puro (NullEngine + Havok sí podrían, pero `main.ts` mezcla DOM, WebGL y lógica); si se parte la lógica de la presentación, `sim` podría correr sin navegador.

## Servidores de desarrollo (pm2, `ecosystem.config.cjs`)

- `rc-dev` (Vite :5173, con recarga, para el usuario), `rc-demo` (preview del build :4173) y el grupo `rc-test*` quedan corriendo siempre. No levantar servidores sueltos ni abrir puertos propios; no apagarlos con `kill`. Lo permitido: `pm2 restart rc-dev`, `npm run pm2:logs`, `npm run pm2:status`. Logs con fecha en `logs/` (pm2-logrotate: 10 MB, 7 días). Si se reinicia la Mac: `npm run pm2:start` (sin arranque automático).
- App en el Mac (demo): `/Applications/Junked Metal.app` sirve el build de producción (`dist/`) con `npm run demo` en :4173 (log `/tmp/rcfight-demo.log`) y abre Chrome `--app`. Toma cambios con `npm run demo:refresh` (build + reinicio).
- `.claude/launch.json` solo se conecta a :5173 (no arranca nada). Con otro agente tocando los mismos archivos, el HMR de :5173 recarga la página a cada rato: para pruebas largas usar `rc-test`.
- **Publicado:** https://marcelopsr.github.io/junked-metal/ (repo público `marcelopsr/junked-metal`). Cada push a `master` recompila y publica vía `.github/workflows/pages.yml`. El build usa `base: "./"`: no usar rutas absolutas (`/algo`) en HTML, CSS ni manifiesto.
