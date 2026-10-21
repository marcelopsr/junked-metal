---
titulo: Ciudad: 6 pilones oscuros sin colisión
estado: idea
area: juego
prioridad: media
origen: hallazgo
desde: 2026-10-21
---

## Qué y por qué
x ±14,6: el auto los atraviesa si sube a la vereda; darles colisionador caja. Garaje: sombras gigantes dominan (decidir props bajos o sol). Luna de día: falta variedad de suelo (rocas/terrazas). SUN_DIR más rasante: probar frontera día/noche en juego.

## Alcance
- Toca: zones/ciudad*.ts, menuscene.ts, zones/luna*.ts, render.ts.
- No toca: nada fuera de eso sin coordinar con el orquestador.

## Cómo verificar
- `npm run verificar -- --nivel tanda` + bot ciudad + capturas.

## Notas
Migrado del TABLERO.md viejo (`.claude/trabajo/archivo/TABLERO-2026-10.md`).
