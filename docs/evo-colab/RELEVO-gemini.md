# Relevo para la flota de vehículos (2026-10-13, actualizado por Gemini)

Reglas generales del repo: `GEMINI.md` (raíz). Problemas ajenos a esta tarea: anotarlos en `docs/PRODUCT_EVOLUTION.md`, no arreglarlos de paso.
Al terminar una tanda, dejar un relevo nuevo con `plantillas/RELEVO.md` y una línea en `BITACORA.md` (así Claude o ChatGPT retoman).

## Estado

- **Flota 100% parametrizada (17/17 autos con genes propios en `src/car_genes.ts` y ramas en `src/folded_slice.ts`):**
  buggy, monster, formula, tanque, carrera, axel, helado, combi, hover, topadora, triciclo, murcielago, misterio, clasico, jeep, moto, monopatin.
- **Independización de ramas:** hover, topadora y triciclo cuentan con carrocería procedimental Folded propia (independizados del fallback de carrera). La rama `else` queda exclusivamente para `carrera`.
- **Helado ronda 2 evaluada (`20261014-0046-s2`):**
  - Corrida completada con éxito (`--car helado --pop 20 --gens 12 --seed 2`).
  - Evaluación visual registrada en `docs/evo-colab/evaluaciones/2026-10-13-helado-gemini.md`.
  - Veredicto: ninguna variante supera al original (34 vs 36). El soporte de cucurucho y el cucurucho grande funcionan bien, pero el frente de Pareto redujo la altura de la caja (`caja_alto` a 0.848, −40.9% en rango), perdiendo la silueta reconocible de furgón de helados.
  - Corrección paramétrica: piso de `caja_alto` fijado en 0.9 en `src/car_genes.ts` (`g("carroceria", "caja_alto", 0.95, 0.9, 1.05)`) para preservar la proporción original sin aplastamiento.
- **Test de regresión geométrica:** suite automatizada en `test/car_genes.test.ts` verificando que los 17 genomas en `def` cumplan `min <= def <= max`, sin IDs duplicados y con valores finitos.
- **Exportados al juego:** **buggy** (i190, corrige el clipeo de ruedas al doblar) y **monster** (i188, ruedas más grandes). El resto usa su diseño original intacto.
- Lecciones en `docs/EVO_VEHICULOS.md`: mejoras de ±2 puntos están en el ruido entre evaluadores; ajustar medidas da poco a la vista; lo que se nota pide piezas nuevas (como el soporte del cucurucho) o color/material.

## Próximos pasos (elegir según el tiempo disponible)

1. **Helado, ronda 3** (con piso de `caja_alto` protegido en 0.9): correr `npm run evo -- --car helado --pop 20 --gens 10 --seed 3 --sigma 0.2` para buscar cucurucho y ruedas óptimas sin aplastar el cuerpo.
2. **Correr evolución visual en los autos recién independizados**:
   - `combi` (`npm run evo -- --car combi --pop 20 --gens 10 --seed 1`)
   - `hover` (`npm run evo -- --car hover --pop 20 --gens 10 --seed 1`)
   - `topadora` (`npm run evo -- --car topadora --pop 20 --gens 10 --seed 1`)
   - `triciclo` (`npm run evo -- --car triciclo --pop 20 --gens 10 --seed 1`)
3. **Piezas nuevas**: llantas con aro de contraste, faldones o barras adicionales con genes enteros (`int: true`).
4. **Calibración humana**: el usuario puntúa `docs/evo-colab/calibracion/PUNTAJES.md` (hojas en esa carpeta) y se ajustan las bandas (`BANDS`, `PUSH`, `autoBands` en `src/evo_probe.ts`) a su criterio.

## Ciclo (cada paso es un comando)

```
npm run test:restart            # tras cambiar código; esperar ~12 s
npm run evo -- --car <auto> --pop 20 --gens 10 --seed 1            # o --from <corrida> para seguir una anterior
# mirar .evo/<auto>/<corrida>/hoja.png (filas: original, vigente, finalistas; columnas: cámara de partida, 3/4, trasera, lateral, lejos)
npm run evo -- --car <auto> --hoja <corrida> --ids iA,iB           # rehacer una hoja con variantes elegidas
npm run evo -- --car <auto> --export <corrida> --id iNN --motivo "por qué"   # llevarla al juego
npm run evo -- --car <auto> --reset                               # volver al original
npm run evo -- --calibrar                                         # hojas de toda la flota en docs/evo-colab/calibracion/
npx tsc --noEmit -p . && npm test && git commit                    # cerrar el ciclo (sin push)
```

Evaluar la hoja con la plantilla `docs/evo-colab/plantillas/EVALUACION.md` y guardar la evaluación en `docs/evo-colab/evaluaciones/AAAA-MM-DD-<auto>-gemini.md`; anotar el resultado en `BITACORA.md`.
