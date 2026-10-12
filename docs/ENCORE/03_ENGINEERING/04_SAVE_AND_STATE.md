# Persistencia: snapshots, reanudación y consistencia

## Objetivo

Suspender expediciones largas y reanudarlas días después; reconectar al perder internet; migrar anfitrión; impedir duplicaciones o volver a un estado previo para escapar de una derrota. Los snapshots son persistencia **de juego**, no puntos libres para «save scumming».

## Tres niveles de datos

1. **Perfil persistente**: desbloqueos, hallazgos, logros, historial narrativo del Director, ajustes; por `profileId`.
2. **Run state**: seed, escena actual, loop, stage, boss secreto, inventarios, chatarra, XP, pactos, votos, RNG streams, timers activos, flags de secretos, event log.
3. **Estado efímero de render**: partículas, animación cosmética, cámaras, UI, conexiones WebRTC; se reconstruye, no necesita snapshots de gameplay.

## Snapshot versionado

Campos críticos: `schemaVersion`, `contentVersion`, `runId`, `revision`, `authorityEpoch`, `checksum`, `savedAt`, `activeDuration`, `state`, `rngStreams`, `participants`, `world`, `director`, `economy`, `eventsApplied`.

Las colecciones con objetos inventarios deben usar IDs únicos por instancia (`instanceId`) y transacciones; no solo contador de unidades, para evitar dupe accidental.

## Puntos de guardado

- **Autoguardado confirmado:** al completar escenario y antes de permitir viaje.
- **Guardado operativo [PROPUESTA]:** durante transición de sesión, migración, recompensas y estado replicado, sujeto a atomicidad; recuperación de combate por evento/snapshot sin ofrecer rollback explotable.
- **Suspensión:** sólo cuando el estado es consistente, con voto/autoridad del anfitrión y política para compañeros desconectados.

## Algoritmo de commit

`prepare(snapshot) → validate invariants → write temp + checksum → fsync/server ack → atomic commit → announce revision`. Si existe backend: transacción o compare-and-swap por `revision`; si es archivo local: escritura atómica cuando plataforma lo permita. Clientes no sobrescriben estado autoritativo con versiones anteriores.

## Snapshot + event log

Guardar snapshot periódico + eventos compactos posteriores permite migración/replay sin guardar cada input. Los eventos de economía deben tener claves idempotentes. No se requiere determinismo bit a bit del renderer, sí coherencia del estado autoritativo. En caso de fallo de restore, cerrar de manera segura y explicar al jugador, nunca otorgar infinitos objetos.

## Ejemplos de restauración

- **Corte internet de 1 jugador:** mantiene reserva, reconecta a authority, reconstruye UI y cámara.
- **Corte de host:** peer replica válida con epoch superior, restauración y reconcile.
- **Suspensión voluntaria:** congelar cronómetros activos, guardar fase/seed/inventarios/pactos; continuar días después.
- **Cierre en boss final:** restaurar únicamente si existe snapshot consistente del estado combatible; si la plataforma no puede garantizarlo, documentar límites antes de habilitar guardado durante bosses.

## Acceso y privacidad

Metadatos de sala y perfil almacenados con mínima información, tokens rotativos, control de acceso por participantId. No guardar transmisiones de voz ni video en snapshots. Historial narrativo del Director debe poder reiniciarse/borrarse a petición mediante controles de producto futuros [PROPUESTA].

## Matriz de aceptación

Snapshot migrado conserva boss oculto, seed, reloj, chatarra, votos, pactos secretos sin filtrarlos a otros jugadores y selección de mejoras pendiente. Guardado con objetos duplicate IDs es inválido. Replay de `rewardGranted(eventId)` dos veces concede una vez.
