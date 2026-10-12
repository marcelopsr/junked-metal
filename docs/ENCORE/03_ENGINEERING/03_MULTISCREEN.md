# ENCORE MultiScreen — cámaras, TV, ventanas y teléfonos

## Capacidad aprobada

Hasta 4 participantes en una run, pero **número de pantallas diferente de número de jugadores**. En una partida local/mixta: split-screen 2–4, cámara compartida opcional, cámara en ventana separada, televisión vía salida de sistema/casting compatible y teléfono mediante vinculación segura.

## Tres funciones móviles

| Rol | Video | Input | Crea participantId |
|---|---|---|---|
| `VIEWER` | Recibe cámara designada | No | No |
| `CONTROLLER` | Opcional vista mínima/status | Envía input táctil a jugador asignado | No, se vincula a existente |
| `FULL_PLAYER` | Recibe cámara + UI | Envía input táctil | Sí **solo si** fue admitido como jugador dentro de 4; de lo contrario asocia a existente |

Distinguir `FULL_PLAYER` vía **stream** (render en host) de ejecución nativa del motor en móvil (solo si auditoría confirma viabilidad). El usuario pidió ambas funciones, no asumió que el teléfono tenga GPU capaz de render completo.

## Modos de visualización

- `SPLIT_2`: horizontal o vertical según aspect ratio.
- `SPLIT_3_4`: grilla 2×2, incluyendo cuarto panel configurable si son tres.
- `SHARED_CAMERA`: seguir centro/grupo y avisar límites; requiere test de jugabilidad.
- `DETACHED_WINDOW`: vista exclusiva en nueva ventana/popup de mismo origen; depende de permisos de browser y arquitectura del renderer.
- `REMOTE_SCREEN`: video de cámara por WebRTC hacia TV con browser o teléfono.
- `OS_CAST`: duplicación/casting del sistema operativo como fallback.

## Restricciones técnicas reales

1. Una ventana JavaScript nueva no puede renderizar automáticamente el mismo canvas GPU de otra: requiere render secundario, compartir datos, canvas espejo o capturar video.
2. `BroadcastChannel` sirve para coordinación de pestañas en contexto de origen compatible, **no** transporte a otro teléfono o red.
3. `canvas.captureStream()` puede proveer video desde canvas compatible; renderizar cámaras separadas puede necesitar render targets y canvas/video independientes.
4. WebRTC exige signaling, STUN/TURN frecuente en internet, manejo de codecs y red; latencia no está garantizada.
5. Chromecast/AirPlay/API de Presentation tienen cobertura desigual; ofrecer fallback HDMI/casting nativo/enlace navegador.
6. Capturar cuatro cámaras 3D exige presupuesto GPU; un host pequeño puede no soportar cuatro streams a 60 fps. Adaptación de resolución/FPS por receptor es obligatoria.
7. Touch remoto añade latencia extra; mantener HUD y controles dimensionados para móvil y opción mando separado.

## Emparejamiento QR/código

`CREATE_PAIR_REQUEST → SHOW_QR_AND_SHORT_CODE → DEVICE_CONNECT → HOST_APPROVES → ASSIGN_ROLE → ACTIVE → REVOKED/EXPIRED`.

- Token temporal, un solo uso, TTL corto; QR no incluye credenciales permanentes.
- Anfitrión ve nombre genérico del dispositivo y permisos solicitados, puede aprobar/revocar.
- Recordar preferencias locales **no** equivale a reutilizar autorización indefinida.
- Cada rol restringe mensajes; VIEWER jamás envía input gameplay y CONTROLLER jamás ve cámara no autorizada.
- Cambio de rol durante run requiere comprobación para evitar doble input y apropiación de cámara.

## Input router

`physicalInput → deviceBinding → participantId → validatedInputActions`. Multiplex gamepads y touch por participante; menú contextual por viewport; bloqueo de foco para evitar que dos jugadores respondan al mismo teclado. Si móvil pierde conexión, el input se neutraliza con seguridad (no mantener disparo continuo).

## Audio

Definir salidas: voz Director, SFX, música, mensajes personales, audio del juego y futuro chat de voz. En TV y móviles próximos, silenciar duplicados opcionalmente. Pactos privados nunca deben aparecer en una pantalla de espectador público por error. Subtítulos privados en dispositivo correcto.

## Interfaz «Pantallas y dispositivos» [PROPUESTA]

Lista de participantes (máx. 4), lista de pantallas, asignación drag/drop con alternativa accesible, botón «Añadir dispositivo», QR/código, aprobar, cambiar rol, expulsar, calidad, test de latencia y audio. Mostrar cuando una capacidad no está soportada por navegador, sin botón engañoso.

## Perf budget [POR BALANCEAR]

Perfiles `ECO 480p/20-30fps`, `BALANCED 720p/30fps`, `HIGH 1080p/30-60fps` como objetivos tentativos por stream, nunca garantías. Priorizar responsive input y simulación sobre codificación de video. Registrar render ms, encode ms, RTT, packet loss, bitrate y thermal warning si API disponible.

## Criterios de aceptación

- Receptor vinculado VIEWER no puede mover al personaje.
- Una pantalla nueva no consume plaza.
- Un jugador local puede jugar mirando TV con teléfono como mando.
- Dos móviles ven cámaras separadas sin recibir pactos privados ajenos.
- Revocar el dispositivo corta señal/input sin detener la run.
- Si falla streaming, gameplay continúa y se muestra fallback.
