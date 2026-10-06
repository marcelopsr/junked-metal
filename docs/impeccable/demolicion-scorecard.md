# Demolición — scorecard Impeccable (honesto)

**Fecha:** 2026-10-06 (revisión post-auditoría UX)  
**Modo:** Operate · **Targets:** `src/duel.ts`, `src/duel.css`  
**Brief:** `docs/impeccable/armado-brief.md`, plan `docs/DEMOLICION_WORKBENCH.md`

## Por qué el 38/40 anterior era falso

El scorecard automático marcaba detect `[]` y checklist sin probar el flujo real. En código:

- Existía CSS para `.duel-drop` en el robot, pero **no había nodos en el DOM** (`.duel-wb-stage` vacío).
- El drag terminaba en **columnas de la bandeja** (`data-slot` en `.duel-tray-col`), no en el robot.
- Un clic en chip equipaba al instante; `pendingPiece` no se usaba en UI.
- Copy contradecía el brief («columna» en lugar de «robot»).

Eso es UX rota con pintura de checklist: nota real de producto **~12/40** antes de esta tanda.

## Cambios (tanda armado → robot)

- Tres zonas `.duel-drop` sobre el viewport 3D (ruedas / arma / chasis) con grid y estados `drag-over` / `pick-target`.
- Drag HTML solo aceptado en zonas del robot; categoría debe coincidir.
- Clic: chip → selección; zona en robot → equipar (fallback documentado).
- Copy alineado al brief (neutro, sin voseo).
- Escenario `duel` shots: chip + zona para equipar.

## Detect (CLI)

Correr tras build: `impeccable detect --json src/duel.ts src/duel.css`

## Checklist manual (post-fix)

| Heurística | Notas | pts /5 |
|------------|-------|--------|
| Jerarquía Operate | Instrucción → stage con zonas → bandeja → CTA; stats lateral | 3 |
| Carga cognitiva | 9 chips + 3 zonas visibles en robot; pintura colapsada | 4 |
| Affordance | Drag al robot + selección/clic zona; aún sin ghost 3D | 3 |
| A11y | aria-label en zonas; pending visual; focus-visible | 3 |
| Contraste / tokens | HUD patio coherente | 4 |
| Copy | Brief principal + fallback | 4 |
| Estados | ban/warn/CTA; pending + equipado | 4 |
| Cobertura WORKBENCH | Zonas en robot (MVP); órbita cámara sigue pendiente en tick | 3 |

**Score estimado honesto:** **32 / 40** (zonas en robot + cajón lateral + ghost 3D al drag; −8: órbita, snap/SFX, zonas pegadas al mesh, critique con baseline nuevo)

## Pendientes v2 (para acercarse a 36–38 de verdad)

- Ghost 3D al arrastrar; SFX encaje.
- Órbita lenta en `duelTick` durante armado (plan WORKBENCH).
- Zonas ancladas visualmente al mesh, no solo overlay CSS.
- Segunda pasada `critique` con capturas pc + cel tras `shots --update`.

## Verificación

```bash
npx tsc --noEmit -p .
npm test
npm run build
pm2 restart rc-test
npm run shots -- --only duel
npm run shots -- --only duel --diff
```
