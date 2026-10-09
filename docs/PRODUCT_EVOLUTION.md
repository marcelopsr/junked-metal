# Junked Metal — Registro Persistente de Evolución de Producto

**Metodología activa:** `EXPLORE → UNDERSTAND → DISCOVER → IMAGINE → PROPOSE → DISCUSS → DECIDE → IMPLEMENT → VALIDATE → REFINE → DOCUMENT → LEARN → NEW DISCOVERY ↺`  
**Última actualización:** 2026-10-09 (Ciclos #1, #2 y #3 completados y validados · Ciclo #4 iniciado)

Este documento conserva la inteligencia acumulada del producto entre ciclos y sesiones: estado actual de cada módulo, evaluaciones de calidad, decisiones aprobadas, ideas descartadas o pospuestas, backlog vivo de oportunidades y el checkpoint de continuidad.

---

## 1. Fichas de Estado por Módulo y Superficie

| Módulo / Modo | Archivos clave | Estado actual | Calidad Visual / Técnica | Notas clave |
|---|---|---|---|---|
| **Supervivencia (Core)** | `src/main.ts`, `src/enemies.ts`, `src/weapons.ts`, `src/run.ts`, `src/folded_slice.ts`, `src/fx.ts` | Producción activa | Partida, Cartas y Pausa refinadas en Ciclos #1–#2 · Perf PC: `lab-noche` 189 draws (`6.2 ms`), `partida_llena` 205 draws (`8.9 ms`) | Aviso `#banner` arriba (`10px`), tutorial auto-oculto a los 7 s, sombras de contacto en 1 draw call, sinergia de evolución/fusión `.syn` en cartas de nivel y daño en vivo por arma en Pausa. |
| **HUD y Menús (`kit.css`)** | `src/kit.css`, `src/ui.ts`, `src/menu.ts`, `src/menu.css`, `src/hud.css`, `src/menuscene.ts` | Producción activa | Portada/Chatarroteca/Cartas/Pausa: 8–9/10 · Escena 3D de Garaje/Taller en Folded 2.5D | En Ciclo #3 se migraron la lámpara articulada, cajonera 3×3, mesa y transmisor de `menuscene.ts` a materiales `wornMat` Folded y se limpiaron los antipatrones DOM (`broken-image`, `layout-transition`). Oportunidad en Ciclo #4: cifras y sinergias en UI de Garaje + grilla/contraste en Taller 720p. |
| **Carrera y Batalla (`kart.ts`)** | `src/kart.ts`, `src/race.css`, `src/world.ts` | Producción activa | Largada/Curso unificados con Folded · Perf PC: `largada` 249 draws (`7.6 ms`), `curso` 293 draws (`6.6 ms`) | Casa del fondo en ladrillo cálido (`brick`), pórtico/rampas con `TRIM.hazard`, cartel `START` y cajas `?` en `Rajdhani`, vallas/tribunas en `FOLD`. Pendiente menor: podio (`buildPodium`) en `foldBox` y carga perezosa del chunk de carrera. |
| **Junket Crush (`match3`)** | `src/match3*.ts`, `src/match3.css` | Producción activa (carga perezosa) | Juego y Gabinete: 8–9/10 · Perf: 77 draws | En Ciclo #3 se eliminaron las masas verdes del patio detrás del gabinete (`showWorld(false)` en `startMatch3`), se normalizó el UV planar lateral a `[0..1]` con `CLAMP_ADDRESSMODE`, se sumaron chapas de roce en joystick/botón y se alineó el póster `"GOOD METAL / BRIGHTER DAYS"`. |
| **Mundo y Sistema Folded 2.5D** | `src/folded.ts`, `src/folded_slice.ts`, `src/kit3d.ts`, `src/world.ts` | Activo por defecto (`FOLDED_SLICE = true`) | Banco `?folded` y escenas de menú: 8–9/10 | Criaturas, jefes, 8 autos RC, cajas, latas, herramientas, regadera, macetas (`potFold`), gnomos (`gnomeFold`), manguera, restos (`debris`) y mesa de taller (`benchBuild`) en Folded. Pendiente: rompibles del patio (`hitBreakables`, Fase C). |
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
- **Ciclo #3 (Aprobado e implementado 2026-10-09):** Propuesta 1 (Calidad Impeccable en Escenas de Menú y Gabinete Junket Crush: `showWorld(false)` en `startMatch3` eliminando las masas verdes laterales, UVs normalizados `[0..1]` y chapas de roce en el gabinete, lámpara/mesa/cajonera/transmisor Folded en `menuscene.ts`, póster `"GOOD METAL / BRIGHTER DAYS"` y limpieza de transiciones DOM).

### Ideas Descartadas o Congeladas (No volver a proponer sin nueva razón)
- **Economía compartida / tornillos en modos laterales:** Descartado explícitamente (2026-10-08).
- **Identidad de build en Supervivencia (`docs/SURVIVAL_BUILD_IDENTITY.md`):** Descartada (2026-10-06); sin sesgo dinámico de mazo por etiquetas.
- **Enemigos que temen el faro:** Descartado explícitamente.
- **Maldiciones:** Ocultas por ahora (código intacto, no reactivar sin decisión del usuario).
- **Iteraciones en modo Demolición:** Modo descontinuado en la evaluación del 2026-10-08 (`docs/VISUAL_QUALITY.md`).

---

## 3. Historial de Ciclos Completados

### Ciclo #1 (2026-10-08) — Calidad Visual, Integración Folded y Chatarroteca (`ece32c1`)
- **Alcance implementado:**
  - **Propuesta 1:** `beastIcon` (13 siluetas SVG en `src/icons.ts`), `#records` restringido a la pestaña `Estadísticas` en Chatarroteca, `#banner` superior compacto (`top: 10px`), `#hint` reducido a 7 s con `visibility: hidden`, `contactShadows()` por thin-instance (1 draw call, 0 allocs en `src/fx.ts`), tonos diferenciados de hormiga/escupidora/robot/patas y articulaciones en `foldLeg` y `petBody`.
  - **Propuesta 2:** Corrección de la casa de fondo (`house()` en `src/world.ts` con ladrillo `#9c5c46` y marcos oscuros para eliminar los rectángulos flotantes en el cielo), pórtico/rampas con `TRIM.hazard`, carteles de curva 3D, cajas `?` en `Rajdhani` y barreras/público Folded en `src/kart.ts`.
  - **Propuesta 3:** `potFold()` y `gnomeFold()` en `src/folded_slice.ts` + `src/world.ts`, y restos `debris()` en placas pintadas con tuerca de acero en `src/fx.ts`.
- **Evidencia de validación:** `tsc --noEmit`, `npm test` (46/46), `npm run build`, 75 capturas con `npm run shots` (0 errores de consola) y `npm run perf`.

### Ciclo #2 (2026-10-08) — Claridad en Partida: Cartas de Nivel, Sinergias y Pausa en Vivo (`b46c6a1`)
- **Alcance implementado (Propuesta 1):**
  - Ocultación automática de `#hint` y `#txl` cuando `#levelup` o `#fe` están abiertos (`src/hud.css`), eliminando el solapamiento traslúcido en Pausa y en Cartas de Nivel (`pc-partida-pausa.png`, `pc-partida-cartas.png`).
  - Indicador de sinergia de evolución/fusión (`.syn` y `.syn.on` en `src/weapons.ts`, `src/ui.ts`, `src/style.css`, `src/kit.css`) en todas las cartas de mejora tanto en PC como en celular vertical (`cel-partida-cartas.png`), mostrando el ícono de la contraparte y destacando `"Par listo · ..."` cuando ya está en el inventario.
  - Desglose de daño en vivo y porcentaje por arma en la columna `ARMAS` de Pausa (`#kitW` con barra proporcional `--w-pct` y fila `Daño total` en `PARTIDA`).
- **Evidencia de validación:** `tsc --noEmit`, `npm test` (46/46), `npm run build`, `npm run shots -- --only partida` (5 capturas verificadas visualmente) y `graphify update .`.

### Ciclo #3 (2026-10-09) — Escenas de Menú Folded, Gabinete Junket Crush y Limpieza DOM
- **Alcance implementado (Propuesta 1):**
  - Despeje completo del cuarto de ladrillo en Junket Crush (`showWorld(false)` en `startMatch3` de `src/match3.ts` y en `worldTask` de `src/main.ts` cuando `state === "menu" || state === "match3"`), eliminando las dos masas verdes de follaje del patio que se colaban detrás del gabinete.
  - Normalización del UV planar lateral del gabinete (`src/match3_scene.ts`) al rango `[0..1]` con `CLAMP_ADDRESSMODE` para situar el óxido de borde en los cantos, esquinas y base reales, más chapas de desgaste (`rust`) bajo el joystick y el botón rojo.
  - Migración de `benchBuild()` y `transmitter()` en `src/menuscene.ts` a materiales `wornMat` Folded 2.5D (lámpara articulada de chapa con campana facetada y foco interior sin atravesar el cono, cajonera industrial 3×3, mesa con canto de chapa plegada y transmisor RC).
  - Alineación del póster `"GOOD METAL / BRIGHTER DAYS"` en `src/kit3d.ts:138` y resolución de los antipatrones DOM (`#overPhotoImg` con GIF 1×1 válido en `index.html`, eliminación de `transition: width` en `src/hud.css` y transición en compositor `transform: translateX(26px)` para `.jm-sw::after` en `src/kit.css`).
- **Evidencia de validación:** `tsc --noEmit`, `npm test` (46/46), `npm run build`, `npm run shots -- --only menu,match3` (56 capturas verificadas en PC y celular) y `graphify update .`.

---

## 4. Backlog Vivo de Oportunidades — Ciclo #4

### A. Lente de Producto y Experiencia (UX/UI): Claridad en Garaje y Taller 720p
1. **Cifras Reales y Sinergias en Garaje + Grilla sin Huérfanas y Contraste en Taller (`src/menu.ts`, `src/menu.css`, `src/kit.css`):**
   - En **Garaje (`pc-menu-garaje.png`)**, acompañar las barras de `Carrocería`, `Velocidad` y `Embestida` de cada auto con sus cifras reales (`160`, `54 km/h`, `×1.0`) y mostrar en la pestaña `ARMA` inicial con qué pasiva evoluciona cada arma (conectando la preparación del auto con el sello `.syn` de partida).
   - En **Taller (`pc-menu-taller.png`)**, mejorar la legibilidad de las tarjetas cuando no alcanzan los tornillos (mantener título, ícono y descripción nítidos y atenuar solo el precio) y ajustar la grilla de `CHASIS` (9 ítems: 3×3 en vez de 4+4+1) para eliminar la 3ª fila huérfana que aprieta `#shopPreview` y `VOLVER` contra el borde inferior en 1280×720.

### B. Lente de Integración Folded (Fase C) y Cobertura Visual de Cierre
2. **Rompibles del Patio y Podio en Piezas Folded + Escenario Headless de Cierre (`src/world.ts`, `src/kart.ts`, `scripts/scenarios.mjs`):**
   - Completar la Fase C de `docs/ASSET_INVENTORY.md`: hacer que las estructuras rompibles del patio (`hitBreakables` en `src/world.ts`) y el podio de Carrera (`buildPodium` en `src/kart.ts`) usen piezas y colapso Folded (`foldBox`, `TRIM.hazard`, placas y tuercas).
   - Resolver la deuda `// ponytail: shot de resultados/outro pendiente` en `scripts/scenarios.mjs:164` agregando el escenario determinista de cierre (`outro` con foto Polaroid y pantalla `#scr-over` de resultados).

### C. Lente de Arquitectura y Rendimiento: Poda de Cargadores GLB Obsoletos y Carga Perezosa
3. **Eliminación del Chunk GLB Obsoleto (`542 kB`) y Carga Perezosa de Carrera (`src/models.ts`, `src/car.ts`, `src/main.ts`):**
   - Con `FOLDED_SLICE = true` como dirección de arte definitiva, todos los bichos, jefes y autos se construyen proceduralmente en Folded 2.5D (`enemyFold`, `carFold`), pero `loadGlbs` y `loadCarGlbs` siguen importando `@babylonjs/loaders/glTF` (generando un chunk de `542 kB` y corriendo tareas de precarga innecesarias), y `kart.ts` se importa estáticamente en el arranque (`menu.js` de `930 kB`).
   - Cortocircuitar/desacoplar la carga de GLBs cuando `FOLDED_SLICE` está activo y evaluar separar `kart.ts` bajo demanda reduce drásticamente el peso del bundle y acelera el arranque en web y celular.

---

## 5. Checkpoint de Sesión Actual

- **Último trabajo completado:** Implementación y validación visual de la **Propuesta 1 del Ciclo #3** (despeje de las masas verdes del patio detrás del gabinete en Junket Crush con `showWorld(false)`, UVs normalizados `[0..1]` y chapas de roce en el gabinete, lámpara/mesa/cajonera/transmisor Folded en `menuscene.ts`, póster `"GOOD METAL / BRIGHTER DAYS"` y limpieza de antipatrones DOM).
- **Estado de validación:** `npx tsc --noEmit -p .`, `npm test` (46/46), `npm run build`, `npm run shots -- --only menu,match3` (56 capturas verificadas visualmente) y `graphify update .` completados sin errores.
- **Lente activa del Ciclo #4:** *Experiencia en Garaje/Taller (Cifras + Sinergias + Grilla 720p), Integración Fase C + Automatización (`hitBreakables`, Podio y Escenario `over`/`outro`) y Arquitectura/Rendimiento de Carga (Poda del chunk GLB de 542 kB)*.
- **Propuestas activas para decisión del usuario (Ciclo #4):**
  1. *(Recomendada)* **Claridad y Encuadre en Garaje y Taller 720p** (cifras reales en barras de autos + sinergia de evolución en `ARMA` inicial en Garaje; grilla 3×3 sin fila huérfana para `CHASIS` y mejor contraste sin saldo en Taller).
  2. **Fase C del Patio y Cobertura de Cierre (`hitBreakables`, Podio y Escenario `over`/`outro`)** (rompibles y podio Folded + resolución del `ponytail:` en `scripts/scenarios.mjs:164`).
  3. **Simplificación y Rendimiento de Arranque (Poda de Cargadores GLB con `FOLDED_SLICE`)** (evitar descargar/ejecutar `@babylonjs/loaders/glTF` de 542 kB cuando `FOLDED_SLICE = true`).
- **Próxima decisión necesaria:** Selección del usuario sobre cómo avanzar en el Ciclo #4.


