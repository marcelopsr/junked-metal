# Evaluación: monster, corrida 20261014-0150-s10 (jaula y escapes corregidos tras la reversión)

- Fecha: 2026-10-14
- Evaluador: claude (un solo evaluador; el vigente anterior i188 se restauró primero)
- Material visto: `2026-10-14-monster-s10-hoja.png` (copia de `hoja-limpia.png`; la fila "original" lleva las piezas por los pisos de gen, el vigente es i188 limpio; más i349, i343, i241) y vistas de `img/` de i349 (juego, lejos).
- Contexto: i10 (s5) se revirtió a i188 porque el segundo evaluador dio +1. Motivos: jaula roja (prohibida para el jugador), plana, sin anclaje; escapes invisibles a 48 px. Correcciones en `carHull("monster")`: jaula de caño amarillo `#f5b91b` con parantes que bajan hasta la caja (zapata de acero en cada pie), riel de techo, diagonal y travesaños; escapes de 0,16 de diámetro (antes 0,07), plata claro, collar y boca oscuros más anchos. Todo `strut`/`G.cyl` dentro de la malla fusionada.
- Corridas: s9 (pisos jaula >= 0,2 y escape >= 0,38, pop 20, 10 gens) y s10 (`--from` s9, pop 24, 14 gens). Pisos temporales, quitados al exportar.

## Puntajes (1 a 10)

| Variante | Silueta | Proporciones | Integración | Identidad | Folded | Total /50 |
|---|---|---|---|---|---|---|
| vigente (i188) | 7 | 6 | 7 | 7 | 6 | 33 |
| i349 | 8 | 7 | 8 | 8 | 7 | 38 |
| i343 | 8 | 6 | 8 | 8 | 7 | 37 |
| i241 | 8 | 6 | 8 | 8 | 7 | 37 |

Misma escala que `2026-10-14-monster-s5-claude.md` (vigente 33).

## Ganadora
i349 (+5 sobre el vigente i188). Métricas: legibilidad 0,115 (vigente 0,121), proporciones 0,455 (vigente 0,32; original verdadero 0,61), costo 1,095 (triángulos +9,5 %), parecido a la flota 0,565, todas las restricciones cumplidas. Ruedas +19 %, jaula 0,21, escapes 0,41.

## Defectos
- Proporciones peor que el vigente por la métrica (0,455 contra 0,32): la masa alta de jaula y escapes pesa en la silueta lateral; a la vista no molesta.
- A 48 px (`lejos`) la jaula es una mancha amarilla y los escapes dos puntos claros: leen mejor que en i10 pero son de uno o dos píxeles. La lectura real está en garaje y cámara de partida.
- En la vista superior la jaula son líneas finas y los parantes puntos naranjas a los lados.
- Los amortiguadores del monster siguen rojos (anteriores a este ciclo; no se tocaron).
- Las imágenes `img/` de i349 se generaron antes de aclarar el color de los escapes (de acero oscuro a plata); la hoja comparativa sí es posterior.

## Veredicto
- Garaje: sí, la jaula amarilla anclada se lee como estructura y no como adorno plano.
- Cámara de partida: sí, moderado.
- Exportado i349 (+5, mínimo exigido +2 sobre i188). **Pendiente segundo voto** de un evaluador independiente.

## Límites
Un solo evaluador; sin prueba en movimiento ni en `shots`. El puntaje del vigente es relativo a esta hoja.
