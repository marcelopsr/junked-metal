# Junked Metal — Registro Persistente de Evolución de Producto

**Metodología activa:** `EXPLORE → UNDERSTAND → DISCOVER → IMAGINE → PROPOSE → DISCUSS → DECIDE → IMPLEMENT → VALIDATE → REFINE → DOCUMENT → LEARN → NEW DISCOVERY ↺`  
**Última actualización:** 2026-10-09 (Ciclos #1, #2, #3 y #4 completados y validados · Ciclo #5 iniciado)

Este documento conserva la inteligencia acumulada del producto entre ciclos y sesiones: estado actual de cada módulo, evaluaciones de calidad, decisiones aprobadas, ideas descartadas o pospuestas, backlog vivo de oportunidades y el checkpoint de continuidad.

---

## 1. Fichas de Estado por Módulo y Superficie

| Módulo / Modo | Archivos clave | Estado actual | Calidad Visual / Técnica | Notas clave |
|---|---|---|---|---|
| **Supervivencia (Core)** | `src/main.ts`, `src/enemies.ts`, `src/weapons.ts`, `src/run.ts`, `src/folded_slice.ts`, `src/fx.ts` | Producción activa | Partida, Cartas y Pausa refinadas en Ciclos #1–#2 · Perf PC: `lab-noche` 189 draws (`6.2 ms`), `partida_llena` 205 draws (`8.9 ms`) | Aviso `#banner` arriba (`10px`), tutorial auto-oculto a los 7 s, sombras de contacto en 1 draw call, sinergia `.syn` en cartas de nivel y daño en vivo por arma en Pausa. Pendiente: cobertura visual y pulido de `#outro` y `#scr-over` (cierre de partida). |
| **HUD y Menús (`kit.css`)** | `src/kit.css`, `src/ui.ts`, `src/menu.ts`, `src/menu.css`, `src/hud.css`, `src/menuscene.ts` | Producción activa | Portada/Chatarroteca/Garaje/Taller/Cartas/Pausa: 8.5–9/10 | En Ciclo #4 se incorporaron cifras reales (`150`, `54`, `×3`) y barras con riel `.stb` en los autos del Garaje, recetas de evolución `.wsyn` en la pestaña `ARMA`, vista previa enriquecida en Taller y grilla `3×3` de alto contraste en Taller 720p (`2×N` en celular). |
| **Carrera y Batalla (`kart.ts`)** | `src/kart.ts`, `src/race.css`, `src/world.ts` | Producción activa | Largada/Curso unificados con Folded · Perf PC: `largada` 249 draws (`7.6 ms`), `curso` 293 draws (`6.6 ms`) | Casa del fondo en ladrillo cálido (`brick`), pórtico/rampas con `TRIM.hazard`, cartel `START` y cajas `?` en `Rajdhani`, vallas/tribunas en `FOLD`. Pendiente: podio (`buildPodium`) en `FOLD` y encuadre/medallas en el submenú `#scr-race`. |
| **Junket Crush (`match3`)** | `src/match3*.ts`, `src/match3.css` | Producción activa (carga perezosa) | Juego y Gabinete: 8.5–9/10 · Perf: 77 draws | En Ciclo #3 se eliminaron las masas verdes del patio detrás del gabinete (`showWorld(false)` en `startMatch3`), se normalizó el UV planar lateral a `[0..1]` con `CLAMP_ADDRESSMODE`, se sumaron chapas de roce en joystick/botón y se alineó el póster `"GOOD METAL / BRIGHTER DAYS"`. |
| **Mundo y Sistema Folded 2.5D** | `src/folded.ts`, `src/folded_slice.ts`, `src/kit3d.ts`, `src/world.ts` | Activo por defecto (`FOLDED_SLICE = true`) | Banco `?folded` y escenas de menú: 8.5–9/10 | Criaturas, jefes, 8 autos RC, cajas, latas, herramientas, regadera, macetas (`potFold`), gnomos (`gnomeFold`), manguera, restos (`debris`) y mesa de taller (`benchBuild`) en Folded. Pendiente final de Fase C: muros de ladrillo rompibles (`brickWalls`) y podio. |
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
- **Ciclo #4 (Aprobado e implementado 2026-10-09):** Propuesta 1 (Claridad y Encuadre en Garaje y Taller 720p: cifras reales y barras `.stb` con riel oscuro en autos del Garaje, sinergia de evolución `.wsyn` en `ARMA` inicial y en `#sinfo` del Taller, grilla `3×3` sin fila huérfana en PC 720p, grilla de 2 columnas y filtros sin truncado en celular, y alto contraste de chapa oscura para `.perk.no`).

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

### Ciclo #4 (2026-10-09) — Claridad en Garaje, Sinergias en ARMA y Grilla/Contraste en Taller 720p
- **Alcance implementado (Propuesta 1):**
  - Cifras reales en amarillo (`150`, `54`, `×3`, etc.) sobre barras de progreso con riel oscuro completo (`.stb` en `src/menu.ts`, `src/menu.css`, `src/kit.css`) para las 3 estadísticas de cada auto en el Garaje (y riel oscuro extendido también a las barras de Chatarroteca y Ficha de bicho).
  - Bloque `.wsyn` con ícono SVG y receta de evolución (`Evoluciona con [Pasiva] → [Evolución]`) en cada arma inicial de la pestaña `ARMA` del Garaje y en `#sinfo` del Taller (`ARSENAL` y `AUTOS`).
  - Grilla `3×3` simétrica en el Taller de PC (`repeat(3, minmax(210px, 256px))`), eliminando la fila huérfana de `CHASIS` y los títulos partidos en 2 líneas; grilla de 2 columnas y pestañas/filtros sin truncado en celular (`cel-menu-taller.png`); y tarjetas `.perk.no` con fondo de chapa oscura opaco (`rgba(11, 15, 20, .92)`) y alto contraste tipográfico.
- **Evidencia de validación:** `tsc --noEmit`, `npm test` (46/46), `npm run build`, `npm run shots -- --only garaje,taller` (26 capturas verificadas visualmente en PC y celular) y `graphify update .`.

---

## 4. Backlog Vivo de Oportunidades — Ciclo #5

### A. Lente de Calidad, Integración Folded (Fase C) y Cobertura de Cierre
1. **Pantalla de Resultados (`#scr-over` / `#outro`), Escenario Headless y Cierre de Fase C Folded (`src/menu.css`, `src/kit.css`, `src/replay.css`, `src/kart.ts`, `src/world.ts`, `scripts/scenarios.mjs`):**
   - Resolver la deuda `// ponytail: shot de resultados/outro pendiente` en `scripts/scenarios.mjs:164` agregando las capturas deterministas de cámara lenta (`#outro`) y reporte de fin de partida (`#scr-over`) en PC y celular, y refinar visualmente `#scr-over` / `#outro` (tipografía industrial `Rajdhani` en `#outro`, riel completo en barras de `#overDmg` / `#overHurt`, marco de la Polaroid y proporción de tarjetas en 720p y móvil).
   - Completar los dos últimos elementos de la Fase C Folded: el podio 3D de Carrera (`buildPodium` en `src/kart.ts:931`, pasando de `M.plastic` liso a bloques de chapa plegada `FOLD.painted` con banda `TRIM.hazard` y placas de puesto `1 / 2 / 3`) y los muros de ladrillo rompibles del patio (`brickWalls` en `src/world.ts:860` con `FOLD.painted`).

### B. Lente de Experiencia (UX/UI) en Submenús de Partida y Carrera
2. **Encuadre Compacto, Récords y Medallas en `#scr-race` y `#scr-play` (`index.html`, `src/menu.ts`, `src/menu.css`, `src/kit.css`):**
   - En la pantalla previa de **Carrera** (`#scr-race`), hoy se apilan 11 botones en una sola columna vertical (`Largada`, `Batalla de globos`, jugadores, controles, cilindrada, vueltas, copa, pista, volver) sin mostrar los tiempos objetivo de medalla (`oro / plata / bronce`) ni el mejor tiempo personal de la pista elegida (que hoy solo aparecen al terminar la carrera). Organizar los selectores de configuración en una grilla compacta de 2 columnas y mostrar en el pie `#rcHelp` el récord personal y las metas de medalla de la pista actual.
   - En la pantalla previa de **Supervivencia** (`#scr-play`), mostrar bajo la descripción de la zona elegida (`Patio`, `Garaje`, `Jardín`) la mejor marca personal registrada (`tiempo · bajas`) para dar contexto inmediato antes de largar.

### C. Lente de Simplificación y Rendimiento de Empaquetado
3. **Poda del Chunk GLTF Loader (`542 kB`) bajo `FOLDED_SLICE` (`src/glb.ts`, `src/carGlb.ts`):**
   - Con `FOLDED_SLICE = true`, el 100% de los autos (`carHull`) y los 13 enemigos/jefes (`PROC` + `PETS`) se construyen y hornean proceduralmente sin descargar ningún `.glb`, pero las ramas inalcanzables de `src/glb.ts` y `src/carGlb.ts` conservan `import("@babylonjs/loaders/glTF/2.0")`, forzando a Vite a emitir un chunk `2.0-*.js` de `542.16 kB` (`128 kB` gzip). Aislar o eliminar esa dependencia muerta limpia el build de producción sin tocar la lógica ni el determinismo.

---

## 5. Checkpoint de Sesión Actual

- **Último trabajo completado:** Implementación y validación visual de la **Propuesta 1 del Ciclo #4** (cifras reales `150 / 54 / ×3` y barras con riel oscuro `.stb` en autos del Garaje, sinergia de evolución `.wsyn` en la pestaña `ARMA` y en `#sinfo` del Taller, grilla `3×3` sin fila huérfana en PC 720p, grilla de 2 columnas y filtros sin truncado en celular, y alto contraste de chapa oscura para `.perk.no`).
- **Estado de validación:** `npx tsc --noEmit -p .`, `npm test` (46/46), `npm run build`, `npm run shots -- --only garaje,taller` (26 capturas verificadas visualmente) y `graphify update .` completados sin errores.
- **Lente activa del Ciclo #5:** *Cierre de Partida (`#scr-over`/`#outro`) + Fase C Folded, Experiencia en Submenús (`#scr-race` y `#scr-play`) y Simplificación del Build (Poda del chunk GLTF de 542 kB)*.
- **Propuestas activas para decisión del usuario (Ciclo #5):**
  1. *(Recomendada)* **Cierre de Partida (`#scr-over` / `#outro`), Cobertura Headless y Fin de Fase C Folded** (escenarios deterministas de `outro` y `over` en `scenarios.mjs`, refinamiento visual de `#scr-over`/`#outro` en PC y celular, podio `buildPodium` y `brickWalls` en Folded 2.5D).
  2. **Encuadre, Récords y Medallas en Submenús de Carrera (`#scr-race`) y Supervivencia (`#scr-play`)** (grilla compacta de 2 columnas para los selectores de `#scr-race`, tiempos de medalla/récord de pista antes de largar y mejor marca por zona en `#scr-play`).
  3. **Simplificación del Build: Poda del Chunk GLTF Loader (`542 kB`) bajo `FOLDED_SLICE`** (eliminar la emisión del chunk inalcanzable `@babylonjs/loaders/glTF/2.0` cuando `FOLDED_SLICE = true`).
- **Próxima decisión necesaria:** Selección del usuario sobre cómo avanzar en el Ciclo #5.


