# Ciclo visual local: aceite, cajas y chatarra por clima

Fecha: 2026-10-13. Selecciones del usuario: integrar manchas de aceite del garaje, mejorar contraste de las cajas junto a los tambores y revisar lectura de chatarra a distancia en noche, niebla y farol.

## Alcance

- Comparar capturas PC/cel de aceite, cajas, tambores, plancha y marcas.
- Cambiar solo transparencia o materiales si la lectura visual lo necesita; conservar ubicaciones, terreno y física.
- Ejecutar verificación de código, actualizar el grafo y cerrar en commit local, sin publicación.

## Resultado

- El aceite conserva su silueta irregular y se integra mejor al cemento con `alpha = 0.84` en el material existente.
- Los flejes compartidos de `crateDetail()` pasan de `#424d53` a `#59636a`, con lo que se separan más de las tablas sin alterar plantilla, escala ni colisiones.
- A distancia, noche y farol mantienen la lectura de plancha y marcas; la niebla reduce detalle fino pero no oculta las siluetas. No se justificó tocar iluminación ni layout.
- Evidencia headless: `.shots/actual/{pc,cel}-oil-final.png`, `.shots/actual/pc-crates-final.png` y `.shots/actual/{pc,cel}-scrap-{noche,niebla,farol}-final.png`. La toma móvil de cajas quedó parcialmente tapada por un bidón; la lectura del material se confirma en PC y la captura móvil de chatarra permite revisar el contexto, aunque no es una prueba móvil de primer plano.
- Verificación de código y actualización del grafo documentadas al cerrar el ciclo. Sin cambios de física ni publicación.
