# Contratos de datos, comandos y eventos

## Criterio

Los archivos `05_DATA/` son **esquemas y datasets de ejemplo**, no implementación de estructuras existentes. La fase 0 debe crear un mapa de campos reales y migraciones si el juego ya maneja estado de partida.

## IDs y versiones

IDs estables por `runId`, `stageInstanceId`, `participantId`, `itemInstanceId`, `pactOfferId` y `rewardTxnId`. Tipos sin depender de número local del player. Cada cambio que rompe compatibilidad exige `schemaVersion` y migración o rechazo explícito.

## Inventario de comandos

| Comando | Permiso | Condición |
|---|---|---|
| `PROPOSE_PORTAL` | jugador activo | portal descubierto, explorando |
| `SET_READY` | titular de participante | etapa de preparación |
| `CAST_ROUTE_VOTE` | participante elegible | destinos validos |
| `CAST_FINAL_VOTE` | participante elegible | ≥4 mapas ciclo actual |
| `ACCEPT_PACT` | destino autorizado | oferta activa + consentimiento |
| `PURCHASE_ITEM` | participante autorizado | saldo + stock + cap |
| `CLAIM_LEVEL_UP` | titular | crédito de elección disponible |
| `TRANSFER_ITEM` | propietario + destinatario | consentimiento y estado estable |
| `RESCUE_ALLY` | jugador vivo | aliado caído y en rango |
| `PAIR_DEVICE` | anfitrión | token corto válido + autorización |
| `JOIN_RUN` | anfitrión / sistema | jugador nuevo solo entre etapas |
| `REJOIN_RUN` | dueño de token | participante previamente registrado |
| `SUSPEND_RUN` | política sala | fase consistente y confirmación |

## Catálogo de eventos

`RUN_STARTED`, `STAGE_ENTERED`, `XP_GAINED`, `PLAYER_LEVEL_AVAILABLE`, `ITEM_PURCHASED`, `ITEM_EVOLVED`, `PACT_OFFERED`, `PACT_ACCEPTED`, `PACT_SETTLED`, `PLAYER_DOWNED`, `PLAYER_REVIVED`, `PLAYER_ELIMINATED`, `TELEPORTER_DISCOVERED`, `TELEPORTER_EVENT_STARTED`, `STAGE_COMPLETED`, `ROUTE_SELECTED`, `LOOP_STARTED`, `FINAL_ACT_SELECTED`, `BOSS_REVEALED`, `BOSS_DEFEATED`, `TEAM_WIPED`, `RUN_CLOSED`, `SAVE_COMMITTED`, `HOST_MIGRATED`.

## Ejemplo de evento

```json
{
  "eventId": "evt-000042", "runId": "run-demo-001",
  "revision": 42, "authorityEpoch": 2, "atActiveMs": 182000,
  "type": "ITEM_PURCHASED", "payload": {
    "transactionId": "purchase-abc", "buyerId": "p1",
    "itemInstanceId": "itm-f93", "itemId": "placeholder_coil",
    "currency": "SCRAP", "cost": 130
  }
}
```

## Invariantes de catálogo

Un item no referencia sinergias inexistentes; un evento de teleportador no exige un enemy pool no compatible; un boss compatible tiene adaptador y arena; una pista del jefe seleccionado no apunta a boss distinto. Validación de config antes de habilitar versión de contenido.

## Migración de versión

Guardar build/content hash. No permitir reanudar una run de un build incompatible sin migración probada; ofrecer mensaje explicativo y export/soporte, no borrar silenciosamente. Los event logs redactados son útiles para informes de errores sin nombres/identificadores privados.
