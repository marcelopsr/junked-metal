# Biblioteca de superficies v1 — Junked Metal

2026-10-10. Ocho recursos nuevos generados con **imagegen integrado**, tomando la tierra adjunta del usuario como referencia de detalle. Originales PNG de **1254 × 1254**, versiones WebP a igual resolución, prompts exactos y catálogo `assets.json`. Los PNG suman **34,76 MB** y los WebP **6,51 MB**: aproximadamente 81 % menos peso. Son ocho archivos independientes, no recortes de una lámina.

Galería local: http://localhost:5173/assets-src/material-library/v1/index.html. Cada ficha permite abrir/descargar PNG o WebP y examinar repetición 3 × 3. `evidence/` conserva la verificación y capturas. `reference-earth.png` preserva la referencia original.

## Recursos y aplicaciones

| ID | Superficie | Aprovechar lo actual | Posibles usos nuevos |
|---|---|---|---|
| 01 | Tierra compactada | Caminos y zonas secas del patio; variación frente a la tierra más pedregosa | Circuitos RC y senderos |
| 02 | Hierba y tierra | Color de base bajo la vegetación del patio/jardín | Bordes de pista y jardines |
| 03 | Hormigón gastado | Garaje, losetas y suelo de taller | Arenas y patios pavimentados |
| 04 | Madera envejecida | Cerca, rampas, mesa y mangos | Pallets, cajas y puentes |
| 05 | Acero oxidado | Chatarra y accesorios | Barriles, barreras y ambientes industriales |
| 06 | Pintura amarilla gastada | Buggy y chapas amarillas | Señales sin texto, contenedores y utilería |
| 07 | Asfalto granular | Pavimento y sectores de pista | Circuitos urbanos y estacionamiento |
| 08 | Ladrillo envejecido | Muros y casa | Construcciones y muros de arenas |

Los usos nuevos son oportunidades, no modos o escenarios ya construidos. Las superficies metálicas conservan la chatarra; madera, ladrillo y suelo aportan materiales naturales donde corresponda sin convertir todos los objetos Folded en otro estilo.

## Integración para cualquier sesión, incluido Gemini

La tanda está disponible para reutilización autónoma dentro del alcance autorizado. No depende de revisión de Codex. Leer `assets.json`: contiene rutas, hashes, tamaños, mapas disponibles, usos y valores **iniciales** de rugosidad/metal y cobertura orientativa en metros. Ajustar esos valores con la cámara y escala reales; no son una medición física del material.

- `src/world.ts`: `tex()`, `floor()`, `woodM()`, `patioBuild()` y `garageBuild()` son puntos actuales de materiales del mundo. El suelo diurno y las zonas ya existen; conservar semillas, colisiones y layouts.
- `src/kit3d.ts`: `wornTex()`/`wornMat()` y `src/menuscene.ts` ya controlan acabado de mesas/gabinetes. Usar una textura compartida por superficie, no una nueva por objeto.
- `src/folded.ts`: el atlas activo tiene celdas de **64 px**. Copiar un original a una celda pierde gran parte del detalle; para acabado cercano definir una estrategia de atlas/material compatible con sus submallas. No cambiar todas las celdas ni multiplicar draw calls por iniciativa de este catálogo.
- `src/art_lab.ts`: la muestra 3D es un lugar disponible para comparar materiales a ras del suelo, de día/noche y desde arriba, reservando sus archivos si están libres.

Son **mapas de color/albedo en sRGB**, opacos. En un `PBRMaterial`, cargar el WebP como `albedoTexture`, usar color blanco para no teñir dos veces y mantener el color de la textura en gamma. Se propone rugosidad alta para suelo/madera y menor en pintura; compartir instancias de material. Elegir solo los recursos necesarios para la escena, no precargar toda la biblioteca en el arranque.

Estos recursos están fuera de `public/` y del build estándar. Para integrarlos en distribución, copiar únicamente los WebP elegidos a una carpeta pública versionada y usar rutas relativas compatibles con `base: './'`; no incluir las fuentes ni la galería en la descarga del juego. No se publicó esta tanda ni se reemplazaron texturas activas.

## Calidad y límites

No hay mapas normal, altura, AO ni ORM generados: `assets.json` los marca como ausentes. Hay microcontraste fotográfico en las superficies; no debe tratarse como altura física. Acero/pintura requieren una máscara de metal por píxel si se busca respuesta PBR más precisa que el valor constante inicial.

La intención del prompt es repetición continua, pero **no se certifican costuras perfectas**. Revisar las capturas 3 × 3 y el objeto final. La veta, los nudos, parches de óxido, arañazos y la alineación de ladrillos pueden revelar repetición; para un muro o suelo muy extenso, corregir uniones o mezclar variantes. También sirven en una cara/tablón/panel con UV acotada sin repetir. La textura 02 es una base de terreno, no geometría de pasto ni un recorte transparente.

Conversión realizada con `cwebp -q 90 -m 6`, sin recorte, redimensionado ni cambios de contenido. Los prompts usados están en `prompts/*.txt`; el catálogo enlaza cada uno. La referencia original no se modifica.

## Verificar y continuar

```sh
node assets-src/material-library/v1/verify.mjs
```

El script usa `scripts/lib/browser.mjs`, el servidor pm2 existente y su candado. Verifica ocho materiales, 16 PNG/WebP decodificados por viewport, dimensiones, rutas, menor peso WebP, ausencia de errores/desbordamiento y ocho diálogos de repetición en escritorio y teléfono. Guarda capturas en `evidence/` y cierra el navegador. No mide FPS ni demuestra que estos recursos estén integrados en partidas.

Próxima aplicación recomendada: comparar tierra, hormigón y madera en una escena existente antes de ampliar el cambio. Otra sesión puede tomar superficies distintas o producir variantes y mapas complementarios; reservar los archivos que edite y preservar los originales. Ver `docs/VISUAL_SESSION_COORDINATION.md` para continuidad sin dependencias entre sesiones.
