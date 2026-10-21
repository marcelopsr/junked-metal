# Handoff de sesión — Junked Metal (12-10-2026, noche)

Para retomar con **Claude o Gemini** con la misma forma de trabajo. Autocontenido: no depende de `.claude/` (Gemini no debe leerlo ni tocarlo).
Contexto general del proyecto: `docs/HANDOFF-PROYECTOS.md`, `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` según el modelo.

## 1. Estado del repo

- **Producción y `master`:** commit `66ecd10` (publicado con `npm run publicar`, 12 pasos OK, endpoints verificados).
- **Árbol de trabajo SIN commitear** (31 archivos, +385/−43, más archivos nuevos). Compila (`npx tsc --noEmit -p .` = 0 errores) y `npx vitest run` = 150/150. Contiene:
  - **Terminado y verificado** (tsc, test, build, e2e pc+cel):
    - Muñeco de Ventrílocuo (2º minijefe del desván, `src/enemies/ai/muneco.ts`; el desván sortea payaso/muñeco por semilla).
    - La Pileta Vacía (`src/zones/pileta.ts`, comprable a 1800 + variante ENCORE) con minijefe El Limpiafondos (`src/enemies/ai/limpiafondos.ts`). Ajuste de abismo en `run_drive.ts` para que el pozo sea jugable.
    - Gemas de la Lluvia de tornillos caen del cielo con estela (solo visual; sim idéntica).
    - 4 pilotos nuevos (Abuela de Porcelana, Astronauta de Plástico, Dinosaurio de Goma Mordida, Muñeca Rusa) con retratos en `public/images/pilots/`.
    - 3 vehículos nuevos (`hover` Capitán de Bañera, `topadora` El Capataz, `triciclo` El Repartidor). Monster y Fórmula ya existían.
    - Armas lote A1: `burbujas`, `matamoscas`, `dardos`, `chapitas` (archivo por arma en `src/weapons/`).
    - Rebalance tras A1: dardos/burbujas/matamoscas más fuertes y `dureza_dano` 4→3.2 → bot 6/12 (y 11/24 = 46 %).
  - **A MEDIAS (agentes detenidos):**
    - **Armas lote A2:** `src/weapons/{paraguas,cohete,serpentinas,tambor}.ts` + registro (`src/weapons.ts`, `src/weapons/base.ts`) + filas en `balance.json` + cambio en `src/weapons/offers.ts` (peso de ofertas: favorecer subir armas propias). **Sin sim ni e2e.** Revisar el diff de `offers.ts` y terminar o revertir esas 4 armas.
    - **Revisión visual:** tocó `src/menuscene.ts`, `src/run_loader.ts`, `src/world.ts`, `src/zones/common.ts` (diffs chicos). Objetivo: modelo 3D del garaje tapado por una caja; gemas que flotan a y=0 en el pozo de la pileta; agua sucia del Limpiafondos con modelo de tuerca; trampolín liso. **Sin verificar.** Revisar esos diffs.
- **Antes de publicar:** terminar/revertir lo a medias → `npx tsc --noEmit -p .` → `npm run test:all` → `npm run sim -- --seeds 1,...,24 --secs 600 --par 4` (40-60 % victorias) → `npm run publicar` (hace build, e2e, deploy, chequeos, commit y push).

## 2. Forma de trabajo (pedidos de Marcelo, obligatorios)

- **Idioma:** español. Textos del juego: español neutro impersonal, sin voseo (ART_DIRECTION).
- **Preguntas:** solo con la herramienta de opción múltiple (AskUserQuestion / AskQuestion). Hasta 4 preguntas × 4 opciones, recomendada primera "(Recomendado)", cada opción con qué incluye, costo/riesgo y archivos. Preferir multiselección.
- **Rondas de 16 TODOs:** 4 preguntas × 4 opciones. Cuando la cola de construcción baja a **8**, lanzar otra ronda de 16 (el doble, por si tarda en contestar).
- **Paralelismo: de a 2 agentes a la vez** (último pedido; antes eran 3). Archivos disjuntos. **Un solo agente a la vez en `src/main.ts`.**
- **Subagentes solo de esfuerzo bajo** (Claude: `*-bajo`; Gemini: Flash/Flash-Lite low). Si se lanza uno de esfuerzo mayor por error, detenerlo y relanzar.
- **Pruebas no son TODOs:** son parte del proceso. Al terminar algo se encolan sus pruebas solas; producen hallazgos. Hallazgo crítico/alto → su arreglo entra solo a construcción; medio/bajo → se ofrece en la próxima ronda.
- **Publicar es parte del proceso:** `npm run publicar` al cerrar una tanda sin hallazgos críticos.
- **Trabajar en local**; no publicar artifacts; no rutinas en la nube; navegador: Playwright headless (no Claude in Chrome).
- **Credenciales:** lo que necesite credenciales de Marcelo queda pausado (T27 mail real, alertas por correo).
- **No le interesan ahora:** espectadores (tope 10 por sala; no seguir).

## 3. Cómo se verifica cada cambio (gate)

- `npx tsc --noEmit -p .` · `npm test` (o `npm run test:all` = vitest + server en paralelo) · `npm run build` · `npm run e2e -- --vp pc,cel`.
- **Refactors:** sim idéntica antes/después: `npm run sim -- --seeds 1,2,3 --secs 300` (guardar la base ANTES de editar).
- **Contenido que cambia el juego:** sim de 12-24 semillas a 600 s; objetivo 40-60 % de victorias; ninguna arma nueva > 3x la mediana de daño.
- **Balance:** editar `src/balance.json` y después `npm run balance:xlsx` + `npm run balance:check` (si no, un import posterior pisa el JSON).
- **Visual:** `npm run shots -- --diff --only <sesión>`; las referencias de `partida` y `menu` están viejas (cambian 4-50 % por la tanda, no por regresión); `cel-partida-outro` no es determinista.
- Azar: `rng()` de `src/rng.ts` decide la partida; sorteos que no deben mover la partida usan `rngFrom(semilla ^ k)` (ej. eventos de mitad de partida).
- Dev server de pruebas `rc-test` en :5174 con candado; si está ocupado, esperar.

## 4. Arquitectura después de la modularización (hoy)

- `src/main.ts` 899 l (orquestador). Módulos con `initX(ctx)` tipado: `run_loader`, `encore_run`, `run_state` (objeto `run`, `freshRun()`), `hud_tick`, `combat`, `progression`, `camera_rig`, `run_tick`, `run_drive`, `coop`, `outro`, `net_client`, `dev-hooks`.
- `src/menu.ts` 1385 l + `src/menu/{garage_paint,bindings,beast_sheet,beast_data,account}.ts` (sin ciclos de valores).
- `src/world.ts` 128 l + `src/zones/{common,patio,garaje,galpon,desvan,jardin,pileta}.ts`, `world_layout.ts`, `grass.ts`.
- `src/models.ts` fachada + `src/models/{common,cars,enemies}.ts`.
- `src/weapons.ts` fachada/registro + `src/weapons/{base,passives,offers,fusion,<arma>}.ts`. Arma nueva = archivo + línea en `CLASSES` + id en `WeaponId`/`WEAPONS` + `mountFor` + filas en balance.
- `src/enemies.ts` + `src/enemies/ai/<kind>.ts` con tabla `AI` en `ai/index.ts`. Bicho nuevo = DEF + archivo + 1 línea.
- `src/sfx.ts` fachada + `src/audio/{context,effects,music,ambience}.ts`.
- `server/index.js` 113 l + `server/routes/{auth,online,cuenta,admin,ops}.js`; tests `server/test/http.{admin,online,cuenta,ops}.test.js` con `_server.mjs`.
- Tests del juego: `test/` (ENCORE partido en `test/encore/*.test.ts`).

## 5. Cola pendiente (en orden)

1. **Cerrar lo a medias:** armas A2 (+ peso de ofertas) y revisión visual (sección 1).
2. **Armas A3** (4 más → total 12 nuevas) con sim de 24 semillas.
3. **Mejoras (pasivas) P1 y P2:** 12 pasivas nuevas en 2 lotes de 6, combinables con evoluciones/fusiones.
4. Payaso también en el desván normal (con `rngFrom` de zona para no mover otras semillas).
5. Partir `duel.ts`, `kart.ts`, `match3.ts` por dentro (lógica / modelo / HUD).
6. Escena `cel-partida-outro` determinista (congelar con `__tick`).
7. Navegación de menús con mando (pantallas nuevas).
8. Retrato del Muñeco (ComfyUI + `scripts/creative-batch.mjs`) y logros por derrotar Muñeco/Caja/Limpiafondos.
9. Referencias de capturas al día (al final, tras los cambios visuales).
10. Publicar (`npm run publicar`).
- Baja prioridad: cargar el núcleo del juego bajo demanda (ganancia ~10-14 % del chunk; plan de 3 pasos: estado → `run_core.ts` → `loadRun()` en run_loader).
- Pausado: T27 mail real y alertas por correo (credenciales).

## 6. Hallazgos conocidos

- Garaje: el 3D del auto/piloto queda tapado por una caja de la escena (también con autos viejos).
- Pileta: gemas dentro del pozo flotan a y=0; agua sucia usa el modelo de tuerca; trampolín liso.
- `Hover` no flota sobre agua (la física no tiene agua).
- La afinidad de piloto da +1 nivel a la habilidad elegida si coincide con la del piloto.
- Precio del desván (1500) estimado; calibrar con sim.
