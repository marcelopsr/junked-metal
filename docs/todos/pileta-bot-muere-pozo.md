---
titulo: Pileta: el bot muere dentro del pozo a los 56-68 s
estado: pregunta
area: juego
prioridad: media
origen: hallazgo
desde: 2026-10-21
motivo: ¿El pozo es trampa para el bot (devbot.ts) o para el jugador?
---

## Qué y por qué
En las 3 semillas el bot empuja contra la pared sur (z≈48,7) con enemigos encima.

## Alcance
- Toca: devbot.ts o zones/pileta.ts.
- No toca: nada fuera de eso sin coordinar con el orquestador.

## Cómo verificar
- `npm run verificar -- --nivel tanda` + sim 3 semillas pileta.

## Notas
Migrado del TABLERO.md viejo (`.claude/trabajo/archivo/TABLERO-2026-10.md`).
