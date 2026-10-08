# Junked Metal — Registro Persistente de Evolución de Producto

**Metodología activa:** `EXPLORE → UNDERSTAND → DISCOVER → IMAGINE → PROPOSE → DISCUSS → DECIDE → IMPLEMENT → VALIDATE → REFINE → DOCUMENT → LEARN → NEW DISCOVERY ↺`  
**Última actualización:** 2026-10-08

Este documento conserva la inteligencia acumulada del producto entre ciclos y sesiones: estado actual de cada módulo, evaluaciones de calidad, decisiones aprobadas, ideas descartadas o pospuestas, backlog vivo de oportunidades y el checkpoint de continuidad.

---

## 1. Fichas de Estado por Módulo y Superficie

| Módulo / Modo | Archivos clave | Estado actual | Calidad Visual / Técnica | Notas clave |
|---|---|---|---|---|
| **Supervivencia (Core)** | `src/main.ts`, `src/enemies.ts`, `src/weapons.ts`, `src/run.ts`, `src/folded_slice.ts` | Producción activa | Partida: 3–5/10 visual (`VISUAL_QUALITY.md`) · Perf PC: ~142–254 draws (`~6–8 ms`) | Ritmo lento 0–3 min (`xp_temprana_mult` 0.78), gomita 3 golpes a hormiga, salto con coyote, segunda barra en jefes finales. Oportunidad alta en composición HUD/tutorial y diferenciación de luz/tonos en partida. |
| **HUD y Menús (`kit.css`)** | `src/kit.css`, `src/ui.ts`, `src/menu.ts`, `src/menu.css`, `src/hud.css` | Producción activa | Portada: 7–8/10 · Principal/Garaje: 5–8/10 · Bestiario: 4–6/10 | Unificado en chapa oscura con borde naranja (`--jm-*`, `Rajdhani`). Zonas táctiles reservadas en celular (`9fe140f`). Chatarroteca (`#scr-bestiary`) tiene corte vertical por `#records` fijo y miniaturas `.bthumb` sin conectar. |
| **Carrera y Batalla (`kart.ts`)** | `src/kart.ts`, `src/race.css` | En desarrollo paralelo | Largada/Curso: 3–7/10 (`VISUAL_QUALITY.md`) · Perf 2J: 447 draws | Copa de 3 pistas, 10 corredores IA, derrape con mini-turbo, pantalla dividida 2J en PC (forzado a 1J en táctil). Desentona visualmente con Folded (sin post retro ni materiales `FOLD` en pista/tribunas/cielo). |
| **Junket Crush (`match3`)** | `src/match3*.ts`, `src/match3.css` | Producción activa (carga perezosa) | Juego: 7–8/10 (mejor integración Folded) · Gabinete: 5–8/10 · Perf: 77 draws | Campaña de 10 niveles con mapa, estrellas, herramientas y bot de balance (`match3_balance.test.ts`). Guardado propio en `save.m3`. |
| **Mundo y Sistema Folded 2.5D** | `src/folded.ts`, `src/folded_slice.ts`, `src/kit3d.ts`, `src/world.ts` | Activo por defecto (`FOLDED_SLICE = true`) | Banco `?folded`: 7–8/10 | Criaturas, jefes, 8 autos RC y cajas/latas/herramientas migrados a Folded. Pendientes en `world.ts`/`fx.ts`: macetas, gnomos, pelota, manguera, rompibles en placas, restos de `fx.ts`. |
| **Demolición (`duel`)** | `src/duel*.ts`, `src/duel*.css` | Pausado / Descontinuado (2026-10-08) | Fuera de iteración activa | Carga perezosa (`loadDuel()`). No priorizar salvo pedido explícito del usuario. |

---

## 2. Decisiones Aprobadas vs. Ideas Descartadas (No Reabrir)

### Decisiones Aprobadas (Invariantes)
- **Dirección de arte vigente (2026-10-08):** Día estilo Megabonk + mundo Folded 2.5D (chatarra industrial plegada con volumen 360°) + UI de paneles de chapa oscura opaca con borde naranja gastado (`--jm-*`, `Rajdhani`).
- **Aislamiento económico de modos laterales:** Carrera, Junket Crush y Demolición **no dan tornillos ni logros** de Supervivencia.
- **Pantalla dividida 2J:** Exclusiva de escritorio (PC); nunca en teléfono/táctil.
- **Ritmo de Supervivencia:** 10 minutos clásicos con rampa temprana más contenida (0–180 s) para dar peso a las mejoras del garaje/taller sin trivializar el late-game.
- **Logros con recompensa única:** Cada logro entrega su propia pieza o premio sin duplicados (`9f4def2`).

### Ideas Descartadas o Congeladas (No volver a proponer sin nueva razón)
- **Economía compartida / tornillos en modos laterales:** Descartado explícitamente (2026-10-08).
- **Identidad de build en Supervivencia (`docs/SURVIVAL_BUILD_IDENTITY.md`):** Descartada (2026-10-06); sin sesgo dinámico de mazo por etiquetas.
- **Enemigos que temen el faro:** Descartado explícitamente.
- **Maldiciones:** Ocultas por ahora (código intacto, no reactivar sin decisión del usuario).
- **Iteraciones en modo Demolición:** Modo descontinuado en la evaluación del 2026-10-08 (`docs/VISUAL_QUALITY.md`).

---

## 3. Backlog Vivo de Oportunidades (Por Lente de Descubrimiento)

### A. Lente de Calidad e Integración Visual (`docs/VISUAL_QUALITY.md` / Impeccable)
1. **Unificación Folded y Postproceso en Modo Carrera (`src/kart.ts`):**
   - Aplicar el pipeline visual vigente (materiales `FOLD`, bordes `TRIM.hazard`, siluetas de fondo coherentes con el patio, eliminación de bloques flotantes y niebla lechosa) para subir Carrera de 3–4/10 al estándar de Junket Crush (7–8/10).
2. **Pulido de Chatarroteca / Bestiario (`src/menu.ts`, `src/menu.css`, `index.html`):**
   - Mover la tabla `#records` (*Mejores partidas*) exclusivamente a la pestaña `Estadísticas` para liberar el alto completo en `Bichos`, `Pilotos` y `Logros`, evitar el recorte de tarjetas y descripciones, y activar las miniaturas `.bthumb` en cada ficha.
3. **Composición, Legibilidad y Luz en Partida de Supervivencia (`src/ui.ts`, `src/main.ts`, `src/folded_slice.ts`):**
   - Auto-ocultar el tutorial inicial tras los primeros segundos o al moverse, compactar el aviso de radio en PC para no tapar el centro de acción, sumar sombra de contacto económica por instancia y diferenciar mejor los tonos base entre hormiga, escupidora, escarabajo y fricción.

### B. Lente de Experiencia y Producto
4. **Completar Props Cercanos Folded y Rompibles en Placas (`src/world.ts`, `src/fx.ts`):**
   - Migrar macetas, gnomos, manguera y restos (`debris`) al kit modular Folded (`geoKit`) para que romper objetos del patio escupa placas, remaches y fragmentos coherentes con los enemigos.
5. **pulido de Gabinete Junket Crush y Antipatrones DOM (`src/match3_scene.ts`, `src/kit.css`):**
   - Corregir el desgaste uniforme del mueble arcade y los detalles pendientes detectados por Impeccable (`side-tab`, `layout-transition` en barras de progreso).

---

## 4. Checkpoint de SesiónActual

- **Último trabajo completado:** Integración permanente del *Autonomous Product Evolution — Recursive Discovery Loop* en el harness de Antigravity (`GEMINI.md`, `.agents/rules/product-evolution-loop.md`, `.agents/skills/final-verification/SKILL.md`), alineación de `.agents/rules/art-and-copy-invariants.md` y `.agents/skills/frontend-design/` con la dirección de arte vigente del 2026-10-08 (`DESIGN.md` / `docs/ART_DIRECTION.md`), y creación de este registro persistente (`docs/PRODUCT_EVOLUTION.md`).
- **Estado de validación:** `npx tsc --noEmit -p .`, `npm test` y `npm run build` en verde; aislamiento de `.claude/` y `CLAUDE.md` preservado al 100 %.
- **Lente activa del ciclo #1:** *Calidad Visual, Integración Folded y Experiencia de Interfaz (UX/UI)*.
- **Propuestas presentadas al usuario:**
  1. *(Recomendada)* **Composición y Legibilidad en Supervivencia + Chatarroteca Impeccable** (tutorial auto-ocultable, radio sin tapar el centro en PC, sombras de contacto/tonos de plaga y arreglo integral del layout/miniaturas en Chatarroteca).
  2. **Integración Visual Folded 2.5D en Modo Carrera (`src/kart.ts`)** (materiales `FOLD`, iluminación/postproceso coherente, tribunas/vallas y siluetas del patio sin subir draw calls).
  3. **Destrucción y Utilería Folded en el Patio (`src/world.ts`, `src/fx.ts`)** (macetas, gnomos y restos `debris` en placas/tuercas con `geoKit`).
- **Próxima decisión necesaria:** Selección del usuario sobre cuál propuesta (o combinación) abordar en la siguiente tanda de construcción.
