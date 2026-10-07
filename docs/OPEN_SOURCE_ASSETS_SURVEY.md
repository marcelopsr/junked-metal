# Survey de assets open source (glTF/GLB) — Junked Metal

Fecha: 2026-10-07 · Relacionado: [`VISUAL_MODELS_UPGRADE_PLAN.md`](./VISUAL_MODELS_UPGRADE_PLAN.md), [`ART_DIRECTION.md`](./ART_DIRECTION.md).

## Criterios de inclusión

| Criterio | Detalle |
|----------|---------|
| Licencia | **CC0** o equivalente que permita uso **comercial** y publicación web (GitHub Pages). Se excluyen CC-BY salvo nota explícita de “solo referencia de silueta”. |
| Estilo | Low-poly legible, saturación compatible con **Megabonk (día)**; emisivos de identidad según `ART_DIRECTION.md` § Identidad por emisivo. |
| Presupuesto de polígonos | Techo de equipo: **+10–20 %** sobre la plantilla actual o procedural equivalente; orientativo **500–8 000 tris** por minion, **3 000–12 000** por minijefe/jefe (VAT suma peso en textura, no en draw calls). |
| Formato | Preferencia **glTF/GLB**; FBX/OBJ aceptables si la conversión es directa en Blender. |
| Pipeline del juego | Enemigos con animación: esqueleto, **≤4 huesos/vértice**, materiales `Body` / `Eye*`, acciones nombradas (`walk`, `attack` o clips de jefe). Sin meshopt/draco en export final (`gltf-transform optimize --compress quantize`). |
| Colisión | Política **solo visual**: `DEF[kind].size` en `enemies.ts` **no cambia**; el mesh se escala y centra en Blender para encajar la caja de Havok. `GLB[kind].scale` en `glb.ts` solo se toca con revalidación documentada. |

### Escala vs `DEF.size` (metros del juego, orden `[ancho X, alto Y, largo Z]`)

| Id | `DEF.size` | Notas de encaje visual |
|----|------------|-------------------------|
| friccion | 0.9, 0.6, 1.6 | Juguete RC sin motor; largo ~1.6 m en Z; ruedas en el perímetro. |
| robot | 1.2, 1.7, 1.0 | Cuerpo alto (~1.7 m); compacto en Z. |
| polilla | 1.4, 0.5, 1.1 | Cuerpo bajo; alas aparte en runtime (`wingTemplate`). |
| rey | 6, 3.8, 8 | `scale` 3.5 en DEF; cuerpo + cuerno; 6 patas instanciadas (`LEGS.rey`). |
| tarantula | 6, 2.6, 6.5 | `scale` 3; 8 patas instanciadas; cefalotórax ancho. |
| cortadora | 7, 4.5, 6.4 | Plataforma ancha; asiento y volante legibles arriba. |
| aspiradora | 6.4, 1.6, 6.4 | Disco bajo (~1.6 m alto); diámetro ~6 m. |
| cortacercos | 3, 2.4, 9 | Mango + espada larga en Z (~9 m); motor naranja. |

---

## Fuentes generales (catálogo)

| Fuente | Licencia habitual | Enlace | Uso en Junked Metal |
|--------|-------------------|--------|---------------------|
| **Kenney** | CC0 | https://kenney.nl/assets | Juguetes, robots, vehículos, personajes blocky (pilotos). |
| **Quaternius** | CC0 | https://quaternius.com | Insectos, arañas, animales animados. |
| **OpenGameArt** | Varias (filtrar CC0) | https://opengameart.org | Hormiga base (`ant`), mariposas, herramientas. |
| **Poly Pizza** | CC0 en packs Quaternius/Kenney | https://poly.pizza | Descarga rápida de modelos sueltos glTF. |
| **itch.io (Kenney Assets)** | CC0 | https://kenney-assets.itch.io | Mirrors oficiales de kits Kenney. |
| **3dassets.dev** | CC0 (ver ficha) | https://3dassets.dev | Props modernos (aspiradora robot, kits). |
| **Sketchfab** | Filtrar **CC0** | https://sketchfab.com/search?features=downloadable&licenses=322a749bcfa841b29ded1ff418ddd01e | Piezas únicas; revisar triángulos y rig. |
| **KayKit (Kay Lousberg)** | CC0 | https://kaylousberg.itch.io | Herramientas y props low-poly (cortacercos parcial). |

---

## Por criatura procedural (8 enemigos)

Convención: **Top 3** = mejor encaje licencia + silueta + pipeline. “Adaptación” = renombrar materiales, reducir huesos, hornear VAT o separar alas/patas según `models.ts`.

### friccion — Autito a fricción

Silueta objetivo: cochecito de juguete naranja, parabrisas inclinado, **faros emisivos blancos** (`#fff4d0`), cuatro ruedas gordas.

| # | Asset | Licencia | Tris / estilo | Descarga | Notas |
|---|--------|----------|---------------|----------|-------|
| 1 | **Kenney Toy Car Kit** — vehículos tipo `vehicle-racer`, `vehicle-speedster` | CC0 | ~100–400 tris/modelo | https://kenney.nl/assets/toy-car-kit · https://opengameart.org/content/toy-car-kit | Escalar a ~1.6 m de largo; pintar naranja; añadir faros `Eye` o emisivo en material. Sin rig: animación de ruedas en código o mesh estático. |
| 2 | **Kenney Toy Car Kit** — `vehicle-monster-truck` (recortar carrocería) | CC0 | Bajo | Mismo pack | Silueta más “juguete”; recortar altura a ~0.6 m. |
| 3 | **Poly Pizza** — entradas sueltas del Toy Car Kit | CC0 | Low-poly | https://poly.pizza (buscar “Kenney toy car”) | Misma licencia; útil para probar un GLB antes del zip completo. |

**Escala:** encajar en caja 0.9 × 0.6 × 1.6 m; origen en suelo, +Z adelante.

---

### robot — Robot a cuerda

Silueta: lata roja, cabeza con **ojos amarillos** (`#facc15`), llave en la espalda, brazos de juguete.

| # | Asset | Licencia | Tris / estilo | Descarga | Notas |
|---|--------|----------|---------------|----------|-------|
| 1 | **Kenney Robot Pack** | CC0 | Low-poly | https://kenney.nl/assets/robot-pack | Variantes de robot toy; elegir cuerpo cilíndrico; materiales metal + emisivos ojos. |
| 2 | **Quaternius Easy Enemy Pack** — enemigos simples tipo “bot” | CC0 | Animado | https://quaternius.com · https://pressxp.com/p/quaternius-easy-enemy-pack | Si incluye humanoid/bot chico; revisar escala ~1.7 m alto. |
| 3 | **OpenGameArt — Low Poly Bug Robot** (VSG) | CC0 | ~970 tris, vertex color | https://opengameart.org/content/low-poly-bug-robot | Más “bicho mecánico” que cuerda; referencia de walk/charge si se retargeta a juguete. |

**Escala:** 1.2 × 1.7 × 1.0 m; llave y antena como mesh hijo o parte del GLB.

---

### polilla — Polilla

Silueta: cuerpo peludo beige, **alas separadas** (en juego: `wingTemplate` ×2), ojos **violeta emisivo** (`#c9a0ff`), antenas plumosas.

| # | Asset | Licencia | Tris / estilo | Descarga | Notas |
|---|--------|----------|---------------|----------|-------|
| 1 | **OpenGameArt — Butterfly (animated)** (CDmir) | CC0 | Low-poly, rig + aleteo | https://opengameart.org/content/butterfly-animated | Separar alas del tórax en Blender; cuerpo furriness con materiales `M.matte`; ojos emisivos. |
| 2 | **Quaternius Bee / Wasp** (referencia ala + abdomen) | CC0 | ~2–3k | https://poly.pizza/m/HvfIku26CK · https://poly.pizza/m/3aQgc75sUR | No es polilla; reutilizar alas y simplificar cuerpo. |
| 3 | **Quaternius Easy Enemy Pack** — insectos voladores | CC0 | Animado | Pack Easy Enemy | Abejas/avispas; adaptar paleta a beige/violeta. |

**Escala:** cuerpo 1.4 × 0.5 × 1.1 m; alas ~1.2 m de envergadura cada instancia.

---

### rey — Escarabajo rey (minijefe)

Silueta: **caparazón dorado metálico**, cuerno frontal, ojos lima; **6 patas** vía `legTemplate` (no obligatorio en un solo GLB).

| # | Asset | Licencia | Tris / estilo | Descarga | Notas |
|---|--------|----------|---------------|----------|-------|
| 1 | **Escarabajo in-game (`escarabajo`)** — variante de cuerno `curvo` en `escarabajo.py` | Ya en repo | VAT | `assets-src/escarabajo/` | Base más coherente que importar; escalar ×~3.5 y añadir corona/cuerno; patas pueden seguir instanciadas. |
| 2 | **Quaternius** — modelos escarabajo / insecto grande (packs animales o enemigos) | CC0 | Low-poly | https://quaternius.com/packs.html | Buscar escarabajo con horn; retopo a techo de tris. |
| 3 | **OpenGameArt — Low Poly Bug Robot** | CC0 | 970 tris | https://opengameart.org/content/low-poly-bug-robot | Solo como referencia de proporciones “jefe insecto”; sustituir por caparazón dorado. |

**Escala:** caja 6 × 3.8 × 8 m (con `DEF.scale` 3.5); cuerno hacia +Z.

---

### tarantula — Tarántula (minijefe)

Silueta: abdomen con banda, **8 patas** (`LEGS.tarantula`), ojos **rosa emisivo** (`#ff4fd8`), quelíceros.

| # | Asset | Licencia | Tris / estilo | Descarga | Notas |
|---|--------|----------|---------------|----------|-------|
| 1 | **Quaternius Spider** | CC0 | ~2.66k tris | https://poly.pizza/m/yRYJiAJyiM | Escalar a ~6 m de ancho; separar patas para `legTemplate` o rig de 8 piernas. |
| 2 | **Quaternius Easy Enemy Pack** — spider | CC0 | Animado | Easy Enemy Pack | Walk/attack listos; verificar licencia CC0 en zip. |
| 3 | **Sketchfab CC0** — búsqueda “low poly spider rigged” | CC0 (por modelo) | Variable | Filtro CC0 en Sketchfab | Validar huesos ≤4 infl. y renombrar `Body`/`Eye`. |

**Escala:** 6 × 2.6 × 6.5 m; patas largas (`LEGS.tarantula.len` 1.5).

---

### cortadora — Cortadora de césped (minijefe)

Silueta: plataforma gris, **cubierta roja**, volante, barra de corte; escala de jefe (~7 m ancho).

| # | Asset | Licencia | Tris / estilo | Descarga | Notas |
|---|--------|----------|---------------|----------|-------|
| 1 | **Kenney Toy Car Kit** — piezas de **track/chassis** + cubierta custom | CC0 | Muy bajo | https://kenney.nl/assets/toy-car-kit | Combinar base ancha + asiento; pintar rojo `#dc2626`. |
| 2 | **Poly by Google — Lawn mower** (referencia silueta; **CC-BY**, no shipping directo) | CC-BY | Low | https://poly.pizza/m/1pdSPagFCub | Solo bloqueo de proporciones; rehacer mesh CC0 o procedural. |
| 3 | **Kit modular Kenney / Survival** — mesas y estructuras como base | CC0 | Bajo | https://kenney.nl/assets/survival-kit | Plataforma + volante desde primitivas; sin modelo de cortadora lista en CC0. |

**Escala:** 7 × 4.5 × 6.4 m; ruedas en esquinas.

**Nota:** No hay CC0 obvio de cortadora ride-on; oleada procedural + piezas Kenney suele ser más rápido que importar CC-BY.

---

### aspiradora — La aspiradora robot (jefe final)

Silueta: **disco** gris azulado, torreta, cepillos, sensores **rojos** (ataque enemigo).

| # | Asset | Licencia | Tris / estilo | Descarga | Notas |
|---|--------|----------|---------------|----------|-------|
| 1 | **3dassets.dev — Vacuum Bot** (Robots and Drones Kit) | CC0 | 608 tris, anim `spin` | https://3dassets.dev/assets/robots-and-drones-kit-vacuum-bot-0f99432d | Escalar de ~0.6 m a ~6.4 m diámetro; añadir torreta y cepillos; emisivos rojos. |
| 2 | **Kenney Robot Pack** — cuerpos disco/cúbicos | CC0 | Low | https://kenney.nl/assets/robot-pack | Combinar base circular + detalles. |
| 3 | **Quaternius** — drones / bots del pack Robots | CC0 | Variable | quaternius.com | Piezas modulares para torreta. |

**Escala:** 6.4 × 1.6 × 6.4 m; altura baja.

---

### cortacercos — Cortacercos eléctrico (jefe final)

Silueta: motor **naranja** `#e0a030`, espada dentada larga, mango en D, LED rojo.

| # | Asset | Licencia | Tris / estilo | Descarga | Notas |
|---|--------|----------|---------------|----------|-------|
| 1 | **OpenGameArt — Chainsaw** (loafbrr) | CC0 | ~5954 tris | https://opengameart.org/content/chainsaw-1 | Adaptar a cortacercos (espada más larga, mango D); FBX/Blend → GLB. |
| 2 | **KayKit RPG Tools Bits** — tijeras / herramientas de mano | CC0 | Low-poly | https://kaylousberg.itch.io/rpg-tools-bits | Mango y gatillo; espada custom. |
| 3 | **OpenGameArt — Tool Pack 1** (LonesomeDucky) | CC0 | ~1.6–2.2k tris/herramienta | https://opengameart.org/content/tool-pack-1 | GLB incluido; referencia de mango metálico. |

**Escala:** 3 × 2.4 × 9 m; espada a lo largo de +Z.

---

## Pilotos en el auto (opcional)

Referencias en `models.ts` (`pilotParts`: muneca, robot, dino, figura, soldadito). Objetivo: muñequito low-poly **sin texturas grandes**, legible en el techo del RC.

| # | Asset | Licencia | Tris / estilo | Descarga | Notas |
|---|--------|----------|---------------|----------|-------|
| 1 | **Kenney Blocky Characters** (18 skins, 27 anims) | CC0 | Low-poly voxel | https://kenney.nl/assets/blocky-characters · https://opengameart.org/content/blocky-characters | Escalar ~0.4 m alto; montar en `carModel` como mesh hijo (fuera de VAT). |
| 2 | **Kenney Animated Characters Survivors / Retro** | CC0 | Animado | https://kenney.nl/assets | Alternativa con más poses; verificar GLB en zip. |
| 3 | **Quaternius Ultimate Animated Animals** | CC0 | 12 animales | https://quaternius.com/packs/ultimateanimatedanimals.html | No humano; útil solo para “dino” o mascota en asiento trasero. |

---

## Criaturas ya en GLB (oleada 1 — no sustituir por survey salvo decisión)

| Id | Origen actual | Licencia |
|----|---------------|----------|
| hormiga | OpenGameArt ant (mujtaba-io) + `export_clean.py` | CC0 (`assets-src/ant/LICENSE.txt`) |
| escupidora, escarabajo, perro, gato | Procedural Blender (`bicho.py` / `cuadrupedo.py`) | Autoría del repo |

Detalle de refinamiento: [`VISUAL_MODELS_OLEADA1_GLB.md`](./VISUAL_MODELS_OLEADA1_GLB.md).

---

## Checklist antes de importar un GLB externo

1. Confirmar licencia en la página de descarga (captura o URL en commit de arte).
2. Blender: aplicar escala, apoyar en Y=0, cabeza hacia +Y (convención `glb.ts`).
3. Materiales `Body` y `Eye` (emisivo); colores alineados a `DEF[kind].color` y tabla de emisivos en `ART_DIRECTION.md`.
4. Rig: ≤4 huesos/vértice; acciones `walk`/`attack` o set de jefe documentado en `enemies.ts` (`SEQ` perro/gato).
5. Export: `gltf-transform optimize … --compress quantize` sin meshopt/draco.
6. Validar: `npm run build`, lab/bestiario (`npm run shots -- --only lab,bestiario`), `__glbStats` en dev.

---

## Estado

| Ítem | Estado |
|------|--------|
| Survey 8 procedurales + pilotos | **Listo** (este documento) |
| Sustitución masiva procedural → GLB | Pendiente de oleadas 2–4 según plan maestro |
