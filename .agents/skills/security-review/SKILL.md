---
name: security-review
description: >-
  Audits client-side security, untrusted save/import sanitization, DOM XSS prevention,
  spreadsheet import validation, relative path integrity, and supply-chain safety in
  Junked Metal. Activate this skill when modifying src/savefmt.ts, localStorage parsing,
  innerHTML rendering with user-controlled strings (profile names, hex colors, decals),
  scripts/balance-import.mjs, GitHub Actions (.github/workflows/), or package.json
  dependencies. Do not activate for internal 3D rendering or physics tweaks.
---

# Security Review (Client-Side Web Game & Supply Chain)

**Nivel de razonamiento recomendado:** `Gemini Flash — Medium` para revisiones acotadas de `savefmt.ts` o DOM; `Gemini Flash — High` para cambios en importación de datos, dependencias o workflows de publicación.

## 1. Superficie de Ataque Real en Junked Metal
Al ser una SPA estática publicada en GitHub Pages (`https://marcelopsr.github.io/junked-metal/`), no hay servidor backend ni base de datos SQL, pero sí existen **4 fronteras de confianza críticas**:

### 1. Guardado e Importación de Partidas (`src/savefmt.ts`, `localStorage`)
Un jugador puede editar a mano `localStorage.getItem("rcfight2")` o `"duel_paint"`, o pegar un respaldo JSON arbitrario:
- **Nunca confíes en `JSON.parse` crudo:** Todo campo debe pasar por `parseSave()` en `src/savefmt.ts`.
- **Validación estricta de tipos y rangos:**
  - Números acotados con `Number.isFinite(v)` y `Math.min(hi, Math.max(lo, v))`.
  - Listas y claves validadas contra whitelists del juego (`deps.abilities`, `deps.weapons`, `deps.kinds`, `deps.zones`, `CAM_MODES`).
  - **Colores Hex (`paint`, `trim`, `rim`):** Validar estrictamente con `/^#[0-9a-f]{6}$/i` antes de inyectarlos en atributos `style` o HTML del garaje.
  - **Calcos (`decals`):** Validar con `deps.validDecal` antes de usarlos.
  - **Nombres de perfil (`profiles[i].name`):** Recortar longitud (`.slice(0, 20)`) y nunca interpolarlos en `innerHTML` sin escapar (o asignar con `textContent`).

### 2. Prevención de DOM XSS en UI (`src/menu.ts`, `src/ui.ts`, `src/duel_fabricacion.ts`)
- Evita interpolar strings provenientes de `Save` (como `profile.name`), query params (`location.search`) o archivos importados directamente dentro de `innerHTML`.
- Usa `textContent` para texto de usuario o valida con expresiones regulares estrictas (`isCode = /^[A-Za-z0-9]*$/`, `/^#[0-9a-f]{6}$/i`).

### 3. Importador de Planilla (`scripts/balance-import.mjs`)
- El script recibe volcados TSV externos: debe rechazar cualquier ID inexistente, columna faltante o valor no numérico (`Number.isFinite`) **sin escribir** en `src/balance.json` si hay un solo error.

### 4. Dependencias, Secretos y Publicación (`.github/workflows/pages.yml`, `package.json`)
- **Cero secretos en el repo:** Nunca commitees tokens, claves privadas ni rutas locales sensibles.
- **Rutas relativas:** El build de producción usa `base: "./"`. Verificar que ningún recurso use rutas absolutas ni cargue scripts externos no confiables.
- **Dependencias (`package.json`):** No instalar paquetes npm nuevos sin necesidad real (escalera Ponytail).
