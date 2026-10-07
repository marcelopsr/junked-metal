# Oleada 2 — arte en malla (Blender)

Estado: **piloto cerrado** (2026-10-07). Objetivo: cambios con **vértices movidos en `.blend`**, no solo factores numéricos en scripts de export o en `models.ts`.

## Línea base «before»

GLB de juego en commit **`fe919c4`** (`git show fe919c4:public/models/<nombre>.glb`). Copia de trabajo en `assets-src/_oleada2_baseline/` (no versionada). Renders: `assets-src/<carpeta>/renders/oleada2_before.png`.

## Resumen por criatura

| Criatura | Carpeta | Edición real en malla | Export | Tris `public/` (techo +20 %) | Renders after |
|----------|---------|------------------------|--------|------------------------------|---------------|
| hormiga | `ant/` | **Sí** — [Esculpir GLB ant escupidora](2840ded1-8273-478b-a30e-2baeef3a166f): `polish_oleada2.py` en `Ant`; `fat≈1.02` en export | `export_clean.py` → `ant.glb` | 1 272 / 1 526 | `renders/oleada2_before\|after/` |
| escupidora | `escupidora/` | **Sí** — mismo agente: saco/cabeza/patas/ojos en `escupidora.blend` | `export_blend.py` (no `escupidora.py`) | 1 476 / 1 771 | `game_15m`, `attack_escupe` |
| escarabajo | `escarabajo/` | **Sí** — `polish_oleada2.py` (élitros, pronoto, cuerno) | `bicho.export` | 1 534 / 1 841 | Diferencia visible |
| perro | `perro/` | **Sí** — [Esculpir GLB perro gato](66a90a4a-1333-458b-890c-e658a869d3a6): sculpt por **vertex groups** (pecho, hocico, orejas); no re-correr `perro.py` | `export_blend.py` + `render_renders.py` | 6 789 / 8 147 | `renders/*.png` + `oleada2_before\|after.png` |
| gato | `gato/` | **Sí** — mismo agente: orejas, mejillas, cola; `spin` min Y **-0.17** intacto | `export_blend.py` + `render_renders.py` | 6 904 / 8 285 | idem |

### Bestiario procedural (sin GLB en oleada 2)

| Id | Estado oleada 2 |
|----|-----------------|
| friccion | **Blockout** `assets-src/friccion/friccion.blend` (`blockout_oleada2.py`). El juego sigue en `enemyTemplate` / `models.ts`. |
| robot | **Blockout** `assets-src/robot/robot.blend` (`blockout_oleada2.py`). Sin cableado a `public/models/`. |
| polilla, rey, tarantula, cortadora, aspiradora, cortacercos | **Solo procedural** (`models.ts`); pendiente oleada 2b con `.blend` o import OSS. |

## Pipeline reproducible

```bash
BL="/Applications/Blender.app/Contents/MacOS/Blender"

# Before (opcional; baseline fe919c4)
git show fe919c4:public/models/ant.glb > assets-src/_oleada2_baseline/ant.glb
$BL -b --python assets-src/render_oleada2_baseline.py -- \
  glb=assets-src/_oleada2_baseline/ant.glb out=assets-src/ant/renders/oleada2_before.png ortho=1.05

# Hormiga
$BL -b assets-src/ant/ant.blend --python assets-src/ant/polish_oleada2.py
$BL -b assets-src/ant/ant.blend --python assets-src/ant/export_clean.py

# Plaga/jefes GLB (abre .blend existente)
$BL -b assets-src/escupidora/escupidora.blend --python assets-src/escupidora/polish_oleada2.py
$BL -b assets-src/escupidora/escupidora.blend --python assets-src/escupidora/export_blend.py
$BL -b assets-src/escarabajo/escarabajo.blend --python assets-src/escarabajo/polish_oleada2.py
$BL -b assets-src/perro/perro.blend --python assets-src/perro/polish_oleada2.py
$BL -b assets-src/perro/perro.blend --python assets-src/perro/export_blend.py
$BL -b assets-src/perro/perro.blend --python assets-src/perro/render_renders.py
$BL -b assets-src/gato/gato.blend --python assets-src/gato/polish_oleada2.py
$BL -b assets-src/gato/gato.blend --python assets-src/gato/export_blend.py
$BL -b assets-src/gato/gato.blend --python assets-src/gato/render_renders.py

# After (mismo script y `ortho` que before)
$BL -b --python assets-src/render_oleada2_baseline.py -- \
  glb=public/models/ant.glb out=assets-src/ant/renders/oleada2_after.png ortho=1.05
```

Utilidades: `assets-src/oleada2_common.py`, `assets-src/render_oleada2_baseline.py`.

Contrato VAT: sin cambios en `src/glb.ts` (escala, clips, `atk`/`hit`).

## Qué **no** cuenta como oleada 2 (oleada 1 / 1c)

- Ajustar solo `fat()` en `export_clean.py` o radios en `escupidora.py` **sin** guardar vértices en `.blend`.
- Cambios solo en materiales `glb.ts` o cajas en `models.ts` para enemigos con GLB.

## Verificación integrador

`pm2 restart rc-test` → `npx tsc --noEmit -p .` → `npm test` → `npm run build` →  
`npm run shots -- --only ficha-hormiga,ficha-escupidora,garaje` (escenario `ficha-escupidora` añadido en `scripts/scenarios.mjs`).

Duelo: **excluido** de esta tanda.

## Siguiente paso sugerido

1. Conectar `friccion` / `robot` a pipeline VAT o instancia estática si el diseño lo permite.  
2. Oleada 2b: mismas reglas para el resto del bestiario procedural.  
3. Reducir dependencia de `fat()` en hormiga cuando la silueta en `ant.blend` sea suficiente.

---

## Índice maestro — 21 + 8 entidades

**21 bestiario** = 13 `Kind` (`src/enemies.ts`) + 8 plantillas auxiliares (`src/models.ts`). **+8 autos** = `CarKind` (`src/car.ts`). Detalle procedural: [`OLEADA2_PROCEDURAL_BLENDER.md`](../OLEADA2_PROCEDURAL_BLENDER.md). Autos GLB: [`OLEADA2_CARS_BLENDER.md`](../OLEADA2_CARS_BLENDER.md), runtime `src/carGlb.ts`.

### A — Trece `Kind`

| # | Id | Fuente visual | Carpeta / módulo |
|---|-----|---------------|------------------|
| 1 | hormiga | GLB VAT | `assets-src/ant/` |
| 2 | escupidora | GLB VAT | `assets-src/escupidora/` |
| 3 | escarabajo | GLB VAT | `assets-src/escarabajo/` |
| 4 | friccion | Procedural + blockout | `models.ts`, `assets-src/friccion/` |
| 5 | robot | Procedural + blockout | `models.ts`, `assets-src/robot/` |
| 6 | polilla | Procedural + alas | `models.ts`, `assets-src/polilla/` |
| 7 | rey | Procedural + 6 patas | `models.ts`, `assets-src/rey/` |
| 8 | cortadora | Procedural | `models.ts`, `assets-src/cortadora/` |
| 9 | tarantula | Procedural + 8 patas | `models.ts`, `assets-src/tarantula/` |
| 10 | perro | GLB VAT **✓** oleada 2 [66a90a4a](66a90a4a-1333-458b-890c-e658a869d3a6) | `assets-src/perro/` |
| 11 | gato | GLB VAT **✓** oleada 2 [66a90a4a](66a90a4a-1333-458b-890c-e658a869d3a6) | `assets-src/gato/` |
| 12 | aspiradora | Procedural | `models.ts`, `assets-src/aspiradora/` |
| 13 | cortacercos | Procedural | `models.ts`, `assets-src/cortacercos/` |

### B — Ocho plantillas auxiliares

| # | Plantilla | Enemigos |
|---|-----------|----------|
| 14 | `wingTemplate` | polilla |
| 15 | `legTemplate` + `LEGS.rey` | rey |
| 16 | `legTemplate` + `LEGS.tarantula` | tarantula |
| 17 | `sectorTemplate` | cortadora, cortacercos |
| 18 | `cableTemplate` | cortacercos |
| 19 | `nutTemplate` | aspiradora |
| 20 | `teleTemplate` | tarantula |
| 21 | `auraTemplate` | jefes fase 2 |

### C — Ocho autos RC

| # | `CarKind` | Carpeta Blender | Runtime |
|---|-----------|-----------------|---------|
| 22–29 | 8× `CarKind` | **✓** blockout GLB [Esculpir 8 autos RC](24ef11e1-22f4-4c8d-9f23-f124b856bce0) · `carGlb.ts` | `assets-src/cars/<id>/` → `public/models/cars/*.glb` |
