---
name: implementation-strategy
description: >-
  Plans implementation approach, identifies affected modules and invariants, applies
  the Ponytail YAGNI ladder, and resolves open design or balance decisions before
  writing code. Activate this skill before implementing new features, new game modes,
  cross-module refactors, or changes affecting balance, physics, or save state. Do not
  activate for trivial bug fixes, single-line tweaks, or mechanical renames.
---

# Implementation Strategy & Planning

**Nivel de razonamiento recomendado:** `Gemini Flash — Medium` para planificación acotada; `Gemini Flash — High` para features transversales, cambios de física Havok, modos nuevos o decisiones con múltiples dependencias.

## 1. Proporcionalidad (Cero Burocracia Innecesaria)
- **Cambio pequeño o localizado (1–2 archivos, comportamiento claro):** No crees documentos de plan. Identifica mentalmente el impacto, edita y verifica.
- **Feature nueva, modo nuevo o cambio transversal (cruza varios módulos de `src/`):**
  1. Verifica si ya existe un plan o GDD en `docs/` (p. ej. `docs/SURVIVAL_EXPERIENCE_PLAN.md`, `docs/SURVIVAL_BUILD_IDENTITY.md`, `docs/BATTLE_RC_PLAN.md`, `docs/DEMOLICION_GDD.md`).
  2. Si hay decisiones abiertas de diseño, balance, precios o textos visibles, **detente y consulta al usuario con `ask_question`** (opción múltiple, opción recomendada primera y marcada con `(Recommended)`). Nunca asumas decisiones de producto por tu cuenta.
  3. Si es una feature nueva sin plan, redacta o actualiza el plan en `docs/` hasta cerrar las decisiones antes de tocar código en `src/`.

## 2. Escalera Ponytail (YAGNI)
Antes de escribir código nuevo, recorre esta escalera en orden:
1. **YAGNI:** ¿Realmente se necesita ahora para cumplir el pedido?
2. **Reusar lo que ya existe en `src/`:**
   - ¿Mallas/primitivas? Reusar `box()`, `cyl()`, `sph()`, `merge()`, `template()` en `src/models.ts`.
   - ¿Efectos/partículas? Reusar el pool de `src/fx.ts` (`FX.sparks()`, `FX.dust()`, `burst()`, `mark()`).
   - ¿Audio? Reusar sintetizadores y canales de `src/sfx.ts`.
   - ¿Controles? Reusar `pollPlayer()` y perfiles de `src/input.ts` / `src/savefmt.ts`.
   - ¿RNG? Reusar `rng()` de `src/rng.ts`.
3. **Plataforma / Web APIs / Babylon.js ya expuesto en `src/bjs.ts`:** Si falta un módulo de `@babylonjs/core`, agrégalo por ruta profunda en `src/bjs.ts`.
4. **Mínimo código nuevo:** Si tomas un atajo deliberado con techo conocido, documéntalo en la línea con `// ponytail: <explicación del límite y cuándo escalar>`.

## 3. Matriz de Impacto y Riesgos antes de Editar
Responde brevemente estos 5 puntos antes de modificar archivos:
1. **Archivos afectados:** ¿Qué módulos de `src/`, `test/` y `scripts/` se tocan?
2. **Invariantes físicas/render:** ¿Se crean cuerpos Havok (pose antes de `PhysicsAggregate`, `Car.setMass`)? ¿Se agregan entidades en `update()` (requiere `template()` e instanciación, nunca mallas sueltas)?
3. **Datos y Balance:** ¿Hay números nuevos de balance? (Deben ir en `src/balance.json` + `DESC` en `scripts/balance-xlsx.mjs` + lectura vía `BAL` en `src/balance.ts`). ¿Cambia la forma de `Save`? (Requiere sanitización en `src/savefmt.ts` y test en `test/save.test.ts`).
4. **Determinismo:** ¿Usa `rng()` en lugar de `Math.random()` para todo lo no cosmético?
5. **Criterio de verificación:** ¿Con qué comando exacto se probará al terminar la tanda (`npm test`, `npm run shots -- --only ...`, `npm run sim`, `npm run perf`, `npm run playtest:duel`)?
