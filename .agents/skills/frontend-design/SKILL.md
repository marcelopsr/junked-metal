---
name: frontend-design
description: >-
  Guides UI/UX design, HUD telemetry, menus, Junket Crush arcade cabinet UI, custom
  SVG icons, Folded 2.5D sheet-metal aesthetic, and responsive CSS for Junked Metal
  while preventing generic AI aesthetics. Activate this skill whenever creating,
  styling, or refining HTML/DOM/CSS interfaces in index.html, src/*.css, src/ui.ts,
  src/menu.ts, src/icons.ts, src/kit3d.ts, or src/match3*.ts. Do not activate for
  pure physics, balance, or headless script tasks.
---

# Frontend Design — Identidad Visual Junked Metal (Vigente 2026-10-08)

*Anclado a `docs/ART_DIRECTION.md`, `DESIGN.md`, `PRODUCT.md` y la rúbrica de `docs/VISUAL_QUALITY.md`.*

**Nivel de razonamiento recomendado:** `Gemini Flash — Low` para ajustes puntuales de CSS; `Gemini Flash — Medium` para componentes, pantallas nuevas, animaciones y responsive PC/celular.

## 1. Regla Cero: Un Solo Lenguaje Visual de Taller y Chapa Plegada
Consulta [references/tokens-and-surfaces.md](./references/tokens-and-surfaces.md) para los tokens `--jm-*` exactos (`src/kit.css` y `PAL` en `src/kit3d.ts`):

1. **Sistema Unificado de Chapa Oscura (`src/kit.css`, `src/ui.ts`, `src/menu.ts`):**
   - `src/kit.css` se carga al final y gobierna todas las superficies (HUD, cartas, menús, diálogos).
   - **Paneles:** Chapa oscura opaca (`~0.96`) con borde naranja gastado de 3 px (`--jm-chapa: #b5651d`), remaches/tornillos en las esquinas y barras rectas sin esquinas redondeadas tipo píldora.
   - **Tipografía:** `Rajdhani` (`@fontsource/rajdhani`) en toda la interfaz (700 en mayúsculas para títulos/labels, 500 para cuerpo).
   - **Botones y Estados:** Primario en verde (`--jm-verde`), advertencia/pestaña activa en amarillo (`--jm-amarillo`), peligro en rojo (`--jm-rojo`), foco de teclado/gamepad/mouse en cian (`3px solid var(--jm-cian)`).
2. **Mundo 3D y Escenas de Menú / Modos (`src/folded.ts`, `src/kit3d.ts`, `src/menuscene.ts`, `src/match3_scene.ts`):**
   - **Día estilo Megabonk + Folded 2.5D:** Volumen real a 360° (frente, dorso, laterales, arriba, espesor y uniones visibles), materiales `FOLD` cacheados con desgaste intencional en bordes y zonas de contacto.
   - **Junket Crush (`src/match3*.ts`):** Gabinete arcade 3D Folded con pantalla emisiva 2D, campaña de 10 niveles, objetivos con ícono de forma + barra de progreso y soporte para modo `calm`.

## 2. Prohibiciones Estrictas (Anti-"AI Slop" e Invariantes)
- **Cero emojis** en DOM o canvas. Toda iconografía va como SVG geométrico limpio en `src/icons.ts`.
- **Cero estética obsoleta o genérica:** No reintroducir la terminal CRT verde (`VT323`/`Silkscreen`) salvo referencia histórica explícita; prohibido glassmorphism, píldoras SaaS, blancos puros `#ffffff` o degradados morados.
- **Cero rojo para el jugador:** El rojo (`--jm-rojo: #FF3B2E`) es exclusivo de amenaza o daño enemigo.
- **Cero voseo o tuteo:** Español neutro e impersonal en UI (*"Presiona"*, *"Sobrevive"*, *"El auto"*); carteles del mundo 3D y slogans en inglés (*"GOOD METAL / BETTER DAYS"*).

## 3. Calidad Impeccable (Aspiración 40/40) y Diseño Responsive
- Al intervenir interfaces DOM, evita los antipatrones detectados por Impeccable (`layout-transition` con `width` cuando pueda ser `transform: scaleX`, pestañas con `side-tab` incongruentes o `img` con `src=""` visible). No fuerces cambios artificiales si una superficie ya está bien resuelta.
- Verifica siempre los viewports oficiales (`scripts/lib/browser.mjs`):
  - **PC (`1280×720`)** y **Celular (`390×844` vertical / `844×390` apaisado)**.
  - En celular (`isTouch`), respeta las zonas reservadas para controles táctiles (`#stick`, `#tBoost`, `#tDrift`, `#tJump`, `#tAbil`, `#tPause`) para que ningún aviso de radio, carta, ranking o botón quede tapado.
  - En Carrera (`src/kart.ts`), nunca mostrar el selector de 2 jugadores en táctil (`raceCfg.players` = 1).

## 4. Verificación Visual Obligatoria
1. Reinicia `rc-test` (`npm run test:restart`) y captura los escenarios afectados con `npm run shots -- --only <id>`.
2. Inspecciona las capturas en `.shots/actual/` con `view_file` (PC y celular) y evalúa con la rúbrica de 10 dimensiones de `docs/VISUAL_QUALITY.md`.
