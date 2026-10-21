---
paths:
  - "src/balance.json"
  - "src/balance.ts"
  - "src/weapons.ts"
  - "src/weapons/**"
  - "src/enemies.ts"
  - "src/enemies/**"
  - "src/encore.ts"
  - "src/run.ts"
  - "src/devbot.ts"
  - "src/car.ts"
  - "src/pilots.ts"
  - "src/progression.ts"
  - "src/combat.ts"
  - "src/run_tick.ts"
  - "src/encore_run.ts"
  - "src/encore_events.ts"
  - "src/pact_zones.ts"
  - "src/menu.ts"
  - "scripts/balance-*.mjs"
  - "scripts/sim.mjs"
---

# Balance

Todos los números de balance viven en `src/balance.json` (tablas con forma de planilla: enemigos, armas, armas_extra, pasivas, ritmo, ataques, autos, pilotos, precios, plagas) y el código los lee tipados desde `src/balance.ts` (`BAL.enemigos.hormiga.vida`, `BAL.ritmo.dureza_vida`; pedir un id o una columna que no existe tira error). **Un número nuevo de balance va como fila en la tabla** (y su descripción en `DESC` de `scripts/balance-xlsx.mjs`), no como literal en el código.

Siguen en el código: tamaños de colisión, colores, escalas y tiempos de animación, el modo Carrera (kart.ts) y los textos con números (descripciones de armas, pasivas y pilotos): esos últimos se actualizan a mano si cambia el valor.

## Planilla (Google Sheets es la «biblia»)

- `npm run balance:xlsx` genera `balance.xlsx` (una hoja por tabla: fila 1 columnas, fila 2 qué significa cada una; más las hojas calculadas Golpes para matar, Tiempo jefe y Partidas para comprar, con fórmulas y celdas amarillas de supuestos) para subirlo a Sheets.
- De vuelta: descargar cada hoja de datos como TSV, juntarlas en un .txt con una línea `### nombre_hoja` antes de cada una y correr `npm run balance:import -- archivo.txt [--dry]`: valida ids, columnas y números, informa qué cambió y no escribe nada si algo no cuadra (las hojas calculadas se ignoran; solo se editan números, no se agregan filas ni columnas).
- `npm run balance:check` prueba la ida y vuelta. Tras importar: `npx tsc --noEmit -p .`, `npm run build` y `npm run sim`.

## Verificar balance

- `npm run sim -- --seeds 1,2 --secs 600` con 1-2 semillas para un ajuste; 12-24 semillas (`--par 4`) para contenido nuevo. Metas: 40-60 % de victorias en Supervivencia; ninguna arma nueva por encima de 3x la mediana de daño (`__dmg()` / `--json`).
- Refactors sin cambio de juego: guardar la sim ANTES de editar y comparar que sea idéntica después.
- Duelos contra jefes: `npm run sim -- --duel perro,aspiradora --seeds 1,2`.
