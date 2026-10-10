# Junked Metal — Primera escena 3D cinematográfica

2026-10-10. El usuario autorizó continuar la producción y usar los recursos locales de la Mac. Objetivo: aproximar el acabado de `assets-src/intro/cinematic-v1/` mediante geometría y materiales reales en Babylon.

## Tanda autorizada

- Banco local independiente en `art-lab.html`, servido por Vite/pm2 existente. No entra en el build publicado ni en las partidas.
- Buggy amarillo completo, ruedas con relieve, suspensión, metal, desgaste y piloto. Frenchie gris orgánico, pecho marfil y musculatura moderada, reutilizando el esqueleto y clips del `.blend` existente en una copia nueva.
- Suelo de tierra, vegetación instanciada, cerca y luces del patio. Materiales PBR, sombras y resolución nativa; cámaras cercana, orbital y de evaluación desde arriba; día y noche.
- Fuente reproducible Blender, `.blend` nuevos, GLB y texturas horneadas. Capturas reales del motor y medición de cuadros de esta escena en la GPU de la Mac.

## Límites e invariantes

No cambia física, IA, balance, guardado, controles de partidas ni modelos activos Folded. Los recursos existentes se conservan. La lámina es una referencia de acabado, no geometría reconstruida automáticamente. La escena no demuestra rendimiento de hordas ni de dispositivos móviles reales. Eulalio y la integración en los modos quedan para una tanda posterior al evaluar esta muestra.

Archivos propios: `art-lab.html`, `src/art_lab.ts`, `assets-src/cinematic-3d/`, script headless de esta muestra y documentación de esta tanda. Archivos concurrentes excluidos: `src/models.ts`, `src/ui.ts`, `src/hud.css`, `src/menu.css`, `src/sfx.ts`.

## Verificación al cerrar

`npx tsc --noEmit -p .`, `npm test`, `npm run build`; un Chromium headless con Metal, contra pm2 `rc-test` :5174. Capturas pc 1280×720 y cel 390×844; vistas a 0/90/180/270°, día, noche y cámara de juego. Comprobar carga de GLB, animaciones, cambios de cámara/luz, errores y desbordamiento. Medir CPU+GPU con dibujo detenido, paso fijo y lectura GPU; reportar cifras de la escena, sin extrapolar a teléfonos o partidas. Navegador cerrado al finalizar. Commit local, sin publicación.

## Resultado de la primera tanda

Banco funcional, Blender editables, dos GLB completos y texturas PBR. Frenchie 46.878 triángulos y siete clips conservados; buggy 98.744 triángulos y cuatro ruedas independientes. Tierra generada mediante imagegen y normal de grano independiente. Capturas y video orbital reales en `assets-src/cinematic-3d/`, con procedimiento y límites en su `README.md`.

Validación: tsc correcto, 75 pruebas pasando, build correcto; headless Metal en pc/cel sin errores ni desbordamiento, esqueleto animado y matrices finitas de siete clips. Mediana orientativa de cuadro en M4 Pro: 4,1 ms a 1280×720 y 2,6 ms a 390×844; no es una prueba de teléfono físico ni de hordas. El navegador se cerró al terminar.

La muestra aún se ve más simple que el arte aprobado. Refinar anatomía/pelo, vegetación curva, desgaste localizado y composición de luz antes de declararla objetivo alcanzado. No se integra todavía en las partidas. El build estándar no contiene la página de evaluación ni sus recursos, guardados fuera de `public/`.

## Continuidad entre sesiones

El usuario autorizó el 2026-10-10 aprovechar los ciclos de Gemini y continuar esta línea en futuras sesiones de Codex. `docs/VISUAL_SESSION_COORDINATION.md` fija propiedad de archivos, encargos independientes, entrega verificable y prompts listos. Las carpetas `gemini-*` se reservan al tomar un encargo; Codex conserva el ensamblaje del banco. No se considera que un encargo esté corriendo solo por figurar en la tabla.
