# Laboratorio de arte 3D (rama `exp/arte-3d`)

Rama experimental sin integrar, cerrada como worktree el 2026-10-21 (último commit `3764a02`, 2026-10-14; 264 archivos, +5891 líneas sobre master de entonces). Se conserva la rama; el worktree se borró (662 MB).

## Qué contiene

| Pieza | Dónde | Estado |
| --- | --- | --- |
| Laboratorio de estilos 3D: A actual, B chatarra pintada (rondas 2-3: escala gigante, forma chunky), C diorama, D nuevo, con capturas y métricas | `docs/`, `scratch/` de la rama | explorado, sin elegir |
| Kit voxel procedural: receta JSON → Blender → vengi → pases; arquetipos insecto y barril; auto perro v1-v3; visor `vox-lab` | `voxel/kit/`, `voxel/recetas/` | prototipo funcional |
| Hormiga y barril dibujados en grilla voxel (patas finas de 3 tramos, abdomen segmentado) con hoja antes/después | `voxel/` | prototipo |
| Payaso araña generado con TRELLIS 2 (GLB reducido, vistas y notas) | `assets-src/` de la rama | muestra |
| Estilo F macro realista: HDRI, PBR escaneado, modelos Poly Haven CC0, DOF/SSAO/ACES, preajuste celular y métricas | `src/` de la rama (render) | experimento, no compatible con el estilo vigente |
| Estilizador: script de Blender que lleva modelos CC0 al estilo Junked Metal (retinte, desgaste horneado, calcos, piezas propias), visor antes/después, 3 assets de prueba | `estilizador/` | herramienta usable |
| `matlib`: biblioteca de materiales escaneados triplanar para auto, bichos y props del estilo F | `src/` de la rama | experimento |
| Reglas y skills de Antigravity (`.agents/rules/*.md`, `.agents/skills/*`) | `.agents/` | ya en master |

## Qué vale la pena rescatar

- El **estilizador** de Blender y el **kit voxel** son herramientas de producción independientes del estilo; si el estilo vigente (diorama de juguete, `docs/ART_DIRECTION.md`) pide modelos nuevos, conviene traerlos como carpeta aparte (`tools/`), sin el render del estilo F.
- Las métricas y capturas del laboratorio sirven como registro de lo descartado: estilo F y B quedan fuera por decisión de arte (ADR 0003).

## Cómo retomar

`git worktree add .claude/worktrees/arte-3d exp/arte-3d`, `npm run test:restart` dentro, y traer piezas de a una con `git checkout exp/arte-3d -- <ruta>` desde una rama nueva (nunca sobre el árbol de trabajo con cambios ajenos). Hay un TODO `idea` para esto en [../../todos/](../../todos/README.md).
