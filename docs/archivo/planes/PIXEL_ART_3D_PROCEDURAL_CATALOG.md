# Catálogo procedural Pixel Art 3D — Junked Metal

**Versión:** 1 · **Fecha:** 2026-10-14
**Alcance:** diseño de recetas para todo el inventario visual; no significa que cada salida ya esté construida o integrada.
**Regla:** cada fila de entidad debe enlazar a una receta reproducible y a sus outputs antes de cambiar el estado a `generated`.

## Contrato de receta

Cada recurso se produce desde una fuente reproducible, sin imagen generativa en la ruta final:

```json
{
  "id": "car-buggy",
  "family": "vehicle",
  "generator": "assets-src/cars/build_car.py",
  "version": 1,
  "seed": 3101,
  "parameters": { "body": "short-wide", "wheelbase": 0.72, "wheelScale": 0.24 },
  "palette": ["#30221b", "#80583b", "#d27632", "#a7a397"],
  "outputs": ["model.glb", "basecolor.png", "normal.png", "orm.png"],
  "checks": ["finite mesh", "uvs", "same-seed hash", "pixel-cluster palette"]
}
```

- `seed` controla variaciones de desgaste, colocación de piezas y manchas; nunca cambia silueta/identidad ni balance.
- Dimensiones y pivotes provienen de contratos actuales de `CARS`, `DEF`, mundo y builders. Las recetas visuales no escriben colisiones ni alteran gameplay.
- Las texturas de superficies se guardan como PNG independiente; los modelos como GLB y, cuando exista una fuente editable, su `.blend`, `.vox` o `.svox` permanece al lado.
- Salidas de referencia ImageGen llevan `referenceOnly`; no satisfacen la cobertura generada. Manifiesto y estados distinguen `recipe-defined`, `generated`, `reviewed`, `integrated`.
- Mapas PBR: albedo por clusters de color; normal desde height/relieve generado; roughness/metalness por perfil de material. No hornear sombra, luz o AO albedo.

## Bibliotecas de recetas reutilizables

| Receta | Parámetros compartidos | Salidas | Uso |
|---|---|---|---|
| `surface-clusters` | tamaño, palette, escala de cluster, densidad, máscara por material, seed, tile | basecolor + normal derivada + roughness + metalness | Suelo, concreto, madera, metal, ladrillo, roca, agua, caucho, plástico, vidrio, caparazón, pintura y follaje |
| `pixel-decal` | silueta vectorial/pixel, seed de fragmentos, rotación, palette, alfa, escala física | PNG RGBA independiente + máscara | aceite, barro, huellas, hojas, daño, óxido, warning, carrera y zonas |
| `voxel-prop` | voxel resolution, dimensiones, piezas, bevel, palette, wear seed, pivot | GLB + source vox/recipe + collision proxy metadata | cajas, bidones, neumáticos, pallets, rampa, piezas de chatarra y props destructibles |
| `toy-vehicle` | base class, body profile, axle count, wheelbase, suspension, accessories, paint ID | GLB/materials + attachments contract | autos RC, enemigos con ruedas, autos reales como decorado |
| `toy-character` | rig family, body/head ratio, appendages, face mask, palette, pose | GLB + rig metadata + renders ortográficos | pilotos, juguetes enemigos, criaturas orgánicas |
| `modular-set` | module dimensions, material IDs, layout anchor, damage state | módulos GLB/mesh + material map | arquitectura/props por zona, circuito, arena y gabinete |
| `orthographic-card` | source model, pose, camera, backdrop, key light, crop, output size | PNG/WebP card independent + recipe | retratos, bestiario, pilotos, armas y presentación |
| `pooled-vfx` | family, material color, particle shape, lifetime, pool cap | pixel atlas or instanced 3D mesh recipe | impactos, proyectiles, fuego, humo, agua, explosiones y pickups |

Estas recetas son interfaces de diseño, no nuevos paquetes independientes: se implementan ampliando `assets-src/procedural-pixel-art/v1/`, `assets-src/procedural-props/v1/`, `assets-src/magicavoxel/v1/`, `assets-src/cars/` y plantillas runtime existentes. No crear un generador nuevo si uno existente cubre la salida.

## Catálogo de entidades

### Autos RC — 17

La clase define la geometría base; el ID define una variante de silueta, ruedas, accesorios y pintura. Base dimensional y física permanecen en `CARS`.

| ID | Clase de receta | Rasgos que deben distinguirlo |
|---|---|---|
| `buggy` | `toy-vehicle/rally-open` | cabina abierta, nariz corta, suspensión visible |
| `monster` | `toy-vehicle/monster` | ruedas sobredimensionadas y carrocería alta |
| `formula` | `toy-vehicle/formula` | nariz baja, alerón, ruedas expuestas |
| `tanque` | `toy-vehicle/tracked-armored` | casco pesado y tren de orugas/juguete |
| `carrera` | `toy-vehicle/rally-compact` | carrocería compacta, jaula y dorsal editable |
| `axel` | `toy-vehicle/motorcycle` | dos ruedas, cuadro y piloto montado |
| `helado` | `toy-vehicle/ice-cream-van` | furgón alto con toldo/conos decorativos |
| `combi` | `toy-vehicle/van` | techo elevado, ventanas y paneles laterales |
| `hover` | `toy-vehicle/hovercraft` | faldón y propulsores, sin ruedas dominantes |
| `topadora` | `toy-vehicle/bulldozer` | pala frontal y cabina protegida |
| `triciclo` | `toy-vehicle/tricycle` | una rueda delantera, dos traseras, caja de reparto |
| `murcielago` | `toy-vehicle/low-coupe` | perfil muy bajo, alerones angulares |
| `misterio` | `toy-vehicle/flower-van` | van redondeada, flores como piezas separadas |
| `clasico` | `toy-vehicle/vintage-coupe` | guardabarros separados y techo curvo |
| `jeep` | `toy-vehicle/open-jeep` | techo abierto, rueda de auxilio y faros |
| `moto` | `toy-vehicle/motorcycle` | moto estrecha, segundo perfil de ruedas/carenado |
| `monopatin` | `toy-vehicle/ride-on-board` | tabla, ruedas pequeñas y figura sobre plataforma |

**Cobertura existente:** `assets-src/cars/` incluye scripts de construcción para buggy, monster, formula, tanque, carrera, axel, helado y combi. Otros cinco IDs tienen modelos runtime y deben auditarse antes de producir reemplazos. Un script existente no prueba por sí mismo el acabado Pixel Art 3D ni la integración.

### Enemigos y jefes — 41

Los perfiles se parametrizan sobre el sistema de siluetas y attachments de `src/models/enemies.ts`; conservar `DEF.size`, animaciones/IA, target points, hitboxes y piezas conectadas.

| Perfil procedural | IDs |
|---|---|
| Insecto seis patas | `hormiga`, `escupidora`, `escarabajo`, `grillo`, `mosca`, `rey`, `tarantula` |
| Polilla alada | `polilla` |
| Babosa/segmentado | `babosa`, `gusano`, `divisor`, `cria` |
| Juguete con ruedas | `friccion`, `robot`, `cortadora`, `aspiradora`, `limpiafondos`, `cortacercos` |
| Juguete humanoide | `tirador`, `curandero`, `ladron`, `payaso`, `muneco`, `falso` |
| Criatura bípeda/saltadora | `saltador`, `emboscador`, `flotante`, `explosivo`, `kamikaze`, `brincador`, `francotirador` |
| Tanque/escudo pesado | `tanque`, `escudo` |
| Proyectil/criatura de fuego | `fuego`, `cohete`, `enjambre` |
| Mascota cuadrúpeda | `perro`, `gato` |
| Máquina/objeto jefe | `proyector`, `grua`, `caja` |

Cada ID incluye subreceta `silhouette`, `appendages`, `face-or-markings`, `materialIds`, `poseAnchors` y `portraitCamera`. El tipo `Alien` proviene de `src/aliens.ts`; al cambiar su roster, el catálogo debe actualizarse desde la unión `Kind` y los datos de enemigos. Las piezas animadas se exportan separadas o con rig según su contrato actual.

### Pilotos — 12

IDs: `soldadito`, `muneca`, `robot`, `dino`, `figura`, `abuela`, `astronauta`, `dinogoma`, `rusa`, `pirata`, `caballero`, `bombero`.

Receta común `toy-character`: escala chibi de juguete, cabeza/manos legibles, rig articulado o piezas parentadas y materiales tipo plástico/vinilo/tela. Subreceta por ID aporta casco/sombrero, ropa, rostro, accesorios y paleta. Silueta/identidad del piloto se conserva en auto y retrato. El catálogo de habilidades y estadísticas (`PILOTS`) no se altera.

### Armas y fusiones — 41

Arma visible, proyectil y efecto se registran como recursos separados; el mismo ID puede usar una pieza común con varios estados. No convertir VFX dinámicos en mallas únicas por instancia.

| ID | Clase procedural |
|---|---|
| `gomitas`, `clips`, `tuercas`, `chapitas` | `small-projectile / household-metal-or-rubber` |
| `chispero`, `petardos`, `bengalas`, `cohete` | `firework / ignition-and-smoke` |
| `tesla`, `bobinas`, `chispazo`, `yoyoelec` | `electric / coil-arcs` |
| `lanza`, `regla`, `lapices`, `dardos` | `thrown-school-object` |
| `agua`, `globos`, `burbujas`, `jabon`, `vapor` | `liquid / bubble / vapor` |
| `yoyo`, `trompo`, `bumeran`, `anillo` | `orbiting-returning-toy` |
| `helado`, `bocina`, `ventilador`, `matamoscas`, `paraguas`, `tambor` | `household-prop / radial-or-cone-effect` |
| `canicas`, `domino`, `serpentinas`, `confeti`, `avioncito`, `teledirigido` | `toy-projectile-or-trail` |
| `pintura` | `paint-can / floor-splat` |
| `lupasolar` | `lens-and-beam` |
| `dron` | `small-rc-drone` |
| `imanchatarra` | `scrap-magnet / pulse-ring` |
| `bumeran` | `returning-arc` |

Lista completa base (36): `gomitas`, `clips`, `chispero`, `petardos`, `tesla`, `lanza`, `agua`, `yoyo`, `bengalas`, `regla`, `helado`, `bocina`, `trompo`, `tuercas`, `bobinas`, `ventilador`, `canicas`, `burbujas`, `matamoscas`, `dardos`, `chapitas`, `paraguas`, `cohete`, `serpentinas`, `tambor`, `domino`, `avioncito`, `pintura`, `bumeran`, `confeti`, `lupasolar`, `dron`, `lapices`, `jabon`, `teledirigido`, `imanchatarra`. Fusiones: `chispazo`, `globos`, `anillo`, `yoyoelec`, `vapor`.

El catálogo usa IDs fuente, no el nombre comercial mostrado.

### Pasivas — 15

`iman` → imán de heladera; `resorte` → resorte; `turbo` → turbina/motor; `litio` → batería; `capacitor` → capacitor; `lego` → bloque paragolpes; `lupa` → lente; `cinta` → rollo de cinta; `pila` → batería recargable; `escape` → caño de escape; `llavero` → llavero/tuerca; `paragolpes` → defensa de goma; `antena` → antena; `bidon` → bidón auxiliar; `llamas` → calcomanía de fuego.

Receta `pickup-prop`: modelo independiente de 3D cuando el objeto aparece en campo; icono ortográfico a tamaño común para cartas/UI. Efectos estadísticos se quedan en `PASSIVES`.

### Personalización de autos

`toy-vehicle` produce una carrocería compatible con anchors (`ANCH`/`SPOT`) y slots. `PARTS` define las piezas separables; `PAINTS` usa 24 colores como parámetros de material. Acabados se generan como máscaras/materiales (`rust`, `cracked`, `mud`) y calcomanías como mapas RGBA independientes (`dorsal_07`, `flames`, `junkoil`) más el editor 16×16. Slots exactos:

| Slot | Opciones existentes | Parámetro procedural |
|---|---|---|
| `wing` | `serie`, `alto`, `doble` | perfil/altura y cantidad de planos |
| `decal` | `nada`, `numero`, `rayo`, `damero` | patrón editable, escala y color |
| `lamp` | `calido`, `ambar`, `cian`, `violeta` | lente/emisión; color desde paleta registrada |
| `exhaust` | `nada`, `doble`, `chimenea` | cantidad, forma y orientación de caños |
| `bumper` | `nada`, `cano`, `antivuelco`, `laterales` | protección modular con anchors por auto |
| `tires` | `serie`, `oruga`, `todoterreno`, `lisas`, `rayos` | banda, llanta y radio del perfil |
| `acc` | `nada`, `pelotita`, `bocina`, `matafuego`, `dados`, `banderita` | accesorio independiente en anchor |

También hay tres acabados (`finish:rust`, `finish:cracked`, `finish:mud`) y tres calcomanías HD (`decal:dorsal_07`, `decal:flames`, `decal:junkoil`). Exportar cada opción una sola vez; no crear 24×todas las combinaciones de carrocería.

### Props y kits ambientales

Los builders son autoridad de ubicación y cantidad. Este catálogo asigna recetas visuales modulares; la extracción de IDs concretos de cada builder se completa en el inventario de producción por zona, sin cambiar sus llamadas ni layout.

| Kit | Recursos que se diseñan proceduralmente | Receta |
|---|---|---|
| Patio | terreno/terrones, césped/hojas, cerco, casa, árbol/arbusto, roca, charco, auto real, cajas/bidones/chatarra | `surface-clusters` + `voxel-prop` + `modular-set` |
| Garaje | cemento/manchas, paredes, herramientas, banco, estantes, cajas, neumáticos, aceite, auto sobre caballetes | `surface-clusters` + `voxel-prop` |
| Jardín | canteros, surcos, suelo, hoja, tallos, flores, herramientas, cerco | `surface-clusters` + receta de follaje por silueta instanciable |
| Cocina | baldosa/suelo, alacena, mesa, silla, heladera, utensilios, paquetes y juguetes | `modular-set` + `voxel-prop` |
| Galpón | chapa, estructura, estantes, pallet, herrajes, herramientas, maquinaria y repuestos | `modular-set` + `voxel-prop` |
| Desván | madera, vigas, cajas, juguetes, muñeco/caja-jefe y telas | `modular-set` + `voxel-prop` |
| Pileta | agua, mosaico, borde, escalera, flotadores, filtros y limpiafondos | `surface-clusters` + `voxel-prop` |
| Carrera | pista, bordes, marcas, pórticos, barreras, cajas de objeto, podio y señalética vectorial | `modular-set` + `pixel-decal` |
| Demolición | arena, barreras, props/autos por estado intacto, impacto y piezas rotas | `modular-set` + `voxel-prop` + `pooled-vfx` |
| Junket Crush | gabinete, pantalla/tablero, fichas por tipo, marcos, botones, luces y feedback | `modular-set` + ficha paramétrica + `pooled-vfx` |

Props ya identificados como independientes: pallet, pila de neumáticos, bidón, chapas dobladas y herrajes; variaciones `.vox` de tres semillas en `assets-src/magicavoxel/v1/` y GLB/PBR de tres semillas en `assets-src/procedural-props/v1/`. Deben ser auditados por estilo/costo antes de declararlos equivalentes a los nuevos modelos Pixel Art 3D. La caja aún requiere receta/modelo independiente.

### Materiales y decals

| ID de superficie | Perfil de clusters | Propiedades derivadas |
|---|---|---|
| `soil-clods` | Terrones marrón oscuro grandes, sombras estrechas y hojas secas naranja/ocre | tile; normal suave; roughness alta; metal 0 |
| `garden-earth` | surcos de tierra, raíces pequeñas y residuos vegetales | tile con dirección controlada; roughness alta |
| `grass-dry-leaves` | masas verde oliva con hojas secas y tallos quebrados | albedo + alpha foliage cards cuando haya volumen |
| `concrete-gravel` | plano cemento cálido, grietas y gravas en clusters separados | tile; normal bajo/medio; roughness alta |
| `asphalt-track` | asfalto gris oscuro, caucho y marcas de carrera por decal | tile; roughness media |
| `weathered-wood` | vetas anchas, nudos y bordes saltados por tabla | albedo; normal derivada; roughness alta |
| `rusted-steel` | placas grandes de óxido, borde metálico y pintura saltada | normal; roughness variable; metalness por máscara |
| `tire-rubber` | bloque de banda de rodadura y flanco separado con letras no textuales | banda y flanco; roughness alta |
| `brick-plaster` | mampuesto irregular rojo tierra y revoque saltado | tiling; normal derivada |
| `stone` | rocas cálidas en grupos, cantos recortados y motas limitadas | tile o vertex color |
| `water-pool` | bandas de azules/verde petróleo pixelados; brillo lo pone luz runtime | basecolor + normal animada procedural |
| `toy-plastic-glass` | plástico colorido con borde pixelado; vidrio ahumado/translúcido en material | perfiles roughness/metalness separados |
| `chitin-fur` | caparazón segmentado para bichos y clusters de pelo para mascotas | material por familia anatómica |
| `rc-paint` | capas de color saturado, chips en borde y decal editable | color swatch + máscara de desgaste; variante por ID de pintura |

Decals RGBA individuales: `oil-splat`, `tire-skids`, `dry-leaf-cluster`, `mud-splatter`, `scrap-shards`, `rust-drips`, `chipped-paint-scuff`, `hazard-stripe`; añadir `crack`, `impact-dent`, `track-line`, `lane-number` y `warning-symbol` como vectores/píxeles dibujados por código, sin texto generado. Checks: canal alfa real, bbox útil, no light bake, variación por semilla cuando es orgánico y simetría exacta solo cuando el motivo lo requiere.

### UI, ilustración y VFX

- **Bestiario:** un retrato por cada ID que tenga ficha visible en `BEAST_PORTRAITS`; cámara ortográfica común, pose de lectura y fondo procedural de material. Modelo fuente se reutiliza; no generar retrato nuevo desconectado.
- **Pilotos:** doce iconos renderizados desde `toy-character`; conservar el mapeo actual `figura` ↔ recurso de retrato `novato` mientras se migra.
- **Armas/evoluciones:** 41 imágenes independientes desde la receta del objeto/proyectil; cada fusión muestra ambas siluetas fuente como una única composición legible. La imagen actual se audita antes de reemplazar.
- **Pasivas:** quince iconos generados desde `pickup-prop` o glyph pixel editable. SVG funcional existente continúa válido para el HUD.
- **Intro, menús y polaroid:** composición procedural por capas a partir de modelos, materiales y texto editable; conservar narrativa, lettering y estructura actual.
- **VFX:** pools existentes son fuente de instancias. Generar atlas/mesh base por familias fuego, eléctrico, agua/espuma, impacto metal/goma, polvo/barro, explosión y aura/onda; densidad y límite de partículas se mantienen.
- **Recompensas/señales:** gemas, tornillos, curación, pilas, imán, radar, avisos de jefe y daño usan geometría/iconos independientes y contraste accesible. No hornear texto ni modificar telemetría.

## Estados actuales y trabajo restante

| Estado | Cobertura comprobable |
|---|---|
| `recipe-defined` | Este catálogo define clases y mapeo de IDs de actores/armas/pasivas/zonas/modos; aún no es output visual de cada ID. |
| `generated` | Seis mapas basecolor en `assets-src/procedural-pixel-art/v1/`; quince GLB PBR de props en `assets-src/procedural-props/v1/`; fuentes VOX/GLB de props en `assets-src/magicavoxel/v1/`; scripts de ocho autos en `assets-src/cars/`. |
| `reviewed` | Solo existe evidencia localizada para los ciclos previos descritos en las carpetas de cada generador. Este catálogo no eleva automáticamente su estado. |
| `integrated` | Texturas runtime, modelos y builders actuales mantienen sus referencias existentes; no se afirma integración de los nuevos outputs Pixel Art 3D. |

## Secuencia de lotes para completar la lista

1. Cerrar seis superficies base: mejorar las recetas del prototipo hasta lectura comparable a referencia; generar normal/roughness/metalness; testear mosaic 3×3 y captures de material.
2. Completar materiales faltantes y ocho decals RGBA, cada uno con receta independiente y manifiesto.
3. Completar kit de props del patio/garaje, reutilizando pallets/neumáticos/bidones/chapas/herrajes y añadiendo caja, rampa, banco, herramientas, estantes, maceta, manguera y chatarra.
4. Completar kits modulares de siete zonas y tres modos, con un manifiesto por módulo referenciado desde los builders existentes.
5. Auditar 17 autos; reconstruir solo faltantes/materiales, uno por ID y variantes de seed verificadas.
6. Auditar 12 pilotos y generar variantes de cuerpo/piezas y retratos.
7. Auditar los 41 enemigos por cobertura de malla, material, rig/attachment y retrato; completar solo huecos.
8. Generar 41 armas, 15 pasivas, pickups y pools VFX a partir de familias compartidas.
9. Derivar imágenes de cartas, bestiario y presentación desde fuentes aprobadas.
10. Integrar por ciclo pequeño en escenas reales PC/celular; medir rendimiento después de cambios de escena.

**Este catálogo cierra el diseño y rastreo de recetas, no la producción completa de todos los archivos.** Cada lote posterior debe actualizar este documento y su manifiesto con outputs, hashes, captura y checks; mantener contratos de juego actuales.
