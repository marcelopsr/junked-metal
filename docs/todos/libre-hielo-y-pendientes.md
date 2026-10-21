---
titulo: Paseo libre: hielo solo visual y bajadas sin gravedad
estado: elegida
area: juego
prioridad: media
origen: pendiente
desde: 2026-10-21
---

## Qué y por qué
Hielo del lago de nieve es solo visual (lagoHielo exportado; bajar o.grip ×0,15 en tickDrive). Escenarios de shots para los barrios.

## Alcance
- Toca: run_drive.ts, zones/libre_nieve.ts, scripts/scenarios.mjs.
- No toca: nada fuera de eso sin coordinar con el orquestador.

## Cómo verificar
- `npm run verificar -- --nivel tanda` + shots por barrio + bot.

## Notas
Decisión 2026-10-21: sí, gravedad en bajadas: el tope de velocidad crece con la pendiente hacia abajo (hasta ~22 m/s) y el hielo del lago baja el agarre ×0,15. Sim idéntica en modos de combate (patio plano no cambia).
Migrado del TABLERO.md viejo (`.claude/trabajo/archivo/TABLERO-2026-10.md`).
