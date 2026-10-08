---
name: Junked Metal
description: Roguelite de autos RC en un patio de chatarra industrial plegada; UI de chapa oscura con borde naranja gastado.
colors:
  amarillo: "#FFB400"
  amarillo-claro: "#FFD166"
  naranja: "#FF9138"
  rojo: "#FF3B2E"
  cian: "#00C2FF"
  verde: "#22C55E"
  morado: "#8B5CF6"
  fondo: "#0B0F14"
  fondo-2: "#14181F"
  panel: "#1F2937"
  borde: "#374151"
  texto: "#F8FAFC"
  texto-2: "#9CA3AF"
  chapa: "#b5651d"
  chapa-oscura: "#3a2414"
  tornillo: "#6b4a2a"
typography:
  display:
    fontFamily: "Rajdhani, system-ui, sans-serif"
    fontSize: "clamp(46px, 9vw, 92px)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "0.04em"
  headline:
    fontFamily: "Rajdhani, system-ui, sans-serif"
    fontSize: "clamp(30px, 4.2vw, 44px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.03em"
  title:
    fontFamily: "Rajdhani, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.15
  body:
    fontFamily: "Rajdhani, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.35
  label:
    fontFamily: "Rajdhani, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    letterSpacing: "0.16em"
rounded:
  base: "3px"
  none: "0"
  round: "50%"
spacing:
  gap: "10px"
  pad: "14px"
components:
  button:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.texto}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    padding: "10px 18px"
    height: "42px"
  button-hover:
    textColor: "#ffffff"
  button-primary:
    backgroundColor: "{colors.verde}"
    textColor: "{colors.fondo}"
    rounded: "{rounded.base}"
    padding: "10px 18px"
  button-warn:
    backgroundColor: "{colors.amarillo}"
    textColor: "{colors.fondo}"
  button-danger:
    backgroundColor: "{colors.rojo}"
    textColor: "{colors.texto}"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.base}"
    padding: "{spacing.pad}"
  panel-secondary:
    backgroundColor: "{colors.fondo}"
    rounded: "{rounded.base}"
  badge:
    backgroundColor: "{colors.amarillo}"
    textColor: "{colors.fondo}"
    rounded: "{rounded.base}"
    padding: "4px 8px"
---

# Design System: Junked Metal

Derivado del código al 2026-10-08 (`src/kit.css`, `src/hud.css`, `src/style.css`, `src/menu.css`; paleta 3D en `src/kit3d.ts`). Lo cualitativo (nombres, North Star, reglas) es inferido del código y de `docs/ART_DIRECTION.md` (supuesto: no se consultó al usuario).

## Overview

**Creative North Star: "El taller de chatarra"**

Una UI que parece una placa de chapa atornillada a un tablero de taller: oscura, pesada y pintada a mano, con un borde naranja gastado que la recorta del mundo. El juego se ve de día (estilo Megabonk, colores saturados) sobre un mundo Folded de chatarra industrial plegada; la UI es el contrapeso sobrio: fondos casi negros azulados, un solo amarillo de advertencia como voz principal y cian solo para foco y datos.

La densidad es media y funcional: números grandes legibles, etiquetas en mayúsculas con tracking amplio, tarjetas compactas. La profundidad sale del bisel y de sombras duras ("sombra de chapa" de 3px), no de desenfoques. Se rechaza lo confirmado como historia: vidrio translúcido, terminal verde de fósforo (VT323/Silkscreen), esquinas redondeadas tipo pastilla, emojis y blancos puros.

**Key Characteristics:**
- Chapa oscura opaca, borde naranja de 3px, tornillos en las esquinas.
- Rajdhani en todo: títulos 700 en mayúsculas, texto 500.
- Amarillo = acción y énfasis; verde = confirmar; rojo = peligro; cian = foco y datos.
- Esquinas casi rectas (3px), barras y pips totalmente rectos.
- Tokens `--jm-*` en `kit.css` (último en cargarse; pisa a `style.css`, `menu.css` y `hud.css`).

## Colors

Fondos casi negros azulados, chapa de cobre naranja como único color de marco y acentos de señal saturados que repiten los colores del mundo 3D (`PAL`/`M3C` en `kit3d.ts`; si cambia un HEX cambiar los dos).

### Primary
- **Amarillo advertencia** (#FFB400): títulos, tarjeta seleccionada, pestaña activa, botón `.warn`, barras de progreso, precios. La voz principal de la UI.
- **Amarillo claro** (#FFD166): énfasis secundario (`.press`, spans de sección, degradado del botón amarillo).

### Secondary
- **Naranja** (#FF9138): resplandor de títulos y marca; color de acento del mundo.
- **Cian foco** (#00C2FF): anillo de foco (3px), pips de stats, barras de estado, tipo "información". Nunca decorativo.
- **Verde OK** (#22C55E): botón `.primary`, estado correcto.
- **Rojo alarma** (#FF3B2E): `.danger`, jefes, amenaza enemiga. No se usa para nada del jugador.
- **Morado** (#8B5CF6): rareza épica/habilidad (uso marginal).

### Neutral
- **Fondo noche** (#0B0F14): base de paneles secundarios, huecos, texto sobre amarillo/verde.
- **Fondo 2** (#14181F): tarjetas al hover, fondo inferior del panel.
- **Panel acero** (#1F2937): cuerpo de botones y paneles.
- **Borde** (#374151): bordes finos de tarjetas, pistas de barras.
- **Texto** (#F8FAFC) y **Texto 2** (#9CA3AF): texto principal y secundario.
- **Chapa cobre** (#b5651d), **Chapa oscura** (#3a2414), **Tornillo** (#6b4a2a): marco del panel, su bisel interior y los remaches.

### Named Rules
**The Una Sola Voz Rule.** El amarillo manda; si dos cosas compiten por el amarillo en una pantalla, una debe bajar a texto 2 o a cian.
**The Foco Cian Rule.** El anillo de foco es siempre cian de 3px con 2-3px de separación, igual con teclado, gamepad y mouse.
**The Rojo Enemigo Rule.** El rojo es del enemigo y del peligro; nada propio del jugador es rojo.

Drift conocido: `style.css` y `hud.css` conservan tokens viejos (`--ink #7dffb0`, `--r-comun`…`--r-fusion` de rareza, `--turbo`) que `kit.css` reapunta a la paleta nueva; las rarezas siguen con sus propios HEX en `style.css`.

## Typography

**Display, headline y cuerpo:** Rajdhani (paquete local `@fontsource/rajdhani`, pesos 500 y 700; se precargan antes de la portada) con `system-ui, sans-serif` de reserva.
**Mono / datos:** la misma Rajdhani (`--data`); no hay familia mono.

**Character:** condensada, industrial y geométrica; con mayúsculas y tracking amplio parece rotulada con plantilla.

### Hierarchy
- **Display** (700, `clamp(46px, 9vw, 92px)`, 0.95): marca del título, amarilla, rotada -1.5°, sombra dura (#5a2a00 + fondo).
- **Headline** (700, `clamp(30px, 4.2vw, 44px)`, 1, mayúsculas): `.otitle`, títulos de pantalla y modal (28px en modales).
- **Title** (700, 22px / 17px en tarjetas): `--jm-t-h2`, nombres de ficha (`.carc b`).
- **Body** (500, 16px, 1.35): texto funcional (`--jm-t-body`); 13-15px en notas y pistas.
- **Label** (700, 13-15px, tracking .06-.16em, mayúsculas): botones, kickers de sección, etiquetas.
- **Number** (`--jm-t-num` 30px): cifras grandes de estadísticas.

### Named Rules
**The Mayúscula de Chapa Rule.** Títulos, botones y kickers van en mayúsculas 700; el texto corrido en 500 sin mayúsculas.
**The Sin Fósforo Rule.** VT323 y Silkscreen son historia; solo sobreviven en restos de `duel.css`. No usarlas en pantallas nuevas.

## Layout

Pantallas a pantalla completa con paneles centrados y listas de tarjetas con `flex-wrap`; ritmo base `--jm-gap` 10px y relleno de panel `--jm-pad` 14px. El HUD se ancla por esquinas (progreso y reloj arriba izquierda, radar arriba derecha, estado del auto abajo centro, velocidad abajo derecha, armas abajo izquierda) y se escala con `--hud-scale`.

Adaptación: reglas por puntero y tamaño en `kit.css`: `pointer: coarse` (táctil, oculta pistas de teclado, agranda objetivos), ancho ≤640px, retrato ≤1100px y horizontal con alto ≤500px; un bloque de escritorio desde 900x501. Botones táctiles mínimos de 42-46px. La pantalla dividida existe solo en compu.

## Elevation & Depth

Híbrido de bisel y sombra dura. El panel suma un marco (borde 3px cobre, contorno exterior de 2px en el color de fondo, bisel interior `inset 0 0 0 2px` chapa oscura) y una sombra grande; los botones usan una "zapata" inferior de 3px negra. Sin desenfoques ni vidrio (`backdrop-filter: none`).

### Shadow Vocabulary
- **Sombra de panel** (`--jm-sombra: 0 14px 40px rgba(0,0,0,.6)` + `inset 0 0 24px rgba(0,0,0,.55)`): paneles y modales.
- **Zapata de botón** (`0 3px 0 #000`, al pulsar `0 1px 0 #000` y baja 2px): botones y badges (`0 2px 0 #000`).
- **Brillo de título** (`0 3px 0 #5a2a00, 0 0 22px rgba(255,145,56,.35)`): marca y títulos.

### Named Rules
**The Zapata Rule.** La elevación se dice con una sombra dura hacia abajo, no con desenfoque; pulsar es hundir 2px.

## Shapes

Casi rectangular: radio base `--jm-r` 3px en paneles, botones, badges y tarjetas; **0** en barras, pips, controles deslizantes y notas; **50%** solo en el radar, el interruptor (`.jm-sw`), muestras circulares de llanta. Sin pastillas. Los tornillos en las cuatro esquinas (radial-gradient de #6b4a2a, 2.5px) son el motivo recurrente; `clip-path` desactivado en botones.

## Components

### Buttons
- **Shape:** radio 3px, mínimo 42px de alto, relleno 10px 18px, Rajdhani 700 15px mayúsculas con tracking .06em.
- **Default (chapa oscura):** degradado #2b3442 → #1F2937 → #161c25, borde 2px de fondo, contorno interior cobre al 55 % (outline 1px, offset -4px), zapata negra.
- **Hover:** degradado más claro y el contorno interior pasa a amarillo; texto blanco. **Active:** baja 2px. **Disabled:** gris, brillo .7, opacidad .6. **Foco:** anillo cian 3px.
- **Primary:** verde (#5ee08a → #22C55E → #15803d), texto #0B0F14, 18px, sin contorno. En listas de menú, 24px y relleno 16px 22px.
- **Warn:** amarillo; **Danger:** rojo con texto claro. Pestañas (`.tab`) 13px; la activa se pinta amarilla.

### Cards / Containers
- **Panel principal** (`.jm-panel`, `#bpanel`, `.askbox`, `#opts`, `.overGrid .card`): degradado opaco ~.96 de #1F2937 a #14181F, borde 3px cobre, tornillos, bisel interior y sombra de panel.
- **Panel secundario** (`.jm-panel2`, `.carc`, `.bblock`): fondo #0B0F14, borde 1px #374151, radio 3px.
- **Ficha seleccionada** (`.carc.sel`): borde y filo izquierdo de 4px amarillos sobre #1a1608. Bloqueada: texto #6b7280. Jefe: borde rojo.
- **Tarjeta de mejora** (`.offer`): degradado panel → fondo 2, borde 2px #374151.

### Inputs / Fields
- `select` 700 14px, mínimo 36px; deslizadores con pulgar rectangular amarillo de 12x22px; interruptor `.jm-sw` de 52x26px con perilla circular.
- Foco cian; pistas de rango y barras con borde de 1px y relleno rectos.

### Progress bars and pips
- Barra de 8px, fondo #0B0F14, borde 1px #374151, sombra interior; relleno amarillo (HUD: la barra anima con `scaleX`). Barras de estado en cian. En el HUD, íconos a la izquierda de cada barra (corazón, rayo, estrella) y degradados por tipo (vida, turbo, habilidad, salto).

### Badge / Tooltip
- **Badge:** amarillo (ok verde, bad rojo, info cian), 12px 700, borde 2px de fondo y zapata 2px.
- **Aviso / tooltip** (`.jm-tip`, `#padToast`, `.note`): fondo #0B0F14 al 90 %, borde 1px, filo amarillo de 2px arriba, radio 0.

### HUD (componente distintivo)
Placas pequeñas (`.h-panel`, `#lcd`, `#banner`) con borde 1px y filo de 2px arriba, radio 3px; el radar es circular con borde #4b5563. Los avisos de evento usan estados propios (`evt-warn`, `evt-now`). Texto claro sobre fondo oscuro, nunca blanco puro de panel a panel.

## Do's and Don'ts

### Do:
- **Do** usar los tokens `--jm-*` y las clases `.jm-*` de `kit.css`; si hace falta un color nuevo, agregarlo a `PAL`/`M3C` y a `:root` a la vez.
- **Do** dejar el amarillo (#FFB400) para la acción o el énfasis principal de cada pantalla.
- **Do** mantener foco cian de 3px y objetivos táctiles de 42px o más.
- **Do** hundir 2px los botones al pulsar y usar sombras duras.
- **Do** escribir los textos en español neutro impersonal, sin voseo; nombres propios y carteles del mundo en inglés.
- **Do** usar íconos SVG propios (`icons.ts`) y reducir movimiento con `calm` y `prefers-reduced-motion`.

### Don't:
- **Don't** usar emojis ni UI genérica (pastillas, vidrio translúcido, `backdrop-filter`, degradados morados de moda).
- **Don't** reintroducir la terminal de fósforo (verde #7dffb0 sobre negro, VT323, Silkscreen, scanlines) ni la estética de noche/PSX en pantallas nuevas.
- **Don't** usar esquinas redondeadas mayores a 3px (salvo círculos reales: radar, interruptor, muestras).
- **Don't** usar rojo para elementos del jugador ni blanco puro de fondo.
- **Don't** declarar un HEX nuevo en un CSS de modo si ya existe un token; `kit.css` se carga última y debe seguir mandando.
- **Don't** diseñar ni probar pantalla dividida en teléfono: ahí nunca hay 2 jugadores.
