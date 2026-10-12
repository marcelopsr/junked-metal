# Riesgos, trade-offs y decisiones arquitectónicas pendientes

| Riesgo | Impacto | Mitigación propuesta | Verificar en |
|---|---|---|---|
| Coop host migration + browser physics | Muy alto | snapshots autoritativos, epochs, sim tests; no confiar en lockstep perfecto | R0/R6/R9 |
| 4 cámaras 3D + streams | Muy alto | pruebas tempranas de render targets/LOD/cap FPS | R0/R7/R8 |
| Reanudar días después sin backend | Alto | storage redundante/plan de backend mínimo | R0/R9 |
| Duplicación de objetos en crash | Alto | IDs de instancia, transacciones idempotentes | R1/R4/R9 |
| Director reacciona de forma injusta | Alto | fairness caps, cooldown, telegraphs y simulación | R3 |
| Moneda compartida causa conflictos | Medio/alto | transparencia, compras caras con confirmación limitada | R4/R6 |
| Pactos privados causan griefing | Alto | contrato legible, bajo impacto, revelación contextual, controles sociales | R3/R10 |
| Mapas generados bloquean ruta | Alto | rutas críticas reservadas y validación de seeds | R2 |
| Sinergias infinitas destruyen FPS | Alto | caps por proc/entidad/frame y VFX LOD | R4 |
| Late join desequilibra equipo | Medio | kit por banda y pruebas por loop | R6 |
| Boss Survivor no cabe en arena | Alto | matriz de compatibilidad antes de implementar arena | R0/R5 |
| Director habla demasiado | Medio | prioridades y cooldowns, opciones accesibles | R3 |
| Casting en TV no funciona universalmente | Medio | salida HDMI/duplicación como fallback + receiver web | R8 |
| Pérdida de conexión del mando móvil | Medio/alto | input neutralizado; reconexión role-bound | R8 |
| Alcance creativo crece sin fin | Muy alto | gates del roadmap, catalog tags, backlog y MVP probado | todas |

## ADRs por completar tras auditoría

- `ADR-001`: motor/red/render real y adapter Survivor.
- `ADR-002`: transporte authoritative y signaling.
- `ADR-003`: snapshots replicados y storage persistente.
- `ADR-004`: 4 viewports GPU y second-screen architecture.
- `ADR-005`: estrategia de inputs touch/gamepad/local.
- `ADR-006`: catálogo JSON vs TS vs formato propio.
- `ADR-007`: frontera de backend para metaprogresión y anticheat.

## Política «no inventar progreso»

Todo ADR debe enlazar diff, medición o prueba ejecutada. No declarar «resuelto» un riesgo porque existe una librería que promete hacerlo; verificar en el stack y dispositivos del juego.
