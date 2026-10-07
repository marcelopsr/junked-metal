# Oleada 1 — Encargo Felipe (`assets-src/perro/`)

**Ámbito del agente:** solo lectura/escritura en `assets-src/perro/` (principalmente `perro.py`).  
**Fuera de alcance:** `src/glb.ts`, `src/enemies.ts`, `public/models/`, `src/models.ts`, balance, menús. El **integrador** copia el GLB y, si cambian cuadros clave de `jump_slam` / `charge`, actualiza `SEQ` en `enemies.ts`.

**Referencia de producto:** jefe final Felipe (bulldog francés gris, mancha blanca en pecho), `DEF.perro` en `src/enemies.ts` — colisión `[3.2, 8, 8]`, color base `#6e7279`. Dirección: `docs/ART_DIRECTION.md` (noche, low-poly, un foco, sin UI genérica).

**Estado** [Malla perro oleada 1](54aaf9fd-14e9-4138-b244-5a7fb064756b) (2026-10-07): **cerrado** — oleada **1b visible** (2026-10-07): pecho/orejas §1b, **6789** tris GLB, `SEQ` intacto, renders en `assets-src/perro/renders/`. Shots lab/jefes → integrador.

**Oleada 2 sculpt** [Esculpir GLB perro gato](66a90a4a-1333-458b-890c-e658a869d3a6): `polish_oleada2.py` en `perro.blend` (pesos de hueso, no coords 0–1). Export **`export_blend.py`**; PNG con **`render_renders.py`**. `jump_slam` [0,40], `charge` [0,26] sin cambio. **No** volver a `perro.py` ni correr polish dos veces seguidas (acumula deformación).

---

## 1. Contrato con el motor (`glb.ts`)

Felipe usa el modo **clips** (todas las acciones del GLB se hornean a VAT a 24 cuadros/s):

| Campo en `GLB.perro` | Valor actual | Quién lo toca |
|----------------------|--------------|---------------|
| `file` | `"perro"` → `public/models/perro.glb` | Integrador (export) |
| `scale` | `1` (metros de juego por unidad Blender del script) | Integrador si cambia `S` en `perro.py` |
| `eye` | `"#3a2418"` (material `Eye*`) | Integrador si cambia color de ojo en script |
| `clips` | `[2.3, 13]` — m/s de suelo donde **walk** y **run** no patinan | Integrador tras medir zancada en juego/lab |

**Nombres de acción en el GLB** (deben coincidir exactamente con las claves en `acts` de `perro.py`):

| Acción | Tipo VAT | Cuadros Blender (`perro.py`) |
|--------|----------|------------------------------|
| `idle` | ciclo | `range(0, 49, 2)` |
| `walk` | ciclo | `range(0, 33, 2)` |
| `run` | ciclo | `range(0, 17)` |
| `rage` | ciclo | `range(0, 41)` |
| `jump_slam` | ida (último cuadro fijo) | `range(0, 41)` → **0…40** |
| `charge` | ida | `range(0, 27)` → **0…26** |
| `death` | ida | `range(0, 49)` |

Materiales esperados: `Body`, `Chest`, `Nose`, `EarInner`, `Eye` (emisivo en juego). Con `clips`, el juego usa el color/rugosidad del GLB en pelo (`glb.ts`), no el `DEF.color` plano.

### 1b — Oleada visible (solo malla/materiales)

**Alcance:** `region()` y primitivas de orejas/pecho en `perro.py`. **Prohibido** tocar `JUMP`, `CHARGE`, `acts`, rangos de cuadros y `SEQ` ([0,12,28,40] / [0,7,16,26]).

| Ítem | Criterio |
|------|----------|
| Mancha de pecho | Babero `Chest` blanco amplio, borde limpio (sin ruido sin), legible en 3/4 y frontal |
| Orejas | Silueta de murciélago un poco más alta; `EarInner` visible en 3/4 |
| Tris | Techo **≤ 8 332** en `public/models/perro.glb` |
| Verificación | Export Blender + `render=` con al menos `frontal`, `34`, `jump_slam_golpe`, `charge` |

---

## 2. Contrato `SEQ` — salto y embestida (solo lectura; alinear animación)

`src/enemies.ts` enlaza la **física** con fotogramas de Blender vía `Enemy.seq()`. Los números del array son **índices de cuadro a 24 fps** (el motor divide por 24 para el tiempo de `glbPlay`).

```ts
perro: {
  jump: ["jump_slam", [0, 12, 28, 40]],
  ram:  ["charge",   [0,  7, 16, 26]],
},
```

### `jump` → acción `jump_slam`

| Tramo `phase` | Juego | Cuadros SEQ | Claves en `JUMP` (`perro.py`) | Lectura |
|---------------|-------|-------------|-------------------------------|---------|
| 0 | En suelo, antes del salto | 0 → 12 | 0, 8 (agachado ~8), **12 despega** | Aviso / preparación |
| 1 | En el aire | 12 → 28 | **12**, 19 (árido), **28 golpe** | `bossClip` interpola según altura: `(vy0 - vy) / (2·vy0)` |
| 2 | Recuperación al aterrizar (~0,4 s) | 28 → 40 | **28**, 31, **40** reposo | Tras `airborne === false`; daño de zona en `"slam"` |

**Regla dura:** si se mueve el despegue o el aplastamiento en `JUMP`, el integrador debe cambiar `[0, 12, 28, 40]` en `SEQ.perro.jump` al mismo cuadro.

Cuadros de referencia para renders (`perro.py`):

- Aire: cuadro **19**
- Golpe: cuadro **28**

### `ram` → acción `charge`

| Tramo `phase` | Estado Felipe (`state`) | Duración juego (balance) | Cuadros SEQ | Claves en `CHARGE` |
|---------------|-------------------------|--------------------------|-------------|---------------------|
| 0 | 3 — aviso + carril rojo | `DOG_RAM.wind` / `windRage` (~1 s / 0,75 s) | 0 → **7** | 0, **7** retroceso/agacho |
| 1 | 4 — carga recta | `len/speed` (~26 m / 30 m/s) | 7 → **16** | **12** embiste, **16** cabeza arriba |
| 2 | 5 — frenada | `DOG_RAM.brake` (~0,9 s) | 16 → **26** | vuelta a reposo en **26** |

**Regla dura:** los cortes **7**, **16** y **26** deben seguir siendo el fin de wind, el pico de carga y el final de la acción. Si se alarga `range(0, 27)` de `charge`, actualizar el último valor de `SEQ.perro.ram` y la clave final de `CHARGE`.

Render de referencia: cuadro **12** (embiste).

### Walk / run (sin `SEQ`)

Velocidades de ciclo: `GLB.perro.clips = [walk_m_s, run_m_s]`. Tras cambiar `walk()` / `run()` o la zancada, el integrador ajusta esos dos números hasta que en lab el paso no patine (comparar con `sp` del cuerpo en `bossClip`).

---

## 3. Scripts (desde la raíz del repo)

### Export completo (blend + raw + `public/models/perro.glb`)

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/perro/perro.py
```

Genera:

- `assets-src/perro/perro.blend`
- `assets-src/perro/perro_raw.glb`
- `public/models/perro.glb` (vía `gltf-transform optimize --compress quantize` en `bicho.export`)

### Solo iterar malla/anim sin pisar el GLB de juego

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/perro/perro.py -- export=0
```

Útil para `ground_report` en consola sin tocar `public/`.

### Renders de estudio (revisión visual)

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/perro/perro.py -- render=/tmp/perro-oleada1
```

PNG en `/tmp/perro-oleada1/` con vistas y poses clave (`jump_slam_aire`, `jump_slam_golpe`, `charge`, `rage`, etc.).

### Integrador (no corre el agente de perro; una vez al merge)

```bash
pm2 restart rc-test
npx tsc --noEmit -p .
npm test
npm run build
npm run shots -- --only lab,jefes --vp pc
npm run sim -- --duel perro --seeds 1,2 --god
```

Si cambió `SEQ` o `clips`: duelo obligatorio + revisar salto (sombra / `"slam"`) y embestida (carril + frame de cabeza).

---

## 4. Checklist — agente (`assets-src/perro/`)

### Silueta y materiales

- [ ] Silueta legible a distancia de juego: orejas de murciélago, hocico chato, pecho ancho, cola corta (~9,5 m alto con orejas, ~12,5 m largo vs referencia procedural en comentarios de `perro.py`).
- [ ] Mancha blanca en pecho (`Chest`) coherente con `DEF.color` / gris del cuerpo.
- [ ] Ojos en material `Eye`; sin geometría que rompa el límite de 4 influencias por vértice.
- [ ] Triángulos ~5800 (`tris=5800` en `skin`); no disparar sin motivo (VAT y móvil).

### Rig y suelo

- [ ] `ground_report` al exportar: reposo `|y| < 0,05`; `walk` / `run` mínimos no por debajo de ~−0,15 m (pies con IK en `q.feet` / `attack_pose`).
- [ ] Peso en patas delanteras/traseras (`q.keep_on_body` en hombros/caderas) sin penetración visible en `rage` y `death`.

### Animaciones de jefe

- [ ] **`jump_slam`:** lectura clara agachar → despegar (cuadro **12**) → apex → caída de manos → aplastar (**28**) → recuperación a reposo (**40**).
- [ ] **`charge`:** retroceso (**7**) → embestida frontal (**12**) → remate cabeza (**16**) → frenada hasta **26**.
- [ ] **`rage`:** loop estable (patas abiertas, mandíbula, temblor); usable en fase 2 quieto.
- [ ] **`idle` / `walk` / `run`:** ciclos cerrados; `run` galope compacto acorde a bulldog.
- [ ] **`death`:** caída de costado con pies IK hasta patas recogidas (sin pop entre IK/FK).

### SEQ (verificación antes de entregar al integrador)

- [ ] Si se tocaron diccionarios `JUMP` o `CHARGE`, documentar en el PR/commit del integrador los **nuevos** cuadros para `SEQ.perro.jump` y/o `SEQ.perro.ram` (tabla §2).
- [ ] Si no cambian 12 / 28 / 40 y 7 / 16 / 26, **no** pedir cambios en `enemies.ts`.

### Entregable del agente

- [ ] Diff solo bajo `assets-src/perro/`.
- [ ] Salida de `ground_report` pegada en el informe del encargo (o captura de consola del export).
- [ ] Opcional: carpeta de renders `render=` con al menos golpe de salto y embestida.

---

## 5. Checklist — integrador

- [ ] `public/models/perro.glb` regenerado desde el script del agente.
- [ ] Consola sin `GLB perro: no cargó`; `__glbStats` en dev con triángulos/huesos razonables.
- [ ] `SEQ` y `clips` actualizados solo si el agente movió cuadros clave o zancada.
- [ ] Lab `?boss=perro` o escenario `jefes`: salto alineado con sombra; embestida con anim de carga.
- [ ] `npm run shots -- --diff` (tolerancia jefes según escenario); no actualizar ref sin aprobación.
- [ ] `docs/HANDOFF-PROYECTOS.md` / plan visual si cambió pipeline o decisiones de arte.

---

## 6. Archivos de referencia (lectura)

| Archivo | Uso |
|---------|-----|
| `src/glb.ts` | `GLB.perro`, horneado VAT, `clips`, materiales pelo |
| `src/enemies.ts` | `SEQ`, `DOG_RAM`, IA Felipe (`state` 1–5, `airborne`, `slam`) |
| `src/balance.json` | Tiempos de embestida/salto (`perro_*`, `perro_embestida_*`) |
| `assets-src/bicho.py` | `export()`, convención GLB |
| `assets-src/cuadrupedo.py` | `action`, `ground_report`, `render`, IK |
| `docs/VISUAL_MODELS_UPGRADE_PLAN.md` | Oleada 1, criterios de terminado |

---

## 7. Decisiones ya tomadas (no reabrir en este encargo)

- Felipe es **GLB con clips**, no procedural en `models.ts`.
- Ataques de salto y embestida usan **`jump_slam`** y **`charge`**, no el par `walk`/`attack` de plagas.
- Ajuste fino de daño, probabilidades y velocidad de carga vive en **balance**, no en Blender.

Si el encargo requiere cambiar timings de juego sin tocar cuadros, es tarea del integrador en `balance.json` / `DOG_RAM`, no del agente de `assets-src/perro/`.
