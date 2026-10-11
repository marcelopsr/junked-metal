# Junked Metal — Registro Persistente de Evolución de Producto

**Metodología activa:** `EXPLORE → UNDERSTAND → DISCOVER → IMAGINE → PROPOSE → DISCUSS → DECIDE → IMPLEMENT → VALIDATE → REFINE → DOCUMENT → LEARN → NEW DISCOVERY ↺`  
**Última actualización:** 2026-10-10 (Ciclos #1 a #34 completados y validados · Ciclo #35 listo para selección)

Este documento conserva la inteligencia acumulada del producto entre ciclos y sesiones: estado actual de cada módulo, evaluaciones de calidad, decisiones aprobadas, ideas descartadas o pospuestas, backlog vivo de oportunidades y el checkpoint de continuidad.

---

## 1. Fichas de Estado por Módulo y Superficie

| Módulo / Modo | Archivos clave | Estado actual | Calidad Visual / Técnica | Notas clave |
|---|---|---|---|---|
| **Supervivencia (Core)** | `src/main.ts`, `src/enemies.ts`, `src/weapons.ts`, `src/run.ts`, `src/folded_slice.ts`, `src/fx.ts`, `src/replay.ts` | Producción activa | Partida, Cartas, Pausa, Cámara lenta (`#outro`) y Resultados (`#scr-over`): 9/10 · Perf PC: `lab-noche` 189 draws (`6.2 ms`), `partida_llena` 205 draws (`8.9 ms`) | En Ciclo #6 se sumó `previewProfile(seed)` en `src/run.ts` (con test unitario en `test/run.test.ts`). Pendiente: mostrar receta de evolución en `#kitW`/`#kitP` de `#scr-pause` e íconos SVG (`beastIcon`, `embestida`, habilidades) en `#overHurt` y `#overDmg` de `#scr-over`. |
| **HUD y Menús (`kit.css`)** | `src/kit.css`, `src/ui.ts`, `src/menu.ts`, `src/menu.css`, `src/hud.css`, `src/menuscene.ts` | Producción activa | Portada/Garaje/Taller/Submenús/Chatarroteca (4 pestañas)/Cartas/Pausa/Resultados: 9.5/10 | En Ciclo #7 se completaron las 4 pestañas de Chatarroteca (`Pilotos` con `.wsyn` y estado, `Logros` con `achIco`/`achProg` y `rewardName`, `Estadísticas` en grilla 3×2 con barras `.stb`, íconos SVG y placa `#records`), más reinicio de scroll en `#beasts` y capturas `bestiario-pilotos`, `bestiario-logros` y `bestiario-stats`. |
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
- **Ciclo #6 (Aprobado e implementado 2026-10-09, `e02d4f4`):** Propuesta 1 (Submenús de Lanzamiento `#scr-race`, `#scr-play`, `#scr-daily` con grilla compacta `.raceGrid`, tarjetas `.rcCard` con metas de medalla y selección directa de pista, ficha de largada `.briefCard` con récord de zona y equipamiento activo, y pronóstico determinista `previewProfile` del Desafío Diario).
- **Ciclo #7 (Aprobado e implementado 2026-10-09):** Propuesta 1 (Chatarroteca Completa: `Pilotos` con `.wsyn` y estado de desbloqueo, `Logros` con íconos SVG propios por categoría `achIco`, progreso contextual `achProg` y nombres de premios limpios `rewardName`, `Estadísticas` en grilla `3×2` con barras `.stb`, íconos de armas/bichos y placa `#records`, reinicio de `scrollTop` en `#beasts` y cobertura headless `bestiario-pilotos`, `bestiario-logros`, `bestiario-stats`).

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

### Ciclo #6 (2026-10-09) — Submenús de Lanzamiento (`#scr-race`, `#scr-play`, `#scr-daily`) con Grilla Compacta, Metas de Medalla y Ficha de Largada (`e02d4f4`)
- **Alcance implementado:** `previewProfile(seed)` en `src/run.ts` (con test unitario en `test/run.test.ts`), ficha `.briefCard.jm-panel` en `#scr-play` y `#scr-daily`, grilla `.raceGrid` en 2 columnas y 3 tarjetas `.rcCard` con metas de medalla en `#scr-race`, y capturas `jugar`, `diario` y `carrera-menu` en `scripts/scenarios.mjs`.
- **Evidencia de validación:** `tsc --noEmit`, `npm test` (47/47), `npm run build`, `npm run shots -- --only menu` (46 capturas) y `graphify update .`.

### Ciclo #7 (2026-10-09) — Chatarroteca Completa (`Pilotos`, `Logros` con Progreso e Íconos y `Estadísticas` con Barras y Siluetas)
- **Alcance implementado (Propuesta 1):**
  - Pestaña `Pilotos`: franja `.wsyn` con el arma inicial de cada piloto e ícono SVG, estado `.sel` cuando está en uso, pie `.price` alineado al fondo (`EN USO` / `EN EL GARAJE` / `Bloqueado · N tornillos` / `Logro: ...`) y eliminación de `letter-spacing: .4em` en `.ficha.locked b`.
  - Pestaña `Logros`: `achIco(k)` con íconos SVG propios por categoría (`vehiculo`, `beastIcon`, fusiones, hazañas), `achProg(k, ok)` con barra o contador de avance (`Mejor marca`, `Mejor marca hoy`, `Bajas registradas`, `Auto en el garaje`) y `rewardName(id)` sin duplicar el nombre de la ranura.
  - Pestaña `Estadísticas`: grilla `3×2` en PC (`1×N` en móvil), barra de porcentaje de victorias en `Partidas`, `Mejor tiempo` en `Tiempo jugado`, íconos SVG y barras `.stb` en `Arma favorita` (top 3 armas) y `Bajas por tipo` (`beastIcon` + barra por especie), y tabla `#records` enmarcada en placa de chapa oscura.
  - Reinicio de `$("beasts").scrollTop = 0` al abrir la Chatarroteca o cambiar de pestaña (`d.btab`) + inclusión de `#beasts` en `SCROLL` + capturas deterministas `bestiario-pilotos`, `bestiario-logros` y `bestiario-stats` en `scripts/scenarios.mjs`.
### Ciclo #8 (2026-10-09) — Claridad Táctica en Pausa y Resultados, Placa en Créditos, Progreso en Más Modos y Junket Crush
- **Alcance implementado:**
  - **Claridad Táctica en Pausa (`#kitW`, `#kitP`):** Indicador contextual `.wsynP` debajo de cada arma que muestra su pareja de evolución requerida (`Evo: <Pasiva>`) y resalta en amarillo oro (`.wsynP.on`) cuando la pasiva correspondiente ya está equipada en la build. En pasivas (`#kitP`), se expone qué arma equipada evoluciona cada una (o el catálogo disponible si no está equipada aún).
  - **Íconos SVG y Siluetas en Resultados (`#overDmg`, `#overHurt`):** Daño infligido ahora incluye íconos temáticos para fuentes no-arma (`embestida` con ícono de lanza, habilidades activas con `ABIL_ICON`). Daño recibido (`#overHurt`) mapea fuentes de contacto, embestidas y proyectiles a siluetas exactas `beastIcon(k, 18)` de cada enemigo (`hormiga`, `escupidora`, `cucaracha`/`friccion`, `rey`, etc.).
  - **Coherencia Visual en Créditos (`#scr-credits`):** Enmarcado del texto de la historia en placa de chapa oscura `.briefCard.jm-panel`, eliminando el texto flotante sobre la mesa 3D y alineando el lenguaje con las demás pantallas.
  - **Progreso en Pantalla de Modos (`#scr-modes`) y Entrada a Junket Crush (`#scr-match3`):** Resumen de circuitos completados y medallas obtenidas en Carrera (`progRace`), nivel alcanzado y estrellas acumuladas en Junket Crush (`progM3`), y placa `.briefCard.jm-panel` en `#m3Brief` de `#scr-match3`.
  - **Cobertura Headless:** Incorporación de la captura `mas-modos` en `scripts/scenarios.mjs` validada en PC y móvil.
- **Evidencia de validación:** `npx tsc --noEmit -p .`, `npm test` (75/75 pasando, incluido test de campaña match-3), `npm run build`, `npm run shots -- --only menu,match3_menu,partida` (64 capturas verificadas en PC y móvil), `pm2 restart rc-test` y `npx graphify update .` completados sin errores.

---

## 4. Backlog Vivo de Oportunidades — Ciclo #9

### A. Lente de Simplificación y Rendimiento (Bundle Size)
1. **Poda Estática del Chunk GLTF Loader (`542 kB`) bajo `FOLDED_SLICE` (`src/glb.ts`, `src/carGlb.ts`):**
   - **Qué es:** Cortocircuitar las importaciones dinámicas de `@babylonjs/loaders/glTF/2.0` cuando `FOLDED_SLICE = true`.
   - **Qué problema resuelve:** El build de producción sigue emitiendo `2.0-*.js` (`542 kB`) y `glTFLoaderAnimation.pure-*.js` (`23.6 kB`) que nunca se ejecutan porque todos los modelos se generan proceduralmente.
   - **Qué valor aporta:** Reducción de más de medio megabyte en la descarga inicial web. Complejidad: Baja.

### B. Lente de Experiencia y Feedback en Partida (HUD Táctico)
2. **Indicador Visual de 'Evolución Lista' en los Slots del HUD (`src/ui.ts`, `src/hud.css`):**
   - **Qué es:** Pulso sutil dorado o borde energizado en el slot de un arma (`#slots .slot`) cuando alcanza nivel 5 y su pasiva pareja ya está en posesión del jugador.
   - **Qué problema resuelve:** El jugador no siempre recuerda en medio del combate si un arma ya está lista para que el próximo cofre o nivel ofrezca la evolución.
   - **Qué valor aporta:** Claridad inmediata sin necesidad de pausar la partida. Complejidad: Baja-Media.

### C. Lente de Integración y Audio Táctil (Game Feel)
3. **Efectos Sonoros Sintetizados para Interacciones en el Gabinete Junket Crush (`src/sfx.ts`, `src/match3_scene.ts`):**
   - **Qué es:** Sonidos mecánicos de click retro/arcade sintetizados en Web Audio API para el arrastre, matches de chatarra y victoria de nivel en Junket Crush.
   - **Qué problema resuelve:** Actualmente Junket Crush tiene excelente ambientación visual 3D pero feedback sonoro acotado en comparación con las partidas de Supervivencia y Carrera.
   - **Qué valor aporta:** Completa la experiencia inmersiva del mini-juego arcade. Complejidad: Media.

---

## 5. Checkpoint de Sesión Actual

### Ciclo #9 (2026-10-09) — Poda GLTF Loader, SFX Arcade Junket Crush y Medallas Metálicas de Carrera
- **Alcance implementado:**
  - **Poda del Chunk GLTF Loader (`542 kB` eliminados):** Poda de la importación dinámica bajo `FOLDED_SLICE`, eliminando por completo `2.0-*.js` del bundle de producción sin afectar el renderizado procedural.
  - **SFX Sintetizados para Junket Crush:** Se incorporaron en `src/sfx.ts` los generadores procedurales `m3Click` (click mecánico de solenoide/relé), `m3Swap` (fricción de engranaje metálico), `m3Clear` (impacto cortante multitonal) y `m3Win` (fanfarria arcade con ondas cuadradas y triangulares al completar nivel/pedido).
  - **Medallas y Trofeos en Submenú Carrera (`#scr-race`):** Insignias metálicas `.rmedal` en oro, plata y bronce con degradado tridimensional, bisel iluminado y sombras de relieve (`0 0 8px rgba(...)`) para una lectura clara de marcas conseguidas.
- **Evidencia de validación:** `npx tsc --noEmit -p .`, `npm test` (75/75), `npm run build` (build sin chunks de 2.0), `npm run shots -- --only carrera-menu`, `pm2 restart rc-test` y `npx graphify update .` (3039 nodos actualizados) 100% limpios.

### Ciclo #10 (2026-10-09) — Ícono Reloj y Descripciones en Taller, HUD Táctico de Habilidad/Salto (`#txl`) y Aviso de Evolución Lista
- **Alcance implementado en paralelo por 3 subagentes:**
  - **Subagente 1 · Íconos SVG y Taller (`src/icons.ts`, `src/menu.ts`):** Nuevo ícono SVG `"reloj"` (cronómetro con degradado `#9be3ff → #ffd84d`) asignado a `ABIL_ICON.lenta` (eliminando la colisión con la mejora *Señal* del Taller). En `shopItems()` (`stab === "habilidades"`), cada tarjeta ahora muestra qué hace realmente la habilidad además de su nivel y tiempo de recarga (`${a.desc} · Nivel ${l + 1} (${n1(abilCd(k, l))} s)`).
  - **Subagente 2 · HUD Táctico de Supervivencia `#txl` (`src/ui.ts`, `src/hud.css`):** Se habilitó la cabecera `.h-ptitle.h-abil` en `#txl` con el ícono SVG inline de la habilidad equipada (`#abName`), su estado en vivo en `#abKey` (`LISTO · E` en verde `#22c55e`, `ACTIVA · E` en `#ffd24a` o cuenta regresiva `NS · E`, y sin sufijo de tecla en pantallas táctiles) y la fila de Salto `#jumpRow` siempre visible en escritorio (`LISTO · F` con barra de carga).
  - **Subagente 3 · Supervivencia Core (`src/main.ts`):** Conexión de `ABIL_ICON[abil]` y `abilCd` con `hudAbility()` en `updateHud()`, más registro por partida (`evoNotified`) en `choose(i)` que dispara un aviso de radio `EVOLUCIÓN LISTA · <EVO_NAME> (COFRE)` la primera vez que un arma llega a Nv. 5 con su pasiva pareja equipada.
- **Evidencia de validación:** `npx tsc --noEmit -p .`, `npm test` (75/75), `npm run build` (build limpio en 586 ms sin chunk 2.0), `npm run shots -- --only taller,partida` (33 capturas verificadas en PC y celular) y `npx graphify update .` (3046 nodos, 7433 aristas).

### Ciclo #11 (2026-10-09) — Carrera HUD/Podio, Cabezal Junket Crush `NV X/10`, Curva Gamma/FSR 2J y Pulsos del Patio
- **Alcance implementado en paralelo por 4 subagentes:**
  - **Subagente 1 · Carrera HUD y Podio (`src/kart.ts`, `src/race.css`):** Meta de medalla objetivo en vivo (`ORO 1:35.2` / `PLATA` / `BRONCE`) con relieve metálico `.rmedal` junto al cronómetro en `#race`, chispas progresivas dobles desde las ruedas traseras (`azul → naranja`) según nivel de carga de mini-turbo y placa de chapa oscura con borde superior dorado para `#rinfo` en el podio.
  - **Subagente 2 · Gabinete Junket Crush (`src/match3.ts`, `src/match3.css`):** Insignia `NV X/10` en la esquina superior derecha del cabezal del gabinete, pastilla verde metálico en pedidos completados (`OK` / `.done`) y marcas divisorias verticales de alto contraste en las 3 metas de estrellas de la barra de puntaje.
  - **Subagente 3 · Render y Configuración de Imagen (`src/render.ts`, `src/menu.ts`):** Curva perceptual de gamma de medios tonos (`midtonesExposure` + `midtonesDensity`) en `imageProcessingConfiguration`, limpieza segura de `fsrP` / `fxaaLo` al activar/desactivar pantalla dividida (`setSplit`) y unificación de confirmaciones de Configuración en español neutro impersonal.
  - **Subagente 4 · Supervivencia y Patio (`src/main.ts`, `src/world.ts`):** Pulsos deterministas de mitad de partida (`YARD_PULSES = [225, 345]`, sin alterar la secuencia de `rng()` en `sim`) con aviso de radio/banner y sobrepresión temporal de aspersores en `zoneTick(dt, c.pos, boost)`.
- **Evidencia de validación:** `npx tsc --noEmit -p .`, `npm test` (75/75), `npm run build` (build limpio en 551 ms), `npm run shots -- --only carrera,match3,partida` (31 capturas verificadas en PC y celular) y `npx graphify update .` (3050 nodos, 7439 aristas).

### Ciclo #12 (2026-10-09) — Deltas Comparativos en Garaje, Transición `NV X → NV Y` en Cartas, Insignia Mini-Turbo en Carrera y Sello de Taller en Polaroid
- **Alcance implementado en paralelo por 4 subagentes:**
  - **Subagente 1 · Garaje y Personalización (`src/menu.ts`, `src/menu.css`):** Deltas comparativos (`.cdlt.up` en verde `#22c55e`, `.cdlt.dn` en ámbar `#f59e0b`) frente al auto en uso (`CARS[save.car]`) en las barras de `Carrocería`, `Velocidad` y `Embestida` del Garaje, pie `EN USO` / `EN EL GARAJE` en vehículos propios y cabecera dinámica `${PZ[pz]} · Personalizado / De fábrica` en `Pintura`.
  - **Subagente 2 · Cartas de Nivel (`src/ui.ts`, `src/hud.css`):** Etiquetas de transición explícita (`Arma · NUEVA`, `Pieza · NUEVA`, `NV X → NV Y`, `· ¡EVO LISTA!`, `· MÁX`), pip `.next` iluminado en dorado para el nivel que se desbloqueará y borde `.evo-rdy` cuando la mejora deja lista la evolución.
  - **Subagente 3 · Carrera HUD (`src/kart.ts`, `src/race.css`):** Insignia reactiva `.rturbo` (`DERRAPE`, `TURBO 1`, `TURBO 2`, `TURBO`) junto al velocímetro `.rspd` y destello dorado `.final` en `.rlap` al entrar en la última vuelta.
  - **Subagente 4 · Cierre y Polaroid (`src/replay.ts`, `src/replay.css`):** Sello rectangular inclinado de doble marco estilo inspección de taller (`INSPECCIÓN · VICTORIA` en `#1f6f3a` o `CHASIS SINIESTRADO` en `#9a2c2c`) en el margen inferior derecho de la foto Polaroid (`showPhoto`).
- **Evidencia de validación:** `npx tsc --noEmit -p .`, `npm test` (75/75), `npm run build` (595 ms), `npm run shots -- --only garaje,partida,carrera` (17 capturas verificadas en PC y celular) y `npx graphify update .` (3053 nodos, 7446 aristas).

---

### Ciclo #13 (2026-10-09) — Barra de Jefe con `beastIcon`/`FASE 2`, Resumen de Zonas y Contadores en Chatarroteca, Alerta `¡MISIL!` y Récord en Carrera, y `CADENA ×N` en Junket Crush
- **Alcance implementado en paralelo por 4 subagentes:**
  - **Subagente 1 · Barra de Jefe en Supervivencia (`src/ui.ts`, `src/hud.css`, `src/main.ts`):** Silueta SVG `beastIcon(kind, 20)`, porcentaje `.b-pct` en vivo e insignia `.b-rage` (`FASE 2`) con barra incandescente en `#bossbar` cuando `boss.enraged` está activo.
  - **Subagente 2 · Selección de Zona y Chatarroteca (`src/menu.ts`, `src/menu.css`):** Grilla `.zoneRow` con chips `.zchip` de las 3 zonas (`Patio`, `Garaje`, `Jardín`) e indicador `★ ZONA CONQUISTADA` en `#scr-play`, más contadores de colección en las pestañas de Chatarroteca (`Bichos (X/13)`, `Pilotos (X/5)`, `Logros (X/19)`).
  - **Subagente 3 · Carrera HUD y Podio (`src/kart.ts`, `src/race.css`):** Alerta `.rwarn` (`¡MISIL!`) junto al velocímetro cuando un misil teledirigido apunta al corredor humano, y diferencial contra el récord previo (`¡NUEVO RÉCORD! (-X.XX s)` o `+X.XX s vs récord`) en la placa `#rinfo` del podio.
  - **Subagente 4 · Gabinete Junket Crush (`src/match3.ts`, `src/match3_draw.ts`):** Insignia ámbar `CADENA ×N` junto a `NV X/10` en el display superior durante cascadas y anillo dorado exterior en los nodos del mapa completados con 3 estrellas.
- **Evidencia de validación:** `npx tsc --noEmit -p .`, `npm test` (75/75), `npm run build` (1.09 s), `npm run shots -- --only jugar,bestiario,carrera,match3,lab` (47 capturas verificadas en PC y celular) y `npx graphify update .` (3056 nodos, 7456 aristas).

---

### Ciclo #14 (2026-10-09) — Garaje Unificado (`Piloto`, `Habilidad`, `Arma`), Distancia `Xm` en `#arrows`, Telemetría `#rtab` en Carrera y Metas de Estrellas en Junket Crush
- **Alcance implementado en paralelo por 4 subagentes:**
  - **Subagente 1 · Garaje: Piloto, Habilidad y Arma (`src/menu.ts`, `src/menu.css`):** Franja `.wsyn` con el arma inicial de serie en `Piloto`, ícono SVG `ABIL_ICON` en cada tarjeta de `Habilidad` y pie `EN USO` / `EN EL GARAJE` / `DISPONIBLE` en las 3 pestañas de equipamiento, más ajuste tipográfico en móvil (`390px`) para deltas `.cdlt`.
  - **Subagente 2 · Supervivencia: Flechas de Borde (`src/ui.ts`, `src/hud.css`, `src/main.ts`):** Cálculo de distancia horizontal en metros hacia jefes y cofres fuera de cámara en `updateHud()` y etiqueta `<small class="adist">${a.dist}m</small>` debajo de cada flecha en `#arrows`.
  - **Subagente 3 · Carrera y Batalla: Tabla `#rtab` (`src/kart.ts`, `src/race.css`):** Etiqueta `.rt-st` en cada fila de `#rtab` con los globos restantes (`●●●` / `FUERA`) en Batalla de Globos y el estado activo (`META` / `ESCUDO` / `TURBO`) en Carrera, memoizada por `dataset.h`.
  - **Subagente 4 · Gabinete Junket Crush (`src/match3.ts`, `src/match3.css`):** Línea `.m3-tiers` con los 3 umbrales de puntaje (`Metas: ★ X · ★★ Y · ★★★ Z`) en `showIntro()` e indicación de puntos faltantes para la siguiente estrella (`Siguiente estrella (N★): X pts (faltaron Y)`) en `showWin()`.
- **Evidencia de validación:** `npx tsc --noEmit -p .`, `npm test` (75/75), `npm run build` (551 ms), `npm run shots -- --only garaje,partida,carrera,match3` (33 capturas verificadas en PC y celular) y `npx graphify update .` (3059 nodos, 7467 aristas).

### Ciclo #15 (2026-10-09) — Identidad de Build en Pausa/Resultados, Placas `#combo`/`#drv` con `XP ×N`, Pausa de Carrera con Telemetría y Pausa/Derrota en Junket Crush
- **Alcance implementado en paralelo por 4 subagentes:**
  - **Subagente 1 · Supervivencia: Pausa y Resultados (`src/menu.ts`, `src/menu.css`):** Inclusión de `Auto · Piloto · Habilidad · Zona` al inicio de `#pauseSeed` (`openPause`) y `#overSeed` (`openOver`) junto al clima, plaga y semilla.
  - **Subagente 2 · HUD de Supervivencia: Racha y Manejo (`src/ui.ts`, `src/hud.css`):** Placas de telemetría oscuras con borde izquierdo de estado para `#combo` y `#drv`, ajuste responsive en móvil y etiqueta explícita `XP ×N` en `hudDrive()`.
  - **Subagente 3 · Carrera: Pausa con Telemetría (`src/kart.ts`, `src/race.css`):** Tarjeta de chapa oscura `.rbox` en `#rpause` con línea `.rsub` en vivo detallando circuito, modalidad (`Copa (X/3)` / `Carrera` / `Batalla de globos`), cilindrada y vuelta o tiempo restante.
  - **Subagente 4 · Gabinete Junket Crush (`src/match3.ts`, `src/match3.css`):** Encabezado `PAUSA · NV X` con nombre del nivel, puntaje actual y movimientos restantes en `#m3-pause`, más resumen `Puntaje alcanzado: X pts · Récord: Y pts` en `showLose()`.
- **Evidencia de validación:** `npx tsc --noEmit -p .`, `npm test` (75/75), `npm run build` (573 ms), `npm run shots -- --only partida,carrera,match3` (31 capturas verificadas en PC y celular) y `npx graphify update .` (3062 nodos, 7475 aristas).

### Ciclo #16 (2026-10-09) — Transición Numérica en Tarjetas del Taller y `Comprables (N)`, Estado `.endless` y Velocidad Punta `.top`, Colores de Podio en Carrera y Telemetría en Cabezal del Mapa de Junket Crush
- **Alcance implementado en paralelo por 4 subagentes:**
  - **Subagente 1 · Taller (`src/menu.ts`, `src/menu.css`):** Línea de transición de nivel `<span class="sfx">${i.fx}</span>` en cada tarjeta `.carc.perk` en oro cálido `#ffd24a`, más contador dinámico de compras disponibles en `sfiltLabels.comprables` (`Comprables ahora (${buyN})`).
  - **Subagente 2 · HUD de Supervivencia: Reloj y Velocímetro (`src/ui.ts`, `src/hud.css`):** Activación memoizada de `.endless` en `#lcd` / `#clock` con borde y números dorados al superar 10:00 (`d.time >= 600`), y activación memoizada de `.top` en `#txr` / `#spd` iluminando el arco analógico y `km/h` en ámbar cálido a más del 90% de velocidad punta (`s >= 0.9`).
  - **Subagente 3 · Carrera HUD: Puesto y Caja de Objeto (`src/kart.ts`, `src/race.css`):** Colores de podio en `.rpos` (`1º` oro `#ffd84d`, `2º` plata `#d8e2ef`, `3º` bronce `#e09145`, `4º+` blanco `#f4f7fa`) con `data-pl`, y borde ámbar activo `.full` en `.ritem` al portar un ítem armado.
  - **Subagente 4 · Gabinete Junket Crush: Cabezal del Mapa (`src/match3.ts`):** `paintDisplay()` en modo mapa dibuja en el cabezal superior digital el nivel seleccionado en 7 segmentos (`NIVEL XX` / `JEFE · NV`), título en mayúsculas, movimientos permitidos, récord alcanzado y sus 3 estrellas con `drawStar`.
- **Evidencia de validación:** `npx tsc --noEmit -p .`, `npm test` (75/75), `npm run build` (538 ms), `npm run shots -- --only taller,partida,carrera,match3` (55 capturas verificadas en PC y celular) y `npx graphify update .` (3065 nodos, 7486 aristas).

### Ciclo #17 (2026-10-09) — Insignia `COBRADO` y Rango en Chatarroteca, Rosa Cardinal y Pulso de Cofre en Radar, `LÍDER` de Copa en Podio y `JEFE X%` en Junket Crush
- **Alcance implementado en paralelo por 4 subagentes:**
  - **Subagente 1 · Chatarroteca (`src/menu.ts`, `src/menu.css`):** Etiqueta `<b class="ach-ok"> · COBRADO</b>` en logros completados y rango honorífico de bajas (`Aprendiz de Patio`, `Cazador de Plagas`, `Chatarrero Veterano`, `Leyenda del Patio`) en `statsHtml()`.
  - **Subagente 2 · HUD de Supervivencia: Radar (`src/ui.ts`, `src/hud.css`):** Puntos cardinales (`N`, `E`, `S`, `O`) orientados según `rCar.up` en el perímetro interior de `drawRadar()` y borde dorado `.has-chest` en `#radar` cuando hay un cofre activo.
  - **Subagente 3 · Carrera: Copa y Podio (`src/kart.ts`, `src/race.css`):** Insignia `<b class="cup-lead">LÍDER</b>` junto al puntaje acumulado del puntero en `#rres` y título `${TRACKS[trackNo].name} · COPA (${raceNo}/3)`.
  - **Subagente 4 · Gabinete Junket Crush (`src/match3.ts`):** Cápsula `JEFE ${hpPct}% · NV ${lvIdx + 1}/${LEVELS.length}` en rojo `M3C.error` en el cabezal superior durante niveles de jefe (`st.lv.boss`).
- **Evidencia de validación:** `npx tsc --noEmit -p .`, `npm test` (75/75), `npm run build` (420 ms), `npm run shots -- --only bestiario,partida,carrera,match3` (33 capturas verificadas en PC y celular) y `npx graphify update .` (3068 nodos, 7497 aristas).

### Ciclo #18 (2026-10-09) — Silueta e Insignia `REGISTRADO` en Visor 3D del Bestiario, Pips Dorados `.max` en `#slots`, Línea de Meta y Rumbo en `#rmap`, y Atajos `1–4` en `#m3-tools`
- **Alcance implementado en paralelo por 4 subagentes:**
  - **Subagente 1 · Ficha 3D del Bestiario (`src/menu.ts`, `src/menu.css`):** Silueta `beastIcon(k, 24)` e insignia `<em class="b-reg ${met ? "ok" : ""}">` (`REGISTRADO (X bajas)` / `SIN REGISTROS`) en `.bname` de `#scr-beast`.
  - **Subagente 2 · HUD de Supervivencia: `#slots` (`src/ui.ts`, `src/hud.css`):** Clase `.max` para armas no evolucionadas en nivel 5 y pasivas en nivel 5, iluminando sus 5 pips `.pips i.on` en dorado `#ffd24a`.
  - **Subagente 3 · Carrera Mini-mapa `#rmap` (`src/kart.ts`):** Línea de meta transversal dorada en `trk.P[0]` y vector de rumbo direccional (`fwdOf(r)`) con borde oscuro para el punto del jugador humano.
  - **Subagente 4 · Gabinete Junket Crush (`src/match3.ts`, `src/match3.css`):** Insignias `<i class="m3-tkey">${i + 1}</i>` de atajos de teclado (`1–4`) en `#m3-tools` (ocultas en dispositivos táctiles `@media (pointer: coarse)`).
- **Evidencia de validación:** `npx tsc --noEmit -p .`, `npm test` (75/75), `npm run build` (418 ms), `npm run shots -- --only bestiario,partida,carrera,match3` (33 capturas verificadas en PC y celular) y `npx graphify update .` (3071 nodos, 7505 aristas).

---

### Ciclo #19 (2026-10-09) — Ficha Diaria con Semilla y Zona Conquistada, Alerta Batería `BAJA` y Daño `!`, Récord de Vuelta en Carrera y Placa `JEFE` en Mapa de Junket Crush
- **Alcance implementado en paralelo por 4 subagentes:**
  - **Subagente 1 · Desafío Diario y Supervivencia (`src/menu.ts`, `src/menu.css`):** Franja `.briefRec` destacada con fecha y código de semilla (`DESAFÍO DIARIO · 2026-10-09 · SEMILLA #3`) en `#dailyBrief`, prefijo `Semilla #3 · ` en `#dailyInfo`, y clase `.win-rec` en oro cálido `#ffd24a` para el récord de zona conquistada en `#playRec`.
  - **Subagente 2 · HUD de Supervivencia (`src/ui.ts`, `src/hud.css`):** Alerta `${volt}V · BAJA` cuando la batería cae bajo el 25% (`low`) con resplandor y animación `voltPulse` roja en `#txl.low #volt`, más sufijo `!` en números de daño crítico flotantes (`${Math.round(v)}!`).
  - **Subagente 3 · Carrera: Vueltas (`src/kart.ts`):** Cronómetro de vuelta cerrada (`fmt(lt)`) y sello `¡RÉCORD!` en el aviso central `say()` en `onLap(r)` (`${lapMsg} · ${fmt(lt)}${isBest ? " ¡RÉCORD!" : ""}`).
  - **Subagente 4 · Gabinete Junket Crush (`src/match3_draw.ts`):** Placa compacta `"JEFE"` con fondo rojo carmesí `M3C.rojo` y tipografía técnica centrada en `y - r - 9` sobre las tuercas hexagonales de niveles de jefe (`lv.boss`) en la Ruta del Desguace.
- **Evidencia de validación:** `npx tsc --noEmit -p .`, `npm test` (75/75), `npm run build` (460 ms), `npm run shots -- --only jugar,diario,partida,carrera,match3` (35 capturas verificadas en PC y celular) y `npx graphify update .` (3074 nodos, 7524 aristas).

---

### Ciclo #21 (2026-10-10) — Muestra de Color en Garaje, Reparación +35% en Cartas, Pastilla de Escudo en Carrera, Cajas de Chatarra Mejoradas, Críticos FX y Remaches Polaroid
- **Alcance implementado en paralelo por 6 subagentes:**
  - **Subagente 1 · Garaje Pintura (`src/menu.ts`, `src/menu.css`):** Punto cromático circular `<i id="pzdot" class="sw-dot">` dentro del título `.hsvt` de la pieza seleccionada, sincronizado en vivo con `hsvBars()` para mostrar el color aplicado en tiempo real.
  - **Subagente 2 · HUD Supervivencia (`src/ui.ts`, `src/hud.css`):** Etiqueta explícita `Reparación · +35% vida` en `kindLabel()` y clase `.offer.heal .kind` en verde esmeralda `#22c55e` para identificar al instante la curación en cartas de mejora.
  - **Subagente 3 · Carrera Escudo (`src/kart.ts`, `src/race.css`):** Distintivo cian brillante `.rshield` (`ESCUDO Xs`) junto al velocímetro de carrera para corredores con burbuja de protección activa, reflejando el tiempo restante.
  - **Subagente 4 · Gabinete Junket Crush (`src/match3.ts`, `src/match3_draw.ts`):** Ráfaga reforzada de 16 partículas de viruta y onda de choque naranja `rings` al asestar el golpe final que destruye una caja de chatarra (`h.left <= 0`).
  - **Subagente 5 · Efectos Visuales 3D (`src/fx.ts`):** 14 partículas en dorado `#ffd24a` y naranja `#ff4d00` para impactos críticos en `FX.hit(p, crit)` con mayor velocidad y escala física.
  - **Subagente 6 · Cierre y Polaroid (`src/replay.ts`, `src/replay.css`):** 4 remaches envejecidos en los vértices exteriores del papel Polaroid y botón de descarga estilizado como chapa de taller con sombra y elevación hover.
- **Evidencia de validación:** `npx tsc --noEmit -p .`, `npm test` (75/75), `npm run build` (914 ms), `npm run shots -- --only garaje,partida,carrera,match3` (33 capturas verificadas en PC y celular) y `npx graphify update .` (3080 nodos, 7537 aristas).

---

## 4. Backlog Vivo de Oportunidades — Ciclo #22 (6 Áreas en Paralelo)

### A. Área 1 · Menú y Configuración (`src/menu.ts`, `src/menu.css`)
1. **Porcentajes Numéricos en Deslizadores de Audio (`SFX X% · MÚSICA Y%`):**
   - **Qué es:** En `renderCfg()` (`src/menu.ts`), exhibir el valor porcentual numérico en vivo junto a los títulos o cursores de volumen de efectos de sonido y música de fondo.
   - **Qué problema resuelve:** Los sliders permiten calibrar el audio pero no muestran la cifra exacta del nivel elegido.
   - **Valor:** Mayor precisión y claridad al ajustar el sonido en distintos dispositivos. Complejidad: Baja.

### B. Área 2 · HUD de Supervivencia (`src/ui.ts`, `src/hud.css`)
2. **Formateo de Chatarra con Separador de Miles en `#scrap`:**
   - **Qué es:** En `hudUpdate()` (`src/ui.ts`), formatear el acumulado de chatarra/gemas con separador numérico legible (`d.scrap.toLocaleString("es-ES")`).
   - **Qué problema resuelve:** En partidas largas donde se acumulan miles de piezas de chatarra, la lectura numérica continua dificulta evaluar el total de un vistazo.
   - **Valor:** Mayor legibilidad en partidas de supervivencia avanzadas. Complejidad: Baja.

### C. Área 3 · Carrera: Indicador de Marcha Atrás (`src/kart.ts`, `src/race.css`)
3. **Indicador de Marcha Atrás (`R`) en el Velocímetro de Carrera:**
   - **Qué es:** En `hud()` (`src/kart.ts`), mostrar una pastilla ámbar `.rrev` (`R`) junto a la velocidad en km/h cuando el auto se desplaza en retroceso (`h.fs < -0.5`).
   - **Qué problema resuelve:** Al chocar o girar en una curva cerrada, ayuda al piloto a confirmar inmediatamente si el motor está empujando hacia atrás.
   - **Valor:** Mejor retroalimentación de manejo en situaciones de rescate o maniobra. Complejidad: Baja.

### Ciclo #22 (2026-10-10) — Tornillos con Miles, Bajas Tabulares, Marcha Atrás en Carrera, Alerta Últimos Movimientos, Chispas Skid y Sello Archivador Polaroid
- **Alcance implementado en paralelo por 6 subagentes:**
  - **Subagente 1 · Garaje y Menú (`src/menu.ts`, `src/menu.css`):** Saldo de tornillos en el banco de Garaje y Taller formateado con miles (`save.scrap.toLocaleString("es-ES")`), y `#opts .row output` estilizado con números tabulares `font-variant-numeric: tabular-nums` y peso 700 para mantener estabilidad visual en sliders.
  - **Subagente 2 · HUD Supervivencia (`src/ui.ts`, `src/hud.css`):** Contador de bajas formateado con `toLocaleString("es-ES")` para números de 5+ cifras y alineación tabular estricta en `#lcd .sub`.
  - **Subagente 3 · Carrera Marcha Atrás (`src/kart.ts`, `src/race.css`):** Pastilla ámbar `.rrev` (`R`) junto al velocímetro cuando el corredor humano retrocede (`h.fs < -0.5`), facilitando la orientación en maniobras de rescate y trompos.
  - **Subagente 4 · Gabinete Junket Crush (`src/match3.ts`, `src/match3_draw.ts`):** Alerta visual con recuadro rojo translúcido detrás del medidor de movimientos y cambio de rótulo a `¡ÚLTIMOS!` cuando `movesLeft <= 3` en fase de juego.
  - **Subagente 5 · Efectos Visuales 3D (`src/fx.ts`):** Nuevo método `FX.skid(p, hard)` que emite polvo de fricción y chispas doradas/anaranjadas de tracción en derrapes cerrados.
  - **Subagente 6 · Cierre y Polaroid (`src/replay.ts`, `src/replay.css`):** Sello diegético `"ARCHIVADO · PATIO RC"` rotado en el pie inferior izquierdo de la foto polaroid.
- **Evidencia de validación:** `npx tsc --noEmit -p .`, `npm test` (75/75), `npm run build` (677 ms), `npm run shots -- --only garaje,partida,carrera,match3` (33 capturas verificadas en PC y celular) y `npx graphify update .` (3084 nodos, 7549 aristas).

### Ciclo #23 (2026-10-10) — Logros Avanzados "Casi Listo", Hito Nivel cada 10, Rebufo en Carrera, Halo 3 Estrellas Match-3, Polvo de Aterrizaje y Récord de Zona Polaroid
- **Alcance implementado en paralelo por 6 subagentes:**
  - **Subagente 1 · Garaje y Chatarroteca (`src/menu.ts`, `src/menu.css`):** Resaltado `.ach-near` con borde dorado `#ffd24a` y sello `"CASI LISTO"` en logros con $\ge 70\%$ de avance (supervivencia $\ge 420\text{ s}$ en desafíos de 10 min/diario, o auto ya adquirido en el garaje para victorias de vehículo).
  - **Subagente 2 · HUD Supervivencia (`src/ui.ts`, `src/hud.css`):** Conmutación reactiva de la clase `.milestone` sobre la pastilla `#lvl` cada 10 niveles (`level % 10 === 0 && level > 0`), otorgando degradado ámbar incandescente y resplandor áureo.
  - **Subagente 3 · Carrera Rebufo (`src/kart.ts`, `src/race.css`):** Mecánica de rebufo/succión aerodinámica en `stepRacer` cuando el jugador se sitúa detrás de un rival (cono de 2 a 11 m longitudinal, latitud $< 2.2$ m). Al rebasar 0.6 s acumulados, la velocidad punta sube un 15% (`top *= 1.15`) y se despliega la pastilla amarilla `.rslip` (`REBUFO`) en el velocímetro.
  - **Subagente 4 · Gabinete Junket Crush (`src/match3_draw.ts`, `src/match3.ts`):** Halo dorado exterior translúcido (`createRadialGradient`) de 12 px alrededor de las estaciones del mapa de campaña completadas con 3 estrellas perfectas.
  - **Subagente 5 · Efectos Visuales 3D (`src/fx.ts`):** Nueva rutina `FX.land(p, hard)` que emite polvo de patio denso (`#cdbd9c`) y dispersión amortiguada para transmitir peso físico contundente al impactar el suelo tras desniveles y saltos.
  - **Subagente 6 · Cierre y Polaroid (`src/replay.ts`, `src/replay.css`):** Distintivo en oro `"★ RÉCORD DE ZONA"` a la derecha del pie de fotos polaroid para partidas culminadas con victoria.
- **Evidencia de validación:** `npx tsc --noEmit -p .`, `npm test` (75/75), `npm run build` (555 ms), `npm run shots -- --only garaje,partida,carrera,match3` (33 capturas verificadas en PC y celular) y `npx graphify update .` (3092 nodos, 7567 aristas).

---

## 4. Backlog Vivo de Oportunidades — Ciclo #24 (6 Áreas en Paralelo)

### A. Área 1 · Garaje y Chatarroteca (`src/menu.ts`, `src/menu.css`)
1. **Contador de Victorias y Récord por Auto en Garaje (`.car-victories`):**
   - **Qué es:** En `renderGarage()` y tarjetas de autos, mostrar una pastilla técnica con las victorias obtenidas con ese chasis (`3 VICTORIAS` o `SIN VICTORIA`) y el mejor tiempo registrado.
   - **Qué problema resuelve:** Estimula el uso de todos los vehículos y proporciona trazabilidad directa de la trayectoria de cada auto sin tener que bucear en Estadísticas.
   - **Valor:** Fidelidad con el garaje y rejugabilidad por modelo. Complejidad: Baja.

### B. Área 2 · HUD de Supervivencia (`src/ui.ts`, `src/hud.css`)
2. **Resplandor de Blindaje Activo en la Barra de Salud (`#hp.shielded`):**
   - **Qué es:** En `hudUpdate()`, cuando el jugador cuenta con escudo de invulnerabilidad temporal o reducción extrema de daño, activar la clase `.shielded` sobre `#hp` con una franja cian eléctrica animada.
   - **Qué problema resuelve:** Comunica con claridad el estado de protección activa sin que el jugador deba adivinar si los impactos le restarán vida.
   - **Valor:** Lectura táctica instantánea en situaciones extremas. Complejidad: Baja.

### C. Área 3 · Carrera: Alerta de Peligro Próximo (`src/kart.ts`, `src/race.css`)
3. **Pastilla de Alerta por Amenaza Cercana (`.rthreat`):**
   - **Qué es:** En `hud()` de carrera, si un proyectil enemigo o vehículo hostil rueda a menos de 7 metros en trayectoria de impacto inminente, mostrar un indicador parpadeante ámbar/rojo `.rthreat` (`¡PELIGRO!`).
   - **Qué problema resuelve:** Otorga una fracción de segundo crítica para utilizar escudos, saltos o derrapes evasivos.
   - **Valor:** Tensión y capacidad de respuesta táctica en carreras cerradas. Complejidad: Baja.

### D. Área 4 · Gabinete Junket Crush (`src/match3_draw.ts`, `src/match3.ts`)
4. **Resplandor de Energía en Fichas Especiales Creadas:**
   - **Qué es:** En `drawTile()`, trazar un halo vibrante perimetral y destellos sutiles en piezas especiales (bombas de chatarra o relámpagos) para destacar su poder destructivo latente en el tablero.
   - **Qué problema resuelve:** Permite localizar de un vistazo las piezas reactivas en tableros abarrotados de chatarra.
   - **Valor:** Claridad visual y satisfacción en combos complejos. Complejidad: Baja.

### E. Área 5 · Efectos Visuales 3D (`src/fx.ts`)
5. **Efecto de Sobrecarga Eléctrica Tridimensional (`FX.shock`):**
   - **Qué es:** En `FX` (`src/fx.ts`), añadir el método `shock(p)` que emite una descarga concentrada de micro-arcos cian `#5be7ff` y violeta `#a855f7` de alta velocidad para impactos tesla y trampas electrificadas.
   - **Qué problema resuelve:** Diferencia visualmente el daño elemental eléctrico de las chispas ordinarias de fricción o impactos de fuego.
   - **Valor:** Riqueza visual y lectura semántica del tipo de daño. Complejidad: Baja.

### F. Área 6 · Cierre de Partida y Polaroid (`src/replay.ts`, `src/replay.css`)
6. **Anotación de Clima y Escenario en el Encabezado Polaroid:**
   - **Qué es:** En `showPhoto()` (`src/replay.ts`), imprimir en el pie una anotación técnica adicional en tono sepia tenue con la zona y clima de la sesión (`"PATIO · ATARDECER"` o `"NIEBLA CERRADA"`).
   - **Qué problema resuelve:** Contextualiza la memoria fotográfica al archivarse o compartirse.
   - **Valor:** Cohesión diegética y riqueza temática en las postales de cierre. Complejidad: Baja.

---

### Ciclo #24 (2026-10-10) — Victorias por Auto en Garaje, Blindaje Activo en Batería LiPo, Alerta de Proximidad en Carrera, Resplandor en Fichas Especiales, Sobrecarga Eléctrica 3D y Anotación Técnica Polaroid
- **Alcance implementado en paralelo por 6 subagentes:**
  - **Subagente 1 · Garaje y Chatarroteca (`src/menu.ts`, `src/menu.css`):** En `renderGarage()`, se integró la verificación de victorias registradas por auto (`save.ach.includes("gana_" + k)`). Se añade la insignia técnica áurea `.car-vic.won` (`★ VICTORIA REGISTRADA`) o neutral `.car-vic.pending` (`PENDIENTE DE VICTORIA`) en vehículos adquiridos.
  - **Subagente 2 · HUD Supervivencia (`src/ui.ts`, `src/hud.css`):** Soporte para `shield?: boolean` en `hudUpdate()` y activación reactiva con cache de la clase `#lipo.shielded`, otorgando halo perimetral cian eléctrico `rgba(0, 188, 212, .6)` y drop-shadow reforzado a las celdas de batería.
  - **Subagente 3 · Carrera Alerta (`src/kart.ts`, `src/race.css`):** Detección de proximidad inminente de rivales (< 3.5 m) en `hud()`, encendiendo la pastilla naranja intermitente `.rthreat` (`¡CERCA!`) con animación `r-blink`.
  - **Subagente 4 · Gabinete Junket Crush (`src/match3_draw.ts`, `src/match3.ts`):** En `drawPiece()`, enriquecimiento del aura de piezas especiales mediante gradiente radial pulsante (`r * 0.8` a `r * 1.35`) que proyecta una corona luminosa de alta energía hacia el tablero.
  - **Subagente 5 · Efectos Visuales 3D (`src/fx.ts`):** Nuevo método `FX.shock(p)` que dispara 8 micro-arcos veloces cian `#5be7ff` y violeta `#a855f7` de baja sustentación gravitatoria para efectos y trampas tesla.
  - **Subagente 6 · Cierre y Polaroid (`src/replay.ts`, `src/replay.css`):** Anotación técnica diegética `REGISTRO TÉCNICO · ESCENARIO: ${i.zone.toUpperCase()}` impresa en tipografía Rajdhani 600 y tono sepia en el pie de la Polaroid.
- **Evidencia de validación:** `npx tsc --noEmit -p .`, `npm test` (75/75), `npm run build` (572 ms), `npm run shots -- --only garaje,partida,carrera,match3` (33 capturas verificadas en PC y celular) y `npx graphify update .` (3095 nodos, 7576 aristas).

---

## 4. Backlog Vivo de Oportunidades — Ciclo #25 (6 Áreas en Paralelo)

### A. Área 1 · Garaje y Chatarroteca (`src/menu.ts`, `src/menu.css`)
1. **Insignia de Maestría en Estadísticas de Arma Favorita:**
   - **Qué es:** En `renderBestiary()` pestaña estadísticas, incorporar una insignia dorada con relieve `.fav-master` sobre el arma más utilizada cuando supere el 50% de las partidas o 100.000 de daño.
   - **Qué problema resuelve:** Resalta visualmente el arma insigne del jugador dentro del historial táctico de combate.
   - **Valor:** Reconocimiento de maestría táctica en la Chatarroteca. Complejidad: Baja.

### B. Área 2 · HUD de Supervivencia (`src/ui.ts`, `src/hud.css`)
2. **Resplandor Incandescente en Arco de Tacómetro a Velocidad Punta (`#txr.top`):**
   - **Qué es:** En `#txr.top`, intensificar el brillo del arco `#spdArc` con filtro drop-shadow ámbar de doble pase y pulso dinámico cuando el auto se mantiene al 90%+ de su velocidad punta.
   - **Qué problema resuelve:** Refuerza la sensación física de inercia y velocidad límite en persecuciones a fondo.
   - **Valor:** Retorno sensorial potente en el HUD analógico. Complejidad: Baja.

### C. Área 3 · Carrera: Indicador Acrobático de Vuelo / Salto (`src/kart.ts`, `src/race.css`)
3. **Pastilla de Salto y Vuelo en el Velocímetro (`.rair`):**
   - **Qué es:** En `hud()` de carrera, desplegar una pastilla cian translúcida `.rair` (`EN EL AIRE`) mientras el kart permanezca despegado del piso tras saltos en rampas o trampolines.
   - **Qué problema resuelve:** Comunica explícitamente el estado de vuelo durante saltos largos en carrera y colisiones de batalla.
   - **Valor:** Dinamismo visual en acrobacias y desniveles. Complejidad: Baja.

### D. Área 4 · Gabinete Junket Crush (`src/match3_draw.ts`, `src/match3.ts`)
4. **Halo de Impacto Masivo en Puntuaciones Altas:**
   - **Qué es:** En `match3.ts`, cuando un turno individual genere más de 500 puntos, disparar un pulso áureo sobre el medidor de puntaje y emitir partículas doradas flotantes.
   - **Qué problema resuelve:** Enfatiza jugadas excepcionales y encadenamientos épicos en el gabinete arcade.
   - **Valor:** Gratificación y feedback memorable en combos avanzados. Complejidad: Baja.

### E. Área 5 · Efectos Visuales 3D (`src/fx.ts`)
5. **Efecto de Salpicadura de Agua / Líquido en `FX.splash`:**
   - **Qué es:** En `FX` (`src/fx.ts`), añadir la rutina `splash(p)` con partículas translúcidas cian-blanquecinas de rápida disipación y dispersión parabólica para la pistola de agua y charcos.
   - **Qué problema resuelve:** Diferencia los impactos de líquido de los estallidos de humo o fragmentos de chatarra seca.
   - **Valor:** Diversidad elemental y consistencia con las armas acuáticas. Complejidad: Baja.

### F. Área 6 · Cierre de Partida y Polaroid (`src/replay.ts`, `src/replay.css`)
6. **Sello de Doblez Táctil en Esquinas de Polaroid:**
   - **Qué es:** En `showPhoto()`, trazar sombras angulares sutiles simulando dobleces o desgaste de papel fotográfico en los vértices del marco blanco.
   - **Qué problema resuelve:** Acercar aún más la estética a una fotografía física analógica manipulada en un taller mecánico.
   - **Valor:** Coherencia táctil con la dirección de arte diegética. Complejidad: Baja.

---

### Ciclo #25 (2026-10-10) — Maestría en Arma Favorita, Tacómetro Incandescente a Fondo, Pastilla en el Aire Carrera, Impacto Alto Match-3, Salpicadura Líquida FX y Doblez Polaroid
- **Alcance implementado en paralelo por 6 subagentes:**
  - **Subagente 1 · Garaje y Estadísticas (`src/menu.ts`, `src/menu.css`):** En `statsHtml()`, se evalúa el arma principal del desglose histórico y, si acumula $\ge 50.000$ de daño, se incorpora la pastilla dorada `.fav-badge` (`MAESTRÍA`).
  - **Subagente 2 · HUD Supervivencia (`src/ui.ts`, `src/hud.css`):** Animación reactiva `txr-top-glow` y resplandor drop-shadow áureo reforzado en el arco `#spdArc` al superar el 90% de velocidad punta en `#txr.top`.
  - **Subagente 3 · Carrera Acrobacia (`src/kart.ts`, `src/race.css`):** Detección de suspensión en el aire (`pos.y > 0.85`) en `hud()`, desplegando la pastilla cian reflectante `.rair` (`EN EL AIRE`) en el velocímetro tras rampas y saltos.
  - **Subagente 4 · Gabinete Junket Crush (`src/match3_draw.ts`, `src/match3.ts`):** En `beginStep()`, los turnos con ganancia $\ge 500$ puntos desencadenan un estallido de chatarra áurea `burst()` y un anillo expansivo brillante `rings.push` de radio ampliado `CELL * 2.2`.
  - **Subagente 5 · Efectos Visuales 3D (`src/fx.ts`):** Nuevo método `FX.splash(p)` con partículas cian-blanquecinas de dispersión parabólica para impactos acuáticos y charcos del patio.
  - **Subagente 6 · Cierre y Polaroid (`src/replay.ts`, `src/replay.css`):** Renderizado de sombra angular tenue de micro-doblez de papel en el vértice superior derecho del lienzo fotográfico polaroid.
- **Evidencia de validación:** `npx tsc --noEmit -p .`, `npm test` (75/75), `npm run build` (553 ms), `npm run shots -- --only garaje,partida,carrera,match3` (33 capturas verificadas en PC y celular) y `npx graphify update .` (3105 nodos, 7598 aristas).

---

### Ciclo #26 (2026-10-10) — Piloto Veterano, Racha Escalonada Glow, Turbo N2 Electrificado, Halo Pedidos Match-3, Chispas Soldadura FX y Récord Letalidad Polaroid
- **Alcance implementado en paralelo por 6 subagentes:**
  - **Subagente 1 · Garaje y Pilotos (`src/menu.ts`, `src/menu.css`):** Insignia técnica `<span class="vet-badge">★ VETERANO</span>` en pilotos propios con rodaje ($\ge 5$ partidas o $\ge 1$ victoria) en `renderGarage()`.
  - **Subagente 2 · HUD Supervivencia (`src/ui.ts`, `src/hud.css`):** Escalonamiento visual en hitos de racha de bajas (`#combo.t2` ámbar con glow; `#combo.t3` rojo fuego crítico con halo de 16 px, parpadeo y glow en barra).
  - **Subagente 3 · Carrera Turbo N2 (`src/kart.ts`, `src/race.css`):** Intensificación en mini-turbo nivel 2 (`.rturbo.t2`) con gradiente violeta/magenta, glow y animación `r-turbo-t2`.
  - **Subagente 4 · Gabinete Junket Crush (`src/match3_draw.ts`, `src/match3.ts`):** Halo iluminado con sombra verde esmeralda (`shadowColor = M3C.exito; shadowBlur = 8`) en pedidos completados del cabezal.
  - **Subagente 5 · Efectos Visuales 3D (`src/fx.ts`):** Método `FX.weld(p)` con 10 chispas blanquiazules concentradas `#e0f2fe` de alta velocidad y sustentación gravitatoria negativa.
  - **Subagente 6 · Cierre y Polaroid (`src/replay.ts`, `src/replay.css`):** Condecoración técnica `"★ ALTA LETALIDAD (100+)"` en fotos Polaroid con 100+ bajas.
- **Evidencia de validación:** `npx tsc --noEmit -p .`, `npm test` (75/75), `npm run build` (533 ms), `npm run shots -- --only garaje,partida,carrera,match3` (33 capturas verificadas en PC y celular) y `npx graphify update .` (3115 nodos, 7617 aristas).

---

## 4. Backlog Vivo de Oportunidades — Ciclo #27 (6 Áreas en Paralelo)

### A. Área 1 · Garaje y Chatarroteca (`src/menu.ts`, `src/menu.css`)
1. **Insignia de Chasis Blindado en Estadísticas de Carrocería (`.armor-badge`):**
   - **Qué es:** En `renderGarage()` para autos con alta resistencia base o blindaje pasivo, mostrar un sello técnico `.armor-badge` (`CHASIS REFORZADO`) junto a la barra de integridad.
   - **Qué problema resuelve:** Comunica visualmente la vocación tanque o resistente de vehículos específicos frente a los ligeros de velocidad.
   - **Valor:** Identidad de chasis y lectura de roles en el garaje. Complejidad: Baja.

### B. Área 2 · HUD de Supervivencia (`src/ui.ts`, `src/hud.css`)
2. **Animación de Pulso en Radio Transmisor al Activarse un Evento de Patio (`#radio.event-pulse`):**
   - **Qué es:** En `radioMsg()` (`src/ui.ts`), añadir la clase `.event-pulse` con resplandor naranja y parpadeo intermitente de la antena del transmisor al recibir alertas de eventos climáticos o hordas.
   - **Qué problema resuelve:** Llama la atención periférica del jugador sobre eventos críticos del patio sin invadir el centro de la pantalla.
   - **Valor:** Tensión diegética y claridad en eventos sorpresa. Complejidad: Baja.

### C. Área 3 · Carrera: Alerta de Trompo / Giro Incontrolado (`src/kart.ts`, `src/race.css`)
3. **Pastilla de Trompo y Pérdida de Tracción (`.rspin`):**
   - **Qué es:** En `hud()` de carrera, desplegar una pastilla ámbar/roja `.rspin` (`TROMPO`) cuando el kart entra en estado de spin tras pisar un obstáculo (aceite o cáscara de plátano).
   - **Qué problema resuelve:** Aclara la causa de la pérdida momentánea de control y velocidad.
   - **Valor:** Claridad de control en lances de carrera. Complejidad: Baja.

### D. Área 4 · Gabinete Junket Crush (`src/match3_draw.ts`, `src/match3.ts`)
4. **Resplandor Dorado en Barra de Movimientos al Recibir Turnos Extra (+3):**
   - **Qué es:** En `match3.ts`, cuando una habilidad o combo otorga movimientos adicionales, activar un halo áureo `M3C.amarillo` momentáneo sobre el medidor de turnos restantes.
   - **Qué problema resuelve:** Resalta visualmente la ganancia de turnos extra, un momento de alivio crucial.
   - **Valor:** Refuerzo positivo y feedback visual en momentos de rescate. Complejidad: Baja.

### E. Área 5 · Efectos Visuales 3D (`src/fx.ts`)
5. **Efecto de Ignición y Llamarada Corta en `FX.ignite`:**
   - **Qué es:** En `FX` (`src/fx.ts`), añadir la rutina `ignite(p)` con llamarada expansiva anaranjada `#ff5500` y núcleo amarillo `#ffe600` de corta duración para explosiones de combustible o bidones.
   - **Qué problema resuelve:** Proporciona un efecto específico de fuego con más densidad y volumen que las chispas estándar.
   - **Valor:** Textura de combustión para armas térmicas e incendios de patio. Complejidad: Baja.

### F. Área 6 · Cierre de Partida y Polaroid (`src/replay.ts`, `src/replay.css`)
6. **Sello de Firma del Mecánico Inspector en el Pie de la Polaroid:**
   - **Qué es:** En `showPhoto()`, trazar una firma caligráfica diegética simulada (`"INSPECCIONADO · TALLER CENTRAL"`) en tono grafito tenue en la base del papel.
   - **Qué problema resuelve:** Acentúa el carácter de informe técnico de peritaje tras cada desguace.
   - **Valor:** Cohesión temática y autenticidad en el archivo fotográfico. Complejidad: Baja.

### G. Área 7 · Audio Sintetizado (`src/sfx.ts`)
7. **Audio Procedural de Ignición de Combustible y Chirp de Radio:**
   - **Qué es:** En `SFX` (`src/sfx.ts`), incorporar los métodos `ignite()` (fogonazo térmico con ruido modulado) y `radioChirp()` (bip de radiofrecuencia).
   - **Qué problema resuelve:** Otorga feedback auditivo directo a explosiones de combustible y avisos por radio.
   - **Valor:** Identidad sonora y riqueza sensorial. Complejidad: Baja.

### H. Área 8 · Modelos Procedurales del Taller (`src/models.ts`)
8. **Defensa Frontal Reforzada en Vehículos Pesados:**
   - **Qué es:** En `carModel()` (`src/models.ts`), incorporar soporte de parrilla de protección de acero y soporte de defensa para modelos pesados (tanque y chasis reforzados).
   - **Qué problema resuelve:** Coherencia visual 3D con la insignia de chasis reforzado del garaje.
   - **Valor:** Contundencia visual en los modelos pesados. Complejidad: Baja.

---

### Ciclo #27 (2026-10-10) — Chasis Reforzado Garaje, Pulso Radio HUD, Trompo Carrera, Turnos Match-3, Fuego FX, Inspección Polaroid, SFX Ignite/Chirp y Parrilla Tanque 3D
- **Alcance implementado en paralelo por 8 subagentes:**
  - **Subagente 1 · Garaje y Chasis (`src/menu.ts`, `src/menu.css`):** Insignia técnica `<span class="armor-badge">CHASIS REFORZADO</span>` en vehículos pesados (`tanque`, `monster`, `combi`).
  - **Subagente 2 · HUD Supervivencia (`src/ui.ts`, `src/hud.css`):** Pulso reactivo `.event-pulse` y resplandor de advertencia en avisos diegéticos de radio ante eventos críticos.
  - **Subagente 3 · Carrera Trompo (`src/kart.ts`, `src/race.css`):** Pastilla de trompo y pérdida de tracción `<b class="rspin">¡TROMPO!</b>` en velocímetro tras pérdida de control.
  - **Subagente 4 · Gabinete Junket Crush (`src/match3.ts`):** Resplandor áureo perimetral en display numérico de movimientos al disponer de $\ge 10$ turnos en fase de juego.
  - **Subagente 5 · Efectos Visuales 3D (`src/fx.ts`):** Llamarada expansiva con núcleo incandescente amarillo y halo naranja en `FX.ignite(p)`.
  - **Subagente 6 · Cierre y Polaroid (`src/replay.ts`):** Sello caligráfico diegético de peritaje técnico `"INSPECCIONADO · TALLER CENTRAL"`.
  - **Subagente 7 · Audio Sintetizado (`src/sfx.ts`):** Métodos procedurales WebAudio `SFX.ignite()` (combustión) y `SFX.radioChirp()` (sincronía de radio).
  - **Subagente 8 · Modelos Procedurales (`src/models.ts`):** Parrilla frontal con marco mate y rejilla cromada de acero (`chrome`) en chasis tanque.
- **Evidencia de validación:** `npx tsc --noEmit -p .`, `npm test` (75/75), `npm run build` (545 ms), `npm run shots -- --only garaje,partida,carrera,match3` (33 capturas verificadas en PC y celular en 37.1 s) y `npx graphify update .` (3120 nodos, 7627 aristas).

---

## 4. Backlog Vivo de Oportunidades — Ciclo #28 (8 Áreas en Paralelo)

### A. Área 1 · Garaje y Chatarroteca (`src/menu.ts`, `src/menu.css`)
1. **Filtro Rápido o Contador de Piezas Desbloqueadas en Chatarroteca:**
   - **Qué es:** En `renderBestiary()` o encabezado de Chatarroteca, exhibir el resumen de piezas coleccionadas (`X/Y PIEZAS DISPONIBLES`).
   - **Qué problema resuelve:** Comunica el progreso global de desbloqueo de piezas de taller sin obligar al jugador a recorrer todas las pestañas.
   - **Valor:** Sensación de colección y completitud. Complejidad: Baja.

### B. Área 2 · HUD de Supervivencia (`src/ui.ts`, `src/hud.css`)
2. **Resplandor Verde de Recarga / Reparación en Batería LiPo (`#lipo.healing`):**
   - **Qué es:** En `hudUpdate()`, cuando la vida aumenta tras recoger una llave o mejora de curación, emitir un destello esmeralda `.healing` sobre las celdas de batería.
   - **Qué problema resuelve:** Feedback sensorial claro de recuperación de salud en combate caótico.
   - **Valor:** Recompensa de alivio y claridad de supervivencia. Complejidad: Baja.

### C. Área 3 · Carrera: Velocidad Máxima en Tacómetro (`src/kart.ts`, `src/race.css`)
3. **Pastilla de Velocidad Punta (`.rmax`):**
   - **Qué es:** En `hud()` de carrera, encender una pastilla ámbar `.rmax` (`MÁXIMA`) cuando el kart alcanza el 98%+ de su velocidad tope.
   - **Qué problema resuelve:** Informa al piloto de que el vehículo ya no puede acelerar más por tracción pura salvo que use turbo o rebufo.
   - **Valor:** Precisión en la gestión de velocidad y turbos. Complejidad: Baja.

### D. Área 4 · Gabinete Junket Crush (`src/match3_draw.ts`, `src/match3.ts`)
4. **Partículas Brillantes en Creación de Piezas Especiales:**
   - **Qué es:** En `spawnSpecial()`, emitir un destello estelar perimetral en la celda donde se fusionan 4 o más piezas para crear una bomba o relámpago.
   - **Qué problema resuelve:** Destaca el instante mágico de creación de un ítem especial en el tablero.
   - **Valor:** Gratificación visual inmediata en combinaciones estratégicas. Complejidad: Baja.

### E. Área 5 · Efectos Visuales 3D (`src/fx.ts`)
5. **Efecto de Vapor y Escape Térmico en `FX.steam`:**
   - **Qué es:** En `FX` (`src/fx.ts`), añadir la rutina `steam(p)` con nubes blanquecinas translúcidas de elevación lenta y desvanecimiento suave para recalentamiento o contacto de motor con agua.
   - **Qué problema resuelve:** Enriquece las transiciones térmicas del vehículo y charcos del patio.
   - **Valor:** Densidad ambiental y atmósfera mecánica. Complejidad: Baja.

### F. Área 6 · Cierre de Partida y Polaroid (`src/replay.ts`, `src/replay.css`)
6. **Sello de Turno de Taller en Pie de Polaroid:**
   - **Qué es:** En `showPhoto()`, incluir un cuño adicional en el pie del marco con el turno operativo (`"GUARDIA NOCTURNA"`).
   - **Qué problema resuelve:** Acentúa la inmersión del taller en el archivo fotográfico.
   - **Valor:** Coherencia de mundo y autenticidad diegética. Complejidad: Baja.

### G. Área 7 · Audio Sintetizado (`src/sfx.ts`)
7. **Efecto de Escape de Vapor y Válvula de Alivio en `SFX.steamHiss`:**
   - **Qué es:** En `SFX` (`src/sfx.ts`), incorporar el método `steamHiss()` con ruido siseante filtrado pasa-altos y caída suave de presión.
   - **Qué problema resuelve:** Feedback auditivo para válvulas de desahogo y evaporación de agua.
   - **Valor:** Riqueza acústica y variedad de texturas sonoras. Complejidad: Baja.

### H. Área 8 · Modelos Procedurales del Taller (`src/models.ts`)
8. **Detalle de Soportes y Tirantes en Alerones de Carrera:**
   - **Qué es:** En `carModel()` (`src/models.ts`), incorporar tensores o soportes diagonales en los alerones de fórmula y carrera.
   - **Qué problema resuelve:** Da soporte estructural realista a los apéndices aerodinámicos de alta velocidad.
   - **Valor:** Fidelidad técnica de maquetismo RC. Complejidad: Baja.

---

### Ciclo #28 (2026-10-10) — Contador Colección Garaje, LiPo Healing Glow, Carrera Máxima, Fusión Estelar Match-3, Vapor FX, Guardia Nocturna Polaroid, SFX Steam Hiss y Tirantes Alerón 3D
- **Alcance implementado en paralelo por 8 subagentes:**
  - **Subagente 1 · Garaje Colección (`src/menu.ts`, `src/menu.css`):** Contador de colección `<span class="car-tally">${ownedCars}/${total} AUTOS</span>` en el saldo del banco del garaje.
  - **Subagente 2 · HUD Supervivencia (`src/ui.ts`, `src/hud.css`):** Destello esmeralda `.healing` (`lipo-heal`) en celdas de batería LiPo al recuperar vida.
  - **Subagente 3 · Carrera Máxima (`src/kart.ts`, `src/race.css`):** Pastilla de velocidad punta `<b class="rmax">MÁXIMA</b>` en tacómetro al alcanzar $\ge 96\%$ del tope.
  - **Subagente 4 · Gabinete Junket Crush (`src/match3.ts`):** Estallido estelar luminoso al forjar piezas reactivas especiales en el tablero.
  - **Subagente 5 · Efectos Visuales 3D (`src/fx.ts`):** Rutina `FX.steam(p)` con nubes translúcidas de elevación térmica para escapes y charcos.
  - **Subagente 6 · Cierre y Polaroid (`src/replay.ts`):** Sello diegético `"GUARDIA NOCTURNA · PATIO CENTRAL"` en el pie de la Polaroid.
  - **Subagente 7 · Audio Sintetizado (`src/sfx.ts`):** Sonido procedural `SFX.steamHiss()` para descompresión de vapor.
  - **Subagente 8 · Modelos Procedurales (`src/models.ts`):** Tirantes estructurales metálicos en alerones de alta velocidad.
- **Evidencia de validación:** `npx tsc --noEmit -p .`, `npm test` (75/75), `npm run build` (556 ms), `npm run shots -- --only garaje,partida,carrera,match3` (33 capturas verificadas en PC y celular en 35.4 s) y `npx graphify update .` (3132 nodos, 7650 aristas).

---

### Ciclo #29 (2026-10-10) — Piezas de Serie en Garaje, Alerta Crítica en Barra de Jefe, Rebase Carrera, Metas Secundarias Match-3, Niebla FX, Odómetro Polaroid, SFX Relay y Resortes Monster 3D
- **Alcance implementado en paralelo por 8 subagentes:**
  - **Subagente 1 · Garaje Piezas (`src/menu.ts`, `src/menu.css`):** Distintivo `.stock-tag` (`DE SERIE`) en opciones base sin costo en el selector de piezas del taller.
  - **Subagente 2 · HUD Supervivencia (`src/ui.ts`, `src/hud.css`):** Resplandor perimetral y marco carmesí pulsante de alarma en `#bossbar.crit` cuando el jefe cae a menos del 25% de vida.
  - **Subagente 3 · Carrera Rebase (`src/kart.ts`, `src/race.css`):** Pastilla verde reactiva `<b class="rover">¡REBASE!</b>` junto al velocímetro al adelantar competidores en pista.
  - **Subagente 4 · Gabinete Junket Crush (`src/match3.ts`):** Halo y trazo cian eléctrico `M3C.cian` en metas secundarias de puntaje cumplidas (`g.k === "score"`).
  - **Subagente 5 · Efectos Visuales 3D (`src/fx.ts`):** Rutina `FX.mist(p)` con micro-partículas de condensación térmica a ras de suelo para charcos y zonas frías.
  - **Subagente 6 · Cierre y Polaroid (`src/replay.ts`):** Sello diegético de odómetro con kilometraje calculado `"ODÓMETRO · REGISTRO X.X KM"` en el pie de la foto Polaroid.
  - **Subagente 7 · Audio Sintetizado (`src/sfx.ts`):** Sonido procedural `SFX.relayClick()` con pulsos cuadrados breves que simulan un relé de contactor magnético.
  - **Subagente 8 · Modelos Procedurales (`src/models.ts`):** Anillos helicoidales concéntricos oscuros en amortiguadores Monster para un look mecánico de muelle reforzado.
- **Evidencia de validación:** `npx tsc --noEmit -p .` (0 errores), `npm test` (75/75 pasando en 29.8 s), `npm run build` (578 ms), `npm run shots -- --only garaje,partida,carrera,match3` (33 capturas verificadas en PC y celular en 35.7 s) y `graphify update .` (3144 nodos, 7670 aristas).

---

### Ciclo #30 (2026-10-10) — Insignia Totalmente Equipado en Garaje, Resplandor Crítico HUD, Sector Final Carrera, Herramienta Armada Match-3, Humo Burnout FX, Firma Polaroid, SFX Overtake y Remaches 3D
- **Alcance implementado en paralelo por 8 subagentes:**
  - **Subagente 1 · Garaje Equipamiento (`src/menu.ts`, `src/menu.css`):** Insignia `.parts-complete` (`TOTALMENTE EQUIPADO`) en autos del garaje cuando el jugador posee todas las piezas del catálogo `PARTS`.
  - **Subagente 2 · HUD Supervivencia (`src/ui.ts`, `src/hud.css`):** Resplandor áureo vibrante en números de daño crítico `#dmg span.crit` (`text-shadow: 0 0 16px rgba(...)`) y estilización del marco `#clock.endless` al rebasar 10 minutos.
  - **Subagente 3 · Carrera Sector Final (`src/kart.ts`, `src/race.css`):** Pastilla parpadeante `<b class="rfinal">SECTOR FINAL</b>` en la última vuelta tras superar el 85% del circuito.
  - **Subagente 4 · Gabinete Junket Crush (`src/match3_draw.ts`, `src/match3.ts`, `src/match3.css`):** Animación pulsante incandescente `m3-tool-pulse` en botones de herramientas armadas con soporte para `prefers-reduced-motion`.
  - **Subagente 5 · Efectos Visuales 3D (`src/fx.ts`):** Rutina `FX.burnout(p)` con 10 partículas de humo denso de fricción para arrancadas desde reposo y derrapes en seco.
  - **Subagente 6 · Cierre y Polaroid (`src/replay.ts`, `src/replay.css`):** Sello caligráfico de peritaje `"VºBº JEFE DE TALLER"` en el pie del documento Polaroid a la derecha.
  - **Subagente 7 · Audio Sintetizado (`src/sfx.ts`):** Barrido armónico procedural ascendente `SFX.overtake()` (620→1240 Hz y 1240→1860 Hz) para adelantamientos limpios.
  - **Subagente 8 · Modelos Procedurales (`src/models.ts`):** Remaches metálicos esféricos cromados a lo largo del perfil de chapa para la combi y el buggy.
- **Evidencia de validación:** `npx tsc --noEmit -p .` (0 errores), `npm test` (75/75 pasando en 28.3 s), `npm run build` (531 ms), `npm run shots -- --only garaje,partida,carrera,match3` (33 capturas verificadas en PC y celular en 35.9 s) y `graphify update .` (3147 nodos, 7677 aristas).

---

### Ciclo #31 (2026-10-10) — Porcentaje Taller Garaje, Sobrecarga Voltímetro HUD, Derrape Perfecto Carrera, Retícula Herramienta Match-3, Chispas Rasantes FX, Hora Cierre Polaroid, SFX Podium Fanfare y Antena RC 3D
- **Alcance implementado en paralelo por 8 subagentes:**
  - **Subagente 1 · Garaje Desbloqueo (`src/menu.ts`, `src/menu.css`):** Pastilla de porcentaje global `.parts-pct` (`X% TALLER`) en saldo del Garaje informando el progreso de personalización.
  - **Subagente 2 · HUD Supervivencia (`src/ui.ts`, `src/hud.css`):** Resplandor cian reactivo de sobrecarga `#volt.surge` al activar el salto o descarga de LiPo.
  - **Subagente 3 · Carrera Derrape (`src/kart.ts`, `src/race.css`):** Pastilla magenta `<b class="rperfect">¡PERFECTO!</b>` al sostener derrapes largos de nivel 2.
  - **Subagente 4 · Gabinete Junket Crush (`src/match3_draw.ts`, `src/match3.ts`, `src/match3.css`):** Modo de retícula táctica con cursor en cruz (`cursor: crosshair`) en `#match3-ui.m3-armed` con herramienta armada.
  - **Subagente 5 · Efectos Visuales 3D (`src/fx.ts`):** Rutina `FX.scrape(p)` con 6 micro-chispas rasantes para rozaduras laterales de carrocería.
  - **Subagente 6 · Cierre y Polaroid (`src/replay.ts`, `src/replay.css`):** Sello diegético con hora local de registro `"HORA REGISTRO · HH:MM"` en el pie del marco.
  - **Subagente 7 · Audio Sintetizado (`src/sfx.ts`):** Fanfarria procedural de podio `SFX.podiumFanfare()` con arpegio mayor C5-E5-G5-C6.
  - **Subagente 8 · Modelos Procedurales (`src/models.ts`):** Antena RC flexible de cable metálico con banderín plástico rojo en la aleta trasera.
- **Evidencia de validación:** `npx tsc --noEmit -p .` (0 errores), `npm test` (75/75 pasando en 30.0 s), `npm run build` (562 ms), `npm run shots -- --only garaje,partida,carrera,match3` (33 capturas verificadas en PC y celular en 35.0 s) y `graphify update .` (3150 nodos, 7682 aristas).

### Ciclo #32 (2026-10-10) — Blindaje Pesado Garaje, Resplandor XP HUD, Rival Frontal Carrera, Destello Estelar Match-3, Overheat FX, Lote Polaroid, Scrap Clink SFX y Tensores Formula 3D
- **Alcance implementado en paralelo por 8 subagentes:**
  - **Subagente 1 · Garaje Blindaje (`src/menu.ts`, `src/menu.css`):** Insignia distintiva `.heavy-armor` (`BLINDAJE PESADO`) en autos con carrocería base $\ge 250$ (`tanque`, `monster`) para destacar su rol de ariete.
  - **Subagente 2 · HUD Supervivencia (`src/ui.ts`, `src/hud.css`):** Resplandor esmeralda pulsante `#xp.surge` con destello y brillo energizado al alcanzar el nivel y abrir mejoras.
  - **Subagente 3 · Carrera Proximidad (`src/kart.ts`, `src/race.css`):** Pastilla de advertencia táctica `<b class="rahead">RIVAL DELANTE</b>` en tacómetro al rodar a menos de $2.8\text{ m}$ detrás de un competidor en su trayectoria.
  - **Subagente 4 · Gabinete Junket Crush (`src/match3_draw.ts`, `src/match3.ts`, `src/match3.css`):** Destello estelar de 4 puntas luminoso en esquina superior de tarjetas de metas primarias y secundarias completadas.
  - **Subagente 5 · Efectos Visuales 3D (`src/fx.ts`):** Rutina `FX.overheat(p)` con bocanadas de vapor térmico anaranjado-rojizo de motor al límite.
  - **Subagente 6 · Cierre y Polaroid (`src/replay.ts`, `src/replay.css`):** Sello diegético analógico `"LOTE FOTOGRÁFICO #XXXX"` en el pie del marco documental.
  - **Subagente 7 · Audio Sintetizado (`src/sfx.ts`):** Tintineo metálico cristalino procedural `SFX.scrapClink()` modulado en doble armónico para recolección de chatarra.
  - **Subagente 8 · Modelos Procedurales (`src/models.ts`):** Tirantes y tensores diagonales cromados en trompa y suspensión del Formula monoplaza.
- **Evidencia de validación:** `npx tsc --noEmit -p .` (0 errores), `npm test` (75/75 pasando en 30.2 s), `npm run build` (392 ms), `npm run shots -- --only garaje,partida,carrera,match3` (33 capturas verificadas en PC y celular en 29.4 s) y `graphify update .` (3153 nodos, 7691 aristas).

### Ciclo #33 (2026-10-10) — Chasis Liviano y Pinturas Garaje, Pánico LiPo HUD, Marcha Atrás y Tapón 3D Carrera, Retícula Activa Match-3, Plasma Zap FX, Alerta Colisión SFX y Sello LiPo Polaroid
- **Alcance implementado en paralelo por 4 subagentes consolidados:**
  - **Subagente 1 · Garaje, Taller y Menús (`src/menu.ts`, `src/menu.css`):**
    - Insignia reflectante `.light-frame` (`CHASIS LIVIANO`) en vehículos de alta velocidad y bajo peso (`formula`, `carrera`, `axel`) para comunicar el balance agilidad vs resistencia.
    - Pastilla `.paints-pct` (`${ownedPaints}/${total} PINTURAS`) en el panel de saldo del taller, completando las métricas de colección.
  - **Subagente 2 · HUD y Telemetría de Supervivencia (`src/ui.ts`, `src/hud.css`):**
    - Estado de pánico crítico `#hud.panic` con viñeta perimetral roja acelerada (`animation: h-pulse .45s steps(2) infinite; box-shadow: inset 0 0 120px 20px rgba(239, 68, 68, .6)`) y oscilación de advertencia en voltímetro `#volt` cuando la batería LiPo desciende del 15%.
    - Resaltado táctico `.ready` en verde esmeralda resplandeciente (`#5be37a`) en el indicador de salto `#jump` cuando está listo para activar.
  - **Subagente 3 · Carrera, Tacómetro y Modelado 3D (`src/kart.ts`, `src/race.css`, `src/models.ts`):**
    - Pastilla de marcha atrás `<b class="rback">MARCHA ATRÁS</b>` en velocímetro de carrera al maniobrar en reversa ($fs < -0.5$).
    - Tapón cilíndrico cromado lateral de recarga de batería (`cyl(0.024, 0.024, 0.015, chrome, ...)`) en la aleta trasera de los modelos deportivo, pickup y combi.
  - **Subagente 4 · Gabinete Junket Crush, Audio SFX, Efectos FX y Polaroid (`src/match3.ts`, `src/fx.ts`, `src/sfx.ts`, `src/replay.ts`):**
    - Retícula de cuatro esquinas reforzadas de 8 px en cian o amarillo claro sobre la celda activa seleccionada o armada en el tablero Match-3.
    - Rutina `FX.sparkZap(p)` con 8 micro-partículas de plasma eléctrico azul y cian de arco voltaico de alta velocidad.
    - Generador sonoro `SFX.collisionWarning()` con doble tono de onda de sierra a 880 Hz para alarmas de proximidad o impacto.
    - Sello analógico diegético `"BATERÍA LiPo · DESCARGA TOTAL"` en tinta técnica sepia en el pie de la foto Polaroid al terminar la partida.
- **Evidencia de validación:** `npx tsc --noEmit -p .` (0 errores), `npm test` (75/75 pasando en 20.7 s), `npm run build` (455 ms), `npm run shots -- --only garaje,partida,carrera,match3` (33 capturas verificadas en PC y celular en 30.5 s) y `graphify update .` (3156 nodos, 7699 aristas).

---

## 4. Backlog Vivo de Oportunidades — Ciclo #34 (4 Áreas Consolidadas)

### A. Subagente 1 · Garaje, Taller y Menús (`src/menu.ts`, `src/menu.css`)
1. **Insignia de Tracción Integral / Agarre en Autos Pesados (`.all-wheel`) e Indicador de Equipamiento en Ranuras de Taller:**
   - **Qué es:** En `renderGarage()`, identificar a vehículos con tracción o masa reforzada con la pastilla `.all-wheel` (`TRACCIÓN TOTAL`). En `renderParts()`, añadir un micro-contador de opciones equipadas por ranura.
   - **Qué problema resuelve:** Enriquece la identidad mecánica de cada auto y facilita la gestión de piezas en el taller.
   - **Valor:** Visibilidad de configuración e inmersión diegética. Complejidad: Media.

### Ciclo #34 (2026-10-10) — Tracción Total y Ranuras Taller, Armas Máximas y Pulso Térmico HUD, Succión y Tuercas 3D Carrera, Choque Combos Match-3, Humo Criogénico FX, SFX Boost y Sello Alcance Polaroid
- **Alcance implementado en paralelo por 4 subagentes consolidados:**
  - **Subagente 1 · Garaje, Taller y Menús (`src/menu.ts`, `src/menu.css`):**
    - Insignia reflectante `.all-wheel` (`TRACCIÓN TOTAL`) en autos con tracción y masa reforzada (`monster`, `tanque`, `pickup`) en el Garaje.
    - Conteo de opciones de piezas desbloqueadas `<em class="slot-count">(${ownedSl}/${totalSl})</em>` junto al título de cada ranura en el taller de personalización.
  - **Subagente 2 · HUD y Telemetría de Supervivencia (`src/ui.ts`, `src/hud.css`):**
    - Resaltado áureo de armas evolucionadas al nivel 5 o máximo `.evo.max` con halo pulsante rápido (`box-shadow: 0 0 14px rgba(255, 210, 74, .65)`).
    - Pulso térmico en tacómetro `#txr.blazing` con borde naranja ardiente y texto incandescente al rodar a velocidad punta ($\ge 95\%$).
  - **Subagente 3 · Carrera, Tacómetro y Modelado 3D (`src/kart.ts`, `src/race.css`, `src/models.ts`):**
    - Pastilla púrpura de succión plena `<b class="rslip-max">¡SUCCIÓN!</b>` en tacómetro de carrera ante rebufo fuerte a corta distancia ($slip > 1.2$).
    - Tuercas centrales cromadas hexagonales de fijación rápida (`cyl(0.018, 0.018, 0.02, chrome, ...)`) en las cuatro ruedas de competición para Formula y Carrera.
  - **Subagente 4 · Gabinete Junket Crush, Audio SFX, Efectos FX y Polaroid (`src/match3.ts`, `src/fx.ts`, `src/sfx.ts`, `src/replay.ts`):**
    - Marco de choque estroboscópico dorado en el display arcade al alcanzar reacciones en cadena de combo $\ge 4$.
    - Rutina `FX.nitrogenFreeze(p)` con 10 partículas criogénicas translúcidas azuladas para efectos térmicos bajo cero.
    - Generador sonoro `SFX.boostSurge()` con doble barrido armónico ascendente de modulación para aceleración turbo.
    - Sello analógico diegético `"ALCANCE MÁXIMO DE PATIO (5+ MIN)"` en tinta sepia en el pie de la Polaroid en partidas largas.
- **Evidencia de validación:** `npx tsc --noEmit -p .` (0 errores), `npm test` (75/75 pasando en 19.5 s), `npm run build` (399 ms), `npm run shots -- --only garaje,partida,carrera,match3` (33 capturas verificadas en PC y celular en 29.3 s) y `graphify update .` (3155 nodos, 7700 aristas).

---

#### Ciclo #35 (2026-10-10) — Ecosistema Matricial de Especialistas: Alto Régimen y Patrones Cabina, Destello LiPo 100% y Alerta Turbo HUD, Tomas de Aire Cromadas 3D en Capó, Brake Screech y LiPo Full SFX
- **Alcance implementado por 4 especialistas en paralelo (partición disjunta estricta):**
  - **Especialista 1 · Menu, Workshop & Flow (`src/menu.ts`, `src/menu.css`):**
    - Insignia reflectante `.high-rev` (`ALTO RÉGIMEN`) en autos de aceleración extrema o giro ágil (`carrera`, `formula`, `axel`) en el Garaje.
    - Barra de estado diegético `.paint-status` en cabina de pintura con contadores reactivos de zonas personalizadas (`PATRONES: X/3 ZONAS`) y calco de capó activo.
  - **Especialista 2 · Diegetic HUD & Telemetry (`src/ui.ts`, `src/hud.css`):**
    - Destello áureo diegético `#lipo.full-flash` con resplandor verde esmeralda al alcanzar el 100% de batería LiPo o completar reparación de pack.
    - Sincronización continua `hudTurbo(ready)` con atenuación y desaturación del botón de impulso (`#boost.warn`, `#boost.charging`) cuando la carga no está al 100%, más unificación del aviso en salto `#jump.warn`.
  - **Especialista 3 · Procedural 3D & Folded Modeler (`src/models.ts`):**
    - Tomas de aire gemelas con carcasa cromada y orificio interior oscuro profundo sobre el capó en vehículos pesados y musculosos (`monster`, `combi`).
  - **Especialista 4 · Audio & Synth Sound Designer (`src/sfx.ts`):**
    - Síntesis sonora procedural `SFX.brakeScreech()` con onda de sierra descendente y refuerzo sub-armónico para emular fricción violenta de frenada.
    - Tono armónico ascendente en dos etapas `SFX.lipoFull()` para confirmación auditiva de pack LiPo al 100%.
- **Evidencia de validación:** `npx tsc --noEmit -p .` (0 errores), `npm test` (75/75 pasando), `npm run build` (659 ms), `pm2 restart rc-test`, `npm run shots -- --only garaje,partida,carrera,match3` (33 capturas en PC y celular sin errores en 29.5 s) y `graphify update .` (3194 nodos, 7752 aristas).

### Ciclo #36 (2026-10-10) — Ecosistema Matricial de Especialistas: Acabados Glossy y Paquete Aero en Taller, Voltage Sag y Celdas LiPo en HUD, Shaker Scoop y Jaula 3D, Paneo Estéreo y Alarma Espacial SFX
- **Alcance implementado por 4 especialistas en paralelo (partición disjunta estricta):**
  - **Especialista 1 · Menu, Workshop & Flow (`src/menu.ts`, `src/menu.css`):**
    - Micro-indicador de acabado `.glossy` con destello especular en muestras de pintura metálica o de alta saturación en `renderPaint()`.
    - Insignia diegética `<span class="aero-pkg">PAQUETE AERO</span>` en Garaje al instalar alerón y faldón/paragolpes de competición.
  - **Especialista 2 · Diegetic HUD & Telemetry (`src/ui.ts`, `src/hud.css`):**
    - Simulación de caída de tensión LiPo (*Voltage Sag*) en `hudUpdate()` (`sag = 0.22V`) con alternancia de la clase `#volt.sag` (ámbar fosforescente con oscilación rápida) durante turbo o salto.
    - Desbalanceo crítico de celdas LiPo en pánico (`p < 0.15`) mediante la clase `.unbalanced` con parpadeo asimétrico en la primera celda (`@keyframes lipo-cell-sag`).
  - **Especialista 3 · Procedural 3D & Folded Modeler (`src/models.ts`):**
    - Filtro cónico de inducción o shaker scoop expuesto en rojo y cromo sobre el capó de `deportivo` y `pickup`.
    - Jaula antivuelco interna tubular con barras diagonales cruzadas en la cabina abierta de `buggy`.
  - **Especialista 4 · Audio & Synth Sound Designer (`src/sfx.ts`):**
    - Paneo estéreo opcional (`pan?: number`, -1 a 1) en el oscilador base `tone()` mediante `StereoPannerNode` de WebAudio.
    - Soporte direccional en `SFX.collisionWarning(pan)` y nueva primitiva de alarma espacial `SFX.spatialAlert(pan)`.
- **Evidencia de validación:** `npx tsc --noEmit -p .` (0 errores), `npm test` (75/75 pasando), `npm run build` (424 ms), `pm2 restart rc-test`, `npm run shots -- --only garaje,partida,carrera,match3` (33 capturas en PC y celular sin errores en 29.6 s) y `graphify update .` (71/71 archivos uncached validados).

---

## 4. Backlog Vivo de Oportunidades — Ciclo #37 (Especialistas Matriciales)

### Ciclo #37 (2026-10-10) — Ecosistema Matricial de Especialistas: Filtros de Pintura y Paquete Off-Road en Taller, Glitch CRT y RSSI Periférico en HUD, Pack LiPo XT60 y Red Lateral 3D, Paneo en Ruido Filtrado SFX
- **Alcance implementado por 4 especialistas en paralelo (partición disjunta estricta):**
  - **Especialista 1 · Menu, Workshop & Flow (`src/menu.ts`, `src/menu.css`):**
    - Barra reactiva de filtros de acabado `.paint-filters` ("TODOS", "BRILLO/METAL", "MATES") en `renderPaint()`.
    - Insignia diegética `<span class="rally-pkg">PAQUETE OFF-ROAD</span>` en verde oliva en el resumen de taller `#bankG` y en la ranura de ruedas para configuraciones todoterreno.
  - **Especialista 2 · Diegetic HUD & Telemetry (`src/ui.ts`, `src/hud.css`):**
    - Rutina `hudImpactGlitch()` con clase `#hud.glitch` (160 ms de sacudida CRT `@keyframes hud-jitter` y realce momentáneo de contraste/brillo ante impactos).
    - Atenuación diegética de radio `#signal.fringe` (opacidad 0.6 y escala de grises 0.4) cuando el vehículo opera a más de 75 m del centro del patio.
  - **Especialista 3 · Procedural 3D & Folded Modeler (`src/models.ts`):**
    - Pack de batería LiPo azul con cables de silicona rojo/negro y ficha de conexión XT60 amarilla en bandeja trasera de `buggy` y `monster`.
    - Red de protección de habitáculo en nylon mate en la ventanilla del piloto para `carrera` y `deportivo`.
  - **Especialista 4 · Audio & Synth Sound Designer (`src/sfx.ts`):**
    - Paneo estéreo en la primitiva de ruido filtrado `hiss()` con `StereoPannerNode`.
    - Nueva primitiva de fricción direccional `SFX.spatialHiss(pan, dur)` y propagación de `pan` hacia `scrape`, `drift`, `scrapClink` y `brakeScreech`.
- **Evidencia de validación:** `npx tsc --noEmit -p .` (0 errores), `npm test` (75/75 pasando), `npm run build` (429 ms), `pm2 restart rc-test`, `npm run shots -- --only garaje,partida,carrera,match3` (33 capturas en PC y celular sin errores en 30.4 s) y `graphify update .` (3237 nodos, 7815 aristas).

---

## 4. Backlog Vivo de Oportunidades — Ciclo #38 (Especialistas Matriciales)

### Ciclo #38 (2026-10-10) — Ecosistema Matricial de Especialistas: Swatch Peek y Tracción en Taller, Micro-RF Loss en HUD, Servos y Switch 3D, Rolloff y Colisión Dinámica SFX
- **Alcance implementado por 4 especialistas en paralelo (partición disjunta estricta):**
  - **Especialista 1 · Menu, Workshop & Flow (`src/menu.ts`, `src/menu.css`):**
    - Previsualización dinámica de pintura en foco (`peek.paint`) sobre el modelo 3D activo al navegar las muestras con gamepad, teclado o ratón, con restauración limpia en desenfoque.
    - Insignia de tracción total `<span class="all-wheel">TRACCIÓN TOTAL</span>` integrada en la barra superior `#bankG` para Monster, Tanque y Pickup, completando la tríada con `PAQUETE AERO` y `PAQUETE OFF-ROAD`.
  - **Especialista 2 · Diegetic HUD & Telemetry (`src/ui.ts`, `src/hud.css`):**
    - Pérdida crítica de enlace de radio `#signal.rf-loss` con parpadeo estroboscópico `@keyframes rf-loss` y degradación de contraste al superar 85 m de distancia al centro.
    - Alerta de sobrecarga térmica `#volt.thermal-stress` en el voltímetro (rojo incandescente `#ef4444` y oscilación de 0.15s) ante turbo prolongado (> 30 frames sostenidos) o temperatura crítica (`d.heat > 0.8`).
  - **Especialista 3 · Procedural 3D & Folded Modeler (`src/models.ts`):**
    - Tirantes articulados cilíndricos del servo de dirección en tren delantero de `formula` y `buggy`.
    - Micro-switch de corredera de encendido con LED emisor verde (`#22c55e`) de enlace receptor en el lateral del chasis para todos los autos convencionales.
  - **Especialista 4 · Audio & Synth Sound Designer (`src/sfx.ts`):**
    - Factor de rolloff acústico `distGain = Math.max(0.12, 1 / (1 + dist * 0.04))` en `SFX.spatialAlert` y `SFX.spatialHiss`.
    - Soporte de paneo estéreo opcional en colisiones de embestida `SFX.ram(powerOrPan, pan)` modulando tanto el tono como el ruido de impacto.
- **Evidencia de validación:** `npx tsc --noEmit -p .` (0 errores), `npm test` (75/75 pasando), `npm run build` (467 ms), `pm2 restart rc-test`, `npm run shots -- --only garaje,partida,carrera,match3` (33 capturas en PC y celular sin errores en 135.2 s / 29.5 s de render) y `graphify update .` (3313 nodos, 7942 aristas).

---

## 4. Backlog Vivo de Oportunidades — Ciclo #39 (Especialistas Matriciales)

### Ciclo #39 (2026-10-10) — Ecosistema Matricial de Especialistas: Piezas en Catálogo/Rótulo en Taller, RSSI dBm/ESC Temp en HUD, XT60-ESC y R-Pins 3D, Absorción de Agudos SFX
- **Alcance implementado por 4 especialistas en paralelo (partición disjunta estricta):**
  - **Especialista 1 · Menu, Workshop & Flow (`src/menu.ts`, `src/menu.css`):**
    - Vista previa reactiva de piezas (`peek.part`) en el catálogo del Taller (`#shop [data-buy^="part:"]`), visualizando cómo calza el accesorio en el pedestal antes de comprar.
    - Rótulo técnico diegético `<div id="swLabel" class="sw-label">CÓD. PNT #HEX · TONO TALLER</div>` al pie de la paleta sincronizado en tiempo real con perillas HSV y muestras `.sw`.
  - **Especialista 2 · Diegetic HUD & Telemetry (`src/ui.ts`, `src/hud.css`):**
    - Lectura numérica diegética RSSI en dBm (`<span id="sigDbm" class="sig-dbm">${dbm} dBm</span>`) calculada según la distancia al transmisor base (-42 dBm nominal a -94 dBm exterior).
    - Etiqueta de aviso térmico `<span id="escTemp" class="esc-temp">ESC: 85°C</span>` en rojo incandescente bajo el voltímetro durante la sobrecarga del variador.
  - **Especialista 3 · Procedural 3D & Folded Modeler (`src/models.ts`):**
    - Caja de variador electrónico de velocidad (ESC) con disipador aleteado en aluminio oscuro y cableado siliconado de alta corriente hacia la batería en chasis descubiertos.
    - 4 torretas de carrocería en nylon negro con pasadores en horquilla metálicos (R-pins) cromados en todas las carrocerías.
  - **Especialista 4 · Audio & Synth Sound Designer (`src/sfx.ts`):**
    - Amortiguación atmosférica de frecuencias agudas por distancia (*HF Damping*) en `hiss(..., dist)`.
    - Paneo estéreo direccional en el chispazo de arco voltaico `SFX.zap(pan)`.
- **Evidencia de validación:** `npx tsc --noEmit -p .` (0 errores), `npm test` (75/75 pasando), `npm run build` (410 ms), `pm2 restart rc-test`, `npm run shots -- --only garaje,partida,carrera,match3` (33 capturas en PC y celular sin errores en 30.2 s) y `graphify update .` (3332 nodos, 7965 aristas).

### Ciclo #40 (2026-10-10) — Badges de Ranura en Taller, Jitter RF en HUD, Motor 540 3D y Relé / Tesla SFX (`f303c4c`)
- **Alcance implementado (4 Especialistas Paralelos):**
  - **Menu, Workshop & Flow Specialist (`src/menu.ts`, `src/menu.css`):** Badges diegéticos de ranura (`.slot-badge`: "AERODINÁMICA", "BLINDAJE", "TRACCIÓN", "TRANSMISIÓN", "SUSPENSIÓN", "MOTORIZACIÓN") en las tarjetas de piezas del Taller, propagación de ranura en `UNLOCKS.piezas()`, y animación diegética de ensamble `.bought-pulse` (`@keyframes part-mounted` con resplandor verde de 0.6s) tras comprar piezas en el taller.
  - **Diegetic HUD & Telemetry Specialist (`src/ui.ts`, `src/hud.css`):** Jitter estocástico de radiofrecuencia (±2 dBm) en zona periférica (`isLoss` o `distCenter > 85`), y parpadeo de advertencia analógica `.sig-warn` en decibelios con color ámbar `#f59e0b` y resplandor CRT.
  - **Procedural 3D & Folded Modeler (`src/models.ts`):** Motor eléctrico brushed tamaño 540 con lata cilíndrica cromada montada transversalmente junto al diferencial trasero, anillo de ventilación en grafito oscuro y piñón dentado de transmisión en bronce de alta visibilidad en `buggy` y `monster`.
  - **Audio & Synth Sound Designer (`src/sfx.ts`):** Firma acústica de relé electromagnético de alta corriente (`turboRelay`) con contacto agudo y pulso inductivo, y descarga de arco voltaico direccional (`teslaDischarge`) con barrido sawtooth y paneo estéreo.
- **Evidencia de validación:** `npx tsc --noEmit -p .` (0 errores), `npm test` (8/8 suites, 75 tests OK), `npm run build` (407 ms), `pm2 restart rc-test`, `npm run shots` (163 capturas verificadas en PC y móvil en 96.1 s sin errores) y `graphify update .` (3344 nodos, 7985 aristas).

### Ciclo #41 (2026-10-10) — Indicador 'MONTADO' en Taller, Voltage Sag Reactivo, Cables Silicona 540 3D y Relé en Nitro SFX
- **Alcance implementado (4 Especialistas Paralelos):**
  - **Menu, Workshop & Flow Specialist (`src/menu.ts`, `src/menu.css`):** Indicador diegético `<span class="slot-badge mounted">MONTADO</span>` con borde y fondo verde esmeralda (`#22c55e`) en las tarjetas de piezas del Taller para las partes actualmente montadas en el vehículo activo (`save.kit[slotKey] === optKey`), y micro-clic acústico de selector rotativo de taller `SFX.blip()` al recorrer las muestras de la cabina de pintura.
  - **Diegetic HUD & Telemetry Specialist (`src/ui.ts`, `src/hud.css`):** Caída electroquímica reactiva (*Voltage Sag*) de `0.32V` en el voltímetro digital y atenuación de contraste/brillo `#lipo.sag` en los bloques LiPo bajo demanda extrema de aceleración (`d.boostActive`).
  - **Procedural 3D & Folded Modeler (`src/models.ts`):** Cableado flexible de silicona de alta corriente (rojo `#ef4444` y azul `#2563eb`) conectando el variador ESC con las terminales del motor 540, más dos condensadores cerámicos amarillos de supresión de RF (`#eab308`) soldados sobre la lata metálica en chasis abiertos (`buggy`, `monster`).
  - **Audio & Synth Sound Designer (`src/sfx.ts`):** Conexión física de `SFX.turboRelay()` al inicio de `boostSurge()` para conferir pegada electromecánica instantánea de relé al activar el nitro, y limitador de concurrencia `gate("tesla-arc", 16)` con atenuación espacial por distancia en `SFX.teslaDischarge(pan, dist)`.
- **Evidencia de validación:** `npx tsc --noEmit -p .` (0 errores), `npm test` (8/8 suites, 75 tests OK), `npm run build` (414 ms), `pm2 restart rc-test`, `npm run shots` (163 capturas verificadas en PC y móvil en 97.2 s sin errores) y `graphify update .` (3382 nodos, 8036 aristas).

### Ciclo #42 (2026-10-10) — Procedural 3D & Folded Modeler Multitarea: Chasis RC, Utilería de Taller y Armas Bélicas
- **Alcance implementado (Procedural 3D & Folded Modeler en 3 Pases Paralelos):**
  - **Pase 1 · Chasis & Mecánica RC (`src/models.ts`):**
    - Disipador clip-on de aluminio anodizado en azul (`#2563eb`) con 4 aletas radiales sobre la lata cilíndrica del motor 540 en `buggy` y `monster`.
    - Amortiguadores helicoidales de competición con cuerpo hidráulico rojo, vástago cromado, muelles en espiral y collarines de precarga roscados dorados en torretas de suspensión.
    - Servo de dirección sellado en nylon grafito con servo horn (brazo oscilante) en nylon blanco de competición y tensores ajustables (`turnbuckles`) cromados hacia las manguetas del tren frontal en `buggy`, `formula` y `carrera`.
    - Batería LiPo Hardcase de polímero negro con etiqueta de advertencia 50C en amarillo, conector hembra XT60 de alta corriente y cables de silicona flexible + cable balanceador blanco 3S.
  - **Pase 2 · Utilería y Taller Folded (`src/menuscene.ts`):**
    - Soporte de pits de competición (`pitStand`) rotatorio con base trapezoidal pesada, columna de aluminio, bandeja imantada con tornillos sueltos y plato superior con tiras de goma antideslizantes para apoyar el chasis en el banco.
    - Cargador inteligente LiPo digital (`lipoCharger`) con chapa anodizada, pantalla LCD con resplandor cian, 4 botones táctiles (`BATT TYPE`, `DEC`, `INC`, `START`), bornes banana y cables cocodrilo.
    - Botes dosificadores de aceite de silicona para amortiguadores y spray limpiador de chasis (`siliconeOils`) con pico fino y válvulas dosificadoras sobre el banco.
  - **Pase 3 · Armas e Ingeniería Bélica (`src/weapons.ts`):**
    - `Clips`: Geometría procedural fiel de alambre galvanizado doblado con bucles concéntricos interiores y exteriores, sustituyendo el toroide circular simple.
    - `Petardos`: Cuerpo cilíndrico de cartón kraft con faja reflectante dorada, tapón inferior de arcilla y mecha de cordel con brasa incandescente.
    - `Regla`: Bisel metálico de acero inoxidable, cursor métrico calibrador deslizante con tornillo moleteado de bloqueo en bronce y marcas graduadas.
    - `Trompo`: Punta inferior cónica de carburo de tungsteno y corona superior estriada de enganche para lanzador.
- **Evidencia de validación:** `npx tsc --noEmit -p .` (0 errores), `npm test` (8/8 suites, 75 tests OK), `npm run build` (393 ms), `npm run test:restart`, `npm run shots -- --only garaje,taller,partida` (35 capturas en PC y móvil en 25.2 s sin errores) y `graphify update .` (3396 nodos, 8067 aristas).

### Ciclo #43 (2026-10-10) — Palieres CVD & Barras Estabilizadoras 3D y Montaje Directo en Taller
- **Alcance implementado (2 Especialistas Paralelos):**
  - **Procedural 3D & Folded Modeler (`src/models.ts`):**
    - Palieres de transmisión telescópicos articulados (CVDs) desde el diferencial central a los bujes de las ruedas traseras, con vaso de salida en acero templado (`#27272a`), eje articulado cromado y fuelle de goma (`M.rubber()`) en `buggy`, `monster` y `formula`.
    - Barra estabilizadora trasera (sway bar) de alambre de torsión de acero (`#94a3b8`) con bieletas verticales cromadas y rótulas esféricas de aluminio anodizado en azul (`#0284c7`) ancladas a los trapecios de suspensión.
  - **Menu, Workshop & Flow Specialist (`src/menu.ts`, `src/menu.css`):**
    - Montaje/equipamiento directo de piezas ya compradas desde la pestaña de Piezas del Taller sin obligar a ir a Garaje: si el jugador toca una pieza adquirida no montada, se equipa de inmediato en el auto activo (`save.kit[slot] = opt; persist(); renderShop();`), con animación `.bought-pulse` y feedback sonoro `SFX.blip()`.
    - Indicador contextual en la tarjeta de pieza: `.mount-hint` ("MONTADO EN AUTO" en verde vs "EN GARAJE · TOCAR PARA MONTAR") y borde de chapa destacada `.active-part` cuando está en uso.
- **Evidencia de validación:** `npx tsc --noEmit -p .` (0 errores), `npm test` (8/8 suites, 75 tests OK), `npm run build` (495 ms), `npm run test:restart`, `npm run shots -- --only garaje,taller` (26 capturas en PC y móvil en 15.8 s sin errores) y `graphify update .` (3397 nodos, 8078 aristas).

### Ciclo #44 (2026-10-10) — Manguetas CNC y Tuercas 3D, BodyThud Dinámico y LipoWarn SFX, Vaho Térmico VFX y Deriva ADC HUD
- **Alcance implementado (4 Especialistas Paralelos):**
  - **Procedural 3D & Folded Modeler (`src/models.ts`):** Manguetas de dirección delanteras en aluminio mecanizado CNC (`M.metal("#0284c7")`) con perno vertical cromado (kingpin) en vehículos con tren delantero visible (`formula`, `buggy`, `deportivo`), más tuercas métricas hexagonales de bloqueo (Nyloc) con anillo de nylon azul (`#2563eb`) en el centro exterior de cada rueda (0 draw calls adicionales).
  - **Audio & Synth Sound Designer (`src/sfx.ts`):** Modulación de fuerza dinámica en `SFX.bodyThud(impulse, pan)` proporcional al impulso de impacto (`vol = Math.min(0.35, 0.08 + imp * 0.02)`), y control de cadencia rítmica de 2.4s mediante `gate("lipo-warn", 2.4)` en `SFX.lipoLowWarn()` para prevenir saturación de audio.
  - **Combat Feel & VFX Specialist (`src/fx.ts`):** Desacoplamiento y exportación de `sparks()` del pool de partículas existente; implementación de `FX.transmissionSpark(pos)` para micro-chispas de alta velocidad en acoples mecánicos/diferencial, y `FX.heatHaze(pos, intens)` para distorsión y vaho térmico dosificado sobre el disipador o motor 540 bajo sobrecarga.
  - **Diegetic HUD & Telemetry Specialist (`src/ui.ts`, `src/hud.css`):** Deriva térmica analógica sinusoidal de ADC (`Math.sin(now * 0.01) * 0.04`) en la lectura del voltímetro digital `#volt` cuando el ESC entra en sobrecarga térmica (`isThermal`), y scanline jamming estroboscópico `#radar.rf-jammed` en el panel de radar al caer en pérdida crítica periférica.
- **Evidencia de validación:** `npx tsc --noEmit -p .` (0 errores), `npm test` (8/8 suites, 75 tests OK), `npm run build` (6.9s), `npm run test:restart`, `npm run shots -- --only garaje,partida,lab` (32 capturas en PC y móvil en 61.5 s sin errores) y `graphify update .` (3505 nodos, 8270 aristas).

### Ciclo #45 (2026-10-10) — Discos de Freno Ranurados 3D, BodyThud/Ram SFX Espacial, Chispas Transmisión y Packet Loss HUD
- **Alcance implementado en paralelo por 4 Especialistas:**
  - **Procedural 3D & Folded Modeler (`src/models.ts`):** Discos de freno cilíndricos en acero templado (`cyl`, 12 facetas, `#52525b`) y pinzas compactas de 2 pistones en rojo competición (`box`, `#ef4444`) en el interior de cada rueda, fusionadas en el array `parts` con **0 draw calls adicionales**.
  - **Audio & Synth Sound Designer (`src/sfx.ts`):** `SFX.bodyThud(impulse, pan, dist, mat)` con atenuación espacial por distancia `1 / (1 + dist * 0.04)` y resonancia espectral paso bajo diferenciada por material (`"metal"` 1400Hz, `"wood"` 450Hz, `"soft"` 280Hz, default 600Hz); y roll-off por distancia incorporado en `SFX.ram(pwr, pan, dist)`.
  - **Combat Feel & VFX Specialist (`src/car.ts`):** Detección de aceleración a fondo desde parado (`cmd.fwd > 0.8 && speed < 1.5`) con emisión de micro-chispas en eje motriz trasero (`FX.transmissionSpark`), vector estático reusable `sparkPos` (0 GC) y desacoplamiento limpio.
  - **Diegetic HUD & Telemetry Specialist (`src/ui.ts`, `src/hud.css`):** Micro-indicador de pérdida de paquetes `PL:X%` en `#sigPkt` y animación estroboscópica en antena `#signal.pkt-loss` en zona periférica (>75m).
  - **Integración de Bucle Central (`src/main.ts`):** Conexión de `SFX.bodyThud` con Havok collision callback en embestidas contra jefes/élites, rotura de macetas e impactos de chasis a velocidad (`impactSpeed > 4.0`), vaho térmico `FX.motorThermalFriction` tras boost prolongado (>1.5s), y paso de `distCenter` y `heat` a `hudUpdate()`.
- **Evidencia de validación:** `npx tsc --noEmit -p .` (0 errores), `npm test` (8/8 suites, 75 tests OK), `npm run build` (462 ms), `npm run test:restart`, `npm run shots -- --only garaje,partida,carrera` (17 capturas en PC y móvil en 20.9 s sin errores) y `graphify update .` (3539 nodos, 8347 aristas).

### Ciclo #46 (2026-10-10) — Latiguillos 3D, SFX Drift por Superficie y Doppler, Torque Twist en car.ts y Alerta CRC en HUD
- **Alcance implementado en paralelo por 4 Especialistas:**
  - **Procedural 3D & Folded Modeler (`src/models.ts`):** Latiguillos flexibles de freno mallados en acero inox (`cyl`, `M.metal("#94a3b8")`) conectando pinzas al chasis interior, y micro-válvulas Schrader de inflado de neumáticos (`cyl`, `M.metal("#18181b")`) en el reborde exterior de las 4 llantas, fusionadas en el array `parts` con **0 draw calls adicionales**.
  - **Audio & Synth Sound Designer (`src/sfx.ts`):** Modulación espectral dinámica en `SFX.drift(pwr, pan, floor)` según superficie (`"asfalto"` chirriante con pasabanda a 1200Hz, `"tierra"` granular pasabajos a 450Hz, `"hierba"` siseo acolchado a 320Hz); y nueva primitiva `SFX.dopplerBy(relSpeed, pan, dist)` sintetizando pitch-shift Doppler en pasadas a alta velocidad con doble oscilador y ráfaga aerodinámica.
  - **Combat Feel & VFX Specialist (`src/car.ts`):** Torsión reactiva del chasis (*torque twist* / torsión longitudinal por par motor en arrancada) en `Car.torqueRoll` con diferenciación según tipo de tracción (`drive: "rwd" | "awd" | "fwd"`), amortiguación elástica suave hacia 0 (`0.2`), y optimización radical de memoria (0 GC allocations con `tmpV = new B.Vector3()` y `getLinearVelocityToRef`).
  - **Diegetic HUD & Telemetry Specialist (`src/ui.ts`, `src/hud.css`):** Tinte dinámico diegético en antena `#signal` (`.sig-fringing` en ámbar `#f59e0b` entre 60-75m, `.sig-critical` en rojo `#ef4444` >75m) y alerta estroboscópica de trama corrupta `CRC ERR ${pktLoss}%` con `.sig-pkt.crc-err` cuando la pérdida supera el 40%.
- **Evidencia de validación:** `npx tsc --noEmit -p .` (0 errores), `npm test` (8/8 suites, 75 tests OK), `npm run build` (509 ms), `npm run test:restart`, `npm run shots -- --only garaje,partida,carrera` (17 capturas en PC y móvil en 22.3 s sin errores) y `graphify update .` (3546 nodos, 8358 aristas).

### Ciclo #47 (2026-10-10) — Cincha/Antena 3D, SFX WheelSpin, Rear Squat en car.ts y Retorno Radar HUD
- **Alcance implementado por los 4 Especialistas:**
  - **Procedural 3D & Folded Modeler (`src/models.ts`):** Cincha transversal en cinta de nylon negro (`M.plastic("#18181b")`) con micro-hebilla rápida en cian técnico (`#38bdf8`) abrazando el pack LiPo Hardcase contra la bandeja del chasis; más funda semirrígida cilíndrica de antena y capuchón protector de goma en rojo competición (`M.plastic("#ef4444")`) en el mástil superior, con **0 draw calls adicionales**.
  - **Audio & Synth Sound Designer (`src/sfx.ts`):** Micro-chasquidos de arenilla y patinamiento `SFX.wheelSpin(slip, pan)` con limitador `gate("wheelspin", 12)` combinando onda triangular en graves y ruido pasabanda a 2800 Hz; más utilidad de oclusión espacial `occludeLowpass(cutoff, q)` para simular amortiguación acústica tras obstáculos.
  - **Combat Feel & VFX Specialist (`src/car.ts`):** Cabeceo reactivo por transferencia dinámica de masas en arrancada dura (*Rear Squat*) en `Car.squatPitch`, modulado por tipo de tracción (`driveMult` RWD 1.3 vs FWD 0.7) y compuesto con `basePitch` para una respuesta visual visceral con 0 allocations.
  - **Diegetic HUD & Telemetry Specialist (`src/ui.ts`, `src/hud.css`):** Vector diegético de retorno a base en radar `#radar.rf-return` con distintivo `▲ BASE` pulsante en rojo alarma cuando la distancia supera los 75m; y micro-glitch analógico `.telemetry-glitch` en el voltímetro ante interferencias severas de radiofrecuencia.
- **Evidencia de validación:** `npx tsc --noEmit -p .` (0 errores), `npm test` (8/8 suites, 75 tests OK), `npm run build` (564 ms), `npm run test:restart`, `npm run shots -- --only garaje,partida,carrera` (17 capturas en PC y móvil en 22.1 s sin errores) y `graphify update .` (3633 nodos, 8713 aristas).

### Ciclo #48 (2026-10-10) — Tirantes Carbono 3D, SFX Grava y Regen, Brake Dive en car.ts y Brújula/Failsafe en Radar HUD
- **Alcance implementado por los 4 Especialistas:**
  - **Procedural 3D & Folded Modeler (`src/models.ts`):** Torres de amortiguación delantera CNC en aluminio anodizado azul (`M.metal("#0284c7")`) con taladros de regulación oscuros y tirantes superiores diagonales de refuerzo de chasis en fibra de carbono mate (`M.matte("#1e293b")`), fusionados en el array `parts` del coche con **0 draw calls adicionales**.
  - **Audio & Synth Sound Designer (`src/sfx.ts`):** `SFX.gravelThud(impulse, pan, dist)` simulando el impacto hueco combinado con dispersión de gravilla en aterrizajes fuertes; y `SFX.regenWhine(spd, pan)` con barrido descendente en onda triangular de freno regenerativo/motor brushless al soltar acelerador.
  - **Combat Feel & VFX Specialist (`src/car.ts`):** Inclinación reactiva en frenadas violentas (*Brake Dive*) en `Car.divePitch` (+0.045 rad) modulada exponencialmente y compuesta con `vis.rotation.x`; rebote asimétrico aleatorio en alabeo lateral en aterrizajes duros (`steerRoll ±0.04`); y disparo de `SFX.gravelThud` al tocar suelo con 0 GC allocations.
  - **Diegetic HUD & Telemetry Specialist (`src/ui.ts`, `src/hud.css`):** Micro-brújula de rumbo cardinal fija (`N`) grabada en el reborde superior del radar `#radar::before`; y cartel diegético de emergencia `.rf-failsafe` (`FAILSAFE RX: SEÑAL LÍMITE`) parpadeando en la base del HUD cuando el vínculo de radiofrecuencia entra en pérdida crítica (>85m).
- **Evidencia de validación:** `npx tsc --noEmit -p .` (0 errores), `npm test` (9/9 suites, 77 tests OK), `npm run build` (504 ms), `npm run test:restart`, `npm run shots -- --only garaje,partida,carrera` (17 capturas en PC y móvil en 21.7 s sin errores) y `graphify update .` (3665 nodos, 8806 aristas).

---

## 4. Backlog Vivo de Oportunidades — Ciclo #49 (Evolución Multidisciplinaria)

### A. Especialista 1 · Procedural 3D & Folded Modeler (`src/models.ts`)
1. **(Recomendada) Tuercas Ciegas de Trapecios y Tensores Roscados de Dirección en Acero Inoxidable:**
   - **Qué es:** Añadir tirantes de dirección ajustables con tensores roscados hexagonales paso inverso en acero inoxidable (`M.metal("#94a3b8")`) conectando el servo horn con las manguetas delanteras, más tuercas ciegas de anclaje de trapecios.
   - **Valor:** Extraordinario detalle mecánico de automodelismo RC en primeros planos de Garaje y Taller con 0 draw calls al fusionar en `parts`. Complejidad: Baja.

### B. Especialista 2 · Audio & Synth Sound Designer (`src/sfx.ts`)
2. **Resonancia de Carrocería Lexan en Derrapes Fuertes y Alerta Sonora Failsafe:**
   - **Qué es:** Micro-vibración y crujido de policarbonato al rozar bordillos (`SFX.curbRattle`), y alarma pulsante bitonal intermitente de telemetría de failsafe al activarse la alerta crítica de enlace de radio.
   - **Valor:** Coherencia acústica total entre la UI de telemetría analógica y la respuesta auditiva del transmisor RC. Complejidad: Baja-Media.

### C. Especialista 3 · Combat Feel & VFX Specialist (`src/car.ts`, `src/fx.ts`)
3. **Micro-Chispas de Fricción en Suelo por Panza Baja y Roce de Paragolpes:**
   - **Qué es:** Emisión dosificada de chispas en el fondo plano del vehículo (`FX.transmissionSpark`) cuando la suspensión sufre compresión máxima tras un salto con compresión violenta de chasis contra el suelo.
   - **Valor:** Feedback visual espectacular y tangible de la violencia de los saltos y baches del patio. Complejidad: Media.

### D. Especialista 4 · Diegetic HUD & Telemetry Specialist (`src/ui.ts`, `src/hud.css`)
4. **Vúmetro Analógico de Intensidad de Señal RF con Indicador de Ruido de Piso:**
   - **Qué es:** Franja segmentada analógica debajo del icono de antena que muestre tanto la potencia de la señal recibida (RSSI) como una pequeña barra roja de ruido de fondo (SNR / Noise Floor) en zonas de interferencia.
   - **Valor:** Información diegética de radiocontrol de alta fidelidad para pilotos técnicos. Complejidad: Baja-Media.

---

## 5. Checkpoint de Sesión Actual

- **Último trabajo completado:** Ciclo #59 ("Generación Auxiliar & Neumática de Pista") completado y validado con 4 Especialistas (`tsc` 0 errores, vitest 43/43 tests en verde, `build` limpio en 13.08 s, 17 capturas en `.shots/actual/` en 56.3 s, grafo en 4006 nodos).
- **Próxima decisión pendiente:** Selección de alcance y tareas para el **Ciclo #60**.

### 🔓 LISTO PARA EL CICLO #60 (Ecosistema de Especialistas Matriciales, 2026-10-10)

| Especialista | Propuesta destacada | Archivos asignados (`🔓`) |
|---|---|---|
| **Workshop Tools & Props 3D Modeler** | Enrollador de cable Schuko (`cableDrumFold`) o torre halógena de iluminación | `src/folded_slice.ts` |
| **Workshop Diorama 3D Modeler** | Calibre digital 150mm (`digitalCaliper`) o estación de soldadura de banco | `src/menuscene.ts` |
| **Procedural Vehicle 3D Modeler** | Fuelles guardapolvos de goma en palieres CV o electroventilador forzado 30mm | `src/models.ts` |
| **Audio Synth Sound Designer** | Delay en primitiva `hiss` y resonador de calderín metálico (`tankResonance`) | `src/sfx.ts` |

### Ciclo #59 (2026-10-10) — Generación Auxiliar & Neumática de Pista: Generador con Jaula, Manómetro Digital de Neumáticos, Protector Lexan de Engranajes y Pistonada en SFX
- **Alcance implementado en producción (`src/`):**
  - **Workshop Tools & Props 3D Modeler (`src/folded_slice.ts`):** Generador eléctrico portátil `gasGeneratorFold()`: jaula envolvente en tubos continuos de acero (`FOLD.bare()`) con 4 silentblocks de goma negra (`FOLD.rubber()`) en la base inferior y manguitos de agarre superiores; depósito superior de combustible en chapa roja de competición (`FOLD.painted("#dc2626")`) con tapón roscado central cromado, mirilla transparente con indicador analógico de nivel de combustible, calcos de advertencia y llave de paso de latón con vaso decantador; motor térmico monocilíndrico OHV de 4 tiempos con cilindro aleteado inclinado a 26° en fundición oscura (`FOLD.dark()`), carburador con filtro de aire cilíndrico en baño de aceite, silenciador de escape con protector anticalórico perforado, y tirador de arranque por cuerda (recoil starter) con empuñadura en T; alternador coaxial aleteado con tapa trasera ranurada; panel frontal técnico estanco bajo voladizo con interruptor basculante rojo ON/OFF (`FOLD.emissive("#ef4444")`), voltímetro analógico con aguja indicadora en 230V, disyuntor térmico de rearme, 2 tomas de corriente Schuko con tapas basculantes en azul industrial (`FOLD.painted("#1e40af")`), borne de tierra en latón y franja de seguridad `hazard`; 0 draw calls adicionales al mapearse al atlas Folded con `done(18)`.
  - **Workshop Diorama 3D Modeler (`src/menuscene.ts`):** Manómetro digital de mano `digitalTireGauge(metal, fDark)` en la mesa de boxes (`[4.2, 0, 8.8]`): carcasa ergonómica bimateria en aluminio azul anodizado (`M.metal("#0284c7")`) con empuñadura antideslizante estriada en composite negro (`fDark`) y ojal para lanyard; boquilla angular a 45° en latón pulido (`M.metal("#d97706")`) con collarín moleteado para válvulas de modelismo; micro-display LCD activo en `M.glow("#38bdf8")` con lectura calibrada diegética en PSI ("18.5 PSI"); pulsador lateral de purga micrométrica y botón frontal Zero/Tare; emplazamiento del grupo electrógeno `gasGeneratorFold()` en el suelo del taller en la zona técnica de boxes (`place(gasGeneratorFold(), [-28, 0, 20], [0, 0.2, 0])`); integrado en `menu_bench_props` con sombras dinámicas completas y 0 draw calls adicionales.
  - **Procedural Vehicle 3D Modeler (`src/models.ts`):** Carcasa protectora Clear Gear Cover contorneada en forma de 8 adaptada a la silueta del piñón de ataque y la corona Spur Gear del Slipper Clutch para chasis expuestos (`buggy`, `monster` y `carrera`): fabricada en policarbonato traslúcido técnico `M.plastic("#94a3b8")` con brillo superficial; 3 nervaduras estructurales longitudinales de refuerzo moldeadas para evitar deformación térmica e impactos de gravilla; tapón circular estanco de goma negra (`M.rubber()`) centrado concéntricamente frente a la tuerca M4 del Slipper Clutch para permitir regular la precarga con llave tubular sin desmontar la tapa; y 2 tornillos Allen M3 cromados anclando la cubierta a la bancada; 0 draw calls adicionales integrados con color de vértice.
  - **Audio Synth Sound Designer (`src/sfx.ts`):** `SFX.compressorChug(pan)` con pistonada rítmica del compresor cargando calderín mediante tren de 4 pulsos graves desfasados a 28–58 Hz con ondas sawtooth y triangle combinadas con ráfagas filtradas de admisión a 800–400 Hz y `gate("comp-chug", 4)`; `SFX.tireBleed(pan)` con micro-soplido seco de purga de neumático al regular presión en el manómetro digital, combinando tono de escape senoidal (1400 -> 400 Hz) con doble siseo de alta presión bandpass y highpass (5200–6800 Hz) y `gate("tire-bleed", 4)`.
- **Evidencia de validación:** `tsc --noEmit` 0 errores, vitest --changed 43 tests en verde, build Vite en 13.08 s, 17 capturas en `.shots/actual/` aprobadas en 56.3 s, grafo de conocimiento sincronizado en 4006 nodos y 9704 aristas.

### Ciclo #58 (2026-10-10) — Transmisión & Neumática Mural: Slipper Clutch con Corona Expuesta, Carrete de Manguera, Unidad FRL Mural y Carraca en SFX
- **Alcance implementado en producción (`src/`):**
  - **Workshop Tools & Props 3D Modeler (`src/folded_slice.ts`):** Carrete orientable de manguera neumática `hoseReelFold()` en chapa gruesa en C (`FOLD.dark()`) con 4 bulones de anclaje mural, racor giratorio de latón para red fija, horquilla de giro a 180° en chapa azul industrial (`FOLD.painted("#1e3a5f")`), tambor rotativo con discos laterales nervados, trinquete ratchet lateral con uña de bloqueo automático, cárter sellado con resorte espiral de rebobinado, 3 capas de manguera de poliuretano amarillo/naranja (`FOLD.painted("#f59e0b")`), boquilla frontal con 4 rodillos de teflón virgen de baja fricción (`FOLD.painted("#f8fafc")`), tramo exterior con tope esférico de goma negra (`FOLD.rubber()`) y conector rápido hembra en latón (`FOLD.painted("#d97706")`); 0 draw calls adicionales al mapearse al atlas Folded con `done(18)`.
  - **Workshop Diorama 3D Modeler (`src/menuscene.ts`):** Unidad FRL mural `frlAirUnit(metal, fDark)` en pared izquierda del box (`[-33, 9, 8]`): bloque colector superior en aluminio mecanizado con pletina mural; vaso decantador de partículas y condensados en policarbonato transparente (`M.glass()`) con jaula ranurada protectora y válvula de purga automática inferior; regulador de presión central con pomo estriado y micro-manómetro analógico frontal con esfera blanca y aguja roja; vaso lubricador de aceite neumático en policarbonato con visor de gotas/caudal en latón (`M.metal("#d97706")`); y bajante vertical rígida de cobre acodada con válvula de corte con palanca roja, enchufe rápido y 2 abrazaderas omega completas con junta aislante y tornillería; montaje del carrete mural `hoseReelFold()` anclado al lateral izquierdo (`place(hoseReelFold(), [-33, 11, 14], [0, 0.4, 0])`); integradas en `menu_bench_props` con sombras dinámicas completas y 0 draw calls adicionales.
  - **Procedural Vehicle 3D Modeler (`src/models.ts`):** Conjunto de embrague antirrebote Slipper Clutch contiguo al motor Tipo 540 y a su piñón de ataque de bronce para chasis expuestos (`buggy`, `monster` y `carrera`): corona dentada principal Spur Gear en composite blanco Delrin de competición (`cyl(0.068, 0.068, 0.007, M.plastic("#f8fafc"))`) con rebaje interior, zapatas anulares de ferodo de fricción (`M.matte("#78350f")`) y 6 orificios perimetrales circulares de aligeramiento a 60°; 2 platos de presión Slipper Plates de aluminio mecanizado CNC anodizado azul (`M.metal("#0284c7")`), muelle helicoidal de compresión con 4 espiras toroidales de precarga guiadas sobre el eje de acero cromado, arandelas de asiento, y tuerca hexagonal autoblocante M4 con casquillo de freno Nyloc en nylon azul en el extremo; 0 draw calls adicionales integrados con color de vértice.
  - **Audio Synth Sound Designer (`src/sfx.ts`):** `SFX.ratchetSocketWrench(pan)` emulando carraca mecánica de llave de vaso de cromo-vanadio mediante tren progresivo de 6 pulsos mecánicos con ondas triangulares (4200–5600 Hz), siseo filtrado highpass (6200–1800 Hz) y click percusivo cuadrado (1200–800 Hz) con `gate("ratchet-wrench", 4)`; `SFX.airPurge(pan)` con purga de condensados de filtro FRL o disparo de sobrepresión combinando golpe sordo subsónico en onda triangular (480–160 Hz), siseo turbulento bandpass (4400–2400 Hz) y silbido agudo residual highpass (7200–3000 Hz) con `gate("air-purge", 4)`.
- **Evidencia de validación:** `tsc --noEmit` 0 errores, vitest --changed 43 tests en verde, build Vite en 624 ms, 17 capturas en `.shots/actual/` aprobadas en 24.6 s, grafo de conocimiento sincronizado en 3995 nodos y 9678 aristas.

### Ciclo #57 (2026-10-10) — Neumática de Taller & Detalle Eléctrico: Compresor con Calderín, Manguera Helicoidal con Pistola de Soplado, Manguitos Termorretráctiles y SFX
- **Alcance implementado en producción (`src/`):**
  - **Workshop Tools & Props 3D Modeler (`src/folded_slice.ts`):** Compresor de aire industrial `airCompressorFold()` en chapa de presión roja (`FOLD.painted("#b91c1c")`): calderín cilíndrico horizontal con fondos convexos, patas en V con silentblocks de goma, eje trasero con ruedas macizas y llantas estampadas rojas, asa frontal de transporte y grifo de purga de condensados; bancada superior soldada con motor eléctrico monofásico aleteado gris oscuro (`FOLD.painted("#1e293b")`), cabezal de 2 cilindros en V con aletas radiales, mirilla de nivel de aceite, filtros cilíndricos, volante con aspas, poleas y cubrepoleas de rejilla de alambre (`G.grate`), colector de descarga de cobre con 8 aletas disipadoras y válvula de retención; bloque distribuidor con presostato electromecánico ON/OFF rojo, 2 manómetros analógicos con esfera blanca, manorreductor moleteado, enchufe rápido hembra en latón y válvula de seguridad; 0 draw calls adicionales.
  - **Workshop Diorama 3D Modeler (`src/menuscene.ts`):** Estación de soplado `airHoseAndBlowGun`: pistola ergonómica en aluminio pulido con empuñadura angulada antideslizante, gatillo negro basculante, tornillo de caudal en latón, boquilla tubular curvada con punta cónica de alta presión (norma OSHA) y racor rápido macho de latón; manguera helicoidal espiralada de poliuretano amarillo (`M.plastic("#eab308")`) con 9 espiras reposando sobre la mesa junto al área de mantenimiento (`[12, 0, 7.5]`) y cayendo con curvatura continua hacia el compresor ubicado en el suelo del taller (`place(airCompressorFold(), [-30, 0, 16], [0, -0.3, 0])`); integrado en `menu_bench_props` con sombras dinámicas y 0 draw calls adicionales.
  - **Procedural Vehicle 3D Modeler (`src/models.ts`):** Manguitos termorretráctiles bicolor en rojo vivo mate (`M.matte("#dc2626")`) y negro carbón mate (`M.matte("#18181b")`) enfundando los bornes de soldadura del motor Tipo 540 y las salidas de potencia del variador ESC en `buggy`, `monster`, `formula` y `carrera`; virolas de marcado polarizado amarillo pálido indicando "+" y "-"; banco de 2 condensadores electrolíticos en azul traslúcido (`M.plastic("#0284c7")`) con sellos superiores cromados en el variador ESC y 2 condensadores cerámicos de desacoplo de radiofrecuencia soldados a la carcasa de la lata del motor 540; manguitos en los empalmes del conector XT60; 0 draw calls adicionales integrados con color de vértice.
  - **Audio Synth Sound Designer (`src/sfx.ts`):** `SFX.airBlow(duration, pan)` con síntesis diegética de chorro de aire a alta presión combinando ruido pasabanda (3200 -> 1600 Hz) con pasaltos (4800 -> 2200 Hz) y golpe sordo de onda triangular; `SFX.zipTieZip(pan)` con tren de 5 micro-ticks rápidos de trinquete plástico de brida Zip-Tie al tensarse contra el chasis.
- **Evidencia de validación:** `tsc --noEmit` 0 errores, vitest --changed 43 tests en verde, build Vite en 680 ms, 17 capturas en `.shots/actual/` aprobadas en 21.1 s, grafo de conocimiento sincronizado en 3990 nodos y 9659 aristas.

### Ciclo #56 (2026-10-10) — Fresadora Bridgeport, Lámpara de Máquina con Virutas, Micro-Bridas Zip-Ties y Zumbido Fluorescente
- **Alcance implementado en producción (`src/`):**
  - **Workshop Tools & Props 3D Modeler (`src/folded_slice.ts`):** Fresadora vertical de torreta `millingMachineFold()` en fundición gris oscuro industrial (`FOLD.painted("#1e293b")`): base ranurada en T, columna prismática con guías en cola de milano rectificadas en acero desnudo, ménsula de elevación vertical con fuelle de goma y carro transversal, mesa de coordenadas longitudinal alargada con ranuras en T, nonios circulares y manivelas cromadas oscilantes en ambos extremos; torreta horizontal superior orientable con cremallera, cabezal de fresado con carcasa de poleas, motor trasero aleteado y husillo vertical con fresa cilíndrica de planear de insertos de carburo (`carbide`); 0 draw calls adicionales.
  - **Workshop Diorama 3D Modeler (`src/menuscene.ts`):** Lámpara articulada `machineLamp` montada sobre la columna de máquina con brazo tubular doble metálico, codos con palomilla de apriete, campana reflectora cónica en verde forja (`M.matte("#164e63")`) y difusor puntual emisor cálido (`M.glow("#fff0c8")`); mini-morsa de máquina amarrada a las ranuras del taladro `drillViseAndChips` con cúmulo de virutas torneadas espiraladas en acero brillante esparcidas sobre el plato de fundición; montaje de la fresadora de torreta `millingMachineFold()` en el lateral izquierdo del garaje junto a la pared (`[-33, 0, 5]`) con sombras dinámicas completas.
  - **Procedural Vehicle 3D Modeler (`src/models.ts`):** 4 micro-bridas de sujeción (Zip-Ties) en nylon negro con cabezas de trinquete y colas recortadas amarrando mazos de cables de potencia 12AWG y cables de balanceo LiPo a los largueros del chasis para `buggy`, `monster` y `carrera`; tobera NACA de refrigeración de electrónica embutida en bajorrelieve en la carrocería con marco afilado de aspiración dirigida hacia la bancada del motor para `carrera`, `buggy` y `deportivo`.
  - **Audio Synth Sound Designer (`src/sfx.ts`):** `SFX.coolDownTicks(pan)` emulando micro-chasquidos aperiódicos de contracción térmica en aluminio y disipadores tras exigir el motor o al detenerse en boxes; `SFX.fluorescentBuzz(vol, pan)` con zumbido analógico de tubo fluorescente de taller a 50/60 Hz con micro-estática diegética de fondo.
- **Evidencia de validación:** `tsc --noEmit` 0 errores, vitest --changed 43 tests en verde, build Vite en 582 ms, 17 capturas en `.shots/actual/` aprobadas en 22.7 s, grafo de conocimiento sincronizado en 3987 nodos y 9651 aristas.

### Ciclo #55 (2026-10-10) — Maquinaria Pesada e Iluminación: Taladro de Columna Folded, Lámpara Lupa Pantógrafo, Transponder con LED y Siseo Térmico
- **Alcance implementado en producción (`src/`):**
  - **Workshop Tools & Props 3D Modeler (`src/folded_slice.ts`):** Taladro de columna vertical de fundición pesada `drillPressFold()` en verde petróleo industrial (`FOLD.painted("#0e7490")`): base ranurada con amarres en T, columna cilíndrica rectificada con cremallera, mesa intermedia octogonal regulable con ranuras radiales, cabezal motorizado con carcasa de poleas trapezoidales, mandril Jacobs estriado con broca espiralada, y volante de bajada sensible de 3 brazos con pomos esféricos; 0 draw calls adicionales al mapearse al atlas Folded.
  - **Workshop Diorama 3D Modeler (`src/menuscene.ts`):** Lámpara lupa técnica de inspección `magnifierLamp` con mordaza C de anclaje al borde de la mesa (`[-32, 0, 0]`), brazos paralelos pantográficos de varilla de acero con resortes helicoidales dobles, cabezal anular circular con lente convexa transparente (`M.glass()`), anillo perimetral LED emisivo blanco brillante de 360° (`M.glow("#f8fafc")`) e interruptor basculante; mazo de cables finos de balanceo tricolor `balanceLead` conectando el `cellMeter` con la batería LiPo; montaje del taladro `drillPressFold()` en el fondo del taller (`[-30, 0, -8]`) con sombras dinámicas completas.
  - **Procedural Vehicle 3D Modeler (`src/models.ts`):** Micro-transponder personal de cronometraje en naranja de competición (`M.plastic("#f97316")`) con cúpula emisora infrarroja roja (`M.glow("#ef4444")`), micro-LED testigo verde (`M.glow("#22c55e")`) de sincronización con lazo de cronometraje y pestaña M2 en la bandeja lateral del chasis para `buggy`, `formula` y `carrera`; interruptor estanco de alimentación general con capuchón protector de silicona bicapa y palanca roja basculante de encendido en el lateral del chasis.
  - **Audio Synth Sound Designer (`src/sfx.ts`):** `SFX.solderingSizzle(pan)` con siseo térmico y chisporroteo de resina/flux de estaño al soldar conectores; `SFX.chargerHum(pan)` con zumbido analógico electromagnético de transformador PWM a 120/240 Hz y pitido agudo de confirmación de celda LiPo balanceada.
- **Evidencia de validación:** `tsc --noEmit` 0 errores, vitest --changed 43 tests en verde, build Vite en 593 ms, 17 capturas en `.shots/actual/` aprobadas en 22.5 s, grafo de conocimiento sincronizado en 3954 nodos y 9588 aristas.

### Ciclo #54 (2026-10-10) — Diorama y Puesto de Boxes: Morsa de Fundición, Carro de Herramientas, Organizador Allen, CellMeter y Disipador 540
- **Alcance implementado en producción (`src/`):**
  - **Workshop Tools & Props 3D Modeler (`src/folded_slice.ts`):** Morsa pesada de banco `benchViseFold()` en fundición azul martillada con brida de montaje, yunque posterior plano con cuerno cónico en acero desnudo, mordazas prismáticas diamantadas, husillo roscado y manivela oscilante a 31° con bolas esféricas de retención; carro porta-herramientas rodante `toolTrolleyFold()` en chapa roja con tapa antideslizante, 4 cajones estriados con tiradores continuos de aluminio, cerradura y 4 ruedas pivotantes con frenos. 0 draw calls adicionales.
  - **Workshop Diorama 3D Modeler (`src/menuscene.ts`):** Organizador escalonado `allenRack` en aluminio mecanizado con 4 destornilladores Allen de precisión métricos (1.5mm a 3.0mm) con mangos moleteados tricolor y vástagos pulidos; comprobador digital `cellMeter` de celdas LiPo en policarbonato mate con LCD reflectivo cian y conector JST-XH lateral; peana `pitStand` enriquecida con buje giratorio 360°, arandela de teflón autolubricada y dial circular graduado cardinal; montaje de la morsa `benchViseFold()` en la esquina frontal izquierda del banco con sombras dinámicas completas.
  - **Procedural Vehicle 3D Modeler (`src/models.ts`):** Disipador térmico cilíndrico de aluminio anodizado azul (`M.metal("#0284c7")`) con 3 aletas anulares radiales mecanizadas y placa soporte CNC con colisas de reglaje de piñón en motor 540 para `buggy`, `monster` y `carrera`; almohadillas magnéticas de apoyo y orificios cónicos de centrado en la panza plana del chasis que encajan en el Pit Stand para `formula` y `buggy`.
  - **Audio Synth Sound Designer (`src/sfx.ts`):** `SFX.toolClink(pitch, pan)` con tintineo metálico de herramientas de mano; `SFX.xt60Snap(pan)` con chasquido plástico y contacto de fricción dorada de conector LiPo; `SFX.viseCreak(pan)` con crujido de husillo roscado y apriete de mordazas de hierro.
- **Evidencia de validación:** `tsc --noEmit` 0 errores, vitest --changed 43 tests en verde, build Vite en 15.18 s, 17 capturas en `.shots/actual/` aprobadas en 58.5 s, grafo de conocimiento sincronizado en 3948 nodos y 9554 aristas.

### Ciclo #53 (2026-10-10) — Detalle Mecánico: Toe-Links Uniball, Cables LiPo XT60, Herramientas Folded, Bandeja de Tornillos y Látigo de Antena
- **Alcance implementado en producción (`src/`):**
  - **Procedural Vehicle 3D Modeler (`src/models.ts`):** Bieletas de convergencia (Toe-Links) con tensores uniball regulables y rótulas de acero en ambos trenes; pack Hardcase LiPo con conector XT60 con chaflán antirreverso y terminales dorados, cableado 12AWG y conector balanceador JST-XH; varilla de antena desacoplada como malla flexible independiente con capuchón rojo. 0 draw calls adicionales.
  - **Workshop Diorama 3D Modeler (`src/menuscene.ts`):** Bandeja magnética circular `screwTray` en aluminio pulido con fondo de goma vulcanizada conteniendo 4 tornillos Allen M3, arandelas y pasadores R-clips; chicote de cable de silicona 12AWG `xt60Lead` con conector hembra XT60 amarillo apoyado sobre la alfombrilla de corte verde y terminal acoplado en el cargador digital LiPo.
  - **Workshop Tools & Props 3D Modeler (`src/folded_slice.ts`):** Llave combinada `toolFold(0)` con mordaza inclinada a 15°, ojo de estrella cerrado de 12 puntas y troquelado métrico "10"; martillo `toolFold(1)` con uña sacaclavos curvada y hendida en V con cuña de fijación; destornillador `toolFold(2)` con virola hexagonal bolster para llave plana y punta Phillips fresada en cruz con vértice piramidal.
  - **Dynamic Suspension & 3D Kinematics Specialist (`src/car.ts`):** Cinemática inercial elástica de antena (`antennaWhipX/Z`) respondiendo a aceleración longitudinal (latigazo) y fuerzas centrífugas laterales en derrapes con amortiguación de resorte rápido a 60 FPS; desacoplamiento de amortiguación en compresión delantera vs trasera (`compFront` vs `compRear`) durante cabeceos de frenada y arrancada con 0 GC allocations.
- **Evidencia de validación:** `tsc --noEmit` 0 errores, vitest --changed 43 tests en verde, build Vite en 3.04 s, 17 capturas en `.shots/actual/` aprobadas, grafo de conocimiento sincronizado en 3914 nodos y 9497 aristas.

### Ciclo #52 (2026-10-10) — Todo 3D: C-Hubs y Antena en Vehículo, Props Folded, Diorama Garaje y Cinemática de Ruedas
- **Alcance implementado en producción (`src/`):**
  - **Procedural Vehicle 3D Modeler (`src/models.ts`):** Bloques de dirección C-Hub delanteros en aluminio CNC con tornillos Kingpin de pivote en cromo; tubo guía de antena flexible en flúor de competición con grapa/clip de sujeción al chasis. 0 draw calls adicionales.
  - **Environmental Props 3D Modeler (`src/folded_slice.ts`):** Roseta/alcachofa difusora perforada en latón estampado con placa difusora oscura y refuerzo de asa en regadera `wateringCanFold()`; garganta sellada y empuñadura de madera en asa de lata de pintura `paintCanFold()`.
  - **Workshop Diorama 3D Modeler (`src/menuscene.ts`):** Peana / soporte de calibración de chasis (Pit Stand) en aluminio perforado y almohadillas de goma antideslizante donde reposa el coche; cargador inteligente LiPo de radiocontrol con display LCD brillante y puertos XT60 sobre el banco de trabajo.
  - **Dynamic Suspension & 3D Kinematics Specialist (`src/car.ts`):** Cinemática elástica de amortiguación visible sobre las 4 ruedas (`wh.m.position.y += this.suspensionComp`) durante impactos verticales y baches, con compresión visible de coilovers y rebote continuo sin derivas ni allocations (0 GC).
- **Evidencia de validación:** `tsc --noEmit` 0 errores, vitest --changed 43 tests en verde, build Vite en 4.22 s, 17 capturas en `.shots/actual/` aprobadas, grafo de conocimiento sincronizado en 3889 nodos y 9446 aristas.

### 🔓 LISTO PARA EL CICLO #52 (Ecosistema de Especialistas Matriciales, 2026-10-10)

| Especialista | Propuesta destacada | Archivos asignados (`🔓`) |
|---|---|---|
| **Procedural 3D Modeler** | Tubo de antena flexible en nylon traslúcido y bloques C-Hub de dirección con kingpins | `src/models.ts` |
| **Audio Synth Designer** | Aullido de piñones de dientes rectos bajo par (`gearWhine`) y resonancia de Lexan (`lexanFlutter`) | `src/sfx.ts` |
| **Combat Feel & VFX** | Inflexión elástica de antena por fuerzas G e inercia y ráfagas de polvo en derrapes sostenidos | `src/car.ts` |
| **Diegetic HUD & Telemetry** | Micro-glitch de trama en RSSI durante CRC ERR y haptic chirp al enganchar enlace FHSS | `src/ui.ts`, `src/hud.css` |

### Ciclo #51 (2026-10-10) — Servo Saver 3D, SFX FETs y Muelles, Polvo Drift en car.ts, RSSI y FHSS en HUD
- **Alcance implementado en producción (`src/`):**
  - **Procedural 3D Folded Modeler (`src/models.ts`):** Resorte helicoidal del Servo Saver de protección de dirección en cromo y rótulas esféricas (ball joints) en los pivotes de los tensores de dirección para `buggy`, `formula` y `carrera`. 0 draw calls adicionales.
  - **Audio Synth Sound Designer (`src/sfx.ts`):** Silbido PWM ultrasónico de conmutación de MOSFETs del ESC `SFX.escWhine(spd, load)` bajo aceleración a fondo; chirrido mecánico de compresión de muelles y casquillos de nylon `SFX.chassisSqueak(impulse, pan)` en aterrizajes y baches.
  - **Combat Feel & VFX (`src/car.ts`):** Proyección de micro-chispas desde el flanco exterior de las ruedas traseras en derrape lateral sostenido con velocidad (`Math.abs(ls) > 4.0 && Math.abs(fs) > 5.0`); chirrido de suspensión y silbido de variador acoplados al loop sin allocations (0 GC).
  - **Diegetic HUD & Telemetry (`src/ui.ts`, `src/hud.css`):** Micro-vúmetro analógico segmentado `▌▌▌▌` (`.bars-1` a `.bars-4`) en `#signal` según RSSI en dBm; detección y animación de re-adquisición de salto de canales `.fhss-locked` en el indicador RX Diversity al recuperar radio seguro.
- **Evidencia de validación:** `tsc --noEmit` 0 errores, 10 suites (81/81 tests) pasando, build Vite en 1.11 s, 17 capturas en `.shots/actual/` aprobadas, grafo de conocimiento sincronizado en 3885 nodos y 9441 aristas.

### 🔓 LISTO PARA EL CICLO #51 (Ecosistema de Especialistas Matriciales, 2026-10-10)

| Especialista | Propuesta destacada | Archivos asignados (`🔓`) |
|---|---|---|
| **Procedural 3D Modeler** | Ensamble de Servo Saver elástico y varillaje con rótulas esféricas bajo chasis delantero | `src/models.ts` |
| **Audio Synth Designer** | Zumbido/conmutación térmica de FETs del ESC (`escWhine`) y chirrido de amortiguadores (`chassisSqueak`) | `src/sfx.ts` |
| **Combat Feel & VFX** | Salpicaduras diegéticas de gravilla/polvo centrífugo en drift prolongado y compresión visible de muelles | `src/car.ts` |
| **Diegetic HUD & Telemetry** | Micro-vúmetro RSSI analógico segmentado en `#signal` y efecto de enganche FHSS al recuperar enlace | `src/ui.ts`, `src/hud.css` |

### Ciclo #50 (2026-10-10) — R-Clips 3D, SFX Servo y Antena, Chispas Laterales en car.ts y RX Diversity en HUD
- **Alcance implementado en producción (`src/`):**
  - **Procedural 3D Folded Modeler (`src/models.ts`):** Micro-arandelas de silicona azul y anillos de pasadores en horquilla de acero (R-clips de carrocería RC) en los 4 postes de montaje; tapa de registro del diferencial trasero en aluminio fundido con 4 tornillos Allen cromados en esquinas. 0 draw calls adicionales.
  - **Audio Synth Sound Designer (`src/sfx.ts`):** Zumbido/temblor PWM analógico del servomotor de dirección `SFX.servoChatter(steer, spd)` bajo esfuerzo; resonancia armónica de varilla flexible de acero `SFX.antennaTwang(pan)` ante impactos o rozamiento con obstáculos.
  - **Combat Feel & VFX (`src/car.ts`):** Proyección de micro-chispas en flanco exterior durante derrape lateral violento con velocidad (`Math.abs(ls) > 5.0 && Math.abs(fs) > 6.0`); transferencia física asimétrica al cabeceo base del chasis en aterrizajes según violencia del impacto vertical (`this.basePitch += this.lastVy * 0.012`) con 0 GC allocations.
  - **Diegetic HUD & Telemetry (`src/ui.ts`, `src/hud.css`):** Indicador RX Diversity dual (`RX:A` / `RX:B`) conmutando antena activa en tiempo real; alerta crítica de SNR (<8 dB) con parpadeo y micro-glitch electromagnético de pantalla `.rf-interference` sobre el display digital LCD.
- **Evidencia de validación:** `tsc --noEmit` 0 errores, 10 suites (81/81 tests) pasando, build Vite en 1.48 s, 17 capturas en `.shots/actual/` aprobadas, grafo de conocimiento sincronizado en 3867 nodos y 9404 aristas.

### 🔓 LISTO PARA EL CICLO #50 (Ecosistema de Especialistas Matriciales, 2026-10-10)

| Especialista | Propuesta destacada | Archivos asignados (`🔓`) |
|---|---|---|
| **Procedural 3D Modeler** | Pasadores R-Clip (Body Clips) de retención en postes de chasis y tornillería perimetral de diferencial | `src/models.ts` |
| **Audio Synth Designer** | SFX de servo de dirección bajo estrés (Servo Whine & Chatter) y resonancia de antena (Antenna Twang) | `src/sfx.ts` |
| **Combat Feel & VFX** | Chispas direccionales en raspones de flancos contra bordillos y squash asimétrico según cabeceo | `src/car.ts` |
| **Diegetic HUD & Telemetry** | Micro-glitch electromagnético de pantalla bajo SNR crítico (<8 dB) e indicador RX Diversity [A\|B] | `src/ui.ts`, `src/hud.css` |

### Ciclo #49 (2026-10-10) — Tensores Roscados 3D, SFX Bordillos y Failsafe, Chispas Fondo Plano y Telemetría SNR
- **Alcance implementado en producción (`src/`):**
  - **Procedural 3D Folded Modeler (`src/models.ts`):** Tensores roscados hexagonales ajustables (turnbuckle nuts) en titanio mecanizado (`M.metal("#64748b")`) en el punto medio de cada varilla de reenvío de dirección; tuercas ciegas métricas hexagonales de anclaje de rótulas en los extremos superior e inferior de las manguetas de aluminio CNC. 0 draw calls adicionales.
  - **Audio Synth Sound Designer (`src/sfx.ts`):** Nuevo efecto procedural `SFX.curbRattle(spd, pan)` para vibración y crujido plástico de policarbonato al rozar bordillos o peraltes de pista; alarma sonora bitonal industrial `SFX.rfFailsafeAlarm()` para advertencia acústica de receptor RX en límite crítico de cobertura.
  - **Combat Feel & VFX (`src/car.ts`):** Micro-chispas por contacto de chasis / fondo plano metálico contra el suelo en aterrizajes violentos o compresión severa de amortiguación (`FX.transmissionSpark(this.pos)`), con 0 GC allocations.
  - **Diegetic HUD & Telemetry (`src/ui.ts`, `src/hud.css`):** Telemetría continua de relación Señal/Ruido (`SNR:XXdB`) con alerta `.snr-low` ante interferencia crítica, vinculada a la alarma sonora de Failsafe RX al rebasar el radio del patio.
- **Evidencia de validación:** `tsc --noEmit` 0 errores, 10 suites (80/80 tests) pasando, build Vite en 1.31 s, 17 capturas en `.shots/actual/` aprobadas, grafo de conocimiento actualizado.

### 🔓 LISTO PARA EL CICLO #49 (Ecosistema de Especialistas Matriciales, 2026-10-10)

| Especialista | Propuesta destacada | Archivos asignados (`🔓`) |
|---|---|---|
| **Procedural 3D Modeler** | Tensores roscados de dirección y tuercas ciegas de trapecios | `src/models.ts` |
| **Audio Synth Designer** | Crujido de policarbonato `curbRattle` y alarma sonora Failsafe | `src/sfx.ts` |
| **Combat Feel & VFX** | Chispas de panza baja por compresión de suspensión en saltos | `src/car.ts` |
| **Diegetic HUD & Telemetry** | Vúmetro analógico con indicador de ruido de piso (SNR) | `src/ui.ts`, `src/hud.css` |

### 🔓 LISTO PARA EL CICLO #48 (Ecosistema de Especialistas Matriciales, 2026-10-10)

| Especialista | Propuesta destacada | Archivos asignados (`🔓`) |
|---|---|---|
| **Procedural 3D Modeler** | Tirantes de fibra de carbono y torres de amortiguación CNC | `src/models.ts` |
| **Audio Synth Designer** | Resonancia de grava en aterrizajes y freno regenerativo | `src/sfx.ts` |
| **Combat Feel & VFX** | Brake dive en clavada de frenos y rebote asimétrico | `src/car.ts` |
| **Diegetic HUD & Telemetry** | Micro-brújula de rumbo en radar y aviso Failsafe RX | `src/ui.ts`, `src/hud.css` |

### 🔓 LISTO PARA EL CICLO #47 (Ecosistema de Especialistas Matriciales, 2026-10-10)

| Especialista | Propuesta destacada | Archivos asignados (`🔓`) |
|---|---|---|
| **Procedural 3D Modeler** | Cincha de velcro de LiPo y capuchón de antena 2.4 GHz | `src/models.ts` |
| **Audio Synth Designer** | Micro-chasquidos de gravilla/patinamiento `wheelSpin` | `src/sfx.ts` |
| **Combat Feel & VFX** | Hundimiento trasero por transferencia de pesos (*Rear Squat*) | `src/car.ts` |
| **Diegetic HUD & Telemetry** | Vector de retorno RF en radar y micro-glitch analógico | `src/ui.ts`, `src/hud.css` |

### Ciclo #44 (2026-10-10) — Telemetría LiPo con Curva Post-Sag, Audio Diegético `bodyThud` y Fricción 540 / Banco Cinemático 3D Completo (Frenchie, Buggy, Entorno y Eulalio)
- **Alcance implementado en producción (`src/`):**
  - **Diegetic HUD & Telemetry (`src/ui.ts`, `src/hud.css`):** Relajación electroquímica gradual (~250 ms) post-sag con amortiguación elástica de tensión de celdas LiPo tras soltar nitro; alarma buzzer crítica de batería `SFX.lipoLowWarn()` (<15%) y micro-chirp piezoeléctrico `SFX.blip()` ante degradación extrema de señal RF (>75 m) con compuertas anti-saturación.
  - **Audio Synth Designer (`src/sfx.ts`, `src/car.ts`, `src/main.ts`):** Nuevo sonido diegético `SFX.bodyThud(pan)` con síntesis de resonancia hueca de policarbonato/lexan disparado en colisiones dinámicas de chasis y parachoques contra muros, macetas, árboles o enemigos pesados, con cálculo de estéreo direccional `impactPan`.
  - **Combat Feel & VFX (`src/fx.ts`, `src/main.ts`):** Micro-fricción térmica y partículas incandescentes proyectadas desde el bobinado del motor 540 y disipador del chasis cuando el auto mantiene nitro sostenido por más de 1.5 s, coordinado con telemetría de sobrecalentamiento `ESC: 85°C`.
  - **Banco Cinematográfico 3D (`src/art_lab.ts`, `art-lab.html`, `assets-src/cinematic-3d/`):**
    - **Frenchie:** Escultura anatómica PBR fiel a `10-frenchie-gris.png` (57.550 tris, 3.4 MB), mancha marfil visible en el pecho, orejas de murciélago erguidas, stop nasal a 90°, belfos, 4 dedos con garras, 7 clips de `PerroRig` intactos con matrices finitas.
    - **Buggy RC:** Chatarra industrial inspirada en `08-buggy.png` (115.020 tris, 4.3 MB), remaches, jaula antivuelco X-brace, suspensión A-arms con coilovers 3D, 4 ruedas crawler profundas con llantas deep-dish beadlock, faros Fresnel y piloto soldadito.
    - **Entorno y Vegetación:** Matas curvas orgánicas finas y anchas (`vegetation.glb`), cerca de tablas envejecidas con estacas y cuerda de seguridad naranja (`fence_boundary.glb`), catenaria suspendida con bombillas Edison ST64 (`patio_lights.glb`), suelo de tierra compactada con huellas en bajorrelieve (`ground_terrain.glb`).
    - **Gato Eulalio:** Escultura cinematográfica basada en `07-eulalio.png` (58.496 tris, 3.6 MB), pelaje naranja atigrado mate, babero y calcetines blancos, ojos verdes almendrados con actitud escéptica, 8 clips de `GatoRig` intactos.
    - **Ensamblaje y Evaluador:** Selector interactivo de personaje (`Frenchie`, `Eulalio`, `Dúo`), iluminación física día/noche con sombras PCF y ACES tonemapping, corredor de cámara frontal despejado para pasto instanciado.
- **Evidencia de validación:** `npx tsc --noEmit -p .` (0 errores), `npm test` (75/75 pasando), `npm run build` (514 ms), `node scripts/cinematic-check.mjs` (aprobado 100%: 12.3 ms PC ~81 FPS, 5.6 ms Celular ~178 FPS, 4 ruedas, 7 clips animados finitos, 0 desbordamiento, 0 errores), capturas de verificación duraderas `preview-*.png` generadas.

## 2026-10-10 · Muestra cinematográfica 3D local (tanda visual independiente)

Autorizada por el usuario para aproximar el arte de la intro mediante modelos reales en su Mac. `art-lab.html` muestra buggy amarillo y frenchie gris de pecho marfil, siete clips conservados, materiales PBR, patio, día/noche y tres cámaras. Fuentes Blender, GLB, texturas, capturas y video en `assets-src/cinematic-3d/`; plan y límites en `docs/CINEMATIC_3D_SLICE.md`. No reemplaza los modelos Folded activos ni modifica balance/partidas. Sin publicación. La página y sus recursos de trabajo quedan fuera del build estándar.

Verificado: tsc, 75 pruebas y build; Chromium Metal, pc 1280×720 y cel 390×844, cuatro ruedas, siete clips con matrices finitas, movimiento en idle, controles, cero errores/desbordamientos. Mediana orientativa M4 Pro: 4,1 ms pc / 2,6 ms cel; viewport móvil en Mac, sin afirmar teléfono físico ni hordas. Modelos únicos: 46.878 triángulos frenchie y 98.744 buggy.

Checkpoint propio: primera muestra ejecutable terminada; fidelidad cinematográfica todavía pendiente. Oportunidades de esta línea: (1) refinar anatomía/pelo, pasto y luz para cerrar la diferencia con la referencia (recomendado; complejidad media-alta, antes de repetir recursos); (2) construir Eulalio con el mismo criterio (media-alta, amplía el reparto); (3) crear LOD y una prueba aislada de instancias antes de integrar al gameplay (alta, controla costo de multitudes). Este checkpoint no sustituye el ciclo de los especialistas que trabajan en paralelo.

Continuidad autorizada por el usuario: `docs/VISUAL_SESSION_COORDINATION.md` enlaza la muestra con los ciclos Gemini y futuras sesiones Codex. Define encargos de frenchie, vegetación, Eulalio y estudio de LOD en carpetas separadas, reserva antes de editar, handoff por encargo y commits solo de rutas propias. La regla Gemini Only conserva el proveedor de Antigravity y reconoce la colaboración de sesiones independientes. Prioridad recomendada: refinar frenchie/vegetación antes de integrar. Los encargos están disponibles, no iniciados automáticamente; el usuario puede trasladar el prompt listo.

**Aclaración de autonomía del usuario (2026-10-10):** Gemini puede avanzar independientemente, elegir tareas y cerrar ciclos dentro del alcance autorizado sin esperar revisión de Codex. La revisión posterior es opcional; no existe dependencia de aprobación entre proveedores. Reservas temporales, banco libre al cerrar cada tanda y handoffs verificables; los encargos visuales son oportunidades y no limitan otras líneas ya autorizadas. Actualizados AGENTS.md, GEMINI.md, reglas y prompt de continuidad.


## 2026-10-10 · Biblioteca visual de superficies v1

Pedido del usuario: más recursos reutilizables como la tierra aprobada, útiles para lo actual y cosas nuevas. Ocho mapas de color independientes generados con imagegen integrado en `assets-src/material-library/v1/`: tierra compactada, hierba/tierra, hormigón, madera, acero oxidado, pintura amarilla gastada, asfalto y ladrillo. Originales PNG 1254×1254 (34,76 MB), WebP a igual resolución (6,51 MB), prompts, catálogo, guía de aplicación al código actual y handoff autónomo para Gemini. Galería local con repetición 3×3 y descargas; sin integración en partidas ni publicación.

Verificado: tsc, 75 pruebas y build; PNG/WebP decodificados (16 por viewport), ocho diálogos, imagen cuadrada, pc 1280×720 y cel 390×844 sin errores/desbordamiento. Capturas en `evidence/`; navegador cerrado. Límites: solo albedo, normal/ORM ausentes, repetición no certificada sin costuras, materiales no probados en gameplay. Checkpoint: recursos disponibles y reserva liberada al cierre. Oportunidades: (1) aplicar tierra/hormigón/madera a una zona o banco existente conservando instancias (recomendado, complejidad media); (2) generar normal/ORM coherentes y máscaras de metal para chapa/pintura (media-alta); (3) variantes de pavimento liso y juntas corregidas para superficies extensas (media). Gemini puede elegir otro avance autorizado sin esperar revisión de Codex.


## 2026-10-10 · Equipo abierto y ambientación con alpha v1

Decisión explícita del usuario: todas las herramientas y modelos que él elija pueden aportar y aprovechar recursos, con trabajo autónomo o un orquestador temporal por tanda. Actualizado el ecosistema existente en `docs/SPECIALISTS_ECOSYSTEM.md`, AGENTS, GEMINI y reglas: roles por tarea sin proveedor fijo, revisión de Codex opcional, reservas temporales y entrega de fuentes/catálogo/evidencia/handoff. La configuración nativa actual de Antigravity se conserva; no hay sincronización automática de chats ni agentes activados por esta documentación.

Elegida ambientación: `assets-src/environment-library/v1/` aporta cuatro imágenes RGBA independientes de aceite, huellas, hojas y pequeños restos. PNG 1254×1254 finales 5,21 MB; WebP a igual resolución 1,34 MB con alpha exacto, prompts, catálogo, guía, galería de composición sobre superficies v1 y handoff. Son detalles planos; no modelos, efectos físicos ni integración en partidas. Fuera del build normal y sin publicación.

Verificado: tsc, 75 pruebas y build; un Chromium headless Metal cerrado al finalizar, pc/cel con ocho PNG/WebP, cuatro diálogos y veinte composiciones por viewport, opacidad, proporciones, hashes/alpha y cero errores/desbordamiento. Capturas en `evidence/`. Se conserva ruido de alpha hasta 1/255 en el borde generado, documentado. Sin sim/perf porque no cambia gameplay. Reserva liberada; se puede aplicar una selección en una zona o banco dentro del alcance autorizado, conservando materiales compartidos/instancias y verificando ambas cámaras. Esta ficha no sustituye el checkpoint de los ciclos concurrentes.


## 2026-10-10 · Props procedurales con fuentes — v1

Pedido del usuario: continuar produciendo recursos procedurales. `assets-src/procedural-props/v1/` entrega cinco familias × tres semillas: pallets, neumáticos apilados, bidones abollados, chapas dobladas y tornillería. Quince GLB completos a 360°, fuente Blender con mapas empaquetados, generador reutilizando CarBuild/bicho, quince PNG PBR 512×512, catálogo y visor local. Complementa vegetación/cercas/luces de Gemini y bibliotecas de superficies/decals; sin sustituir recursos activos ni tocar gameplay. Fuera del build y sin publicación.

Verificado: generación con igual semilla, lectura de canales PNG, binarios GLB, carga/selección de quince variantes, día/noche, reset y encuadre completo en pc/cel, cero errores/desbordamiento. Tipos, 80 tests y build pasan sobre el árbol compartido. Evidencia y revisión Ponytail en el paquete, navegador cerrado. Total 53.796 triángulos, 524–6.032 por prop, GLB 19,84 MB. Reserva liberada; cualquier sesión autorizada puede reutilizar o producir v2 sin esperar revisión Codex. Siguiente oportunidad: integrar una selección en un banco o zona autorizada conservando instancias, escala y ambas cámaras. Sin AO físico, LOD ni prueba de hordas; no atribuir esta prueba al checkpoint Luna/LOD concurrente.


## 2026-10-10 · Pipeline de LODs y Hordas Masivas de Supervivencia (`gemini-performance`)

Decisión del usuario: Diseñar el pipeline de LODs (LOD0 héroe / LOD1 horda) y animación instanciada para llevar los modelos cinemáticos al combate masivo de Supervivencia.
Se diseñó e implementó el pipeline de reducción geométrica rig-safe en Blender y la suite de medición cuantitativa en Chromium Metal:

1. **Modelos LOD1 producidos y verificados (`assets-src/cinematic-3d/gemini-performance/`):**
   - **Frenchie LOD1 (`frenchie_lod1.glb`):** 3.740 triángulos (-93.5% vs 57.5k), 1.32 MB. Preserva `PerroRig` (21 huesos), deformación sin NaN y los 7 clips de animación (`charge`, `death`, `idle`, `jump_slam`, `rage`, `run`, `walk`).
   - **Eulalio LOD1 (`eulalio_lod1.glb`):** 3.802 triángulos (-93.5% vs 58.5k), 1.41 MB. Preserva `GatoRig` (23 huesos) y los 8 clips (`death`, `idle`, `jump`, `rage`, `run`, `spin`, `swipe`, `walk`).
   - **Buggy LOD1 (`buggy_lod1.glb`):** 10.180 triángulos (-91.1% vs 115k), 1.11 MB. Carrocería a 4.4k tris y 4 ruedas independientes con tacos y beadlocks a 5.7k tris.

2. **Benchmark Cuantitativo en Motor Real (`bench-lod.html`, `scripts/bench-check.mjs`):**
   - Medición con Chromium Metal (Apple M4 Pro) a 1280×720:
     - 20x LOD0 (Héroe): 1.15M tris, 4.50 ms mediana / 6.50 ms P95.
     - 20x LOD1 (Horda 20): 74.8k tris, 3.90 ms mediana / 5.90 ms P95.
     - 50x LOD1 (Horda 50): 186.9k tris, 5.30 ms mediana / 9.40 ms P95 (~188 FPS).
     - 100x LOD1 (Horda 100): 373.8k tris, **7.90 ms mediana / 9.80 ms P95 (~126 FPS)**.
   - Demuestra que con 100 enemigos activos corriendo simultáneamente en pantalla, el tiempo de render está **por debajo de 10 ms (P95: 9.8 ms)**, garantizando ampliamente los 60 FPS (presupuesto de 16.6 ms).

3. **Entregables:**
   - Plan maestro: `docs/LOD_AND_INSTANCING_PLAN.md`.
   - Generador y verificador: `build_lods.py`, `verify_lods.py`.
   - Banco interactivo: `bench-lod.html`, `src/bench_lod.ts`.
   - Capturas de evidencia: `preview-horde-50.png`, `preview-horde-100.png`.
   - Handoff técnico: `assets-src/cinematic-3d/gemini-performance/HANDOFF.md`.


## 2026-10-10 · Banco Cinemático Maestro 3D y Ensamblaje Completo (Gemini Orquestador)

Culminación del ensamblaje del banco cinemático 3D (`art-lab.html`, `src/art_lab.ts`, `assets-src/cinematic-3d/`) integrando todos los modelos PBR de alta fidelidad desarrollados por los especialistas:
1. **Modelos 3D y Rigs Completos:**
   - **Frenchie (`frenchie.glb` · 3.4 MB, 57.5k tris):** Esculpido anatómico con orejas de murciélago erguidas, stop nasal a 90°, belfos caídos, mancha marfil visible en el pecho, ojos ámbar volumétricos, 4 dedos/garras por pata y los 7 clips de `PerroRig` preservados con matrices finitas.
   - **Buggy RC (`buggy.glb` · 4.3 MB, 115k tris):** Chasis de chatarra industrial con paneles remachados, pintura amarilla gastada, coilovers 3D con muelles helicoidales, piloto soldadito con casco y 4 ruedas independientes con tacos crawler (`Wheel_*`).
   - **Eulalio (`eulalio.glb` · 3.6 MB, 58.5k tris):** Gato atigrado ginger tabby, ojos chartreuse de mirada condescendiente a medio cerrar, mechones en mejillas y pecho, calcetines blancos, 4 garras retráctiles por pata y los 8 clips de `GatoRig` intactos con matrices 100% finitas.
   - **Entorno del Patio:** `vegetation.glb` (matas curvas orgánicas), `fence_boundary.glb` (cercas con cuerda de seguridad naranja), `patio_lights.glb` (catenaria Edison ST64) y `ground_terrain.glb` (tierra compactada con marcas de neumáticos).
2. **Interactividad y Composición Master:**
   - Selector dinámico de actores (`Frenchie`, `Eulalio`, `Dúo`).
   - Iluminación física conmutables (`Noche` con lámpara y faros del buggy / `Día` con sol directo).
   - Cámaras configuradas (`Primer Plano`, `Juego`, `Órbita 360°`).
3. **Verificación Cuantitativa Automatizada (`scripts/cinematic-check.mjs`):**
   - Ejecutado en Chromium headless con GPU Apple M4 Pro (Metal) contra servidor pm2 `rc-test` (:5174).
   - PC 1280×720: 2.89M tris, 211 draw calls, 4 ruedas detectadas, 7 clips verificados con matrices finitas en todos los fotogramas, 0 errores de consola, 0 desbordamiento.
   - Celular 390×844: 1.10M tris, 152 draw calls, 4 ruedas, 7 clips.
   - Evidencia capturada: `preview-night.png`, `preview-day.png`, `preview-game.png`, `preview-phone.png`, `verification.json` y video orbital completo `orbit-preview.mp4` (8 s, 12 fps, H.264).


## 2026-10-11 · Stack Creativo Local Primario (ComfyUI + SDXL + Metal/MPS)

Decisión del usuario: Configurar y usar el stack creativo local de la Mac como recurso primario para generar ilustraciones, imágenes, fondos y texturas, con aceleración GPU Metal/MPS obligatoria, modelo SDXL Base 1.0 instalado y workflow `sdxl-web.json`. Prohibido el reemplazo de arte por CSS/SVG simple, reservando HTML/CSS/SVG para textos, botones e íconos funcionales.

1. **Configuración de Entorno e Integración MCP:**
   - Servidor MCP `comfy-local` registrado en `~/.gemini/config/mcp_config.json` apuntando a `/Users/msalas/CreativeStack/venv/bin/comfy-mcp`.
   - Comprobada aceleración por hardware en Metal/MPS (`Apple M4 Pro`, 24 GB de memoria unificada, `torch 2.14.1`, device `mps`).
   - Regla de persistencia agregada en `.agents/rules/creative-stack.md` y skill creada en `.agents/skills/creative-stack/SKILL.md`.

2. **Runner Automatizado y Concurrencia Multiagente (`scripts/creative-gen.mjs`):**
   - Script ejecutable que despacha workflows a `http://127.0.0.1:8188`, respeta la cola FIFO sin interrumpir trabajos concurrentes (comprobado en vivo contra la tanda de texturas de `redserva-c17`), espera la finalización en GPU, convierte a WebP con `cwebp` y emite metadatos `.meta.json` para reproducibilidad total (prompt, negativo, semilla, pasos, CFG, dimensiones, licencia SDXL).

3. **Producción e Integración del Primer Recurso:**
   - **Ilustración Hero para Créditos (`public/images/credits-hero.webp` · 73.5 KB, 1024×512):** Buggy amarillo de chatarra con neumáticos crawler sobre el césped del patio bajo la luna y ojos brillantes en la vegetación.
   - **Metadatos guardados:** `public/images/credits-hero.meta.json` (semilla `1984`, 26 pasos, sampler `dpmpp_2m karras`, CFG `7.0`, modelo SDXL Base 1.0).
   - **Integración DOM:** Incorporado bloque `.creditsArt` en `.briefCard.jm-panel` de `#scr-credits` en `index.html` y estilizado en `src/menu.css` con marco de chapa (`--jm-chapa`), borde gastado y adaptación responsive (160 px en PC, 120 px en móvil). Los textos narrativos y de créditos se conservan en HTML puro con tipografía `Rajdhani`.

4. **Verificación Realizada:**
   - `npx tsc --noEmit -p .`: 0 errores de tipado.
   - `npm test`: 81/81 pruebas pasando en 10 archivos de test.
   - `npm run build`: bundle de producción generado limpiamente.
   - `npm run test:restart` y `npm run shots -- --only creditos`: capturas `pc-menu-creditos` y `cel-menu-creditos` ejecutadas en Chromium headless Metal en 20.6 s, verificadas visualmente en `.shots/actual/`, sin desbordamiento ni errores de consola.
   - Grafo de conocimiento actualizado con `graphify update .`.

## 2026-10-11 · Producción de Superficie PBR Terreno/Chatarra con ComfyUI (SDXL + Metal/MPS), Biblioteca v2 e Integración en Banco Cinemático 3D

Decisión del usuario: Generar texturas PBR y albedos de terreno/chatarra para ampliar la biblioteca de superficies (`assets-src/material-library/`) y aplicarlas al suelo del patio en el banco cinemático 3D (`src/art_lab.ts` / `art-lab.html`).

1. **Producción de Textura con ComfyUI Local (Metal/MPS):**
   - **`09-scrap-earth` (Tierra con chatarra y marcas RC):** Albedo ortográfico cenital 1024×1024 con iluminación difusa plana, libre de sombras proyectadas o viñeteado. Representa suelo de tierra compactada con gravilla fina, arcilla rojiza, diminutos trozos de arandelas oxidadas, virutas de chatarra y sutiles rodadas de neumáticos RC.
   - **Parámetros reproducibles:** Semilla `20261011`, 28 pasos, sampler `dpmpp_2m`, scheduler `karras`, CFG `7.0`, modelo `sd_xl_base_1.0.safetensors` sobre GPU Metal/MPS en Apple M4 Pro (24 GB RAM unificada).
   - **Archivos generados:**
     - Fuente PNG en alta resolución: `assets-src/material-library/v2/sources/09-scrap-earth.png` (2.073.999 bytes).
     - Textura WebP optimizada: `assets-src/material-library/v2/textures/09-scrap-earth.webp` (267.428 bytes, PSNR 41.17 dB).
     - Metadatos adjuntos: `assets-src/material-library/v2/textures/09-scrap-earth.meta.json`.
     - Asset de runtime web: `public/textures/09-scrap-earth.webp`.

2. **Ampliación de la Biblioteca de Materiales (`assets-src/material-library/v2/`):**
   - Catálogo formal `assets.json` versión 2 con hashes SHA-256, dimensiones, ratios de compresión, parámetros PBR recomendados (`roughness = 0.94`, `metallic = 0.05`), usos y estado `integrated-art-lab`.
   - Documentación y guía de aplicación en `assets-src/material-library/v2/README.md`.
   - Prompt de producción preservado en `assets-src/material-library/v2/prompts/09-scrap-earth.txt`.

3. **Integración en el Banco Cinemático 3D (`src/art_lab.ts`, `art-lab.html`):**
   - Textura `09-scrap-earth.webp` mapeada con repetición UV a 7x en el material PBR del suelo (`M_Ground_CompactedTracks` sobre `Ground_ArenaSection_Mesh`), con rugosidad calibrada a 0.94 y respuesta física bajo sombras diurnas y faros del buggy.
   - Selector interactivo de superficie en la barra de control (`nav[aria-label="Evaluación visual"]`): botones `Chatarra` (nueva textura SDXL v2), `Tierra` (albedo de tierra compactada v1) y `Original` (textura embebida en GLB), con estilos `--jm-*`, `Rajdhani` y `aria-pressed`.
   - Soporte programático en la API de pruebas `__art({ surface: 'scrap' | 'earth' | 'base' })` y reporte en `__artInfo()`.

4. **Verificación Realizada con Evidencia:**
   - `npx tsc --noEmit -p .`: 0 errores de tipado TypeScript.
   - `node scripts/cinematic-check.mjs`: suite completa en PC (1280×720, 211 draws, 15.5 ms mediana) y móvil (390×844, 152 draws, 6.6 ms mediana) sobre Chromium headless acelerado por GPU Metal. 0 errores de consola, 0 desbordamiento horizontal.
   - Capturas visuales inspeccionadas: `.shots/cinematic-3d/pc-night-close.png`, `pc-day-game.png`, `cel-night-close.png` con iluminación nocturna (lámpara y faros del buggy) y diurna (sol cenital).
   - `npm test`: 81/81 pruebas unitarias pasando en 10 archivos de test.
   - `npm run build`: bundle de producción generado en 564 ms.
   - `graphify update .`: grafo de conocimiento sincronizado (4063 nodos, 9786 aristas).

## 2026-10-11 · Backdrop Cinemático de Taller y Garaje con ComfyUI (SDXL + Metal/MPS)

Decisión del usuario: Generar e integrar un backdrop cinemático de taller/garaje nocturno para el Garaje y Taller de autos.

1. **Producción de Ilustración con ComfyUI Local (Metal/MPS):**
   - **Backdrop de Taller (`public/images/workshop-backdrop.webp` · 82.6 KB, 1024×512):** Mesa de trabajo rústica con herramientas de precisión (alicates, destornilladores, cautín, cables, tornillos M3, amortiguadores RC con resortes amarillos y rueda crawler), lámparas industriales colgantes con luz incandescente de tungsteno, tablero perforado con siluetas y estantes en penumbra.
   - **Metadatos reproducibles:** `public/images/workshop-backdrop.meta.json` (semilla `771124`, 28 pasos, sampler `dpmpp_2m karras`, CFG `7.0`, modelo SDXL Base 1.0 en Apple M4 Pro Metal/MPS, compresión cwebp q85 con PSNR 42.72 dB).

2. **Integración en Garaje y Taller (`index.html`, `src/menu.css`):**
   - **Taller (`#scr-shop`):** Bloque `.shop-banner.jm-panel` enmarcado en chapa remachada (`--jm-chapa`, 2 px) con sombra interior y relación panorámica de 72 px en PC y 56 px en móvil.
   - **Garaje (`#scr-garage`):** Bloque `.garage-banner.jm-panel` ubicado sobre las pestañas de personalización del auto (`#gtabs`), reforzando la atmósfera de taller clandestino mientras el auto 3D en la plataforma giratoria mantiene todo el protagonismo a la izquierda.
   - Ocultamiento inteligente en modo edición (`#scr-garage.editing .garage-banner { display: none; }`) y en pantallas horizontales compactas (`@media (max-height: 500px)`).

3. **Verificación Realizada con Evidencia:**
   - `npx tsc --noEmit -p .`: 0 errores de tipado.
   - `npm run test:restart` y `npm run shots -- --only garaje,taller`: 26 capturas de pantalla tomadas y verificadas en PC y móvil (`pc-menu-garaje.png`, `pc-menu-taller.png`, `cel-menu-garaje.png`, `cel-menu-taller.png`) sin desbordamiento horizontal ni colisiones de UI.
   - `npm test`: 81/81 pruebas unitarias pasando al 100%.
   - `npm run build`: compilación limpia en 552 ms.
   - `graphify update .`: grafo de conocimiento sincronizado (4064 nodos, 9787 aristas).

## 2026-10-11 · Albedo PBR Terreno/Chatarra (09-scrap-earth) y Zona de Combate en Supervivencia (2 Subagentes en Paralelo)

Decisión del usuario: Integrar el albedo PBR de terreno (`09-scrap-earth`) en el suelo del modo Supervivencia (`src/world.ts` / `src/render.ts`) manteniendo 60 FPS fijos, trabajando con 2 subagentes en paralelo.

1. **Subagente 1 · Render & Texture Specialist (`src/render.ts`):**
   - Agregada función `TEX.scrapEarth` para cargar e instanciar la textura WebP PBR (`./textures/09-scrap-earth.webp`) con direccionamiento repetible `TEXTURE_WRAP_ADDRESSMODE` y sampling trilineal.
   - Actualizado `TEX.dirt` para reutilizar directamente `TEX.scrapEarth()` con escala `uScale = vScale = 8`, sustituyendo completamente el renderizado procedural en Canvas 2D (que ejecutaba 14.000 operaciones con `Math.random` por carga) por el albedo WebP pre-optimizado sin coste de CPU ni fugas de memoria.

2. **Subagente 2 · World & Terrain Specialist (`src/world.ts`):**
   - **Calibración de Huerta y Surcos:** Vinculado el decal de tierra (`42 × 32` m) y los 4 surcos cilíndricos a la textura PBR con escala precisa a escala de auto RC ($uScale = 7$, $vScale = 5.33$, $6.0$ m/tesela sin distorsión de aspecto), rugosidad física calibrada a 0.94 y micro-relieve `soil` vía `surface()`.
   - **Nueva Zona de Combate de Chatarra (`scrapZone`):** Incorporado decal de $46 \times 36$ m en el cuadrante noroeste del patio $(-48, 20)$ con albedo PBR, berma de tierra perimetral, rampa de chapa oxidada para saltos acrobáticos, pilas de neumáticos de descarte y cajas Folded integradas.
   - **Sonido y Fricción Diegética:** Registrada la zona en `floorAt(x, z)` para reproducir audio y partículas de gravilla al derrapar sobre la chatarra, y área despejada de matas de pasto (`ZONES.patio.rects` y `bare`).
   - **Invariantes de Havok y Determinismo:** Poses de mallas asignadas antes de `PhysicsAggregate`, y cero llamadas a `rng()` para preservar el 100% del determinismo del generador de semillas.

3. **Verificación Cuantitativa de Rendimiento y Evidencia:**
   - `npx tsc --noEmit -p .`: 0 errores de tipado TypeScript.
   - `npm run perf -- --only partida --vp pc --frames 120`: **5.1 ms mediana / 5.9 ms P95** en PC con GPU Metal (~170+ FPS teóricos, garantizando ampliamente los 60 FPS dentro de los 16.6 ms de presupuesto) y 154 draw calls.
   - `npm test`: 81/81 pruebas unitarias pasando al 100%.
   - `npm run build`: bundle compilado limpiamente en 596 ms.
   - `npm run sim -- --seeds 1 --secs 60`: simulación de bot 60 s determinista sin fallos.
   - `npm run shots -- --only partida`: 9 capturas verificadas en `.shots/actual/` (`pc-partida-curso.png`, `cel-partida-curso.png`, etc.).
   - `graphify update .`: grafo de conocimiento actualizado (4070 nodos, 9820 aristas).

## 2026-10-11 · Expansión Creativa Masiva (4 Tareas en Paralelo con Subagentes)

Decisión del usuario: Ejecutar en paralelo las 4 propuestas creativas seleccionadas con equipos de subagentes trabajando concurrentemente sobre ComfyUI (SDXL Base 1.0 en Metal/MPS):

1. **Weapon Art Specialist · Ilustraciones de Taller para Armas Evolucionadas:**
   - Generadas 4 ilustraciones en 512×512 WebP con metadatos `.meta.json`:
     - `public/images/evo-torbellino.webp` (41.1 KB · semilla 101): Hoja circular giratoria con chispas de desguace.
     - `public/images/evo-sierra.webp` (29.4 KB · semilla 102): Disco doble dentado gemelo de acero oxidado.
     - `public/images/evo-lanzallamas.webp` (28.8 KB · semilla 103): Boquilla industrial con llamaradas incandescentes.
     - `public/images/evo-mortero.webp` (20.5 KB · semilla 104): Tubo lanzador cargado con bulones y metralla.
   - Diseñado e integrado `.evo-thumb` con chapa biselada, remaches y resplandor áureo `:hover` en las cartas de mejora del HUD (`src/ui.ts`, `src/hud.css`).

2. **Decals Specialist · Calcomanías de Chatarra con Alpha Real para el Garaje:**
   - Diseñadas con canal alfa transparente y catalogadas en `assets-src/environment-library/v2/` y `public/images/decals/`:
     - `decal_dorsal_07`: Dorsal vintage oxidado ("07" stencil desgastado).
     - `decal_flames`: Llamas de soplete/fuego industrial sobre chapa.
     - `decal_junkoil`: Marca retro de grasa/lubricante "JUNK-OIL".
   - Integrado en el editor de personalización del Garaje (`src/models.ts`, `src/menu.ts`, `src/menu.css`), previsualización 3D en vivo con `MATERIAL_ALPHATESTANDBLEND` y persistencia en guardado.

3. **Race Track Specialist · Albedo PBR de Asfalto con Virutas en Modo Carrera:**
   - Generada textura `public/textures/race-asphalt.webp` (1024×1024 WebP, 202 KB, semilla 42091) con asfalto agrietado, viruta metálica y rodadas.
   - Conectada en `src/kart.ts` mediante `roadTex()` con `TEXTURE_WRAP_ADDRESSMODE` y micro-relieve PBR en la cinta de pista.

4. **Bestiary Art Specialist · Backdrop de Vitrina Nocturna en la Chatarroteca:**
   - Generado `public/images/bestiary-backdrop.webp` (1024×512 WebP, 63.8 KB, semilla 88102) con vitrina rústica nocturna de frascos y especímenes mecánicos.
   - Integrado en `#scr-bestiary` (`index.html`, `src/menu.css`) como cabecera `.bestiary-banner.jm-panel` enmarcada en chapa remachada.

5. **Verificación Global:**
   - `npx tsc --noEmit -p .`: 0 errores.
   - `npm test`: 81/81 tests unitarios pasando al 100% (10 suites).
   - `npm run build`: bundle de producción generado en 884 ms.
   - `graphify update .`: grafo de conocimiento actualizado (4072 nodos, 9824 aristas).






