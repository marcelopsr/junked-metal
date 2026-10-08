---
name: browser-verification
description: >-
  Verifies visual rendering, UI flows, 3D scenes, responsive viewports (PC and
  mobile), and console errors using the project's GPU-accelerated headless Playwright
  harness against pm2 rc-test (:5174). Activate this skill whenever changes touch
  UI/CSS, 3D models/shaders, menus, HUD, or game modes (Survival, Race, Demolicion,
  Match-3) to visually confirm the result and detect regressions.
---

# Browser Verification & Visual Regression (Playwright + Metal GPU)

*Incorpora las reglas de determinismo y aislamiento de `testdino-hq/playwright-skill`, adaptadas al arnés headless con GPU Metal real de Junked Metal (`scripts/lib/browser.mjs`, `scripts/shots.mjs`, `scripts/scenarios.mjs`).*

**Nivel de razonamiento recomendado:** `Gemini Flash — Low` para correr capturas conocidas; `Gemini Flash — Medium` para inspeccionar capturas, diagnosticar diffs visuales o agregar escenarios en `scripts/scenarios.mjs`.

## 1. Reglas de Operación del Navegador en este Proyecto
1. **Nunca levantes servidores propios ni abras puertos nuevos:** Usa siempre `rc-test` en `:5174` (sin HMR) administrado por `pm2`.
2. **Reinicia `rc-test` antes de capturar tras cambios de código:**
   ```bash
   pm2 restart rc-test
   ```
3. **Un solo navegador headless con GPU Metal:** `scripts/lib/browser.mjs` lanza Chromium con `--use-angle=metal`, `--enable-gpu`, `--mute-audio` y congela el loop de render (`freeze: true`, `1/60 s` por cuadro) para que todo avance de forma determinista con `window.__tick(n)`.
4. **Una herramienta a la vez:** Nunca corras `shots`, `perf`, `sim` o `playtest:duel` en paralelo entre sí (comparten `rc-test` y la GPU del Mac).

## 2. Comandos de Verificación Visual (`npm run shots`)

```bash
# Capturar un escenario o shot puntual en PC y celular (~5-10 s)
npm run shots -- --only garaje
npm run shots -- --only match3
npm run shots -- --only duel --vp pc

# Capturar todos los escenarios en PC (1280x720) y celular (390x844) (~30 s)
npm run shots

# Comparar contra las referencias en .shots/ref/ (genera .shots/diff/ y exit 1 si supera tol)
npm run shots -- --diff

# Aceptar las capturas actuales como nueva referencia (solo cuando el cambio visual es intencional)
npm run shots -- --update
```

### Inspección Visual Real
- Tras correr `npm run shots`, **abre las imágenes relevantes en `.shots/actual/<vp>-<sesion>-<shot>.png` usando `view_file`** (soporta PNG directamente).
- Verifica en **PC (`pc-*`)** y **Celular (`cel-*`)**:
  - Jerarquía visual, alineación, textos sin desbordes ni solapamientos con controles táctiles.
  - Que no aparezcan líneas `[vp-sesion] errores de consola:` en la salida del comando.

## 3. Playtests Interactivos y Hooks de Dev
- **Playtest E2E de Demolición (PC + Celular):**
  ```bash
  npm run playtest:duel
  ```
  Verifica el flujo completo: menú → Demolición → taller `fabricar` → plantilla cuña → colocar pieza con `ghost3d` → modo borrar → confirmar → cuenta regresiva `"ASALTO"` → pelea `fight` → pantalla `inter`.
- **Hooks en vivo (definidos en `src/main.ts`, `src/kart.ts`, `src/duel.ts` solo en `DEV`):**
  - Supervivencia / Lab: `?mute&seed=3&lab[&climate=niebla][&boss]`, `__tick(n)`, `__look({...})`, `__lab({...})`, `__info()`, `__god()`, `__outro()`.
  - Carrera: `?mute&race[&players=2]`, `__race.auto()`, `__race.info()`, `__race.give()`, `__race.skip()`.
  - Demolición: `?mute&duel`, `__duel.info()`, `__duel.auto(true)`, `__duel.god()`, `__duel.kill()`.
  - Match-3: `?mute&match3[&seed=20261007]`.

## 4. Cómo Agregar un Nuevo Escenario Visual
Si creas una pantalla o modo nuevo, agrega un paso en [`scripts/scenarios.mjs`](../../scripts/scenarios.mjs):
- Usa esperas por condición (`waitForFunction`) y avanza la escena con `window.__tick(n)` en lugar de `waitForTimeout` arbitrarios.
- Verifica que `page.logs` quede vacío (cero `pageerror` y cero `console.error`).
