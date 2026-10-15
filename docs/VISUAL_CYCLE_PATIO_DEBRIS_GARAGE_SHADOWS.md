# Ciclo visual local: restos en chatarra y sombras del garaje

Fecha: 2026-10-13. Selecciones del usuario: revisar distribución/escala de restos junto a cajas y bidones; inspeccionar separación de las sombras del banco y estanterías sobre el cemento; validar con capturas enfocadas PC/cel.

## Plan

- Inspeccionar capturas de referencia y código existente de `patioBuild()` y `garageBuild()` antes de intervenir.
- Aplicar solo el ajuste visual mínimo que mejore lectura; preservar objetos, ubicaciones y colisiones.
- Capturar patios y elementos del garaje en PC/cel, revisar errores de consola, correr verificaciones de código, actualizar graphify y registrar resultados.
- Cerrar en commit local; no publicar.

## Resultado

- Reubicados al perímetro del conjunto y ampliados moderadamente tres decals `smallScrap` que quedaban bajo los bidones. Se conserva la cantidad, el material y la ubicación/física de los props.
- El banco y las estanterías conservan materiales y configuración de sombra. Capturas PC/cel confirman que las sombras tienen separación suficiente sobre el cemento; no se justifica alterar la luz global ni aumentar el contraste.
- Capturas de lectura del patio: `.shots/actual/{pc,cel}-scrap-cluster-final.png`. Capturas de sombras: `.shots/actual/{pc,cel}-garage-{bench,shelf}-shadows-final.png`. Sin errores de consola.
- Verificación de código, graphify y commit local registrados al cierre. No se hizo medición de rendimiento: el cambio se limita a geometría de decals ya fusionados.
