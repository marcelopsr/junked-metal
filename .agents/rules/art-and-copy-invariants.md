---
trigger: glob
globs: "src/**/*.css, index.html, src/ui.ts, src/menu.ts, src/icons.ts, src/duel*.ts, src/match3*.ts, src/kart.ts, src/replay.ts, src/intro.ts, src/kit*.ts, src/folded*.ts"
description: "Enforce Junked Metal current visual identity (Megabonk daylight + Folded 2.5D + dark sheet-metal UI with worn orange border + Rajdhani), neutral impersonal Spanish copy, threat color coding, and viewport/platform constraints."
---

# Invariantes de Dirección de Arte, UI y Textos (Vigente 2026-10-08)

## 1. Textos del Juego (Regla Absoluta)
- Todo texto funcional visible para el jugador debe estar en **español neutro e impersonal**: *"Presiona"*, *"Sobrevive"*, *"El auto quedó destrozado"*, *"Selecciona una mejora"*.
- **Prohibido el voseo** (*"Apretá"*, *"querés"*, *"elegí"*) y **prohibido el tuteo posesivo/pronominal** (*"tu auto"*, *"te golpearon"* → usar *"el auto"*, *"recibió daño"*).
- **Textos del mundo, branding y carteles 3D:** Los carteles de utilería (`src/kit3d.ts` `SIGNS`, pósters, marquesinas, nombres propios como *Junket Crush*, *GOOD METAL / BETTER DAYS*) van en **inglés** y nunca se mezclan en dos idiomas para el mismo cartel.
- En Créditos: historia breve y *"Creado por TheDuende"*, sin listar tecnologías.

## 2. Identidad Visual Vigente (Cero "AI Slop")
- **Dirección vigente (`docs/ART_DIRECTION.md`, `DESIGN.md`):** Partidas de **día al estilo Megabonk** sobre un mundo **Folded 2.5D** (chatarra industrial plegada y ensamblada con volumen real a 360°, desgaste en bordes/uniones y materiales `FOLD` en `src/folded.ts`). La etapa anterior (noche obligatoria, PSX y terminal CRT verde con VT323/Silkscreen) es historia.
- **Prohibido en toda la UI:** emojis (usar íconos SVG propios en `src/icons.ts`), glassmorphism, píldoras SaaS genéricas, `system-ui` suelto, blancos puros `#ffffff`, degradados morados.
- **HUD y Menús unificados (`src/kit.css`, `src/ui.ts`, `src/menu.ts`):**
  - Paneles de **chapa oscura opaca** (`--jm-fondo` `#0B0F14` / `--jm-panel` `#1F2937`) con **borde naranja gastado** (`--jm-chapa` `#b5651d`, 3 px), tornillos en las esquinas y sombra interior.
  - Tipografía única **`Rajdhani`** (`@fontsource/rajdhani`, 700 mayúsculas para títulos y etiquetas, 500 para cuerpo) y escala `--jm-t-*`.
  - Paleta sincronizada entre `:root` (`src/kit.css`) y `PAL`/`M3C` (`src/kit3d.ts`): si cambia un HEX, cambiar ambos.
  - Foco siempre visible en cian (`outline: 3px solid var(--jm-cian)`).
- **Junket Crush (`src/match3*.ts`, `src/match3.css`):** Gabinete arcade 3D Folded (`src/match3_scene.ts`), campaña de 10 niveles, objetivos con ícono de forma + barra de progreso (accesibilidad sin depender solo del color) y soporte para modo `calm` (`prefers-reduced-motion`).

## 3. Código de Color de Amenaza, Economía y Plataforma
- **Rojo (`--jm-rojo` `#FF3B2E`) = exclusivamente amenaza, peligro o daño enemigo.** Nunca uses rojo para disparos, habilidades o indicadores positivos del jugador (usar verde `--jm-verde` `#22C55E`, amarillo `--jm-amarillo` `#FFB400`, naranja `--jm-naranja` `#FF9138` o cian `--jm-cian` `#00C2FF`).
- **Aislamiento de economía:** Carrera, Junket Crush y Demolición **no dan tornillos ni logros** de Supervivencia (decisión cerrada del usuario).
- **Pantalla dividida (Carrera 2J):** Existe **solo en escritorio (PC)**. En dispositivos táctiles/celulares (`isTouch`), `raceCfg.players` se fuerza a 1 y el selector de 2 jugadores no se muestra.
