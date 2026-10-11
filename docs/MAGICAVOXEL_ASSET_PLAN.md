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
- Prueba comparativa interactiva del stack Folded actual frente al GLB MagicaVoxel: `assets-src/magicavoxel/v1/comparison.html`; escena y cámara compartidas, escala aproximada para el mismo rango del patio. Captura Metal headless en `evidence/comparison.png`.
- Captura del modelo de neumáticos exportada desde MagicaVoxel: `assets-src/magicavoxel/v1/evidence/tires-3.png`.

## Límite de esta tanda

Los diez VOX de semillas 17 y 41 son fuentes editables, todavía no exportadas como GLB. No hay integración al juego, colisiones, animaciones, LOD ni prueba de rendimiento. El voxel art se ve deliberadamente más cuadriculado que la línea Folded del gameplay; la biblioteca queda aislada para poder juzgarlo antes de reemplazar utilería existente. Ver `assets-src/magicavoxel/v1/README.md` para editar, regenerar y convertir.
