---
titulo: shots --diff tras arreglo de pieles del patio
estado: idea
area: arte
prioridad: baja
origen: hallazgo
desde: 2026-10-21
viejo_id: P16
---

## Qué y por qué
T65 arregló props invisibles (y=-500) y cambió el aspecto del patio; medir el diff y aceptar o corregir. `potF` (macetas) tiene el mismo patrón.

## Alcance
- Toca: world.ts, zones/common.ts.
- No toca: nada fuera de eso sin coordinar con el orquestador.

## Cómo verificar
- `npm run verificar -- --nivel tanda` + npm run shots -- --diff.

## Notas
Migrado del TABLERO.md viejo (`.claude/trabajo/archivo/TABLERO-2026-10.md`).
