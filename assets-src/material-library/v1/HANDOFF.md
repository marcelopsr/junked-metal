# Continuidad — biblioteca de materiales v1

Fecha: 2026-10-10. Responsable: Codex. Estado: recursos producidos y catálogo verificado; **sin integración en partidas**. Reserva de carpeta liberada al commit de cierre; consultar Git para el commit exacto y conservar originales.

## Entrega

- Ocho originales PNG generados con imagegen integrado, ocho WebP a igual resolución 1254 × 1254, ocho prompts completos y referencia preservada.
- PNG 34.761.604 bytes / WebP 6.509.594 bytes; catálogo `assets.json` con hashes, dimensiones, usos y parámetros PBR iniciales.
- `index.html` con vistas individuales, descargas y repetición 3 × 3; `README.md` con conexiones al código actual y límites.
- Capturas y comprobaciones reproducibles en `evidence/`, mediante `verify.mjs` y el Chromium headless compartido. Sin servidores nuevos ni publicación.

## Verificación y observaciones

TypeScript sin errores, 75 pruebas pasando y build correcto. Headless pc/cel: 16 archivos decodificados por viewport, ocho diálogos, sin errores ni desbordamiento, relación cuadrada preservada. Navegador cerrado al finalizar. El build normal conserva estos archivos fuera de dist. No se midió rendimiento de partidas, teléfono físico ni respuesta de luz PBR aplicada a los modelos.

Se revisaron las imágenes generadas y vistas repetidas. La madera muestra nudos recurrentes; el ladrillo revela su patrón y puede necesitar corregir alineación/juntas para muros extensos. Los suelos, el óxido y la pintura también repiten detalles identificables. No declarar seamless. Conservar esta versión para paneles y trabajar una variante si se necesita repetir a gran escala. El hormigón y asfalto tienen árido expuesto; para pavimento más liso conviene generar otra variante.

## Siguiente paso ejecutable para Gemini o Codex

Elegir las superficies que entren en su tanda autorizada y leer sus fichas. Prioridad sugerida: comparar tierra compactada, hormigón y madera en el banco o una zona existente, tomando los archivos de runtime que estén libres. Usar una textura/material compartido, conservar geometría/colisiones y revisar cámara de partida además del acercamiento. Copiar a distribución solo los WebP elegidos; no cargar toda la biblioteca en el arranque.

Puede seguir autónomamente sin revisión obligatoria de Codex. Para metal/pintura, otra tarea útil es producir máscaras de metal/rugosidad; para terreno, altura/normal coherentes; para superficies extensas, variantes con juntas corregidas. Los campos de normal y ORM están vacíos deliberadamente: los mapas de color no sustituyen esos mapas. Registrar evidencia de cualquier integración y actualizar `status` solo cuando esté efectivamente aplicada y verificada.
