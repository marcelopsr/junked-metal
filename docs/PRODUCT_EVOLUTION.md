# Junked Metal — Registro Persistente de Evolución de Producto

**Metodología activa:** `EXPLORE → UNDERSTAND → DISCOVER → IMAGINE → PROPOSE → DISCUSS → DECIDE → IMPLEMENT → VALIDATE → REFINE → DOCUMENT → LEARN → NEW DISCOVERY ↺`  
**Última actualización:** 2026-10-10 (Ciclos #1 a #20 completados y validados · Ciclo #21 listo para selección)

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

---

## 4. Backlog Vivo de Oportunidades — Ciclo #23 (6 Áreas en Paralelo)

### A. Área 1 · Garaje y Chatarroteca (`src/menu.ts`, `src/menu.css`)
1. **Resaltado de Logros Avanzados (`.ach-near`):**
   - **Qué es:** En `renderBestiary()` pestaña logros, destacar con un sutil borde ámbar cálido y etiqueta `¡CASI LISTO!` los logros que superen el 70% de progreso hacia su desbloqueo.
   - **Qué problema resuelve:** Orienta al jugador sobre qué meta está más próxima a completarse para enfocar sus siguientes partidas.
   - **Valor:** Mayor motivación y claridad en la progresión meta. Complejidad: Baja.

### B. Área 2 · HUD de Supervivencia (`src/ui.ts`, `src/hud.css`)
2. **Pulso de Hito Decenal en el Indicador de Nivel (`#lvl`):**
   - **Qué es:** En `hudUpdate()` (`src/ui.ts`), activar un destello dorado especial `.milestone` en el badge de nivel `#lvl` cada 10 niveles alcanzados (`NV 10`, `NV 20`, `NV 30`...).
   - **Qué problema resuelve:** Celebración visual de hitos significativos de supervivencia durante la partida.
   - **Valor:** Satisfacción y retroalimentación reforzada en runs prolongadas. Complejidad: Baja.

### C. Área 3 · Carrera: Indicador de Aspiración / Rebufo (`src/kart.ts`, `src/race.css`)
3. **Pastilla de Rebufo (`REBUFO`) en el Velocímetro de Carrera:**
   - **Qué es:** En `hud()` (`src/kart.ts`), mostrar un distintivo amarillo `.rslip` (`REBUFO`) cuando el corredor aprovecha la estela aerodinámica de un rival directo para ganar aceleración.
   - **Qué problema resuelve:** Hace explícita la mecánica de succión detrás de otros autos, incentivando maniobras de adelantamiento táctico.
   - **Valor:** Mayor profundidad de conducción en carreras. Complejidad: Baja.

### D. Área 4 · Gabinete Junket Crush (`src/match3_draw.ts`, `src/match3.ts`)
4. **Halo de Perfección en Nodos de 3 Estrellas del Mapa:**
   - **Qué es:** En `drawNode()` (`src/match3_draw.ts`), trazar un resplandor dorado exterior tenue alrededor de los nodos de nivel completados con 3 estrellas perfectas.
   - **Qué problema resuelve:** Distingue inmediatamente en el mapa de campaña los niveles dominados por completo frente a los que tienen estrellas pendientes.
   - **Valor:** Claridad visual y satisfacción de completismo en la campaña. Complejidad: Baja.

### E. Área 5 · Efectos Visuales 3D (`src/fx.ts`)
5. **Nube de Aterrizaje de Chasis (`FX.land`):**
   - **Qué es:** En `FX` (`src/fx.ts`), añadir un método `land(p, hard)` que emita una voluta circular baja de polvo expansivo al impactar contra el suelo tras saltos o rampas.
   - **Qué problema resuelve:** Conexión táctil y peso físico más contundente cuando el auto RC cae tras desniveles o saltos de trampolín.
   - **Valor:** Mayor sensación de masa e impacto en la física arcade. Complejidad: Baja.

### F. Área 6 · Cierre de Partida y Polaroid (`src/replay.ts`, `src/replay.css`)
6. **Distintivo de Récord Histórico en Foto Polaroid:**
   - **Qué es:** En `showPhoto()` (`src/replay.ts`), si la partida superó el mejor tiempo registrado en la zona, añadir una pequeña estrella o sello dorado `"RÉCORD DE ZONA"` junto a la hora y tiempo.
   - **Qué problema resuelve:** Hace que las fotos polaroid de partidas históricas sean instantáneamente reconocibles al descargarlas o compartirlas.
   - **Valor:** Recompensa de coleccionismo y orgullo para el jugador. Complejidad: Baja.

---

## 5. Checkpoint de Sesión Actual

- **Último trabajo completado:** Ciclo #22 implementado en paralelo con 6 subagentes, verificado con `tsc`, `test` (75/75), `build` (677 ms), 33 capturas en `.shots/actual/` y grafo actualizado (3084 nodos, 7549 aristas).
- **Archivos bloqueados (`🔒 EN CURSO`):** Ninguno (todos los bloqueos del Ciclo #22 han sido liberados).
- **Próxima decisión pendiente:** Selección de alcance y asignación para el **Ciclo #23** (despliegue de 6 subagentes en paralelo por área).







