---
titulo: Paseo libre: escenario de shots libre-skate y setDrawDist
estado: idea
area: juego
prioridad: media
origen: hallazgo
desde: 2026-10-21
---

## Qué y por qué
Agregar escenario de shots libre-skate; setDrawDist (world_layout.ts:13, tope 145 m) recorta piezas grandes del skatepark de lejos; tuercas de E6 en el fondo del bowl A (-110,0,105) y aire de megarrampa (x≈-225, z=150).

## Alcance
- Toca: scripts/scenarios.mjs, world_layout.ts, zones/libre_skate.ts.
- No toca: nada fuera de eso sin coordinar con el orquestador.

## Cómo verificar
- `npm run verificar -- --nivel tanda` + shots --only libre-skate.

## Notas
Migrado del TABLERO.md viejo (`.claude/trabajo/archivo/TABLERO-2026-10.md`).
