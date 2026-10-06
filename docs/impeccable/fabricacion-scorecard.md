# Fabricación — scorecard Impeccable

**Fecha:** 2026-10-06 · **Modo:** Operate

| Heurística | pts /5 | Notas |
|------------|--------|-------|
| Jerarquía | 5 | Rail Y con ticks + barra de ocupación por plano; perfil lateral con fill |
| Affordance | 4 | Tabs íconos fab_*; zoom ± (sin captura de arrastre); herramientas con SVG |
| Combate legible | 5 | Chapa lite + troquel en armas/asiento/muñeco; ruedas en py de celda |
| A11y | 4 | Tokens HUD (--g-*, .h-track); botones ≥44px; focus `--fab-focus` |
| Cobertura RoboCraft lite | 4 | Rejilla, asiento, 4 ruedas, masa, 3 plantillas |

**Estimado:** **23 / 25** (~46/50: layout 100dvh sin overflow; CTA z-index 120; deuda: ghost 3D, pintura en fab)

**Cámara:** sin órbita automática; arrastre en `#duel-fab-viewport`. `__duel.shotCam(true)` fija pose baseline.

**Luz fab (2026-10-06):** `installFabricarLighting` — mediodía local + spot/bounce + fill desde cámara + glow en preview; pelea restaura mediodía/ sombras.

**Verificación:** `npm run shots -- --only duel` · detect sobre TS/CSS fabricación
