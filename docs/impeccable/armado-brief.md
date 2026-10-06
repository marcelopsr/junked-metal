# Surface brief — Demolición / ARMADO (Operate)

**Modo:** Operate · **Target:** `src/duel.ts` + `src/duel.css`  
**Plan:** `docs/DEMOLICION_WORKBENCH.md`  
**Baseline shots:** `npm run shots -- --only duel --vp pc` → `.shots/actual/pc-duel-armado.png`

## Visión workbench

Mesa de taller RC antes de la arena: robot centrado en madera/metal, fondo taller oscuro (clima farol), bandeja Lego con drag a zonas. Telemetría y pintura en panel lateral colapsable. Jerarquía: instrucción → mesa 3D → bandeja → CTA.

## Criterios de aceptación (Impeccable Operate)

| Criterio | Meta MVP |
|----------|----------|
| Jerarquía | Instrucción una línea; mesa domina viewport; stats secundarios |
| Carga cognitiva | 9 chips + 3 zonas; lore en chip corto o tooltip, no columnas largas |
| Affordance | Chips `draggable`; zonas con estado vacío/equipado/hover drag |
| A11y | Click fallback documentado; focus visible; targets táctiles 44px |
| Contraste | Texto secundario sobre panel `#141813`, no gris genérico sobre verde |

## Impeccable CLI

| Paso | Comando | Resultado |
|------|---------|-----------|
| Context | `impeccable context --target src/duel.ts` | OK; refinamiento sobre implementación existente |
| Detect | `impeccable detect --json src/duel.ts src/duel.css` | Post-cambio en tanda |

## Copy

- Principal: «Arrastrar cada pieza al robot» (neutro impersonal, ART_DIRECTION).
- Fallback: «O elegir pieza y tocar la zona en el robot».
- CTA: «Confirmar armado» (sin cambio).

## Verificación

- `tsc`, `npm test`, `build`
- `shots --only duel` pc + cel; `--diff`; `--update` si workbench es nueva referencia
- `graphify update` tras commit

## v2 (fuera de brief)

Ghost 3D al arrastrar, snap animado, zonas proyectadas al mesh, audio de encaje.
