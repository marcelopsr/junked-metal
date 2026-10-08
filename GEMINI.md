# Junked Metal — Harness Antigravity (Gemini Only)

Roguelite 3D de supervivencia y modos arcade con autos RC en un patio gigante (`marcelopsr/junked-metal`).
**Stack:** Babylon.js 9 (fachada `src/bjs.ts`) + física Havok WASM + TypeScript 7 (`strict`) + Vite 8 + Vitest 5 + Playwright (Chromium headless sobre GPU Metal).

---

## 1. Principio Fundamental: GEMINI ONLY & Aislamiento

- **Exclusivamente modelos Gemini:** Todo el trabajo principal, revisiones y subagentes (`invoke_subagent` con `inherit`, `flash_lite`, `flash` o `pro`) deben ejecutarse únicamente con modelos Gemini. Prohibido usar o delegar en Claude, Sonnet, Opus, OpenAI, GPT, Codex u otros proveedores sin autorización explícita del usuario.
- **Aislamiento total respecto a Claude:** `.claude/`, `CLAUDE.md` y `~/.claude/` pertenecen a un sistema independiente. **Prohibido modificarlos, migrarlos o depender de ellos.**
- **Routing dinámico de razonamiento (sin pedir permiso):**
  - **Gemini Flash — Low:** búsquedas puntuales, ediciones localizadas, CSS simple, renombrados, documentación, comandos conocidos.
  - **Gemini Flash — Medium (predeterminado):** desarrollo normal de features, UI/HUD, lógica de modos (`main.ts`, `duel.ts`, `kart.ts`, `match3.ts`), tests en Vitest, refactors acotados.
  - **Gemini Flash — High:** arquitectura, colisiones/física Havok compleja, bugs persistentes, cuellos de botella de rendimiento WebGL, cambios en esquema de `balance.json` o migraciones de `savefmt.ts`, features transversales y verificación final de cambios sensibles.

---

## 2. Reglas de Colaboración y Operación

1. **Preguntar antes de decidir diseño o balance:** Usa `ask_question` (opción múltiple, recomendada primero) para dudas reales de diseño, balance, precios o textos visibles. No hagas preguntas sueltas en texto plano.
2. **Idioma:** Conversación en español. **Textos del juego:** español neutro e impersonal (*"Presiona"*, *"Sobrevive"*, *"El auto quedó destrozado"*); prohibido el voseo (*"Apretá"*, *"querés"*) y el tuteo (*"tu/te"*).
3. **Grafo primero (`graphify`):** Antes de usar `grep` masivo o leer archivos enteros (`main.ts` y `menu.ts` superan los 100 KB), consulta `graphify query`, `graphify path` o `graphify explain`, o revisa `graphify-out/wiki/index.md`. Tras modificar código, ejecuta `graphify update .`.
4. **Escalera Ponytail (YAGNI):** Reusar lo que ya existe → plataforma/stdlib → dependencia instalada → mínimo código nuevo. Atajos deliberados llevan comentario `// ponytail: <techo>`.
5. **Trabajo en tanda y prueba única:** Aplica todos los cambios de la tanda primero y ejecuta la verificación una sola vez al final.
6. **Servidores `pm2` compartidos (nunca levantar servidores propios):**
   - `rc-dev` (`:5173`, HMR para el usuario), `rc-test` (`:5174`, sin HMR para pruebas headless: ejecutar `pm2 restart rc-test` tras tocar código), `rc-demo` (`:4173`, build).

---

## 3. Sistema de Agent Skills (`.agents/skills/`)

Carga únicamente las skills proporcionales a la tarea (Progressive Disclosure):

| Skill | Cuándo activarla |
|---|---|
| `codebase-discovery` | Explorar arquitectura, modos (`main`, `duel`, `kart`, `match3`), flujo de datos o dependencias con `graphify`. |
| `implementation-strategy` | Planificar features nuevas o cambios que crucen módulos (`docs/*_PLAN.md`), evaluar riesgos y aplicar YAGNI. |
| `frontend-design` | Diseñar o editar HUD CRT, menús, taller RoboCraft (`duel_fabricacion`), gabinete Match-3, íconos SVG o CSS responsive. |
| `data-and-balance` | Modificar `src/balance.json`, `src/balance.ts`, scripts de planilla (`balance:*`) o migraciones/sanitización en `src/savefmt.ts`. |
| `testing` | Escribir o ejecutar tests unitarios en Vitest (`npm test`), simulaciones deterministas (`npm run sim`) o playtests (`playtest:duel`). |
| `browser-verification` | Verificar visualmente o en navegador headless (`npm run shots`, modo `?lab`, `?duel`, `?race`, `?match3`, PC y celular). |
| `code-review` | Revisar diffs buscando bugs reales, trampas de Havok/Babylon, rupturas de determinismo, regresiones o deuda Ponytail. |
| `security-review` | Auditar sanitización de guardados (`savefmt.ts`), `innerHTML`/XSS, importador TSV, rutas relativas de Pages o dependencias. |
| `performance-review` | Optimizar FPS/draw calls, instanciación (`template()`), pools (`fx.ts`), loops de `update()`, fachada `bjs.ts` o correr `npm run perf`. |
| `final-verification` | Cierre con evidencia (`tsc --noEmit`, `npm test`, `npm run build`, pruebas headless, `graphify update .` y limpieza del diff). |

### Flujo Proporcional
- **Cambio pequeño/localizado:** `Implementation` → `final-verification` (`tsc`, `test`, `build`).
- **Feature o cambio transversal:** `codebase-discovery` → `implementation-strategy` → `Implementation` (+ `frontend-design` / `data-and-balance`) → `testing` → `browser-verification` → `code-review` (+ `performance-review` / `security-review` si aplica) → `final-verification`.
