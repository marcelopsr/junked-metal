# Primer lote procedural Pixel Art 3D

Generar desde la raíz del repo con:

```sh
node assets-src/procedural-pixel-art/v1/generate.mjs
```

`generate.mjs` contiene las recetas (patrón, semilla, paleta y tamaño), exporta los mapas base color a `materials/`, decals RGBA a `decals/` y escribe `manifest.json`. No depende de ImageGen en ejecución. Con los mismos bytes de generador/Node y las mismas recetas, las salidas PNG se reproducen.

## Texturas

| ID | Salida | Uso | Estado |
|---|---|---|---|
| `suelo-tierra` | `materials/suelo-tierra-basecolor.png` | Tierra exterior con grupos de terrones cálidos | Técnico/revisión visual pendiente |
| `suelo-concreto` | `materials/suelo-concreto-basecolor.png` | Cemento gastado | Técnico/revisión visual pendiente |
| `madera-tablas` | `materials/madera-tablas-basecolor.png` | Tablas de caja, rampa y taller | Técnico/revisión visual pendiente |
| `metal-oxidado` | `materials/metal-oxidado-basecolor.png` | Chapa y chatarra | Técnico/revisión visual pendiente |
| `caucho-neumatico` | `materials/caucho-neumatico-basecolor.png` | Caucho de rueda/neumático | Técnico/revisión visual pendiente |
| `cesped-hojas` | `materials/cesped-hojas-basecolor.png` | Césped seco y hojas | Técnico/revisión visual pendiente |

La prueba integrada comprueba tamaño, repetición exacta en X/Y, determinismo del buffer de píxeles y consistencia del manifiesto. El arte es una base de procedimiento: las recetas de concreto, vetas de madera y distribución de desgaste requieren iteración visual antes de considerarse aprobadas o integrarse al juego. No hay mapas normal/roughness/metalness aún.

## Decals RGBA

| ID | Salida | Uso | Estado |
|---|---|---|---|
| `oil-splat` | `decals/oil-splat.png` | mancha de aceite oscura para cemento | técnico/revisión artística pendiente |
| `tire-skids` | `decals/tire-skids.png` | dos huellas de neumático | técnico/revisión artística pendiente |
| `dry-leaf-cluster` | `decals/dry-leaf-cluster.png` | hojas secas para patio/jardín | técnico/revisión artística pendiente |
| `mud-splatter` | `decals/mud-splatter.png` | salpicadura de barro | técnico/revisión artística pendiente |
| `scrap-shards` | `decals/scrap-shards.png` | fragmentos angulares de chatarra | técnico/revisión artística pendiente |
| `rust-drips` | `decals/rust-drips.png` | chorreaduras de óxido en superficies verticales | técnico/revisión artística pendiente |
| `chipped-paint-scuff` | `decals/chipped-paint-scuff.png` | pintura saltada en bordes de props/vehículos | técnico/revisión artística pendiente |
| `hazard-stripe` | `decals/hazard-stripe.png` | cinta de seguridad amarilla y negra | técnico/revisión artística pendiente |

El generador valida PNG 128×128, buffer determinista, alfa visible y esquinas transparentes para cada decal.

`assets-src/generated/2026-10-14/pixel-art-3d-batch-04-standalone-surfaces/` y los atlas de ImageGen son referencias conceptuales, no fuentes ni outputs del generador.
