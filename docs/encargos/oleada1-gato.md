# Encargo oleada 1 — `assets-src/gato/` (Eulalio)

**Agente:** un solo ámbito de escritura: `assets-src/gato/*` y salida `public/models/gato.glb`.  
**No tocar:** `src/` (incl. `glb.ts`, `enemies.ts`, `models.ts`), otras carpetas `assets-src/`, `assets-src/cuadrupedo.py` / `bicho.py` salvo acuerdo con integrador.

Referencias: [`docs/VISUAL_MODELS_OLEADA1_GLB.md`](../VISUAL_MODELS_OLEADA1_GLB.md) (encargo E), [`docs/ART_DIRECTION.md`](../ART_DIRECTION.md), contrato GLB en [`src/glb.ts`](../../src/glb.ts).

**Estado** [Malla gato oleada 1](75e6485e-122b-4bd5-be52-0f7fee934b99) (2026-10-07): **cerrado** — oleada **1b visible** (2026-10-07): rayas/cola §1b, **6904** tris GLB; `spin` min Y **-0.17** sin cambio; `SEQ` intacto. Renders en `assets-src/gato/renders/`. Integrador: shots.

**Oleada 2 sculpt** [Esculpir GLB perro gato](66a90a4a-1333-458b-890c-e658a869d3a6): `polish_oleada2.py` + `export_blend.py` + `render_renders.py`. `jump` [0,38], `spin` [0,24] sin cambio.

---

## Rol en juego

| Campo | Valor |
|-------|--------|
| `Kind` | `gato` |
| Nombre | EULALIO EL MICHU |
| Colisión (`DEF.size`) | semiejes **3.4 × 3.6 × 6.4** m |
| `GLB.scale` | **1.1** |
| `GLB.eye` | `#a8ff3a` (emisivo ojos) |
| `GLB.clips` | walk **2.3** m/s, run **15.4** m/s (no patinar) |

### `SEQ` fijo (integrador; preferir ajustar animación, no estos números)

Definido en `src/enemies.ts`:

```ts
gato: {
  jump: ["jump", [0, 19, 29, 38]],
  spin: ["spin", [0, 4, 20, 24]],
}
```

Los cuatro índices marcan **fotogramas Blender a 24 FPS** donde empieza cada tramo de `Enemy.seq(phase)`:

| Secuencia | Clip | Tramos | Uso en IA |
|-----------|------|--------|-----------|
| `jump` | `jump` | 0→19 aviso/agazape · 19→29 aire (sincronizado con `vy`) · 29→38 recuperación al piso | Estado 1 (aviso 1 s) → impulso → `airborne` → slam |
| `spin` | `spin` | 0→4 agacharse · 4→20 **una vuelta** en ciclo (se repite 4× en 1,8 s) · 20→24 levantarse | Estados 2–3 (trompo); `recSeq = "spin"` al terminar |

`swipe` existe en el GLB (contacto con el auto) pero **no** está en `SEQ`; no romper nombre ni duración si se retoca la malla.

### 1b — Oleada visible (solo malla/materiales)

**Alcance:** `region()` (rayas/panza), loft de cola y punta en `gato.py`. **Prohibido** tocar `JUMP`, `spin()`, `acts`, duraciones y `SEQ` ([0,19,29,38] / [0,4,20,24]).

| Ítem | Criterio |
|------|----------|
| Rayas | Lomo y costados más contrastados; anillos de cola legibles en lab |
| Cola | Silueta más gruesa en base y punta redondeada (trompo/salto) |
| Tris | Techo **≤ 8 400** en `public/models/gato.glb` |
| Verificación | `render-clips.sh` → `jump_agazapa`, `jump_aire`, `spin` + `lateral` |

---

## Inventario

| Archivo | Rol |
|---------|-----|
| `gato.py` | Fuente: malla, materiales, rig, **todas** las acciones |
| `export.sh` | Blender headless + export a `public/models/gato.glb` |
| `render-clips.sh` | Renders PNG (`export=0`) incl. `jump_*` y `spin` |
| `gato.blend` / `gato_raw.glb` | Artefactos locales (generados) |
| Salida juego | `public/models/gato.glb` |

**Techo tris:** script pide **3 900** en `m.skin(..., tris=3900)`; GLB publicado ~**7 000**; no superar **8 400** (+20 % oleada).

**Acciones exportadas (nombres exactos):** `idle`, `walk`, `run`, `rage`, `jump`, `spin`, `swipe`, `death`.

---

## Foco de esta oleada: clips `jump` y `spin`

El resto del cuerpo (rayas, panza, cola, `tris`) puede refinarse en la misma tanda, pero **criterio de cierre** = salto y trompo legibles en lab y alineados con `SEQ` sin cambiar `enemies.ts`.

### `jump` (39 cuadros: 0–38)

Implementación: `JUMP` + `jump()` en `gato.py` (IK en pies, meneo de cadera/cola en cuadros 6–16).

| Cuadro | Lectura esperada | Enlace juego |
|--------|------------------|--------------|
| **0** | Reposo | Fin recuperación (`seq` fase 2 → 38) |
| **6–16** | Agazape, cola activa, pies plantados | Fase 0: aviso 1 s (`gato_salto_aviso_s`) mientras `timer` baja |
| **~19** | Despegue (estirado, patas traseras empujan) | **Inicio fase 1** al lanzar impulso (`airborne`) |
| **20–25** | Aire (manos adelante, cuerpo recogido en el pico) | `seq("jump", 1, p)` con `p` por altura vertical |
| **29** | Primer contacto / amortigua | **Inicio fase 2** al tocar suelo (`slam`) |
| **38** | Vuelta a idle | Tras `landT` ~0,4 s |

**Checks de animación**

- [ ] `ground_report`: reposo y contactos en salto sin pies bajo **y = 0** de forma visible (IK).
- [ ] Silueta de agazape leíble a 15–20 m (cámara lab).
- [ ] Cuadro **19** claramente “impulso”; no confundir con **16** (aún en el suelo).
- [ ] Caída **29–38** no flota: pies y panza bajan antes que el lomo.
- [ ] Cola no atraviesa el suelo en amortiguación.

Renders de referencia en `gato.py` (`render=`): `jump_agazapa` (cuadro 12), `jump_aire` (cuadro 22).

### `spin` (24 cuadros: 0–24)

Implementación: `spin()` — **FK** en patas (comentario en código: IK + giro 180° de caderas rompe el plano sagital). Una vuelta completa en **cuadros 4–20** (`hips` yaw `2π` con `t = (f-4)/16`).

| Cuadro | Lectura esperada | Enlace juego |
|--------|------------------|--------------|
| **0–4** | Baja centro, patas abiertas, orejas atrás | Fase 0: aviso **0,6 s** (`gato_trompo_aviso_s`) |
| **4–20** | **Una** rotación 360° agachado, cola hacia afuera | Fase 1: bucle; el juego hace **4** vueltas en **1,8 s** (`gato_trompo_s`) — el clip debe cerrar ciclo limpio en 20→4 |
| **20–24** | Se endereza | Fase 2: `landT` ~0,17 s (`recSeq = "spin"`) |

**Checks de animación**

- [ ] En cuadro **12** (mitad del giro) las cuatro patas siguen en el suelo (no “flotar” al girar).
- [ ] Cola y orejas venden “trompo de gato”, no deslizamiento de patas.
- [ ] Cuadros **4** y **20** encajan al hacer loop (4 vueltas en partida).
- [ ] Cuerpo **no** debe girar en Havok (`setAngularVelocity(0)`); solo la animación VAT.

Render de referencia: `spin` (cuadro 9 en `gato.py`).

---

## Scripts (desde la raíz del repo)

```bash
chmod +x assets-src/gato/export.sh assets-src/gato/render-clips.sh
```

### Export completo (blend + raw + `public/models/gato.glb`)

```bash
./assets-src/gato/export.sh
```

Opciones pasadas a Blender (`gato.py`):

```bash
./assets-src/gato/export.sh export=0          # solo blend/raw local, sin publicar
./assets-src/gato/render-clips.sh             # PNG en assets-src/gato/renders/
```

Equivalente manual:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/gato/gato.py
npx gltf-transform inspect public/models/gato.glb
```

### Inspección rápida post-export

Consola Blender debe mostrar `TRIS gato …` y `BONES …`. Revisar salida de `q.ground_report` para `jump` y `spin` (mínimos Y por acción).

---

## Pipeline de edición

1. Cambios solo en `gato.py` (geometría `region()`, `JUMP` / `spin()`, `tris`, materiales).
2. `./assets-src/gato/render-clips.sh` — revisar PNG `jump_agazapa`, `jump_aire`, `spin`.
3. `./assets-src/gato/export.sh` — publicar GLB.
4. Entregar al **integrador** (no es alcance del agente de carpeta):
   - `pm2 restart rc-test`
   - `npx tsc --noEmit -p .` · `npm test` · `npm run build`
   - `npm run shots -- --only lab,bestiario`
   - Duelo: `npm run sim -- --duel gato --seeds 1,2`
   - Lab: `?mute&lab&boss=gato` o escenario `jefes` en `scripts/scenarios.mjs`

---

## Checklist de validación (agente gato)

### Malla y materiales

- [ ] Atigrado: `Body` `#d9782a`, rayas `Stripe`, panza `Belly`, nariz `Nose`.
- [ ] Ojos: materiales `Eye` / `Pupil` (emisivo vía `GLB.eye` en runtime).
- [ ] Tris ≤ **8 400**; pesos ≤ 4 huesos/vértice; export sin warnings.

### Animaciones (prioridad)

- [ ] Nombres de acción intactos (lista arriba).
- [ ] `jump`: fotogramas clave alineados con `SEQ` **[0, 19, 29, 38]**.
- [ ] `spin`: ciclo **[0, 4, 20, 24]**; loop 4–20 sin “pop”.
- [ ] `idle` / `walk` / `run` / `rage`: sin patinado extremo a `clips` 2.3 / 15.4 m/s.
- [ ] `death`: pies IK al caer (mismo patrón que `jump`).

### Entregables

- [ ] `public/models/gato.glb` actualizado.
- [ ] Nota: tris antes/después y frames tocados en `jump` / `spin` (si hubo cambio).
- [ ] Carpeta `assets-src/gato/renders/` con al menos `jump_agazapa`, `jump_aire`, `spin` (PNG).

---

## Si hay que mover fotogramas de `SEQ`

Solo el **integrador** actualiza `enemies.ts` con evidencia (video o cuadro a cuadro en lab). El agente de `gato/` debe documentar el desfase propuesto (ej. “despegue real en cuadro 21”) y ajustar primero la curva en `JUMP` / `spin()` para acercarse a **[19]** y **[4, 20]**.

---

## Bloqueadores

| Ítem | Nota |
|------|------|
| Editar `cuadrupedo.py` | Afecta también a `perro/`; coordinar. |
| Cambiar duración total de `jump` o `spin` | Rompe VAT y `SEQ`; evitar. |
| `swipe` en combate | Timing fijo por `touchCd` en código; no renombrar clip. |

**Estado:** listo para ejecutar refinamiento de malla y pulido de **jump** / **spin** con los scripts de esta carpeta.
