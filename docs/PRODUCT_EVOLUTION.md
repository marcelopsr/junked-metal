# Junked Metal — Registro Persistente de Evolución de Producto

**Metodología activa:** `EXPLORE → UNDERSTAND → DISCOVER → IMAGINE → PROPOSE → DISCUSS → DECIDE → IMPLEMENT → VALIDATE → REFINE → DOCUMENT → LEARN → NEW DISCOVERY ↺`  
**Última actualización:** 2026-10-09 (Ciclos #1, #2, #3, #4, #5 y #6 completados y validados · Ciclo #7 iniciado)

Este documento conserva la inteligencia acumulada del producto entre ciclos y sesiones: estado actual de cada módulo, evaluaciones de calidad, decisiones aprobadas, ideas descartadas o pospuestas, backlog vivo de oportunidades y el checkpoint de continuidad.

---

## 1. Fichas de Estado por Módulo y Superficie

| Módulo / Modo | Archivos clave | Estado actual | Calidad Visual / Técnica | Notas clave |
|---|---|---|---|---|
| **Supervivencia (Core)** | `src/main.ts`, `src/enemies.ts`, `src/weapons.ts`, `src/run.ts`, `src/folded_slice.ts`, `src/fx.ts`, `src/replay.ts` | Producción activa | Partida, Cartas, Pausa, Cámara lenta (`#outro`) y Resultados (`#scr-over`): 9/10 · Perf PC: `lab-noche` 189 draws (`6.2 ms`), `partida_llena` 205 draws (`8.9 ms`) | En Ciclo #6 se sumó `previewProfile(seed)` en `src/run.ts` (con test unitario en `test/run.test.ts`) para previsualizar clima, plaga, minijefes y jefe final sin alterar el `rng()` global. |
| **HUD y Menús (`kit.css`)** | `src/kit.css`, `src/ui.ts`, `src/menu.ts`, `src/menu.css`, `src/hud.css`, `src/menuscene.ts` | Producción activa | Portada/Garaje/Taller/Submenús de Lanzamiento/Cartas/Pausa/Resultados: 9–9.5/10 | En Ciclo #6 se completaron las fichas de largada `.briefCard` en `#scr-play` y `#scr-daily` y la grilla `.raceGrid` + `.rcBrief` en `#scr-race`, verificadas en PC y celular (`pc-menu-jugar`, `pc-menu-diario`, `pc-menu-carrera-menu`). Pendiente: pestañas secundarias de Chatarroteca (`Pilotos`, `Logros`, `Estadísticas`) y sinergias en `#scr-pause` / íconos en `#overHurt`. |
| **Carrera y Batalla (`kart.ts`)** | `src/kart.ts`, `src/race.css`, `src/world.ts` | Producción activa | Submenú `#scr-race`, Largada, Curso y Podio 3D unificados con Folded: 9/10 · Perf PC: `largada` 249 draws (`7.6 ms`), `curso` 293 draws (`6.6 ms`) | En Ciclo #6 `#scr-race` incorporó grilla de 2 columnas, 3 tarjetas `.rcCard` con insignia de medalla, mejor tiempo personal y tiempos objetivo (`Oro / Plata / Bronce`) dinámicos según vueltas y cilindrada, y selección directa de pista al tocar una tarjeta. |
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
- **Ciclo #5 (Aprobado e implementado 2026-10-09, `5d7155f`):** Propuesta 1 (Cierre de Partida `#scr-over` / `#outro`, solución de gradientes SVG con ID único en `src/icons.ts`, Polaroid en `Rajdhani` con papel determinista, podio 3D Folded `buildPodium`, muros rompibles `brickWalls` Folded y cobertura headless de `outro`, `resultados` y `podio`).
- **Ciclo #6 (Aprobado e implementado 2026-10-09):** Propuesta 1 (Submenús de Lanzamiento `#scr-race`, `#scr-play`, `#scr-daily` con grilla compacta `.raceGrid`, tarjetas `.rcCard` con metas de medalla y selección directa de pista, ficha de largada `.briefCard` con récord de zona y equipamiento activo, y pronóstico determinista `previewProfile` del Desafío Diario).

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

### Ciclo #5 (2026-10-09) — Cierre de Partida (`#outro` / `#scr-over`), Íconos SVG con ID Único y Fin de Fase C Folded (`5d7155f`)
- **Alcance implementado:** Solución de íconos SVG invisibles en `#scr-pause` y `#scr-over` (`uid` incremental por `<linearGradient>` en `src/icons.ts`), Polaroid en `Rajdhani` con granulado determinista (`src/replay.ts`), ocultación de `#banner` y `#touch` durante `#outro` y `#race.podium`, grilla de `#scr-over` corregida en PC y celular, podio 3D Folded (`buildPodium` en `src/kart.ts`), muros rompibles Folded (`brickWalls` en `src/world.ts`) y cobertura headless de `outro`, `resultados` y `podio`.
- **Evidencia de validación:** `tsc --noEmit`, `npm test` (46/46), `npm run build`, `npm run shots -- --only partida,carrera` (15 capturas) y `graphify update .`.

### Ciclo #6 (2026-10-09) — Submenús de Lanzamiento (`#scr-race`, `#scr-play`, `#scr-daily`) con Grilla Compacta, Metas de Medalla y Ficha de Largada
- **Alcance implementado (Propuesta 1):**
  - `previewProfile(seed)` en `src/run.ts` (con test unitario en `test/run.test.ts`) para calcular clima, plaga, minijefes y jefe final de cualquier semilla sin consumir el `rng()` global.
  - Ficha de largada `.briefCard.jm-panel` en `#scr-play` (descripción de zona, mejor marca personal `.briefRec` y grilla `.briefKit` 2×2 de Auto/Piloto/Arma inicial/Habilidad con íconos SVG) y en `#scr-daily` (grilla `.briefGrid` con escenario, plaga dominante, minijefes apilados con `beastIcon` y jefe final + `.briefKit` + récord del día).
  - Grilla `.raceGrid` en 2 columnas en `#scr-race` + `#rcBrief` con 3 tarjetas `.rcCard` (`Patio`, `Jardín`, `Garaje`) que muestran insignia de medalla, mejor tiempo personal y tiempos objetivo (`Oro / Plata / Bronce`) dinámicos para las vueltas y cilindrada activas, permitiendo elegir pista con un clic; más pie `#fe #rcHelp` en placa oscura legible.
  - Escenarios deterministas `jugar`, `diario` y `carrera-menu` agregados a la sesión `menu` en `scripts/scenarios.mjs`.
- **Evidencia de validación:** `tsc --noEmit`, `npm test` (47/47), `npm run build`, `npm run shots -- --only menu` (46 capturas verificadas en PC y celular) y `graphify update .`.

---

## 4. Backlog Vivo de Oportunidades — Ciclo #7

### A. Lente de Calidad Visual y UX en Chatarroteca (`Pilotos`, `Logros`, `Estadísticas`)
1. **Refinamiento Visual, Progreso e Íconos en las Pestañas `Pilotos`, `Logros` y `Estadísticas` + Cobertura Headless (`src/menu.ts`, `src/menu.css`, `scripts/scenarios.mjs`):**
   - **Problema actual:** Mientras la pestaña `Bichos` ya tiene siluetas `beastIcon` y barras con riel `.stb`, las otras tres pestañas de `#scr-bestiary` quedaron atrás:
     - En `Pilotos`, no se muestra el **arma inicial propia de cada piloto** (`icon(p.start, 16) + WEAPONS[p.start].name`), ni el estado (`EN USO` / `EN EL GARAJE` / condición de desbloqueo por logro o tornillos).
     - En `Logros`, las 18 tarjetas repiten el mismo ícono `evo` genérico en lugar de usar el ícono SVG acorde al logro/recompensa, y los logros pendientes no muestran el **progreso actual** cuando depende de acumuladores (`save.slain`, `save.best`, `save.stats`).
     - En `Estadísticas`, `Arma favorita` carece de su ícono SVG, `Bajas por tipo` lista texto plano sin `beastIcon(k, 16)` ni barras proporcionales `.stb`, y la tabla `#records` (*Mejores partidas*) flota suelta sobre la escena 3D sin placa de chapa `.jm-panel2`.
   - **Propuesta:** Completar las tres pestañas con íconos SVG propios, arma inicial y estado en `Pilotos`, íconos específicos y progreso en `Logros`, barras `.stb` + `beastIcon` y tabla `#records` enmarcada en `Estadísticas`, y sumar capturas headless en `scripts/scenarios.mjs`.

### B. Lente de Simplificación y Rendimiento de Empaquetado (Bundle Size)
2. **Poda Estática del Chunk GLTF Loader (`542 kB`) bajo `FOLDED_SLICE` (`src/glb.ts`, `src/carGlb.ts`):**
   - **Problema actual:** Con `FOLDED_SLICE = true`, el 100% de los 8 autos (`carHull`) y los 13 enemigos/jefes (`PROC` + `PETS`) se construyen proceduralmente sin descargar ningún `.glb`, pero Vite sigue emitiendo `dist/assets/2.0-*.js` (`542.16 kB`, `128.11 kB` gzip) y `glTFLoaderAnimation.pure-*.js` (`23.59 kB`) porque el cortocircuito en `src/glb.ts` (`if (o.proc)`) depende de un registro en tiempo de ejecución.
   - **Propuesta:** Cortocircuitar estáticamente con `if (FOLDED_SLICE)` antes de `await import("@babylonjs/loaders/glTF/2.0")` en `src/glb.ts` y `src/carGlb.ts` para eliminar ~565 kB de código muerto del build de producción.

### C. Lente de Experiencia en Partida (`#scr-pause` y `#scr-over`)
3. **Guía de Sinergias en Pausa (`#kitW` / `#kitP`) e Íconos de Amenaza en Daño Recibido (`#overHurt`) (`src/menu.ts`, `src/menu.css`):**
   - **Problema actual:**
     - En `#scr-pause`, `#kitW` muestra el daño y porcentaje de cada arma, pero no recuerda **qué pasiva necesita cada arma equipada para evolucionar** (ni resalta si esa pasiva ya está en `#kitP`), obligando al jugador a memorizar las 10 parejas de evolución entre subidas de nivel.
     - En `#scr-over`, mientras `#overDmg` muestra íconos SVG en las armas (aunque `embestida` y habilidades aún aparecen sin ícono), `#overHurt` (*Daño recibido por fuente*) muestra nombres de texto plano sin las siluetas `beastIcon(k, 18)` de los enemigos que dañaron al auto.
   - **Propuesta:** Agregar en cada fila de `#kitW` (cuando el arma aún no evolucionó) el recordatorio compacto de su pasiva par (resaltado en amarillo si ya se posee en `#kitP`), y sumar `beastIcon` en `#overHurt` e íconos de embestida/habilidad en `#overDmg`.

---

## 5. Checkpoint de Sesión Actual

- **Último trabajo completado:** Implementación y validación visual de la **Propuesta 1 del Ciclo #6** (submenús de lanzamiento `#scr-race`, `#scr-play` y `#scr-daily` con `previewProfile(seed)` en `src/run.ts`, fichas de largada `.briefCard`, grilla `.raceGrid` en 2 columnas, tarjetas `.rcCard` con tiempos objetivo de medalla `Oro / Plata / Bronce`, pie `#rcHelp` en placa oscura y capturas `jugar`, `diario` y `carrera-menu` en `scripts/scenarios.mjs`).
- **Estado de validación:** `npx tsc --noEmit -p .`, `npm test` (47/47), `npm run build`, `npm run shots -- --only menu` (46 capturas verificadas visualmente en PC y celular) y `graphify update .` completados sin errores.
- **Lente activa del Ciclo #7:** *Calidad Visual y UX en Chatarroteca (`Pilotos`, `Logros`, `Estadísticas`), Simplificación del Build (Poda del chunk GLTF de 542 kB) y Claridad Táctica en Pausa/Resultados (`#kitW` + `#overHurt`)*.
- **Propuestas activas para decisión del usuario (Ciclo #7):**
  1. *(Recomendada)* **Chatarroteca Completa: Claridad Visual, Progreso e Íconos en `Pilotos`, `Logros` y `Estadísticas` + Cobertura Headless**.
  2. **Simplificación del Build: Poda Estática del Chunk GLTF Loader (`542 kB`) bajo `FOLDED_SLICE`**.
  3. **Claridad Táctica en Pausa y Resultados: Sinergias de Evolución en `#kitW` e Íconos SVG en `#overHurt` / `#overDmg`**.
- **Próxima decisión necesaria:** Selección del usuario sobre cómo avanzar en el Ciclo #7.

