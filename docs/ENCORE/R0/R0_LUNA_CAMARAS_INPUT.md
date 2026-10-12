# R0 — Luna, cámaras, split screen e input

Auditoría de solo lectura. Rutas relativas a `src/` salvo indicación. Todo lo de abajo es hecho leído en el código; lo que no se midió está marcado "no verificado".

## 1. Cómo se entra a la Luna
- `ZoneId = "patio"|"garaje"|"jardin"|"luna"` (`world.ts:147`). Entrada `ZONES.luna` en `world.ts:176` (`half: 1000`, `cost: 0` = desbloqueada, `build: moonBuild`, `layout: moonReset`).
- Menú: botón de zona de Supervivencia cicla `ownedZones()` y guarda `save.zone` (`menu.ts:1565-1566`, `ownedZones` `menu.ts:509`). Guardado en `localStorage` clave `rcfight2` (`menu.ts:70`).
- URL (solo DEV): `?zone=luna` (`main.ts:247`, `zoneFor`). Otros: `?seed=N` (`main.ts:257`), `?lab`, `?mute`. Escenario headless: `scripts/scenarios.mjs:205` (`?mute&seed=3&zone=luna`).
- Arranque: `startRun()` → `setZone(zoneFor(daily))` → `setMoon(zoneId === "luna")` (`main.ts:253-256`). El diario fuerza "patio" (`main.ts:247`).
- No hay flag propio: la Luna es un booleano global mutable `MOON.on` (`moon.ts:15`) que todo el código consulta (decenas de `if (MOON.on)` en `main.ts`). `clearRun()` lo apaga (`main.ts:221`).
- Doc de diseño previo: `docs/LUNA.md` (fases 1-3).

## 2. Mapa y mundo (moon.ts, world.ts)
- Planeta esférico `MOON = { on, R: 60, g: 25 }`, `CENTER = (0,-R,0)` (`moon.ts:15-16`). Polo superior en el origen = misma salida que el patio. Sol `SUN_DIR`, Tierra `EARTH_DIR` (`moon.ts:17-18`).
- Piso ANALÍTICO: `radiusAt(d) = R + heightAt(d)` (`moon.ts:37-43`); lomas sinusoidales + `fixed` (72 cráteres, `moon.ts:308-313`) + `dents` (deformaciones de la partida, tope `DENT_CAP = 40`, `moon.ts:28`; `deform()` `moon.ts:288`, `moonReset()` `moon.ts:297`).
- Malla: 6 caras de cubo-esfera, `N = 76` (52 en `low`) → ~5.000 vértices/cara; `remesh()` reenvía buffers completos por deformación (`moon.ts:281`, marcado `ponytail`). 70 rocas con colisionador esférico estático (`moon.ts:346-356`), piedritas thin-instance 1100 (500 en low) (`moon.ts:359`), 900 estrellas (500 low), Tierra, Sol, estrella fugaz (`moon_build`, `moon.ts:304-407`).
- Ayudantes de marco local que reemplazan la cuenta plana: `upAt, toLocal, toWorld, W, flatL, hflat, hd, rel, at, onFloor, advance, arc, grav, below, rad, orient, alignYaw, ringAt` (`moon.ts:84-175`). En patio hacen la cuenta plana.
- **spawnPoint** (`world.ts:1191`): en Luna devuelve `ringAt(center, a, rMin + rng()*(rMax-rMin))`, un anillo alrededor de UN solo `center` (el auto). No hay "puntos de spawn del jugador": el auto nace en el polo superior `(0,0,0)` porque `CENTER` está puesto así (`moon.ts:16`); no existe `spawnAnchors`.
- Sin bordes: `if (id !== "luna")` omite paredes (`world.ts:216`); caída fuera = `alt(c.pos) < -5` → muerte (`main.ts:929`).
- Clima fijo `LUNA_CLIMATE` (`moon.ts:486`); `moonTick` ajusta niebla según lado Sol (`moon.ts:412-416`).
- Equivalencias con el contrato ENCORE (`04_WORLDS_AND_ROUTES.md`): NO hay `StageDefinition`, `navigationBounds`, `teleporterZones`, `landmarks`, `layoutHash` ni `StageGraph`. Hay semilla (`runSeed`, `seedRng`, `main.ts:257-258`) pero la Luna fija es casi igual cada partida salvo que `moonBuild` usa `rng()` (cráteres/rocas, con semilla de mundo) y `Math.random()` (piedritas, estrellas, textura) → no deterministas (`moon.ts:361,371`).

## 3. Física Havok
- Un solo mundo: `scene.enablePhysics(new B.Vector3(0,-25,0), new B.HavokPlugin(true, await havok))` (`main.ts:61`). `initMoon` envuelve `PhysicsEngine._step` (`moon.ts:197-239`): con `MOON.on` pone gravedad 0 (`setMoon`, `moon.ts:241-246`) y aplica gravedad radial a cada cuerpo DYNAMIC, luego corrige piso analítico (empuja hacia afuera si `gap<0`, cancela velocidad normal sin rebote), alinea el cuerpo a la vertical (`moon.ts:205-237`), y `teleport(b)` por cuerpo cada paso.
- **Un solo cuerpo es "el auto"**: `moonCar(body, up)` guarda `carBody` único y `carUp` único (`moon.ts:182-185`) → para N autos hay que convertirlo en Map/WeakMap por cuerpo.
- `FOOT` (WeakMap) = distancia origen→base por cuerpo; `ROLL` (pelota gigante) (`moon.ts:179-181`).
- Trampas de CLAUDE.md que aplican: pose de malla antes del `PhysicsAggregate`; `setMassProperties` completo (`Car.setMass`, `car.ts:153`); `disablePreStep` → de ahí el `teleport()`.
- Coste: el bucle itera `pe.getBodies()` dos veces por paso y hace `teleport` de TODOS los dinámicos cada paso (enemigos incluidos). No medido su costo.

## 4. Sistemas de la Luna (cada uno asume 1 auto)
- `moon_goals.ts` (objetivos y cohete): `goalsTick(dt,time,car:Vector3,quiet)` (`:73`) recibe UNA posición. Objetivos alternos celdas/antena cada `luna_obj_cada_s`=120 s, primero a 90 s (`balance.json:409-410`), a 70 m (`:411`). **Cohete de escape**: `rocketLand()` (`:53`) lo llama `main.ts:989` cuando sale el jefe final (gusano, 600 s: `jefe_final_s` `balance.json:171`); aterriza a 80 m, radio de zona 6 m, hay que permanecer 5 s (`balance.json:422-424`); `rocket.prog += dt` si `hd(car, rocket.p) < radio` (`:109`); al cumplir llama `GOAL_IO.win(p)` (`:110`) → `main.ts:749` `endRun(true, ESCAPE_WIN)` (`run.ts:75`). Es la ÚNICA "salida" existente y termina la partida; no hay transición a otro escenario. Recompensa de objetivo: `SHIP_IO.reward` (`:103`).
- `moon_events.ts`: lluvia de meteoritos (desde 110 s, cada 140 s) y erupción (70 s/140 s) (`balance.json:265-287`); `lunaEv(dt,time,car,carR,camYaw)` (`:204`) – un auto. Usa `panTo` con `camYaw` (marco local del auto).
- `moon_ships.ts`: naves nodriza/bombardera/abductora/caza (`ShipId` `:21`); `shipsTick(dt,time,car:Car,quiet,camYaw)` (`:139`); minijefes = naves (`main.ts:987`); `SHIP_IO.hurt/reward` ganchos singleton.
- `moon_sky.ts`: Sol y Tierra lanzan proyectiles; `skyTick(dt,time,car,cam,hurt,enemies,camYaw)` (`:67`) usa UNA cámara (`skyVisible(dir, cam)` `moon.ts:445` usa `scene.frustumPlanes` de la cámara activa).
- `moon_worm.ts`: jefe final gusano (`WORM_AI` `:61`, `wormOut` `:49`, estado enterrado = invulnerable `main.ts:645`).
- Telegráficos del piso reusan `teleTemplate()` (`models.ts:1417`) — es una plantilla de marca de AVISO de ataque, NO un teletransportador.

## 5. Cámaras
- `CAM_MODES = ["actual","cenital","iso","baja","dinamica"]` y `CAM_NAMES` (`savefmt.ts:14-16`); persistido `save.camMode` (validado `savefmt.ts:97`); se cicla en partida (`main.ts:128`) y en Configuración (`menu.ts:960`). Parámetros `CAMS: {back,up,look,yaw?}` en `main.ts:119`.
- Una sola cámara de partida: `const cam = new B.FreeCamera("cam", ...)` (`main.ts:66`); lógica en el loop `main.ts:1566-1700`. `moonCam()` (`main.ts:1412`) mantiene `camH` (rumbo tangente) y `camUp` (vertical del lugar) globales; el "arriba" de la cámara se fija con rotación propia porque `setTarget` usa +Y (`main.ts:1689`). `camYaw` es global y lo leen stick, radar, eventos, naves, bot.
- Estado global `state` incluye "race"/"duel"/"match3": en esos modos "manejan cámara en su módulo" (`main.ts:1566-1567`).
- Post-proceso: un único `DefaultRenderingPipeline("pipe", true, scene, [cam])` (`render.ts:116`) + FSR1 opcional + escala pixelada + SR (`websr`).

## 6. Pantalla dividida (kart.ts)
- Solo Carrera, solo 2 jugadores, solo compu (`raceCfg.players: 1|2` `kart_cfg.ts:8`; fuerza a 1 en táctil, CLAUDE.md).
- Mecanismo (`kart.ts:443-449`, `begin()`): segunda `FreeCamera("cam2")` (`:445`), `D.cam.viewport = new B.Viewport(0,0,0.5,1)`, `cam2.viewport = new B.Viewport(0.5,0,0.5,1)`, `D.scene.activeCameras = [D.cam, cam2]`, y `setSplit(cam2,true)` (`render.ts:351-362`) que hace `pipeline.addCamera(cam2)` para compartir el post-proceso y apaga FSR (`applyGfx`). Es split VERTICAL fijo mitad izquierda/derecha. Vuelve a 1 cámara con `viewport(0,0,1,1)` + `activeCameras = null` (`kart.ts:449,468,992`); la UI usa clase CSS `split` (`:453`).
- Es la misma escena renderizada dos veces (sin render targets). Para 3-4 jugadores el mismo mecanismo admite viewports 2×2 (Babylon lo soporta) pero NO está implementado ni probado; coste ~N× render de escena. Cualquier cosa en la Luna que dependa de `scene.frustumPlanes`, `cam.getDirection` (estrella fugaz `moon.ts:420`), `infiniteDistance` del cielo y `moonTick(dt, car, cam)` asume una cámara.
- No existe `SHARED_CAMERA`, `DETACHED_WINDOW`, `REMOTE_SCREEN` ni render targets por jugador (grep de `createRenderTarget|multiView|layerMask` en `kart.ts` sin resultados).

## 7. Input (input.ts)
- Estado GLOBAL único `input = {throttle, steer, boost, drift, ability, jump, moveX, moveY, move}` (`:3`) llenado por `pollInput()` (`:184`): teclado (`KEYS`), gamepad = `activePad()` (el de `timestamp` más reciente, `:56`) y táctil (`touch` `:73`, `setupTouch` `:84`, layouts editables `:132-177`). En partida de Supervivencia = 1 jugador; varios gamepads se tratan como uno (el último usado).
- Multi-jugador solo en Carrera: `pollPlayer(c: PlayerCtl)` (`:237`) con `PlayerCtl = "kbd"|"kbd2"|"kbd+2"|{pad:n}` (`:235`); `RACE.kb1` (WASD) y `RACE.kb2` (flechas) (`:28-33`); gamepads por índice `pads()[c.pad]` (`:55`). Hasta 2 humanos hoy; el índice de pad ya permite 4. Solo devuelve throttle/steer/drift/item (no boost/ability/jump/mover en 2D, que usa Survivor).
- `ctl: "keys"|"pad"|"touch"` con auto-cambio al último dispositivo usado (`:77-81`).
- No hay enlace dispositivo→participante persistente (`deviceBinding`), ni foco/menú por jugador, ni input remoto (no hay networking: sin WebRTC/WebSocket/BroadcastChannel en `src/`; grep rápido de `teleporter|stage` en `src/` sin resultados relevantes).

## 8. Rendimiento
- Última medición en repo: `.perf/2026-10-11-1441.json` (commit f3a2ea5, Mac GPU real): `pc-partida-curso` 5,1 ms/cuadro, p95 5,9, 154 draws, 549k triángulos, 973 mallas, heap 83 MB. Es la sesión "pc-partida" (no se verificó que sea Luna; hay sesión `luna` en `scenarios.mjs:205` sin dato propio en este JSON). **No hay medición de Luna ni de 2+ viewports.** Es del Mac, no de un celular.
- Reglas del repo: instancias/thin-instances para entidades, partículas en pool, tope de enemigos (`maxAlive`, `luna_tope_mult`=0.75, `luna_aparicion_mult`=0.6, `luna_xp_mult`=0.65; `balance.json:299-301`), render a baja resolución.
- Riesgos específicos Luna (por lectura, no medidos): (a) `remesh` sube ~3 buffers × 5.000 vértices por cara tocada por cada cráter (llamado desde meteoritos/aliens explosivos/gusano/erupción); (b) `teleport` de todos los cuerpos dinámicos por paso; (c) N cámaras ⇒ N× dibujo de ~550k tris + post-proceso por cámara (el pipeline compartido añade pasadas por cámara).

## 9. Qué falta para lo pedido

### 9.1 Teletransportador a un siguiente escenario
Existe: patrón de zona+baliza+aro+progreso (`moon_goals.ts` `make()` `:39-49`, `ringTpl`, `beaconTpl`) y callback de salida `GOAL_IO.win`. Es reutilizable como visual y lógica "permanecer N s".
Falta:
1. Concepto de escenario/etapa: `ZoneId` cerrado y `setZone(id)` (`world.ts:231`) reconstruye el mundo entero (`buildWorld`) — sirve como base de transición pero es costoso (carga) y `MOON.on` se deriva en `startRun`, no en `setZone`; cambiar de zona a media partida requiere extraer la parte "zona" de `startRun` (hoy mezcla `clearRun`, semilla, perfil, auto, armas, `time=0`).
2. `StageDefinition`/`StageGraph` y estado de run que sobreviva a la transición (armas, nivel, XP, `time`, `bossIdx`; hoy `startRun` los reinicia y `endRun` cierra).
3. Zona de teletransporte con `teleporterZones` y spawn de llegada en el siguiente escenario (hoy solo anillo alrededor del auto; el polo `(0,0,0)` es fijo).
4. Que el cohete deje de terminar la partida (hoy `GOAL_IO.win` → `endRun`, `main.ts:749`) o conviva con un modo "avanzar".
5. Limpiar lo específico de Luna al salir: `shipsClear/goalsClear/skyClear/evReset/moonReset` (`main.ts:221-225`) ya existen y son un buen conjunto de limpieza; `setMoon(false)` restaura gravedad.
6. Un segundo escenario no-lunar para probar: patio/jardin/garaje ya existen como zonas, con `half` y paredes.

### 9.2 Decisión "quedarse o avanzar" con temporizador
Existe: modo sin fin tras vencer al jefe final (`goEndless`, `main.ts:1357`, `endless=true`, `bank`), pantalla de resultados `over`, estado `"outro"` (cámara orbita, `main.ts:1414`), banners/radio (`ui.ts` `banner`, `hudBoss`), cuenta atrás de carrera en kart.
Falta: estado `"decide"` en la máquina de estados de `main.ts` (hoy `play/level/outro/pause/over/race/duel/match3`); UI de votación con temporizador y política de voto (hoy no hay UI de decisión; "Seguir jugando" es un botón en resultados sin temporizador); la rama "quedarse" ya existe como sin fin; la rama "avanzar" depende de 9.1. Con cooperativo, hace falta un votante por participante (9.3).

### 9.3 Cooperativo local 2-4
Bloqueos (todos por diseño de 1 jugador, no insalvables):
1. Estado de jugador único: `let car: Car | null` (`main.ts:87`), `hp, maxHp, xp, level, weapons, passives, boost, hitAt…` globales; `ctx.car` único en armas (`main.ts:1196`). Hay que extraer un `PlayerState`/`Participant` con auto, armas, HP, XP y piloto propios (el trabajo grande).
2. Enemigos/IA, spawner (`spawnPoint(center…)`), gemas/imán, objetivos y cohete, eventos, naves y cielo apuntan a UN auto (§4). Necesitan "jugador más cercano" o por participante; el spawner debería anclar a todos los jugadores (en Luna, anillos alrededor de cada uno; ojo: planeta de ~45.200 m² compartido).
3. Física: `carBody/carUp` único (`moon.ts:182`) → mapa por cuerpo.
4. Cámara y HUD: `moonCam`, `camYaw/camH/camUp` globales → uno por viewport; `moonTick`, `skyVisible`, estrella fugaz y niebla (por lado del Sol del auto) por cámara. HUD (`ui.ts`, radar) es un único DOM → por viewport o HUD común. `scene.fogDensity/fogColor` son globales de escena: dos jugadores a lados distintos del planeta (uno de día, otro de noche) comparten una sola niebla → conflicto real.
5. Split screen: reutilizar el patrón de `kart.ts` (viewports + `activeCameras` + `setSplit`) extendido a 2×2; coste GPU por viewport sin medir. En táctil sigue prohibido por decisión del usuario.
6. Input: Survivor usa el estado global `input`/`pollInput`; hay que enrutar por participante con `pollPlayer`-like ampliado (boost, habilidad, salto, stick 2D) y `deviceBinding`. Teclado: solo 2 mapas (kb1/kb2); 3-4 jugadores = pads.
7. Guardado/progresión: `save` es por perfil local único; XP/mejoras por jugador no modelados.
8. Simulación determinista/`sim`/`devbot`: asumen un auto (`main.ts:1747` bot).
Riesgos adicionales: muerte de un jugador (hoy `hp<=0` = fin, `main.ts:929`), revivir, y qué pasa si un jugador toma el teletransportador (regla de grupo).

## 10. Recomendación de orden (para R1+)
1. Medir antes de diseñar: `npm run perf` con sesión `luna` y un prototipo 2 viewports sobre la Luna (comparar con `.perf` actual) — es el bloqueo técnico más barato de descartar.
2. Extraer `PlayerState` y pasar `car:Vector3` → lista de objetivos en spawner/IA/eventos, con N=1 idéntico (verificar con `npm test`, `sim` misma semilla).
3. Prototipo de "salida" no terminal: reutilizar zona del cohete como teletransportador que dispara un estado `"decide"` temporizado; la rama "avanzar" puede cargar otra zona existente (`patio`) como escenario ficticio.
4. Luego split 2 en Luna, luego 3-4 (2×2).

## 11. No verificado
- Rendimiento real de Luna y de múltiples viewports; comportamiento con 3-4 `activeCameras` y el `DefaultRenderingPipeline` compartido.
- Número exacto de jefes existentes por tamaño/arena (fuera de ámbito; ver otras auditorías R0).
- Capturas desktop/móvil (no se levantó servidor; auditoría solo lectura).
- `graphify query` no se usó; todo por lectura directa.
