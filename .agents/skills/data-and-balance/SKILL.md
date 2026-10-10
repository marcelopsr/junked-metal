---
name: data-and-balance
description: >-
  Manages Junked Metal's data layer: the typed balance schema (src/balance.json,
  src/balance.ts), the Google Sheets / Excel synchronization pipeline
  (scripts/balance-xlsx.mjs, scripts/balance-import.mjs, scripts/balance-check.mjs),
  and the versioned localStorage save schema and migrations (src/savefmt.ts). Activate
  this skill whenever adding or editing balance numbers, enemy/weapon/duel stats, shop
  prices, spreadsheet scripts, or save state fields and migrations.
---

# Data Modeling, Balance Schema & Save Migrations

**Nivel de razonamiento recomendado:** `Gemini Flash — Medium` para ajustar valores o agregar filas en tablas existentes; `Gemini Flash — High` para cambios de esquema, nuevas tablas o migraciones de guardado (`savefmt.ts`).

## 1. Arquitectura de Balance ("La Biblia": `src/balance.json` + `src/balance.ts`)
Todos los números de balance del juego viven en [`src/balance.json`](../../src/balance.json) y se exponen tipados y protegidos con `Proxy` en [`src/balance.ts`](../../src/balance.ts) (`BAL`):
- **Protección contra `NaN` silencioso:** `guard()` en `src/balance.ts` lanza un `Error` inmediato si el código pide una tabla, un `id` o una columna que no existe (`BAL.enemigos.hormiga.vida`, `BAL.ritmo.dureza_vida`).
- **Tablas actuales en `src/balance.json`:**
  - Tablas multi-columna (`tab`): `enemigos`, `armas`, `pasivas`, `autos`, `pilotos`, `precios`, `duelo_bloques`, `duelo_chasis`, `duelo_ruedas`, `duelo_armas`, `duelo_rival`.
  - Listas clave-valor (`lista`, `{ id, valor, descripcion }`): `armas_extra`, `ritmo`, `ataques`, `duelo`.
  - Especial: `plagas`.

### Procedimiento Obligatorio al Agregar o Cambiar Números de Balance
1. **Nunca escribas literales numéricos de balance en `src/*.ts`** (salvo tamaños de colisión, colores, escalas visuales, tiempos de animación y modo Carrera `kart.ts`).
2. Si agregas una fila o parámetro nuevo en `src/balance.json`:
   - Mantén **exactamente las mismas columnas** en todas las filas de esa tabla (`test/balance.test.ts` falla si difieren).
   - Agrega la descripción correspondiente en `DESC` dentro de [`scripts/balance-xlsx.mjs`](../../scripts/balance-xlsx.mjs) si aplica.
3. Si cambias un número que aparece mencionado en textos de UI (descripciones de armas, pasivas o pilotos en `src/weapons.ts`, `src/pilots.ts`, `src/abilities.ts`), **actualiza el texto a mano** para que coincida.
4. Verifica siempre la integridad y la ida y vuelta con la planilla:
   ```bash
   npm test
   npm run balance:check
   npm run balance:xlsx
   ```
5. Si el cambio afecta supervivencia o jefes, valida con simulación:
   ```bash
   npm run test:restart
   npm run sim -- --seeds 1,2 --secs 600
   ```

## 2. Sincronización con Google Sheets (`balance:*`)
- **Exportar a Excel/Sheets:** `npm run balance:xlsx` genera `balance.xlsx` (fila 1: columnas, fila 2: descripciones, más las hojas calculadas *Golpes para matar*, *Tiempo jefe* y *Partidas para comprar*).
- **Importar desde Sheets:** Descargar hojas como TSV, unirlas en un `.txt` precedidas por `### nombre_hoja` y ejecutar:
  ```bash
  npm run balance:import -- archivo.txt --dry
  npm run balance:import -- archivo.txt
  ```

## 3. Esquema de Guardado y Migraciones (`src/savefmt.ts`)
El progreso del jugador se persiste en `localStorage` (`"rcfight2"`, más `"duel_paint"` para pintura de Demolición):
- **Compatibilidad hacia atrás:** Un guardado viejo, incompleto o editado a mano **nunca debe romper el arranque ni el render**.
- **Cómo agregar un campo nuevo a `Save`:**
  1. Define su tipo y su valor por defecto en el objeto `D` (`src/menu.ts`).
  2. En `parseSave()` (`src/savefmt.ts`), valida el tipo, rango o pertenencia a lista válida; si es inválido o ausente, cae al defecto de `D`.
  3. Si cambia el significado de opciones existentes (como ocurrió con `lookv = 6` o `gfxv = 2`), agrega un paso de migración idempotente por versión en `parseSave()`.
  4. Agrega un test unitario en [`test/save.test.ts`](../../test/save.test.ts) que cubra tanto el valor válido como entradas corruptas y la migración desde el formato anterior.
