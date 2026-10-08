---
name: frontend-design
description: >-
  Guides UI/UX design, HUD telemetry, menus, Demolicion Workbench, Match-3 arcade
  cabinet UI, custom SVG icons, and responsive CSS for Junked Metal while preventing
  generic AI aesthetics. Activate this skill whenever creating, styling, or refining
  HTML/DOM/CSS interfaces in index.html, src/*.css, src/ui.ts, src/menu.ts,
  src/icons.ts, src/duel_fabricacion.ts, or src/match3.ts. Do not activate for pure
  physics, balance, or headless script tasks.
---

# Frontend Design — Identidad Visual Junked Metal

*Adaptado de los principios anti-plantilla de `anthropics/skills/frontend-design` y `impeccable`, anclado a la dirección de arte real de Junked Metal (`docs/ART_DIRECTION.md` y `docs/DEMOLICION_WORKBENCH.md`).*

**Nivel de razonamiento recomendado:** `Gemini Flash — Low` para ajustes puntuales de CSS; `Gemini Flash — Medium` para componentes, pantallas nuevas, animaciones y responsive PC/celular.

## 1. Regla Cero: Respetar el Mundo Visual de Cada Superficie
Junked Metal no es una web SaaS; cada pantalla pertenece a un artefacto físico dentro del universo del juego. Consulta [references/tokens-and-surfaces.md](./references/tokens-and-surfaces.md) para la paleta exacta y reglas por superficie:

1. **HUD de Supervivencia y Cartas (`src/ui.ts`, `src/hud.css`):**
   - **Concepto:** Terminal CRT gastada de un transmisor RC de campo.
   - **Estética:** Fósforo verde (`#b9d3a4` / `#8dff6a`) sobre carcasa negra/verde muy oscuro (`#0b0d0a` / `#141813`), bordes rectos (`#2c3a28`), scanlines con parpadeo sutil.
   - **Cartas de mejora:** Monitores CRT que se "sintonizan" al aparecer (`tune`/`off`), íconos SVG rasterizados a 24 px y escalados pixelados con `pixelateIcon()`.
   - **Tipografías:** `VT323` para datos/telemetría y `Silkscreen` para títulos/avisos de jefe.
2. **Menús Principales (`src/menu.ts`, `src/menu.css`):**
   - **Concepto:** Paneles de vidrio oscuro limpio sobre la escena 3D en vivo (estante de juguetes / mesa de taller en `src/menuscene.ts`).
   - **Tipografía:** `Rajdhani` (con `Silkscreen` / `VT323` donde corresponda por acento técnico).
3. **Taller de Demolición (`src/duel_fabricacion.ts`, `src/duel_fabricacion.css`):**
   - **Concepto:** Mesa de trabajo industrial (*Workbench* RoboCraft, `docs/DEMOLICION_WORKBENCH.md`).
   - **Invariante:** Respetar las fases (`fabricar`, `fight`, `inter`), el cajón de piezas (`#duel-fab-drawer`), fantasmas 3D (`ghost3d`) y microcopy de asalto.
4. **Chatarra Alineada (`src/match3.ts`, `src/match3.css`):**
   - **Concepto:** Gabinete arcade de los 90 integrado con estética Junked Metal.
   - **Accesibilidad:** Los objetivos muestran siempre ícono de forma + barra de progreso (nunca depender solo del color) y respetan la clase `calm` (reducir movimiento).

## 2. Prohibiciones Estrictas (Anti-"AI Slop")
- **Cero emojis** en cualquier parte del DOM o canvas. Si necesitas iconografía, agrégala como SVG geométrico limpio en `src/icons.ts`.
- **Cero `system-ui`, `Inter` o `Roboto`:** usa exclusivamente las fuentes locales empaquetadas (`VT323`, `Silkscreen`, `Rajdhani`).
- **Cero rojo para el jugador:** El rojo (`#d12a1c`) significa amenaza o daño enemigo. Las barras, proyectiles y estados positivos del jugador usan verde fósforo (`#7fbf5a` / `#8dff6a`), ámbar (`#e0a030`, turbo/evolución) o cian (`#6fb3c4`, señal/XP).
- **Cero voseo o tuteo:** Todo copy debe estar en español neutro e impersonal (*"Presiona"*, *"Selecciona"*, *"El auto"*).

## 3. Diseño Responsive y Multiplataforma (PC + Celular)
- Comprueba siempre que la interfaz funcione en los dos viewports oficiales de prueba (`scripts/lib/browser.mjs`):
  - **PC:** `1280×720` (teclado + mouse + gamepad).
  - **Celular (`cel`):** `390×844` vertical (`isMobile: true, hasTouch: true`) y `844×390` apaisado (`celh`).
- En táctil (`isTouch`):
  - Áreas de toque cómodas y sin solaparse con los controles virtuales (`#stick`, `#tBoost`, `#tDrift`, `#tJump`, `#tAbil`, `#tPause`).
  - En Modo Carrera (`src/kart.ts`), nunca mostrar ni habilitar el selector de 2 jugadores en pantalla dividida en celular (`raceCfg.players` es siempre 1 en táctil).
- Respeta las opciones de accesibilidad del guardado (`Save`): `calm` / reducir parpadeos y escala de controles táctiles (`tlay`, `touch`).

## 4. Verificación Visual Obligatoria
Nunca des por terminada una tarea de UI solo porque compila:
1. Reinicia `rc-test` (`pm2 restart rc-test`) y captura los escenarios afectados con `npm run shots -- --only <id>`.
2. Inspecciona las imágenes PNG generadas en `.shots/actual/` con `view_file` tanto en `pc` como en `cel`.
