---
titulo: Paseo libre: hielo solo visual y bajadas sin gravedad
estado: pregunta
area: juego
prioridad: media
origen: pendiente
desde: 2026-10-21
motivo: Decidir si en las bajadas se suma gravedad (drive() pisa la velocidad a 15 m/s)
---

## Qué y por qué
Hielo del lago de nieve es solo visual (lagoHielo exportado; bajar o.grip ×0,15 en tickDrive). Escenarios de shots para los barrios.

## Alcance
- Toca: run_drive.ts, zones/libre_nieve.ts, scripts/scenarios.mjs.
- No toca: nada fuera de eso sin coordinar con el orquestador.

## Cómo verificar
- `npm run verificar -- --nivel tanda` + shots por barrio + bot.

## Notas
Migrado del TABLERO.md viejo (`.claude/trabajo/archivo/TABLERO-2026-10.md`).
