---
name: Prototipo Demolición GDD
overview: Vertical slice y pulido v1 del modo Demolición (duel.ts) según DEMOLICION_GDD.md §26–37.
todos:
  - id: gdd-doc
    content: GDD maestro y §26 aprobación documentados
    status: completed
  - id: sync-arch
    content: BATTLE_ARCHITECTURE alineado con GDD (v1 arcade)
    status: completed
  - id: toolbox-policy
    content: Toolbox extendido y decisiones §26–37 cerradas en docs
    status: completed
  - id: approve-26
    content: Usuario aprobó implementar (§26, 2026-10-06)
    status: completed
  - id: phase-1-slice
    content: "src/duel.ts: armado 3×3, arena, mejor de 3, menú, ?duel, shots duel"
    status: completed
  - id: phase-0-physics
    content: "Fase 0: fuerzas/torques Havok reales (hoy arcade drive() en duel.ts)"
    status: pending
  - id: phase-2-playtest-balance
    content: "Fase 2: playtest humano — feel asalto ~2 min, IA asaltos 2–3, combos WARN"
    status: pending
  - id: phase-2-playtest-juice
    content: "Fase 2: SFX metal dedicados, presets armado, cosméticos §35"
    status: pending
  - id: phase-2-playtest-materials
    content: "Fase 2: editor pintura por zona §34 (localStorage duel_paint)"
    status: pending
---

# Plan prototipo Demolición

Commits de referencia: `c7c98e4` (slice), `e65a32b` (docs).

Pulido v1 (copy, resultados telemetría, juice mínimo) en tanda posterior a este plan.
