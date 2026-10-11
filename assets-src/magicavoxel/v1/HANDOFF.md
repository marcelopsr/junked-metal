# Handoff — MagicaVoxel assets v1

**Fecha:** 2026-10-10  
**Estado:** recursos experimentales generados e inspeccionados; integración al juego pendiente. Preferencia visual vigente: volúmenes 3D redondeados; no usar la silueta de cubos como acabado final.

- 15 fuentes `.vox` (pallet, neumáticos, bidón, chapas, herrajes; semillas 3, 17, 41).
- Cinco familias abiertas en MagicaVoxel. Se exportó desde la aplicación OBJ/MTL/PNG para una muestra por familia; Blender produjo cinco GLB con material y textura embebidos.
- `python3 assets-src/magicavoxel/v1/verify.py` confirma las 15 fuentes VOX v150 y cinco GLB. Conteo GLB: pallet 628, neumáticos 2.128, bidón 1.622, chapas 2.876 y herrajes 1.108 caras. Suma: 0,49 MB.
- Comparativa interactiva Folded vs Smooth Voxels (misma escena, cámara e iluminación): `comparison.html`; evidencia headless pc/cel: `evidence/comparison-pc.png` y `evidence/comparison-cel.png`. El candidato usa un aro toroidal de alta resolución y deformación Smooth Voxels. Biblioteca y fuente editable en `assets-src/smoothvoxels/v1/`.
- No hay cambios de gameplay ni archivos en `public/`. Los GLB son props estáticos: ajustar escala, comprobar día/móvil, optimizar si se instancian, y definir colisionadores antes de integrar objetos físicos.

## Continuar

1. Abrir variantes `.vox` en MagicaVoxel y exportar las semillas que se quieran incluir.
2. Convertir OBJ con `convert_obj.py` y verificar con `verify.py`.
3. Cualquier sesión autorizada puede elegir la siguiente familia/tanda; este directorio no queda reservado.
4. Antes de tocar el juego, revisar la compatibilidad visual con `docs/ART_DIRECTION.md` y producir una escena de prueba dentro del flujo existente.
