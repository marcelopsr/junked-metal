# Smooth Voxels — pila redondeada v1

Prueba local de una pila de tres neumáticos para Junked Metal. La malla de entrada conserva la sección toroidal del modelo Folded actual, pero usa celdas de 0,25 unidades y no agrega tacos cúbicos. Smooth Voxels procesa esa superficie con `lighting = smooth`, `deform = 8 0.8 0.7` y rugosidad alta.

- `generate_stack.py` regenera `sources/folded-stack.vox` a partir del escritor MagicaVoxel del proyecto.
- `sources/folded-stack.svox` conserva la fuente editable y los ajustes de suavizado.
- `exports/folded-stack.glb` es la exportación GLB de Smooth Voxels Playground 2.4.
- La comparación con el modelo actual está en `../../magicavoxel/v1/comparison.html`.

Es un recurso experimental fuera del gameplay y del build. La exportación tiene unas 126 mil posiciones de vértice; antes de usarla en el juego habrá que reducir su geometría y medir su costo en móvil.
