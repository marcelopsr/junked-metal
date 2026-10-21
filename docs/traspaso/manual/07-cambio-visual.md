# 07. Cambio visual

Objetivo: cambiar el aspecto sin romper la dirección de arte. Reglas: [../../ART_DIRECTION.md](../../ART_DIRECTION.md) (sección Vigente); nada de emojis ni UI genérica.

1. Leer la dirección de arte y el registro [../../art_direction/visual_reference_register.md](../../art_direction/visual_reference_register.md) (su checklist manda).
2. Si el usuario dio una imagen nueva: guardarla en `assets-src/ref-rcrace/`, medirla con `.venv-ref/bin/python scripts/ref_measure.py assets-src/ref-rcrace/<ref>.png` y registrarla en ese archivo.
3. Hacer el cambio (tokens `--jm-*` en CSS, `src/zones/`, `src/render.ts`, etc.).
4. `npm run shots -- --changed` y mirar las PNG de `.shots/actual/`.
5. Comparar contra los objetivos medidos del registro.
6. Cambios no queridos: `npm run shots -- --diff` (diferencias en `.shots/diff/`). Si el cambio es deseado: `npm run shots -- --update` acepta lo capturado como referencia nueva.

Se verifica: capturas medidas y comparadas; `perf -- --changed` si puede costar rendimiento.

Trampas:
- `shots` acepta un solo `--vp` (pc o cel).
- Referencia de arte = solo lo registrado, nunca imágenes sueltas del repo.
- Textos en español neutro impersonal, sin voseo.
