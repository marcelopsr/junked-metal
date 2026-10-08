---
trigger: glob
globs: "src/**/*.css, index.html, src/ui.ts, src/menu.ts, src/icons.ts, src/duel*.ts, src/match3*.ts, src/kart.ts, src/replay.ts, src/intro.ts"
description: "Enforce Junked Metal visual identity, neutral impersonal Spanish copy, threat color coding, and viewport/platform constraints."
---

# Invariantes de Dirección de Arte, UI y Textos

## 1. Textos del Juego (Regla Absoluta)
- Todo texto visible para el jugador debe estar en **español neutro e impersonal**: *"Presiona"*, *"Sobrevive"*, *"El auto quedó destrozado"*, *"Selecciona una mejora"*.
- **Prohibido el voseo** (*"Apretá"*, *"querés"*, *"elegí"*) y **prohibido el tuteo posesivo/pronominal** (*"tu auto"*, *"te golpearon"* → usar *"el auto"*, *"recibió daño"*).
- En Créditos: historia breve y *"Creado por TheDuende"*, sin listar tecnologías.

## 2. Identidad Visual por Superficie (Cero "AI Slop")
- **Prohibido en toda la UI:** emojis (usar íconos SVG propios en `src/icons.ts`), `system-ui` o fuentes genéricas, píldoras SaaS genéricas, blancos puros `#ffffff` en paneles.
- **HUD de Supervivencia y Cartas (`src/ui.ts`, `src/hud.css`):** Terminal CRT gastada del transmisor RC (`docs/ART_DIRECTION.md`). Fósforo verde (`#b9d3a4` / `#8dff6a`) sobre carcasa oscura (`#0b0d0a` / `#141813`), bordes rectos (`#2c3a28`), scanlines, tipografías locales **VT323** (datos) y **Silkscreen** (títulos/jefes), íconos rasterizados con `pixelateIcon`.
- **Menús Principales (`src/menu.ts`, `src/menu.css`):** Vidrio oscuro sobre escena 3D en vivo (`src/menuscene.ts`) con tipografía **Rajdhani** y acentos industriales limpios.
- **Taller de Demolición (`src/duel_fabricacion.ts`, `src/duel_fabricacion.css`):** Mesa de trabajo industrial (*Workbench*, `docs/DEMOLICION_WORKBENCH.md`). Respetar las zonas y estados congelados (`fabricar`, `fight`, `inter`).
- **Chatarra Alineada (`src/match3.ts`, `src/match3.css`):** Gabinete arcade de los 90 integrado con estética Junked Metal, objetivos con ícono de forma + barra (accesibilidad sin depender solo del color) y soporte para modo `calm` (reducir movimiento).

## 3. Código de Color de Amenaza y Plataforma
- **Rojo (`#d12a1c` / proyectiles rojos) = exclusivamente amenaza o daño enemigo.** Nunca uses rojo para disparos, habilidades o indicadores positivos del jugador (usar verde fósforo, ámbar `#e0a030` o cian `#6fb3c4`).
- **Pantalla dividida (Carrera 2J):** Existe **solo en escritorio (PC)**. En dispositivos táctiles/celulares (`isTouch`), `raceCfg.players` se fuerza a 1 y el selector de 2 jugadores no se muestra.
