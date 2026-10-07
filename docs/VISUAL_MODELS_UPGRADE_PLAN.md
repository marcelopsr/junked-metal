# Upgrade visual de modelos 3D — Plan maestro

Estado: **Aprobado (§8 cerrado 2026-10-07). Oleada 1: refinar 5 GLB en `assets-src/` en paralelo; procedurales y autos según §8; sin Fase 0 previa.**

Fecha: 2026-10-07 · Pedido: mejora visual de todos los modelos usados en juego con **oleadas paralelas multiagente**.

Referencias obligatorias: [`docs/ART_DIRECTION.md`](./ART_DIRECTION.md), [`CLAUDE.md`](../CLAUDE.md) (instancing, Havok, pruebas), contrato GLB en [`src/glb.ts`](../src/glb.ts).

---

## 1. Visión y límites

### Qué es
Subir la **calidad de silueta, materiales y lectura a distancia** de enemigos jugables, jefes y autos RC, manteniendo el pipeline actual (plantillas fusionadas + instancias; bichos con **VAT** en textura).

### Límites técnicos y de arte (no negociables sin decisión explícita)

| Límite | Fuente / motivo |
|--------|------------------|
| **Low-poly legible**, no bloques; sensación PSX moderna (píxel, dither, contornos suaves) | `ART_DIRECTION.md` § Sensación, Paleta |
| **Partidas de día** (Megabonk): colores saturados; emisivos de identidad por tipo (ojos, faros) | `ART_DIRECTION.md` § Giro a Megabonk, Identidad por emisivo |
| **Texturas procedurales ≤96 px, NEAREST**; PBR vía `pbr()` / `M.*` en `render.ts` | `ART_DIRECTION.md`, `render.ts` |
| **Un draw call por tipo**: `template()` → `InstancedMesh`; cientos de enemigos del mismo `Kind` | `models.ts`, `CLAUDE.md` |
| **GLB con esqueleto → VAT** (`glb.ts`): máx. 4 huesos/vértice, materiales `Body` / `Eye*`, sin meshopt/draco | `glb.ts` L6–25 |
| **Colisionador Havok** = `DEF[kind].size` en `enemies.ts`; **no mover el aggregate** después de crearlo | `enemies.ts`, `CLAUDE.md` trampas Havok |
| **Upgrade visual por defecto = solo malla/material**; cambiar `DEF.size` o `GLB.scale` exige revalidar IA, ataques y `sim` | Supuesto reversible hasta §8 |
| **Patas / alas aparte** donde ya existe: `legTemplate` + `LEGS` (rey, tarántula), `wingTemplate` (polilla) | `models.ts` L647–664, `enemies.ts` |
| **Rendimiento**: no multiplicar submallas por instancia; no romper thin-instance del pasto/props | `world.ts`, `perf` |

### Qué NO incluye (salvo que el usuario marque en §8)
- Rediseño de armas/proyectiles (`weapons.ts`, plantillas en `main.ts`).
- Props del patio (`world.ts`) salvo oleada opcional posterior.
- Pilotos (`pilotParts` en `models.ts`), menús (`menuscene.ts`), modo Demolición (`duel_build.ts` / GLB §36 GDD).
- Cambio de balance numérico (`balance.json`).
- Migración masiva a GLB de jefes que hoy son procedurales (es decisión de producto).

---

## 2. Inventario actual (fuente de verdad en código)

### 2.1 Enemigos (`Kind` en `enemies.ts`)

| Id | Rol | Visual | Animación | Colisión `DEF.size` [x,y,z] | Fuente principal |
|----|-----|--------|-----------|----------------------------|------------------|
| hormiga | Plaga | GLB `ant` | VAT walk/attack | 0.9, 0.6, 1.7 | `glb.ts`, `assets-src/ant/` |
| escupidora | Plaga | GLB `escupidora` | VAT + ataque propio | 1.1, 0.8, 2 | `glb.ts`, `assets-src/escupidora/` |
| escarabajo | Plaga | GLB `escarabajo` | VAT | 1.7, 1.1, 2.3 | `glb.ts`, `assets-src/escarabajo/` |
| friccion | Juguete | Procedural | Rígido (ruedas) | 0.9, 0.6, 1.6 | `models.ts` `enemyTemplate` |
| robot | Juguete | Procedural | Rígido | 1.2, 1.7, 1 | `models.ts` |
| polilla | Plaga | Procedural cuerpo | `wingTemplate` ×2 | 1.4, 0.5, 1.1 | `models.ts` |
| escarabajo (minion) | — | (mismo GLB que fila escarabajo) | VAT | — | — |
| rey | Minijefe | Procedural + 6 patas | `legTemplate` ×6 | 6, 3.8, 8 (`scale` 3.5) | `models.ts`, `LEGS.rey` |
| cortadora | Minijefe | Procedural | Rígido + `sectorTemplate` | 7, 4.5, 6.4 | `models.ts` |
| tarantula | Minijefe | Procedural + 8 patas | `legTemplate` ×8 | 6, 2.6, 6.5 (`scale` 3) | `models.ts`, `LEGS.tarantula` |
| perro | Jefe final | GLB `perro` | VAT clips (idle/walk/run/rage + jump/charge) | 3.2, 8, 8 | `glb.ts`, `assets-src/perro/`, `SEQ` |
| gato | Minijefe/jefe | GLB `gato` | VAT clips + jump/spin | 3.4, 3.6, 6.4 | `glb.ts`, `assets-src/gato/` |
| aspiradora | Jefe final | Procedural | Rígido + `nutTemplate` | 6.4, 1.6, 6.4 | `models.ts` |
| cortacercos | Jefe final | Procedural | Rígido + `cableTemplate` / `sectorTemplate` | 3, 2.4, 9 | `models.ts` |

Auxiliares de combate (misma oleada visual solo si §8 lo incluye): `teleTemplate`, `sectorTemplate`, `auraTemplate`, `cableTemplate`, `nutTemplate` (`models.ts` L666–710).

### 2.2 Autos jugador (`CarKind` / `CARS` en `car.ts`)

| Id | Nombre | Visual | Notas |
|----|--------|--------|--------|
| buggy | El Divorciado | `carModel()` procedural | Taller: alerón, calco, piezas `PARTS` |
| monster | El Loco Cuarentón | idem | Ruedas grandes |
| formula | El Apurado | idem | Baja silueta |
| tanque | El Suegro | idem | Torreta |
| carrera | El Sin Seguro | idem | Compacto |
| axel | El Sin Licencia | idem | 2 ruedas |
| helado | El Tío del Helado | idem | Camión helado |
| combi | El Tío Raro | idem | Van |

Todos comparten patrón: cuerpo fusionado + ruedas instanciadas (`wheelInst`), pintura `pbr`, sombras vía `shadowProxy` (`models.ts` L188+).

### 2.3 Pipeline GLB (resumen)

- Registro: `GLB` en `glb.ts` L26–32.
- Carga: `public/models/<file>.glb` (ruta relativa build `./`).
- Export: scripts en `assets-src/` (`export_clean.py`, `bicho.py`, `cuadrupedo.py`, carpetas por especie).
- Integración runtime: `Enemy` elige `glbTpl(kind) ?? enemyTemplate(kind)` (`enemies.ts` L111–116).

---

## 3. Fase 0 (opcional pero recomendada para paralelismo en código)

**Objetivo:** que oleadas procedurales no pisen `models.ts` en un solo diff.

| Tarea | Archivos nuevos | Integrador |
|-------|-----------------|------------|
| Extraer `enemyTemplate` por `kind` a `src/models/enemies/<kind>.ts` | 8–10 módulos | 1 agente: `models.ts` reexporta |
| Extraer `carModel` por `CarKind` a `src/models/cars/<kind>.ts` | 8 módulos | 1 agente: mantiene `ANCH`/`SPOT` |

**Criterio:** `tsc` + `npm test` sin cambio visual (`shots --diff` en escenarios lab/bestiario/garaje).

Si el usuario prefiere **no refactorizar**, las oleadas 2–4 procedurales van **secuenciales** (un agente por criatura, mismo archivo).

---

## 4. Oleadas paralelas (agentes)

Reglas de orquestación:
- **Paralelo** solo con carpetas/archivos **disjuntos**.
- Tras cada oleada: **un integrador** (`pm2 restart rc-test`, `tsc`, `npm test`, `build`, `shots`/`perf`/`sim` según §6).
- Perfil sugerido: **Sonnet medio** por criatura; **Sonnet alto** para perro/gato (clips + `SEQ`); **revisor** si toca `glb.ts` o `enemies.ts`.

### Oleada 1 — GLB de plaga y cuadrúpedos (5 agentes en paralelo)

| Agente | Ámbito (solo lectura/escritura) | Entregable |
|--------|----------------------------------|------------|
| 1 | `assets-src/ant/` → `public/models/ant.glb` | Hormiga: silueta, mandíbulas, ojos emisivos |
| 2 | `assets-src/escupidora/` | Saco ácido + walk/attack timing (`atk`/`hit` en `glb.ts`) |
| 3 | `assets-src/escarabajo/` | Caparazón lima, emisivo ojos |
| 4 | `assets-src/perro/` | Felipe: clips `jump_slam`, `charge`, walk/run speeds |
| 5 | `assets-src/gato/` | Eulalio: `jump`, `spin` |

**Integrador (secuencial):** verificar consola sin error `GLB … no cargó`, `glbStats` razonables, bestiario + lab con cada bicho; **no cambiar** `glb.ts` salvo `scale`/`eye`/`clips` documentados.

### Oleada 2 — Juguetes y plaga procedural ligera (2–3 agentes)

| Agente | Criatura | Archivo tras Fase 0 | Sin Fase 0 |
|--------|----------|---------------------|------------|
| A | friccion | `models/enemies/friccion.ts` | tramo `enemyTemplate` friccion |
| B | robot | `models/enemies/robot.ts` | tramo robot |
| C | polilla + alas | `models/enemies/polilla.ts` + `wingTemplate` | mismo bloque polilla/wing |

**Verificación:** `shots` escenario con fila de enemigos (`?lab`); polilla con aleteo visible.

### Oleada 3 — Minijefes procedurales (2 agentes + 1 secuencial si no hay Fase 0)

| Agente | Criatura | Extra |
|--------|----------|--------|
| A | rey + patas `LEGS.rey` | 6 patas instanciadas |
| B | tarantula + `LEGS.tarantula` | 8 patas, banda abdomen |
| C | cortadora | Opcional: mejorar `sectorTemplate` (solo si §8 incluye telemetría de ataque) |

Si un solo archivo: **orden rey → tarantula → cortadora** (un agente).

### Oleada 4 — Jefes finales procedurales + autos (paralelo tras Fase 0)

| Agente | Ámbito |
|--------|--------|
| A | aspiradora (+ tuerca si mismo agente) |
| B | cortacercos (+ cable si mismo agente) |
| C–J | autos `buggy`…`combi` (8 agentes, 1 por `CarKind`) |

**Verificación jefes:** `npm run sim -- --duel aspiradora,cortacercos,perro,gato --seeds 1,2` (donde aplique) + shots de jefe en lab (`?boss=`).

**Verificación autos:** `shots --only garaje` PC + cel; `perf --only partida` (draws estables ±20%).

---

## 5. Criterio de terminado por criatura

| Criterio | Cómo comprobar |
|----------|----------------|
| Silueta legible a distancia de juego (cámara partida / lab) | `npm run shots -- --only lab` (o escenario bestiario si existe); revisar `.shots/actual/` |
| Coherencia con `ART_DIRECTION` (emisivos correctos, sin rojo en jugador) | Revisión manual + Impeccable opcional (`impeccable context` en módulo bestiario/garaje) |
| Sin regresión de carga GLB | Consola limpia; `__glbStats` en dev |
| Colisión estable | Juego 30 s lab: enemigos no flotan ni hunden; jefes: embestidas/saltos alineados con anim (`SEQ` perro/gato) |
| Rendimiento | `npm run perf -- --only partida,partida_llena --vp pc` — draws/ms sin empeora >20% vs baseline guardado en `.perf/` |
| Balance / IA | `npm run sim -- --seeds 1,2,3 --secs 120` y duelos de jefe si toca el tipo |
| Regresión visual global | `npm run shots -- --diff` (tolerancia 1%; actualizar ref solo con aprobación) |

**Definition of Done oleada:** todos los ítems de la oleada cumplen la fila de su tipo + verificación mínima del integrador (`tsc`, `npm test`, `build`).

---

## 6. Verificación de tanda (integrador)

Orden recomendado (una pasada al final de la oleada):

1. `pm2 restart rc-test`
2. `npx tsc --noEmit -p .`
3. `npm test`
4. `npm run build`
5. `npm run shots -- --only lab,garaje,bestiario` (ajustar `--only` según escenarios en `scripts/scenarios.mjs`)
6. `npm run shots -- --diff` (duelo/lab jefes si hubo cambios de jefe)
7. `npm run perf -- --only partida --vp pc --frames 180` si la oleada tocó muchas mallas
8. `graphify update .` (hook en commit; el integrador tras commit)

---

## 7. Riesgos

| Riesgo | Detección | Mitigación |
|--------|-----------|------------|
| VAT bake falla o crece mucho (`vatBytes`) | `glbStats`, tiempo de carga en `loading.ts` | Reducir huesos animados; revisar `export_force_sampling` |
| Animación desincronizada (perro/gato) | Saltos/embestidas desfasados | Reajustar `SEQ` en `enemies.ts` con evidencia de cuadros Blender |
| Más triángulos → perf en móvil | `perf` vp cel si hay escenario | Mantener instancing; LOD solo si usuario aprueba |
| Cambio accidental de `DEF.size` | `sim` / choques raros | Política “solo visual” en §8 |
| Conflicto de merge en `models.ts` | CI local | Fase 0 o oleadas secuenciales |

---

## 8. Checklist para AskUserQuestion (cerrar antes de código)

Usar **hasta 4 preguntas × 4 opciones**; opción **(Recomendado)** primero. Marcar en este doc lo confirmado vs default del equipo.

### Decidido (toolbox 2026-10-07 — modelos)

| Pregunta | Elección |
|----------|----------|
| Fidelidad (≈ P3) | **Mismo low-poly, pulido** (+10–20 % tris, silueta legible). |
| Alcance criaturas | **Todos los enemigos aún sin paso Blender** (8 procedurales §2.1) **+** refinar/importar los **5 GLB** existentes (`assets-src/`). |
| Pipeline | **Mallas externas open source (glTF) o refinar GLB**; no solo código procedural. Catálogo: [`docs/OPEN_SOURCE_ASSETS_SURVEY.md`](./OPEN_SOURCE_ASSETS_SURVEY.md) (2026-10-07). |
| Verificación | **Impeccable** por criatura/oleada (+ shots lab/bestiario y perf según §6). |

| P4 colisión | **Solo visual** — `DEF.size` y `GLB.scale` fijos; modelo ajustado en Blender a la caja actual. |
| P5 paralelismo | **Oleada 1 GLB primero** — 5× `assets-src/` en paralelo **sin** split previo de `models.ts`. |
| P1 alcance extra | **Criaturas** (8 proc + 5 GLB) **+ 8 autos** (`carModel`) **+ muñequitos piloto** en auto (opción `pilot` / figura en `carModel`); **fuera:** armas/proyectiles, props `world.ts`, auxiliares tele/cable/tuerca salvo oleada dedicada. |
| P2 prioridad | **Oleada 1 GLB** → minions procedurales → minijefes/jefes → autos + pilotos (confirmado por P5). |
| P6 futuro GLB | **Default plan** — mantener split GLB/plaga vs toy procedural (sin subpregunta extra). |

### P1 — Alcance del upgrade (referencia)
- (Recomendado) **Solo criaturas jugables + 8 autos** (tablas §2.1–2.2).
- Incluir también **auxiliares de ataque** (tele, cable, tuerca, auras).
- Incluir **armas/proyectiles** visibles en partida.
- Incluir **props de patio** (`world.ts`) en oleada 5 aparte.

### P2 — Prioridad de oleadas (qué va primero)
- (Recomendado) **Oleada 1 GLB** (hormiga, escupidora, escarabajo, perro, gato) → luego minions procedurales → jefes → autos.
- **Autos primero** (identidad del jugador) → enemigos.
- **Jefes finales primero** (marketing / capturas).
- **Solo plaga** (hormiga + escupidora + escarabajo + friccion + robot + polilla) en v1.

### P3 — Fidelidad vs rendimiento
- (Recomendado) **Más silueta y materiales**, mismo conteo de instancias; +10–20% tris por plantilla como techo.
- **Cambio fuerte** (casi doblar detalle) aceptando revisar `maxAlive` / calidad gráfica.
- **Pulido ligero** (normales/emisivos/colores) sin cambiar topología.
- **Unificar estilo** migrando 1–2 jefes procedurales a GLB (elegir cuáles en subpregunta).

### P4 — Colisionadores y escala
- (Recomendado) **Solo geometría visual**; `DEF.size` y `GLB.scale` fijos; ajustar modelo en Blender a la caja existente.
- Permitir **ajuste fino de `GLB.scale`** con revalidación `sim` automática.
- Permitir **cambiar `DEF.size`** si mejora lectura (implica balance/IA).
- **Hitbox simplificado** separado del mesh (trabajo nuevo; fuera de MVP visual).

### P5 — Paralelismo y Fase 0
- (Recomendado) **Fase 0** (split `models.ts`) luego oleadas 2–4 en paralelo.
- **Sin refactor**: oleadas GLB en paralelo; procedural **secuencial**.
- **Máximo paralelismo**: Fase 0 + oleada 4 con 8 agentes de autos.
- **Mínimo agentes**: 1 agente por oleada completa.

### P6 — GLB vs procedural (futuro)
- (Recomendado) **Mantener split actual** (plaga/cuadrúpedos GLB; juguetes/jefes toy procedural).
- Planificar **tarántula o rey en GLB** en oleada futura.
- **No más GLB** hasta estabilizar perf de VAT.
- **Todo bicho con patas** a GLB a largo plazo (roadmap documental).

---

## 9. Estado y aprobación

| Campo | Valor |
|-------|--------|
| Aprobado por usuario | **Sí** (toolbox 2026-10-07) |
| Checklist §8 | **Cerrado** |
| Fase 0 (`models.ts`) | **Diferida** — no bloquea oleada 1 GLB; valorar antes de oleada 4 (8 autos en paralelo). |
| Próximo paso | **Oleada 1c + 2 cerradas** (`5b636a0`, `dc5f1e5`, `8156093`): 5 GLB esculpidos en `public/models/`, 8× `proc2/` en Blender (`OLEADA2_PROCEDURAL_BLENDER.md`), 8 hulls auto (`OLEADA2_CARS_BLENDER.md` / `carGlb.ts`). **Siguiente:** oleada **2b** — publicar `*_raw.glb` → `public/models/` + `glb.ts` para los 8 procedurales; piloto GLB; `shots --diff` con refs actualizadas. Inventario vivo: [`encargos/OLEADA2_BLENDER_ART.md`](./encargos/OLEADA2_BLENDER_ART.md). |

---

## 10. Referencias rápidas

- Encuesta OSS: [`OPEN_SOURCE_ASSETS_SURVEY.md`](./OPEN_SOURCE_ASSETS_SURVEY.md) (licencias, top 5, mapeo por `Kind`).
- Oleada 1 GLB (encargos A–E): [`VISUAL_MODELS_OLEADA1_GLB.md`](./VISUAL_MODELS_OLEADA1_GLB.md).
- Graphify: nodos `models.ts`, `glb.ts`, `enemyTemplate`, `carModel`, `template()` (`graphify query "procedural models enemies glb"`).
- Blender / export: `assets-src/README` implícito en comentarios de `glb.ts` y scripts por carpeta.
- Regresión duelo (no mezclar con supervivencia salvo shots globales): `npm run shots -- --only duel --diff`.
