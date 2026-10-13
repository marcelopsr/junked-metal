# Relevo para Gemini / Antigravity (2026-10-13, de Claude Code)

Reglas generales del repo para Gemini: `GEMINI.md` (raíz). Problemas ajenos a esta tarea: anotarlos en `docs/PRODUCT_EVOLUTION.md`, no arreglarlos de paso.
Al terminar una tanda, dejar un relevo nuevo con `plantillas/RELEVO.md` y una línea en `BITACORA.md` (así Claude o ChatGPT retoman).

## Estado

- Sistema completo y funcionando: genes en `src/car_genes.ts`, genoma elegido por auto en `src/car_genes.json`, sonda
  `src/evo_probe.ts` (página `?evo`), orquestador `scripts/evo.mjs` (`npm run evo`), núcleo DE + NSGA-II `scripts/evo/ga.mjs`.
- Autos con genes: buggy, monster, formula, tanque, carrera, axel, helado. Faltan 10: combi, hover, topadora, triciclo,
  murcielago, misterio, clasico, jeep, moto, monopatin (sus carrocerías están en `carHull`, `src/folded_slice.ts`).
- Exportados al juego: **buggy** (i190, corrige el clipeo de ruedas al doblar) y **monster** (i188, ruedas más grandes).
  El resto usa su diseño original.
- Último commit: `de23135`. Lecciones en `docs/EVO_VEHICULOS.md` (final): mejoras de ±2 puntos están en el ruido entre
  evaluadores; ajustar medidas da poco a la vista; lo que se nota pide piezas nuevas o color/material.

## Próximos pasos (elegir según el tiempo disponible)

1. **Helado, ronda 2** (lo más cerca de exportar): `npm run evo -- --car helado --pop 20 --gens 10 --seed 2 --sigma 0.25 --from 20261013-2030-s1`.
   Ambos evaluadores ya vieron mejora con el cucurucho más grande (gen `cucurucho` 1,2-1,35). Si conviene, subir el piso de
   `cucurucho` a 1,1 en `src/car_genes.ts` antes de correr.
2. **Seguir la flota** (combi, hover, …): parametrizar una rama de `carHull` por ciclo (ver "Cómo parametrizar").
3. **Piezas nuevas** (lo que piden los evaluadores): soportes visibles para alerones y cucurucho, llantas con aro de contraste,
   faldones o barras que se puedan agregar. Genes enteros (`int: true`) para cantidades.
4. **Calibración humana**: el usuario puntúa `docs/evo-colab/calibracion/PUNTAJES.md` (hojas en esa carpeta) y se ajustan las
   bandas (`BANDS`, `PUSH`, `autoBands` en `src/evo_probe.ts`) a su criterio.

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

Evaluar la hoja con la plantilla `docs/evo-colab/plantillas/EVALUACION.md` (Gemini puede mirar el PNG directamente) y
guardar la evaluación en `docs/evo-colab/evaluaciones/AAAA-MM-DD-<auto>-gemini.md`; anotar el resultado en `BITACORA.md`.
Consejo: evaluar en una conversación nueva que no haya visto rondas anteriores (los evaluadores se sesgan con lo que ya vieron).

## Cómo parametrizar un auto nuevo

1. En `src/folded_slice.ts`, dentro de `carHull`, rama del auto: reemplazar números por genes como "original + delta".
   Ejemplo: `G.box(1.1, 0.95, 1.45, ...)` → `G.box(1.1, q.caja_alto, q.caja_largo, ...)` y lo que dependía de esa medida se
   mueve con `+ (q.caja_alto - 0.95)`. `q = genome(kind)` ya está disponible en `carHull`.
   **Ojo:** la última rama (`else`, el autito "carrera") la usan también hover, topadora y triciclo: ya usa `original("carrera")`
   para ellos; al darles carrocería propia, agregar su rama antes.
2. En `src/car_genes.ts`, agregar `GENES.<auto>` con `g(componente, id, valorOriginal, min, max)` y `...RUEDAS` si tiene 4 ruedas
   (multiplicadores `rueda_k ≥ 1`, `trocha_k`, `batalla_k`; un eje: filtrar `batalla_k`).
3. Si un calco o anclaje del garaje depende de una medida (`SPOT`, `ANCH` en `src/models/cars.ts`), moverlo con el gen.
4. **Verificar identidad**: con el genoma original los vértices deben ser idénticos al código anterior. Forma práctica:
   `git stash` no sirve (hay otros cambios); usar un worktree del commit anterior con su propio servidor
   (`git worktree add ../rc_fight_head <commit>`, `cd ../rc_fight_head && npm run test:restart`, imprime el puerto) y comparar en
   ambas páginas `?mute&folded` el conjunto ordenado de posiciones de `carModel(kind, { fixed: true })` (redondeo 1e-4).
   Cerrar con `npm run test:down` en el worktree y `git worktree remove`.
5. Correr la evolución, evaluar, exportar si corresponde, commit.

## Trampas conocidas

- La primera evaluación de la página medía mal el color si la flota no estaba armada: ya resuelto (no tocar el orden en `evaluate`).
- `carModel("formula")` dejaba un alerón huérfano en la escena: ya resuelto.
- Si `npm run evo` pasa un argumento con espacios a `--car`, crea carpetas raras en `.evo/`: escribir los argumentos sueltos.
- El frente puede ser toda la población: hay ε-dominancia (`EPS` en `scripts/evo.mjs`).
- Genes nuevos sin variación en la siembra (`--from`) se perturban solos; no hace falta nada.
