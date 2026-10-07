# Encargo — Oleada 1: hormiga (`assets-src/ant/`)

**Repo:** `rc_fight` (Junked Metal)  
**Agente:** solo lectura/escritura en `assets-src/ant/` hasta export; el integrador copia `public/models/ant.glb`.  
**Prohibido en este encargo:** otras carpetas `assets-src/*`, `src/glb.ts`, `src/models.ts`, `src/enemies.ts` (salvo integrador documentado), commits.

**Estado agente** [Malla ant oleada 1](145abb52-a65c-45c3-82ab-04b6226a9b89) (2026-10-07): pipeline Blender + `gltf-transform` OK (1240 tris, `__glbStats` OK). Pipeline OK; integrador copió `ant_clean.glb` → `public/models/ant.glb` ([Integrador oleada 1 GLB](4eae5458-03b0-403b-a0f2-4e21391a178e)). **Pendiente** refino artístico en `.blend` / `fat()` (§1).

**Oleada 2 sculpt** [Esculpir GLB ant escupidora](2840ded1-8273-478b-a30e-2baeef3a166f): `polish_oleada2.py` en `ant.blend`, **1272** tris, `export_clean.py` con `fat≈1.02`. Renders `renders/oleada2_before|after/`. Pinzas/ojos siguen en export. Sin commit hasta integrador.

**Referencias obligatorias (solo lectura):**

- Contrato VAT / materiales / animaciones: [`src/glb.ts`](../../src/glb.ts) (comentario L6–25, `WALK`/`ATTACK` L34).
- Dirección de arte: [`docs/ART_DIRECTION.md`](../ART_DIRECTION.md) (emisivos, enemigos § Personajes, Megabonk día).
- Plan maestro: [`docs/VISUAL_MODELS_UPGRADE_PLAN.md`](../VISUAL_MODELS_UPGRADE_PLAN.md) §2.1, §4 oleada 1, §5 criterios, §8 P3 (+10–20 % tris).
- Licencia base: [`assets-src/ant/LICENSE.txt`](../../assets-src/ant/LICENSE.txt) (CC0 OpenGameArt, mujtaba-io).

---

## 1. Objetivo de producto

Refinar la **hormiga** (`Kind` `hormiga`): silueta legible a distancia de partida, **mandíbulas** y **antenas** más claras, **ojos emisivos** rojos (identidad ART_DIRECTION), cuerpo marrón plástico coherente con `DEF.hormiga.color` (`#a0522d` vía material `Body`).

**Fidelidad (cerrado §8):** mismo low-poly pulido; techo **+10–20 % triángulos** sobre la malla exportada actual (~1 240 tris post `export_clean.py`), sin romper instancing ni VAT.

**Colisión (cerrado §8):** **solo visual**. Mantener `GLB.hormiga.scale = 2` y `DEF.hormiga.size = [0.9, 0.6, 1.7]`. Ajustar geometría en Blender para que encaje en esa caja; no pedir cambios de escala/caja sin ronda de diseño.

---

## 2. Contrato técnico VAT (`glb.ts`)

El juego **no** anima el esqueleto en runtime: hornea matrices de hueso por cuadro en textura (Vertex Animation Texture) y cada instancia elige índice de cuadro.

| Requisito | Detalle |
|-----------|---------|
| Esqueleto | Una malla skinned; **≤ 4 influencias/hueso por vértice** (normalizar pesos). |
| Orientación Blender | **Z arriba**, cabeza hacia **+Y**. Pose de reposo: **punto más bajo en y = 0** (el runtime apoya con `minY` tras escala). |
| Escala juego | `scale: 2` en `GLB.hormiga` (metros por unidad Blender). |
| Acciones | **`walk`**: ciclo; se hornearán **10** cuadros (`WALK`, índices 0–9). **`attack`**: de ida; **6** cuadros (`ATTACK`, índices 10–15). En el `.blend` original la mordida se llama `bite` → `export_clean.py` la renombra a `attack`. |
| Muestreo anim | Export con **`export_force_sampling=False`** (solo huesos con keyframes). |
| Materiales | **`Body`**: el juego aplica `M.plastic(DEF.hormiga.color)` — el albedo del GLB en `Body` es orientativo en Blender. **`Eye` / `Eye*``**: emisivo runtime `M.glow` con default **`#ff3020`** (hormiga no define `eye` en `GLB`; opcional futuro: `eye` en `glb.ts` solo vía integrador). Otros materiales: plástico con color del GLB. |
| Archivo publicado | `public/models/ant.glb` — optimizar con **quantize**, **sin** meshopt/draco en el artefacto final. |
| Combate | Sin `atk`/`hit`: ataque al tocar (`touchCd`), animación `attack` vía `glbAnimate`. |

**Riesgos VAT (plan §7):** más huesos animados o más cuadros → sube `vatBytes` y `bakeMs` (`__glbStats.hormiga` en dev). No añadir acciones extra sin acuerdo (no hay tabla `clips` para hormiga).

---

## 3. Baseline medido (2026-10-07)

Pipeline ejecutado en Mac con Blender 5.2.2 LTS.

| Artefacto | Tris | Animaciones | Notas |
|-----------|------|-------------|--------|
| `ant.blend` malla `Ant` (pre-export) | **1 080** | `walk` 1–10, `bite` 1–5 | 38 huesos (`inspect.py`) |
| `ant_clean.glb` (post `export_clean.py`) | **1 240** | `walk`, `attack` | +~14,8 % vs 1 080; ojos ico esfera unidos |
| `public/models/ant.glb` (post `gltf-transform`) | **1 240** | idem | ~38,6 KB |

Techo orientativo post-refino manual en Blender: **~1 190–1 480 tris** (mantener +10–20 % sobre 1 080 **o** no superar ~1 480 si se parte de 1 240).

---

## 4. Trabajo en Blender (artista / agente con `.blend`)

Archivo fuente: **`assets-src/ant/ant.blend`** (objeto `Ant`, armadura `Armature`).

### 4.1 Checklist de modelo

1. **Silueta:** tórax/abdomen separados legibles; patas con “chunk” toy (no hilos).
2. **Mandíbulas** (huesos `Bone.003`–`Bone.006` en script de engorde): abrir/cerrar creíble en `attack`; no atravesar el auto visualmente fuera de la caja de colisión.
3. **Antenas** (`Bone.032`–`Bone.037`): curvatura y grosor; evitar intersecciones con caparazón.
4. **Ojos:** esferas material `Eye` parentadas/pesadas a cabeza (`Bone.031`); el script `export_clean.py` puede regenerar ojos — si se modelan en el `.blend`, alinear script o desactivar bloque de ojos en script (solo dentro de `assets-src/ant/`).
5. **Suelo:** aplicar escala/posición para que el apoyo sea **y = 0** en pose de reposo.
6. **Peso:** tras editar geometría, **limitar a 4 grupos** y **normalizar** (el export lo refuerza).

### 4.2 Animación

| Acción | Frames en blend actual | Comportamiento en juego |
|--------|------------------------|-------------------------|
| `walk` | 1–10, ciclo | Loop; cadencia ligada a velocidad (`glbAnimate`). |
| `attack` (ex `bite`) | 1–5 en fuente CC0 | 6 cuadros horneados de ida; sincronizar mordida al frame de máxima apertura ~ mitad del clip. |

Al alargar `attack`, mantener nombre exacto **`attack`** o dejar que `export_clean.py` renombre `bite` → `attack`.

### 4.3 Materiales

- Renombrar cuerpo a **`Body`**; color difuso orientativo marrón (script usa `(0.35, 0.09, 0.03, 1)`).
- **`Eye`**: nombre exacto para submaterial emisivo.

### 4.4 Topología (+10–20 %)

- Preferir **subdividir patas/mandíbulas** y suavizado (`use_smooth` ya en script) antes que añadir objetos sueltos.
- Evitar nuevas submallas por material que no se fusionen en export (el runtime hace `MergeMeshes` + `flatten`).

**`export_clean.py` (opcional, no sustituye modelado):** engorde procedural por hueso (`fat()`), smooth, ojos, renombre `attack`. Ajustar factores `fat()` si la silueta queda demasiado gorda/delgada.

---

## 5. Scripts de build

Desde **`assets-src/ant/`**:

```bash
# Inventario (tris, acciones, huesos)
/Applications/Blender.app/Contents/MacOS/Blender -b ant.blend --python inspect.py

# Export intermedio (ant_clean.glb en esta carpeta)
/Applications/Blender.app/Contents/MacOS/Blender -b ant.blend --python export_clean.py

# Publicación (integrador o agente con permiso en public/)
npx gltf-transform optimize ant_clean.glb ../../public/models/ant.glb \
  --compress quantize --simplify false --texture-compress false --palette false
```

**Legacy (no usar para juego):** `export.py` exporta `ant.glb` crudo sin limpieza VAT — solo referencia.

**Orden:** `inspect` → editar `ant.blend` → `export_clean.py` → `gltf-transform` → verificación §6.

---

## 6. Validación

### 6.1 Agente (solo `assets-src/ant/`)

- `inspect.py`: tris y acciones coherentes; `attack` + `walk` presentes tras export.
- Contar tris en `ant_clean.glb` (gltf-transform CLI o script Node con `@gltf-transform/core`): dentro de techo §3.
- Revisar en visor glTF que no haya warnings de skinning >4 influencias.

### 6.2 Integrador (oleada 1, tras copiar a `public/models/`)

1. `pm2 restart rc-test`
2. `npx tsc --noEmit -p .`
3. `npm test`
4. `npm run build`
5. Consola sin `GLB hormiga: no cargó`; en dev: `__glbStats.hormiga` — `tris` ~1240±20 %, `bones` 38, `vatBytes` estable o menor que baseline si se reducen cuadros animados.
6. `npm run shots -- --only lab` (fila de enemigos; hormiga visible).
7. `npm run shots -- --diff` (1 % tol.; no actualizar ref sin aprobación).
8. Opcional balance: `npm run sim -- --seeds 1,2 --secs 120` (colisión sin cambios).
9. Impeccable / revisión ART_DIRECTION: ojos rojos emisivos, silueta día Megabonk.

### 6.3 Criterios de terminado (resumen plan §5)

- Silueta legible en lab/bestiario.
- Sin regresión de carga VAT.
- No flotar/hundir en 30 s de lab.
- `perf` partida: draws/ms sin empeora >20 % (oleada completa).

---

## 7. Entregables del agente

1. `ant.blend` actualizado (y opcionalmente ajustes a `export_clean.py` / `inspect.py` en la misma carpeta).
2. `ant_clean.glb` generado localmente.
3. Nota breve en este doc o en el informe del agente: tris antes/después, cambios de silueta, capturas de `inspect.py`.

**Integrador:** `public/models/ant.glb` + verificación §6.2. **No** cambiar `glb.ts` salvo decisión explícita (`eye`, `scale`).

---

## 8. Bloqueadores y dependencias conocidos

| Bloqueador | Impacto | Mitigación |
|------------|---------|------------|
| Blender no instalado en CI | No hay export automático en GitHub | Build local / agente Mac con Blender 4.x–5.x |
| Pesos >1 en mesh CC0 original | Export inválido sin `export_clean.py` | Siempre pasar por `export_clean.py` |
| Editar malla + script `fat()` | Doble engorde | Bajar `fat()` o modelar sin depender de `fat()` |
| Ojos duplicados | Script añade esferas si no se desactiva | Un solo camino: script **o** ojos en `.blend` |
| Cambiar `WALK`/`ATTACK` en `glb.ts` | Requiere integrador y re-bake de todos los instancias | Mantener 10/6; ajustar animación en Blender a esos conteos |
| `export.py` antiguo | GLB sin VAT válido | No publicar `assets-src/ant/ant.glb` crudo |
| Refino >20 % tris | Riesgo perf móvil | Recortar geometría o simplificar patas |

---

## 9. Comandos de verificación (copiar/pegar)

```bash
# Pipeline completo hormiga
cd assets-src/ant
/Applications/Blender.app/Contents/MacOS/Blender -b ant.blend --python inspect.py
/Applications/Blender.app/Contents/MacOS/Blender -b ant.blend --python export_clean.py
npx gltf-transform optimize ant_clean.glb ../../public/models/ant.glb \
  --compress quantize --simplify false --texture-compress false --palette false

# Tanda integrador (desde raíz del repo)
pm2 restart rc-test
npx tsc --noEmit -p .
npm test
npm run build
npm run shots -- --only lab
npm run shots -- --diff
```

**Dev en navegador (`rc-test` :5174, mute):** cargar partida/lab y revisar `__glbStats.hormiga` en consola.

---

## Oleada 1b — polish visible (2026-10-07)

**Objetivo:** silueta legible en partida (mandíbulas, antenas, ojos emisivos, contraste tórax/abdomen) sin pasar **1 488 tris** (+20 % sobre 1 240 publicados).

| Etapa | Tris | Notas |
|-------|------|--------|
| `ant.blend` antes (oleada 1) | **1 080** | CC0 + rig |
| `public/models/ant.glb` antes (1b) | **1 240** | Sin commit oleada 1 en repo en algunas tandas |
| `ant.blend` tras `polish_1b.py` | **1 080** | Misma topología; vértices: cintura, mandíbulas +Y/±X, antenas alargadas |
| `ant_clean.glb` / `public/models/ant.glb` tras 1b | **1 272** | `export_clean.py`: `fat()` mandíbulas 2.35, antenas 2.5, pinzas cone×2, ojos r=0.048 |

**Scripts añadidos en `assets-src/ant/`:** `polish_1b.py` (persiste en `.blend`), `render_1b.py` → PNG en `assets-src/ant/renders/`.

**Pipeline 1b:**

```bash
cd assets-src/ant
/Applications/Blender.app/Contents/MacOS/Blender -b ant.blend --python polish_1b.py
/Applications/Blender.app/Contents/MacOS/Blender -b ant.blend --python export_clean.py
npx gltf-transform optimize ant_clean.glb ../../public/models/ant.glb \
  --compress quantize --simplify false --texture-compress false --palette false
/Applications/Blender.app/Contents/MacOS/Blender -b ant.blend --python render_1b.py
```

**No hecho en 1b:** subdivisión extra en `.blend` (probada; llevó a ~2 046 tris export — descartada). Sin cambios en `src/glb.ts`.

---

## 10. Fuera de alcance

- Escupidora, escarabajo, perro, gato (otros agentes oleada 1).
- Procedural `enemyTemplate`, patas instanciadas (hormiga es 100 % GLB).
- Balance `balance.json`, IA, `DEF.size`, armas, props, autos, pilotos.
