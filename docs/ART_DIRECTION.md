# RC Fight — Dirección de arte

Decidida con el equipo el 2026-09-29. Es la referencia para cualquier asset, shader o pantalla nueva.

## Sensación
**Caótico y explosivo + tenso: "el patio es peligroso".** Un auto RC es diminuto; los insectos
son de su tamaño y los jefes son colosales. El combate es adrenalina pura, pero el entorno intimida.

## Paleta y render
- **Paleta natural realista.** Colores de foto real: pasto verde natural, tierra marrón, cielo de día.
  Nada de pasteles, neón ni grading cinematográfico fuerte.
- **Render híbrido.** Autos y juguetes con materiales PBR creíbles (policarbonato pintado, goma, metal).
  Insectos anatómicamente creíbles con caparazón brillante. El entorno sostiene sin competir.
- **Sin estilización de post.** Nada de contornos de tinta, grano, tilt-shift ni animación a pasos.
  Post-proceso solo técnico: tonemapping ACES, bloom sutil en efectos, AA, FSR.

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

## HUD: telemetría de radio RC
El HUD es la interfaz del transmisor RC: sobrio, técnico y propio del tema.
- Vida = batería LiPo por celdas con voltaje. XP = barra de "señal/progreso". Reloj tipo LCD.
- Siempre visibles: vida, XP, tiempo, turbo, velocímetro (km/h de escala), armas con recarga circular,
  flechas de borde hacia jefes, cofres y eventos.
- Mejoras: cartas con ilustración SVG propia, rareza por color, nivel con marcas, evolución indicada;
  entrada con juice (barajado, rebote, la elegida vuela al auto); vista previa montada en el auto.
- Tipografía: **Chakra Petch** (datos, condensada técnica) + **Bungee** (solo títulos y jefes). Fuentes locales (OFL).
- Prohibido: emojis, gradientes decorativos, glassmorphism, pills genéricas, `system-ui`.

### Paleta de UI
| Rol | Hex |
|---|---|
| Carcasa del transmisor | `#16181b` |
| Panel | `#23272c` |
| Línea / borde | `#3a4048` |
| Texto | `#e8eaed` |
| Texto secundario | `#8b939c` |
| LCD fondo | `#9fb08a` / tinta LCD `#1f2a18` |
| Acento señal (XP) | `#35d0ff` |
| Batería OK / baja | `#7ddc4a` / `#ff4a3d` |
| Turbo | `#ff9a1f` |
| Rareza: común / rara / épica / evolución | `#b8c0c8` / `#35d0ff` / `#c46bff` / `#ffc83d` |
