---
titulo: Jardín: contraste 0,15 (meta 0,19)
estado: idea
area: arte
prioridad: baja
origen: hallazgo
desde: 2026-10-21
---

## Qué y por qué
Los 3 arbustos oscuros (8,25), (-8,10), (24,20) no salen en el encuadre de juego: ubicarlos dentro de `__lab({back:15, up:9})` o sumar sombra larga.

## Alcance
- Toca: zones/jardin.ts.
- No toca: nada fuera de eso sin coordinar con el orquestador.

## Cómo verificar
- `npm run verificar -- --nivel tanda` + ref_measure sobre shots.

## Notas
Migrado del TABLERO.md viejo (`.claude/trabajo/archivo/TABLERO-2026-10.md`).
