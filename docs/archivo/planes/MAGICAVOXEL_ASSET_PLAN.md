# MagicaVoxel — plan y estado de la tanda

**2026-10-10.** El usuario pidió usar MagicaVoxel para producir los modelos de Junked Metal. Dirección: voxel art industrial y legible, con desgaste, madera, goma, metal y acentos de pintura amarilla; conservar volumen completo y revisar contra el Folded low-poly del gameplay antes de integrar.

## Entrega v1

- Cinco familias × tres semillas: pallet, neumáticos, bidón, chapas dobladas y herrajes; 15 fuentes `.vox` nativas.
- Abrir e inspeccionar las cinco familias en MagicaVoxel. Exportar una variante representativa por familia a OBJ desde la aplicación y pasarla a GLB con Blender para el motor Babylon.
- Mantener fuentes, exportes, captura, generador, verificador y handoff bajo `assets-src/magicavoxel/v1/`.
- No modificar `src/models.ts`, mundo, física, balance o distribución pública en esta prueba; los GLB quedan en la biblioteca local para revisión.

## Estado

- MagicaVoxel instalado desde el cask de Homebrew cuya descarga apunta al repositorio oficial Ephtracy y verifica SHA-256.
- Las cinco familias se abrieron y se revisaron visualmente en la aplicación. Su exportador generó los cinco OBJ, materiales MTL y PNG de paleta.
- Se convirtieron cinco variantes representativas (`*-3`) a GLB. Cada una conserva una malla, material y textura embebida; el lote suma menos de 0.5 MB.
- El verificador confirma 15 fuentes VOX v150 con dimensiones, voxels y paleta válidos, y cinco GLB con malla, material y textura.
- Prueba comparativa interactiva del stack Folded actual frente al GLB Smooth Voxels: `assets-src/magicavoxel/v1/comparison.html`; escena y cámara compartidas, escala aproximada para el mismo rango del patio. Capturas Metal headless en `evidence/comparison-pc.png` y `evidence/comparison-cel.png`.
- Captura del modelo de neumáticos exportada desde MagicaVoxel: `assets-src/magicavoxel/v1/evidence/tires-3.png`.
- Tras la corrección visual del usuario, se generó en `assets-src/smoothvoxels/v1/` una pila de neumáticos redondeada y se pasó por Smooth Voxels. La comparación actual muestra esa versión junto al aro Folded en PC y móvil; las formas cúbicas de MagicaVoxel quedan como fuente/estudio, no como acabado objetivo.

## Límite de esta tanda

Los diez VOX de semillas 17 y 41 son fuentes editables, todavía no exportadas como GLB. La pila redondeada tiene unas 126 mil posiciones de vértice y no está integrada al juego; reducir geometría y probar rendimiento en móvil son requisitos previos a usarla en partida. Ver `assets-src/magicavoxel/v1/README.md` y `assets-src/smoothvoxels/v1/README.md` para el flujo y sus límites.
