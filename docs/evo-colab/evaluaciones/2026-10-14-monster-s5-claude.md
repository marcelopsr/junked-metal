# Evaluación: monster, corrida 20261014-0130-s5 (piezas nuevas: jaula antivuelco y escapes)

- Fecha: 2026-10-14
- Evaluador: claude
- Material visto: `hoja-limpia.png` (original verdadero, vigente i188 y finalistas; la `hoja.png` de la corrida muestra como "original" el genoma con piso de piezas, no el original), vistas de `img/` de i10 (3/4, juego, lateral, trasera, lejos) y las hojas de las rondas s1 a s4.
- Contexto: genes nuevos `jaula_alto` y `escape_alto` (valor original 0 = sin pieza). Las bandas del monster dejaban la pieza en cero (la métrica castiga lo alto), así que la ronda s5 usó pisos temporales (jaula 0,2 a 0,3; escapes 0,38 a 0,5); `masa_alta` y `alto_largo` del monster se ensancharon en `PUSH` (`evo_probe.ts`). Tamaños elegidos antes mirando una hoja a mano (jaula 0,22 con escapes 0,4 se lee; jaula 0,3 con escapes 0,55 rompe la caja: `viol` 0,04).

## Puntajes (1 a 10)

| Variante | Silueta | Proporciones | Integración | Identidad | Folded | Total /50 |
|---|---|---|---|---|---|---|
| original | 6 | 6 | 7 | 7 | 6 | 32 |
| vigente (i188) | 7 | 6 | 7 | 7 | 6 | 33 |
| i210 | 7 | 6 | 7 | 8 | 7 | 35 |
| i10 | 7 | 7 | 7 | 8 | 7 | 36 |
| i142 | 7 | 5 | 7 | 8 | 7 | 34 |
| i223 | 7 | 5 | 7 | 8 | 7 | 34 |

Criterios: silueta (se lee de lejos), proporciones (ruedas, masa, alto/largo), integración (piezas unidas), identidad (conserva al auto y lo distingue de la flota), Folded (chapa, perfiles, volumen real).

## Ganadora
i10 (+3 sobre el original, +3 sobre el vigente): jaula roja de caño sobre la cabina más escapes cromados a los lados del capó; en la vista de partida y en el 3/4 se lee de inmediato como camión monstruo de juguete RC. Métrica: legibilidad 0,12 (original 0,122), proporciones 0,29 (original 0,61, vigente 0,32), triángulos 4034 contra 3728 (+8 %), todas las restricciones cumplidas.

## Defectos
- i10: la cabina larga (`cabina_largo` +45 %) le da aire de camioneta; de lado la jaula es una línea fina que casi no suma. A 48 px (`lejos`) la jaula es apenas un tinte rojo; el aporte real está en cámara de partida y garaje.
- i142: `trocha_k` +49 % separa demasiado las ruedas (proporciones 0,87).
- i223: cabina muy corta, alto/largo 0,765 fuera de banda.
- Los escapes son pequeños (0,38 m sobre la caja): a la distancia de juego son puntos claros. Subir el piso a 0,45 los haría leer mejor, pero con la jaula en 0,3 la caja se pasa.

## Retroalimentación para la próxima corrida
- `jaula_alto`: 0,2 a 0,26 es el rango útil; arriba de 0,3 rompe la restricción de caja.
- `escape_alto`: probar escapes con codo o remate más ancho (pieza, no medida) para que se lean desde arriba.
- Piezas siguientes: defensa frontal tipo "bull bar" y barra de luces con foco central, en `carHull("monster")`.

## Veredicto
- Garaje (vista cercana): sí. La jaula y los escapes son la primera mejora del monster que se ve a simple vista.
- Cámara de partida: sí, moderado; la jaula roja se ve desde arriba y recorta la silueta de la cabina.

## Límites de esta evaluación
Un solo evaluador (este); según el protocolo conviene un segundo antes de dar por cerrado, la diferencia de +3 vs vigente está cerca del ruido entre evaluadores (+2). Sin prueba en movimiento ni con calco de capó ni alerón puestos. La puntuación del original y el vigente es relativa a esta hoja, no comparable con la de la ronda anterior (38 contra 35).
