# Hecho: presentación (render, audio, HUD, menús)

Dirección de arte vigente: [`docs/ART_DIRECTION.md`](../../ART_DIRECTION.md) (Junked Metal Encore, diorama de juguete; Bebas Neue e Inter; tokens `--jm-*`; sin emojis). Registro de referencias: [`docs/art_direction/visual_reference_register.md`](../../art_direction/visual_reference_register.md). Decisión: [ADR 0003](../../decisiones/0003-estilo-junked-metal-encore.md).

## Fichas

- **Render.** PBR (`pbr()`, `M`), cielo, niebla, luna y faro del auto, shader retro, escala interna pixelada con FSR 1, presets Bajo/Medio/Alto/Ultra (`PRESETS`, Medio por defecto), `low = isTouch`. `src/render.ts`, `src/bjs.ts`, `src/websr*.ts`. Madurez: estable. Prueba: `npm run shots`, `npm run perf`.
- **Agujero de cámara.** Descarta fragmentos entre la cámara y el auto (círculo en pantalla, más cerca que el auto, más alto que él) en vez de ocultar mallas. `HOLE` en `render.ts` (`SnapPlugin`) y `src/camera_rig.ts`. Madurez: usable; WebGPU sin probar. Diseño: [CAMARA-oclusion](../../../.claude/trabajo/CAMARA-oclusion.md); TODO [camara-tapada-follaje](../../todos/camara-tapada-follaje.md).
- **Cámara.** Diorama de menús, seguimiento de partida, cenital, desplazamiento táctil. `src/camera_rig.ts`. Madurez: usable.
- **Mundo.** Patio 200x200 con pasto en thin instances, props, `spawnPoint()`. `src/world.ts`, `world_layout.ts`, `grass.ts`, `zones/common.ts`. Regla: todo decorado sin colisión usa su propio generador local, nunca el del layout jugable.
- **FX.** Partículas en pool, restos, marcas, impactos por arma. `src/fx.ts`. Topes: gemas 350, restos 240, marcas 500. Madurez: estable.
- **Audio.** Sintetizado y partido: `src/audio/context.ts` (buses, compresor, limitador, `?mute`), `music.ts`, `effects.ts`, `ambience.ts`; fachada `src/sfx.ts`. Madurez: usable. Abierto: [ambiente-mudo-primer-escenario](../../todos/ambiente-mudo-primer-escenario.md).
- **Radio global.** 4 estaciones en `public/music/` (aceite, astral, chatarra, oxido-fritanga), crossfade, suena desde cualquier pantalla, ducking en jefe y avisos. `src/radio.ts`. Atribuciones: [`docs/ATTRIBUTIONS.md`](../../ATTRIBUTIONS.md). Madurez: usable; revisión pide escuchar `stalled` ([REVISION-0.95](../../../.claude/trabajo/archivo/REVISION-0.95.md) punto 2).
- **HUD.** Telemetría con radar, racha y avisos de radio, números de daño, cartas de mejora. `src/ui.ts`, `src/hud_tick.ts`, `src/hud.css`, `src/icons.ts`, `src/screen_proj.ts`. Madurez: usable. Abierto: [boton-quedarse-texto-largo](../../todos/boton-quedarse-texto-largo.md), [banner-cofres-glifo](../../todos/banner-cofres-glifo.md).
- **Menús.** Título, principal, garaje, taller, configuración, bestiario, créditos, pausa, resultados, guardado `Save`. `src/menu.ts`, `src/menu/*.ts`, `src/menu.css`, `src/savefmt.ts` (migración, `test/save.test.ts`, `test/save_versiones.test.ts`). Madurez: usable. Crítica de accesibilidad: [AUDITORIA-accesibilidad-menus](../../AUDITORIA-accesibilidad-menus.md), H10-H12 cerrados; en celular el Taller corta pestañas (QA-0.95 H4).
- **Accesibilidad.** Modo daltónico `save.cb`, `prefers-reduced-motion`, modo Tranquilo, flechas de borde para avisos fuera de cámara. Pendientes: [daltonico-restos](../../todos/daltonico-restos.md), [accesibilidad-menores](../../todos/accesibilidad-menores.md), [dificultad-accesible](../../todos/dificultad-accesible.md).
- **Intro.** Cuatro cuadros en canvas 2D, solo desde Créditos → Ver intro (no en el primer arranque). `src/intro.ts`. Paquete de recursos: [`assets-src/intro/cinematic-v1/README.md`](../../../assets-src/intro/cinematic-v1/README.md), integración pendiente por decisión del usuario.
- **Replay y polaroid.** Cámara lenta de cierre y foto de resultados. `src/replay.ts`, `src/outro.ts`. Madurez: usable.
- **Carga y consejos.** `src/loading.ts`, `src/load.css`, `src/tutorial.ts`. Madurez: estable.
- **PWA.** `public/manifest.webmanifest` (con `crossorigin="use-credentials"` en `index.html`) y `public/sw.js` (red primero, el redirect de Access no se guarda). Instalable desde el Worker; prueba en aparato real pendiente ([instalar-app-real](../../todos/instalar-app-real.md)). App nativa con Tauri en `src-tauri/` (`npm run app`).
- **Modelos e instancias.** `src/models.ts` (fachada) y `src/models/*.ts`, `glb.ts`, `carGlb.ts`; bichos como instancias de plantillas, nunca mallas sueltas por entidad. Planes históricos: [LOD_AND_INSTANCING_PLAN](../../archivo/planes/LOD_AND_INSTANCING_PLAN.md).

## Cómo se prueba

`npm run shots -- --changed` para cambios visuales; contraste medido con `scripts/ref_measure.py` contra la meta 0,19-0,23. Ver [herramientas.md](herramientas.md).
