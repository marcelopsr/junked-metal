# Red: 1–4 online/local/mixto, host migration y join-in-progress

## Distinciones esenciales

**Participante** ≠ **conexión** ≠ **dispositivo** ≠ **viewport**. Ejemplo: computadora A hospeda la run con dos participantes locales; computador B conecta un participante y smartphone C muestra cámara de A, sin participante nuevo. Una máquina puede alojar varias cámaras físicas o streamings sin aumentar plazas.

## Autoridad

Propuesta de primera arquitectura: **host autoritativo** con canales de datos para inputs/eventos; peers aplican snapshots/deltas. Los comandos irreversibles (botín, votos, pactos, boss, timers, save) se resuelven en host. Sistemas de señalización/STUN/TURN/reconexión requieren infraestructura o servicio existente [POR AUDITAR]. El modo local sin red debe usar la misma simulación, pero múltiples inputs.

## Conectividad [PROPUESTA]

- Signaling server de salas con tokens temporales, no datos de juego autoritativos.
- Data channels WebRTC o transporte existente; enviar inputs de alta frecuencia con canal apropiado y comandos confirmados por canal confiable.
- Relay TURN para redes donde P2P falla, con coste de ancho de banda que debe medirse.
- Emparejamiento/mando remoto diferente de unir participante online (ver MultiScreen).
- Compatibilidad con navegadores de escritorio y móvil: prueba, no presunción.

## Migración de anfitrión

**Desafío:** los participantes deben tener un estado reciente lo bastante completo para continuar la simulación. **No basta con elegir otro host**; hay que transferir autoridad, RNG, entidades, economía y Director.

Estados recomendados:

`RUNNING → HOST_LOST → FROZEN → ELECTION → RESTORE_SNAPSHOT → RECONCILE → RESUME`.

1. Host envía snapshots versionados y diffs/eventos a réplicas autorizadas con checkpoint hashes.
2. Detección de pérdida por timeout/canal cerrado; detener decisiones irreversibles.
3. Determinar *epoch* nuevo; elegir peer elegible con snapshot de mayor revisión verificada, latencia/capacidad adecuadas.
4. Nueva autoridad carga snapshot, reejecuta eventos confirmados que falten, reasigna conexión e incrementa epoch.
5. Los clientes descartan comandos del epoch anterior (evitar split brain).
6. Reconciliar inputs recientes, reanudar el reloj activo desde valor guardado y notificar.
7. Si no hay peer válido: suspender/run recovery desde checkpoint estable, **no** simular continuidad instantánea ficticia.

**[POR DISEÑAR]** Arbitraje de epoch con signaling/coordinador de sala. Sin un coordinador confiable, dos hosts pueden proclamarse líderes. El roadmap incluye prueba de *split-brain* antes de declarar la función terminada.

## Reconnect

Participante existente reingresa cualquier momento seguro con `rejoinToken` rotatorio, `participantId`, `runId`, `lastKnownRevision`, no crea player nuevo. Mientras está offline, su inventario queda reservado. Rejoin obtiene snapshot autoritativo y se restaura control al completarse sync; si combate sigue activo, aparecer en estado/sitio seguro y no atravesar la escena invulnerable sin límite.

## Incorporación tardía

Jugador **nuevo** solamente durante `STAGE_RESOLVE`, `ROUTE_VOTE` o `STAGE_LOAD` prevalidado, nunca en combate o boss. Validar slot libre (<4). Kit de bienvenida generado una sola vez con `joiningRewardTxnId`, seed y tabla ligada a loop y niveles del equipo; sin duplicación por reintento. Mostrar intro breve del Director omitible.

## Salida definitiva

Al declararse `LEFT_PERMANENT`, cerrar token anterior, ofrecer transferencia voluntaria a otros si procede, liberar plaza solo cuando la transferencia se confirma o cancela; nunca abandonar recursos flotando en un estado explotable. Reducir capacidad de encuentros gradualmente con histeresis.

## Votos

- Rutas: votar solo entre destinos de grafo elegible.
- Teleportador: «ready» individual; evento inicia cuando todos activos preparados, sujeto a política visible de AFK.
- FINAL ACT: mayoría entre ENCORE!/FINAL ACT; empates se repiten; después cierre de voto y confirmación de transición.
- Pactos: política según gravedad, más estricta que tentaciones menores.

Evitar que jugadores controlados desde el mismo dispositivo voten bajo una sola identidad de conexión; **cada participantId tiene voto propio**.

## Save/recover sin servidor dedicado

La partida puede ejecutarse en host de un jugador, pero la reanudación «otro día» requiere que al menos un responsable tenga snapshot persistente y clave/token. **Si ningún dispositivo conserva el estado, no habrá recuperación**. Opciones: guardar snapshots cifrados y firmados localmente, sincronizar en todos los peers autorizados o almacenar en backend. Evaluar seguridad y UX frente a costes. La confirmación de visión no significa que el backend exista.

## Pruebas de caos mínimas

Desconectar anfitrión en exploración, pacto aceptado, teleportador ready, boss final y durante compra; pérdida de paquetes; peers con snapshots inconsistentes; dos hosts candidatas; rejoin desde móvil; 2 jugadores locales + 2 remotos; 4 pantallas con inputs independientes. **No duplicar loot ni perder estado de run** salvo si se usa rollback explícito a un checkpoint consistente después de fallo irrecuperable, y nunca para evitar derrota.
