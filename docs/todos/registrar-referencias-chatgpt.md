---
titulo: Registrar las referencias nuevas de ChatGPT (encore-v1/raw)
estado: idea
area: arte
prioridad: media
origen: pendiente
desde: 2026-10-21
---

## Qué y por qué
Hay PNG sin versionar en `assets-src/imagegen-production/encore-v1/raw/` (pilotos, texturas por bioma, fichas de modos, pruebas de proveedor) que ChatGPT dejó desde el 15-10 y nadie registró. Sin registro no son referencia válida (regla: solo cuentan las imágenes de `docs/art_direction/visual_reference_register.md`).

## Alcance
- Toca: `assets-src/ref-rcrace/` (copiar como `refN.png` siguiente), `docs/art_direction/visual_reference_register.md`, `assets_manifest.json` si corresponde.
- No toca: código del juego.

## Cómo verificar
- Deduplicar por firma 16×16 contra `assets-src/ref-rcrace/`; medir cada una con `scripts/ref_measure.py`; una fila por imagen en el registro con qué es (el prompt de `jobs/` lo dice).
- `npm run verificar -- --nivel rapido`.

## Notas
Origen: memoria personal del 2026-10-15 (imagegen-encore-v1), migrada a TODO el 2026-10-21.
