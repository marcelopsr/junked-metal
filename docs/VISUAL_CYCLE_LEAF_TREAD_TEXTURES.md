# Ciclo visual local: hojas y caucho con dibujo de banda

Fecha: 2026-10-14. Selecciones: generar una textura procedural pixelada para hojas de huerta, una textura procedural de caucho gastado para el auto del garaje y una hoja de contacto conceptual. No generar capturas del juego.

## Plan

- Crear los píxeles de ambas texturas con un generador local determinista y compartir esos mismos píxeles con el runtime.
- Aplicar las hojas como un solo material fusionado en la huerta y el caucho como una celda del atlas Folded, sin cambiar geometría, posiciones ni colisiones.
- Generar una hoja de contacto PNG desde las texturas fuente y validar dimensiones/datos, además de TypeScript, pruebas, build y graphify.

## Resultado

- El generador `assets-src/procedural-textures/v1/generate.mjs` crea ambas texturas y la hoja de contacto localmente; las funciones compartidas en `pixels.mjs` son las mismas que consume el runtime.
- La huerta usa un único material/textura compartido con cuatro celdas de hojas, conservando la cantidad de hojas, los surcos y el merge. El auto del garaje usa una nueva celda de caucho en el atlas Folded con chevrón, canales y hombros con polvo; conserva ruedas, posición y colisiones.
- PNG fuente: `assets-src/procedural-textures/v1/huerta-hojas-folded.png` (128×32) y `caucho-tread-folded.png` (64×64). Hoja conceptual: `hoja-contacto.png` (960×500), generada directamente desde las texturas, sin capturas del juego.
- Se eligió generación procedural local en vez de difusión: ComfyUI estaba apagado y la memoria unificada disponible en el Mac es 24 GB, bajo el mínimo de 32 GB indicado por la guía `creative-stack` para difusión local.
- `npx tsc --noEmit -p .`, `npm test` (178/178), `npm run build`, el generador con validación de dimensiones y costura horizontal, y `graphify update .` (grafo de código) pasaron. No se tomaron capturas del juego ni se midió rendimiento.
- La actualización semántica adicional `graphify . --update` quedó bloqueada por falta de una clave LLM configurada; graphify la detuvo sin alterar sus fuentes existentes.
- El build mantiene el aviso existente de chunk grande: `menu` pesa aproximadamente 1,23 MB.
- Cierre local sin publicación.
