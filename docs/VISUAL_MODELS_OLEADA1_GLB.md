# Oleada 1 — Encargos GLB (5 carpetas en paralelo)

Estado: **oleada 1c cerrada** (`5b636a0`, `1e08b75`) — 5 GLB + procedural + 8 `carModel`; detalle [`OLEADA1C_FULL.md`](./encargos/OLEADA1C_FULL.md). **UX:** preview 3D en grilla bestiario (pendiente). **Impeccable** / lab shots opcional.  
Plan maestro: [`VISUAL_MODELS_UPGRADE_PLAN.md`](./VISUAL_MODELS_UPGRADE_PLAN.md) · Encuesta OSS: [`OPEN_SOURCE_ASSETS_SURVEY.md`](./OPEN_SOURCE_ASSETS_SURVEY.md) · Arte: [`ART_DIRECTION.md`](./ART_DIRECTION.md).

**Encargos por carpeta (detalle operativo):** [`encargos/oleada1-ant.md`](./encargos/oleada1-ant.md) · [`oleada1-escupidora.md`](./encargos/oleada1-escupidora.md) · [`oleada1-escarabajo.md`](./encargos/oleada1-escarabajo.md) · [`oleada1-perro.md`](./encargos/oleada1-perro.md) · [`oleada1-gato.md`](./encargos/oleada1-gato.md).

**Política de producto (cerrada):** solo geometría y materiales; **no** cambiar `DEF[kind].size` ni `GLB[kind].scale` en `src/glb.ts` / `src/enemies.ts` sin integrador. Ajustar silueta en Blender para que quepa en la caja de colisión Havok existente.

**Integrador (después de las 5 ramas):** `pm2 restart rc-test` → `tsc` → `npm test` → `build` → `npm run shots -- --only lab,bestiario` → `shots --diff` → revisar `window.__glbStats` en dev.

**Verificación integradores**

| Pasada | Agente | Alcance GLB | Build | Diff oleada-relevante |
|--------|--------|-------------|-------|------------------------|
| v1 | [Integrador oleada 1 GLB](4eae5458-03b0-403b-a0f2-4e21391a178e) | escupidora, escarabajo, ant (`ant_clean`→`public`) | OK | bestiario PC 0%; ver menús abajo |
| v2 | [Integrador GLB oleada 1 v2](b6185121-ac62-4711-bd41-7e172e1811f1) | + perro | OK; shots flake cel 1.º intento | **`cel-lab-jefes` 10.15%** (aceptar `--update`); `pc-lab-jefes` 0.57%; bestiario 0%; `sim --duel perro,aspiradora` OK |
| final | [Integrador oleada 1 final](f0e2892b-a397-4260-9346-8497f60c538c) | gato + 4 plaga/jefes | **OK** | bestiario 0%; `pc-lab-jefes` ≤0.58%; **`cel-lab-jefes` ~10%** → `--update`; gato spin -0.17 no visible en lab estático |

**`--diff` menús/config (fuera de criterio GLB):** [Investigar diff FSR menús](9be930ae-115c-41f6-be21-90dbcf49ba27) — escenarios config usan diorama `menuscene` sin GLB de oleada; fallos ~40–63 % PC / ~30 % cel = deriva FSR/refs (2026-10-06), no bloquean commit de mallas. Tras integrador final: `--update` **solo** lab/bestiario/jefes; re-baseline config/FSR en tanda aparte si se quiere limpiar ruido.

---

## Contrato VAT compartido (`src/glb.ts`)

Fuente de verdad: comentario L6–25 y código en [`src/glb.ts`](../src/glb.ts).

| Requisito | Detalle |
|-----------|---------|
| Esqueleto | Una malla skinned; **≤ 4 huesos por vértice**; pesos normalizados. |
| Export Blender | `export_force_sampling=False` (solo huesos animados). `export_yup=True`. `export_texcoords=False` salvo necesidad explícita. |
| Orientación | Blender: **Z arriba**, cabeza hacia **+Y**. Punto más bajo de la pose de reposo en **y = 0** (pies en el suelo del juego tras `fix` en `glb.ts`). |
| Escala juego | `GLB[kind].scale` (metros/unidad Blender). Colisionador = `DEF[kind].size` (semiejes Havok en `enemies.ts`), **independiente** del mesh. |
| Materiales | `Body` → plástico con `DEF[kind].color` (plaga) o color del GLB (jefes con `clips`). `Eye*` → emisivo (`GLB[kind].eye` o rojo por defecto). Otros nombres conservan albedo/alpha/emissive del GLB (ej. `Sac` escupidora). |
| Archivo runtime | `public/models/<file>.glb` (`GLB[kind].file`). |
| Compresión | `npx gltf-transform optimize <raw> ../../public/models/<file>.glb --compress quantize --simplify false --texture-compress false --palette false` (**sin** meshopt/draco). |
| Plaga (sin `clips`) | Acciones exactas **`walk`** (ciclo, 10 cuadros horneados en VAT) y **`attack`** (ida, 6 cuadros). Último cuadro de walk = primero. |
| Jefes (`clips`) | **Todas** las acciones del GLB se hornean; nombre = nombre de acción Blender. Cíclicas: `idle`, `walk`, `run`, `rage`. Resto one-shot (último cuadro fijo). `clips: [walk_m/s, run_m/s]` en `glb.ts` = velocidad de suelo sin patinar. |
| `atk` / `hit` (plaga) | Opcional en `glb.ts`: duración total del ataque y fracción del golpe (escupidora, escarabajo). |

**Lectura a distancia:** partidas de día (Megabonk), low-poly legible, emisivos de identidad por tipo (`ART_DIRECTION.md` § Giro a Megabonk, Identidad por emisivo). Sin texturas grandes: colores de vértice / materiales PBR simples; el juego aplasta a vertex colors (`flatten` en `glb.ts`).

---

## Baseline validado (2026-10-07)

Medición en `public/models/*.glb` (cuantizados, los que carga el juego):

| `Kind` | Carpeta | Tris actuales | Techo +20% | Animaciones en GLB | `GLB.scale` | `DEF.size` [x,y,z] |
|--------|---------|---------------|------------|-------------------|-------------|---------------------|
| hormiga | `ant` | 1 272 (1b) | ≤ 1 488 | `walk`, `attack` | 2 | 0.9, 0.6, 1.7 |
| escupidora | `escupidora` | 1 476 | ≤ 1 550 | `walk`, `attack` | 1 | 1.1, 0.8, 2.0 |
| escarabajo | `escarabajo` | 1 534 (1b) | ≤ 1 594 | `walk`, `attack` | 1 | 1.7, 1.1, 2.3 |
| perro | `perro` | 6 789 (1b) | ≤ 8 332 | `idle`, `walk`, `run`, `rage`, `jump_slam`, `charge`, `death` | 1 | 3.2, 8, 8 |
| gato | `gato` | 6 904 (1b) | ≤ 8 400 | `idle`, `walk`, `run`, `rage`, `jump`, `spin`, `swipe`, `death` | 1.1 | 3.4, 3.6, 6.4 |

Herramientas usadas: `npx gltf-transform inspect`, Node + `@gltf-transform/core` (extensiones `KHR_mesh_quantization`, `KHR_materials_emissive_strength`). **Blender 5.2.2** instalado en Mac (`/Applications/Blender.app`).

---

# Encargo 1 — `assets-src/ant/` (hormiga)

### Rol en juego
- **`Kind`:** `hormiga` · archivo `ant.glb` · color cuerpo `#a0522d` · ojos emisivos (default rojo en código si no hay `eye` en `GLB`).

### Inventario actual
| Archivo | Rol |
|---------|-----|
| `ant.blend` | Malla CC0 (mujtaba-io, ver `LICENSE.txt`), rig 38 huesos, acciones originales `walk`, `bite`. |
| `ant.glb` | Export crudo en carpeta (~137 KB); **no** es el del juego. |
| `export_clean.py` | Pipeline oficial → `ant_clean.glb` + paso `gltf-transform` manual a `public/models/ant.glb`. |
| `export.py` | Export mínimo legacy (no usar para producción). |
| `inspect.py` | Inventario tris / huesos / acciones en consola. |
| `LICENSE.txt` | CC0 OpenGameArt. |

**Gaps:** sin `README.md` en carpeta; sin script que invoque `gltf-transform` de punta a punta (dos pasos documentados en cabecera de `export_clean.py`). Malla fuente ~1 080 tris; export juego 1 240 tras “engorde” procedural en script.

### Objetivo visual (oleada 1)
- Silueta de hormiga **juguete/low-poly** más legible: mandíbulas, antenas, tórax/abdomen diferenciados.
- Ojos **`Eye`** emisivos visibles de noche y de día.
- Mantener rig y nombres de acción compatibles; renombrar `bite` → **`attack`** en export (ya hace `export_clean.py`).
- **No** superar **1 488** triángulos en `public/models/ant.glb`.

### Caja de colisión (solo referencia visual)
Con `scale: 2`, el mesh debe leerse dentro de semiejes **0.9 × 0.6 × 1.7** (ancho × alto × largo en metros del juego). Comprobar en lab: fila de enemigos y `?lab` con muchas instancias (`hormigas300` en shots).

### Lista ordenada (Blender)
1. Abrir `ant.blend`; correr `inspect.py` y anotar tris/huesos/frames.
2. Modelado: refinar silueta en Edit Mode (o ajustar factores `fat()` en `export_clean.py` si el cambio es global).
3. Verificar material **`Body`** y esferas **`Eye`** unidas a hueso cabeza (`Bone.031`).
4. Acción `bite` → renombrar a **`attack`** (o dejar que `export_clean.py` lo haga).
5. Asegurar ciclo **`walk`** (frames 1–10 en asset original) y ataque de ida coherente.
6. `Blender -b ant.blend --python export_clean.py`
7. `npx gltf-transform optimize ant_clean.glb ../../public/models/ant.glb --compress quantize --simplify false --texture-compress false --palette false`
8. Checklist de validación (abajo).

### Referencia OSS (opcional)
Kenney Cube Pets abeja/ladybug solo como **referencia de silueta**; mantener pipeline VAT actual ([`OPEN_SOURCE_ASSETS_SURVEY.md`](./OPEN_SOURCE_ASSETS_SURVEY.md) § hormiga).

---

# Encargo 2 — `assets-src/escupidora/`

### Rol en juego
- **`Kind`:** `escupidora` · `GLB`: `scale: 1`, `eye: "#ffb020"`, **`atk: 0.83`**, **`hit: 0.65`** (escupida en ~65% de la animación).

### Inventario actual
| Archivo | Rol |
|---------|-----|
| `escupidora.py` | Genera malla, rig, `walk` + `attack`, export vía `bicho.export()`. |
| `escupidora.blend` | Guardado al exportar. |
| `escupidora_raw.glb` | Salida Blender previa a quantize. |

**Gaps:** sin README; material **`Sac`** (lima translúcido `#9acd32`, alpha 0.9) debe seguir leyéndose como ácido; timing de ataque en cuadro **13** del rango 0–20 en script.

### Objetivo visual
- Saco de ácido más icónico; patas y cabeza rojas `#d2381c` / patas oscuras; ojos ámbar emisivos.
- Walk más “pesado” que hormiga; ataque con latigazo de cabeza legible a distancia.
- Techo **≤ 1 550** tris.

### Caja de colisión
Semiejes **1.1 × 0.8 × 2.0** con `scale: 1`.

### Lista ordenada (Blender / script)
1. Editar geometría y materiales en `escupidora.py` (o en `.blend` y re-sincronizar).
2. Revisar curva `ATK` en `attack()` — pico de escupida alineado con `hit: 0.65` × `atk: 0.83` s en juego.
3. Desde raíz del repo:  
   `/Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/escupidora/escupidora.py`  
   (opcional `render=DIR` para PNG de referencia).
4. Confirmar `public/models/escupidora.glb` actualizado por `bicho.export`.
5. Checklist de validación.

### Animaciones requeridas
`walk` (ciclo), `attack` (ida). Nombres exactos.

---

# Encargo 3 — `assets-src/escarabajo/`

### Rol en juego
- **`Kind`:** `escarabajo` · `eye: "#d0ff60"` · **`atk: 1`**, **`hit: 0.33`** (embestida en el tercio inicial de la animación).

### Inventario actual
| Archivo | Rol |
|---------|-----|
| `escarabajo.py` | Procedural; argumento `horn=curvo|recto|tenazas` (default **curvo**). |
| `escarabajo.blend` / `escarabajo_raw.glb` | Artefactos de export. |

**Gaps:** sin README; decidir si la oleada mantiene cuerno **curvo** o prueba A/B con `horn=` sin pisar GLB (`export=0` para renders).

### Objetivo visual
- Caparazón verde metálico `#2f7d4a`, costura `#1c1c1c`, ojos lima emisivos.
- Silueta de rinoceronte coleóptero; embestida leíble en ataque.
- Techo **≤ 1 594** tris.

### Caja de colisión
Semiejes **1.7 × 1.1 × 2.3** con `scale: 1` (el más ancho de la plaga).

### Lista ordenada
1. Ajustar élitros/cuerno en `escarabajo.py` (o blend).
2. Afinar `walk` (32 cuadros fuente) y `attack` (embestida frames 8–12 en `ATK`).
3. `Blender -b --python assets-src/escarabajo/escarabajo.py`  
   Variantes: `[-- horn=recto]` `[-- export=0]` `[-- render=DIR]`.
4. Checklist de validación.

### Animaciones requeridas
`walk`, `attack`.

---

# Encargo 4 — `assets-src/perro/` (Felipe)

### Rol en juego
- **`Kind`:** `perro` · jefe final · `clips: [2.3, 13]` (walk / run m·s⁻¹) · `eye: "#3a2418"`.
- **`SEQ` en `enemies.ts`:** `jump` → clip `jump_slam` frames [0,12,28,40]; `ram` → `charge` [0,7,16,26] (tiempos en cuadros Blender a 24 FPS).

### Inventario actual
| Archivo | Rol |
|---------|-----|
| `perro.py` | Cuadrúpedo vía `cuadrupedo.py`; target decimate **5 800** tris en script (GLB actual **6 943**). |
| `perro.blend` / `perro_raw.glb` | Export intermedio. |

**Gaps:** sin README; cambios de timing de salto/embestida exigen coordinación con integrador si se mueven frames clave de `SEQ` (preferir ajustar animación a `SEQ` existente).

### Objetivo visual
- Bulldog francés gris `#6e7279`, pecho blanco, orejas de murciélago; silueta ~9–12 m de largo en unidades script (ver comentario en `perro.py`).
- Fur/PBR del GLB se conserva (`clips` en `glb.ts`).
- Techo **≤ 8 332** tris; si subís `tris=` en `skin()`, no pasar techo.

### Caja de colisión
Semiejes **3.2 × 8 × 8** — jefe alto; alinear pies en y=0 y salto `jump_slam` con telemetría de slam.

### Lista ordenada
1. Editar primitivas / `region()` / `refine()` en `perro.py`.
2. Revisar IK y `ground_report` tras cambios de animación.
3. Acciones obligatorias (nombres exactos):  
   `idle`, `walk`, `run`, `rage`, `jump_slam`, `charge`, `death`.
4. `Blender -b --python assets-src/perro/perro.py` (`export=0` para iterar renders).
5. Verificar clips `jump_slam` (despegue ~12, impacto ~28) y `charge` (carga ~12) contra `SEQ`.
6. Checklist; shots **lab → jefes** y ficha bestiario `perro`.

### Referencia OSS
Quaternius Ultimate Animated Animals / Kenney Cube Pets puppy ([survey](./OPEN_SOURCE_ASSETS_SURVEY.md)) solo si se rehace malla; mantener nombres de clips.

---

# Encargo 5 — `assets-src/gato/` (Eulalio)

### Rol en juego
- **`Kind`:** `gato` · `scale: 1.1` · `clips: [2.3, 15.4]` · `eye: "#a8ff3a"`.
- **`SEQ`:** `jump` → `jump` [0,19,29,38]; `spin` → `spin` [0,4,20,24].

### Inventario actual
| Archivo | Rol |
|---------|-----|
| `gato.py` | Target **3 900** tris en script; GLB **7 000** tris; materiales `Body`, `Stripe`, `Belly`, `Eye`, `Pupil`, etc. |
| `gato.blend` / `gato_raw.glb` | Export. |

**Gaps:** sin README; `swipe` existe en GLB pero no en `SEQ` (reserva para futuro); pupilas en material separado — mantener nombres `Eye` / `Pupil` para emisivo correcto en ojos.

### Objetivo visual
- Atigrado naranja `#d9782a`, rayas `#93441a`, panza clara; cola larga; más delgado que el procedural antiguo.
- Techo **≤ 8 400** tris.

### Caja de colisión
Semiejes **3.4 × 3.6 × 6.4** con `scale: 1.1`.

### Lista ordenada
1. Ajustar `region()` / rayas / cola en `gato.py`.
2. Acciones obligatorias:  
   `idle`, `walk`, `run`, `rage`, `jump`, `spin`, `swipe`, `death`.
3. `spin`: ciclo agachado frames 4–20; alinear con trompo en IA (`recSeq = "spin"`).
4. `Blender -b --python assets-src/gato/gato.py`
5. Checklist; lab jefes + bestiario `gato`.

---

## Checklist de validación (cada carpeta)

### Build / pipeline
- [ ] Blender headless termina sin error; mensaje `TRIS` / `BONES` en consola (`bicho.export` o `export_clean.py`).
- [ ] `public/models/<file>.glb` existe y fecha coherente con la export.
- [ ] `npx gltf-transform inspect public/models/<file>.glb` — sin draco/meshopt; extensiones esperadas (`KHR_mesh_quantization`; emissive en plaga si aplica).
- [ ] Tris ≤ techo de tabla baseline +20%.
- [ ] Animaciones: nombres exactos según encargo; jefes incluyen todas las acciones listadas.

### Runtime (dev, `rc-test` :5174)
- [ ] Consola sin `GLB <kind>: no cargó`.
- [ ] En partida o lab: `window.__glbStats` muestra `tris`, `bones`, `vatBytes`, `bakeMs` razonables vs baseline.
- [ ] Plaga: caminar y atacar (escupidora escupe; escarabajo embiste) sin desincronía grave.
- [ ] Jefes: `idle`/`walk`/`run`/`rage`; salto y embestida/trompo alineados con telemetría roja.

### Shots / regresión visual
| Criatura | Escenario `scripts/scenarios.mjs` | IDs útiles |
|----------|-----------------------------------|------------|
| Todas plaga | `lab` | `noche` (fila de enemigos), opcional `hormigas300` (perf, sin PNG) |
| hormiga | `lab` | stress instancias |
| escupidora / escarabajo | `lab` | `noche`, probar ataque en partida corta |
| perro / gato | `lab` | `jefes` (`__lab({ boss: true })`) |
| Todas | `bestiario` | vista `bestiario` (pedestal 3D) |

Comandos integrador:  
`npm run shots -- --only lab,bestiario` · `npm run shots -- --diff` · duelo jefes si aplica: `--only duel`.

### No tocar (agente de malla)
- `src/models.ts` (procedural legacy).
- `src/glb.ts` / `src/enemies.ts` salvo integrador documentando cambio de `scale`/`atk`/`hit`/`clips`/`SEQ`.

---

## Dependencias compartidas (coordinación)

| Módulo | Quién lo edita |
|--------|----------------|
| `assets-src/bicho.py` | Solo si el cambio afecta **todas** las plagas procedural; preferir editar el `.py` de la carpeta. |
| `assets-src/cuadrupedo.py` | Solo encargos **perro** y **gato**; un agente a la vez. |

---

## Bloqueadores conocidos

| Ítem | Severidad | Nota |
|------|-----------|------|
| Sin script npm único de validación GLB | Bajo | Usar `gltf-transform inspect` + `__glbStats`; no hay target en `package.json`. |
| `ant` pipeline distinto al resto | Info | CC0 blend + `export_clean.py` vs generación procedural `bicho.py`. |
| Re-export Blender | Tiempo | perro/gato ~varios minutos; correr una vez al cerrar iteración. |
| Binarios en git | Política | No commitear `.glb` sin prueba integrador; `.blend` sí en repo hoy. |

**¿Listas las 5 carpetas para trabajo paralelo?** **Sí**, con carpetas disjuntas y regla de no editar `bicho.py` / `cuadrupedo.py` sin acuerdo. **Blender** y **gltf-transform** (vía `npx`) verificados en el entorno del repo.
