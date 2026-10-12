# Backlog por epic — IDs estables para Linear/GitHub/Codex

Prioridad `P0` requisito de núcleo; `P1` requerido para producto completo; `P2` expansión/pulido. Ninguna tarea implica que se haya implementado.

| ID | Prio | Fase | Historia / tarea | Verificación |
|---|---|---|---|---|
| ENC-001 | P0 | R0 | Mapear codebase Survivor y cámara | rutas/tests encontrados |
| ENC-002 | P0 | R0 | Auditar nivel Luna y performance | informe con mediciones |
| ENC-003 | P0 | R0 | Enumerar bosses reales y compatibilidad | tabla sin nombres inventados |
| ENC-004 | P0 | R0 | Auditar networking/saves/inputs | ADR firmado |
| ENC-005 | P0 | R0 | Registrar baseline regresión de todos los modos | tests ejecutables |
| ENC-010 | P0 | R1 | Máquina de estado Run/Stage | invariantes test |
| ENC-011 | P0 | R1 | Relojes global/local y pausas | monotonicidad |
| ENC-012 | P0 | R1 | Director simple con budgets | caps probados |
| ENC-013 | P0 | R1 | XP grupal y elección 3 cartas | sin pausa global |
| ENC-014 | P0 | R1 | Chatarra temporal y cofre | compras atómicas |
| ENC-015 | P0 | R1 | Teleporter discover/ready/event | un único disparo |
| ENC-016 | P0 | R1 | HUD mínimo de amenaza y tiempo | legible |
| ENC-020 | P0 | R2 | Grafo de rutas y candidatos | no softlocks |
| ENC-021 | P0 | R2 | Generación por seeds con validadores | seeds reproducibles |
| ENC-022 | P0 | R2 | Loop tras cuatro etapas | progresión correcta |
| ENC-023 | P0 | R2 | Guardado de etapa | reanuda mismo estado |
| ENC-030 | P1 | R3 | Pacing de cinco fases | logs de transiciones |
| ENC-031 | P1 | R3 | Mood y memoria Director | no inventa hechos |
| ENC-032 | P1 | R3 | Pantallas/voz/subtítulos | fallback texto |
| ENC-033 | P1 | R3 | Varias variantes de portal | preanuncio coincide |
| ENC-034 | P1 | R3 | Pactos rápidos con consentimiento | liquidación única |
| ENC-040 | P1 | R4 | Catálogo item/rara/stacking | cap y validación |
| ENC-041 | P1 | R4 | Tienda/máquina/recicladora | costos claros |
| ENC-042 | P1 | R4 | Interacciones entre tags | proc cap |
| ENC-043 | P1 | R4 | Evoluciones y códice | descubrimiento persistente |
| ENC-044 | P1 | R4 | Precios dinámicos con techo | no inflación rota |
| ENC-050 | P0 | R5 | Sorteo boss secreto inmutable | same after restore |
| ENC-051 | P0 | R5 | Arena y adaptadores de Survivor | boss compatible |
| ENC-052 | P1 | R5 | Pistas/revelaciones/sabotajes | no reroll |
| ENC-053 | P0 | R5 | ENCORE vs FINAL ACT poll | mayoría/empate |
| ENC-054 | P0 | R5 | Cierre final + metareward | no doble premio |
| ENC-060 | P0 | R6 | Registry de 1–4 jugadores | IDs por participante |
| ENC-061 | P0 | R6 | Net authority/snapshots/deltas | sincronía bajo lag |
| ENC-062 | P0 | R6 | XP y scrap compartidas reales | no dupes |
| ENC-063 | P0 | R6 | Rescate/caída/retorno etapa | full wipe |
| ENC-064 | P1 | R6 | Kit late join entre mapas | equilibrado |
| ENC-065 | P1 | R6 | Pactos/votos por participante | consentimiento correcto |
| ENC-070 | P0 | R7 | Input router 4 local | no cross control |
| ENC-071 | P1 | R7 | Split 2/3/4 + cámara shared | legibilidad y FPS |
| ENC-072 | P1 | R7 | Ventana separada/TV fallback | renderer validado |
| ENC-073 | P0 | R7 | 2 local + 2 online | cuatro slots exactos |
| ENC-080 | P1 | R8 | Pair QR/código y aprobación | revocar token |
| ENC-081 | P1 | R8 | WebRTC video receiver | RTT/FPS monitoreados |
| ENC-082 | P1 | R8 | Controlador móvil touch | input bound al jugador |
| ENC-083 | P1 | R8 | Móvil jugador completo | video + input sin slot extra |
| ENC-084 | P1 | R8 | Pantalla privada sin leaks | pruebas rol |
| ENC-090 | P0 | R9 | Snapshots/versionado/idempotencia | replay sin dupes |
| ENC-091 | P0 | R9 | Host election/epoch/recovery | sin split-brain |
| ENC-092 | P0 | R9 | Suspensión voluntaria | duración sin deriva |
| ENC-093 | P1 | R9 | Reconnect durante run | build preservada |
| ENC-094 | P1 | R9 | Abandono y cesión voluntaria | transacción segura |
| ENC-100 | P1 | R10 | Pactos largos/secretos | no griefing |
| ENC-101 | P1 | R10 | Evolución de mapas/secretos | solo siempre posible |
| ENC-102 | P1 | R10 | Director narrativa tier/diálogos | cooldowns |
| ENC-103 | P1 | R10 | LOD, 4 cámaras y VFX budgets | target FPS |
| ENC-104 | P1 | R10 | Accesibilidad y localización | matriz QA |
| ENC-105 | P1 | R10 | Stress/network/browser/device tests | reportes reproducibles |
| ENC-106 | P2 | R10 | Evolución visual/sonora avanzada | dirección aprobada |

## Convención de issue

**Contexto:** archivo fuente + decisión D-xxx. **Alcance:** exactamente un subsistema. **Cambios aceptables:** lista acotada. **Fuera de alcance:** evitar refactor accidental. **Criterios:** tests/escenas/input/budget. **Pruebas:** comando y resultado. **Rollback:** forma segura de deshacer sin perder datos. **Dependencia:** issue previo cerrado.

## Regla de trabajo

No marcar nada como DONE sin diff real, tests y revisión visual en el repositorio auténtico. El backlog es un contrato de trabajo, no un changelog de implementación.
