# HANDOFF — props redondeados Smooth Voxels v1

- **Estado:** candidatos exportados y visor local disponible; sin integración en gameplay.
- **Responsable/fecha:** Codex, 2026-10-10.
- **Entrada:** objetos equivalentes a `pots()` y `paintCans()` en `src/world.ts`, más los props ambientales de `assets-src/procedural-props/v1/`.
- **Entregas:** fuentes `.vox` y `.svox`, GLB de maceta, lata de pintura y bidón oxidado; generador `generate_props.py`; visor `props-preview.html`; capturas pc/cel en `evidence/`.
- **Intención:** volúmenes curvos y redondeados, textura de terracota, etiqueta industrial y aros de bidón. Complementa la pila de neumáticos redondeados existente.
- **Conserva:** modelos Folded, física, colisionadores, balance, build y todos los recursos de otras sesiones.
- **Verificación:** los tres GLB se cargaron en Babylon y el visor pc/cel quedó sin errores de consola. Accesores de posición: maceta 16.591, lata 8.306 y bidón 19.595. `npm test` pasó 81/81; `npx tsc --noEmit -p .` y `npm run build` finalizaron correctamente.
- **Limitaciones:** geometría de alta resolución exportada desde Smooth Voxels, sin LOD ni colisionadores. Las escenas de maceta/lata activas usan lógica y piezas adicionales que estos GLB no sustituyen por sí solos.
- **Siguiente paso:** evaluar las formas/capturas, reducir cada malla y decidir un plan separado de reemplazo que conserve rotura, plantas, interacciones y colisiones.
