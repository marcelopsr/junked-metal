# Junked Metal (repo rc_fight)

Survivor.io roguelite web con autos RC en un patio gigante. Babylon.js 9 + Havok + TypeScript + Vite.
Dirección de arte obligatoria: `docs/ART_DIRECTION.md` (noche, low-poly pixelado, un solo foco duro, post retro CRT,
HUD de telemetría RC como terminal gastada, **nada de emojis ni UI genérica**). Textos del juego: español neutro impersonal, sin voseo (ver ART_DIRECTION).

## Cómo trabajamos (CLI o chat, mismo flujo)

**Modelo en Cursor:** solo `composer-2.5` (sesión y subagentes); ver `.cursor/rules/composer-solo.mdc`.

Metodología `orquestar` (skill de usuario): la sesión principal reparte, encarga, integra y verifica; los encargos a subagentes son autocontenidos. Guía para este juego: `.Codex/trabajo/ARRANQUE.md`.

1. **Entender con graphify primero** (ver sección graphify abajo): `graphify query`, `path`, `explain` antes de grep o de leer archivos enteros.
2. **Construir con ponytail** (plugin habilitado en `.Codex/settings.json`): la escalera YAGNI → reusar lo que ya existe → stdlib/plataforma → dependencia instalada → mínimo código. Los atajos deliberados llevan un comentario `ponytail:` con su techo.
   - `/ponytail-review` sobre el diff antes de cerrar una tarea grande.
   - `/ponytail-audit` cuando un módulo crece (hoy `main.ts` y `weapons.ts` son los candidatos).
   - `/ponytail-debt` para listar los `ponytail:` pendientes.
3. **Verificar** siempre: `npx tsc --noEmit -p .`, `npm test` y `npm run build`; después probar con las herramientas headless (`npm run shots`, `sim`, `perf`: ver "Herramientas de prueba"), no con el panel del navegador a mano.
4. **Mantener el grafo**: `graphify update .` tras cambios de código (el hook de git lo hace en cada commit). Cambios en docs → `/graphify --update`.
5. **Loop con AskUserQuestion (toolbox)** — regla `.cursor/rules/loop-colaboracion.mdc`: solo para dudas reales de diseño, balance o prioridad (preferir 1-3 preguntas por ronda); al cerrar una tanda, otra ronda si hay decisiones abiertas. No preguntas sueltas en el chat. Herramientas del proyecto y de la Mac: usar sin pedir permiso. **Git:** commit local tras cada tanda con cambios; push a `origin/master` sin preguntar al terminar una tanda significativa o al cerrar sesión (usuario autorizó). Nunca AskUserQuestion sobre commit/push salvo que el usuario lo pida explícitamente.
6. **Plan antes de feature** — regla `.cursor/rules/plan-antes-de-feature.mdc`: features nuevas, modos o cambios que crucen módulos exigen plan en `docs/` + rondas de toolbox hasta cerrar las decisiones, antes de cualquier código (ejemplo: `docs/BATTLE_RC_PLAN.md`).

## Mapa del código (`src/`)

| Archivo | Rol |
|---|---|
| `main.ts` | Bootstrap del motor, estado de partida, loop `update()`, spawner, bosses, menú, guardado |
| `car.ts` | `CARS`, `drive()` (manejo arcade sobre Havok), clase `Car` con animación visual |
| `enemies.ts` | `DEF` por tipo, clase `Enemy` (IA, patas animadas), `spawnTable()` |
| `weapons.ts` | Armas (clases), pasivas, evoluciones, `levelOffers()` |
| `models.ts` | Modelos procedurales, plantillas instanciadas (`template()`), `carModel()`, patas |
| `world.ts` | Patio 200×200, props, pasto en thin instances, `spawnPoint()` |
| `render.ts` | PBR (`pbr()`, `M`), cielo/sonda, luna + faro del auto (`setLamp`), niebla, shader retro, escala pixelada, texturas procedurales |
| `fx.ts` | Partículas en pool, restos, marcas en el piso, impacto por arma (`impact`: chispas, pedazos, squash) |
| `replay.ts` | Cierre de partida: UI de la cámara lenta (la cronometra `main.ts`, `outroTick`) y foto polaroid de los resultados |
| `intro.ts` | Intro de 4 cuadros en canvas 2D (primer arranque y Créditos → Ver intro) |
| `ui.ts` / `hud.css` / `icons.ts` / `style.css` | HUD de telemetría (radar, racha, avisos de radio), cartas de mejora, números de daño, íconos SVG propios |
| `menu.ts` / `menu.css` | Flujo de menús (título, principal, garaje, taller, configuración, bestiario, créditos, pausa, resultados), guardado `Save`, instalar app |
| `sfx.ts` | Audio sintetizado: canales, sonidos de juego e interfaz |
| `kart.ts` / `race.css` | Modo Carrera estilo Mario Kart: circuito en el patio, 10 corredores (IA con personalidad), objetos, derrape con mini-turbo, Lakitu, copa de 3, pantalla dividida para 2 (teclado + joystick) SOLO en compu: en teléfono/táctil nunca hay 2 jugadores (decisión del usuario; `raceCfg.players` se fuerza a 1 y el selector no aparece), así que no diseñar ni probar split screen en celular. `?race[&players=2]` la arranca en dev; `__race.auto()/info()/give()/use()/skip()` para pruebas |
| `input.ts` | Teclado, gamepad y táctil unificados |

## Trampas de Havok (ya nos mordieron)

- El cuerpo toma la pose de la malla **al crearse** (`disablePreStep = true`): posicionar/rotar la malla ANTES del `PhysicsAggregate`.
  Moverla después deja el colisionador en otro lado (así quedaron macetas en el origen hundiendo al auto).
- `setMassProperties` reemplaza TODO: mandar siempre masa + inercia juntas (usar `Car.setMass`).
- No desplazar `centerOfMass` en cuerpos a los que se les fija la velocidad cada frame: Havok resuelve mal el contacto.

## Rendimiento (web multiplataforma)

- Enemigos, proyectiles, gemas y marcas son **instancias** de plantillas fusionadas: nunca crear mallas sueltas por entidad.
- Partículas del pool de `fx.ts`; no crear `ParticleSystem` nuevos.
- Render a baja resolución interna con píxeles visibles (Configuración → Imagen: escala manual 50-100 % o FSR 1 de Babylon, `applyGfx` en `render.ts`; preajustes Bajo/Medio/Alto/Ultra en `PRESETS`, Medio por defecto); `low = isTouch` quita el bloom y baja partículas y DOF. El pasto usa `rng()` con base fija: el Detalle no puede cambiar la semilla.
- Tope de enemigos en `update()` (`maxAlive`); tope de gemas 350, restos 240, marcas 500.

## Herramientas de prueba (headless, por línea de comandos)

Reemplazan a abrir el panel del navegador a mano: el usuario no corre comandos, los corren el asistente y los encargos. Todas usan UN Chromium headless shell de Playwright con la GPU real del Mac
(banderas ANGLE/Metal en `scripts/lib/browser.mjs`; sin ellas cae a SwiftShader por CPU, ~10x más lento) contra pm2 `rc-test` :5174 (tras cambios de código: `pm2 restart rc-test`).
Abren y cierran su navegador solos y no levantan servidores. Se corren UNA vez, al final de la tanda de cambios, y de a una (comparten rc-test y CPU: en paralelo ensucian `perf`).

| Para | Comando | Tarda |
|---|---|---|
| Lógica pura: balance, importador de planilla, guardado (`src/savefmt.ts`), XP, pasivas y pilotos, perfiles de semilla | `npm test` | <1 s |
| Balance: partidas del bot y duelos contra jefes, sin dibujar | `npm run sim -- --seeds 1,2,3 --secs 600` · `npm run sim -- --duel perro,aspiradora --seeds 1,2 [--adds 100 --max 180 --god --team N]` · `--par 2` · `--json` | ~12 s por semilla de 600 s |
| Ver cómo quedó: menús, bestiario, lab, partida, cartas, carrera (compu 1280x720 y celu 390x844) | `npm run shots` (`-- --only garaje --vp cel`) y leer las PNG de `.shots/actual/` | ~30 s |
| Detectar cambios visuales no queridos | `npm run shots -- --diff` (diferencias en `.shots/diff/`, exit 1 si algo cambió); `-- --update` acepta lo capturado como nueva referencia (`.shots/ref/`) | ~30 s |
| Rendimiento: ms/cuadro, draw calls, triángulos, mallas, memoria JS, tiempo hasta portada | `npm run perf` (`-- --only lab --vp pc --frames 180`) guarda `.perf/AAAA-MM-DD-HHMM.json` y muestra el % contra la medición anterior | ~65 s |

- Los escenarios viven en `scripts/scenarios.mjs` (una sesión = una carga de página; cada shot es un paso con `act(page)`); los usan `shots` y `perf`. Agregar uno es agregar un objeto. Todo avanza con `__tick` y esperas por condición.
- `shots` y `perf` detienen el bucle de dibujo y fijan 1/60 s por cuadro (`freeze` en `lib/browser.mjs`): sin eso dos corridas difieren 5-10 % de píxeles. Tolerancia del diff: 1 % (`tol` por shot; la carrera usa 8 % por el `Math.random` de kart.ts).
- `sim` reemplaza `Math.random` por un generador con la semilla antes de arrancar: el juego lo usa en dispersión y daño de algunas armas (weapons.ts) y sin esto la misma semilla da resultados distintos. Con eso, misma semilla = mismo resultado.
- `perf`: draws, triángulos, mallas y heap son exactos; ms/cuadro tiene ~10-15 % de ruido (se marca solo más del 20 %). Es del Mac con su GPU: sirve para comparar antes/después, no como FPS de un celular.
- Solo funcionan contra un servidor de desarrollo (los hooks `__*` no existen en el build de `rc-demo`). `.shots/`, `.perf/` y los resultados no se versionan.
- ponytail: `sim` no corre en Node puro (NullEngine + Havok sí podrían, pero `main.ts` mezcla DOM, WebGL y lógica); si se parte la lógica de la presentación, `sim` podría correr sin navegador.

## Pruebas

**Reglas de trabajo (usuario, 2026-10-04):**
- Hacer TODOS los cambios de la tanda y recién después probar UNA vez (no verificar pedacito por pedacito).
- No levantar servidores ni abrir puertos propios: usar los de pm2. `rc-dev` :5173 (con recarga, para el usuario),
  `rc-test` :5174 (sin recarga, compartido para pruebas: tras la tanda de cambios `pm2 restart rc-test` y probar), `rc-demo` :4173 (build).
- Navegador: uno solo, liviano (Chromium headless), abierto solo durante la tanda de capturas/pruebas y cerrado al terminar;
  nunca dejar el juego renderizando entre mediciones. No correr mediciones pesadas en paralelo con otros encargos.
  Los encargos verifican con `npm test`, `npm run shots`, `sim` y `perf` (ver "Herramientas de prueba"); el panel del navegador queda para inspección interactiva puntual.

- App en el Mac (demo): `/Applications/Junked Metal.app` sirve el **build de producción** (`dist/`) con `npm run demo` en :4173
  (log `/tmp/rcfight-demo.log`) y abre una ventana de Chrome `--app`. Para que la demo tome cambios: `npm run build`.
  Desarrollo aparte en :5173.
- **Servidores con pm2** (`ecosystem.config.cjs`): `rc-dev` (Vite :5173) y `rc-demo` (preview :4173) quedan corriendo siempre.
  No levantar servidores sueltos ni apagarlos con `kill`: usar `pm2 restart rc-dev`, `npm run pm2:logs`, `npm run pm2:status`.
  La demo toma cambios con `npm run demo:refresh` (build + reinicio). Logs con fecha en `logs/` (rotados por pm2-logrotate: 10 MB, 7 días).
  Reinicio automático con espera creciente y tope de memoria de 1,5 GB. Si se reinicia la Mac: `npm run pm2:start` (sin arranque automático).
  `.Codex/launch.json` solo se conecta a :5173 (no arranca nada). Para pruebas largas sin HMR sigue valiendo un Vite aparte en otro puerto.
- **Publicado:** https://marcelopsr.github.io/junked-metal/ (repo público `marcelopsr/junked-metal`, antes rc-fight). Cada push a `master` recompila y publica
  vía `.github/workflows/pages.yml`. El build usa `base: "./"`: no usar rutas absolutas (`/algo`) en HTML, CSS ni manifiesto.
- **Probar siempre en silencio** (inspección a mano; las herramientas headless ya lo hacen): abrir `http://localhost:5173/?mute` (el audio no se inicializa). Al terminar, cerrar la pestaña
  (el servidor lo maneja pm2: no apagarlo).
- Con la pestaña oculta el navegador no corre `requestAnimationFrame`: usar los hooks de dev de `main.ts`
  (`__tick(n)`, `__time(s)`, `__xp(n)`, `__god()`, `__killAll()`, `__info()`, `__car()`), solo existen en `import.meta.env.DEV`.
  `__outro()` fuerza la derrota (cámara lenta + foto; con `__tick(n)` se avanza). `?intro` fuerza la intro y `__introAt(s)` la congela en el segundo s; `?mute` y `?lab` nunca la disparan sola.
  Con otro agente tocando los mismos archivos, el HMR de :5173 recarga la página a cada rato: un Vite aparte con `server: { hmr: false, watch: null }` y `cacheDir` propio sirve para pruebas largas.
- **Semillas:** todo lo que decide la partida usa `rng()` (src/rng.ts), nunca `Math.random` (solo para efectos visuales).
  `?seed=N` fija la partida. Cada semilla define clima, plaga, patio (layout), orden de minijefes y ritmo de eventos (src/run.ts).
  Determinista desde una carga limpia de la página (entre partidas seguidas Havok diverge un poco). Ojo: algunas armas (weapons.ts) usan `Math.random` en daño y dispersión, así que `__sim` a mano repite solo en parte; `npm run sim` lo fija y sí repite.
- **Simulación rápida:** `__sim(600)` juega 10 minutos sin dibujar (~5-15 s reales) con el bot y devuelve un resumen; `__dmg()` da el daño por fuente.
  Usarla para balance en vez de jugar en tiempo real. Si pasa de ~35 s reales corta: seguir con otra llamada. Por línea de comandos: `npm run sim` (varias semillas, duelos, JSON).
- Playtest real: `await __bot(60)` (src/devbot.ts, solo dev) juega sin trampas y devuelve un resumen; correr en tandas de ~60 s de juego.
- **Modo lab (solo dev, para iterar el look):** `http://localhost:5173/?mute&seed=3&lab[&climate=niebla][&boss]` arranca solo una partida
  congelada, en god mode, con una fila de cada enemigo delante del auto (un screenshot muestra todo). Perillas en vivo sin recargar:
  `__look({ lampI, glowI, cone, ambMul, moonMul, fogMul, exposure, levels, grain, scan, vig, desat, ca })` (valores en `LOOK`, render.ts) y
  `__lab({ climate, boss, back, up, look })` para re-armar la escena o mover la cámara. Tras `__look` correr `__tick(5)` y capturar.
  Climas: noche, niebla, farol, madrugada. Un cambio de `main.ts` recarga la página: esperar ~1,5 s a que el lab se rearme.
- Scripts largos en el navegador: partir en tandas (el tool corta a los pocos segundos).

## Balance

Todos los números de balance viven en `src/balance.json` (tablas con forma de planilla: enemigos, armas, armas_extra, pasivas, ritmo, ataques, autos, pilotos, precios, plagas) y el código los lee tipados desde `src/balance.ts` (`BAL.enemigos.hormiga.vida`, `BAL.ritmo.dureza_vida`; pedir un id o una columna que no existe tira error). La planilla de Google Sheets es la "biblia": `npm run balance:xlsx` genera `balance.xlsx` (una hoja por tabla: fila 1 columnas, fila 2 qué significa cada una; más las hojas calculadas Golpes para matar, Tiempo jefe y Partidas para comprar, con fórmulas y celdas amarillas de supuestos) para subirlo a Sheets. De vuelta: descargar cada hoja de datos como TSV, juntarlas en un .txt con una línea `### nombre_hoja` antes de cada una y correr `npm run balance:import -- archivo.txt [--dry]`, que valida ids, columnas y números, informa qué cambió y no escribe nada si algo no cuadra (las hojas calculadas se ignoran; solo se editan números, no se agregan filas ni columnas). `npm run balance:check` prueba la ida y vuelta. Tras importar: `npx tsc --noEmit -p .`, `npm run build` y `__sim`. Un número nuevo de balance va como fila en la tabla (y su descripción en `DESC` de `scripts/balance-xlsx.mjs`), no como literal. Siguen en el código: tamaños de colisión, colores, escalas y tiempos de animación, el modo Carrera (kart.ts) y los textos con números (descripciones de armas, pasivas y pilotos): esos últimos se actualizan a mano si cambia el valor.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
