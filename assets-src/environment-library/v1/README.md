# Ambientación v1 — Junked Metal

2026-10-10. Tanda elegida por el usuario: cuatro recursos planos independientes con transparencia para enriquecer los materiales existentes. Generados con **imagegen integrado**; fuentes PNG de **1254 × 1254**, WebP a igual resolución, prompts exactos, catálogo `assets.json` y handoff. No requiere un proveedor concreto para reutilizarlos.

Galería local: http://localhost:5173/assets-src/environment-library/v1/index.html. Cada recurso se puede descargar y comparar sobre tierra, hormigón, asfalto, fondo claro y fondo oscuro. El damero pertenece a la galería, no al archivo. La opacidad del visor permite examinar la mezcla; no modifica las fuentes. Son composiciones 2D, no capturas de materiales aplicados al gameplay.

| Recurso | Aprovechar lo actual | Posibles usos nuevos |
|---|---|---|
| Mancha de aceite | Desgaste estático de garaje/taller | Rincones del circuito y zonas de mantenimiento |
| Huellas de neumáticos | Entrada al garaje y sectores de pista | Marcas estáticas de frenada y curvas |
| Hojas secas | Base de cerca y esquinas del patio | Bordes de circuitos y jardines |
| Restos de taller | Cable, arandelas, tornillos y chapa junto al taller/gabinete | Desorden decorativo de arenas y pistas |

Los cuatro PNG finales suman **5,21 MB**; los WebP **1,34 MB**, aproximadamente 74 % menos. Se conservan los píxeles de alpha exactamente, incluidos bordes semitransparentes. También se guarda en `reference/` la primera mancha usada como entrada para corregir su borde claro; no es un quinto recurso final. `prompts/01-oil-stain-initial.txt` y el prompt de corrección documentan ese proceso. No se alteraron imágenes mediante Python: la conversión de formato usa `cwebp -q 90 -alpha_q 100 -m 6 -exact`.

## Integrar con las superficies y el código existente

Leer primero `assets.json`: rutas, tamaños, hashes, alpha, usos y cobertura orientativa. `sizeMeters` y `roughness` son puntos de partida para ajustar al suelo y la cámara reales, no mediciones físicas. Cada imagen contiene un grupo completo de detalles; no es un atlas de piezas recortadas ni una textura repetible.

- `src/world.ts` ya contiene los suelos y props; aplicar una selección de marcas estáticas conservando semillas, layout y colisiones. La textura de fondo debe seguir visible a través del alpha.
- `src/fx.ts` ya administra marcas y restos con límites/pools. Estas imágenes no sustituyen automáticamente sus efectos ni requieren añadir sistemas de partículas o físicas. Para marcas dinámicas hace falta integrar en esa arquitectura y verificar su coste.
- `src/art_lab.ts` permite comparar el acabado en la escena local, cuando sus rutas estén libres. Reservar los archivos antes de editar y probar cámaras de suelo y gameplay.
- `assets-src/material-library/v1/` aporta los albedos usados como fondos en la galería. Conservar ese catálogo y sus originales; esta tanda los complementa, no los reemplaza.

En Babylon, un plano o decal de suelo necesita textura con alpha y un modo de transparencia compatible. Para aceite/huellas conservar la transparencia gradual; para hojas/restos se puede evaluar alpha test si la cámara tolera el borde. Ajustar depth offset o una separación mínima para evitar z-fighting, revisar orden de mezcla, fog y respuesta a la luz; no crear un material/textura distinto por marca. Compartir plantillas/materiales y limitar instancias. Cargar solo lo elegido para la escena.

Para distribución, copiar únicamente los WebP seleccionados a una carpeta pública versionada y usar rutas relativas compatibles con `base: './'`. No llevar fuentes, prompts, galería ni toda la biblioteca al arranque. La producción actual está en `assets-src/`, fuera del build normal, sin publicación ni cambios en partidas.

## Límites y comprobación

Son **color + alpha**, no GLB, geometría, mapa normal, altura, colisiones, AO u ORM. No hay brillo físico de aceite ni relieve de tornillos/hojas. El detalle y microcontraste del raster no se pueden iluminar de nuevo como un modelo; a ras del suelo se verá plano. Revisar escala, mezcla y halos en la escena final antes de usarlos en primeros planos. No se certifica tiling: rotar/variar colocación y evitar repetición uniforme.

La fuente generada puede conservar ruido de alpha de hasta **1/255** en el borde exterior (0,4 % de opacidad). El verificador lo registra y tolera ese máximo; no se retoca ni se afirma un borde de ceros perfecto. WebP mantiene el alpha original exactamente.

```sh
node assets-src/environment-library/v1/verify.mjs
```

La comprobación usa un solo Chromium headless, `scripts/lib/browser.mjs`, el servidor pm2 existente y su candado. Verifica hashes/rutas, ocho PNG/WebP decodificados por viewport, alpha idéntico, padding transparente, cuatro diálogos con cinco fondos, opacidad, proporciones, errores y desbordamiento en pc/cel. Guarda evidencia en `evidence/` y cierra el navegador. No mide rendimiento del juego ni prueba estos recursos en un teléfono físico.

Continuar con el estado real de `HANDOFF.md` y `docs/SPECIALISTS_ECOSYSTEM.md`. Cualquier sesión autorizada puede reservar rutas libres, aportar variantes o integrar una selección dentro de su alcance sin esperar revisión de Codex.

**Resultado real:** verificado en pc 1280×720 y cel 390×844: ocho PNG/WebP por viewport, cuatro diálogos/cinco fondos por recurso, opacidad, alpha idéntico, proporciones y cero errores/desbordamiento. También pasan tsc, 75 pruebas y build. Fuentes y recursos disponibles; reserva liberada. Ver `HANDOFF.md`.
