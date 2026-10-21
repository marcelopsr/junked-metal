---
titulo: Hitstop no se cuenta con simulating; el bot no busca zonas de beneficio
estado: idea
area: juego
prioridad: media
origen: hallazgo
desde: 2026-10-21
---

## Qué y por qué
combat.ts:111: contar hitstop aparte para medir con el bot. El bot no busca zonas de curación (0,2) ni imán (0). Sin pactos el bot gana 75 % (meta 60-70 %): dificultad base, decisión aparte.

## Alcance
- Toca: combat.ts, devbot.ts.
- No toca: nada fuera de eso sin coordinar con el orquestador.

## Cómo verificar
- `npm run verificar -- --nivel tanda` + sim 4 semillas.

## Notas
Migrado del TABLERO.md viejo (`.claude/trabajo/archivo/TABLERO-2026-10.md`).
