---
name: code-review
description: >-
  Performs systematic, high-signal code reviews on diffs, commits, or modified modules
  in Junked Metal, focusing on real bugs, Havok physics traps, Babylon.js memory leaks,
  determinism regressions, state corruption, and Ponytail YAGNI compliance. Activate
  this skill before closing medium/large changes or when the user asks to review code
  or diffs. Do not activate for trivial formatting or general Q&A.
---

# Code Review — Revisión de Alta Señal (Sin Cosmética)

*Basado en la estructura de severidades y fases de `JPeetz/agent-skills/code-review` (v1.1.0) y `awesome-skills/code-review-skill`, adaptado a Babylon.js 9 + Havok + Ponytail.*

**Nivel de razonamiento recomendado:** `Gemini Flash — Medium` para diffs moderados; `Gemini Flash — High` para cambios transversales, física Havok, loop `update()` o refactors de estado.

## 1. Principios de Revisión
- **Cero comentarios cosméticos sin valor:** No reportes preferencias subjetivas de estilo. Enfócate exclusivamente en bugs reales, regresiones, fugas de recursos WebGL/Havok, estado inconsistente, seguridad y deuda arquitectónica.
- **Escala de Severidad:**
  - `BLOCKER`: Crash, colisionador Havok desfasado, fuga de mallas/cuerpos por cuadro, ruptura de guardado (`savefmt.ts`), `NaN` silencioso o vulnerabilidad XSS/inyección.
  - `MAJOR`: Bug funcional o de edge case, uso de `Math.random()` en lógica determinista, número de balance hardcodeado fuera de `balance.json`, regresión de FPS/draw calls (>20 %), voseo/tuteo en UI.
  - `MINOR`: Duplicación evitable (existen helpers en `models.ts`, `fx.ts` o `sfx.ts`), falta de comentario `// ponytail:` en un atajo deliberado.

## 2. Checklist Específico de Junked Metal (`rc_fight`)

### A. Física Havok y Babylon.js
- [ ] **Pose antes de `PhysicsAggregate`:** ¿Se posiciona/rota la malla ANTES de crear `new B.PhysicsAggregate(...)`? Mover la malla después deja el cuerpo físico en el origen o desfasado.
- [ ] **Masa e inercia juntas:** ¿Se usa `Car.setMass` o se pasan siempre `mass` e `inertia` juntos a `setMassProperties`?
- [ ] **`centerOfMass`:** ¿Se evita tocar `centerOfMass` en autos que usan `drive()` (`setLinearVelocity`)?
- [ ] **Limpieza (`.dispose()`):** Al terminar una partida, cambiar de modo (`main` ↔ `kart` ↔ `duel` ↔ `match3`) o destruir una entidad, ¿se liberan cuerpos físicos, instancias y observadores sin dejar huérfanos en la escena?
- [ ] **Fachada `src/bjs.ts`:** ¿Todo símbolo nuevo de `@babylonjs/core` está exportado por ruta profunda en `src/bjs.ts`?

### B. Determinismo, Estado y Balance
- [ ] **`rng()` vs `Math.random()`:** ¿Toda decisión de gameplay usa `rng()` (`src/rng.ts`)?
- [ ] **Balance en `balance.json`:** ¿Los números nuevos de balance están en `src/balance.json` (+ `DESC` en `scripts/balance-xlsx.mjs`) y se leen vía `BAL` (`src/balance.ts`)? ¿Se actualizaron a mano los textos descriptivos de armas/pasivas/pilotos si cambió algún valor?
- [ ] **Transiciones de estado:** ¿Qué pasa al pausar (`Esc`), reiniciar partida, morir durante el spawn de un jefe (`outroTick`), o cambiar de pestaña/orientación en celular?

### C. Escalera Ponytail y Reutilización
- [ ] ¿Se está reinventando una primitiva que ya existe en `src/models.ts` (`box`, `cyl`, `sph`, `merge`, `template`), un efecto de `src/fx.ts` o un control de `src/input.ts`?
- [ ] Si un módulo creció significativamente (`main.ts`, `menu.ts`, `duel.ts`, `weapons.ts`), ¿conviene extraer lógica pura (como se hizo con `savefmt.ts`, `duel_build.ts` y `match3_logic.ts`)?

## 3. Formato de Salida
Para cada hallazgo relevante, reporta:
1. `[SEVERIDAD] archivo.ts:Línea` — Descripción exacta del fallo o riesgo.
2. **Causa y efecto:** Qué condición lo dispara en partida o menú.
3. **Corrección concreta:** Qué cambiar (o aplícalo directamente si estás revisando tu propia tanda antes de cerrar).
