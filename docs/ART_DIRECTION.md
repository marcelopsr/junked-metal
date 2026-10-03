# Junked Metal — Dirección de arte

Decidida con el equipo el 2026-09-29. Es la referencia para cualquier asset, shader o pantalla nueva.

## Sensación
**Retro low-fi de la era PS1 (PSX-style), low-poly y luminoso.** Un auto RC en un patio que se vuelve noche mientras dura la partida.
Referencias de partida: Buckshot Roulette y Lethal Company, pero el norte es la estética PS1 en general. **No es terror ni tétrico**:
la escena se lee siempre bien. Low-poly sin verse cuadrado (nada de bloques). Decidida el 2026-10-03.
**Ajuste 2026-10-03: moderno + "crude/janky retro".** PS1 es sabor (píxel, dither, color 15 bits), no imitación: nada de affine warping,
Gouraud ni draw distance corta. Moderno en luz y feedback (bloom en emisivos, glitch VHS al recibir daño, apagón antes de cada jefe);
tosco y hecho a mano en la UI (cartas torcidas, bordes mordidos, cinta de papel, fuentes pixel VT323 + Silkscreen, animaciones a pocos cuadros).

## Textos (regla absoluta)
Español neutro e impersonal en todo texto visible: "Presiona", "Sobrevive", "El auto quedó destrozado". Nunca voseo ("Apretá", "querés")
ni "tu/te". Créditos sin tecnologías: historia breve y "Creado por TheDuende".

## Paleta y render
- **Ciclo atardecer → noche:** cada partida arranca en ATARDECER y anochece entre el 20% y el 65% del tiempo hasta la noche de la semilla
  (noche de luna, niebla, farol ámbar, madrugada). El Perro llega de noche. Mañana y nublado existen solo para el lab. (src/run.ts: `mixClimate`, `nightfall`)
- **Paleta propia por clima** (`ramp`: sombra, medio, luz) que el post mezcla con el color: cada clima tiene identidad de color.
- **Faro del auto** (SpotLight, `setLamp`) + resplandor; el turbo hace destellar y abrir el cono.
- **Render PSX:** resolución interna baja (Calidad 600p, Ultra 720p, Equilibrado 480p, Rendimiento 360p) escalada sin filtrar;
  texturas procedurales ≤96 px NEAREST; temblor de vértices PS1 suave (`SnapPlugin`, `LOOK.snap`).
- **Post retro (shader `retro`):** contornos de 1 px por profundidad (sin pasto), paleta del clima, dither Bayer 4x4 + 32 niveles (15 bits),
  grano, scanlines, viñeta, aberración. Perillas en `LOOK` (render.ts), ajustables en vivo con el modo lab.
- **Código de amenaza:** rojo = ataque enemigo (escupitajo); verde fósforo = disparos propios (gomitas). No usar rojo para nada del jugador.
- **Identidad por emisivo:** ojos que brillan por tipo (hormiga rojo, escupidora ámbar, escarabajo lima, autito faros blancos, robot amarillo, Perro rojo);
  tuercas de XP emisivas.
- **Ambiente:** polvo flotando en el haz del faro; luciérnagas cuando anochece.

## Personajes
- **Enemigos:** anatomía creíble y amenazante. Patas articuladas animadas, mandíbulas, brillo de caparazón.
- **Autos del jugador:** réplica RC detallada (carrocería de policarbonato con stickers de marca propia,
  amortiguadores visibles, llantas con taco). **Daño visible** (humo, chispas, piezas que se caen con
  poca vida). **Personalización** en el taller (color, llantas) y mejoras de la partida montadas en el auto.

## Mundo
- Suelo rico: pasto que se mueve con el viento, marcas de neumático persistentes, tierra, charcos.
- Objetos cotidianos detallados que cuentan la historia del patio.
- Destrucción del entorno: macetas que se rompen, marcas de explosión, objetos que vuelan.

## Combate (efectos)
- Impactos con peso: hit-stop, destello, esquirlas del material, sacudida proporcional.
- Explosiones físicas: humo, fuego, onda que empuja, marcas quemadas en el piso.
- Muertes con restos: insectos patas arriba / en pedazos con física; juguetes desarmados.
- Números de daño (críticos más grandes).

## Combate (agregado 2026-10-03)
- Flash blanco breve en cada golpe; hit-stop solo en críticos y jefes.
- Insectos muertos quedan patas arriba unos segundos con un charco del color de sus ojos; juguetes sueltan tornillos, resortes y chispas.
- Feedback de impacto por arma (`fx.ts` `IMPACT`, `sfx.ts` `SFX.impact`): chispas del color del arma (verde fósforo = propias), pedazos del caparazón, squash de 3 pasos en el bicho, sacudida y sonido propios. Con "Reducir parpadeos" no hay destello ni chispas.
- Final de partida: ~5 s de cámara lenta (0,2x) con barras de cine y la cámara orbitando el auto; luego los resultados con una foto polaroid (zona, tiempo, bajas, auto) que se puede guardar como PNG.
- Intro de 4 cuadros pixelados (casa que apaga la luz, bichos en el pasto, el auto se enciende entre juguetes, logo); solo en el primer arranque y desde Créditos.

## HUD: terminal gastada del transmisor
Misma telemetría RC (batería por celdas, señal/XP, reloj, turbo, velocímetro, armas, flechas), vista como equipo de campo viejo en un monitor CRT:
fósforo verde sobre negro, bordes rectos, scanlines con parpadeo sobre todo el HUD.
- Cartas de mejora = monitores CRT: carcasa de plástico, pantalla con scanlines, se "sintonizan" al aparecer (keyframes `tune`/`off`),
  ícono SVG rasterizado a 24 px y escalado pixelado (`pixelateIcon` en ui.ts).
- Tipografía: **VT323** (datos) + **Silkscreen** (títulos y jefes). Fuentes locales (OFL).
- Prohibido: emojis, esquinas redondeadas, glassmorphism, pills genéricas, `system-ui`, blancos puros.

### Paleta de UI
| Rol | Hex |
|---|---|
| Carcasa | `#0b0d0a` |
| Panel | `#141813` |
| Línea / borde | `#2c3a28` |
| Texto (fósforo) | `#b9d3a4` |
| Texto secundario | `#5f7355` |
| LCD fondo / tinta | `#10170d` / `#8dff6a` |
| Señal (XP) | `#6fb3c4` |
| Batería OK / baja | `#7fbf5a` / `#d12a1c` |
| Turbo | `#e0a030` |
| Rareza: común / rara / épica / evolución | `#8a9a82` / `#6fb3c4` / `#9a6fb5` / `#e0a030` |
