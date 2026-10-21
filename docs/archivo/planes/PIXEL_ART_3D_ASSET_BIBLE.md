# Junked Metal — Biblia visual e inventario Pixel Art 3D

**Estado:** dirección aprobada para explorar el arte nuevo; recursos generados aún candidatos, sin sustituir assets activos.
**Inventario de código consultado:** 2026-10-14.
**Fuentes:** `docs/ART_DIRECTION.md`, `docs/ASSET_INVENTORY.md`, `src/car.ts`, `src/enemies.ts`, `src/pilots.ts`, `src/weapons/base.ts`, `src/weapons/passives.ts`, `src/world.ts`, `src/zones/`, `src/kart.ts`, `src/duel.ts`, `src/match3*.ts` y `public/images/`.

Esta guía reemplaza como referencia vigente de arte visual a la dirección Folded 2.5D descrita en los documentos históricos. Folded puede seguir existiendo como técnica o familia de assets si sirve a una pieza; no es requisito de la dirección nueva.

## 1. Dirección artística vigente

### Definición

**Pixel art 3D HD:** un mundo tridimensional jugable, con modelos de volumen real y lectura a 360°, cuyas superficies y detalles usan grupos de píxeles visibles, bordes escalonados deliberados y paletas limitadas. La imagen de referencia principal es la tierra marrón con terrones, hojas naranja y briznas secas; las hojas previas de props, vehículos y enemigos fijan el volumen y el desgaste.

- El mundo, los autos, enemigos y props son mallas 3D; no representar el escenario completo con sprites planos ni con una cámara 2.5D.
- La identidad pixelada vive en la geometría, los UV y las texturas. La resolución final de pantalla puede ser HD; no se debe emborronar ni forzar una baja resolución global para simular el estilo.
- Diseñar en este orden: silueta legible → volumen → material → masas de color → agrupaciones pixeladas → desgaste y detalle.
- Usar formas low-poly con biseles controlados, planos de superficie claros y piezas separadas cuando ayuden a leer fabricación, articulación o daño.
- El desgaste cuenta el uso: pintura saltada en bordes, óxido en uniones, polvo en zonas bajas, grasa cerca de motores y marcas de contacto en ruedas y herramientas.
- La referencia es lúdica y artesanal, no terrorífica ni fotorrealista. Los errores generativos se corrigen o se descartan; no se normalizan como diseño.

### Paleta y luz

- Base del patio: tierra marrón oscura, terrones cálidos, naranja óxido y hojas secas; verdes oliva para césped y plantas; madera miel gastada; concreto gris cálido.
- Los colores de identidad del juego siguen siendo acentos legibles: amarillo/naranja de taller, cian/verde para señales aliadas y tonos propios para armas. El rojo conserva lectura de amenaza según la guía de gameplay vigente.
- Los mundos especiales pueden sumar color propio —agua azul verdosa, juguetes de colores, luna fría— sin perder el contraste de pixel clusters y materiales usados.
- Mantener la hora, clima, cámara y legibilidad de cada modo existentes. La nueva dirección cambia el tratamiento visual de los recursos; no prescribe cambiar reglas de juego ni todos los climas a una sola iluminación.
- Albedo/base color sin luz horneada, sombras proyectadas ni reflejos falsos. La forma y la iluminación real del juego producen el volumen.

### Materiales y resolución

- Crear un PNG fuente independiente por superficie, mapa, decal o pieza ilustrada; no agrupar piezas en hojas de contacto cuando el destino sea un asset autónomo.
- Para mapas tileables, generar superficie top-down sin perspectiva ni motivo central; comprobar bordes antes de marcarlos como repetibles.
- Entregar base color opaco, normal, roughness y metalness cuando corresponda. Plantas, decals y piezas recortadas llevan alfa solo si el uso lo necesita.
- Conservar el PNG fuente en `assets-src/generated/AAAA-MM-DD/pixel-art-3d-batch-NN-*/`. Derivados WebP/PNG comprimidos van a una futura carpeta de integración tras revisar cada candidato.
- Generar detalle con tamaño de cluster coherente y mantener texturas de runtime dentro del presupuesto actual del juego (por defecto 256 px; techo configurable 512 px). Las fuentes de alta resolución sirven de máster: no implican usar 1K en cada objeto del móvil.
- Aplicar filtrado nearest o controlado para preservar clusters. Validar UV, repetición, mipmaps, aliasing, lectura a distancia normal y consumo en PC/celular.

### Producción procedural (regla de entrega)

Los archivos finales deben poder regenerarse localmente desde código y datos versionados. Un PNG final puede ser la textura que carga el juego, pero se considera **salida compilada**, no fuente: su fuente es una receta procedural con generador, parámetros, paleta, semilla y validaciones. Para geometría, la receta construye mallas voxel/low-poly paramétricas y sus materiales; el PNG de referencia no sustituye a esa malla.

- ImageGen se usa solo como referencia conceptual de color, desgaste, densidad de píxel o silueta. No es fuente canónica ni el método de entrega de los recursos de producción.
- Reusar primero los generadores existentes: `assets-src/procedural-textures/v1/` para el patrón determinista PNG compartido con runtime; `assets-src/procedural-props/v1/`, `assets-src/smoothvoxels/`, `assets-src/magicavoxel/`, `assets-src/cars/` y `src/kit3d.ts` para props y modelos. No alterar los assets Folded existentes: crear versiones Pixel Art 3D junto a ellos.
- Cada receta registra `id`, `generator`, `version`, `seed`, `parameters`, `palette`, `outputs`, dimensiones/escala y checks. Misma versión + parámetros + semilla debe producir los mismos bytes.
- La receta genera los PNG/mapas y, cuando aplique, la geometría 3D de forma independiente por ID. Las hojas de contacto son vistas de revisión derivadas; nunca son entradas del juego.
- Validar dimensiones, alfa, repetición de bordes, colores permitidos, topología/escala y determinismo según el tipo de recurso. Las costuras se comprueban en ambos ejes antes de declarar una superficie tileable.
- Mapas PBR auxiliares también se derivan del generador/datos de material o de una regla documentada; no se inventan como mapas calibrados a partir de una imagen de referencia.

El patrón procedural ya existe en `assets-src/procedural-textures/v1/` y en generadores de props/vehículos. Este inventario extiende ese flujo a la dirección nueva sin reemplazar activos en uso hasta validar una integración concreta.

### Interfaz y texto

- Conservar la estructura, accesibilidad, texto neutro en español y sistema de iconos SVG propio mientras se evalúa la nueva dirección.
- No generar texto funcional dentro de imágenes. Los rótulos, marcas y lettering se componen como texto editable o arte vectorial verificado.
- Sin emojis, iconos genéricos, glassmorphism ni lettering ilegible de IA. Los assets decorativos deben apoyar al HUD, no tapar datos de telemetría.
- La dirección de los modelos no obliga a rehacer controles, layout, tipografía, contraste accesible ni navegación.

## 2. Estado y flujo de producción

| Estado | Significado |
|---|---|
| Inventariado | Existe en el juego y está localizado en código o archivos. |
| Falta | La dirección pixel art 3D necesita una propuesta para esta familia. |
| Generado | Receta fuente reproducible ejecutada; PNG/malla guardados y registrados, todavía pueden contener fallos. |
| Revisado | Silueta, paleta, transparencia o repetición inspeccionadas para el uso indicado. |
| Preparado | Derivados, dimensiones, compresión y convención de nombres validados. |
| Integrado | Se conectó al juego con UV/materiales correctos y se verificó en escena. |

Un asset solo avanza al siguiente estado con evidencia. Cada archivo debe incluir en el manifiesto: ID, nombre, categoría, formato, dimensiones, alfa, uso previsto, receta/generador y versión, semilla, parámetros, paleta, estado, archivo fuente y derivados. El prompt conceptual es opcional y solo referencia; nunca reemplaza la receta. Nunca sobreescribir el máster aprobado: crear versión nueva.

## 3. Inventario completo de familias

Los conteos de actores salen de los tipos activos del código; las cantidades de props y efectos describen familias visuales, ya que muchos se instancian o dibujan proceduralmente.

| Categoría | Qué contiene | Falta generar o reconstruir | Estado / ruta fuente |
|---|---|---|---|
| Materiales del mundo | Tierra, césped, concreto, madera, metal, ladrillo, roca, agua, caucho, plástico, hojas, vidrio y acabados de auto. | Generadores paramétricos por material, mapas complementarios derivados y variantes con semillas registradas; validar tiles y UV. | Hay PNG conceptuales en lotes 01/04, solo referencias. Base procedural existente: `assets-src/procedural-textures/v1/`, `src/render.ts`, `public/textures/`. |
| Decals y marcas | Aceite, huellas, hojas, barro, daño, óxido, advertencia, números, rayos, damero y marcas de carrera. | PNG separados con alfa, borde limpio y escala conocida; estados secos/mojados cuando aporten. | 8 salidas RGBA procedurales iniciales en `assets-src/procedural-pixel-art/v1/decals/`; revisión artística pendiente. También hay atlas conceptual y decals activos. |
| Patio y terreno exterior | Suelo, límites, casa, cerco, jardín, árboles, arbustos, rocas, charcos, plantas, autos reales, patio de chatarra. | Texturas faltantes y kit modular de piezas/props 3D independientes; no reconstruir el layout desde una sola ilustración. | Builders en `src/zones/patio.ts`, `src/zones/jardin.ts`, `src/zones/common.ts`. |
| Siete zonas interiores/temáticas | Patio, garaje, jardín, cocina, galpón, desván y pileta. | Kit de arquitectura, suelo, pared, muebles y utilería propia por zona; variaciones de clima compatibles. | `src/zones/{patio,garaje,jardin,cocina,galpon,desvan,pileta}.ts`. |
| Carrera | Circuito, asfalto, líneas, barreras, pórticos, cajas de objetos, tribunas, señalización, podio y arena. | Piezas 3D y texturas legibles en cámara rápida; conservar trazado, colisión y reglas. | `src/kart.ts`, `src/race.css`; parte procedural. |
| Demolición | Arena, obstáculos, vehículos/props destructibles, indicadores de choque y estados rotos. | Modelos o atlas de piezas intactas/rotas y materiales; conservar gameplay y colisiones. | `src/duel.ts`, `src/duel_build.ts`; consultar modo antes de asignar IDs. |
| Junket Crush | Gabinete, fichas, tablero y efectos de emparejamiento. | Variantes independientes por tipo de ficha, piezas del gabinete y adornos pixel 3D. | `src/match3_scene.ts`, `src/match3_draw.ts`, `src/match3_logic.ts`. |
| Props de patio/garaje | Cajas, bidones, pilas de neumáticos, rampas, tablas, herramientas, banco, estantes, macetas, manguera, regadera, gnomos, chatarra y destructibles. | Recetas de malla 3D paramétrica por pieza, materiales procedurales y colisión separada; referencias no son entregables finales. | Generadores en `assets-src/procedural-props/v1/`, `assets-src/smoothvoxels/`, `assets-src/magicavoxel/`, `src/kit3d.ts`, `src/zones/`, `src/world.ts`. |
| Vehículos jugables | 17 autos RC. | 17 referencias individuales (no atlas) y luego mallas/materiales por auto; partes intercambiables compatibles con Carrera. | IDs: `buggy`, `monster`, `formula`, `tanque`, `carrera`, `axel`, `helado`, `combi`, `hover`, `topadora`, `triciclo`, `murcielago`, `misterio`, `clasico`, `jeep`, `moto`, `monopatin`. `src/car.ts`, `src/models/cars.ts`. Hojas conceptuales lote 03. |
| Personalización de autos | 24 colores, 6 slots de partes, 3 acabados de chapa y 3 calcomanías HD; calco libre en grilla 16×16. | Una malla paramétrica por slot/opción compatible con anchors de cada auto; color/acabado/calco son parámetros y no duplican carrocerías. | `PARTS`, `PAINTS`, `GARAGE_FINISHES`, `GARAGE_DECALS`, `DECAL_N` en `src/models/cars.ts`; fuentes en `public/textures/paints/`, `public/images/decals/`. |
| Pilotos | 12 pilotos seleccionables, muñecos de juguete con formas y materiales propios. | Retratos pixel 3D homogéneos y referencias de modelo; mantener identidad y legibilidad de cada piloto. | IDs: `soldadito`, `muneca`, `robot`, `dino`, `figura`, `abuela`, `astronauta`, `dinogoma`, `rusa`, `pirata`, `caballero`, `bombero`. `src/pilots.ts`, `public/images/pilots/`. |
| Enemigos y jefes | 41 tipos activos: insectos, juguetes, criaturas lunares, mascotas y máquinas/jefes. | Referencia individual por ID, vistas útiles para modelado y luego mallas/rigs; usar animación y colisión existentes como contrato. | IDs: `hormiga`, `escupidora`, `friccion`, `robot`, `polilla`, `escarabajo`, `grillo`, `mosca`, `babosa`, `fuego`, `cohete`, `enjambre`, `tirador`, `saltador`, `emboscador`, `flotante`, `tanque`, `explosivo`, `curandero`, `kamikaze`, `escudo`, `brincador`, `francotirador`, `divisor`, `cria`, `ladron`, `rey`, `cortadora`, `tarantula`, `perro`, `gato`, `aspiradora`, `proyector`, `payaso`, `muneco`, `limpiafondos`, `falso`, `grua`, `gusano`, `cortacercos`, `caja`. `src/enemies.ts`, `src/models/enemies.ts`, `public/models/`, `assets-src/`. Hojas conceptuales lote 03. |
| Retratos de bestiario/jefes | Fichas ilustradas de criaturas y bosses. | Completar el roster y homogeneizar encuadre, fondo, luz y lectura por tamaño de tarjeta. | `BEAST_PORTRAITS`, `public/images/beasts/`, `public/images/bosses/`; verificar cobertura real antes de generar duplicados. |
| Armas y fusiones | 36 armas base y 5 fusiones (41 IDs en `WEAPONS`). | Icono/ilustración de cada arma y referencia de sus proyectiles/forma evolucionada; separar arma, projectile y FX. | IDs fuente en `src/weapons/base.ts`; módulos en `src/weapons/`; imágenes actuales en `public/images/evolutions/`. |
| Pasivas y taller | 15 pasivas: `iman`, `resorte`, `turbo`, `litio`, `capacitor`, `lego`, `lupa`, `cinta`, `pila`, `escape`, `llavero`, `paragolpes`, `antena`, `bidon`, `llamas`. | Iconos/props independientes en pixel art 3D y estados de nivel solo si cambia visualmente el objeto. | `src/weapons/passives.ts`, `src/menu.ts`, `public/images/`. |
| VFX de combate | Impactos, chispas, fuego, agua, humo, explosiones, ondas, líneas, proyectiles, daño, muerte y destrucción. | Catálogo por material y arma: sprites/atlases transparentes o mallas instanciadas; mantener color de equipo, lectura y opción de reducir parpadeos. | `src/fx.ts`, `src/weapons/`, efectos en código y pools existentes. |
| Recompensas y señales | Gemas/XP, tornillos, curación, pilas, imanes, avisos, marcadores de jefe, telemetría y feedback de daño. | Verificar qué piezas necesitan nuevo arte; mantener tamaños, contraste, accesibilidad y rendimiento. | `src/ui.ts`, `src/icons.ts`, `src/menu.ts`, `src/fx.ts`; SVG sigue siendo válido para símbolos funcionales. |
| Presentación | Logo, intro de cuatro cuadros, fondos de menú/taller/créditos/bestiario, polaroid de resultados y carteles. | Obras independientes por pantalla o cuadro, sin texto horneado salvo lettering verificado; mantener narrativa existente. | `src/intro.ts`, `src/replay.ts`, `src/menuscene.ts`, `public/images/`. |

### Listas fuente exactas

- **Armas base (36):** gomitas, clips, chispero, petardos, tesla, lanza, agua, yoyo, bengalas, regla, helado, bocina, trompo, tuercas, bobinas, ventilador, canicas, burbujas, matamoscas, dardos, chapitas, paraguas, cohete, serpentinas, tambor, domino, avioncito, pintura, bumeran, confeti, lupasolar, dron, lapices, jabon, teledirigido, imanchatarra.
- **Fusiones (5):** chispazo, globos, anillo, yoyoelec, vapor.
- **Pilotos:** consultar la lista exacta en la fila de Pilotos. El portrait de `figura` reutiliza actualmente la imagen `novato`.
- **Props prioritarios:** cajas, bidones, neumáticos, tablas/cerco, rampas, herramientas, banco, estantes, macetas, plantas, manguera, regadera, gnomos, auto real, pelota, elementos de pileta, muebles de cocina/galpón/desván, chatarra destructible, barreras/carteles/podio de carrera y piezas del gabinete Match-3.
- **Cobertura procedural detallada:** [PIXEL_ART_3D_PROCEDURAL_CATALOG.md](./PIXEL_ART_3D_PROCEDURAL_CATALOG.md) define receta común, asignación por ID, personalización, materiales, UI/VFX y secuencia de lotes. Es diseño rastreable; consulta sus estados antes de llamar generado/revisado/integrado a un output.

## 4. Lotes de generación y orden de trabajo

Cada lote entrega fuentes procedurales ejecutables y sus recursos resultantes independientes. Una hoja de contacto puede servir como guía de revisión, pero nunca cuenta como asset, fuente ni entrada del juego.

| Lote | Familia | Estado | Salida independiente prevista |
|---|---|---|---|
| 01 | Referencias conceptuales de superficies, props, criaturas y vehículos | Referencia generada | Atlas ImageGen existentes; no son fuentes reproducibles ni recursos finales. |
| 02 | Referencias conceptuales de decals | Referencia generada | Atlas ImageGen; reconstruir los decals aprobados en recetas vectoriales/pixel procedurales independientes. |
| 03 | Referencias conceptuales de modelos | Referencia generada | Hojas ImageGen; no son modelos, texturas listas ni fuente canónica. |
| 04 | Referencias de seis superficies | Referencia generada | PNG ImageGen existentes; no afirmar costuras, UV ni integración verificada. |
| 05 | Materiales base: tierra, concreto, madera, óxido, caucho y césped | Generador y outputs iniciales listos; revisión artística pendiente | Seis PNG 128×128 con receta/semilla/paletas, determinismo y bordes verificados. No integrados; faltan mapas PBR complementarios. |
| 06 | Decals: aceite, huellas, hojas, barro, chatarra, óxido, pintura saltada, hazard | Generador y outputs iniciales listos; revisión artística pendiente | Ocho PNG RGBA independientes con alfa/determinismo comprobados. No integrados. |
| 06 | Materiales faltantes y variantes | Pendiente | Ladrillo, roca, agua, plástico, pintura de juguete, follaje, caparazón, materiales lunares y mapas derivados. |
| 07 | Props de patio/garaje por pieza | Pendiente | Recetas de malla voxel/low-poly y materiales separados por ID; comenzar por caja, bidones y pila de neumáticos. |
| 08 | Kit de zonas y modos | Pendiente | Recetas de arquitectura/props por cada una de las siete zonas, Carrera, Demolición y Match-3. |
| 09 | Autos, pilotos, personalización y neumáticos | Referencias parciales | Modelos/materiales paramétricos para 17 autos, 12 pilotos y piezas con nombres estables. |
| 10 | Enemigos y jefes | Referencias parciales | Mallas paramétricas por 41 IDs, materiales, rigs/animaciones compatibles y retratos derivados. |
| 11 | Armas, fusiones, pasivas, pickups y VFX | Pendiente | Recetas de iconos/props/efectos separados para 41 armas, 15 pasivas y efectos esenciales. |
| 12 | Retratos, cartas y presentación | Parcial | Composición procedural/por capas desde modelos y mapas aprobados; verificar bestiario, pantallas, intro. |
| 13 | Diseño procedural completo del inventario | Definido en catálogo | Recetas asignadas por familia/ID; la definición no afirma generación de todas las salidas. |
| 14 | Integración y validación | Pendiente | UV, mapas, PC/celular, cámara real, texel, memoria y rendimiento antes de activar sustituciones. |

## 5. Nombres y estructura de archivos

```text
assets-src/procedural-pixel-art/v1/
  README.md
  manifest.json
  generate.mjs                 # código determinista de fuentes
  recipes/material-suelo.json  # parámetros, paleta, semilla y checks
  materials/material-suelo-basecolor.png  # salida compilada reproducible
  props/prop-barril-oxidado.glb             # salida de receta paramétrica
```

Convención de variantes: `-basecolor`, `-normal`, `-roughness`, `-metalness`, `-alpha`; conservar los IDs sin tildes que usa el código. Cada salida es independiente y su manifiesto apunta a la receta exacta, versión de generador, semilla y parámetros. Las fuentes y salidas compiladas no se escriben directamente en `public/` hasta pasar revisión e integración.

## 6. Lista de control para aceptar un recurso

1. Coincide con la referencia aprobada y la silueta/ID nombrado; la referencia no se incluye como fuente final.
2. No trae texto aleatorio, marcas de agua, bordes de collage, objetos extra ni elementos de otra celda.
3. Alfa real y borde limpio cuando se pidió transparencia; tile probado en 3×3 cuando se pidió repetición.
4. El píxel conserva escala consistente con el resto; las masas se leen a cámara de juego y en acercamiento.
5. La luz no está horneada en mapas que recibirán iluminación del juego.
6. La receta y la salida independiente están guardadas; manifiesto registra versión, semilla, parámetros, paleta, checks y estado.
7. La etapa de 3D revisa volumen 360°, UV, normal/roughness, rigs, animación y colisión según corresponda.
8. Capturas de juego en PC y celular confirman la lectura; revisar rendimiento después de cambios reales de escena.

## 7. Límites de este documento

Este inventario cubre recursos visuales; no incluye audio, reglas, balance ni cambios de layout. La dirección pixel art 3D ya está aprobada como objetivo visual, pero cada asset candidato requiere validación antes de reemplazar arte del juego. Mantener `docs/ASSET_INVENTORY.md` como registro histórico de la fase Folded y actualizar esta biblia cuando cambien IDs o se cierre un lote.
