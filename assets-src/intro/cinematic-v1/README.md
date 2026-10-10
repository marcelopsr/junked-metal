# Junked Metal — Paquete cinematográfico de la intro, v1

2026-10-10 · Acabado elegido por el usuario después de ver el storyboard: **conservar el nivel de detalle cinematográfico, con escenas y personajes separados**. La intro puede tener más elaboración que el gameplay. Producción con la herramienta integrada `image_gen`, sin API/CLI alternativo. No está integrada en el juego.

Ampliación solicitada: **bulldog francés gris, mancha clara visible de frente en el pecho y físico algo musculoso**, presentado como otro jefe junto a Eulalio. Es un animal orgánico de pelo corto, con orejas erguidas y pose frontal; no lleva armadura ni accesorios. El montaje de rivales ahora incluye cuatro personajes bajo cuatro focos.

Subtítulo actualizado: **«Todo bajo control. De nadie. La garantía no cubre esto.»** La frase elegida por el usuario lleva un remate adicional propuesto en esta tanda; sustituye las referencias a duración, cantidad de jefes y Felipe en el montaje y en el texto de la intro del juego. El arte cinematográfico sigue sin integrarse.

## Ver el resultado

- [`index.html`](index.html): montaje estático local de las cuatro escenas; abrir desde esta carpeta dentro del repositorio. Reutiliza la fuente Rajdhani instalada en `node_modules/@fontsource/rajdhani`, sin red ni servidor nuevo.
- [`preview.png`](preview.png): captura del montaje de escritorio. No es una imagen única para reemplazar los recursos separados.
- [`prompts.json`](prompts.json): los once prompts exactos, transparencia solicitada y referencias utilizadas.
- [`assets.json`](assets.json): tamaños, peso y límites de contenido de cada PNG. Los límites se midieron sobre alpha > 16/255, no deben interpretarse como recorte exacto del pelo o de halos suaves.
- [`verification.json`](verification.json): comprobaciones efectuadas en esta tanda.

## Recursos fuente

| Archivo | Contenido | Transparencia | Uso previsto |
|---|---|---|---|
| `01-ring-fondo.png` | Patio, ring y guirnalda, sin cartel ni personajes | No | Momento 1, base del cartel |
| `02-rivales-fondo.png` | Patio con tres focos y suelo despejado | No | Versión anterior conservada; no se usa en el montaje actual |
| `02-rivales-fondo-v2.png` | Mismo patio con cuatro focos | No | Momento 2, cuatro rivales a 20/40/60/80 % del ancho |
| `03-entrada-fondo.png` | Patio y suelo libre, sin buggy ni polvo | No | Momento 3, entrada y frenada del auto |
| `04-cierre-fondo.png` | Cerca, pasto y cielo libre para el título | No | Momento 4, auto pequeño, faro y ojos |
| `05-hormiga.png` | Hormiga naranja, cuerpo y seis patas completos | Sí | Rival izquierdo; imagen independiente |
| `06-escarabajo.png` | Escarabajo verde con antena angular | Sí | Rival central; imagen independiente |
| `07-eulalio.png` | Gato naranja orgánico, patas, bigotes y cola | Sí | Tercer rival, junto al frenchie; imagen independiente |
| `08-buggy.png` | Buggy amarillo, piloto y faros; acentos de metal/cian | Sí | Entrada y cierre, reutilizado a distinta escala |
| `09-cartel.png` | Cartel metálico doble sin letras | Sí | Momento 1, textos superpuestos por separado |
| `10-frenchie-gris.png` | Jefe bulldog francés gris, pecho con mancha marfil y musculatura moderada | Sí | Cuarto rival junto a Eulalio, pose frontal |

Los cinco fondos fuente (cuatro en uso y la versión anterior de rivales) miden **1672×941** (relación casi 16:9); los seis recortes conservan sus proporciones nativas. El frenchie mide **1263×1246** y tiene transparencia real. Total de los once PNG: **21.364.157 bytes**, unos 21,36 MB; los diez recursos usados por el montaje suman **19.171.701 bytes**, unos 19,17 MB. Son originales editables en composición, no archivos optimizados para descargar en el arranque del juego. `assets.json` marca qué archivos están activos.

## Montaje y continuidad

Las posiciones, escalas y sombras de `index.html` sirven como referencia visual de colocación. Los textos usan Rajdhani y no están horneados en los PNG: el título del juego y su subtítulo quedan como elementos independientes. Los rótulos `BACKYARD LEAGUE` / `BUGS ONLY` del montaje aplican la regla vigente de inglés en textos del mundo; el cartel permite cambiarlos sin regenerar el arte.

El buggy conserva la silueta de la lámina aprobada. Sus resortes son metálicos y la punta de antena cian para evitar acentos rojos del jugador. No se cambiaron los colores del modelo del juego. Los insectos mantienen la interpretación metálica de la muestra aprobada; Eulalio tiene pelaje. Estas ilustraciones son para la intro, no sustitutos de los modelos activos de Supervivencia o Carrera.

## Alcance real de las capas

- Personajes y cartel están separados de los fondos y tienen alpha real, incluyendo bordes parcialmente transparentes.
- Cada personaje viene en **una pose estática**, sin esqueleto, giro 360°, animación de patas ni ruedas independientes. Se puede animar entrada, posición, escala o rotación de la imagen; otros gestos requieren nuevos recursos o rig.
- Los fondos son **una imagen por escena**, con luces y vegetación horneadas. No constituyen un patio 3D ni capas de parallax reconstruidas por profundidad.
- El buggy conserva un halo suave de iluminación en el recorte. El montaje fue revisado sobre los fondos oscuros previstos; composiciones sobre fondos claros pueden requerir otro recorte.
- Haces, ojos y sombras de contacto del montaje son aproximaciones CSS para evaluar composición, no texturas adicionales finales. Polvo, chispas y movimiento no se produjeron en esta tanda.
- No se generó video ni geometría `.blend`/GLB. El acabado parece 3D pero estos archivos son raster 2D.

## Verificación realizada

Once PNG decodificados; cinco fondos opacos; seis recortes con transparencia real y sin píxeles de alpha > 16 en el borde del lienzo. Correspondencia exacta entre los once archivos y sus prompts. Montaje inspeccionado en Chromium headless local con la GPU Metal: escritorio 1280×720 y teléfono 390×844, once imágenes cargadas en cada uno (el buggy se usa dos veces), cuatro rivales y un único frenchie, sin errores de página/carga ni desbordamiento horizontal. Capturas de evidencia actuales en `.shots/investigacion-arte/cinematic-frenchie-{pc,cel}.png`; las capturas iniciales de tres rivales se conservan. Navegador cerrado al terminar.

La revisión cubre **el paquete y su montaje estático**. La intro real conserva `src/intro.ts`; no se probaron su reproducción con estos recursos, controles de salto ni rendimiento de carga. No se corrieron suites del juego porque no cambió su código. Antes de integrar: exportar imágenes de distribución con peso adecuado, decidir animación y manejo de carga, y verificar intro/salto/modo calmo/subtítulos en escritorio y teléfono según [`INTRO_ASSETS_PLAN.md`](../../../docs/INTRO_ASSETS_PLAN.md).

Cambio de subtítulo: `tsc`, 75 pruebas y build correctos. Intro real y montaje revisados a 1280×720 y 390×844, frase sin cortes ni desbordamiento y salida con Escape correcta; sin errores de página. Capturas en `.shots/subtitulo/`. Esta prueba de texto no implica integración del arte cinematográfico.
