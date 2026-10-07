# Encargo oleada 1 — Escarabajo (`assets-src/escarabajo/`)

Fecha: 2026-10-07 · Agente **C** de [`VISUAL_MODELS_OLEADA1_GLB.md`](../VISUAL_MODELS_OLEADA1_GLB.md) · Plan maestro: [`VISUAL_MODELS_UPGRADE_PLAN.md`](../VISUAL_MODELS_UPGRADE_PLAN.md) § Oleada 1.

**Estado** [Malla escarabajo oleada 1](4bd208b7-339a-4c9a-8575-351b042cd47f) (2026-10-07): **cerrado** — cambios en `escarabajo.py` (silueta, walk, embestida frames 8–12 / clave 10), cuerno **curvo**, **1328** tris, GLB publicado. Sin `glb.ts`. Shots/`__glbStats` → integrador.

**Oleada 2 sculpt** [Esculpir GLB escarabajo](2957c243-1993-41a1-b20d-36125a514fa0): vértices en `escarabajo.blend` (`sculpt_oleada2.py`), **1534** tris, `walk`/`attack` OK. Renders: `.renders/oleada2_before/` vs `oleada2_after/`. Re-export: `export_blend.py` — **no** regenerar con `escarabajo.py` (pisa el sculpt). Sin commit hasta [Integrador oleada 2 escultura](49dfbfed-b98a-44f4-a388-dd0a0e38160f).

### §1b Oleada VISIBLE (2026-10-07)

| Métrica | Antes (1a) | Después (1b) |
|---------|------------|--------------|
| Tris (`TRIS` / `glPrimitives`) | 1 328 | **1 534** (techo plan **1 594**) |
| Submateriales GLB | 4 | **5** (`Shine` `#48c878` — conserva albedo en runtime, contraste con `Body`→plastic) |
| `horn` | `curvo` | `curvo` (tubo más grueso al pie, punta más alta) |
| Ojos | `emit=1.5` | `emit=1.8` |

**Cambios visuales:** costura élitros más ancha; bandas `Shine` + cantos `Dark` laterales; cuerno curvo retocado; pose `attack` cuadro **8** más agachada (`ATK` + apertura de patas en carga). Renders en `assets-src/escarabajo/.renders/` (incl. `escarabajo_attack_carga_lejos.png`, cámara `dist=2.5`). Pipeline: Blender + `gltf-transform inspect` OK (`walk`/`attack`, sin meshopt/draco).

## Alcance y rutas disjuntas

| Permitido (lectura/escritura) | Prohibido |
|-------------------------------|-----------|
| `assets-src/escarabajo/**` | `assets-src/{ant,escupidora,perro,gato}/` |
| Salida publicada: `public/models/escarabajo.glb` | Otros `public/models/*.glb` |
| Este brief (`docs/encargos/oleada1-escarabajo.md`) si hace falta anotar métricas | `src/**` (incl. `glb.ts`, `enemies.ts`, `models.ts`) |
| Lectura de contrato: `src/glb.ts`, `src/enemies.ts` (DEF), `assets-src/bicho.py` | Integración, shots, commit, push |

**Integrador** (otro rol, secuencial tras los 5 agentes): `pm2 restart rc-test`, `tsc`, `npm test`, `build`, `shots`, `shots --diff`. No lo ejecuta este encargo.

---

## Contrato VAT / GLB (obligatorio)

Fuente de verdad en código: comentario cabecera de [`src/glb.ts`](../../src/glb.ts) y export en [`assets-src/bicho.py`](../../assets-src/bicho.py) (`export()`).

### Geometría y esqueleto

- Una malla skinned triangulada, **≤ 4 influencias por vértice**, pesos normalizados (el pipeline `Build` de `bicho.py` usa **1 hueso por vértice**).
- Huesos: `body`, `head`, 6× (`leg_R/L1..3`, `shin_R/L1..3`) — **14 huesos** en el export actual.
- Coordenadas en script: **juego** x derecha, y arriba, z adelante (`bicho.G()` convierte a Blender Z-up, cabeza hacia +Y en Blender).
- **Reposo:** puntas de patas en **y = 0** (`foot` en `leg_bones`).
- Orientación en runtime: `glb.ts` invierte **z**, aplica `GLB.escarabajo.scale` (= **1**) y asienta el bbox mínimo en y = 0.

### Acciones Blender → hornado VAT

| Acción Blender | Cuadros en script | Muestreo export | Cuadros horneados en juego (`glb.ts`) |
|----------------|-------------------|-----------------|--------------------------------------|
| `walk` | 0–32, claves cada **2** cuadros (ciclo: cuadro 32 = 0) | `export_force_sampling=False` | **10** cuadros en loop (`WALK=10`, índices 0..9) |
| `attack` | 0–24, todos los cuadros | idem | **6** cuadros de ida (`ATTACK=6`, índices 10..15) |

- FPS Blender y bake: **24** (`bicho.FPS`, `CLIP_FPS` en `glb.ts`).
- Nombres de acción exportadas: exactamente **`walk`** y **`attack`** (modo `ACTIONS` en `gltf-transform` / glTF).
- **No** usar meshopt ni draco en el GLB publicado (solo `quantize` vía `gltf-transform optimize`).

### Materiales y look en juego

Registro actual:

```ts
escarabajo: { file: "escarabajo", scale: 1, eye: "#d0ff60", atk: 1, hit: 0.33 }
```

| Material en Blender (`escarabajo.py`) | En runtime (`glb.ts`) |
|---------------------------------------|------------------------|
| `Eye` | Emisivo `M.glow("#d0ff60")` |
| `Body` | **Siempre** `M.plastic(DEF.escarabajo.color)` → `#2f7d4a` (ignora metal/rough del Principled en Body) |
| `Dark`, `Legs`, otros | Color base del GLB vía `pbr` (rough ~0.32, coat 0.5); **no** hay canal metálico PBR en runtime |

**Implicación de diseño:** el brillo “metálico” del caparazón no sale del `metal=0.7` en `mat("Body", …)`; hay que lograr lectura con **silueta**, contraste **Dark** (costura/cuerno `#1c1c1c` / `#111`), y **ojos lima**. Cambiar ese comportamiento requiere integrador en `glb.ts` (fuera de alcance).

### Colisión y caja de diseño

- Colisionador: `DEF.escarabajo.size` = **`[1.7, 1.1, 2.3]`** m (ancho, alto, largo) — solo referencia visual; **no** editar `enemies.ts`.
- Cuerno hacia **+z** (adelante); variante por defecto en script: **`horn=curvo`** (rinoceronte).

### Sincronía ataque ↔ IA

- Duración animación en juego: **`atk` = 1 s**.
- Golpe / arremetida visual: **`hit` = 0.33** → el motor usa `k = atkProgress` en `glbAnimate` (fracción 0..1 de los 6 cuadros de attack).
- Keyframes de diseño en `attack()` (Blender): **8** agacha, **12** arremete (+z), **15** revolea cuerno. El pico de lectura de embestida debe alinearse ~**33 %** del clip de ataque (≈ cuadro **8** de 24, o ajustar keys sin cambiar `atk`/`hit` en `glb.ts`).

---

## Línea base (validada 2026-10-07)

Scripts comprobados en esta máquina (evidencia para el agente):

| Comando | Resultado |
|---------|-----------|
| `Blender -b --python assets-src/escarabajo/escarabajo.py` | OK · `TRIS escarabajo 1534` (1b) · `BONES 14` · `escarabajo_raw.glb` → `public/models/escarabajo.glb` (~71 KB) |
| `Blender -b --python assets-src/escarabajo/escarabajo.py -- export=0 render=/tmp/escarabajo-test` | OK · PNG `escarabajo_cuerno_curvo_34.png` |
| `npx gltf-transform inspect public/models/escarabajo.glb` | 1 mesh, **1534** gl primitives, **5** submateriales; animaciones **`attack`** (9 canales), **`walk`** (15 canales); extensiones `KHR_mesh_quantization`, emissive strength |

**Presupuesto tris oleada:** +10–20 % sobre **1328** → objetivo **~1460–1594** tris (techo orientativo del plan; no bloquear export si queda ~1400 con buena silueta).

Referencias de color (script / `ART_DIRECTION` / goo):

- Caparazón: `#2f7d4a` (Body → plastic en juego)
- Oscuros: `#1c1c1c`, patas `#111111`
- Ojos: `#d0ff60` emisivo
- Goo al morir (`main.ts`): `#9acd32` (no confundir con ojos)

---

## Tareas de refinamiento (checklist ejecutable)

Prioridad sugerida; marcar en notas de entrega al cerrar.

### 1. Silueta y variante de cuerno

- [ ] Elegir variante definitiva: `horn=curvo` **(recomendado**, survey + silueta minijefe) vs `recto` / `tenazas`.
- [ ] Comparar sin pisar GLB:  
  `Blender -b --python assets-src/escarabajo/escarabajo.py -- export=0 render=.renders horn=recto` (y `tenazas`).
- [ ] Con `horn=curvo` y export normal, generar set completo: `render=.renders` (sin `export=0`) para walk + frames attack 8/12/15.

### 2. Caparazón y élitros (+10–20 % tris ahí, no en patas)

- [ ] Aumentar segmentos en élitros / pronoto (`ell(..., seg, rings)`) manteniendo costura central `dark` legible.
- [ ] Reforzar línea de costura entre élitros (tubo/ell oscuro) para lectura a distancia lab.
- [ ] Verificar que el volumen quepa en caja **1.7 × 1.1 × 2.3** m tras `scale=1`.

### 3. Ojos y cabeza

- [ ] Ojos `Eye` lima, emisión ≥ 1.5 en script; tamaño legible en render 34°.
- [ ] Cabeza/cuerno: contraste `Dark` vs caparazón sin depender de metal en `Body`.

### 4. Animación

- [ ] `walk`: mantener ciclo 32 cuadros / muestreo cada 2; comprobar que no hay pop entre 32 y 0.
- [ ] `attack`: que el arco **12 → 15** se lea en el tercio inicial del clip horneado (coherencia con `hit=0.33`).
- [ ] **No** cambiar nombres de acciones ni pasar a `clips` (solo jefes usan `clips` en `GLB`).

### 5. Export y publicación

- [ ] Tras geometría, regenerar siempre con el script (no export manual distinto de `bicho.export`).
- [ ] Confirmar en consola Blender: `TRIS` y `BONES` impresos al final.
- [ ] `npx gltf-transform inspect public/models/escarabajo.glb` sin errores; sin meshopt/draco.

### 6. Entregable agente

- [ ] `public/models/escarabajo.glb` actualizado.
- [ ] `assets-src/escarabajo/escarabajo.blend` + `escarabajo_raw.glb` coherentes con el GLB publicado.
- [ ] Nota breve: tris antes/después, `horn` elegido, capturas `.renders/` o PNG clave (34°, attack_embiste).
- [ ] Si hace falta cambiar `atk`/`hit`/`scale`/`eye`: **solo proponer** al integrador con captura de frame; no editar `glb.ts`.

---

## Scripts de validación (agente)

Ejecutar desde la **raíz del repo** tras cambios de malla.

### Regenerar artefactos

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/escarabajo/escarabajo.py
```

Variantes útiles:

```bash
# Solo renders de cuerno, sin tocar GLB
/Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/escarabajo/escarabajo.py -- export=0 render=assets-src/escarabajo/.renders horn=tenazas

# Cuerno curvo + panel walk/attack (requiere export distinto de 0 o sin export=0)
/Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/escarabajo/escarabajo.py -- render=assets-src/escarabajo/.renders
```

### Inspección GLB (sin navegador)

```bash
npx gltf-transform inspect public/models/escarabajo.glb
```

Comprobar: 2 animaciones (`walk`, `attack`), quantization, **sin** `EXT_meshopt_compression` / `KHR_draco_mesh_compression`.

### Inspección blend (opcional, patrón hormiga)

Copiar localmente `assets-src/ant/inspect.py` a `assets-src/escarabajo/inspect.py` y ejecutar:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b assets-src/escarabajo/escarabajo.blend --python assets-src/escarabajo/inspect.py
```

Lista acciones, materiales y tris por objeto (útil antes/después del refinamiento).

### Validación en juego (integrador; referencia)

El agente **no** corre shots salvo que el orquestador lo pida explícitamente:

1. `pm2 restart rc-test`
2. `npm run build`
3. Consola sin `GLB escarabajo: no cargó`
4. Dev: `__glbStats.escarabajo` → `tris`, `bones`, `vatBytes` razonables
5. `npm run shots -- --only lab,bestiario` — fila con escarabajo

---

## Riesgos conocidos

| Riesgo | Mitigación |
|--------|------------|
| `Body` pierde metal en runtime | Silueta + `Dark`/`Legs`; o material no llamado `Body` para piezas que deban conservar color GLB (cuerno/patas ya usan `Dark`/`Legs`) |
| Aumentar tris en patas sin ganancia visual | Concentrar presupuesto en élitros/pronoto/cuerno |
| Desalinear embestida con daño | Ajustar keys `ATK` en `attack()`, no `hit` en `glb.ts` |
| VAT grande | Mantener solo huesos animados (`export_force_sampling=False`); no añadir huesos decorativos |

---

## Definición de hecho (este encargo)

- Checklist § refinamiento cumplido o justificado en nota de entrega.
- Pipeline Blender + `gltf-transform` ejecutado sin error; métricas tris/huesos documentadas.
- Rutas disjuntas respetadas; sin cambios en `src/`.
- GLB publicado en `public/models/escarabajo.glb` listo para integrador.
