# Lente 7 · Experiencia y UI (HUD, menús, onboarding, accesibilidad)

## Misión
Que cualquier persona nueva entienda, decida y juegue sin ayuda, en compu y celular, con una interfaz que informa sin tapar y que tiene personalidad de juguete.

## Subespecialidades
- Arquitectura de información y flujos de menú.
- HUD de partida y cartas de mejora.
- Onboarding y primeras partidas.
- Accesibilidad: contraste, tamaños, movimiento reducido, teclado y gamepad.
- Texto de interfaz.

## Principios
1. Fricción cero: contar pasos, toques y lecturas por tarea y quitar los que sobran.
2. Una decisión por pantalla, jerarquía clara, estados visibles, nada que obligue a recordar.
3. El HUD informa sin tapar: nunca en la franja donde se ve el auto.
4. Celular es ciudadano de primera: 390x844 vertical, pulgar, pantalla chica.
5. Deleite con propósito: microinteracciones de 120-250 ms que confirman la acción.
6. Textos cortos, en español neutro impersonal, sin voseo; nada de emojis.
7. Mirar la pantalla real antes de opinar.

## Criterios medibles en ESTE juego
- Objetivos táctiles ≥ 44 px; contraste de texto AA (4,5:1; 3:1 en grande).
- Pasos para empezar una partida desde el título: contarlos y no aumentarlos.
- `npm run shots -- --only <sesión> --vp pc` y `--vp cel`: sin texto cortado, sin solapes.
- Informe de accesibilidad de menús H10-H12 cerrado (criterio 1.0).
- `prefers-reduced-motion` respetado; animaciones solo con `transform`/`opacity`.
- Tokens `--jm-*`, fuentes Bebas Neue + Inter, panel `#1a1d22` con filo rojo, botón primario pegatina roja.

## Errores típicos ya vividos
- Aviso central y toast de radar en el celular sobre la zona del auto; panel de racha pegado al aviso.
- UI genérica o emojis donde mandaban íconos SVG propios.
- Voseo en textos de juego.
- Cambiar un menú y no revisar celular: se rompe en 390x844.
- Dejar una animación larga que retrasa al jugador veterano.

## Herramientas y archivos
`docs/ART_DIRECTION.md`, `src/ui.ts`, `src/hud.css`, `src/menu.ts`, `src/menu.css`, `src/style.css`, `src/icons.ts`, `src/intro.ts`, `src/input.ts`, `scripts/scenarios.mjs`, `scripts/e2e.mjs`, agente `experiencia`.

## Cuándo convocarla
Menú, HUD, ficha, flujo, onboarding o cualquier pantalla nueva o que confunde. Combina con 6 (juice), 9 (textos), 8 (táctil bajo presupuesto) y 5 (e2e pc+cel). Por defecto la carga el agente `experiencia`.

## En Junked Metal
La pantalla dividida para 2 jugadores existe solo en compu; en táctil nunca hay 2 jugadores, no diseñar ni probar split screen en celular. Cada pantalla pasa el checklist visual del registro.
