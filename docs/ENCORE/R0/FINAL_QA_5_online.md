# QA final 5: online de 2 (R6b) de punta a punta en headless

Fecha 2026-10-12. Base: 06801ba.

## Causa del DataChannel que no abría

No era mDNS. Con `--disable-features=WebRtcHideLocalIpsWithMdns` los candidatos salen con IP real, pero ICE igual queda en `checking`, incluso entre dos `RTCPeerConnection` de la misma página con `iceServers: []`.
Sin permiso de cámara/micrófono, Chrome solo junta candidatos de la interfaz de la ruta por defecto. En esta Mac es `utun0` de Cloudflare WARP (172.16.0.2 y 2606:4700:…), que no devuelve paquetes a sí misma.
Con permiso de micrófono (falso) Chrome enumera todas las interfaces (en0 192.168.100.118, loopback) y el canal abre al instante.

Arreglo solo de prueba (`scripts/net-test.mjs`): banderas `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream --disable-features=WebRtcHideLocalIpsWithMdns --allow-loopback-in-peer-connection`, permiso `microphone` y un `getUserMedia` antes de crear la sala. La producción no cambia: dos jugadores en máquinas distintas salen por STUN/host normales.
Nota: dos navegadores reales en esta misma Mac con WARP prendido tendrían el mismo problema; entre máquinas distintas, no.

## Bug encontrado y arreglado (src/net.ts)

Al cerrar una pestaña de golpe, el otro lado no se enteraba: el DataChannel no emite `close` y ICE tarda unos 30 s en pasar a `failed`. El anfitrión seguía con J2 fantasma y el cliente quedaba en la partida congelada.
- `pagehide` → `net.close()` (`peer.destroy` cierra los canales y el otro lo ve ya).
- ICE en `disconnected` durante 3 s seguidos → corte con "Se cortó la conexión con el otro jugador." (cubre crash o red caída, sin `pagehide`).

## Prueba: `npm run test:net`

Dos contextos del mismo Chromium headless contra `rc-test` (o el `rc-test-<carpeta>` del worktree), PeerJS Cloud real (necesita internet). Hook nuevo solo dev: `__net.info()` en main.ts. `launch()` de `lib/browser.mjs` acepta `args` extra.

```
OK   sala creada y cliente unido  MJSKNW
OK   input del cliente llega al anfitrión (netIn)  {"throttle":1,...}
OK   players[1] se mueve en el anfitrión con el input del cliente  33.0 m
OK   el cliente ve su auto moverse por snapshots  31.9 m
OK   el cliente sigue el reloj del anfitrión  0.16 -> 2.81
OK   el cliente ve bichos y se mueven  1 bichos
OK   el cliente recibe la fase del teleportador  teleporter
OK   decisión del cliente aplicada en el anfitrión (applyCommand)  teleporter -> stay
OK   al cerrar el cliente el anfitrión sigue en solitario  state=play jugadores=1
OK   sin errores en el anfitrión
OK   al cerrar el anfitrión el cliente vuelve al menú con aviso  state=menu "Se cortó la conexión con el otro jugador."
OK   sin errores en el cliente
12 OK, 0 fallas
```

El input del cliente se manda con teclas reales (`W`, `Z`) en su pestaña. El teleportador lo hace aterrizar el anfitrión con `__enc.land()/board()` y decide el cliente.

## R6c (2026-10-12): cartas, votos, proyectiles y kB/s

`npm run test:net` ampliado, 23/23 en Chromium headless:

```
OK   ancho de banda del snapshot medido (JSON, anfitrión -> cliente)  6.1 kB/s
OK   el cliente ve proyectiles (snapshot j/w)  1 proyectiles
OK   primera oferta: elige el anfitrión y el cliente ve las cartas  by=1 cliente="Elige J1"
OK   el cliente no puede elegir fuera de su turno
OK   segunda oferta: le toca al cliente y la ve  "Turno de elegir: J2"
OK   el anfitrión no puede elegir en el turno del cliente
OK   carta del cliente aplicada en el anfitrión  nivel 1 -> 3
OK   todas las cartas cerradas en los dos
OK   voto del cliente registrado y solo no decide  votos=1 fase=teleporter
OK   los dos votan lo mismo: se aplica (applyCommand)  teleporter -> stay
OK   empate (cliente X, anfitrión Z): gana el anfitrión  stay
OK   los dos votan avanzar: sale de la estadía  pact
23 OK, 0 fallas
```

kB/s = bytes JSON de los snapshots enviados por el anfitrión (`__net.info().bytes`, solo dev) durante 2,5 s de manejo al inicio (pocos bichos). Con la semilla 7 el teleportador sale con OVERLOAD: la prueba agota la carga con `__enc.tick`.

## Sin verificar

- RTT y kB/s con muchos bichos (solo medido al inicio). El servidor propio (`VITE_NET_HOST`, login, `/api/turn`): sin servidor todavía. Conexión entre dos máquinas o redes distintas (NAT simétrica, sin TURN).
- Con 1 bicho en el radio de 70 m al principio, la prueba de bichos es mínima (se mueven, pero son pocos).
