# Fabricación — scorecard Impeccable

**Fecha:** 2026-10-06 · **Modo:** Operate

| Heurística | pts /5 | Notas |
|------------|--------|-------|
| Jerarquía | 4 | Visor 3D con ticks; plano de montaje + rail alturas |
| Affordance | 4 | Tabs con ícono; flecha giro ruedas en rejilla; zoom +/− |
| Combate legible | 4 | Chasis remachado/soldadura; ruedas con banda orientable |
| A11y | 4 | Tokens HUD (--g-*, .h-track); botones ≥44px; focus `--fab-focus` |
| Cobertura RoboCraft lite | 4 | Rejilla, asiento, 4 ruedas, masa, 3 plantillas |

**Estimado:** **20 / 25** (~40/50 honesto: tokens alineados a `hud.css`; deuda: ghost 3D al colocar, pintura en fab, vista lateral capas)

**Cámara:** sin órbita automática; arrastre en `#duel-fab-viewport`. `__duel.shotCam(true)` fija pose baseline.

**Verificación:** `npm run shots -- --only duel` · detect sobre TS/CSS fabricación
