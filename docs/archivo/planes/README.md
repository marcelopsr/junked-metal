# Planes de arte y oleadas archivados

Planes y fichas de la era Megabonk + Folded y de las oleadas de modelos. El estilo vigente es Junked Metal Encore ([ADR 0003](../../decisiones/0003-estilo-junked-metal-encore.md), [ART_DIRECTION.md](../../ART_DIRECTION.md) sección Vigente). Estados: hecho, parcial, descartado, superado (por el estilo vigente o por un modo archivado).

| Archivo | Qué proponía | Estado | Evidencia |
|---|---|---|---|
| [VISUAL_CYCLE_*.md](./VISUAL_CYCLE_SCRAP_DRUM_CRANE.md) (12 fichas) | Pulidos visuales del patio y garaje Folded: chatarra, tambores, rampa, neumáticos, huerta, tierra. | Hecho, superado por el estilo | Cada ficha cierra su ciclo con capturas; Folded lo reemplaza la ADR 0003. |
| [OLEADA2_CARS_BLENDER.md](./OLEADA2_CARS_BLENDER.md) | Ocho autos RC esculpidos en Blender. | Hecho | `src/carGlb.ts`, `public/models/cars/`. |
| [OLEADA2_PROCEDURAL_BLENDER.md](./OLEADA2_PROCEDURAL_BLENDER.md) | Ocho enemigos procedurales en Blender. | Hecho | `assets-src/proc2/`, `src/models/enemies.ts`. |
| [encargos/](./encargos/OLEADA2_BLENDER_ART.md) | Briefs de oleada 1 y 2 (hormiga, perro, gato, jefes, fricción) e inventario. | Hecho | GLB en `public/models/` (ant, perro, gato, polilla, friccion). |
| [MAGICAVOXEL_ASSET_PLAN.md](./MAGICAVOXEL_ASSET_PLAN.md) | Props voxel en MagicaVoxel (15 fuentes `.vox`). | Parcial | `assets-src/magicavoxel/v1`; no es el estilo vigente. |
| [LOD_AND_INSTANCING_PLAN.md](./LOD_AND_INSTANCING_PLAN.md) | LODs y animación instanciada para 150 enemigos. | Parcial | `src/bench_lod.ts` y `bench-lod.html` (banco); la regla de instancias sigue en CLAUDE.md. |
| [PROCEDURAL_PROPS_PLAN.md](./PROCEDURAL_PROPS_PLAN.md) | Biblioteca procedural de props v1. | Parcial | `assets-src/procedural-props/v1`; sin integrar al juego. |
| [INTRO_ASSETS_PLAN.md](./INTRO_ASSETS_PLAN.md) | Intro cinematográfica con recursos reutilizables. | Hecho | `src/intro.ts`; visible solo desde Créditos ([ADR 0011](../../decisiones/0011-intro-solo-creditos.md)). |
| [EVOLUTION_ART_PLAN.md](./EVOLUTION_ART_PLAN.md) | Ilustración propia para las 32 evoluciones. | Parcial | `assets-src/evolution-art/v1`; hay un TODO abierto: [cartas-evolucion-sin-imagen](../../todos/cartas-evolucion-sin-imagen.md). |
| [PIXEL_ART_3D_ASSET_BIBLE.md](./PIXEL_ART_3D_ASSET_BIBLE.md) y [PIXEL_ART_3D_PROCEDURAL_CATALOG.md](./PIXEL_ART_3D_PROCEDURAL_CATALOG.md) | Biblia visual y catálogo de recetas Pixel Art 3D HD. | Superado | Lo reemplaza el diorama de juguete (ADR 0003); recursos nunca integrados. |
| [OPEN_SOURCE_ASSETS_SURVEY.md](./OPEN_SOURCE_ASSETS_SURVEY.md) | Encuesta de mallas glTF libres con licencias. | Hecho | Sirvió de referencia de siluetas para las oleadas 1 y 2. |
| [CINEMATIC_3D_SLICE.md](./CINEMATIC_3D_SLICE.md) | Escena 3D cinematográfica de prueba (buggy y frenchie). | Hecho | `art-lab.html`, `src/art_lab.ts`; banco fuera del build. |
| [SURVIVAL_EXPERIENCE_PLAN.md](./SURVIVAL_EXPERIENCE_PLAN.md) | Mejora de experiencia de Supervivencia, fases 0 a 5. | Parcial | Fases 0-1 hechas; el modo está archivado ([ADR 0002](../../decisiones/0002-modos-archivados.md)). |
| [SURVIVAL_BUILD_IDENTITY.md](./SURVIVAL_BUILD_IDENTITY.md) | Detección de estilo de build y sesgo de cartas. | Descartado | El usuario lo descartó el 2026-10-06 ([ADR 0018](../../decisiones/0018-descartes-de-producto.md)). |
| [MATCH3_ARCADE.md](./MATCH3_ARCADE.md) | Junked Crush: campaña match-3 de 10 niveles. | Hecho, congelado | `src/match3*.ts`; congelado por la ADR 0002. |

## Quedaron fuera del archivo

No estaban en la lista del encargo y siguen en `docs/`: `LUNA.md` (decisiones de las fases del mapa Luna, que sigue en `src/moon*.ts`), `VISUAL_MODELS_*`, `VISUAL_QUALITY.md` y `WORLD_JUMPS_PLAN.md`.
