# Inventario de arte (Folded 2.5D, fase A) — 2026-10-07

Clases: **A** mantener · **B** nuevo material (FOLD) · **C** simplificar · **D** reconstruir Folded · **E** reemplazar por procedural-modular (geoKit) · **F** solo colisión.
Nada se borra: los `.blend` quedan para proporciones, colisión, esqueleto, animación y transición. Sistema base: `src/folded.ts` (+ paleta `PAL` en `src/kit3d.ts`).

## Criaturas y jefes (GLB con esqueleto → VAT, `src/glb.ts`; fuente en `assets-src/<id>/`)

| Asset | Origen | Archivo | Clase | Nota | Qué haría falta |
|---|---|---|---|---|---|
| Hormiga | GLB + VAT | public/models/ant.glb, assets-src/ant | D | Plaga base, se ve mucho y desde arriba | Placas de chapa sobre el esqueleto actual (tórax/abdomen plegados), material FOLD.painted, ojos emisivos; slice de fase B |
| Escupidora | GLB + VAT | escupidora.glb, assets-src/escupidora | D | Silueta buena | Caparazón en placas + boquilla de caño (geoKit.tube) |
| Escarabajo | GLB + VAT | escarabajo.glb, assets-src/escarabajo | D | Élitros = 2 placas curvas naturales | Élitros como paneles con remaches, bisagra visible |
| Rey (minijefe) | GLB + VAT + procedural (enemyTemplate) | rey.glb, models.ts | D | Mezcla M.metal esferas | Igual que escarabajo, más grande; corona de chapa |
| Tarántula | GLB + VAT | tarantula.glb | D | Patas largas = perfiles | Patas con perfiles en L y bisagras en articulaciones |
| Polilla | GLB cuerpo + alas procedurales (wingTemplate) | polilla.glb, models.ts:810 | D | Alas = plano inteligente válido | Alas como chapa fina con grosor y calcos; cuerpo en placas; slice de fase B |
| Fricción | GLB + VAT | friccion.glb, assets-src/proc2 | D | Juguete a cuerda | Cuerpo foldBox + llave de cuerda de perfil |
| Robot (jefe) | GLB + VAT | robot.glb | D | Ya es máquina: el más fácil | Paneles, rejillas, tornillos thin; locomoción/balance; slice de fase B |
| Cortadora (jefe) | GLB + procedural | cortadora.glb, models.ts | D | Máquina | Carcasa en paneles + calco hazard (TRIM.hazard) |
| Aspiradora (jefe) | GLB + VAT | aspiradora.glb | D | Máquina | Carcasa plegada, manguera tube, calco warning |
| Cortacercos (jefe) | GLB + VAT | cortacercos.glb | D | Máquina | Hoja de perfil + dientes thin |
| Perro / Gato (jefes) | GLB + clips | perro.glb, gato.glb | B | Mascotas reales, no chatarra | Solo material (pelaje no es chapa): mantener forma, ajustar a paleta |
| Patas articuladas | procedural | models.ts `legTemplate` | E | Cilindros sueltos | Perfiles + bisagras de geoKit |
| Telegrafía/sector/aura | procedural (alfa) | models.ts `teleTemplate`, `sectorTemplate`, `auraTemplate` | A | Indicadores de gameplay, planos válidos | Nada |
| Cables (jefes) | procedural | models.ts `cableTemplate` | A | Ya son tubos | Material FOLD.rubber |

## Vehículos

| Asset | Origen | Archivo | Clase | Nota | Qué haría falta |
|---|---|---|---|---|---|
| Autos jugables (buggy, monster, formula, carrera, combi, helado, axel, tanque) | GLB (`src/carGlb.ts`) con respaldo procedural `carModel()` | public/models/cars/*.glb, assets-src/cars/build_car.py, models.ts:247 | D | Juguetes RC de plástico pintado | Chasis/techo/laterales en paneles plegados con pestañas, ruedas `geoKit.wheel`, calcos número; slice: un auto |
| Ruedas | procedural instanciado | models.ts `wheel`/`wheelInst` | E | Cilindros | geoKit.wheel (banda de rodadura con volumen, tornillos thin) |
| Pilotos | procedural | models.ts `pilotParts` | C | Muy chicos en pantalla | Simplificar a 3-4 piezas, paleta PAL |
| Corredores de Carrera | `carModel` | kart.ts `makeRacers` | D | Mismos autos | Hereda el cambio de autos |
| Autos reales del patio (decorado) | procedural | world.ts `realCar` | D | Grandes, se ven de cerca | Paneles plegados + óxido (FOLD.painted wear 1) |

## Mundo y utilería

| Asset | Origen | Archivo | Clase | Nota | Qué haría falta |
|---|---|---|---|---|---|
| Suelos (pasto, tierra, baldosas) | canvas `TEX` | render.ts, world.ts `floor` | A | Fondo, se ve desde arriba | Nada (lectura) |
| Pasto | thin instances | world.ts `buildGrass`, `grassTuft` | A | Vegetación = billboards/cards válidos | Nada |
| Casa, árboles, arbustos | procedural | world.ts `house`, `tree`, `bushes` | B (casa hecha) | Fondo lejano | Casa actualizada con ladrillo cálido (`brick`), cornisas y marcos oscuros (ya no se funde con el cielo); árboles/arbustos se mantienen |
| Cajas para saltar | procedural | world.ts `jumpScrap` | B (hecho) | Ya usan FOLD.painted | Pasar a geoKit.foldBox |
| Pilas de cajas del garaje | procedural | world.ts `piles` | B (hecho) | FOLD.painted | geoKit.foldBox |
| Rampas, puente de tablones | procedural (madera) | world.ts `ramp`, `plankBridge`, `toyRamps` | B (hecho) | Colisión importante | Chapa con TRIM.hazard en el borde; F para el collider (no tocar) |
| Macetas, latas de pintura, herramientas gigantes, regadera, manguera, gnomos, pelota | procedural + Folded | world.ts `pots`, `paintCans`, `giantTools`, `wateringCan`, `hose`, `gnomes`, `ball` | E (hecho salvo pelota) | Props cercanos | Macetas (`potFold`), gnomos (`gnomeFold`), latas, herramientas, regadera y soporte de manguera migrados a Folded (`folded_slice.ts`) |
| Rocas | procedural | world.ts `rocks` | A | Naturales | Nada |
| Muros de ladrillo | procedural | world.ts `brickWalls` | A | Textura brick del kit ya compartida | Nada |
| Charcos, agua | procedural | world.ts `puddles`, `water` | A | Superficies | Nada |
| Rompibles | procedural | world.ts `hitBreakables` | D | Demolición | Romper en paneles/placas/tornillos (fase C) |
| Taller del menú (estantes, banco, transmisor) | procedural + KIT | menuscene.ts | B | Ya usa KIT/wornMat | Pasar a FOLD/geoKit cuando se toque |
| Utilería KIT (crate, barrel, toolbox, vise, cageLamp, pipe, plate, jar, sign) | procedural | kit3d.ts `KIT` | A | Base del lenguaje | Unificar con geoKit (foldBox en vez de crate) |
| Gabinete Junket Crush + taller | procedural (referencia) | match3_scene.ts | A | Implementación de referencia; ahora usa geoKit sin cambio visual | Nada |
| Circuito y arena de Carrera | procedural + Folded | kart.ts `buildTrack`, `buildArena`, `decorate` | C (hecho) | Cintas y público | Pórtico, rampas y labios con `TRIM.hazard`, vallas/tribunas/público con `FOLD.painted`/`FOLD.rust`, carteles de curva 3D y cajas `?` en `Rajdhani` |
| Podio | procedural | kart.ts `buildPodium` | E | Pieza única | foldBox escalonado |

## Efectos, materiales y texturas

| Asset | Origen | Archivo | Clase | Nota | Qué haría falta |
|---|---|---|---|---|---|
| Partículas (chispas, polvo, motas) | pool `ParticleSystem` | fx.ts | A | Billboards válidos | Nada |
| Restos / debris | instancias Folded | fx.ts `debris` | E (hecho) | Placas con tuerca | Placas de chapa pintada + tuerca de acero (`FOLD.painted` + `FOLD.bare()`) |
| Sombras de contacto | thin instances | fx.ts `contactShadows` | A (nuevo) | 1 draw call, 0 allocs | Disco suave bajo el auto y hasta 259 enemigos (escala atenuada por altura) |
| Marcas en el piso, manchas | thin/decal | fx.ts `mark`, `splat` | A | Decals | Podrían usar el atlas DECALS (mancha) |
| Lluvia | thin instances | fx.ts `tickRain` | A | | Nada |
| Materiales de juguete `M` | `pbr()` | render.ts | B | Plástico brillante con barniz | Migrar usos a FOLD por pieza |
| Shader retro, SnapPlugin, post | render.ts | render.ts | A | Pipeline común; FOLD ahora lo usa (`snapMat`) | Nada |
| Chapa gastada `wornTex` | canvas | kit3d.ts | A | Ahora con parámetro `wear` | Nada |
| Carteles `SIGNS`, marquesina, decal lateral, póster | canvas | kit3d.ts | A | Textos en inglés del mundo | Revisar póster bilingüe en `kit3d.ts:138` |
| Polaroid / intro | canvas 2D | replay.ts, intro.ts | A | UI 2D | Nada |
| Íconos UI + Bestiario | SVG | icons.ts | A (ampliado) | UI + `beastIcon` (13 bichos) | Nada |

## Estado 2026-10-08: Folded activo por defecto + Ciclo #1 completado

Migrado a Folded (`src/folded_slice.ts`, `src/world.ts`, `src/fx.ts`, `src/kart.ts`): hormiga, escupidora (×1,3), escarabajo (×1,6),
autito a fricción (×1,3), polilla, robot, rey, tarántula (+ patas `foldLeg` con rótula y bisagra), cortadora, aspiradora, cortacercos,
perro y gato (clips horneados con `procBake` y pasadores de cadera/hombro), los 8 autos de CARS (y Carrera), cerca, cajas, latas de
pintura, herramientas gigantes, regadera, macetas (`potFold`), gnomos (`gnomeFold`), soporte de manguera, autos reales del patio,
tablones (`woodM`), labio hazard de las rampas, restos (`debris` en placas con tuerca) y circuito/decorado de Carrera (`kart.ts`).

**Sin usar, sin borrar** (se pueden volver a mirar poniendo `FOLDED_SLICE = false` en src/folded.ts): `public/models/{ant,
escupidora,escarabajo,friccion,robot,rey,tarantula,cortadora,aspiradora,cortacercos,polilla,perro,gato}.glb`, `public/models/cars/*.glb`
(ya no se descargan), y los procedurales previos de models.ts (`enemyTemplate`, ramas de `carModel`, `articulatedLegMeshes`) y
world.ts (mallas que ahora son colisionador invisible). Fuentes `.blend` en assets-src/ intactas.

**Pendiente (sigue igual que antes):** pelota (`ball`), árboles, rompibles en piezas (`hitBreakables`, fase C), podio de Carrera,
taller del menú (`menuscene.ts`).

