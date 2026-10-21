# Junked Metal: harness, arquitectura y metodología

Guía para que otra persona tome este juego como base, arme su propia versión y siga trabajando con Claude Code.
Estado al 2026-10-12 (commit de este archivo).

---

## 1. Qué es

Survivor.io roguelite web con autos RC en un patio gigante. Además del modo supervivencia tiene ENCORE (expediciones por escenarios, modo principal), Carrera estilo kart, Duelo/Fabricación, Luna, Match-3 y online (récords, salas P2P).

- **Stack:** Babylon.js 9 + Havok (física WASM) + TypeScript + Vite. Sin framework de UI: DOM + CSS a mano.
- **Dependencias de runtime:** `@babylonjs/core`, `@babylonjs/havok`, `@babylonjs/loaders`, fuentes `@fontsource/*`, `@websr/websr` (escalado), `earcut`, `peerjs`.
- **Dev:** `vite`, `vitest`, `typescript`, `playwright` (pruebas headless), `pixelmatch`/`pngjs` (diff de capturas), `exceljs` (planilla de balance), `@gltf-transform/cli` (optimizar GLB).
- **Servidor opcional** (`server/`): Node + SQLite para login, telemetría, récords, admin. Ver `server/README.md`. El juego funciona sin él.

## 2. Arranque rápido

```bash
npm install
npm run dev          # http://localhost:5173/?mute
npm test             # lógica pura, <1 s
npx tsc --noEmit -p .
npm run build        # dist/ (base "./", sirve en cualquier subcarpeta)
```

Opcional pero recomendado (lo usan todas las herramientas de prueba):

```bash
npm i -g pm2
npx playwright install chromium
npm run pm2:start    # rc-dev :5173, rc-demo :4173 (ecosystem.config.cjs)
npm run test:restart # levanta rc-test :5174 (servidor sin recarga para pruebas)
```

URL útiles en dev: `?mute`, `?seed=N`, `?lab` (escena congelada con todos los enemigos), `?race[&players=2]`, `?intro`.

## 3. Arquitectura del código

```
index.html → src/main.ts (bootstrap motor, loop update(), estado de partida)
   ├─ render.ts      PBR, cielo, niebla, escala de render, presets gráficos
   ├─ world.ts / world_layout.ts / zones/   patio 200×200, props, pasto en thin instances
   ├─ car.ts / run_drive.ts                 autos y manejo arcade sobre Havok
   ├─ enemies.ts + enemies/                 definiciones, IA, spawnTable()
   ├─ weapons.ts + weapons/                 armas, pasivas, evoluciones, levelOffers()
   ├─ models.ts + models/                   modelos procedurales e instanciados (template())
   ├─ fx.ts                                 partículas en pool, restos, marcas, impactos
   ├─ run.ts / run_state.ts / run_tick.ts   semilla → clima, plaga, layout, ritmo; tick de partida
   ├─ encore*.ts                            modo ENCORE
   ├─ kart*.ts                              modo Carrera
   ├─ duel*.ts                              Duelo / Fabricación
   ├─ moon*.ts                              modo Luna
   ├─ match3*.ts                            Match-3
   ├─ menu.ts + menu/ , ui.ts, hud_tick.ts  menús, HUD, cartas de mejora
   ├─ audio/ , sfx.ts                       audio 100 % sintetizado
   ├─ net.ts / net_client.ts / coop.ts      online y P2P (PeerJS)
   ├─ savefmt.ts                            guardado y migraciones (probado)
   ├─ balance.json + balance.ts             TODOS los números de balance, tipados
   ├─ rng.ts                                aleatoriedad con semilla
   └─ dev-hooks.ts / devbot.ts              hooks __* y bot (solo en dev)
```

Tabla archivo → rol más detallada: `CLAUDE.md` sección "Mapa del código". Mapa navegable: `graphify-out/` (ver §6).

### Reglas de arquitectura que conviene conservar

1. **Datos de balance fuera del código.** Todo número de juego vive en `src/balance.json`; el código lo lee con `BAL.tabla.id.columna` (tira error si no existe). Ida y vuelta con Google Sheets: `npm run balance:xlsx` / `balance:import`.
2. **Determinismo.** Lo que decide la partida usa `rng()` (`src/rng.ts`); `Math.random` solo para efectos visuales. `?seed=N` reproduce una partida.
3. **Rendimiento.** Enemigos, proyectiles, gemas y marcas son instancias de plantillas fusionadas (nunca mallas sueltas por entidad). Partículas solo del pool de `fx.ts`. Topes: `maxAlive` enemigos, 350 gemas, 240 restos, 500 marcas. Render a baja resolución interna.
4. **Trampas de Havok:** posicionar la malla ANTES de crear el `PhysicsAggregate`; `setMassProperties` reemplaza todo (masa + inercia juntas, usar `Car.setMass`); no mover `centerOfMass` en cuerpos con velocidad fijada cada frame.
5. **Hooks de dev** (`__tick`, `__sim`, `__bot`, `__god`, `__info`, `__lab`, `__look`…) solo existen con `import.meta.env.DEV`; las pruebas headless dependen de ellos.

## 4. Harness de pruebas (todo headless, por línea de comandos)

Un Chromium headless de Playwright con la GPU real (banderas ANGLE/Metal en `scripts/lib/browser.mjs`) contra el servidor `rc-test` :5174. El bucle de dibujo se congela y avanza a 1/60 s por cuadro para que dos corridas den lo mismo.

| Para | Comando |
|---|---|
| Lógica pura (balance, guardado, XP, encore, match3…) | `npm test` (`test/*.test.ts`), `npm run test:server` |
| Balance: el bot juega sin dibujar | `npm run sim -- --seeds 1,2,3 --secs 600`; duelos: `npm run sim -- --duel perro,aspiradora --seeds 1,2` |
| Capturas de menús, partida, carrera (pc 1280×720 y celu 390×844) | `npm run shots` → `.shots/actual/`; `-- --diff` contra `.shots/ref/`; `-- --update` acepta; `-- --changed` solo lo afectado por `git diff` |
| Rendimiento (ms/cuadro, draws, triángulos, heap) | `npm run perf` → `.perf/*.json`, compara con la medición anterior |
| E2E de una expedición ENCORE | `npm run e2e -- --vp pc,cel` |
| Diagnóstico del entorno | `npm run doctor` / `doctor:fix` |
| Publicar (tests, build, e2e, deploy, chequeos) | `npm run publicar -- --seco` para ver qué haría |

Escenarios de capturas/perf: `scripts/scenarios.mjs` (agregar uno = agregar un objeto). Qué sesiones toca cada archivo: `scripts/lib/changed.mjs`.
En git worktrees cada uno tiene su servidor `rc-test-<carpeta>` (puertos 5200-5299): `npm run test:restart` / `test:down` / `test:ls`.

**Filosofía:** probar en proporción al cambio. Siempre `tsc`; lógica → `vitest --changed`; visual → `shots --changed`; balance → `sim` con 1-2 semillas; `build` solo antes de push. Suites completas solo para renovar referencias. Hacer todos los cambios de la tanda y probar UNA vez al final.

## 5. Metodología de trabajo con Claude Code

El archivo maestro es **`CLAUDE.md`** (raíz): Claude lo lee al arrancar. Resumen:

1. **Entender con graphify primero** (`graphify query "…"`, `path`, `explain`) antes de grep o de leer archivos enteros.
2. **Construir con ponytail** (plugin, en `.claude/settings.json`): YAGNI → reusar lo existente → stdlib/plataforma → dependencia instalada → mínimo código. Atajos deliberados con comentario `ponytail:` y su techo. `/ponytail-review` antes de cerrar algo grande.
3. **Orquestar** (skill `orquestar`): la sesión principal reparte, integra y verifica; los encargos a subagentes son autocontenidos (plantillas en `.claude/trabajo/ARRANQUE.md`: tarea, objetivo observable, archivos que posee, exclusiones, validación, evidencia).
4. **Criterios AME** (`docs/AME_MASTER_PROMPT.md`): 0 dependencias/servicios/abstracciones nuevas por defecto; listar todo lo que un cambio alcanza antes de editar; extracciones de a una responsabilidad; al cerrar separar *implementado / verificado / observado / pendiente / hipótesis*.
5. **Decisiones del usuario** con la herramienta AskUserQuestion (hasta 4 preguntas × 4 opciones, recomendada primero). Sin preguntar si no hay dudas reales.
6. **Tablero:** `docs/todos/` (un archivo por TODO, método repo-vivo; `npm run todos` genera `docs/todos/README.md`; `npm run todos -- encargo <slug>` imprime el encargo). Problemas ajenos se anotan ahí como TODO, no se arreglan de paso. Reglas por tema en `.claude/rules/` y guardarraíles en `.claude/hooks/` (ver `.claude/settings.json`).
7. **Cierre de sesión:** actualizar `docs/traspaso/HANDOFF.md` con lo hecho y lo abierto.

### Dirección de arte y textos

- `docs/ART_DIRECTION.md` (sección Vigente) manda: día estilo Megabonk, mundo "Folded" de chatarra industrial, HUD de paneles oscuros con borde naranja, fuente Rajdhani, tokens CSS `--jm-*`. Nada de emojis ni UI genérica.
- Textos del juego en español neutro impersonal ("Presiona", no "Presioná").
- Para cambiar la identidad de tu versión, empezar por ese archivo, `DESIGN.md` y `PRODUCT.md`.

## 6. Qué viaja en git

Desde 2026-10-21 el harness está versionado en el repo público: `.claude/settings.json` (permisos y hooks), `.claude/hooks/`, `.claude/rules/`, `.claude/skills/` (orquestar, repo-vivo, encargar, cerrar-tanda), `.claude/agents/` (estudio-*, sonnet-bajo, opus-bajo, revisor, interprete) y toda la documentación de traspaso (`docs/traspaso/`, `docs/todos/`, `docs/decisiones/`). `CLAUDE.md` sigue sin versionar (lo reemplazan `AGENTS.md` + `docs/traspaso/INDICE.md` para cualquier agente); `graphify-out/` y `.claude/trabajo/` tampoco.

No incluidos (se regeneran): `node_modules/`, `dist/`, `.shots/`, `.perf/`, `.e2e/`, `.verificar/`, `logs/`, `.claude/worktrees/`, credenciales `.env*.local`.

### Instalar en otra máquina

```bash
npm install && npx playwright install chromium
pip install graphifyy && graphify update .
npm run hooks:install          # pre-commit: tablero + docs:check
cp -R .claude/skills/* ~/.claude/skills/   # opcional: skills también a nivel usuario
```

La memoria del dueño ya viene curada en `docs/traspaso/memoria/`; no hace falta copiar la memoria personal de Claude. El plugin ponytail se instala solo al abrir el proyecto (marketplace declarado en `.claude/settings.json`).

## 7. Hacer tu propia versión

1. Crear repo nuevo con este contenido; cambiar `name` en `package.json`, título en `index.html`, `public/manifest*`, y el `base`/destino de `.github/workflows/pages.yml`.
2. Quitar o reapuntar lo online: `src/net.ts` (URL de la VPS), `server/`, `scripts/publicar.mjs` (deploy a VPS/Worker propios). Sin servidor el juego corre igual.
3. Reescribir `docs/ART_DIRECTION.md`, `PRODUCT.md` y la sección de dirección de arte de `CLAUDE.md` con tu identidad; Claude las sigue.
4. Ajustar balance en `src/balance.json` (o por la planilla) y verificar con `npm run sim`.
5. Renovar referencias visuales una vez: `npm run shots -- --update`.
6. Primer mensaje sugerido a Claude:

```
Seguimos el proyecto. Lee CLAUDE.md y docs/HARNESS.md. Usa graphify para entender
el código antes de tocarlo. Objetivo de hoy: <…>.
```
