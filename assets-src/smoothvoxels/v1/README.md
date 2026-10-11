# Smooth Voxels — recursos redondeados v1

Biblioteca experimental de modelos curvos para Junked Metal. Incluye la pila de neumáticos, maceta de terracota, lata de pintura RC, bidón oxidado y tres pelotas esféricas para el patio. Las pelotas se generan a 96³, pasan por Smooth Voxels (`lighting = smooth`, `deform = 8 0.8 0.7`) y usan una paleta mate por material.

- `generate_stack.py`, `generate_props.py` y `generate_spheres.py` regeneran las fuentes MagicaVoxel desde Python.
- Cada modelo conserva su `.vox` reproducible, `.svox` editable y GLB exportado desde Smooth Voxels Playground 2.4 en `sources/` y `exports/`.
- `props-preview.html` permite comparar maceta, lata y bidón; elegir cada pelota para inspeccionarla en Babylon y descargar sus GLB/fuentes.
- La pila de cubiertas Folded se compara con la versión Smooth Voxels en `../../magicavoxel/v1/comparison.html`.

Maceta y lata están pensadas como candidatas visuales para los objetos equivalentes de `src/world.ts`; el bidón amplía los props de ambientación. La pelota de fútbol permite comparar con `ball()`; tenis y playa son decoración nueva. Ningún archivo reemplaza todavía las mallas ni colisionadores activos. Las pelotas pesan cerca de 2 MB y rondan los 36 mil vértices cada una: hay que reducir geometría, definir colisiones y medir costo en móvil antes de integrarlas. Todo el paquete queda fuera del build y de las partidas.
