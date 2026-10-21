# Modos de juego: dónde vive cada uno y su estado

Estado vigente en [CLAUDE.md](../../../CLAUDE.md) (primer párrafo); si discrepa, manda CLAUDE.md.

| Modo | Estado | Dónde vive |
|---|---|---|
| ENCORE | Principal | `encore.ts`, `encore_run.ts`, `encore_events.ts`, `pact_zones.ts`, `menu/cartelera.ts`; diseño en [../../ENCORE/README.md](../../ENCORE/README.md) |
| Supervivencia | Vigente (base de la partida) | `main.ts`, `run*.ts`, `combat.ts`, `weapons/`, `enemies/` |
| Paseo libre | Vigente | `zones/libre*.ts`, `free_*.ts` (lógica pura con pruebas), meta en `save.libre` |
| Luna | Vigente | `moon*.ts`; plan en [../../LUNA.md](../../LUNA.md) |
| Junked Crush (match-3) | Congelado: solo recibe cambios compartidos | `match3*.ts`, `match3_logic.ts`, `match3_levels.ts`; plan en [../../MATCH3_ARCADE.md](../../archivo/planes/MATCH3_ARCADE.md) |
| Carrera (kart) | Archivada | `kart.ts`, `kart_cfg.ts`, `race.css`; dev con `?race` |
| Demolición | Archivada en la rama `archivo/demolicion` (fuera de master) | [../../../.claude/trabajo/ARCHIVO-demolicion.md](../../../.claude/trabajo/ARCHIVO-demolicion.md) |

El cooperativo (PeerJS) está en `coop.ts` y `net_client.ts`; el servidor, en [servidor.md](servidor.md).

Carga por modo: `run_loader.ts` (`launchRun`, `goRace`, `goMatch3`, `goLibre`).
