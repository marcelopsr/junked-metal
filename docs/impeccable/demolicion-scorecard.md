# Demolición — scorecard Impeccable

**Fecha:** 2026-10-06  
**Modo:** Operate · **Targets:** `src/duel.ts`, `src/duel.css`, `src/duel_paint.ts`  
**Plan:** `docs/DEMOLICION_WORKBENCH.md`, brief `docs/impeccable/armado-brief.md`

## Detect (CLI)

| Ronda | Comando | Findings |
|-------|---------|----------|
| 1 | `impeccable detect --json` duel.ts, duel.css, duel_paint.ts | `[]` |
| 2 | (post polish) | pendiente al cierre de tanda |

## Checklist manual (critique / operate / craft-floor)

| Heurística | Notas | pts /5 |
|------------|-------|--------|
| Jerarquía Operate | Instrucción → stage 3D → bandeja → CTA fijo; stats en panel lateral | 4 |
| Carga cognitiva | 9 chips + 3 zonas; sin columnas de lore largo | 4 |
| Affordance | Drag HTML + click fallback; estados on/pending/drag-over | 4 |
| A11y | aria-label zonas, aria-grabbed/pressed, focus-visible, targets ≥44px móvil | 4 |
| Contraste / tokens | Paleta HUD (#b9d3a4, #141813, #2c3a28) alineada a menu.css | 4 |
| Copy | Neutro impersonal (sin voseo) en hints | 4 |
| Estados | Combo ban deshabilita CTA; warn visible; workbench oculto en fight/inter/results | 4 |
| Cobertura MVP WORKBENCH | Mesa taller, sin pasto en armado, órbita cámara, confirm→pelea | 4 |

**Score estimado:** **36 / 40** (meta ≥40: ronda 2 polish layout + detect)

## Ronda 1 — cambios

- Workbench MVP (bandeja drag/snap, mesa procedural, preview estático).
- `goDuel` sin precarga de patio (`main.ts`).
- Ocultar `#duel-arm` y CTA fuera de fase armado.
- Copy impersonal; aria-label en zonas drop.
- `showWorld(false)` en armado.

## Pendientes (v2 / score +4)

- Ghost 3D al arrastrar; snap animado + SFX taller.
- Zonas proyectadas al mesh (hoy overlay CSS).
- Probar escenario `duel` shots pc+cel y actualizar baseline si aplica.

## Regresión

```bash
npm run shots -- --only duel --vp pc
npm run shots -- --only duel --vp cel
npm run shots -- --only duel --diff
```
