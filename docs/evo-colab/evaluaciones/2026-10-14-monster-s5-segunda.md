# Evaluación: monster, corrida 20261014-0130-s5 (segunda, independiente)

- Fecha: 2026-10-14
- Evaluador: claude (segundo evaluador, contexto fresco; puntuó antes de leer la primera evaluación)
- Material visto: `hoja-limpia.png` (original y vigente verdaderos, más i210, i10, i142, i209, i223, i247) y en `img/` las vistas juego, tres_cuartos, lateral y lejos de i10.
- Piezas nuevas en juego: `jaula_alto` (jaula antivuelco de caño rojo) y `escape_alto` (escapes cromados junto al capó).

## Puntajes (1 a 10)

| Variante | Silueta | Proporciones | Integración | Identidad | Folded | Total /50 |
|---|---|---|---|---|---|---|
| original | 6 | 7 | 7 | 7 | 5 | 32 |
| vigente | 6 | 6 | 7 | 7 | 5 | 31 |
| i210 | 7 | 7 | 6 | 7 | 6 | 33 |
| i10 | 7 | 6 | 6 | 8 | 6 | 33 |
| i142 | 7 | 7 | 6 | 7 | 6 | 33 |
| i209 | 7 | 6 | 6 | 7 | 6 | 32 |
| i223 | 7 | 6 | 6 | 7 | 6 | 32 |
| i247 | 7 | 6 | 6 | 7 | 6 | 32 |

## Ganadora
Empate a 33 entre i10, i210 e i142, todas +1 contra el original. i10 tiene la mejor identidad (jaula ancha y escapes verticales que dicen "monster de exhibición"), pero ninguna llega a +2.

## Defectos
- Jaula roja: `ART_DIRECTION.md` (Vigente) dice "Rojo = amenaza enemiga; no usar rojo para nada del jugador". La pieza más visible del cambio choca con una regla que manda; en la vista de partida (desde arriba) el rectángulo rojo es lo que más se lee del auto. Con caño amarillo, naranja chapa o gris acero la evaluación sería otra.
- Jaula plana y fina: en lateral es una línea de ~2 px que parece apoyada sobre la cabina más que soldada al chasis; sin parantes visibles hacia la caja, Integración baja 1.
- Escapes: se leen en tres cuartos y lateral como dos postes blancos; en juego y a 48 px desaparecen. Aportan Folded (piezas atornilladas) pero poco a distancia.
- Proporciones: i10 tiene la métrica `prop` peor (0,29 contra 0,61 del original); a ojo la cabina se ve algo más corta y la caja más larga que el original.
- A 48 px (`lejos`) i10 y el original solo se distinguen por una mancha roja.

## Retroalimentación para la próxima corrida
- Cambiar el material de la jaula a un color de jugador (amarillo `#FFB400` o acero) antes de evaluar de nuevo; es probablemente el +1 que falta.
- Agregar parantes de la jaula que bajen hasta la caja para que se lea anclada.
- Escapes: más gruesos o con punta oscura para que sobrevivan a la cámara de partida.

## Veredicto
- Garaje (vista cercana): +1, mejora visible en identidad pero no alcanza el umbral de +2; con la regla del rojo, no se sostiene.
- Cámara de partida (lejos): no; lo único que se distingue es un rojo que la dirección de arte reserva a enemigos.
- Export de i10: **no se sostiene** (+1 < +2).

## Límites de esta evaluación
Solo imágenes estáticas de 256 px y 48 px; no vi el auto en movimiento, con desgaste ni con la iluminación de día de la partida (las vistas son de la sonda). No vi las vistas frontal y trasera de i10 por separado (sí en la hoja). La diferencia de 1 punto está dentro del ruido entre evaluadores; el factor decisivo para mí es el rojo.
