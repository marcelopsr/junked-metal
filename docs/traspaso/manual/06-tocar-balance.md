# 06. Tocar balance

Objetivo: cambiar números sin romper la planilla ni el juego. Reglas completas: [../../../.claude/rules/balance.md](../../../.claude/rules/balance.md).

1. Editar `src/balance.json` (o, desde la planilla: `npm run balance:xlsx`, subir `balance.xlsx` a Sheets, editar).
2. Vuelta desde Sheets: bajar cada hoja de datos como TSV, juntarlas en un `.txt` con una línea `### nombre_hoja` antes de cada una y correr `npm run balance:import -- archivo.txt --dry`; sin `--dry` escribe.
3. `npm run balance:check` (prueba la ida y vuelta).
4. `npx tsc --noEmit -p .` y `npm test`.
5. `npm run sim -- --seeds 1,2 --secs 600` (12-24 semillas con `--par 4` si es contenido nuevo).

Se verifica: metas de 40-60 % de victorias en Supervivencia; en refactor sin cambio de juego, la sim guardada antes debe dar idéntica.

Trampas:
- Solo se editan números: no se agregan filas ni columnas por la planilla.
- Un número nuevo va como fila en la tabla, con su descripción en `DESC` de `scripts/balance-xlsx.mjs`.
- Tras importar también `npm run build`.
