---
titulo: Pileta: el bot muere dentro del pozo a los 56-68 s
estado: elegida
area: juego
prioridad: media
origen: hallazgo
desde: 2026-10-21
---

## Qué y por qué
En las 3 semillas el bot empuja contra la pared sur (z≈48,7) con enemigos encima.

## Alcance
- Toca: devbot.ts.
- No toca: nada fuera de eso sin coordinar con el orquestador.

## Cómo verificar
- `npm run verificar -- --nivel tanda` + sim 3 semillas pileta.

## Notas
Decisión 2026-10-21: enseñar al bot a salir del pozo (buscar la rampa); el nivel queda igual.
Migrado del TABLERO.md viejo (`.claude/trabajo/archivo/TABLERO-2026-10.md`).
