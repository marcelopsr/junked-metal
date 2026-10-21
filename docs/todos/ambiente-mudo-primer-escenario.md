---
titulo: Ambiente ENCORE mudo si entra antes del primer gesto de audio
estado: idea
area: juego
prioridad: media
origen: hallazgo
desde: 2026-10-21
viejo_id: H2
---

## Qué y por qué
El primer escenario queda sin ambiente si la partida arranca antes del primer gesto de audio.

## Alcance
- Toca: audio/ambience.ts, audio/context.ts.
- No toca: nada fuera de eso sin coordinar con el orquestador.

## Cómo verificar
- `npm run verificar -- --nivel tanda` + spy en partida headless.

## Notas
Migrado del TABLERO.md viejo (`.claude/trabajo/archivo/TABLERO-2026-10.md`).
