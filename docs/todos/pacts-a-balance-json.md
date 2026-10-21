---
titulo: Números de PACTS a balance.json
estado: elegida
area: juego
prioridad: media
origen: hallazgo
desde: 2026-10-21
---

## Qué y por qué
Los números de los pactos están escritos en `src/encore.ts` (~187-205); moverlos a `balance.json` (regla del repo).

## Alcance
- Toca: encore.ts, scripts/balance-xlsx.mjs (DESC). `balance.json`: el agente propone las filas en el informe y las integra el orquestador (archivo compartido).
- No toca: nada fuera de eso sin coordinar con el orquestador.

## Cómo verificar
- `npm run verificar -- --nivel tanda` + npm test, balance:check, sim 2 semillas idéntica antes/después.

## Notas
Migrado del TABLERO.md viejo (`.claude/trabajo/archivo/TABLERO-2026-10.md`).
