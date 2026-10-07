# Inventario visual — estado 2026-10-07

Fuente de verdad detallada: [`VISUAL_MODELS_UPGRADE_PLAN.md`](../VISUAL_MODELS_UPGRADE_PLAN.md) §2 · Arte Blender: [`OLEADA2_BLENDER_ART.md`](./OLEADA2_BLENDER_ART.md).

## Resumen ejecutivo

| Capa | En juego (`public/models/`) | En Blender (`assets-src/`) | Runtime |
|------|----------------------------|----------------------------|---------|
| Plaga + jefes GLB (5) | `ant`, `escupidora`, `escarabajo`, `perro`, `gato` | `.blend` + sculpt oleada 2 | VAT `glb.ts` |
| Procedurales (8 `Kind`) | — | `*_raw.glb` + `.blend` vía `proc2/build_all.py` | `enemyTemplate()` `models.ts` |
| Autos (8 `CarKind`) | `cars/*.glb` (hull) | `assets-src/cars/<id>/` | `carGlb.ts` + piezas `carModel()` |
| Piloto | — | pendiente | `pilotParts` procedural |

**Dirección:** [`ART_DIRECTION.md`](../ART_DIRECTION.md) — low-poly Megabonk, emisivos por tipo, colisión `DEF.size` fija.

## 13 `Kind` — checklist

| Id | GLB juego | Blend oleada 2 | Visible en ficha 3D |
|----|-----------|----------------|---------------------|
| hormiga | ✓ | ✓ sculpt | ✓ |
| escupidora | ✓ | ✓ sculpt | ✓ (`ficha-escupidora`) |
| escarabajo | ✓ | ✓ sculpt | ✓ |
| friccion | — | ✓ proc2 | procedural 1c (`VIS_1C`) |
| robot | — | ✓ proc2 | idem |
| polilla | — | ✓ proc2 | idem (+ alas código) |
| rey | — | ✓ proc2 | idem (+ 6 patas) |
| cortadora | — | ✓ proc2 | idem |
| tarantula | — | ✓ proc2 | idem (+ 8 patas) |
| perro | ✓ | ✓ sculpt | lab/jefe |
| gato | ✓ | ✓ sculpt | lab/minijefe |
| aspiradora | — | ✓ proc2 | procedural |
| cortacercos | — | ✓ proc2 | procedural |

## Artefactos locales (no commit automático)

- `assets-src/ant/ant_clean.glb` — export de prueba; **no** sustituye `public/models/ant.glb` hasta integrador.
- `assets-src/escarabajo/.renders/oleada2_after/` — evidencia sculpt (PNG).
- `assets-src/_oleada2_baseline/` — GLB `fe919c4` para renders before (gitignore).

## Verificación integrador (oleada 2 cerrada)

```bash
pm2 restart rc-test
npx tsc --noEmit -p .
npm test
npm run build
npm run shots -- --only ficha-hormiga,ficha-escupidora,garaje,lab,bestiario
npm run shots -- --diff   # actualizar ref solo con aprobación
```

Duelo / Demolición: fuera de esta oleada.
