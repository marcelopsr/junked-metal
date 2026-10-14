# Evaluación: helado, corrida 20261014-0108-s3 (segunda, independiente)

- Fecha: 2026-10-14
- Evaluador: claude (segundo evaluador, contexto fresco; puntuó antes de leer la primera evaluación)
- Material visto: `hoja.png`, y en `img/` las vistas tres_cuartos, juego, frontal, trasera, lateral y lejos de i0 e i252 (más las filas i228, i256, i194, i242 de la hoja).
- El "vigente" de la hoja es el original (el helado no tiene exportación).

## Puntajes (1 a 10)

| Variante | Silueta | Proporciones | Integración | Identidad | Folded | Total /50 |
|---|---|---|---|---|---|---|
| original (i0) | 6 | 6 | 7 | 8 | 6 | 33 |
| vigente | 6 | 6 | 7 | 8 | 6 | 33 |
| i228 (rec) | 6 | 6 | 7 | 7 | 6 | 32 |
| i194 | 7 | 6 | 6 | 7 | 6 | 32 |
| i242 | 6 | 6 | 7 | 7 | 6 | 32 |
| i252 | 7 | 7 | 7 | 8 | 6 | 35 |

## Ganadora
i252 (+2 contra el original): la caja sube y la cabina baja, así el cuerpo se lee como furgón de helados y no como camioneta; el cucurucho (escala 1,12, soporte de chapa visible) es lo que sobresale en la vista de partida y a 48 px.

## Defectos
- i252: la caja alta baja el stance (0,237 a 0,218), las ruedas se ven algo más chicas contra el volumen; es el costo de la mejora y por eso Proporciones sube solo 1. El toldo rosa queda más delgado que en el original. En las vistas lateral y trasera de la sonda la punta del cucurucho se corta por el encuadre (altura total 2,78 a 3,02 m): artefacto de la sonda, no de la geometría.
- i228 (la recomendada por la métrica): cabina muy baja y toldo ancho, pierde identidad (identidad 0,906 contra 0,929 de i252) sin ganar en la cámara de partida.
- i194: cucurucho grande pero toldo +41 % lo recarga; se ve desordenado de frente.
- Folded: ninguna variante agrega piezas ni materiales; el cambio es de medidas, sigue sin distinguirse a ojo en el material.

## Retroalimentación para la próxima corrida
- `cucurucho`: probar 1,2 a 1,3 con `cucurucho_soporte` 0,08 a 0,1; es la ganancia más visible.
- `caja_alto`: mantener 1,0 a 1,05, ya no hay riesgo de aplastarla con el piso en 0,9.
- Piezas nuevas (no medidas): una rejilla de ventanilla de venta, un letrero o luces de techo darían lectura Folded que las medidas no dan.

## Veredicto
- Garaje (vista cercana): sí (+2), mejora real pero modesta.
- Cámara de partida (lejos): sí, apenas; el cucurucho más grande es lo único distinguible a 48 px.

## Límites de esta evaluación
Solo imágenes estáticas de 256 px y 48 px; no vi el juego en movimiento ni con el desgaste (`wear`) aplicado. La mejora de +2 está en el borde del ruido entre evaluadores (la primera evaluación dio +3, esta +2): se exporta por coincidir ambos en la misma variante y el costo es nulo (triángulos 4036, sin cambios).
