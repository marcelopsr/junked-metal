# Demolición — Fabricación estilo RoboCraft (RC)

**Estado:** aprobado para MVP · **Fecha:** 2026-10-06  
**Reemplaza:** [`DEMOLICION_GDD.md`](./DEMOLICION_GDD.md) §27 (3 ranuras fijas) para el armado de producto.  
**Código:** `src/duel_build.ts`, `src/duel_fabricacion.ts`, fase `fabricar` en `src/duel.ts`  
**UI Impeccable:** `docs/impeccable/fabricacion-brief.md`

## 1. Visión

El jugador **fabrica** el robot en una mesa de taller con **bloques en rejilla 3D** (inspirado en RoboCraft 1): caras que conectan, asiento piloto obligatorio, ruedas mínimas, presupuesto de masa. Las plantillas (combos antiguos 3×3) son layouts editables; siempre se puede vaciar y armar de cero. Escala y look: **auto RC de juguete**, no mecha volador.

## 2. Decisiones (toolbox, confirmado con usuario)

| Tema | Decisión | Nota |
|------|----------|------|
| Celda | **0,25 m** | `duelo.grid_m` |
| Presupuesto | **Tope de masa kg** | `duelo.masa_max_kg` |
| Ruedas mínimas | **4** (oruga iz+der = 2 c/u → un par cumple 4) | `duelo.min_ruedas` |
| **Daño en arena** | **Vida global siempre** (una barra; muerte a 0) | `hp_base + Σ hp_bloque` al inicio del asalto |
| Desglose por piezas | **Integridad por bloque** en paralelo: cada golpe resta vida global y desgasta el bloque más cercano al impacto; al agotarse integridad, el bloque **desaparece** del mesh (rueda → menos tracción; asiento → KO) | Fracción en `duelo.part_wear_mul`; no es un segundo “pool de muerte” independiente del global |
| Física | Compound de cajas por bloque + CoG sumado | Sin mesh collider |
| Perfil | Altura libre dentro de la rejilla | — |

**No** es RoboCraft 1 puro (solo ripple por bloque): el jugador **siempre** lee una **vida global**; la destrucción por partes es feedback visual y mecánico (stats) mientras esa barra baja.

## 3. Modelo de datos

```ts
type Cell = { x: number; y: number; z: number; rot: 0|1|2|3; blockId: string };
type RobotBuild = { cells: Cell[]; paint?: DuelPaintState };
```

- Origen de rejilla: centro de la mesa; Y=0 = superficie de apoyo de ruedas.
- Coordenadas enteras de celda; cada bloque ocupa `sx×sy×sz` celdas según catálogo.
- Conexión: solo caras ortogonales compartidas (sin diagonales).

## 4. Catálogo de bloques MVP (`duelo_bloques`)

| id | cat | footprint | masa | hp | rol |
|----|-----|-----------|------|-----|-----|
| `chapa` | chasis | 1×1×1 | 0,35 | 8 | Cubo chapa; 6 caras |
| `cuna_blk` | chasis | 1×1×2 | 0,55 | 10 | Cuña (frente bajo) |
| `plancha_blk` | chasis | 2×1×2 | 0,45 | 6 | Losa baja |
| `chapa_u` | chasis | 2×1×1 | 0,4 | 7 | Perfil U |
| `rueda_std` | movimiento | 1×1×1 | 0,1 | 4 | Rueda estándar |
| `rueda_gig` | movimiento | 1×1×1 | 0,22 | 5 | Rueda gigante |
| `oruga` | movimiento | 1×1×2 | 0,55 | 8 | Banda; cuenta ×2 ruedas |
| `trompo` | arma | 1×1×1 | 0,8 | 6 | Melee |
| `sierra` | arma | 1×1×1 | 0,7 | 5 | Melee |
| `pala` | arma | 1×1×1 | 1,2 | 7 | Melee |
| `asiento_rc` | especial | 1×1×1 | 0,15 | 5 | Obligatorio (1) |
| `puerta` | cosmético | 1×1×1 | 0,08 | 2 | Panel |
| `muneco` | cosmético | 1×1×1 | 0,05 | 1 | Piloto visual |

Stats de movimiento/arma se promedian o toman el **máximo / suma** según campo (ver `duel_build.ts`).

## 5. Validación

| Regla | Nivel |
|-------|-------|
| Exactamente un `asiento_rc` | BAN si 0 o >1 |
| Grafo conexo desde el asiento | BAN si hay piezas sueltas |
| Conteo ruedas ≥ `min_ruedas` (oruga = 2) | BAN |
| Masa ≤ `masa_max_kg` | BAN |
| Al menos un bloque de arma | WARN (se puede pelear con embestida débil) |
| CoG Y muy alto vs huella | WARN |
| Arma trompo/sierra con plancha baja en misma celda frontal | WARN (clearance) |

## 6. Flujo UX

1. Menú → Demolición → fase **`fabricar`**.
2. Mesa 3D + rejilla; cajón lateral de inventario (tabs: Chasis / Movimiento / Arma / Especial).
3. Seleccionar bloque → clic en celda de la mesa (o en overlay de plantilla) → colocar si cabe y conecta (primera pieza libre).
4. **R** rotar 90°, **M** espejo X, **Z** deshacer, clic derecho / botón borrar quita.
5. Plantillas: Caja, Cuña, Plancha (layouts de celdas).
6. Telemetría: masa, vida est., velocidad est., avisos.
7. **Confirmar fabricación** → countdown → arena (mismo combate melee).

## 7. Física y combate MVP

- Mesh: merge de primitivas por celda (`models.ts`); se **reconstruye** al perder bloques en pelea.
- Havok: un cuerpo con masa/CoG agregados; collider AABB (compound por celda en v1.1).
- **HP global:** `hpMax = hp_base + Σ hp_bloque`; todo daño melee resta `hp`; HUD solo muestra esta barra.
- **Integridad por bloque:** en cada impacto, además se desgasta el bloque más cercano (`part_wear_mul × daño`); a 0 se elimina del build en vivo; pierde rueda → stats de movimiento; pierde asiento → `hp = 0`.
- Velocidad / tracción: recalculadas con `statsOfBuild` tras cada pérdida de pieza.

## 8. Persistencia

- `localStorage` clave `duel_build` (JSON de `RobotBuild`).
- Plantillas embebidas en código; rival sigue siendo layout fijo `cuna_industrial` convertido a celdas.

## 9. Fases

| Fase | Contenido |
|------|-----------|
| **MVP (esta tanda)** | Rejilla, catálogo, validación, plantillas, confirmar→pelea, shots |
| **v1.1** | Compound por celda, microtest mesa §30, ghost 3D al arrastrar |
| **v2** | Daño ripple por bloque, struts, más cosméticos |

## 10. Anti-objetivos MVP

- Hover / vuelo / thrusters.
- Economía de forja de cubos.
- Multijugador en taller.
- Soldaduras estilo RoboCraft 2.
