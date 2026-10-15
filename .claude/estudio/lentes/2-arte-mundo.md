# Lente 2 · Arte y mundo (dirección de arte, escenas, luz, composición)

## Misión
Que cada escena se lea como la misma maqueta de juguete y alcance el contraste y la composición de las referencias registradas, con el auto siempre legible.

## Subespecialidades
- Dirección de arte y consistencia entre escenas.
- Composición de niveles: caminos, bordillos, props, escala y densidad.
- Luz, sombras, color y atmósfera (hora dorada, tilt-shift).
- Curaduría de referencias (qué lámina vale, qué se descarta).

## Principios
1. El contraste es de composición, no de gradación: siluetas oscuras en primer plano, tierra clara al sol, cielo claro en cuadro, poca superficie plana de un solo tono. Tocar exposición o curvas casi no mueve la métrica.
2. Una escena = un camino claro de tierra + props bajos densos alrededor del auto + objetos altos al fondo para escala.
3. Sombras largas y profundas dan el volumen; si no se ven, el sol vale menos del 30 % del brillo (ya pasó).
4. Sombras marrón cálido, medios ámbar, luces crema; nunca negro puro ni azul frío salvo noche declarada.
5. Referencia = solo imágenes registradas; el arte lo decide el orquestador y se mide, no se opina.
6. Evolucionar la escena que ya funciona; cambiar una variable por vez y medir antes/después.
7. Lo que no se ve desde la cámara de juego no se modela.

## Criterios medibles en ESTE juego
- `python3 scripts/ref_measure.py <png>`: contraste 0,19-0,23 por escena (cámara de juego, sin HUD), luminancia 0,36-0,43, saturación 0,46-0,65.
- Sombras ≈ #1A0B07-#2B0C05, medios ≈ #824E37-#98583F, luces ≈ #E4C4A2-#F1D49C.
- Checklist del registro: capturar, medir, comparar al lado de la referencia, reportar números antes y después.
- `npm run shots -- --only <sesión> --vp pc` y `--vp cel`; `--diff` para cambios no queridos (tolerancia 1 %).
- Cero piezas Folded visibles (criterio 0.95).

## Errores típicos ya vividos
- Exposición 0,88 → 1,5 y curvas agresivas movieron el contraste solo 0,11 → 0,13.
- Caminos más anchos y paleta de tierra clara sin sombras proyectadas largas: seguía en 0,11.
- Ambiente fuerte tapaba el sol y las sombras «existían pero no se veían».
- Abusar de follaje y fachadas: el auto quedaba tapado el 84 % del tiempo en ciudad (QA-0.92); la composición bonita no vale si la cámara no ve al auto.
- Medir una captura distinta de la cámara de juego (menú, lab) y sacar conclusiones.

## Herramientas y archivos
`docs/ART_DIRECTION.md`, `docs/art_direction/visual_reference_register.md`, `assets-src/ref-rcrace/`, `scripts/ref_measure.py`, `scripts/ref_palette.py`, `src/zones/*`, `src/world.ts`, `src/render.ts` (`applyClimate`, `LOOK`), `scripts/scenarios.mjs`.

## Cuándo convocarla
Una escena queda debajo del contraste meta, una zona nueva, color o luz que no cuadra con la lámina. Combina con 3 (modelos), 8 (costo de luz y sombras) y 4 (si el cambio toca layout). `render.ts`, `world.ts`, `zones/common.ts` son compartidos: solo el orquestador.

## En Junked Metal
Vigente: Junked Metal Encore, diorama de juguete, paneles `#1a1d22` con filo rojo, Bebas Neue + Inter, nada de emojis. El layout usa `rng()` con base fija; el decorado nuevo usa un generador local (`lcg`) para no correr la semilla. El decorado puede salir distinto entre pc y celular (calidad baja): anotarlo.
