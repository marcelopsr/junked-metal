# Junked Metal — producción de recursos Pixel Art 3D

La dirección nueva se produce por lotes. La entrega final es procedural: código y recetas con parámetros/semilla generan las texturas y mallas independientes. Los PNG de ImageGen se conservan solo como referencias conceptuales. Estos candidatos no se conectan al juego todavía.

## Referencias conceptuales (ImageGen; no son producción final)

- **01 — superficies y materiales:** 5 atlas conceptuales, 20 celdas.
- **02 — decals:** 1 atlas conceptual transparente con 8 propuestas.
- **03 — modelos:** seis hojas conceptuales para vehículos, criaturas y utilería.
- **04 — superficies individuales:** seis imágenes conceptuales de tierra, concreto, madera, metal, caucho y césped.

## Producción procedural

- **01 — materiales base (generador y primera salida):** seis texturas 128×128 independientes: tierra, concreto, madera, metal oxidado, caucho y césped. Recetas, semillas, paletas, PNG y checks en `assets-src/procedural-pixel-art/v1/`; revisión artística pendiente, sin integración.
- **02 — decals base (generador y primera salida):** ocho PNG RGBA independientes en `assets-src/procedural-pixel-art/v1/decals/`; alfa/determinismo comprobados, revisión artística pendiente.
- **03 — materiales restantes:** ladrillo, piedra, agua, plástico, vidrio, plantas/caparazón y mapas derivados; reciclar el mismo generador y añadir recetas.
- **04 — props patio/garaje:** caja, rampas, banco, herramientas, estantes y piezas faltantes; reusar modelos ya hechos de pallet, bidón, neumáticos, chapas y herrajes.
- **05 — vehículos:** 17 autos RC, ruedas, pilotos y personalización; preservar control, escala, colisiones y uso compartido con Carrera.
- **06 — criaturas:** 41 tipos activos entre insectos, máquinas, mascotas y jefes; conservar IA, contrato de animación, escala y colisión.
- **07 — patio y modos:** arquitectura, árboles/plantas volumétricos, herramientas, objetos rompibles y kits de zonas/Carrera/taller.

## Recursos 2D y presentación

- **07 — iconos y presentación:** retratos derivados de modelos aprobados, cartas de armas/evoluciones, intro y fondos compuestos por capas; conservar la estructura funcional del HUD.
- **08 — integración:** probar recetas aprobadas en escena 3D a resolución HD en PC y celular; revisar texel/UV, iluminación, contraste y costo antes de sustituir recursos activos.

## Rutas

- `pixel-art-3d-batch-01/` a `pixel-art-3d-batch-04-standalone-surfaces/`: referencias ImageGen; no son resultados finales procedurales.
- `assets-src/procedural-pixel-art/v1/`: lotes iniciales con generador determinista, seis materiales y ocho decals.
- `docs/PIXEL_ART_3D_PROCEDURAL_CATALOG.md`: cobertura de recetas por ID y familia para completar el inventario.
- `docs/PIXEL_ART_3D_ASSET_BIBLE.md`: dirección artística vigente, inventario por familia, formatos, nombres y flujo de aceptación.
- `docs/ASSET_INVENTORY.md`: inventario del arte actualmente activo e histórico.

Las referencias de ImageGen ayudan a calibrar la intención visual, pero los PNG finales y las mallas se deben producir desde las recetas reproducibles. Las hojas del lote 03 no son modelos ni texturas listas; los modelos requieren geometría/UV propios y validación con los contratos de animación y colisión existentes.
