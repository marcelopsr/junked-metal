# R6 — ADR: multijugador online 1-4 con anfitrión autoritativo

Fecha 2026-10-12. Estado: PROPUESTA (corresponde a ADR-002/ADR-003 de `04_PRODUCTION/06_RISKS_AND_ADRS.md`). Solo documentación: no hay código de red. Base: `03_ENGINEERING/02_NETWORKING_AND_MIGRATION.md`, `01_ARCHITECTURE.md`, `R0_MENU_SAVE_RED_TESTS.md` §5 (hoy no existe red: 0 resultados de `WebSocket|RTCPeer|BroadcastChannel` en `src/`), `R1_SLICE.md` § R7a (cooperativo local de 2 en pantalla dividida con `coop`/`mate` en `main.ts`) y roadmap R6 y R9.

## 1. Contexto y restricciones

- Sitio estático en GitHub Pages (`marcelopsr.github.io/junked-metal`), sin backend propio. Cualquier servidor es costo y operación nuevos.
- Juego en tiempo real con Havok (WASM) en cada navegador. El propio `CLAUDE.md` avisa que entre partidas seguidas Havok diverge un poco: no hay determinismo garantizado entre máquinas (ni siquiera entre corridas en la misma).
- Tope duro: 4 participantes. Móvil: hoy el juego fuerza 1 jugador local en táctil; un móvil sí podría ser cliente remoto (a probar, no presumir).
- Decisiones [CONFIRMADO] de ENCORE (host autoritativo, un `participantId` por voto) no se cambian.

## 2. Transporte y señalización

Todas las opciones usan WebRTC DataChannel (el host habla con cada peer, topología estrella, 3 conexiones como máximo). Cambia quién señaliza y quién retransmite.

### Opción A (Recomendada): WebRTC DataChannel + PeerJS Cloud para señalización + STUN/TURN de Cloudflare

- Señalización: servidor gratuito de PeerJS ("free cloud server", peerjs.com). Código de sala = peer id del host. Dependencia: paquete `peerjs` (~un archivo, import dinámico como `kart`/`duel`, sin costo en el arranque). La página no publica límites de uso del servicio gratis ni sus ICE por defecto (verificado en peerjs.com): hay que fijar `config.iceServers` propios y medir.
- STUN: `stun.cloudflare.com`, gratis y sin límite. TURN: Cloudflare Realtime TURN, USD 0,05/GB salientes con 1.000 GB gratis (developers.cloudflare.com/realtime/turn/faq). Las credenciales TURN requieren generar tokens con una API key: eso no puede ir en el cliente de un sitio estático. Mitigación: un Worker mínimo (gratis) que emite credenciales temporales; hasta R6c se puede lanzar solo con STUN (P2P directo funciona en la mayoría de redes domésticas; las redes simétricas/móviles fallarán y se mide su proporción).
- Costo: 0 USD hasta que el TURN pase el gratis; con ~64 kB/s por peer (ver §3) una sesión de 1 h de 3 peers vía relay son ~0,7 GB.
- Latencia: P2P directo = RTT de internet (típico 20-80 ms); vía TURN suma un salto.
- Riesgo: el servicio PeerJS gratis es de terceros, sin SLA. Salida: `peerjs-server` autoalojable (Node mínimo) sin tocar el cliente, o la opción B.

### Opción B: WebRTC propio + señalización mínima en un Cloudflare Worker (Durable Object por sala)

- Mismo transporte, pero la señalización (offer/answer/ICE por WebSocket) la hacemos nosotros, con sala, token temporal y sirve de **árbitro de epoch** (el problema abierto de split-brain de `02_NETWORKING…`). Mismo TURN que A.
- Costo: Workers/Durable Objects con plan gratis para este volumen; verificar límites vigentes antes de adoptarlo. Dependencia: cuenta Cloudflare y código de servidor propio (~150 líneas) que hay que desplegar y mantener, lo que rompe el "todo estático".
- Latencia: igual que A. Ventaja: control de seguridad (tokens, rate limit) y base natural para R9.

### Opción C: relay administrado (WebSocket pub/sub de tercero tipo Ably, PartyKit o Colyseus Cloud)

- Los datos pasan por el servidor: sin NAT ni TURN, el cliente es trivial. Latencia = cliente→relay→cliente (suele +30-100 ms vs P2P) y costo por mensaje/conexión, con la tasa de 30 Hz × 4 jugadores. Dependencia y vendor lock-in más duros. Se descarta como primaria; sirve de plan de contingencia si el TURN resulta insuficiente. [No se consultaron precios vigentes: POR AUDITAR.]

### Decisión

A para R6a-R6c (cero infraestructura propia, ruta de salida clara). Pasar a B en R6d/R9, cuando haga falta árbitro de epoch y tokens. C no se implementa. Toda dependencia entra por una interfaz `Transport { send(peer, ch, bytes); onMessage; onClose }` de un solo uso real hoy (PeerJS); no se abstrae más.

## 3. Qué se replica

Havok no es determinista entre máquinas, así que **lockstep y rollback quedan descartados** (coincide con `01_ARCHITECTURE.md`). Modelo:

- **Física y combate solo en el host.** Los clientes no corren Havok para enemigos ni proyectiles; Havok del cliente queda para su propio auto (predicción de movimiento, opcional en R6c).
- **Cliente → host: inputs** (no estado). Canal no fiable y desordenado, 30 Hz: `{seq, throttle, steer, drift, boost, jump, ability}` (~12 bytes) más el `ack` del último snapshot. Es la misma forma que ya produce `pollPlayer`/`mateInput`.
- **Host → clientes: snapshots** cuantizados a 15-20 Hz en canal no fiable: pose de los autos (pos int16, rotación cuaternion comprimida, velocidad), hp/boost, enemigos y proyectiles por id con pos/estado/anim/vida (solo los que caen en el radio de interés de ese jugador, tope `maxAlive`), jefe, gemas/pickups. Delta contra el último `ack`; keyframe completo cada 1 s o ante pérdida. Presupuesto estimado ~10-20 kB/s por cliente (medir en R6b; no es una cifra verificada).
- **Host → clientes: eventos fiables** (canal ordenado y fiable, con `revision` y `epoch` de `DomainEvent`): daño y números de daño, muertes y cadáveres, nivel/oferta de cartas, pactos, votos, cambios de fase del teleportador, `encEnter`, inicio/fin de jefe, fin de partida, cofres, pagos. Las mutaciones económicas y decisiones irreversibles van solo por aquí.
- **Cosmética local, no replicada**: partículas, marcas en el piso, sfx, cámara, cielo/clima (se derivan de `runSeed` y el reloj de la run), animación de patas (se interpola del snapshot).
- **Interpolación** de 100 ms en clientes para entidades remotas; el auto propio usa predicción simple y corrección suave contra el snapshot (umbral ~1 m, teleport si pasa de un límite).
- **Semilla**: `runSeed` viaja en el `join`; todo lo derivado del `rng()` de `run.ts`/`encore.ts` (clima, patio, orden de minijefes, `finalOf(seed)`) se reconstruye igual en el cliente sin replicarse. El `rng()` de combate solo corre en el host.
- Snapshots de **checkpoint** (estado de run: `erun`, XP, scrap, pactos, inventarios, RNG) al completar escenario: base de R9 (migración) y de guardado. No se usa el snapshot de red para eso.

## 4. Mapa del código a refactorizar (`src/main.ts`, 2180 líneas)

Problema de raíz: el estado de un jugador es **global de módulo** (`car`, `weapons`, `passives`, `hp`, `maxHp`, `boost`, `st`, `main.ts:88-93`) y el segundo jugador es un caso especial (`mate`, `coop`, `leadPn`, `:261`, `Mate` con una sola instancia). R7a lo resolvió para 2 con el patrón "el que guía es `car`; el otro es `mate`", que no escala a 4 ni a remotos.

Capa propuesta: `PlayerState[]` (participantId, auto, hp/maxHp/boost, armas, input, cámara opcional, `isLocal`, `slot`) y `DomainEvent` emitidos por un `Sim`; render/HUD leen proyecciones. Se mantiene el patrón de módulo dinámico (`src/encore/`, como propone `R0_MENU_SAVE_RED_TESTS.md`) y `main.ts` conserva el pegamento.

| Función / zona en `main.ts` | Hoy | Cambio |
|---|---|---|
| `car`, `weapons`, `passives`, `hp`, `maxHp`, `boost`, `st` (`:88-93`) | Globales del que guía | Pasan a `players[i]`; `car`/`hp` quedan como alias del jugador local mientras dure la migración |
| `coop`, `mate`, `Mate`, `leadPn` (`:261`, `:429-444`) | Un solo segundo jugador | `players[]` hasta 4; se retiran `mateLead`/`mateDown`/`mateRevive` por "caído/rescatado" por jugador (`mateStart` `:310`, `mateRevive` `:367`) |
| `mateInput` (`:518`), `pollInput`/`pollPlayer` (`input.ts`), llamada en `onBeforeRender` (`:1817`) | Lee teclado/joystick locales | Capa `InputSource`: local (teclado/pad) o remota (cola de inputs por `seq`); el host consume `players[i].input` sin saber de dónde viene |
| `update(dt)` (`:1010`) | Un auto "principal"; `mc = mate?.car` (`:1090`) | Itera `players` para movimiento, contacto, recolección (`:1513`), armas (`:1471` con `Ctx` por jugador); se divide en `simStep` (host) y `presentStep` (todos) |
| `Enemy.update(sdt, car.pos)` (`:634`) y reciclado, `spawnEnemy` (`:986`), `kill` (`:941`) | Persiguen al auto vivo más cercano (R7a); `kill` aplica XP, botín y SFX juntos | `kill` se parte en regla (host, emite `enemy_killed`) y efectos (todos, por evento); IDs de entidad estables para el snapshot |
| `mateHurt` (`:486`) y daño recibido (`hp -=`) | Dos ramas | `damage(playerId, n, src)` único, evento `player_damaged` |
| `recompute()` (`:195`), `levelOffers`/`pickOffer`, XP (`:~1500`) | XP, nivel, armas y pasivas compartidas ("ponytail" de R7a) | Decidir con producto: XP grupal compartida (roadmap R6) e items individuales; ofertas por jugador, voto/espera ("level" detiene el juego: hoy `state = "level"`, hay que pasar a cartas por jugador sin pausa global) |
| `startRun` (`:268`), `endRun` (`:568`), `encApply`/`encPick`/`encEnter` (`:314-410`) | Fase de run y votos de un decisor | Votos por `participantId` (`encore.ts: pick`, `ask`, `pactOffer`); el host cierra el voto y emite evento; `endRun` calcula recompensas por jugador |
| `GOAL_IO`, `lunaEv`, `skyTick`, `shipsTick`, `goalsTick`, `moonTick` | Reciben un solo auto (límite señalado en R1_SLICE) | Reciben `players[]`; cielo y eventos se derivan del reloj + seed en cada cliente |
| `toScreen` (`:889`), `hudMate`, `updateHud` (`:1648`) | HUD del que guía + vida compacta del otro | HUD por viewport local + lista de compañeros (vida/estado) desde proyección |
| `Math.random` / `rng()` (25 usos en `main.ts`) | RNG global único, sin streams | Dos streams: `simRng` (host, solo combate/botín) y `visRng` (cosmético); `run.ts` ya es por semilla |
| `src/encore.ts` (`tick`, `pick`, `pactFx`, `bossDown`...) | Ya es lógica pura sobre `Run` | Se reutiliza tal cual en el host; sirve de semilla de la capa Domain (`Command`/`DomainEvent` de `01_ARCHITECTURE.md`) |
| `sim.mjs`/`devbot.ts` | Asumen un jugador | Se amplían a N bots para el chaos test; ya existe `--par` |

Lo que **no** se toca: `weapons.ts` (se reutiliza vía `Ctx` por jugador, como hace R7a con `mateArm`), `car.ts` (el `drive()` sirve para predicción local), `models.ts`, `world.ts`.

## 5. Plan por fases (cada una con criterio de terminado)

- **R6a — Dominio por jugador, sin red.** `PlayerState[]` y `damage/kill` por eventos; sustituir `mate`/`leadPn`; 1-4 jugadores locales con la misma ruta (pantalla dividida hasta 2 como hoy; 3-4 con bots o sin viewport). Terminado: `tsc` + `npm test` verdes; `npm run sim --seeds 1 --secs 600` con 1 jugador idéntico a la línea base de R1 (166,9 s, nv 4, 24 bajas); las capturas de coop 2 sin diferencias (`shots --diff`); 4 bots simulados 10 min sin errores. Riesgo: regresión en Survivor y ENCORE solo.
- **R6b — Transporte y replicación mínima.** `Transport` con PeerJS y STUN de Cloudflare, sala por código, `join` con `runSeed`, inputs de cliente a host, snapshots de autos y enemigos, interpolación. Sin pactos ni votos remotos aún. Terminado: 2 navegadores en dos máquinas, un escenario de ENCORE jugable, ancho de banda medido y registrado (kB/s por cliente), RTT y pérdida con red degradada (Chrome DevTools throttling), 0 errores de consola; documentar cuántas redes necesitan TURN en las pruebas.
- **R6c — Eventos fiables, votos y TURN.** Canal fiable con `revision/epoch`, cartas y pactos por jugador, votos por `participantId`, caídas/rescates, kit de bienvenida al cambiar de mapa, Worker de credenciales TURN, predicción del auto propio. Terminado: 4 clientes (al menos uno en móvil) terminan una run completa (4 escenarios + FINAL ACT) sin duplicar loot ni scrap (comprobado con hash de estado económico en cada checkpoint) — es el gate de R6 del roadmap.
- **R6d — Rejoin y endurecimiento.** `rejoinToken`, reserva de plaza, incorporación tardía solo en `STAGE_RESOLVE/ROUTE_VOTE`, validación de comandos, límite de tasa, bot de caos (pérdida de paquetes, reordenamiento, desconexión de cliente). Opcional: pasar a opción B si PeerJS Cloud falla. Terminado: tabla de pruebas de caos de `02_NETWORKING…` en verde excepto migración de host.
- **R9 (fuera de R6):** migración de host con snapshot de checkpoint, epoch y árbitro (opción B). R6 solo deja `epoch` y `revision` en todos los mensajes para no rehacer el protocolo.

## 6. Riesgos y qué no está verificado

- Ancho de banda, latencia y cuota de PeerJS Cloud: sin medir. La proporción de NAT que necesita TURN: sin medir.
- Rendimiento del host con 4 jugadores (más enemigos, 3 canales): medir con `perf` y recortar `maxAlive` por jugadores.
- El host paga la simulación: un móvil como host puede no aguantar; permitir elegir host y mostrar aviso.
- Trampa: físico del lado cliente (autos remotos) debe ser kinematic, no Havok dinámico, o aparecen colisiones fantasma.
- El mapa de §4 se hizo leyendo `main.ts` (no ejecutándolo); los números de línea se mueven con cada commit.
- Anticheat: el host es confiable para los clientes; un host tramposo no se resuelve en R6 (ADR-007).

## 7. Fuentes

- Cloudflare Realtime TURN FAQ (precio y STUN gratis): https://developers.cloudflare.com/realtime/turn/faq/ (consultado 2026-10-12)
- PeerJS (servidor cloud gratis o PeerServer propio): https://peerjs.com/ (consultado 2026-10-12; sin límites publicados en esa página)
