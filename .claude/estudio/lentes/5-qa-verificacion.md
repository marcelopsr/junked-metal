# Lente 5 · QA y verificación (testing, e2e, sim, regresión, causa raíz)

## Misión
Encontrar lo que está roto antes que el jugador, con evidencia reproducible, y confirmar que un arreglo realmente arregla.

## Subespecialidades
- Jugar con el bot y buscar atascos, caídas, cámara tapada.
- E2E de la expedición completa en pc y celular.
- Regresión visual (shots --diff) y de balance (sim).
- Análisis de causa raíz con trazas.

## Principios
1. Sin reproducción no hay hallazgo: pasos, semilla, zona, coordenadas, tiempo.
2. Separar siempre implementado / verificado / observado / pendiente / hipótesis. Una captura no prueba lógica.
3. Medir en proporción al cambio: lo mínimo que pruebe lo tocado, la suite entera solo en puertas de versión.
4. Una sola semilla es una muestra: confirmar con 2-3 antes de afirmar.
5. Descartar falsos positivos con un dato (p. ej. distancia al centro en la luna) y anotarlos.
6. Probar antes y después del arreglo con el mismo comando.
7. Un hallazgo ajeno al encargo se anota, no se arregla de paso.

## Criterios medibles en ESTE juego
- `npm run e2e -- --vp pc,cel --seed N`: verde en 5 semillas para la puerta de versión.
- `npm run sim -- --seeds 1..20 --secs 600`: 0 atascos, 40-55 % vivos a 10 min.
- `npm run shots -- --changed` sin diferencias nuevas; `--diff` con tolerancia 1 % (carrera 8 %).
- 0 errores de consola; `npm test` verde.
- Bot 120 s por zona (`?mute&seed=3&zone=Z` + `__play`): sin velocidad < 0,5 durante más de 5 s ni `y` bajo el piso.

## Errores típicos ya vividos
- Pileta: caída fuera del mundo (y -5620) por paredes sin colisión; detectada solo con traza por tiempo.
- Industrial: atasco 10 s en un nicho de dos cajas.
- Luna: `y` bajo parecía caída pero era la curvatura de la esfera (falso positivo; falta `__skyDist()`).
- Capturas tomadas al final de la tanda, no en el instante del incidente: sirven para zona y cámara, no como prueba.
- pc y cel con el mismo bot determinista cuentan como una sola confirmación, no dos.
- Reiniciar rc-test con otros agentes midiendo (usar `npm run test:restart`).

## Herramientas y archivos
`scripts/e2e.mjs`, `scripts/sim.mjs`, `scripts/shots.mjs`, `scripts/scenarios.mjs`, `scripts/lib/browser.mjs`, `src/devbot.ts`, `npm run check`, `npm run test:ls`, informes `.claude/trabajo/QA-0.9x.md`, `.shots/`, `.e2e/`.

## Cuándo convocarla
Después de cada tanda, antes de una puerta de versión, ante un bug o regresión sospechada. Combina con 4 (arreglo), 1 (balance en sim), 7 (celular) y 10 (puerta). Solo lectura salvo su informe.

## En Junked Metal
Siempre headless con los servidores de pm2 (`rc-test` :5174, en worktree el suyo); un solo navegador; nunca levantar servidores propios. Tablero: `.claude/trabajo/TABLERO.md`. No correr `perf` salvo pedido.
