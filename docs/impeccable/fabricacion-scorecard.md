# Fabricación — scorecard Impeccable

**Fecha:** 2026-10-06 · **Modo:** Operate

| Heurística | pts /5 | Notas |
|------------|--------|-------|
| Jerarquía | 4 | Viewport 3D dominante; rejilla + cajón secundarios |
| Affordance | 4 | Colocar/borrar/plantillas; vista arrastrable; empty state |
| Combate legible | 4 | Preview en mesa con pivot; telemetría lateral |
| A11y | 3 | Teclado R/M/Z; rejilla ≥44px móvil; viewport con aria-label |
| Cobertura RoboCraft lite | 4 | Rejilla, asiento, 4 ruedas, masa, 3 plantillas |

**Estimado:** **19 / 25** (~38/40 honesto vs armado: sin ghost 3D al colocar, pintura colapsada pendiente en fab)

**Cámara:** sin órbita automática; arrastre en `#duel-fab-viewport`. `__duel.shotCam(true)` fija pose baseline.

**Verificación:** `npm run shots -- --only duel` · detect sobre TS/CSS fabricación
