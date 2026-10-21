---
titulo: Revisor v0.93: menores
estado: idea
area: juego
prioridad: baja
origen: hallazgo
desde: 2026-10-21
---

## Qué y por qué
libre.ts:774 receiveShadows tragado por comentario; run_drive.ts:406 miniT/driftHold/wasBoosting sin reinicio en clearRun; main.ts:221 tickDrive({c} as Frame); ui.ts↔combat.ts import circular; menu.ts importa models (medir bundle); arbustos de jardin.ts cerca de la salida (confirmar colisión).

## Alcance
- Toca: libre.ts, run_drive.ts, main.ts, ui.ts, menu.ts.
- No toca: nada fuera de eso sin coordinar con el orquestador.

## Cómo verificar
- `npm run verificar -- --nivel tanda` + tsc + npm test + build (tamaño).

## Notas
Migrado del TABLERO.md viejo (`.claude/trabajo/archivo/TABLERO-2026-10.md`).
