# Primera muestra 3D cinematográfica — 2026-10-10

Escena real de Babylon para evaluar el traslado del arte aprobado a geometría 3D. Es una primera aproximación: todavía no alcanza el detalle ni la composición de las ilustraciones. No modifica los modelos activos, los modos de juego, la física ni el balance.

## Ver la muestra

- Desarrollo local existente: http://localhost:5173/art-lab.html
- `orbit-preview.mp4`: recorrido de 360° de ocho segundos, capturado del motor a 1280×720. El video tiene 12 cuadros por segundo por ser una captura reproducible; esa cadencia no es el rendimiento del juego.
- `preview-night.png`, `preview-day.png`, `preview-game.png` y `preview-phone.png`: capturas reales conservadas fuera del directorio temporal de pruebas.
- La página permite girar/acercar la cámara, alternar día/noche y comprobar las vistas cercana y desde arriba.

## Recursos y reproducción

`buggy.blend` y `frenchie.blend` son fuentes editables con texturas empaquetadas. Los GLB correspondientes están en esta misma carpeta y contienen los materiales. `build.py` reutiliza una copia del perro existente y el kit de autos, conservando los originales.

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/cinematic-3d/build.py
node scripts/cinematic-check.mjs
```

El script de verificación utiliza el Chromium headless Metal y las exclusiones del servidor rc-test existente. Guarda capturas, cuadros del video y resultados en `.shots/cinematic-3d/`; cierra el navegador al finalizar. No levanta servidores. Para regenerar el video con ffmpeg instalado:

```sh
ffmpeg -y -framerate 12 -i .shots/cinematic-3d/frames/%04d.png -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart assets-src/cinematic-3d/orbit-preview.mp4
```

El frenchie gris conserva siete clips: charge, death, idle, jump_slam, rage, run y walk. Tiene pecho marfil, orejas más compactas y ojos/cejas volumétricos. El buggy amarillo incorpora ruedas independientes, suspensión y jaula metálica; los detalles son reales y pueden verse alrededor del modelo.

`earth-albedo.png` fue generado mediante imagegen; el encargo se conserva en `earth-prompt.txt`. Se usa como color PBR, con un normal de micrograno procedural independiente: no existe un mapa de altura reconstruido de las piedras fotografiadas. Las otras tres PNG son horneados Blender del frenchie (albedo, normal y ORM).

## Evidencia y límites

TypeScript sin errores, 75 pruebas pasando y build correcto. `verification.json` conserva la prueba headless: carga, cuatro ruedas, siete clips con matrices finitas, movimiento del esqueleto en idle, controles, ausencia de errores y de desbordamiento horizontal en 1280×720 y 390×844. Se inspeccionaron las capturas de día/noche y distintos ángulos; no se revisó visualmente cada ataque completo.

La medición breve de la GPU Apple M4 Pro dio mediana 4,1 ms / p95 4,9 ms por cuadro en escritorio y 2,2 ms / p95 5,6 ms en viewport móvil. Incluye lectura GPU, 50 muestras después de 10 cuadros de calentamiento. Es una cifra orientativa de esta escena en esta Mac, sin afirmar aislamiento total de carga de otros procesos, rendimiento de un teléfono ni rendimiento de hordas. Los índices activos reportados incluyen pases de sombras/postproceso y no equivalen al total único del modelo.

`build-report.json` registra 46.878 triángulos del frenchie y 98.744 del buggy; ambos GLB suman 6.289.452 bytes. Es geometría de evaluación cercana, demasiado detallada para incorporarla directamente a multitudes. Las texturas todavía no están comprimidas para distribución web. El build estándar no incluye `art-lab.html` ni los recursos de esta carpeta, que no se guardan en `public/`. Esta tanda no se publica.

Pendientes visuales concretos: anatomía del frenchie y continuidad de sus volúmenes; pelo corto/material de piel; desgaste menos uniforme en el buggy; pasto curvo y variado; fondo y luz más próximos a la referencia. Eulalio, LOD, instancias compatibles con animación y la integración en los modos requieren otra tanda.
