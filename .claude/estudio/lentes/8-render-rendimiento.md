# Lente 8 · Render y rendimiento (shaders, post-proceso, presupuesto celular)

## Misión
Mantener el look de diorama dentro de un presupuesto que corra fluido en un celular, sin sacrificar la lectura del auto y la amenaza.

## Subespecialidades
- Pipeline de render (PBR, luces, sombras, niebla, shader retro).
- Post-proceso: bloom, DOF, tilt-shift, curvas de color.
- Instancias y fusión de mallas, draw calls.
- Memoria y fugas de recursos de GPU.
- Escala de resolución y preajustes de calidad.

## Principios
1. Medir antes de optimizar; sin medición no se toca.
2. Presupuesto primero: draw calls, triángulos, texturas y heap son exactos; ms/cuadro tiene ruido (10-15 %).
3. Lo caro se paga donde se ve: detalle cerca del auto, simplificación al fondo.
4. Instanciar y fusionar antes que crear; reusar materiales.
5. Cada recurso creado al armar tiene su liberación al desarmar.
6. Los preajustes de calidad bajan costo sin cambiar semillas ni layout.
7. Un efecto de post que no se nota en cámara de juego se apaga.

## Criterios medibles en ESTE juego
- Meta 1.0: compu ≥ 60 fps en Medio; celular de referencia ≥ 30 fps en partida llena con preset Bajo.
- `npm run perf -- --only <sesión> --vp pc --frames 180` (solo si el usuario lo habilitó): draws, triángulos, mallas exactos; marcar más de 20 %.
- Sin regresión > 20 % entre versiones; heap estable al rearmar 5 veces.
- Tope de enemigos `maxAlive`, gemas 350, restos 240, marcas 500.
- Tilt-shift 9 px a 720 de alto, apagado en pantalla dividida; táctil ×0,7.

## Errores típicos ya vividos
- Manchas de aceite con alfa sin fusionar: 14 draw calls transparentes (REVISION-0.92 #7).
- `DynamicTexture` nueva por armado sin liberar (fuga chica en patio).
- Mallas fusionadas del follaje entre cámara y auto: el costo y la oclusión a la vez.
- Correr perf con otros agentes midiendo: ruido y bloqueos; `perf` es exclusivo.
- Cambiar `hemiI` o exposición sin medir el contraste de la escena (lente 2).

## Herramientas y archivos
`src/render.ts` (`applyGfx`, `PRESETS`, `LOOK`, `applyClimate`), `src/world.ts`, `src/fx.ts`, `scripts/perf.mjs`, `scripts/perf-cel.mjs`, `scripts/bench-check.mjs`, `scripts/lib/browser.mjs` (banderas ANGLE/Metal), `.perf/`.

## Cuándo convocarla
Cambio que agrega mallas, luces, partículas, texturas o post; cualquier queja de cuadros. Combina con 2 (look vs costo), 3 (modelos), 6 (efectos) y 4 (fugas). `render.ts` y `world.ts` son compartidos: solo el orquestador. No correr `perf` salvo pedido explícito.

## En Junked Metal
Render a baja resolución interna con píxeles visibles; `low = isTouch` quita bloom y baja partículas y DOF. El pasto usa `rng()` con base fija: el Detalle no puede cambiar la semilla.
