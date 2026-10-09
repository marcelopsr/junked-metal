# Junked Metal — Registro Persistente de Evolución de Producto

**Metodología activa:** `EXPLORE → UNDERSTAND → DISCOVER → IMAGINE → PROPOSE → DISCUSS → DECIDE → IMPLEMENT → VALIDATE → REFINE → DOCUMENT → LEARN → NEW DISCOVERY ↺`  
**Última actualización:** 2026-10-09 (Ciclos #1 a #7 completados y validados · Ciclo #8 iniciado)

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

---

## 4. Backlog Vivo de Oportunidades — Ciclo #10

### A. Lente de Experiencia Visual y Control (Configuración de Imagen)
1. **Curva de Gamma de Medios Tonos en Configuración de Imagen (`src/render.ts`, `src/menu.ts`):**
   - **Qué es:** Reemplazar el slider lineal de gamma por una curva perceptual de medios tonos (`pow` en shader retro) para corregir el rango dinámico sin quemar los blancos ni lavar los negros.
   - **Valor:** Ajuste fino de imagen en pantallas OLED y monitores de alto contraste sin distorsionar la paleta. Complejidad: Baja-Media.

### B. Lente de Dinámica de Partida y Variedad (Supervivencia)
2. **Eventos de Entorno Dinámicos en el Patio (`src/main.ts`, `src/world.ts`):**
   - **Qué es:** Mini-eventos temporales deterministas por semilla (ej. *Ráfaga de aspersor*, *Caída de piña/manzana*, *Ataque de hormiguero concentrado*) anunciados brevemente por radio.
   - **Valor:** Rompe la monotonía del minuto 3 al 7 en partidas de supervivencia introduciendo peligros y oportunidades transitorias en el terreno. Complejidad: Media.

### C. Lente de Game Feel en Carrera (Feedback Táctil y Visual)
3. **Chispas y Partículas de Mini-Turbo Progresivas en Derrape (`src/kart.ts`, `src/fx.ts`):**
   - **Qué es:** Partículas de chispas en las ruedas traseras que cambian de azul a naranja según el nivel de carga del mini-turbo al derrapar.
   - **Valor:** Feedback visual inmediato del tiempo de derrape idéntico al estándar arcade de carreras. Complejidad: Baja-Media.

---

## 5. Checkpoint de Sesión Actual

- **Último trabajo completado:** Ciclo #9 completado y validado (poda de ~565 kB en loaders GLTF, SFX sintético de Junket Crush y medallas metálicas de Carrera).
- **Estado de validación:** `tsc --noEmit`, `npm test` (75/75), `npm run build` sin chunk 2.0, shots verificados, `pm2` reiniciado y grafo sincronizado.
- **Lente activa para el Ciclo #10:** *Curva Gamma en Render, Eventos de Patio en Supervivencia y Feedback de Mini-Turbo en Carrera*.
- **Estado de concurrencia:** Sin bloqueos activos en el árbol de trabajo.




