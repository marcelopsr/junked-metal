# Evaluación: tanque, corrida 20261014-0314-s2 (antena con banderín y cajas de herramientas)

- Fecha: 2026-10-14
- Evaluador: claude (único)
- Material visto: `2026-10-14-tanque-s2-hoja.png` (copia de `hoja-limpia.png`: original y vigente verdaderos, que son iguales porque el tanque no estaba evolucionado, más i124, i187, i217; las filas de variantes llevan las piezas).
- Piezas nuevas (valor 0 = sin pieza): `antena_alto` (antena de RC con base oscura, banderín naranja y punta de acero atrás del casco) y `cajas_herr` (una caja de herramientas amarilla con tapa de acero y manija sobre cada faldón de oruga). Armadas en `carHull("tanque")`, dentro de la malla fusionada.
- Corridas: s1 (descartada: la punta esférica de la antena daba 32 triángulos degenerados, `errores` 3,2 en todo individuo con antena; se cambió por un cubo) y s2 (pop 20, 10 gens, semilla 2) con pisos temporales `antena_alto` >= 0,4 y `cajas_herr` >= 0,12, quitados al exportar (rangos 0 a 0,9 y 0 a 0,22). Bandas ensanchadas en `PUSH` (`masa_alta` 1,9x, `alto_largo` +15 %).

## Puntajes (1 a 10)

| Variante | Silueta | Proporciones | Integración | Identidad | Folded | Total /50 |
|---|---|---|---|---|---|---|
| vigente (= original) | 6 | 7 | 7 | 6 | 6 | 32 |
| i124 | 7 | 7 | 7 | 7 | 7 | 35 |
| i187 | 7 | 7 | 7 | 8 | 7 | 36 |
| i217 | 7 | 7 | 7 | 8 | 7 | 36 |

## Ganadora
i187 (+4 sobre el vigente): antena 0,6, cajas 0,18, cañón 1,09. Métricas: legibilidad 0,145 contra 0,14, proporciones 0, costo 1,02 (triángulos +2 %), parecido a la flota 0,645; todas las restricciones cumplidas.

## Defectos
- La antena nueva convive con la antena roja de punta preexistente del carModel (anterior a este ciclo, no se tocó); se ven dos antenas.
- Las cajas se leen amarillas en 3/4 y desde atrás; de costado son una franja baja.
- La tapa de acero de las cajas, vista desde atrás, aparece como banda gris ancha en los faldones.
- Legibilidad apenas peor (0,145 contra 0,14): no relevante.

## Veredicto
Garaje: sí, las cajas amarillas y el banderín naranja dan identidad de juguete RC sin romper la silueta. Cámara de partida: sí, moderado. Exportado i187 (+4, mínimo exigido +2). **Pendiente segundo voto** de un evaluador independiente.

## Límites
Un solo evaluador; sin prueba en movimiento ni en `shots`.
