# Junked Metal — Registro Persistente de Evolución de Producto

**Metodología activa:** `EXPLORE → UNDERSTAND → DISCOVER → IMAGINE → PROPOSE → DISCUSS → DECIDE → IMPLEMENT → VALIDATE → REFINE → DOCUMENT → LEARN → NEW DISCOVERY ↺`  
**Última actualización:** 2026-10-08 (Ciclos #1 y #2 completados y validados · Ciclo #3 iniciado)

Este documento conserva la inteligencia acumulada del producto entre ciclos y sesiones: estado actual de cada módulo, evaluaciones de calidad, decisiones aprobadas, ideas descartadas o pospuestas, backlog vivo de oportunidades y el checkpoint de continuidad.

---

## 1. Fichas de Estado por Módulo y Superficie

| Módulo / Modo | Archivos clave | Estado actual | Calidad Visual / Técnica | Notas clave |
|---|---|---|---|---|
| **Supervivencia (Core)** | `src/main.ts`, `src/enemies.ts`, `src/weapons.ts`, `src/run.ts`, `src/folded_slice.ts`, `src/fx.ts` | Producción activa | Partida, Cartas y Pausa refinadas en Ciclos #1–#2 · Perf PC: `lab-noche` 189 draws (`6.2 ms`), `partida_llena` 205 draws (`8.9 ms`) | Aviso `#banner` arriba (`10px`), tutorial auto-oculto a los 7 s, sombras de contacto en 1 draw call, sinergia de evolución/fusión `.syn` en cartas de nivel y daño en vivo por arma en Pausa. |
| **HUD y Menús (`kit.css`)** | `src/kit.css`, `src/ui.ts`, `src/menu.ts`, `src/menu.css`, `src/hud.css`, `src/icons.ts` | Producción activa | Portada/Chatarroteca/Cartas/Pausa: 8/10 · Garaje/Taller: 6–7/10 | Eliminados los solapamientos de `#hint` y `#txl` en `#levelup` y `#scr-pause`. Oportunidad en Ciclo #3: lámpara/mesa Folded en `menuscene.ts`, números y sinergias en Garaje y grilla/contraste en Taller. |
| **Carrera y Batalla (`kart.ts`)** | `src/kart.ts`, `src/race.css`, `src/world.ts` | Producción activa | Largada/Curso unificados con Folded · Perf PC: `largada` 249 draws (`7.6 ms`), `curso` 293 draws (`6.6 ms`) | Casa del fondo en ladrillo cálido (`brick`), pórtico/rampas con `TRIM.hazard`, cartel `START` y cajas `?` en `Rajdhani`, vallas/tribunas en `FOLD`. Pendiente menor: podio (`buildPodium`) en `foldBox`. |
| **Junket Crush (`match3`)** | `src/match3*.ts`, `src/match3.css` | Producción activa (carga perezosa) | Juego: 7–8/10 · Gabinete: 5–8/10 · Perf: 77 draws | Campaña de 10 niveles con mapa, estrellas y herramientas. En `pc-match3-gabinete.png` dos masas verdes laterales tapan los bordes del gabinete (`match3_scene.ts`) y el desgaste del mueble es uniforme. |
| **Mundo y Sistema Folded 2.5D** | `src/folded.ts`, `src/folded_slice.ts`, `src/kit3d.ts`, `src/world.ts` | Activo por defecto (`FOLDED_SLICE = true`) | Banco `?folded`: 7–8/10 | Criaturas, jefes, 8 autos RC, cajas, latas, herramientas, regadera, macetas (`potFold`), gnomos (`gnomeFold`), manguera y restos (`debris`) en Folded. Pendientes: lámpara/mesa de `menuscene.ts`, póster en inglés (`kit3d.ts:138`) y rompibles (`hitBreakables`, Fase C). |
| **Demolición (`duel`)** | `src/duel*.ts`, `src/duel*.css` | Pausado / Descontinuado (2026-10-08) | Fuera de iteración activa | Carga perezosa (`loadDuel()`). No priorizar salvo pedido explícito del usuario. |

---

## 2. Decisiones Aprobadas vs. Ideas Descartadas (No Reabrir)

### Decisiones Aprobadas (Invariantes)
- **Dirección de arte vigente (2026-10-08):** Día estilo Megabonk + mundo Folded 2.5D (chatarra industrial plegada con volumen 360°) + UI de paneles de chapa oscura opaca con borde naranja gastado (`--jm-*`, `Rajdhani`).
- **Aislamiento económico de modos laterales:** Carrera, Junket Crush y Demolición **no dan tornillos ni logros** de Supervivencia.
- **Pantalla dividida 2J:** Exclusiva de escritorio (PC); nunca en teléfono/táctil.
- **Ritmo de Supervivencia:** 10 minutos clásicos con rampa temprana más contenida (0–180 s) para dar peso a las mejoras del garaje/taller sin trivializar el late-game.
- **Logros con recompensa única:** Cada logro entrega su propia pieza o premio sin duplicados (`9f4def2`).
- **Ciclo #1 (Aprobado e implementado 2026-10-08):** Ejecución conjunta de las 3 propuestas (1: Composición en Supervivencia + Chatarroteca con `beastIcon`; 2: Carrera Folded + fachada de ladrillo de la casa; 3: Macetas, gnomos y restos `debris` Folded).
- **Ciclo #2 (Aprobado e implementado 2026-10-08):** Propuesta 1 (Claridad en Partida: Cartas de Nivel sin solapar `#txl`, indicador de sinergia de evolución/fusión `.syn` en PC y celular, y Pausa sin `#hint` traslúcido + daño en vivo por arma).

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

### Ciclo #2 (2026-10-08) — Claridad en Partida: Cartas de Nivel, Sinergias y Pausa en Vivo
- **Alcance implementado (Propuesta 1):**
  - Ocultación automática de `#hint` y `#txl` cuando `#levelup` o `#fe` están abiertos (`src/hud.css`), eliminando el solapamiento traslúcido en Pausa y en Cartas de Nivel (`pc-partida-pausa.png`, `pc-partida-cartas.png`).
  - Indicador de sinergia de evolución/fusión (`.syn` y `.syn.on` en `src/weapons.ts`, `src/ui.ts`, `src/style.css`, `src/kit.css`) en todas las cartas de mejora tanto en PC como en celular vertical (`cel-partida-cartas.png`), mostrando el ícono de la contraparte y destacando `"Par listo · ..."` cuando ya está en el inventario.
  - Desglose de daño en vivo y porcentaje por arma en la columna `ARMAS` de Pausa (`#kitW` con barra proporcional `--w-pct` y fila `Daño total` en `PARTIDA`).
- **Evidencia de validación:** `tsc --noEmit`, `npm test` (46/46), `npm run build`, `npm run shots -- --only partida` (5 capturas verificadas visualmente) y `graphify update .`.

---

## 4. Backlog Vivo de Oportunidades — Ciclo #3

### A. Lente de Calidad Impeccable: Gabinete Junket Crush, Mesa de Menú Folded y Limpieza DOM
1. **Encuadre del Gabinete Junket Crush, Lámpara/Mesa Folded en Menú y Pósters en Inglés (`src/match3_scene.ts`, `src/menuscene.ts`, `src/kit3d.ts`, `src/kit.css`, `src/menu.css`, `src/hud.css`):**
   - En `pc-match3-gabinete.png`, despejar las dos masas verdes laterales que tapan los tercios izquierdo y derecho del encuadre del gabinete arcade en `src/match3_scene.ts` y localizar el desgaste del mueble en cantos/zona de monedas (observación #5 de `docs/VISUAL_QUALITY.md`).
   - En `pc-menu-garaje.png` y `pc-menu-taller.png`, migrar la lámpara articulada de escritorio (hoy en plástico celeste liso con la bombilla atravesando la pantalla cónica) y accesorios de `src/menuscene.ts` a materiales y uniones Folded (`FOLD.painted`, `FOLD.bare`, `FOLD.rust`).
   - Corregir el póster en español de `src/kit3d.ts:138` para que todos los carteles del mundo 3D estén 100% en inglés (`ART_DIRECTION.md`).
   - Limpiar los hallazgos mecánicos pendientes del detector Impeccable (`side-tab`, `border-accent-on-rounded`, `layout-transition` y `src=""` inicial).

### B. Lente de Producto y Experiencia en Garaje y Taller
2. **Claridad Numérica y Sinergias en Garaje + Grilla y Contraste en Taller (`src/menu.ts`, `src/menu.css`, `src/kit.css`):**
   - En **Garaje (`pc-menu-garaje.png`)**, acompañar las barras de `Carrocería`, `Velocidad` y `Embestida` de cada auto con sus cifras reales (`160`, `54 km/h`, `x3`) y mostrar en la pestaña `ARMA` inicial con qué pasiva evoluciona cada arma (conectando la preparación con el nuevo sello `.syn` de partida).
   - En **Taller (`pc-menu-taller.png`)**, mejorar la legibilidad de las tarjetas cuando no alcanzan los tornillos (mantener título e ícono nítidos y atenuar solo el botón/precio) y compactar la grilla de `CHASIS` (9 ítems) para que no deje una tarjeta huérfana en 3ª fila apretando `#shopPreview` y `VOLVER` contra el borde inferior en 1280×720.

### C. Lente de Integración Folded (Fase C) y Automatización de Cierre
3. **Rompibles del Patio y Podio en Piezas Folded + Escenario Headless de Cierre (`src/world.ts`, `src/kart.ts`, `scripts/scenarios.mjs`):**
   - Completar la Fase C de `docs/ASSET_INVENTORY.md`: hacer que las estructuras rompibles del patio (`hitBreakables` en `src/world.ts`) y el podio de Carrera (`buildPodium` en `src/kart.ts`) usen piezas y colapso Folded (`foldBox`, placas y tuercas).
   - Resolver la deuda `// ponytail: shot de resultados/outro pendiente` en `scripts/scenarios.mjs:164` agregando el escenario determinista de cierre (`outro` con Polaroid y pantalla `#scr-over` de resultados).

---

## 5. Checkpoint de Sesión Actual

- **Último trabajo completado:** Implementación y validación visual de la **Propuesta 1 del Ciclo #2** (Cartas de Nivel sin solapar `#txl`, sello de sinergia de evolución/fusión `.syn` en PC y celular, y Pausa sin `#hint` traslúcido + daño en vivo por arma).
- **Estado de validación:** `npx tsc --noEmit -p .`, `npm test` (46/46), `npm run build`, `npm run shots -- --only partida` (5 capturas inspeccionadas visualmente) y `graphify update .` completados sin errores.
- **Lente activa del Ciclo #3:** *Calidad Impeccable 3D/DOM (Gabinete Junket Crush + Mesa de Menú Folded), Experiencia en Garaje/Taller (Cifras + Sinergias + Grilla 720p) e Integración Fase C + Automatización (`hitBreakables`, Podio y Escenario `over`/`outro`)*.
- **Propuestas activas para decisión del usuario (Ciclo #3):**
  1. *(Recomendada)* **Calidad Impeccable en Escenas de Menú y Gabinete Junket Crush** (quitar las masas verdes laterales de `match3_scene.ts`, migrar la lámpara/mesa de `menuscene.ts` a Folded 2.5D, póster en inglés en `kit3d.ts` y limpieza de antipatrones DOM).
  2. **Claridad y Encuadre en Garaje y Taller** (cifras reales en barras de autos + sinergia de evolución en `ARMA` de partida en Garaje; mejor contraste sin saldo y grilla compacta sin fila huérfana en Taller 720p).
  3. **Fase C del Patio y Cobertura de Cierre (`hitBreakables`, Podio y Escenario `over`/`outro`)** (rompibles y podio Folded + resolución del `ponytail:` en `scripts/scenarios.mjs:164`).
- **Próxima decisión necesaria:** Selección del usuario sobre cómo avanzar en el Ciclo #3.

