# Oleada 1 — Agente escupidora

Encargo autocontenido para **refinar el GLB** de la hormiga escupidora. Ámbito de escritura: **`assets-src/escupidora/`** únicamente. El integrador copia el artefacto a `public/models/escupidora.glb` (el script `bicho.export` ya lo hace). **No tocar** `src/models.ts`, `src/glb.ts` ni `src/enemies.ts` salvo que el integrador ajuste `atk`/`hit`/`scale`/`eye` documentados abajo.

Referencias obligatorias: `src/glb.ts` (contrato VAT), `docs/ART_DIRECTION.md` (emisivos, escupitajo rojo en FX — el saco es lima/ámbar en el mesh).

**Estado** [Malla escupidora oleada 1](db2e6d0b-bf79-48ef-8499-33ab578c39e0) (2026-10-07): **cerrado** — `escupidora.py` (saco doble, walk/attack cuadro **13**), **1476** tris, `atk`/`hit` sin cambio. Shots → integrador.

### Oleada 1b — VISIBLE (2026-10-07)

Segunda pasada solo geometría/materiales/animación en `escupidora.py` (sin tocar `src/`).

| Ítem | Cambio |
|------|--------|
| Saco `Sac` | Abdomen principal y gota trasera más anchos/altos; emisivo **0.55** (`#3d5500`), alpha **0.88**. |
| Cabeza | Cráneo más alto/ancho; probóscis más larga y gruesa; ojos **0.19** radio. |
| `Eye` | Emisión **3.0** (antes 1.5). |
| `attack` cuadro **13** | Latigazo exagerado: cabeza **−0.82** rad, saco escala **0.76**, avance cabeza **0.2**; carga (10) también más marcada. |
| `atk` / `hit` | Sin cambio (**0.83** / **0.65**); cuadro escupida sigue en **13**. |
| Tris | **1476** (techo **1550**); bbox publicado ~±0.79 × ±0.42 × ±1.0 m. |
| Renders | `assets-src/escupidora/renders/` — incluye **`game_15m`** y **`game_15m_escupe`** (`bicho.render` **dist=15**, ángulo 3/4 como lab). |

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/escupidora/escupidora.py -- render=assets-src/escupidora/renders
```

Integrador: `pm2 restart rc-test` → lab/bestiario; no hace falta `glb.ts` salvo QA visual.

---

## 1. Objetivo de producto

- Silueta **amenazante y legible** a distancia de partida: cabeza alta, mandíbulas/antenas, **saco de ácido** atrás (translúcido lima).
- Coherencia con la plantilla procedural de referencia (`enemyTemplate("escupidora")` en `models.ts`, solo lectura): rojo cuerpo `#d2381c`, saco `#9acd32`, patas `#5a160a`, ojos ámbar `#ffb020`.
- **Combate:** se frena ~16 m, apunta y dispara ácido en el **latigazo** de la animación `attack` (cuadro de escupida alineado con `hit` en `glb.ts`).

---

## 2. Pipeline VAT (lo que el juego espera)

Documentado en comentario de `src/glb.ts` L6–25. Resumen aplicado a escupidora:

| Requisito | Detalle |
|-----------|---------|
| Esqueleto | Una malla skinned, **≤ 4 influencias** por vértice (hoy 1 por pieza vía `bicho.Build`). |
| Triángulos | Malla triangulada; export sin simplificar (`--simplify false` en `bicho.export`). |
| Orientación Blender | **Z arriba**, cabeza hacia **+Y** (`bicho.G()` convierte coords de juego x/y/z → Blender). |
| Apoyo | Punto más bajo de la pose de reposo en **y = 0** (pies en `foot` con y ≈ 0,03 en juego). |
| Acciones GLB | Nombres exactos **`walk`** y **`attack`** (no `clips` en `GLB.escupidora` → hornado fijo). |
| Muestreo | `export_force_sampling=False` (keyframes del rig, no bake de muestreo forzado). |
| Escala juego | `GLB.escupidora.scale = 1` (metros por unidad Blender tras fix en `glb.ts`). Colisión: `DEF.escupidora.size` `[1.1, 0.8, 2]` — la silueta debe encajar sin cambiar `enemies.ts`. |
| Archivo publicado | `public/models/escupidora.glb` vía `gltf-transform optimize --compress quantize` (**sin** meshopt/draco). |

### Hornado en runtime (`glb.ts`)

- **`walk`:** se hornean **WALK = 10** cuadros en bucle (índices VAT 0–9). La fuente en `escupidora.py` usa ciclo de **24 fps**, cuadros `0,2,…,24` (el 24 repite el 0).
- **`attack`:** se hornean **ATTACK = 6** cuadros en ida (índices 10–15). Toda la curva Blender `attack` (0–20) se **remuestrea** a 6 poses en el horno; el juego no ve los 21 cuadros de Blender directamente.
- Instancias: `glbAnimate` avanza el ataque con `k ∈ [0,1]` = progreso de `this.atk / GLB.escupidora.atk` mientras dura el ataque en IA.

**Implicación:** el gesto de escupida debe ser **claro en los últimos tercios** del clip `attack` en Blender, porque al comprimir a 6 cuadros se pierde detalle fino.

---

## 3. Materiales (nombres = contrato `glb.ts`)

| Material Blender | Uso | En juego |
|------------------|-----|----------|
| `Body` | Cuerpo y cabeza rojos | `M.plastic(DEF.escupidora.color)` → `#d2381c` |
| `Sac` | Abdomen/saco ácido | **No** es `Body`: conserva color, **alpha** y emisivo del GLB (`glb.ts` L107–108) |
| `Legs` | Patas | `M.plastic` con color del GLB `#5a160a` |
| `Eye` o `Eye…` | Ojos | `M.glow(GLB.escupidora.eye)` → `#ffb020` (ART_DIRECTION: escupidora ámbar) |

Saco actual en script: `alpha=0.9`, `emit=0.4`, `emit_hex="#2a3a00"`, base `#9acd32`. Mantener lectura **lima translúcida** de noche/día Megabonk.

---

## 4. Animaciones: `walk` y `attack` (spit / atk)

### `walk` (`escupidora.py` → `walk_act`)

- 24 fps, **12 poses** (paso 2) + cierre en 24 = ciclo 1 s.
- Patas: `b.legs_walk(LEGS, p, 0.35, 0.35)`; cuerpo con bounce; abdomen en yaw; cabeza `nose_up` suave.
- Criterio: zancada creíble a **velocidad 7** m/s (`balance.json`); sin patas que floten o crucen el suelo.

### `attack` (`atk_act`) — sincronía con escupitajo

Keyframes de pose en `ATK` (cuadros Blender):

| Cuadro | Fase | Notas |
|--------|------|--------|
| 0 | Reposo | Neutral |
| 10 | Carga | Cabeza atrás, saco inflado (`scale` 1.15) |
| **13** | **Escupe** | Latigazo adelante — **marca visual del escupitajo** |
| 20 | Recuperación | Vuelta a neutral |

**IA y timing (`glb.ts` + `enemies.ts`, solo lectura):**

```ts
escupidora: { atk: 0.83, hit: 0.65 }
```

- Duración lógica del ataque: **0,83 s** (`this.atk` de 0 a 0,83).
- El proyectil **`spit`** sale cuando `this.atk` cruza **`atk * hit` = 0,5395 s** (~65 % del ataque).
- Eso debe coincidir con el **cuadro 13 de 20** en Blender (13/20 = 0,65). Si se mueve el cuadro de escupida, el integrador debe actualizar **`hit`** en `glb.ts` (o alargar/acortar el clip y **`atk`**) para mantener alineación.
- Antes del ataque: a distancia &lt; 16 m, alineación &lt; 0,4 rad → `spit_aim` (telemetría visual); luego `atk = 0` y animación.

`glbAnimate(..., k)` con `k = this.atk / atk` mapea ese progreso al índice **0…5** del VAT de attack (6 cuadros). El frame VAT ~`floor(k * 5)` debe **verse** como escupida cerca de **k ≈ 0,65**.

### Qué no hacer

- No renombrar acciones (`walk` / `attack`).
- No añadir acciones extra sin acuerdo (escupidora **no** usa modo `clips` de jefes).
- No usar `Body` para el saco (rompe el shader translúcido).

---

## 5. Comandos locales (esta carpeta)

Desde la **raíz del repo**:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/escupidora/escupidora.py
```

Salidas:

- `assets-src/escupidora/escupidora.blend`
- `assets-src/escupidora/escupidora_raw.glb`
- `public/models/escupidora.glb` (optimize + quantize, vía `npx gltf-transform` en `bicho.export`)

Renders de revisión (opcional):

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/escupidora/escupidora.py -- render=/tmp/escupidora-shots
```

Genera `escupidora_34.png`, `lateral`, `walk`, `attack_carga`, `attack_escupe`.

---

## 6. Checklist del agente (antes de handoff al integrador)

### Modelo y rig

- [ ] Cabeza hacia +Y en Blender; reposo con pies en el suelo (min Y ≈ 0 tras export).
- [ ] Silueta comparable o mejor que procedural: saco grande, antenas, mandíbulas/tubos legibles.
- [ ] Triángulos y huesos impresos por el script (`TRIS`, `BONES` en log) sin explosión vs. build anterior.
- [ ] Materiales: `Body`, `Sac`, `Legs`, `Eye` según §3.

### Animación

- [ ] `walk` cicla sin salto entre cuadro 24 y 0.
- [ ] `attack`: lectura clara carga → escupida (cuadro **13**) → recuperación.
- [ ] Patas compensan cabeceo en `attack` (bloque `LEGS` en `attack()`).

### VAT / juego (verifica integrador; agente documenta si cambió timing)

- [ ] Acciones exportadas solo `walk` y `attack`.
- [ ] Si se cambió duración del clip attack (≠ 20 cuadros @ 24 fps) o cuadro de escupida (≠ 13): anotar en PR/handoff los nuevos **`atk`** / **`hit`** propuestos.
- [ ] `scale` 1 sigue encajando colisión (no hundir ni flotar en lab).

### Arte (`ART_DIRECTION.md`)

- [ ] Ojos ámbar emisivos (`#ffb020`).
- [ ] Saco lima translúcido; cuerpo rojo plástico; sin rojo usado como “color jugador”.
- [ ] Low-poly legible, sombreado suave en mallas (no bloques crudos).

### Evidencia mínima

- [ ] Log Blender sin error; `gltf-transform` exit 0.
- [ ] PNG de `attack_escupe` y `walk` si se corrió `render=`.
- [ ] Nota de triángulos/huesos del `print` final de `bicho.export`.

---

## 7. Verificación del integrador (fuera de este encargo)

No ejecutar como agente escupidora salvo pedido explícito:

1. `pm2 restart rc-test`
2. `npx tsc --noEmit -p .` · `npm test` · `npm run build`
3. Consola sin `GLB escupidora: no cargó`
4. `npm run shots -- --only lab,bestiario` — fila con escupidora
5. Opcional: `npm run sim -- --seeds 1,2 --secs 120` (plaga con escupidoras)

Ajustes permitidos en **`glb.ts`** solo con evidencia: `scale`, `eye`, `atk`, `hit` (comentario `// assets-src/escupidora`).

---

## 8. Estado del script actual (`escupidora.py`)

- Rig: `body`, `head`, `abdomen`, 6 patas (`leg_*` / `shin_*`).
- Geometría: elipsoides + tubos (antenas, mandíbulas, patas).
- Export: `b.export(ao, ob, "escupidora", …)` → blend + raw + `public/models/escupidora.glb`.

Mejoras esperadas en oleada 1: silueta, detalle de cabeza/saco, pulido de pesos y timing **sin romper** nombres de materiales, acciones ni cuadro de escupida 13 salvo coordinación con `hit`.
