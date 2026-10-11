# HANDOFF — props redondeados Smooth Voxels v1

- **Estado:** candidatos exportados y visor local disponible; sin integración en gameplay.
- **Responsable/fecha:** Codex, actualizado 2026-10-11.
- **Entrada:** objetos equivalentes a `pots()`, `paintCans()` y `ball()` en `src/world.ts`, más los props ambientales de `assets-src/procedural-props/v1/`.
- **Entregas:** fuentes `.vox` y `.svox`, GLB de maceta, lata de pintura, bidón oxidado, fútbol, tenis y playa; generadores `generate_props.py` y `generate_spheres.py`; visor `props-preview.html`.
- **Intención:** volúmenes curvos y redondeados, textura de terracota, etiqueta industrial y aros de bidón. Complementa la pila de neumáticos redondeados existente.
- **Conserva:** modelos Folded, física, colisionadores, balance, build y todos los recursos de otras sesiones.
- **Verificación v1:** los tres GLB iniciales se cargaron en Babylon y el visor pc/cel quedó sin errores de consola. Accesores de posición: maceta 16.591, lata 8.306 y bidón 19.595. `npm test` pasó 81/81; `npx tsc --noEmit -p .` y `npm run build` finalizaron correctamente.
- **Tanda esférica (2026-10-11):** fútbol coincide con el prop existente; tenis y playa amplían el patio. Tres fuentes 96³, exportadas desde Smooth Voxels con 36–39 mil vértices por pelota. Añadidas al visor y con descarga de fuentes/GLB. Capturas: `evidence/football-desktop.png`, `tennis-desktop.png`, `beach-desktop.png` y `spheres-mobile.png`.
- **Verificación v2:** los seis GLB cargan en el visor headless de escritorio y teléfono; los tres selectores muestran su asset; sin errores de consola ni desbordamiento horizontal. La vista móvil usa más distancia para mantener la esfera dentro del encuadre.
- **Continuidad Graphify:** grafo de código local actualizado. La extracción semántica de documentos/imágenes sigue pendiente; Graphify pidió una clave de modelo para su corpus y no había una configurada.
- **Limitaciones:** geometría de alta resolución exportada desde Smooth Voxels, sin LOD ni colisionadores; no se integró ninguna pelota al gameplay. Las escenas activas usan lógica y piezas adicionales que estos GLB no sustituyen por sí solos.
- **Siguiente paso:** evaluar las formas/capturas, reducir cada malla y decidir un plan separado de reemplazo que conserve rotura, plantas, interacciones y colisiones.
