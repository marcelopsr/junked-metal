# Telemetría de producto y observabilidad

## Propósito

Tomar decisiones de balance basadas en evidencia, no convertir cada interacción en vigilancia. Priorizar telemetría local para QA y mínima producción agregada con consentimiento cuando corresponda.

## Eventos de alto valor

| Evento | Campos permitidos sugeridos | Hipótesis |
|---|---|---|
| `run_started` | run id seudónimo, party size, build | ¿Ingresan grupos completos? |
| `stage_started` | stage id, loop, threat band | ¿Dónde cae el ritmo? |
| `portal_discovered` | stage elapsed, hint tier | ¿Es excesiva la búsqueda? |
| `portal_activated` | elapsed, event type, party size | ¿El equipo decide avanzar? |
| `pact_offered` | category, offered tier | ¿Las oportunidades son claras? |
| `pact_accepted` | pact id, opt-in | ¿Hay riesgo/recompensa atractivos? |
| `level_choice` | options tags, selection, rerolls | ¿La aleatoriedad ofrece agencia? |
| `item_evolved` | recipe id, stack depth | ¿Existen builds diferentes? |
| `loop_decision` | ENCORE/FINAL, loop | ¿El bis es tentador? |
| `run_ended` | victory/wipe/abandon, duration, loop | ¿La curva de éxito es razonable? |
| `host_migrated` | result, duration, revision gap | ¿Es resiliente? |
| `multiscreen_started` | role, target profile, codec | ¿El streaming funciona? |

## Medición de experiencia

- Tiempo hasta primer momento divertido (autorreporte, no solo logs).
- % jugadores que entienden el dilema de tiempo/loot.
- Clasificación de molestias: UI / host / lag / pacto / búsqueda / duración.
- Tasa de acuerdos de votos, número de revotaciones.
- Tiempo esperando incapacitado o muerto hasta próximo mapa.
- Incidentes de pantalla privada visible indebidamente (objetivo cero).

## Rendimiento

FPS p50/p95, CPU/GPU frame time, entidad count, particles/procs por frame, encoder ms, WebRTC RTT/jitter/packet loss, reconnect duration, snapshot size, event log growth. Registrar sin ID personal persistente salvo necesidad operativa y consentimiento.

## Registro para balance

Cada decisión del Director debe contener: `why`, `threat`, `phase`, `mood`, `budget`, `activePlayers`, `candidatePool`, `seedStream`. Un tester debe poder explicar por qué apareció un enemigo/evento, no solo que apareció.

## Señales negativas y corrección

Si la tasa de victoria aumenta al reducir exploración, revisar economía de riesgo. Si familias de builds monopolizan, mejorar opciones subutilizadas antes de aplicar nerf universal. Si grupos de cuatro no completan por FPS, optimizar antes de aumentar recompensas. Si el Director molesta, reducir frecuencia antes de quitar personalidad.
