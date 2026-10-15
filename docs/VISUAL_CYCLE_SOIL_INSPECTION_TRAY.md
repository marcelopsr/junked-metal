# Ciclo visual — Tierra, calcos y bandeja Folded

## Alcance

- Generar con ImageGen una textura pixelada de tierra compactada con terrones y restos vegetales, e integrarla al material compartido de huerta y chatarra.
- Generar calcomanías de inspección con transparencia y sumarlas como atlas independiente, preservando los ocho decals Folded existentes.
- Crear un prop Folded nuevo: bandeja magnética poco profunda con tornillos y arandelas, sobre el banco de trabajo existente.
- Conservar relieve, ubicación de objetos, colisiones y balance. La bandeja es decorativa y no añade colisión.
- Entregar las fuentes de generación y hojas de contacto dentro de `assets-src/generated/2026-10-14/`.

## Criterios de aceptación

- Los dos materiales de tierra objetivo usan la textura generada sin cambiar superficies ni cuerpos físicos.
- El atlas nuevo usa alfa y filtrado nearest; el atlas Folded anterior mantiene su contenido y mapeo.
- La bandeja se construye con la geometría procedural Folded compartida y una sola instancia en el banco.
- Compilan TypeScript y build, y pasan las pruebas unitarias del proyecto.
- No se capturan pantallas del juego en este ciclo.
