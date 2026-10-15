# Lente 6 · Sensación y efectos (game feel, juice, animación, partículas)

## Misión
Que cada golpe, choque, recogida y daño se sienta y se lea al instante, con efectos baratos que refuercen el diorama de juguete.

## Subespecialidades
- Game feel: respuesta del auto, impacto, retroceso, hit-stop.
- Juice: cámara, destellos, números de daño, squash/stretch.
- Partículas, restos y marcas en el piso.
- Animación procedural de bichos y autos.

## Principios
1. Toda acción tiene respuesta en menos de 100 ms: visual + sonido + (táctil si aplica).
2. Más grande no es mejor: el efecto escala con la importancia del evento (golpe común < crítico < jefe).
3. Anticipación, golpe, recuperación: tres tiempos cortos (120-250 ms) leen mejor que uno largo.
4. El efecto nunca tapa la amenaza ni al auto; legibilidad primero.
5. Reusar el pool: más cantidad con el mismo costo, no sistemas nuevos.
6. Respetar `prefers-reduced-motion` y bajar partículas en táctil.
7. Los efectos visuales pueden usar `Math.random`; los de reglas no.

## Criterios medibles en ESTE juego
- `impact()` por arma: chispas, pedazos y squash distinguibles en captura de partida (pc y cel).
- Topes: restos 240, marcas 500, gemas 350; sin superarlos en `__info()`.
- `perf` (si el usuario lo habilita): sin subir draws ni ms/cuadro > 20 % con efectos nuevos.
- Duración de efectos de UI 120-250 ms; recompensa visible en el mismo cuadro del evento.
- Capturas pc y cel donde el auto sigue legible con el efecto a máxima densidad.

## Errores típicos ya vividos
- Crear `ParticleSystem` nuevos en vez de usar el pool de `fx.ts`.
- Efectos que dependen de `Math.random` metidos en lógica de partida (rompe determinismo del `sim`).
- Aviso central y toast de radar en el celular tapando al auto (QA-0.92 #4).
- Bloom y partículas iguales en celular que en compu: costo sin beneficio.
- Más efecto para disimular un golpe flojo en vez de arreglar el tiempo hasta matar (lente 1).

## Herramientas y archivos
`src/fx.ts`, `src/car.ts` (animación visual), `src/enemies.ts` (patas), `src/ui.ts` (números de daño), `src/replay.ts`, `src/render.ts` (bloom, DOF), `shots`, `?lab` con `__lab`/`__look`.

## Cuándo convocarla
Disparar o chocar se siente flojo, falta recompensa visible, efecto ilegible o caro. Combina con 1 (el número manda), 9 (sfx en sincronía), 8 (costo) y 7 (HUD).

## En Junked Metal
Tono de juguete físico: rebote, chapa, pegatina; chispas y pedazos de plástico, no explosiones realistas. El modo lab (`?mute&seed=3&lab`) congela la escena para iterar el aspecto.
