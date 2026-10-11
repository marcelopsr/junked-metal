# Biblioteca de Materiales y Superficies — Entrega v2

Fecha: 2026-10-11  
Generador: ComfyUI + SDXL Base 1.0 sobre GPU local Apple Silicon M4 Pro (Metal/MPS).  
Flujo de trabajo: `/Users/msalas/CreativeStack/workflows/sdxl-web.json` ejecutado mediante `scripts/creative-gen.mjs`.

## Recursos en esta entrega

- **`09-scrap-earth` (Tierra con chatarra y marcas RC)**:
  - Base color / albedo ortográfico cenital 1024×1024.
  - Fuente PNG: `sources/09-scrap-earth.png` (2.073.999 bytes).
  - Textura WebP optimizada: `textures/09-scrap-earth.webp` (267.428 bytes, compresión cwebp q85).
  - Runtime activo: disponible en `public/textures/09-scrap-earth.webp`.
  - Parámetros PBR recomendados: `roughness = 0.94`, `metallic = 0.05`, repetición calibrada en UV (ej. 4x a 8x según el tamaño de la malla de terreno).
  - Integración: aplicada activamente al material del suelo en el banco cinemático 3D (`src/art_lab.ts` / `art-lab.html`).
