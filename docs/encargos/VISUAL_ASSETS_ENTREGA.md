# Entrega — upgrade visual modelos 3D (2026-10-07)

Referencias: [`VISUAL_MODELS_UPGRADE_PLAN.md`](../VISUAL_MODELS_UPGRADE_PLAN.md), [`ART_DIRECTION.md`](../ART_DIRECTION.md), [`OLEADA2_BLENDER_ART.md`](./OLEADA2_BLENDER_ART.md).

## Dirección artística aplicada

- **Low-poly Megabonk / PSX moderno**: silueta legible a 15–40 m, emisivos por tipo (ojos, faros), materiales diferenciados (metal/juguete/goma/pelo) sin subir draw calls por instancia.
- **Detalle con intención** (no subdivisión ciega): piezas de fabricación (matrícula, espejos, rejilla, remaches, sutura de caparazón, pelos, etiquetas, guarda de gatillo, vena de ala).
- **Colisión**: `DEF.size` y `GLB.scale` sin cambios; ajuste solo en malla visual (`visual` donde aplica).

## Inventario activo (runtime)

| Id | Fuente | Carpeta Blender | `public/models/` | Animación | Notas |
|----|--------|-----------------|------------------|-----------|--------|
| hormiga | GLB VAT | `assets-src/ant/` | `ant.glb` | walk/attack | sculpt oleada 2 |
| escupidora | GLB VAT | `assets-src/escupidora/` | `escupidora.glb` | VAT + atk | saco ácido |
| escarabajo | GLB VAT | `assets-src/escarabajo/` | `escarabajo.glb` | VAT + embestida | |
| friccion | GLB VAT | `assets-src/friccion/` | `friccion.glb` | stub walk | proc2 oleada 3 detalle |
| robot | GLB VAT | `assets-src/robot/` | `robot.glb` | stub | proc2 oleada 3 |
| polilla | GLB VAT cuerpo | `assets-src/polilla/` | `polilla.glb` | stub | **alas** `wingTemplate()` en código |
| rey | GLB VAT cuerpo | `assets-src/rey/` | `rey.glb` | stub | **6 patas** `legTemplate` |
| tarantula | GLB VAT cuerpo | `assets-src/tarantula/` | `tarantula.glb` | stub | **8 patas** `legTemplate` |
| cortadora | GLB VAT | `assets-src/cortadora/` | `cortadora.glb` | stub | |
| aspiradora | GLB VAT | `assets-src/aspiradora/` | `aspiradora.glb` | stub | sculpt `polish_oleada2.py` (oleada 3) |
| cortacercos | GLB VAT | `assets-src/cortacercos/` | `cortacercos.glb` | stub | sculpt + `sectorTemplate` telemetría |
| perro | GLB VAT | `assets-src/perro/` | `perro.glb` | clips multi | Felipe — sculpt `polish_oleada2b.py` |
| gato | GLB VAT | `assets-src/gato/` | `gato.glb` | clips multi | Eulalio — idem |

### Auxiliares (código, sin GLB)

| Plantilla | Uso |
|-----------|-----|
| `wingTemplate` | polilla (×2, aleteo); malla ref. `WingR` en `polilla_raw.glb` |
| `legTemplate` + `LEGS` | rey, tarántula; malla ref. `LegR` en `rey_raw` / `tarantula_raw` |
| `sectorTemplate` | cortadora, cortacercos |
| `cableTemplate`, `nutTemplate`, `teleTemplate`, `auraTemplate` | jefes / ataques |

### Autos (`CarKind`)

| Id | Hull GLB | Carpeta | Fallback |
|----|----------|---------|----------|
| buggy … combi (8) | `public/models/cars/<id>.glb` | `assets-src/cars/<id>/` | `carModel()` procedural |

Ruedas, faros, taller (alerón, calcos, piezas) siguen en `carModel()`.

### Fuera de alcance (plan §1)

Armas/proyectiles, props `world.ts`, piloto detallado (`pilotParts`), modo Demolición duelo.

## Triángulos (export Blender 2026-10-07, proc2 regenerado)

| Kind | Tris malla (aprox.) | Techo plan (+20 %) |
|------|---------------------|-------------------|
| friccion | 692 | ~830 |
| robot | 824 | ~990 |
| polilla (cuerpo) | 676 | ~810 |
| rey | 540 | ~650 |
| tarantula | 676 | ~810 |
| cortadora | 580 | ~700 |
| aspiradora | 948 | ~1140 |
| cortacercos | 752 | ~900 |

Plaga/jefes GLB esculpidos: ver tabla en [`OLEADA2_BLENDER_ART.md`](./OLEADA2_BLENDER_ART.md). Autos hull pasada 2 (2026-10-07): 652–888 tris — [`OLEADA2_CARS_BLENDER.md`](../OLEADA2_CARS_BLENDER.md).

## Comparaciones antes/después

- Baseline commit `fe919c4` → `assets-src/_oleada2_baseline/` (gitignore).
- Oleada 2: `assets-src/<carpeta>/renders/oleada2_before|after.png`.
- Oleada 3 proc (fricción piloto): `assets-src/friccion/renders/oleada3_after.png`.
- En juego: `npm run shots -- --only lab,garaje,bestiario` → `.shots/actual/` (precarga headless ~105 s con 13 VAT).

## Pipeline — editar y reexportar

```bash
BL="/opt/homebrew/bin/blender"   # o Blender.app en macOS

# 8 procedurales + publicar a juego
$BL -b --python assets-src/proc2/build_all.py

# Un procedural
$BL -b --python assets-src/friccion/friccion.py

# Plaga/jefe GLB (abrir .blend, polish, export)
$BL -b assets-src/ant/ant.blend --python assets-src/ant/export_clean.py

# Autos (8)
$BL -b --python assets-src/cars/build_car.py -- all=1

# Cuantizar manual (si no usás export_public)
npx gltf-transform optimize assets-src/friccion/friccion_raw.glb public/models/friccion.glb \
  --compress quantize --simplify false --texture-compress false --palette false
```

Código de geometría procedural: `assets-src/proc2/meshes.py` → `toy_rigid.export_kind()`. Contrato VAT: `src/glb.ts` (comentario cabecera).

Integración: `pm2 restart rc-test` → `npx tsc --noEmit -p .` → `npm test` → `npm run build` → `npm run shots`.

## Rendimiento

- Instancing sin cambios (una plantilla por `Kind` / `CarKind`).
- Precarga: 13 hornos VAT en frío ~90–110 s en Chromium headless (timeout shots/perf subido a 150 s en `scripts/lib/browser.mjs`).
- VAT bytes: `__glbStats()` en consola dev.

## Limitaciones

- Patas/alas no van en el VAT del cuerpo: export `*_game_raw.glb` → `public/models/` (solo Rey/Polilla/Tarantula); patas/animación en `legTemplate`/`wingTemplate`. Bestiario/partida: `Enemy.syncAttachParts()` + `glbFootprint()` (no parent instancia→instancia).
- `enemyTemplate()` en `models.ts` queda como fallback si falla carga GLB (no precarga si `GLB[kind]` existe).
- Autos con hull GLB: piezas del garaje se parentan al hull (`carModel`); no fusionar con `MergeMeshes` (fix shots 2026-10-07).
- Piloto y props patio: pendientes de oleada dedicada.

## Cambios de esta tanda

- `polilla` registrada en `src/glb.ts`; export cuerpo-only (`public_parts`) en `toy_rigid.py`.
- Detalle artístico oleada 3 en `assets-src/proc2/meshes.py`; `build_all.py` publica a `public/models/`.
- `wingTemplate` / `legTemplate`: vena de ala y muslo más voluminoso.
- Timeout precarga headless 150 s.
