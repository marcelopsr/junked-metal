# Smooth Voxels — recursos redondeados v1

Biblioteca experimental de modelos curvos para Junked Metal. La pila de neumáticos de esta tanda ahora comparte carpeta con tres props del patio: maceta de terracota, lata de pintura RC y bidón oxidado. Las formas usan celdas de 0,25 unidades, superficie procesada por Smooth Voxels (`lighting = smooth`, `deform = 8 0.8 0.7`) y materiales mates.

- `generate_stack.py` y `generate_props.py` regeneran las fuentes MagicaVoxel desde Python.
- Cada prop conserva su `.vox` reproducible, `.svox` editable y GLB exportado desde Smooth Voxels Playground 2.4 en `sources/` y `exports/`.
- `props-preview.html` permite comparar los tres candidatos en Babylon y descargar sus GLB.
- La pila de cubiertas Folded se compara con la versión Smooth Voxels en `../../magicavoxel/v1/comparison.html`.

Maceta y lata están pensadas como candidatas visuales para los objetos equivalentes de `src/world.ts`; el bidón amplía los props de ambientación. Ningún archivo reemplaza todavía las mallas ni colisionadores activos. Los GLB pesan entre 0,47 y 1,05 MB; hay que reducir geometría, definir colisiones y medir costo en móvil antes de integrarlos. Todo el paquete queda fuera del build y de las partidas.
