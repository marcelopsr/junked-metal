# Evaluación: buggy, corrida 20261014-0306-s3 (barra de luces y snorkel)

- Fecha: 2026-10-14
- Evaluador: claude (único)
- Material visto: `2026-10-14-buggy-s3-hoja.png` (copia de `hoja-limpia.png`: original y vigente verdaderos, más i202, i215, i217; la fila "original" lleva las piezas por los pisos de gen).
- Piezas nuevas (valor 0 = sin pieza): `barra_luces` (caja amarilla con cuatro focos emisivos sobre el arco delantero de la jaula) y `snorkel_alto` (caño de acero al costado derecho con codo y toma oscura). Armadas en `buggyHull`, dentro de la malla fusionada.
- Corridas: s1 y s2 (pisos 0,07 y 0,25; s2 `--from` s1), s3 (`--from` s2, pisos 0,11 y 0,38). Bandas ensanchadas en `PUSH` (`masa_alta` 1,9x, `alto_largo` +15 %). Pisos quitados (rangos 0 a 0,14 y 0 a 0,5).

## Puntajes (1 a 10)

| Variante | Silueta | Proporciones | Integración | Identidad | Folded | Total /50 |
|---|---|---|---|---|---|---|
| vigente | 7 | 6 | 7 | 6 | 6 | 32 |
| i202 | 7 | 6 | 7 | 7 | 6 | 33 |
| i217 | 7 | 6 | 7 | 7 | 6 | 33 |
| i215 | 7 | 6 | 7 | 6 | 6 | 32 |

## Ganadora
i202 (+1 sobre el vigente). Métricas: legibilidad 0,188 contra 0,172 (peor), proporciones 0,80 contra 0,74, rueda_d 0,84.

## Defectos
- La barra de luces es una franja amarilla fina que se confunde con el techo amarillo del garaje; solo se distingue en la vista superior y desde atrás.
- El snorkel de acero oscuro sobre fondo oscuro casi no se lee a 48 px; en la vista lateral es un hilo gris.
- La evolución penaliza lo alto (legibilidad empeora ~10 % con las piezas) y no mejora ruedas ni proporciones.
- La carrocería roja es la pintura del jugador por defecto, no de las piezas.

## Veredicto
+1: no alcanza el mínimo +2. **No se exporta**; el buggy sigue con su genoma vigente. Las piezas quedan disponibles como genes (valor 0, sin efecto). Para una próxima vez: barra de luces más ancha que el arco y con color de contraste, snorkel con color claro.

## Límites
Un solo evaluador; sin prueba en movimiento.
