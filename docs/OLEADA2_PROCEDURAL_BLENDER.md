# Oleada 2 — Assets Blender (8 enemigos procedurales)

Estado: **mallas generadas en Blender** (2026-10-07). Runtime sigue usando `enemyTemplate()` en `src/models.ts` hasta integración GLB.

Plan maestro: [`VISUAL_MODELS_UPGRADE_PLAN.md`](./VISUAL_MODELS_UPGRADE_PLAN.md) · Encuesta OSS: [`OPEN_SOURCE_ASSETS_SURVEY.md`](./OPEN_SOURCE_ASSETS_SURVEY.md) · Arte: [`ART_DIRECTION.md`](./ART_DIRECTION.md).

---

## Alcance

| `Kind` | Carpeta | Cuerpo en GLB | Partes que siguen en código |
|--------|---------|---------------|-----------------------------|
| `friccion` | `assets-src/friccion/` | Malla rígida completa | — |
| `robot` | `assets-src/robot/` | Malla rígida completa | — |
| `polilla` | `assets-src/polilla/` | Cuerpo + ala derecha (`WingR`) | `wingTemplate()` ×2 en partida |
| `rey` | `assets-src/rey/` | Cefalotórax + elytra | `legTemplate` ×6 (`LEGS.rey`) |
| `tarantula` | `assets-src/tarantula/` | Cuerpo + quelíceros | `legTemplate` ×8 |
| `cortadora` | `assets-src/cortadora/` | Ride-on completo | — |
| `aspiradora` | `assets-src/aspiradora/` | Disco + torreta | — |
| `cortacercos` | `assets-src/cortacercos/` | Herramienta + espada | `sectorTemplate` (telemetría de ataque) |

**Política:** no cambiar `DEF[kind].size` ni `scale` en `enemies.ts` sin integrador. Las mallas aplican el mismo factor visual que `models.ts` (`VIS_1C` 1.22 en juguetes + `DEF.scale` en rey/tarántula).

---

## Pipeline compartido

| Archivo | Rol |
|---------|-----|
| `assets-src/toy_rigid.py` | `ToyBuild` (primitivas alineadas a `models.ts`), export GLB + `.blend`, hueso `root`, acciones stub `walk`/`attack` |
| `assets-src/proc2/meshes.py` | Definición de geometría (fuente de verdad artística oleada 2) |
| `assets-src/proc2/build_all.py` | Regenera los 8 assets en un solo comando |
| `assets-src/bicho.py` | Coordenadas juego → Blender (`G()`), materiales, armature |

### Comandos

```bash
# Todos (recomendado tras editar meshes.py)
/Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/proc2/build_all.py

# Un solo tipo
/Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/friccion/friccion.py
```

**Salida por carpeta:** `<kind>.blend`, `<kind>_raw.glb` (crudo; **no** escribe `public/models/` hasta integración).

### Publicar en juego (integrador, cuando entre GLB)

```bash
npx gltf-transform optimize assets-src/friccion/friccion_raw.glb public/models/friccion.glb \
  --compress quantize --simplify false --texture-compress false --palette false
```

Repetir por `kind`; registrar en `src/glb.ts` y quitar rama de `enemyTemplate` (como oleada 1).

---

## Contrato GLB (futuro)

Igual que [`VISUAL_MODELS_OLEADA1_GLB.md`](./VISUAL_MODELS_OLEADA1_GLB.md):

- Orientación Blender: Z arriba, cabeza hacia **+Y**; pies en **y = 0** (el script ajusta `min_y`).
- Materiales: `Body` (tinte `DEF.color` en runtime), `Eye*` / `Lamp` emisivos; resto conserva albedo del GLB.
- Animación: hoy **stub** (bob + empuje) solo para compatibilidad VAT; enemigos rígidos no necesitan clips de combate hasta que se animen piezas en Blender.
- **Extensión posible:** flag `static: true` en `glb.ts` para mallas sin VAT (instancia como `MergeMeshes` sin hornear), o Kenney retopo importado en el mismo `.blend`.

### Escalas aplicadas al export (coinciden con plantilla actual)

| `Kind` | Factor mesh | `DEF.size` [x,y,z] (colisión) |
|--------|-------------|-------------------------------|
| friccion | ×1.22 | 0.9, 0.6, 1.6 |
| robot | ×1.22 | 1.2, 1.7, 1.0 |
| polilla | ×1 | 1.4, 0.5, 1.1 |
| rey | ×3.5 | 6, 3.8, 8 |
| tarantula | ×3 | 6, 2.6, 6.5 |
| cortadora | ×1.22 | 7, 4.5, 6.4 |
| aspiradora | ×1.22 | 6.4, 1.6, 6.4 |
| cortacercos | ×1.22 | 3, 2.4, 9 |

---

## Kenney / OSS (retopo opcional)

Referencias por tipo en [`OPEN_SOURCE_ASSETS_SURVEY.md`](./OPEN_SOURCE_ASSETS_SURVEY.md) § friccion … cortacercos:

- **friccion / cortadora:** Kenney Toy Car Kit (CC0) — sustituir carrocería en Edit Mode manteniendo bbox.
- **robot / aspiradora:** Kenney Robot Pack o Vacuum Bot (CC0) — retopo a techo de tris del juego.
- **polilla:** alas/cuerpo desde mariposa CC0; conservar malla `WingR` separada.
- **rey:** variante de `assets-src/escarabajo/` escalada, o cuerno custom en este blend.

Tras retopo: renombrar materiales `Body`/`Eye*`, conservar hueso `root` o rig de plagas si se añade walk real.

---

## Verificación (agente)

```bash
npx tsc --noEmit -p .
ls assets-src/friccion/friccion.blend assets-src/robot/robot.blend  # … los 8
```

Integrador (cuando cablee GLB): `pm2 restart rc-test` → `npm test` → `build` → `npm run shots -- --only lab,bestiario` → `--diff`.

---

## Definición de hecho (oleada 2 assets)

- [x] Ocho carpetas `assets-src/<kind>/` con `.blend` + `_raw.glb` generables por script.
- [x] Documento único (este archivo) con pipeline y tabla de integración.
- [x] `tsc` sin cambios en `src/` (runtime procedural intacto).
- [ ] Integración `glb.ts` + `public/models/*.glb` (tanda integrador).
- [ ] Shots lab/bestiario con diff aceptado.
