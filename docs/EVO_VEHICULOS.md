# Evolución de vehículos (diseño generativo)

Sistema para que la geometría de los autos mejore por generaciones sin rediseñarlos a mano. Combina un algoritmo evolutivo
multiobjetivo (evolución diferencial + selección de Pareto NSGA-II) con un ciclo **evaluador-optimizador**: las métricas
automáticas filtran y ordenan, un evaluador visual (agente con contexto fresco) juzga lo subjetivo y retroalimenta la
corrida siguiente, y la persona tiene la última palabra con el reporte comparativo.

## Módulos

| Responsabilidad | Dónde |
|---|---|
| Generación paramétrica (genes por auto: rango, valor original, componente) | `src/car_genes.ts` (`GENES`, `genome()`); la geometría los lee en `buggyHull` (`src/folded_slice.ts`) y en las ruedas/alerón/anclas de `carModel` (`src/models/cars.ts`) |
| Genoma elegido de cada auto (lo que usa el juego) | `src/car_genes.json` (vacío = todos los autos con su diseño original) |
| Mutación (DE/rand/1/bin), cruce (binomial y uniforme), selección (NSGA-II elitista), rodilla, diferencias | `scripts/evo/ga.mjs` (+ `ga.test.mjs`) |
| Evaluación geométrica, de siluetas y vistas PNG | `src/evo_probe.ts` (página `?evo`, solo dev) |
| Orquestación, persistencia, comparación (HTML) y exportación (genoma + OBJ) | `scripts/evo.mjs` (`npm run evo`) |
| Historial versionado de corridas y exportaciones | `evo/historial.json` |
| Corridas completas (todos los individuos, métricas, PNG, OBJ, reporte) | `.evo/<auto>/<corrida>/` (no se versiona; se regenera con la misma semilla) |

## Uso

```
npm run evo -- --car buggy --pop 20 --gens 12 --seed 1      # corre; reporte en .evo/buggy/<corrida>/index.html
npm run evo -- --car buggy --pop 20 --gens 8 --seed 2 --from <corrida>   # siembra con el frente de una corrida anterior
npm run evo -- --car buggy --export <corrida> [--id iNN] --motivo "..."  # lo lleva al juego (src/car_genes.json)
npm run evo -- --car buggy --reset                          # vuelve al diseño original
```

Corre contra `rc-test` (`npm run test:restart` tras cambios de código). Una evaluación tarda ~40 ms; las vistas, ~4 s por variante.

## Representación

Cada gen es una medida que antes estaba escrita a mano (`def` = ese número). El genoma original reproduce el modelo
**exacto** (verificado: huella de vértices idéntica a 0,1 mm en los 17 autos contra el código anterior). Las fórmulas se
escriben como "valor original + delta" para que eso se mantenga. Los rangos son los únicos límites de mutación: no hay
mutaciones arbitrarias. Las piezas dependientes se mueven juntas (guardabarros, brazos y amortiguadores siguen a la
trocha y la batalla; paragolpes y faros siguen al frente de la trompa; el piloto sigue a la butaca; el calco del capó sigue
al alerón de serie). El colisionador de Havok (`CARS[k].size`) no cambia: la evolución es visual.

Genes del buggy (32): chasis (`stance`, `piso_largo`), carrocería (`tina_*`), capó (`trompa_*`), cabina/jaula (`jaula_*`),
motor, escapes, guardabarros, suspensión, ruedas (`rueda_d`, `rueda_w`, `trocha`, `batalla`), faros, paragolpes, alerón.

## Evaluación

Todo se mide sobre el auto **real** que arma `carModel` (piloto y alerón de serie incluidos; sin las antenas, que son fijas).

**Objetivos** (todos a minimizar, separados: una mejora no puede comprarse sacrificando otro aspecto, se usa dominancia de Pareto):

1. **Pérdida de legibilidad**: siluetas lateral, frontal y 3/4 rasterizadas a 128 px; se bajan a 16 px (celda llena si cubre ≥ 50 %),
   se vuelven a subir y se compara (IoU). Mide cuánto de la forma sobrevive a la distancia de la cámara de partida.
2. **Error de proporciones**: distancia fuera de banda (normalizada por el ancho de la banda) de:
   | Medida | Banda | Por qué |
   |---|---|---|
   | Ruedas visibles de costado | 0,60–0,85 | Un RC se lee por sus ruedas grandes y expuestas |
   | Stance (diámetro de rueda / alto total) | 0,60–0,75 | Juguete chato y "pisador" (el original da 0,59) |
   | Masa visual (centroide lateral, en semibatallas) | −0,30 a −0,02 | Motor trasero: el peso se lee atrás |
   | Llenado lateral (área / caja) | 0,42–0,62 | Menos = flaco y ruidoso; más = ladrillo |
   | Alto / largo | 0,48–0,60 | Proporción de buggy, no de camioneta |
   Las bandas son juicio de diseño explícito: se revisan con el evaluador visual y se ajustan acá (`BANDS` en `evo_probe.ts`).
3. **Costo de render**: triángulos / triángulos del original.
4. **Parecido a la flota**: IoU lateral máxima contra los otros 16 autos (menos = más identidad propia).

**Restricciones duras** (si no se cumplen, la variante pierde contra cualquier factible; regla de Deb):
identidad (IoU contra el original ≥ 0,75 lateral y superior, ≥ 0,80 frontal), choques rueda-carrocería (puntos dentro de la
goma, con las delanteras dobladas ±0,45 rad como en `car.ts`; no más que el original), despeje ≥ 0,25 m, caja (ancho ≤ +6 %,
largo ≤ +8 %, alto ≤ +0,15 m), triángulos ≤ +30 %, piezas sueltas (componentes conexas en vóxeles de 3 cm: no más que el
original), errores (NaN, triángulos degenerados nuevos).

**Elección**: rodilla del frente final factible (menor distancia al punto ideal normalizado), solo entre las variantes que
mejoran al original en legibilidad o proporciones sin empeorar costo (> 10 %) ni identidad de flota (> 0,02). Después,
el evaluador visual puntúa original y frente (legibilidad, proporciones, integración, identidad, coherencia Folded) y
puede elegir otra variante del frente o vetar todas; su retroalimentación orienta la corrida siguiente (`--from`).

## Vistas y comparación

Por variante mostrada (original, rodilla de cada generación, frente final): frontal, lateral, trasera, superior, 3/4
(256 px, ortográficas, materiales reales) y "a lo lejos" (3/4 a 48 px). `index.html` las pone lado a lado con los objetivos
(verde = mejor que el original) y los genes que cambiaron por componente. El elegido y el original se exportan a OBJ.

## Límites conocidos

- Solo el buggy tiene genes por ahora; sumar otro auto = parametrizar su rama de `carHull` igual (valor original + delta),
  agregar sus genes en `GENES` y sus bandas en `BANDS`, y verificar la huella de vértices contra el código anterior.
- La cantidad de triángulos casi no varía: los genes son de forma, no de complejidad (agregar genes enteros de cantidad
  de placas/barras si hace falta explorar eso).
- Las bandas de proporción y los umbrales son juicio de diseño, no verdades: la evaluación visual y la persona los corrigen.
- La legibilidad es un proxy geométrico (siluetas); no ve color ni material.

## Primer ciclo: buggy (2026-10-13)

| Ronda | Corrida | Evaluados | Qué cambió en el proceso | Mejor visual (puntaje /50, original 32) |
|---|---|---|---|---|
| 1 | 20261013-1814-s1 | 260 (20×13) | base | i226: 34. La rodilla de la métrica (i258) dio 31: peor que el original |
| 2 | 20261013-1819-s2 | 220 | más diversidad, vista de cámara de partida, rangos de alerón/bañera/jaula ajustados | i205: 34; "no se nota en partida" |
| 3 | 20261013-1825-s3 | 312 | ε-dominancia (el frente era toda la población), genes traseros nuevos | i205: 36; los genes nuevos no variaban (fallo de siembra) |
| 4 | 20261013-1832-s4 | 312 | siembra que perturba genes sin variación, banda de ancho de alerón | **i192: 38, exportado** |

i192 contra el original: proporciones 0,375 → 0 (error de banda), parecido a la flota 0,665 → 0,63, triángulos 4012 → 3988,
puntos de la bañera que entran en la goma al doblar 242 → 140, despeje 0,39 → 0,40; pérdida de legibilidad 0,165 → 0,18 (peor
según el proxy; el evaluador visual la juzga mejor desde la cámara de partida porque el motor trasero ahora se lee).
Componentes: bañera más alta y larga, motor trasero más ancho y alto, guardabarros más grandes y envolventes, alerón 26 % más
angosto. Pendiente: el alerón sigue cruzando casi todo el ancho en la vista de partida; la banda no alcanzó para achicarlo.

## Ciclo 2: evaluador (2026-10-13)

- **Color:** `pintura_visible` = % de píxeles del auto con el tono de su pintura de fábrica, render real desde la cámara de
  partida a 48 px; banda 0,22–0,45 (el original da 0,18). Desmintió una impresión visual: i192 no era "más roja" (0,171).
- **Hoja comparativa** (`hoja.png` en cada corrida): filas original, vigente (lo que usa el juego) y hasta 7 finalistas
  elegidas lejos entre sí en genes; columnas cámara de partida, 3/4, trasera, lateral y "lejos" (48 px ampliados sin
  suavizar); debajo, % de rojo, objetivos y los 3 genes que más cambiaron. El evaluador la prefiere: ve diferencias de 2-3 px
  en una sola lectura en vez de ~30 PNG.
- **Validación (20261013-1851-s5):** i190 reemplaza a i192 (evaluador 39 vs 38; original 32): primera variante con el alerón
  dentro de la trocha en la cámara de partida; pintura visible 0,201. Exportada.
- Pendiente: fondo con piso en las vistas (el negro de las ruedas se funde), requiere otra detección de fondo para el color.
