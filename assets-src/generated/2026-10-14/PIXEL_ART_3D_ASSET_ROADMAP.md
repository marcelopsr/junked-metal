# Junked Metal — producción de recursos Pixel Art 3D

La dirección nueva se produce por lotes. Los lotes 01 y 02 son candidatos generados; no cambian la dirección activa ni se conectan al juego todavía.

## Lotes de materiales

- **01 — superficies:** 5 atlas, 20 celdas (patio, suelo, césped, huerta, ladrillo, concreto, metal, props, criaturas y autos). PNG original, celdas PNG 256 px y WebP lossless.
- **02 — decals:** 1 atlas transparente, 8 celdas (aceite, huellas, hojas, restos, óxido, pintura saltada, barro y hazard). PNG con alfa y WebP lossless de 256 px.

## Recursos 3D que deberán reconstruirse

- **03 — vehículos:** los 17 autos RC, ruedas y pilotos; crear UV y acabados usando el lote 01. Conservar control, escala, personalización, colisiones y uso compartido con Carrera.
- **04 — criaturas:** 41 tipos activos entre insectos, máquinas, mascotas y jefes; geometría nueva y sus mapas. Mantener IA, animaciones/rigs, escala de juego y colisión.
- **05 — patio y modos:** casa/garaje, árboles y plantas volumétricas, cajas, bidones, rampas, herramientas, auto real, objetos rompibles y escenografía de Carrera/taller. Mantener layout y física.

## Recursos 2D y presentación

- **06 — arte 2D:** retratos de bestiario, pilotos, cartas de armas/evoluciones, intro y fondos de menú que deban compartir la nueva dirección. HUD funcional conserva su estructura mientras se define qué piezas ilustradas reemplazar.
- **07 — presentación:** probar los recursos en escena 3D real a resolución HD en PC y celular, revisar texel/UV, iluminación, contraste y costo antes de sustituir recursos activos.

## Rutas

- `pixel-art-3d-batch-01/`: 20 materiales y hojas de contacto.
- `pixel-art-3d-batch-02-decals/`: 8 decals transparentes y hoja de contacto.
- `pixel-art-3d-batch-03-model-concepts/`: seis hojas de referencia para 17 autos, 41 tipos de enemigos y utilería del patio.
- `docs/ASSET_INVENTORY.md`: inventario del arte actualmente activo e histórico.

Los atlas y hojas están generados con OpenAI ImageGen. Las hojas del lote 03 son referencias visuales, no mallas ni texturas listas para producción; los modelos requerirán geometría/UV propios y validación con los contratos de animación y colisión existentes.
