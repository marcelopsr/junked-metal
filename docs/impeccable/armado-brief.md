# Surface brief — Demolición / ARMADO (Operate)

**Modo:** Operate · **Target:** `src/duel.ts` + `src/duel.css`  
**Baseline shots:** `npm run shots -- --only duel --vp pc` → `.shots/actual/pc-duel-armado.png` (2026-10-06)

## Impeccable CLI

| Paso | Comando | Resultado |
|------|---------|-----------|
| Context | `impeccable context --target src/duel.ts` | OK; sin PRODUCT.md; refinamiento permitido |
| Critique/audit verbs | `impeccable critique/audit` | No en CLI v4.3.1; evaluación manual + `detect` |
| Detect | `impeccable detect --json src/duel.ts src/duel.css` | Ver salida en tanda (pre-cambio) |

## Critique (heurísticas, pre-cambio)

| Criterio | Nota 0–4 | Observación |
|----------|----------|-------------|
| Jerarquía visual | 1 | Pintura compite con piezas; lore en una línea |
| Carga cognitiva | 1 | Tres lores + 6 zonas + 8 swatches a la vez |
| Etiquetas / affordance | 2 | Q/R en texto plano; botones ‹ › sin nombre |
| A11y estructura | 1 | Sin landmarks de sección; barras sin texto asociado |
| Contraste / tamaño | 2 | 0.6–0.75rem dominante; secundario `#5f7355` bajo |

## Distill + clarify + layout (plan tanda 1)

1. **Flujo:** (1) Piezas con lore por columna → (2) Telemetría con títulos → (3) `<details>` «Pintura (opcional)» → aviso → CTA único.
2. **Copy:** Atajos como `<kbd>` secundarios; confirmar «Confirmar armado»; quitar voseo en aviso combo.
3. **A11y checklist post-implementación:**
   - [x] `h1` + `h2` por sección
   - [x] `aria-expanded` vía `<details>` nativo
   - [x] `aria-label` en swatches y flechas de pieza
   - [x] `:focus-visible` en controles
   - [x] Targets ≥44px en `@media (max-width: 500px)`

## Después (tanda 1)

- Shots: `pc-duel-armado`, `cel-duel-armado` (escenario espera `duel-ui.armado` + `#load.hidden`)
- `detect`: `[]` post-cambio

## Verificación prevista

- `tsc`, `npm test`, `build`
- `shots --only duel` pc + cel
- `impeccable detect` post-cambio

## Regresión visual (repetible)

Tras `pm2 restart rc-test`: `npm run shots -- --only duel --vp pc` y `--vp cel` (capturas en `.shots/actual/`). Comparar con referencia: `npm run shots -- --only duel --diff` (sale 1 si supera tolerancia; % por PNG en `.shots/diff/`). Tras cambio intencional de UI armado: `npm run shots -- --only duel --update`.
