# Utilería voxel — Junked Metal

Primera tanda de utilería voxel para el patio, el taller y la pista. Conserva los `.vox` como fuentes editables; cada familia incluye tres variaciones deterministas. La paleta toma los tonos de metal, óxido, pintura amarilla, madera y goma del proyecto.

| Familia | Recurso | Uso candidato |
|---|---|---|
| Pallet | Pallet de tablas con travesaños y clavos | Taller y rincones de patio |
| Neumáticos | Pila de neumáticos con tacos | Borde de pista y barreras visuales |
| Bidón | Tambor pintado, abollado y oxidado | Ambientación industrial |
| Chapas | Planchas apiladas, dobladas y con bordes gastados | Montones de chatarra |
| Herrajes | Tornillos, tuercas y arandelas | Primeros planos y banco de reparación |

`models/` contiene los quince `.vox` nativos. `exports/` incluye los cinco primeros GLB de prueba (`*-3`), OBJ/MTL/PNG exportados desde MagicaVoxel y la conversión reproducible desde OBJ a GLB con Blender. Cada GLB lleva textura y material embebidos; permanecen fuera de `public/` y todavía no están conectados a escenas o físicas activas.

La captura `evidence/tires-3.png` se guardó desde la vista de MagicaVoxel. Las cinco familias se abrieron e inspeccionaron en la aplicación. Los diez `.vox` de semillas 17 y 41 se validan en formato, pero todavía no se exportaron como GLB.

## Regenerar y convertir

```sh
python3 assets-src/magicavoxel/v1/generate.py
python3 assets-src/magicavoxel/v1/verify.py
/opt/homebrew/bin/blender -b --python assets-src/magicavoxel/v1/convert_obj.py -- assets-src/magicavoxel/v1/exports/pallet-3.obj assets-src/magicavoxel/v1/exports/pallet-3.glb
```

Para editar una pieza, abrir el `.vox` correspondiente en MagicaVoxel. Exportar OBJ desde la sección Export de MagicaVoxel; conservar juntos OBJ, MTL y PNG. Después convertir ese OBJ a GLB con el comando de arriba, cambiando el nombre de familia. Mantener fuentes y salidas dentro de esta biblioteca.

El estilo voxel es una lectura más gráfica que el Folded low-poly del gameplay actual. Estos modelos son props estáticos, sin colisionadores, animación ni LOD. Escala, distancia de cámara, color bajo la iluminación diurna y uso en móvil necesitan revisión antes de integrarlos al juego.
