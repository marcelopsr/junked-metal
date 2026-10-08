---
name: performance-review
description: >-
  Analyzes and optimizes WebGL rendering, draw calls, triangle counts, Havok physics
  overhead, per-frame memory allocations in update(), bundle size (src/bjs.ts), and
  runs deterministic benchmarks with npm run perf. Activate this skill when modifying
  hot loops (src/main.ts, src/enemies.ts, src/weapons.ts, src/fx.ts, src/world.ts,
  src/render.ts, src/kart.ts, src/duel.ts), adding 3D models/GLBs, or investigating
  FPS drops and draw call regressions.
---

# Performance Review & WebGL Benchmarking

**Nivel de razonamiento recomendado:** `Gemini Flash — High` para diagnóstico de cuellos de botella en `update()`, draw calls o shaders; `Gemini Flash — Medium` para correr y comparar mediciones de `npm run perf`.

## 1. Presupuesto e Invariantes de Rendimiento
- **Instanciación obligatoria:** Enemigos, proyectiles, tuercas de XP y marcas en el piso son **instancias** de plantillas fusionadas (`template()` en `src/models.ts`) o **thin instances** (pasto en `src/world.ts`). Prohibido crear mallas sueltas por entidad dinámica.
- **Modelos GLB horneados (`src/glb.ts`):** Los bichos de Blender usan animación de vértices horneada (`BakedVertexAnimationManager` / VAT) para animar cientos de instancias en GPU sin esqueletos por instancia.
- **Pools y Topes Estrictos:**
  - Partículas, restos y marcas salen del pool fijo de `src/fx.ts` (tope de restos 240, marcas 500; nunca `new B.ParticleSystem`).
  - Topes en partida (`src/main.ts` y `src/balance.json`): enemigos vivos (`maxAlive`), gemas (`gemas_tope` = 350), proyectiles enemigos (`SPIT_CAP`), pickups por tipo.
- **Cero basura de GC en el bucle por cuadro (`update()`):**
  - No usar `.filter()`, `.map()` ni `[...arr]` para limpiar listas de proyectiles, enemigos o pickups cada cuadro; recorrer al revés (`for (let i = arr.length - 1; i >= 0; i--)`) y hacer swap-and-pop o `splice`.
  - Reutilizar vectores temporales (`B.Vector3`) en impactos y colisiones frecuentes.
- **Modo táctil / móvil (`low = isTouch`):** Quita bloom, reduce partículas y DOF, y actualiza el HUD de armas cada 2 cuadros.
- **Tamaño de carga inicial (`src/bjs.ts`):** Mantener la fachada de rutas profundas de `@babylonjs/core` en `src/bjs.ts` (evita parsear ~4 MB antes de la portada).

## 2. Cómo Medir con `npm run perf`
No optimices a ciegas ni midas con otros procesos pesados corriendo:

```bash
# 1. Reiniciar el servidor de pruebas sin HMR tras cambios
pm2 restart rc-test

# 2. Medir escenarios puntuales (p. ej. partida a los 90s y partida llena a los 300s en PC)
npm run perf -- --only partida,partida_llena --vp pc

# 3. Medir lab o carrera
npm run perf -- --only lab,carrera --vp pc

# 4. Corrida completa (todos los escenarios, PC y celular, ~65 s)
npm run perf
```

### Cómo Interpretar la Salida de `npm run perf`
- **Métricas exactas (deterministas):** `draws` (draw calls de 1 cuadro), `tris k` (triángulos activos), `mallas` (`scene.meshes.length`) y `heap MB` (`JSHeapUsedSize` tras GC forzado). A misma escena y semilla, deben dar el mismo número.
- **Métricas de tiempo (`ms`, `p95`, `cpu`):** Tienen ~10–15 % de ruido natural del reloj de GPU del Mac; el script marca con `▲ MÁS LENTO` variaciones mayores al **20 %**.
- **Contexto de draw calls reales del proyecto:**
  - `partida` (90 s): ~254 draws en PC.
  - `partida_llena` (300 s): ~168 draws en PC (las armas evolucionadas agrupan mejor que los proyectiles iniciales).
  - `carrera` (2 jugadores, split-screen): ~670 draws (techo real del proyecto por renderizar dos cámaras).
