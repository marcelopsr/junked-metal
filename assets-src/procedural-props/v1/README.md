# Props procedurales v1 — Junked Metal

2026-10-10. Cinco familias × tres semillas: **15 modelos 3D reales**, completos a 360°, con pivote en el suelo. Fuentes `props.blend` con imágenes empaquetadas, generador `build.py`, GLB autónomos con texturas embebidas y catálogo `assets.json`. Visor Babylon local: http://localhost:5173/assets-src/procedural-props/v1/index.html.

| Familia | Uso sobre lo actual | Nuevas posibilidades |
|---|---|---|
| Pallet envejecido | Patio, taller y garaje | Plataformas y apilamientos decorativos |
| Neumáticos apilados | Borde del circuito | Barreras y rincones de mantenimiento |
| Bidón abollado | Utilería del patio/taller | Sectores industriales y límites de arena |
| Chapas dobladas | Desorden de chatarra | Pilas de metal y revestimientos rotos |
| Tornillería | Banco de trabajo y base de props | Detalles de piezas y zonas de reparación |

Son props estáticos, no elementos de gameplay con colisiones. Complementan vegetación/cercas/luces ya producidas por Gemini, los materiales de `material-library/v1/` y los decals de `environment-library/v1/`. No reemplazan esas fuentes ni están aplicados a las partidas. No se publica esta biblioteca; está fuera de `public/` y del build normal.

## Regenerar y editar

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/procedural-props/v1/build.py -- seeds=3,17,41
node assets-src/procedural-props/v1/verify.mjs
```

El generador reutiliza `CarBuild` de `assets-src/cars/rc_common.py` y el color/material de `assets-src/bicho.py`; exporta solo en esta carpeta. Admite **tres semillas distintas** entre 0 y 2³²−1. Cambia tamaños, colocación, deformación y composición, conservando familias y cinco materiales comunes. El propio script compara geometría/topología recreada con igual semilla antes de exportar; el catálogo guarda una firma de geometría y el hash de cada GLB. No se promete un hash de archivo idéntico entre versiones de Blender.

Reejecutarlo reemplaza únicamente los recursos de esta versión. Para variantes que deban coexistir, copiar la carpeta como `v2/` y ejecutar allí, preservando `v1/`. No regenerar sobre una reserva activa o sobre fuentes editadas manualmente. En Blender, las colecciones agrupan las familias; se muestra inicialmente solo `pallet-3` para evitar objetos superpuestos. Desocultar/aislar una variante para editar; los objetos fuente mantienen su origen en el suelo.

## Materiales y datos técnicos

Quince PNG de **512 × 512**: albedo, normal y ORM para madera, goma, acero, óxido y pintura amarilla. Se generan numéricamente desde ruido interpolado, vetas, máscaras de óxido y gradientes; no son fotografías retocadas. El mapa normal representa microdetalle matemático, además del volumen de la geometría. Color en sRGB; normal/ORM como datos lineales. Los valores PNG se conservan en el búfer byte de Blender sin aplicar una conversión gamma adicional; el generador vuelve a leer un píxel de cada mapa y compara sus canales. En ORM, **R = 1** (sin oclusión horneada), G = rugosidad y B = metal; la máscara separa metal expuesto del óxido/pintura. No hay AO físico ni mapa de altura para desplazamiento.

Rango de la tanda: **524–6.032 triángulos** por variante, **53.796** en las quince; **19,84 MB de GLB** en total. Cada GLB contiene una malla Blender fusionada y entre una y tres primitivas por material. El importador puede exponer más de una malla por GLB; no asumir una draw call por prop. Los mapas embebidos se repiten entre exportaciones para que cada archivo sea independiente: compartir texturas/materiales al integrar, elegir solo variantes necesarias y comprimir para distribución si procede. El visor reutiliza los materiales por nombre; no demuestra rendimiento de multitudes ni de teléfono físico.

`assets.json` registra semillas, usos, dimensiones orientativas en metros `[x,y,z]`, pivote, vértices/triángulos, materiales, tamaño, hashes y estado. Ajustar escala al patio/auto del juego; no tratar las dimensiones artísticas como mediciones del mundo real. Conservar el eje Y arriba de glTF y el pivote sobre suelo.

## Integración por cualquier sesión del equipo

Reservar primero los archivos del banco o mundo que se modifiquen. Cargar los GLB seleccionados en un `AssetContainer`; compartir materiales y preparar instancias de las primitivas compatibles. Preservar semillas de layout, límites y física existentes. Los bidones/pallets no traen colisionadores; definirlos solo dentro de una integración autorizada, posicionando la malla antes de crear Havok. No incorporar fuentes Blender ni todas las variantes al arranque.

La implementación activa Folded no cambia por guardar estos GLB. Para integrarlos a distribución, copiar únicamente recursos elegidos a una carpeta pública versionada y usar rutas relativas compatibles con `base: './'`. Revisar ambas cámaras antes de ampliar el acabado. El visor usa hormigón existente como fondo y una sonda local de reflexión; su luz de evaluación no sustituye la del juego.

## Comprobación y límites

El verificador inspecciona los quince GLB: hashes, UV/normales, índices válidos, atributos finitos, mapas embebidos, pivote, geometría, material PBR y diferencia entre semillas. Luego abre un solo Chromium headless con GPU Metal y candado compartido, carga todas las variantes, prueba selección, día/noche, restablecer y captura cuatro ángulos de una variante por familia, además del conjunto en pc/cel. Evidencia en `evidence/`; navegador cerrado al terminar.

Sin rigs, animaciones, LOD ni integración física. Hardware y relieves finos requieren una versión simplificada para verse muy lejos; no se declaran optimizados para hordas. Repetición de mapas y desgaste uniforme pueden verse en primeros planos; no se afirma igualdad con la ilustración cinematográfica. Ver `HANDOFF.md` para resultados reales y reserva.
