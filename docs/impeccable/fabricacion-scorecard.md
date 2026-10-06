# Fabricación — scorecard Impeccable

**Fecha:** 2026-10-06 · **Modo:** Operate · **Ronda:** 6

| Heurística | pts /5 | Notas |
|------------|--------|-------|
| Jerarquía | 5 | Rail Y con ticks + barra de ocupación por plano; perfil lateral con fill |
| Affordance | 5 | Tabs íconos fab_*; zoom ±; pintura con strip + chip en visor; celdas pin / no-can |
| Combate legible | 5 | Chapa lite + troquel en armas/asiento/muñeco; ruedas en py de celda |
| A11y | 5 | Tokens HUD (--g-*, .h-track); botones ≥44px; focus `--fab-focus`; chip pintura con placa `--g-bg` + anillo sobre preview claro/oscuro |
| Cobertura RoboCraft lite | 5 | Rejilla, asiento, 4 ruedas, masa, 3 plantillas, pintura opcional enlazada al mesh |

**Estimado:** **25 / 25**

**Chip visor (ronda 6):** `.duel-fab-paint-chip` — fondo `--g-bg`, borde `--g-line`, sombra exterior; gradiente en `::before` con anillo oscuro/claro.

**Cámara:** sin órbita automática; arrastre en `#duel-fab-viewport`. `__duel.shotCam(true)` fija pose baseline.

**Luz fab (2026-10-06):** `installFabricarLighting` — mediodía local + spot/bounce + fill desde cámara + glow en preview; pelea restaura mediodía/sombras.

**Feedback colocación (ronda 5):** `SFX.duelFabPlace` / `duelFabReject` / `duelFabErase`; flash celda `just-placed`; equip `reject-flash`.

**Verificación:** `npm run shots -- --only duel` · `npm run playtest:duel` · detect sobre TS/CSS fabricación

**Pelea táctil (2026-10-06):** `body.duel-fight` oculta TURBO/DERRAPE/CAM; botón HAB → ARMA; pausa táctil abre `#duel-pause`.

**Cuenta regresiva (2026-10-06):** `#duel-count` estilo carrera (Rajdhani, 3-2-1 + ¡YA!); beeps `SFX.countBeep`.
