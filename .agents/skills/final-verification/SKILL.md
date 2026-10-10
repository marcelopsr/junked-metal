---
name: final-verification
description: >-
  Executes the final evidence-based verification gate before completing any task in
  Junked Metal: TypeScript typechecking, Vitest unit tests, production Vite build,
  proportional headless verification (shots, sim, perf, playtest:duel), knowledge
  graph update (graphify), and diff hygiene check. Activate this skill at the end of
  every implementation batch before reporting completion or committing.
---

# Final Verification Gate (Evidencia antes de Cerrar)

**Nivel de razonamiento recomendado:** `Gemini Flash — Low` para verificaciones estándar; `Gemini Flash — High` para la auditoría final de cambios grandes o sensibles.

## 1. Regla de Trabajo en Tanda
Haz **todos** los cambios de código primero y ejecuta esta secuencia de verificación **una sola vez al final de la tanda** (no verifiques pedacito por pedacito).

## 2. Secuencia Obligatoria de Verificación

### Paso 1: Chequeo Estático y Tests (en proporción al cambio)
No correr todo por costumbre (filosofía del usuario, 2026-10-10). Siempre:
```bash
npx tsc --noEmit -p .
```
- Lógica con pruebas: `npx vitest run --changed --passWithNoTests` (solo las afectadas). `npm test` entero solo antes de commit/push.
- `npm run build`: solo antes de push o si tocaste config de Vite, imports dinámicos o assets.
- Si tocaste `src/balance.json` o `scripts/balance-*.mjs`, corre además `npm run balance:check`.
- Docs o herramientas sin efecto en el juego: solo lo mínimo que pruebe lo tocado.

### Paso 2: Verificación Headless Proporcional (contra `rc-test` `:5174`)
Si modificaste código de runtime (`src/`), reinicia primero `rc-test` y corre **de a una** las herramientas proporcionales al cambio:

```bash
npm run test:restart
```

- **Si tocaste UI, CSS, menús, HUD, modelos 3D o shaders:**
  ```bash
  npm run shots -- --changed   # o --only <escenario_o_shot> si sabés exactamente qué mirar
  ```
  Inspecciona las capturas generadas en `.shots/actual/` con `view_file` (PC y celular) y verifica que no haya errores de consola. Suite completa (`npm run shots -- --diff` sin filtro) solo para renovar referencias o si el usuario lo pide.
- **Si tocaste el modo Demolición (`src/duel*.ts`):**
  ```bash
  npm run playtest:duel
  npm run shots -- --only duel
  ```
- **Si tocaste combate, armas, enemigos o balance de supervivencia:**
  ```bash
  npm run sim -- --seeds 1,2 --secs 600
  ```
- **Si tocaste loops calientes (`update()`), instanciación, partículas o postproceso:**
  ```bash
  npm run perf -- --only partida,partida_llena --vp pc
  ```

### Paso 3: Actualizar el Grafo de Conocimiento (`graphify`)
Si modificaste archivos de código (`.ts`, `.mjs`), actualiza el grafo AST:
```bash
graphify update .
```

### Paso 4: Higiene del Diff, Aislamiento y Commit Local
Revisa `git status -s` y `git diff --stat`:
- [ ] Cero `console.log` de depuración olvidados, TODOs temporales sin formato `// ponytail:` o código muerto.
- [ ] **Aislamiento verificado:** Confirmar que `.claude/` y `CLAUDE.md` **no** aparecen modificados.
- [ ] Todos los requisitos de la solicitud original del usuario están cubiertos con evidencia real (resultados de comandos y capturas).
- [ ] Realizar commit local de la tanda verificada (y `git push origin master` al cerrar una tanda significativa, salvo indicación contraria del usuario).

### Paso 5: Ciclo de Descubrimiento Recursivo (Continuous Product Evolution)
El cierre de la verificación **inicia obligatoriamente el siguiente ciclo de descubrimiento** (ver `.agents/rules/product-evolution-loop.md`):
1. **Actualizar contexto persistente:** Registra en `docs/PRODUCT_EVOLUTION.md` (y en `docs/VISUAL_QUALITY.md` si hubo evaluación visual) el trabajo completado, las métricas validadas, las decisiones tomadas o descartadas y el checkpoint de sesión.
2. **Explorar con una lente renovada:** Analiza cómo quedó el producto tras el cambio (Calidad/Impeccable, Experiencia UX/UI, Integración Folded 2.5D, Simplificación/YAGNI, Rendimiento, Funcionalidades o Producto) consultando el backlog para no duplicar ni reabrir ideas descartadas.
3. **Proponer y recomendar (2 a 4 oportunidades):** Presenta entre 2 y 4 oportunidades genuinas detallando *qué es, qué problema resuelve, qué valor aporta, complejidad estimada y por qué conviene ahora*, seguidas de tu **recomendación fundamentada**.
4. **Solicitar la siguiente decisión:** Usa `ask_question` con la opción recomendada en primer lugar `(Recommended)` para decidir cómo continuar el ciclo `BUILD → VALIDATE → LEARN → DISCOVER → PROPOSE → DECIDE → BUILD ↺`.

