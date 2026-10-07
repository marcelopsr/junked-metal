# Oleada 2 — Autos RC en Blender

Estado: **pasada 2 (juguete RC)** 8× `CarKind` en `assets-src/cars/<id>/` · runtime: `src/carGlb.ts` + fallback procedural en `carModel()`. Blockout: 624–796 tris/hull; pasada 2: **652–888** tris (+4–14 % vs blockout): paragolpes `bumper_bar`, ventanas/trim, piloto con visor `Glass`.

Referencias: [`ART_DIRECTION.md`](./ART_DIRECTION.md) (juguete RC, noche, low-poly legible), [`VISUAL_MODELS_UPGRADE_PLAN.md`](./VISUAL_MODELS_UPGRADE_PLAN.md) §2.2, `CARS` / `ANCH` en `src/models.ts` y `src/car.ts`.

## Política (cerrada con oleada 1)

- **Solo visual**: no cambiar `CARS[kind].size` ni masa de Havok.
- **Ruedas**: siguen procedurales (`wheelInst`) con anclas del bloque `ws` en `carModel()` — el GLB es carrocería + piloto blockout.
- **Taller**: alerón, calcos, defensas, escape, accesorios y faro runtime se siguen montando en `carModel()` encima del hull GLB.
- **Pintura**: material Blender `Paint` → `pbr` del taller en runtime (`Car.wear`).

## Carpetas y artefactos

| `CarKind` | Carpeta | Export |
|-----------|---------|--------|
| buggy | `assets-src/cars/buggy/` | `buggy.blend`, `buggy_raw.glb`, `buggy_clean.glb` |
| monster | `assets-src/cars/monster/` | idem |
| formula | `assets-src/cars/formula/` | idem |
| tanque | `assets-src/cars/tanque/` | idem |
| carrera | `assets-src/cars/carrera/` | idem |
| axel | `assets-src/cars/axel/` | idem |
| helado | `assets-src/cars/helado/` | idem |
| combi | `assets-src/cars/combi/` | idem |

**Runtime:** `public/models/cars/<kind>.glb` (cuantizado, sin meshopt/draco).

**Scripts compartidos:** `assets-src/cars/rc_common.py`, `assets-src/cars/build_car.py`.

### Comandos

Desde la raíz del repo:

```bash
# Un auto
/Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/cars/buggy/export.py

# Los 8
/Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/cars/build_car.py -- all=1
```

Paso manual (ya lo hace `export_static`):  
`npx gltf-transform optimize <kind>_raw.glb <kind>_clean.glb --compress quantize --simplify false --texture-compress false --palette false`

## Materiales GLB

| Nombre | Runtime |
|--------|---------|
| `Paint` | Color del taller (`o.paint` / `ANCH`) |
| `Trim` | `o.trim` o `#c9ccd1` |
| `Glass` | `M.glass()` |
| `Metal` | `M.metal()` |
| `Rubber` | `M.rubber()` |
| `Matte` | `M.matte()` |
| `Pilot` | `M.plastic` (muñequito soldadito blockout; opcional reemplazo por `pilotParts` si `o.pilot` ≠ default) |
| `Lamp` | Orientativo; ópticas runtime + `SpotLight` en `carModel()` |

## Piloto

**Soldadito** en cada `.blend` (`pilot_soldadito`: torso, hombros, casco, visor `Glass`, ojos `Rubber`) en `ANCH[kind].seat`. Con piloto **soldadito** y hull GLB, no se añade `pilotParts()`. Con otro piloto, `carModel()` monta `pilotParts()` pero el mesh `Pilot` del GLB **sigue visible** — pendiente ocultar nodo/material `Pilot` al instanciar.

## Integración TypeScript

- `src/carGlb.ts`: carga estática (sin VAT), plantillas por `CarKind`.
- `carModel()`: si hay plantilla GLB cargada, usa hull instanciado + ruedas/piezas de garaje; si falla la carga, **fallback** al bloque procedural histórico.
- `main.ts`: tarea de carga `autos` en paralelo a `bichos`.

## Verificación

```bash
npx tsc --noEmit -p .
pm2 restart rc-test
npm run shots -- --only garaje
```

Techo de triángulos sugerido por auto (blockout): **≤ 2 000** tris hull (sin ruedas).
