---
titulo: Rescatar el estilizador de Blender y el kit voxel de exp/arte-3d
estado: idea
area: arte
prioridad: baja
origen: pendiente
desde: 2026-10-21
---

## Qué y por qué
La rama `exp/arte-3d` (cerrada como worktree el 2026-10-21) tiene dos herramientas de producción útiles fuera de su estilo experimental: `estilizador/` (Blender: lleva modelos CC0 al estilo Junked Metal con retinte, desgaste horneado y calcos) y `voxel/kit/` (receta JSON → Blender → vengi). Ficha: `docs/traspaso/hecho/laboratorio-arte-3d.md`.

## Alcance
- Toca: carpeta nueva `tools/estilizador/` y `tools/voxel/` (traídas con `git checkout exp/arte-3d -- estilizador voxel` desde una rama propia), `docs/traspaso/hecho/laboratorio-arte-3d.md`.
- No toca: `src/` (nada del render del estilo F), `docs/ART_DIRECTION.md`.

## Cómo verificar
- Correr el estilizador sobre un modelo CC0 de prueba y comparar antes/después con `scripts/ref_measure.py` contra las referencias vigentes.
- `npm run verificar -- --nivel rapido` (no toca el juego).

## Notas
Solo si el estilo vigente pide modelos nuevos; mientras los modelos procedurales alcancen, queda en idea.
