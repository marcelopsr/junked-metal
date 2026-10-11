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

La prueba comparativa del neumático actual y el candidato redondeado se abre en `http://localhost:5173/assets-src/magicavoxel/v1/comparison.html`; `evidence/comparison-pc.png` y `evidence/comparison-cel.png` registran la misma escena en Chromium headless. El candidato redondo se genera en `../../smoothvoxels/v1/` con Smooth Voxels; MagicaVoxel aporta otras referencias voxel, no define el acabado objetivo. Las cinco familias se abrieron e inspeccionaron en MagicaVoxel. Los diez `.vox` de semillas 17 y 41 se validan en formato, pero todavía no se exportaron como GLB.

## Regenerar y convertir

```sh
python3 assets-src/magicavoxel/v1/generate.py
python3 assets-src/magicavoxel/v1/verify.py
/opt/homebrew/bin/blender -b --python assets-src/magicavoxel/v1/convert_obj.py -- assets-src/magicavoxel/v1/exports/pallet-3.obj assets-src/magicavoxel/v1/exports/pallet-3.glb
```

Para editar una pieza, abrir el `.vox` correspondiente en MagicaVoxel. Exportar OBJ desde la sección Export de MagicaVoxel; conservar juntos OBJ, MTL y PNG. Después convertir ese OBJ a GLB con el comando de arriba, cambiando el nombre de familia. Mantener fuentes y salidas dentro de esta biblioteca.

Los modelos MagicaVoxel originales conservan una lectura cúbica y no son la dirección aprobada para los props que deban coincidir con Folded. El nuevo candidato Smooth Voxels tiene volumen redondo, pero aún es experimental, estático y pesado para móvil; requiere optimización y prueba de escala/cámara antes de integrarlo al juego.
