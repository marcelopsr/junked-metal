---
name: testing
description: >-
  Guides writing and running unit tests (Vitest), deterministic gameplay/balance
  simulations (npm run sim), and mode regression tests in Junked Metal. Activate this
  skill when adding or modifying logic in src/balance.ts, src/savefmt.ts, src/run.ts,
  src/weapons.ts, src/enemies.ts, src/duel_build.ts, src/match3_logic.ts, or
  scripts/balance-import.mjs, or when verifying behavior with automated tests.
---

# Testing Strategy (Vitest + Simulación Determinista)

**Nivel de razonamiento recomendado:** `Gemini Flash — Low` para ejecutar la suite; `Gemini Flash — Medium` para diseñar nuevos tests unitarios o analizar resultados de simulación (`sim`).

## 1. Pirámide de Pruebas del Proyecto

| Nivel | Herramienta / Comando | Tiempo | Qué protege |
|---|---|---|---|
| **1. Lógica Pura (Unit)** | `npm test` (`vitest run` sobre `test/*.test.ts`) | `< 1 s` | Esquema y guardas de `balance.json` (`balance.test.ts`), importador TSV (`importer.test.ts`), sanitización y migraciones de guardado (`save.test.ts`), semillas y climas (`run.test.ts`), pasivas/pilotos (`stats.test.ts`), armado de Demolición (`duel_build.test.ts`), reglas y balance de Match-3 (`match3.test.ts`, `match3_balance.test.ts`). |
| **2. Ida y Vuelta de Planilla** | `npm run balance:check` | `~1 s` | Generación de `balance.xlsx` y re-importación sin diferencias ni pérdida de precisión. |
| **3. Simulación Headless (Bot & Jefes)** | `npm run sim -- --seeds 1,2,3 --secs 600` / `--duel perro,aspiradora` | `~12 s` / semilla | Balance real de supervivencia de 10 min, progresión de XP/niveles, daño por arma (`__out()`) y daño recibido (`__dmg()`), duelos contra jefes finales en `rc-test` (`:5174`). |
| **4. Flujo E2E de Modos** | `npm run playtest:duel` y `npm run shots` | `15–30 s` | Integración DOM + WebGL + Havok en PC y celular sin errores de consola. |

## 2. Reglas para Escribir Buenos Tests en `test/*.test.ts`
1. **Sin DOM ni WebGL en Vitest:** Los tests de `test/` corren en Node puro con Vitest. Cuando diseñes lógica nueva (como `src/savefmt.ts`, `src/duel_build.ts` o `src/match3_logic.ts`), mantén las funciones de reglas/estado desacopladas del DOM y de Babylon para poder probarlas en `< 1 s` con `npm test`.
2. **Proteger invariantes reales, no implementación interna:**
   - Si tocas `src/savefmt.ts`, agrega casos en `test/save.test.ts` con entradas malformadas, tipos inválidos, colores fuera de `#rrggbb` o versiones viejas (`lookv`, `gfxv`) verificando que `parseSave` nunca tire excepción y devuelva valores seguros.
   - Si tocas `src/balance.json` o `src/balance.ts`, verifica que `test/balance.test.ts` valide unicidad de IDs, columnas consistentes, números finitos y referencias cruzadas.
   - Si tocas lógica con azar (`src/run.ts`, `src/match3_logic.ts`), fija la semilla con `seedRng(N)` y comprueba tanto el determinismo (misma semilla = mismo resultado) como las cotas estadísticas en múltiples semillas.

## 3. Uso de `npm run sim` para Balance de Combate
Antes de correr `npm run sim`, asegúrate de haber reiniciado `rc-test` si cambiaste código (`pm2 restart rc-test`):
```bash
# Partida completa del bot (600 s de juego) en semillas 1 y 2
npm run sim -- --seeds 1,2 --secs 600

# Duelo directo contra jefes finales con el equipo del minuto 10
npm run sim -- --duel perro,aspiradora,cortacercos --seeds 1,2

# Salida en JSON para análisis detallado de daño infligido y recibido
npm run sim -- --seeds 1 --secs 300 --json
```
*Nota:* `scripts/sim.mjs` reemplaza `Math.random` por un generador con semilla antes de arrancar cada corrida, garantizando que la misma semilla produzca exactamente el mismo resultado desde una carga limpia.
