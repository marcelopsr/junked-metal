# Todo número de balance vive en balance.json; la planilla es la biblia

Fecha: sin confirmar · Estado: aceptada

## Contexto
Números sueltos en el código hacían imposible ajustar balance sin tocar lógica. Regla en [balance.md](../../.claude/rules/balance.md) y [CLAUDE.md](../../CLAUDE.md).

## Decisión
Los números de balance van en `src/balance.json` (tablas tipo planilla) y se leen tipados desde `src/balance.ts`. La planilla de Google Sheets es la fuente; `npm run balance:xlsx` y `balance:import` hacen la ida y vuelta.

## Alternativas
Constantes en cada archivo: sin visión de conjunto.

## Consecuencias
Un número nuevo es una fila, no un literal. Quedan en código colisiones, colores, escalas y el modo Carrera. `npm run balance:check` prueba la ida y vuelta.
