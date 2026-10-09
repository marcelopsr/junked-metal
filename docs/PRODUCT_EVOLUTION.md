# Junked Metal — Registro Persistente de Evolución de Producto

**Metodología activa:** `EXPLORE → UNDERSTAND → DISCOVER → IMAGINE → PROPOSE → DISCUSS → DECIDE → IMPLEMENT → VALIDATE → REFINE → DOCUMENT → LEARN → NEW DISCOVERY ↺`  
**Última actualización:** 2026-10-09 (Ciclos #1, #2, #3, #4 y #5 completados y validados · Ciclo #6 iniciado)

Este documento conserva la inteligencia acumulada del producto entre ciclos y sesiones: estado actual de cada módulo, evaluaciones de calidad, decisiones aprobadas, ideas descartadas o pospuestas, backlog vivo de oportunidades y el checkpoint de continuidad.

---

## 1. Fichas de Estado por Módulo y Superficie

| Módulo / Modo | Archivos clave | Estado actual | Calidad Visual / Técnica | Notas clave |
|---|---|---|---|---|
| **Supervivencia (Core)** | `src/main.ts`, `src/enemies.ts`, `src/weapons.ts`, `src/run.ts`, `src/folded_slice.ts`, `src/fx.ts`, `src/replay.ts` | Producción activa | Partida, Cartas, Pausa, Cámara lenta (`#outro`) y Resultados (`#scr-over`): 9/10 · Perf PC: `lab-noche` 189 draws (`6.2 ms`), `partida_llena` 205 draws (`8.9 ms`) | En Ciclo #5 se sumaron escenarios deterministas de `outro` y `resultados` en PC y celular, se corrigió el bug de gradientes SVG ocultos (`#hud.hidden`), se migró la Polaroid a `Rajdhani` determinista y se ajustó la grilla de `#scr-over` sin truncados ni desbordes. |
| **HUD y Menús (`kit.css`)** | `src/kit.css`, `src/ui.ts`, `src/menu.ts`, `src/menu.css`, `src/hud.css`, `src/menuscene.ts` | Producción activa | Portada/Garaje/Taller/Cartas/Pausa/Resultados: 9/10 | Pendiente de refinamiento UX: submenús de lanzamiento (`#scr-race`, `#scr-play`, `#scr-daily`) y pestañas secundarias de Chatarroteca (`Pilotos`, `Logros`, `Estadísticas`). |
| **Carrera y Batalla (`kart.ts`)** | `src/kart.ts`, `src/race.css`, `src/world.ts` | Producción activa | Largada, Curso y Podio 3D unificados con Folded: 9/10 · Perf PC: `largada` 249 draws (`7.6 ms`), `curso` 293 draws (`6.6 ms`) | En Ciclo #5 se migró el podio (`buildPodium`) a bloques `FOLD.painted` con tapa de acero, faja `TRIM.hazard`, placas `1/2/3` bien orientadas y encuadre centrado en PC y celular (`pc-carrera-podio.png`, `cel-carrera-podio.png`). Pendiente: grilla compacta y tiempos objetivo de medalla en `#scr-race`. |
| **Junket Crush (`match3`)** | `src/match3*.ts`, `src/match3.css` | Producción activa (carga perezosa) | Juego y Gabinete: 8.5–9/10 · Perf: 77 draws | En Ciclo #3 se eliminaron las masas verdes del patio detrás del gabinete (`showWorld(false)` en `startMatch3`), se normalizó el UV planar lateral a `[0..1]` con `CLAMP_ADDRESSMODE`, se sumaron chapas de roce en joystick/botón y se alineó el póster `"GOOD METAL / BRIGHTER DAYS"`. |
| **Mundo y Sistema Folded 2.5D** | `src/folded.ts`, `src/folded_slice.ts`, `src/kit3d.ts`, `src/world.ts` | Activo por defecto (`FOLDED_SLICE = true`) | Fase A + B + C 100% completadas: 9/10 | En Ciclo #5 se completaron `brickWalls` (`FOLD.painted` + `crateFold`) y `buildPodium`, cerrando el 100% de la migración visual Folded 2.5D. Pendiente técnico: podar el chunk muerto `@babylonjs/loaders/glTF/2.0` (`542 kB`) cuando `FOLDED_SLICE = true`. |
| **Demolición (`duel`)** | `src/duel*.ts`, `src/duel*.css` | Pausado / Descontinuado (2026-10-08) | Fuera de iteración activa | Carga perezosa (`loadDuel()`). No priorizar salvo pedido explícito del usuario. |

---

## 2. Decisiones Aprobadas vs. Ideas Descartadas (No Reabrir)

### Decisiones Aprobadas (Invariantes)
- **Dirección de arte vigente (2026-10-08):** Día estilo Megabonk + mundo Folded 2.5D (chatarra industrial plegada con volumen 360°) + UI de paneles de chapa oscura opaca con borde naranja gastado (`--jm-*`, `Rajdhani`).
- **Aislamiento económico de modos laterales:** Carrera, Junket Crush y Demolición **no dan tornillos ni logros** de Supervivencia.
- **Pantalla dividida 2J:** Exclusiva de escritorio (PC); nunca en teléfono/táctil.
- **Ritmo de Supervivencia:** 10 minutos clásicos con rampa temprana más contenida (0–180 s) para dar peso a las mejoras del garaje/taller sin trivializar el late-game.
- **Logros con recompensa única:** Cada logro entrega su propia pieza o premio sin duplicados (`9f4def2`).
- **Ciclo #1 (Aprobado e implementado 2026-10-08, `ece32c1`):** Ejecución conjunta de las 3 propuestas (1: Composición en Supervivencia + Chatarroteca con `beastIcon`; 2: Carrera Folded + fachada de ladrillo de la casa; 3: Macetas, gnomos y restos `debris` Folded).
- **Ciclo #2 (Aprobado e implementado 2026-10-08, `b46c6a1`):** Propuesta 1 (Claridad en Partida: Cartas de Nivel sin solapar `#txl`, indicador de sinergia de evolución/fusión `.syn` en PC y celular, y Pausa sin `#hint` traslúcido + daño en vivo por arma).
- **Ciclo #3 (Aprobado e implementado 2026-10-09, `478deb8`):** Propuesta 1 (Calidad Impeccable en Escenas de Menú y Gabinete Junket Crush: `showWorld(false)` en `startMatch3` eliminando las masas verdes laterales, UVs normalizados `[0..1]` y chapas de roce en el gabinete, lámpara/mesa/cajonera/transmisor Folded en `menuscene.ts`, póster `"GOOD METAL / BRIGHTER DAYS"` y limpieza de transiciones DOM).
- **Ciclo #4 (Aprobado e implementado 2026-10-09, `85c3a23`):** Propuesta 1 (Claridad y Encuadre en Garaje y Taller 720p: cifras reales y barras `.stb` con riel oscuro en autos del Garaje, sinergia de evolución `.wsyn` en `ARMA` inicial y en `#sinfo` del Taller, grilla `3×3` sin fila huérfana en PC 720p, grilla de 2 columnas y filtros sin truncado en celular, y alto contraste de chapa oscura para `.perk.no`).
- **Ciclo #5 (Aprobado e implementado 2026-10-09):** Propuesta 1 (Cierre de Partida `#scr-over` / `#outro`, solución de gradientes SVG con ID único en `src/icons.ts`, Polaroid en `Rajdhani` con papel determinista, podio 3D Folded `buildPodium`, muros rompibles `brickWalls` Folded y cobertura headless de `outro`, `resultados` y `podio`).

### Ideas Descartadas o Congeladas (No volver a proponer sin nueva razón)
- **Economía compartida / tornillos en modos laterales:** Descartado explícitamente (2026-10-08).
- **Identidad de build en Supervivencia (`docs/SURVIVAL_BUILD_IDENTITY.md`):** Descartada (2026-10-06); sin sesgo dinámico de mazo por etiquetas.
- **Enemigos que temen el faro:** Descartado explícitamente.
- **Maldiciones:** Ocultas por ahora (código intacto, no reactivar sin decisión del usuario).
- **Iteraciones en modo Demolición:** Modo descontinuado en la evaluación del 2026-10-08 (`docs/VISUAL_QUALITY.md`).

---

## 3. Historial de Ciclos Completados

### Ciclo #1 (2026-10-08) — Calidad Visual, Integración Folded y Chatarroteca (`ece32c1`)
- **Alcance implementado:** `beastIcon` (13 siluetas SVG), `#records` exclusivo de `Estadísticas`, `#banner` superior compacto, `#hint` auto-oculto a 7 s, `contactShadows()` por thin-instance (1 draw call), tonos diferenciados y articulaciones en bichos/jefes, fachada de ladrillo `brick` en la casa de fondo, circuito de Carrera en `FOLD` y `potFold`/`gnomeFold`/`debris` Folded.
- **Evidencia de validación:** `tsc --noEmit`, `npm test` (46/46), `npm run build`, 75 capturas con `npm run shots` y `npm run perf`.

### Ciclo #2 (2026-10-08) — Claridad en Partida: Cartas de Nivel, Sinergias y Pausa en Vivo (`b46c6a1`)
- **Alcance implementado:** Ocultación automática de `#hint` y `#txl` con `#levelup` o `#fe` abiertos, sello `.syn`/`.syn.on` de evolución/fusión en cartas de mejora (PC y celular), y daño en vivo + porcentaje por arma en Pausa (`#kitW`).
- **Evidencia de validación:** `tsc --noEmit`, `npm test` (46/46), `npm run build`, `npm run shots -- --only partida` y `graphify update .`.

### Ciclo #3 (2026-10-09) — Escenas de Menú Folded, Gabinete Junket Crush y Limpieza DOM (`478deb8`)
- **Alcance implementado:** `showWorld(false)` en `startMatch3` y `worldTask` (eliminando las masas verdes detrás del gabinete), normalización de UVs laterales `[0..1]` con `CLAMP_ADDRESSMODE` y chapas de roce en el gabinete, migración de `benchBuild()` y `transmitter()` a `wornMat` Folded en `menuscene.ts`, póster `"GOOD METAL / BRIGHTER DAYS"` y limpieza de antipatrones DOM (`#overPhotoImg`, `hud.css`, `kit.css`).
- **Evidencia de validación:** `tsc --noEmit`, `npm test` (46/46), `npm run build`, `npm run shots -- --only menu,match3` (56 capturas) y `graphify update .`.

### Ciclo #4 (2026-10-09) — Claridad en Garaje, Sinergias en ARMA y Grilla/Contraste en Taller 720p (`85c3a23`)
- **Alcance implementado:** Cifras reales en amarillo (`150`, `54`, `×3`, etc.) sobre barras `.stb` en autos del Garaje, bloque `.wsyn` con receta de evolución en `ARMA` y en `#sinfo` del Taller, grilla `3×3` simétrica en el Taller de PC (`2×N` en celular) y tarjetas `.perk.no` con fondo de chapa oscura opaco.
- **Evidencia de validación:** `tsc --noEmit`, `npm test` (46/46), `npm run build`, `npm run shots -- --only garaje,taller` (26 capturas) y `graphify update .`.

### Ciclo #5 (2026-10-09) — Cierre de Partida (`#outro` / `#scr-over`), Íconos SVG con ID Único y Fin de Fase C Folded
- **Alcance implementado (Propuesta 1):**
  - Solución definitiva de íconos SVG invisibles en `#scr-pause` y `#scr-over` (`uid` incremental por instancia de `<linearGradient>` en `src/icons.ts`).
  - Polaroid de fin de partida en `Rajdhani` con granulado determinista (`src/replay.ts`), ocultación de `#banner` y `#touch` durante `#outro` y `#race.podium`, y grilla de `#scr-over` con especificidad corregida (`#fe #overDmg li` y `#scr-over .overGrid`) para entrar sin truncados ni scroll en PC (1280×720) y celular (390×844).
  - Podio 3D de Carrera (`buildPodium` en `src/kart.ts`) en bloques `FOLD.painted` con tapa de acero `FOLD.bare()`, banda `TRIM.hazard`, placas `1/2/3` orientadas a cámara, foco `setLamp` y encuadre centrado sobre la tarjeta de resultados; más muros rompibles (`brickWalls` en `src/world.ts`) en `FOLD.painted` + `crateFold`.
  - Cobertura determinista agregada en `scripts/scenarios.mjs`: `outro` y `resultados` en `partida` (eliminando el `// ponytail:` pendiente) y `podio` en `carrera`.
- **Evidencia de validación:** `tsc --noEmit`, `npm test` (46/46), `npm run build`, `npm run shots -- --only partida,carrera` (15 capturas verificadas visualmente en PC y celular) y `graphify update .`.

---

## 4. Backlog Vivo de Oportunidades — Ciclo #6

### A. Lente de Experiencia (UX/UI) en Submenús de Lanzamiento (`#scr-race`, `#scr-play`, `#scr-daily`)
1. **Grilla Compacta, Metas de Medalla en Carrera y Ficha Previa de Misión en Supervivencia/Diario (`index.html`, `src/menu.ts`, `src/menu.css`, `src/kart.ts`):**
   - **Problema actual:**
     - En `#scr-race` (*Carrera*), se apilan hasta 11 botones en una sola columna vertical (`Largada`, `Batalla de globos`, `Jugadores`, `Control J1`, `Control J2`, `Auto J2`, `Cilindrada`, `Vueltas`, `Modo`, `Pista`, `Volver`) y el pie `#rcHelp` vuelca un párrafo corrido sin mostrar las **metas de tiempo para medalla de Oro, Plata y Bronce** (`medalTimes` en `src/kart.ts`) de la pista elegida (que hoy el jugador solo descubre al cruzar la meta).
     - En `#scr-play` (*Supervivencia*) y `#scr-daily` (*Desafío diario*), antes de largar no se muestra la **mejor marca personal de la zona elegida** (`save.stats.zone[save.zone]`), ni las condiciones de la semilla del día en el Desafío Diario (`clima · plaga dominante · primer minijefe`), ni el resumen del equipamiento activo (`Auto · Piloto · Arma · Habilidad`).
   - **Propuesta:** Organizar `#scr-race` en una grilla compacta de 2 columnas con una barra clara de récords y tiempos objetivo (`Oro / Plata / Bronce`) para la pista y cilindrada activas; y sumar en `#scr-play` y `#scr-daily` una banda compacta de **Ficha de largada** con el equipamiento actual, el récord de la zona y el pronóstico del Desafío Diario.

### B. Lente de Simplificación y Rendimiento de Empaquetado (Bundle Size)
2. **Poda del Chunk GLTF Loader (`542 kB`) bajo `FOLDED_SLICE` (`src/glb.ts`, `src/carGlb.ts`):**
   - **Problema actual:** Con `FOLDED_SLICE = true`, el 100% de los 8 autos (`carHull`) y los 13 enemigos/jefes (`PROC` + `PETS`) se construyen y hornean proceduralmente sin descargar ningún `.glb`, pero Vite sigue emitiendo `dist/assets/2.0-*.js` (`542.16 kB`, `128.11 kB` gzip) y `glTFLoaderAnimation.pure-*.js` (`23.59 kB`) porque el cortocircuito en `src/glb.ts` (`if (o.proc)`) depende de una mutación en tiempo de ejecución que el empaquetador no puede podar estáticamente.
   - **Propuesta:** Cortocircuitar estáticamente con `if (FOLDED_SLICE)` antes de `await import("@babylonjs/loaders/glTF/2.0")` en `src/glb.ts` y `src/carGlb.ts` para que Rollup/Rolldown elimine por completo los ~565 kB de chunks muertos de carga GLTF del build de producción.

### C. Lente de Calidad Visual en Chatarroteca (`Pilotos`, `Logros`, `Estadísticas`)
3. **Refinamiento Visual y Cobertura de las Pestañas `Pilotos`, `Logros` y `Estadísticas` (`src/menu.ts`, `src/menu.css`, `scripts/scenarios.mjs`):**
   - **Problema actual:** Mientras la pestaña `Bichos` ya tiene siluetas `beastIcon` y barras con riel `.stb`, en `Pilotos` las tarjetas bloqueadas no indican cómo se desbloquean (`costo en tornillos` o `logro requerido`) ni destacan el piloto `EN USO`; en `Logros` todas las tarjetas repiten el mismo ícono genérico `evo` en lugar de usar íconos acordes y mostrar el progreso numérico cuando aplica; y en `Estadísticas` las filas de `Bajas por tipo` y `Arma favorita` carecen de íconos SVG (`beastIcon` / `icon`) y barras `.stb`.
   - **Propuesta:** Incorporar íconos SVG, estado `EN USO` / condición de desbloqueo en `Pilotos`, progreso e íconos específicos en `Logros`, barras `.stb` con miniaturas en `Estadísticas`, y sumar capturas headless de estas vistas en `scripts/scenarios.mjs`.

---

## 5. Checkpoint de Sesión Actual

- **Último trabajo completado:** Implementación y validación visual de la **Propuesta 1 del Ciclo #5** (cierre de partida `#outro` / `#scr-over`, corrección de gradientes SVG ocultos con `uid` único en `src/icons.ts`, Polaroid en `Rajdhani` determinista, podio 3D Folded `buildPodium`, muros rompibles `brickWalls` Folded y nuevos escenarios deterministas `outro`, `resultados` y `podio` en `scripts/scenarios.mjs`).
- **Estado de validación:** `npx tsc --noEmit -p .`, `npm test` (46/46), `npm run build`, `npm run shots -- --only partida,carrera` (15 capturas verificadas visualmente en PC y celular) y `graphify update .` completados sin errores.
- **Lente activa del Ciclo #6:** *Experiencia (UX/UI) en Submenús de Lanzamiento (`#scr-race`, `#scr-play`, `#scr-daily`), Simplificación del Build (Poda del chunk GLTF de 542 kB) y Calidad en Pestañas Secundarias de Chatarroteca (`Pilotos`, `Logros`, `Estadísticas`)*.
- **Propuestas activas para decisión del usuario (Ciclo #6):**
  1. *(Recomendada)* **Submenús de Lanzamiento (`#scr-race`, `#scr-play`, `#scr-daily`): Grilla Compacta, Metas de Medalla y Ficha de Largada**.
  2. **Simplificación del Build: Poda Estática del Chunk GLTF Loader (`542 kB`) bajo `FOLDED_SLICE`**.
  3. **Chatarroteca Completa: Claridad Visual e Íconos en `Pilotos`, `Logros` y `Estadísticas` + Cobertura Headless**.
- **Próxima decisión necesaria:** Selección del usuario sobre cómo avanzar en el Ciclo #6.
