# Junked Metal — Registro Persistente de Evolución de Producto

**Metodología activa:** `EXPLORE → UNDERSTAND → DISCOVER → IMAGINE → PROPOSE → DISCUSS → DECIDE → IMPLEMENT → VALIDATE → REFINE → DOCUMENT → LEARN → NEW DISCOVERY ↺`  
**Última actualización:** 2026-10-08 (Ciclo #1 completado y validado · Ciclo #2 iniciado)

Este documento conserva la inteligencia acumulada del producto entre ciclos y sesiones: estado actual de cada módulo, evaluaciones de calidad, decisiones aprobadas, ideas descartadas o pospuestas, backlog vivo de oportunidades y el checkpoint de continuidad.

---

## 1. Fichas de Estado por Módulo y Superficie

| Módulo / Modo | Archivos clave | Estado actual | Calidad Visual / Técnica | Notas clave |
|---|---|---|---|---|
| **Supervivencia (Core)** | `src/main.ts`, `src/enemies.ts`, `src/weapons.ts`, `src/run.ts`, `src/folded_slice.ts`, `src/fx.ts` | Producción activa | Partida y Lab mejorados en Ciclo #1 · Perf PC: `lab-noche` 189 draws (`6.2 ms`), `partida_llena` 205 draws (`8.9 ms`) | Aviso `#banner` anclado arriba (`10px`), tutorial auto-oculto a los 7 s, sombras de contacto en 1 draw call (`contactShadows`), tonos diferenciados por plaga y bisagras en jefes (`foldLeg`, `petBody`). Oportunidad detectada en Ciclo #2: solapamiento en `#levelup` y `#scr-pause` + sinergias/daño en vivo. |
| **HUD y Menús (`kit.css`)** | `src/kit.css`, `src/ui.ts`, `src/menu.ts`, `src/menu.css`, `src/hud.css`, `src/icons.ts` | Producción activa | Portada: 7–8/10 · Chatarroteca: 7–8/10 (subió de 4–6/10) | Chatarroteca muestra `#records` solo en `Estadísticas`, entra entera en 1280x720 y tiene 13 siluetas SVG (`beastIcon`). Oportunidad en Ciclo #2: limpiar solapamientos de `#hint` en Pausa y de `.cards` sobre `#bar` en Cartas de Nivel, más los antipatrones DOM de Impeccable. |
| **Carrera y Batalla (`kart.ts`)** | `src/kart.ts`, `src/race.css`, `src/world.ts` | Producción activa | Largada/Curso unificados con Folded · Perf PC: `largada` 249 draws (`7.6 ms`), `curso` 293 draws (`6.6 ms`) | Casa del fondo corregida en ladrillo cálido (`brick`, sin bloques flotantes en el cielo), pórtico/rampas con `TRIM.hazard`, cartel `START` y cajas `?` en `Rajdhani`, vallas/tribunas en `FOLD.painted`/`FOLD.rust`. Pendiente menor: podio (`buildPodium`) en `foldBox`. |
| **Junket Crush (`match3`)** | `src/match3*.ts`, `src/match3.css` | Producción activa (carga perezosa) | Juego: 7–8/10 · Gabinete: 5–8/10 · Perf: 77 draws | Campaña de 10 niveles con mapa, estrellas y herramientas. Pendiente en gabinete (`match3_scene.ts`): desgaste uniforme y dos parches verdes laterales detectados en `VISUAL_QUALITY.md`. |
| **Mundo y Sistema Folded 2.5D** | `src/folded.ts`, `src/folded_slice.ts`, `src/kit3d.ts`, `src/world.ts` | Activo por defecto (`FOLDED_SLICE = true`) | Banco `?folded`: 7–8/10 | Criaturas, jefes, 8 autos RC, cajas, latas, herramientas, regadera, macetas (`potFold`), gnomos (`gnomeFold`), manguera y restos (`debris` con placa + tuerca) migrados a Folded. Pendientes: rompibles en piezas (`hitBreakables`, fase C), taller del menú (`menuscene.ts`) y póster bilingüe (`kit3d.ts:138`). |
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

### Ideas Descartadas o Congeladas (No volver a proponer sin nueva razón)
- **Economía compartida / tornillos en modos laterales:** Descartado explícitamente (2026-10-08).
- **Identidad de build en Supervivencia (`docs/SURVIVAL_BUILD_IDENTITY.md`):** Descartada (2026-10-06); sin sesgo dinámico de mazo por etiquetas.
- **Enemigos que temen el faro:** Descartado explícitamente.
- **Maldiciones:** Ocultas por ahora (código intacto, no reactivar sin decisión del usuario).
- **Iteraciones en modo Demolición:** Modo descontinuado en la evaluación del 2026-10-08 (`docs/VISUAL_QUALITY.md`).

---

## 3. Historial de Ciclos Completados

### Ciclo #1 (2026-10-08) — Calidad Visual, Integración Folded y Chatarroteca
- **Alcance implementado:**
  - **Propuesta 1:** `beastIcon` (13 siluetas SVG en `src/icons.ts`), `#records` restringido a la pestaña `Estadísticas` en Chatarroteca, `#banner` superior compacto (`top: 10px`), `#hint` reducido a 7 s con `visibility: hidden`, `contactShadows()` por thin-instance (1 draw call, 0 allocs en `src/fx.ts`), tonos diferenciados de hormiga/escupidora/robot/patas y articulaciones en `foldLeg` y `petBody`.
  - **Propuesta 2:** Corrección de la casa de fondo (`house()` en `src/world.ts` con ladrillo `#9c5c46` y marcos oscuros para eliminar los rectángulos flotantes en el cielo), pórtico/rampas con `TRIM.hazard`, carteles de curva 3D, cajas `?` en `Rajdhani` y barreras/público Folded en `src/kart.ts`.
  - **Propuesta 3:** `potFold()` y `gnomeFold()` en `src/folded_slice.ts` + `src/world.ts`, y restos `debris()` en placas pintadas con tuerca de acero en `src/fx.ts`.
- **Evidencia de validación:** `tsc --noEmit`, `npm test` (46/46), `npm run build`, 75 capturas con `npm run shots` (0 errores de consola) y `npm run perf` (`lab-noche` 6.2 ms / 189 draws, `partida_llena` 8.9 ms / 205 draws, `carrera-curso` 6.6 ms / 293 draws).

---

## 4. Backlog Vivo de Oportunidades — Ciclo #2

### A. Lente de Experiencia y Claridad en Partida (UX/UI)
1. **Cartas de Nivel, Sinergias de Evolución y Pantalla de Pausa (`src/ui.ts`, `src/menu.ts`, `src/hud.css`, `src/menu.css`):**
   - Ocultar `#hint` cuando se abre `#scr-pause` o `#levelup` (hoy en `pc-partida-pausa.png` el cuadro de controles se trasluce detrás de los botones de pausa y pisa el pie de texto).
   - Ajustar el espaciado vertical de `#levelup` y `.cards` (u ocultar/atenuar `#bar` durante la elección de cartas) para que las 3 cartas y la leyenda `"1 · 2 · 3 o clic — Enter confirma"` no pisen la barra de vida `12.6V` (`pc-partida-cartas.png`).
   - Mostrar en cada carta de mejora el indicador de **sinergia de evolución** (qué pasiva evoluciona el arma o qué arma evoluciona la pasiva, resaltado si el jugador ya la posee en la partida) y sumar en la columna `ARMAS` de Pausa el daño acumulado / porcentaje de aporte en vivo.

### B. Lente de Calidad e Impeccable (Escenas de Menú y DOM)
2. **Gabinete Junket Crush, Mesa del Taller Folded y Limpieza Impeccable (`src/match3_scene.ts`, `src/menuscene.ts`, `src/kit3d.ts`, `src/kit.css`):**
   - Corregir el póster bilingüe en `src/kit3d.ts:138` (todo cartel 3D del mundo en inglés, nunca mezclando idiomas).
   - Refinar el desgaste y los laterales del gabinete en `src/match3_scene.ts` (observación #5 de `docs/VISUAL_QUALITY.md`).
   - Llevar los materiales de la mesa del menú (`src/menuscene.ts`: lámpara, lupa, estantes, banco) al lenguaje Folded (`FOLD.painted`, `FOLD.bare`, `FOLD.rust`) para que no contrasten como plástico liso frente a los autos RC.
   - Resolver los hallazgos mecánicos pendientes de Impeccable (`side-tab`, `border-accent-on-rounded`, `layout-transition` y `src=""` inicial).

### C. Lente de Integración y Automatización (Patio Fase C + Cobertura de Cierre)
3. **Rompibles del Patio en Piezas Folded + Escenario Headless de Cierre (`src/world.ts`, `src/kart.ts`, `scripts/scenarios.mjs`):**
   - Completar la Fase C de `docs/ASSET_INVENTORY.md`: hacer que las estructuras rompibles del patio (`hitBreakables`) y el podio de Carrera (`buildPodium`) usen piezas y colapso Folded (`foldBox`, placas y tuercas).
   - Resolver la deuda `// ponytail: shot de resultados/outro pendiente` en `scripts/scenarios.mjs:164` agregando el escenario determinista de cierre (`outro` con Polaroid y pantalla `#scr-over` de resultados).

---

## 5. Checkpoint de Sesión Actual

- **Último trabajo completado:** Implementación y validación completa de las 3 propuestas del Ciclo #1 (Supervivencia + Chatarroteca con `beastIcon`, Modo Carrera Folded + fachada de ladrillo de la casa, y utilería/restos Folded `potFold`, `gnomeFold`, `debris`).
- **Estado de validación:** `npx tsc --noEmit -p .`, `npm test`, `npm run build`, `npm run shots` (75 capturas inspeccionadas), `npm run perf` y `graphify update .` completados sin errores.
- **Lente activa del Ciclo #2:** *Experiencia en Partida (Cartas/Pausa/Sinergias), Calidad Impeccable (Gabinete/Menú 3D/DOM) e Integración/Automatización (Rompibles Fase C + Escenario `over`)*.
- **Propuestas activas para decisión del usuario (Ciclo #2):**
  1. *(Recomendada)* **Claridad en Partida: Cartas de Nivel, Indicador de Evolución y Pantalla de Pausa** (`#levelup` y `#scr-pause` sin solapamientos, sinergias de evolución en las cartas y daño en vivo en Pausa).
  2. **Calidad Impeccable: Gabinete Junket Crush, Mesa de Menú Folded y Antipatrones DOM** (`kit3d.ts` pósters en inglés, gabinete `match3_scene.ts`, utilería de `menuscene.ts` en `FOLD` y limpieza DOM de Impeccable).
  3. **Fase C del Patio y Cobertura de Cierre (`hitBreakables`, Podio y Escenario `over`/`outro`)** (rompibles y podio Folded + resolución del `ponytail:` en `scripts/scenarios.mjs:164` para capturar Polaroid y pantalla de resultados).
- **Próxima decisión necesaria:** Selección del usuario sobre cómo avanzar en el Ciclo #2.
