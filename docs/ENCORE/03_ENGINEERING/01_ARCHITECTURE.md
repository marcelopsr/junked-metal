# Arquitectura de referencia — modular, auditable y evolutiva

> **[PROPUESTA]** No se inspeccionó código de Junked Metal. Esta arquitectura define responsabilidades e interfaces; el agente debe mapearla al stack real y proponer alternativas antes de introducir frameworks nuevos.

## Topología conceptual

```text
UI y dispositivos ──> Session/Participant Registry ──> Run Orchestrator
            ├── Viewports/Input Router             ├── World/Route Planner
            ├── Director Presentation               ├── Time/Pacing/Threat Director
            ├── Local/Remote Device Bridge           ├── Encounters/Teleporter
            └── Co-op HUD                            ├── Combat/XP/Inventory/Pacts
                                                     ├── Boss/FINAL ACT
                                                     └── Persistence/Event Log
                                     ↑
                         Transport + Host Authority
```

Servicios acoplados mediante comandos/eventos versionados, no imports circulares. Gameplay autoritativo procesa eventos serializados; render/audio leen proyecciones de estado. La UI nunca ajusta daño/dinero/loot desde el cliente.

## Capas propuestas

1. **Domain** (`run`, `player`, `loot`, `pact`, `director`, `map`, `boss`): estado y reglas puras, comprobables sin renderer.
2. **Application** (`RunOrchestrator`, `JoinFlow`, `HostMigration`, `VoteCoordinator`, `SaveCoordinator`): comandos, orden y transacciones.
3. **Adapters**: combate y spawn de Survivor, scene loader, physics, audio, input, gamepad, network, storage.
4. **Presentation**: HUD, cámaras, subtítulos, pantallas del Director, ventanas/segundas pantallas, QR.
5. **Developer tooling**: simulador, replay de comandos, seed inspector, event tracers, performance budgets.

## Contratos canónicos

```ts
type ParticipantId = string;
type RunId = string;
type StageId = string;
type Command = { commandId: string; runId: RunId; actorId: ParticipantId;
  epoch: number; expectedRevision: number; type: string; payload: unknown };
type DomainEvent = { eventId: string; runId: RunId; revision: number;
  authorityEpoch: number; atActiveMs: number; type: string; payload: unknown };
```

`commandId` evita repetición; `revision` ordena; `epoch` evita dos hosts con autoridad simultánea. Los payloads deben validarse por esquema y capacidad; una API «unknown» deliberadamente no autoriza confiar en cliente.

## Invariantes de dominio

- `activeParticipants <= 4`, IDs no reutilizados durante run.
- `completedStagesInLoop >= 4` antes de FINAL ACT.
- `bossId` inmutable desde inicio hasta cierre de run.
- `scrapBalance >= 0`; compras idempotentes con propietario del objeto válido.
- `runState = CLOSED` bloquea todos los comandos de gameplay.
- `timeActive` es monotónico salvo cargar snapshot consistente.
- `stageSeed` y `runSeed` iguales para peers sin importar número de viewports.
- `severeTeamPact` requiere política de votos satisfecha.
- `multiscreenViewer` no se considera participant ni obtiene autoridad.

## Flujo transaccional de comando

1. Recibir comando con identidad autenticada o token de sesión.
2. Comprobar epoch, revision, fase actual, slot, capacidad, idempotencia.
3. Ejecutar reglas puras en host autoritativo; si error, responder código explicable.
4. Emitir evento y nueva revision.
5. Persistir en log/snapshot según política.
6. Publicar proyección a clientes y render; confirmar comando.

En un juego de acción en tiempo real, no todos los inputs se convierten en transacciones persistidas; movimiento/predicción usa red rápida con simulación autoritativa, reconciliación y estados delta. **Las mutaciones económicas/decisiones irreversibles sí requieren transacciones.**

## Reutilización Survivor: estrategia *strangler*

- Auditar `SurvivorGame` y superficies de configuración.
- Introducir un `GameModeAdapter` que exponga controles/combate sin cambiar contratos del modo original.
- Reutilizar servicios existentes solo tras pruebas de compatibilidad.
- Extraer componentes genéricos de manera gradual, con tests regresivos de Survivor tras cada refactor.
- No inventar rutas de archivos ni package names en esta especificación.

## Networking de alta frecuencia

Propuesta: host authoritative con entradas secuenciadas y replicación con snapshots/deltas; interpolación en peers; predicción local solo para movimiento si el stack lo permite. La física y combate determinista entre browsers pueden variar; **no basar host migration solo en lockstep perfecto sin demostrar determinismo**. Snapshots completos con epoch son más robustos.

## Observabilidad

`run_started, stage_completed, director_phase_changed, director_budget, teleport_event_started, pact_offered/accepted/settled, item_purchased/evolved, player_downed/revived, checkpoint_committed, migration_started/completed/failed, final_act_started, boss_defeated, run_closed`.

No enviar nombres privados ni voz/chat sin consentimiento; registrar IDs seudónimos y eventos útiles para depuración.

## Design review de la fase 0

Antes de codificar: identificar motor, lenguaje, renderer, física, routing, state store, server/signaling, modelo de hosting, cámaras/inputs, assets y estructura real; registrar decisión arquitectónica (ADR) con alternativas y costo. Si existe un motor que ya resuelve MultiScreen/multiplayer, reusar.
