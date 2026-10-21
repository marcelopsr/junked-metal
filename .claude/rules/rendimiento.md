---
paths:
  - "src/render.ts"
  - "src/fx.ts"
  - "src/models.ts"
  - "src/models/**"
  - "src/world.ts"
  - "src/world_layout.ts"
  - "src/zones/**"
  - "src/enemies.ts"
  - "src/enemies/**"
  - "src/weapons.ts"
  - "src/weapons/**"
  - "src/main.ts"
  - "src/run_tick.ts"
---

# Rendimiento (web multiplataforma)

- Enemigos, proyectiles, gemas y marcas son **instancias** de plantillas fusionadas (`template()` en `models.ts`): nunca crear mallas sueltas por entidad.
- Partículas del pool de `fx.ts`; no crear `ParticleSystem` nuevos.
- Render a baja resolución interna con píxeles visibles (Configuración → Imagen: escala manual 50-100 % o FSR 1 de Babylon, `applyGfx` en `render.ts`; preajustes Bajo/Medio/Alto/Ultra en `PRESETS`, Medio por defecto); `low = isTouch` quita el bloom y baja partículas y DOF. El pasto usa `rng()` con base fija: el Detalle no puede cambiar la semilla.
- Tope de enemigos en `update()` (`maxAlive`); tope de gemas 350, restos 240, marcas 500.
- Si el cambio puede costar cuadros (render, modelos, partículas, cantidades): `npm run perf -- --changed` y comparar con la medición anterior (ms/cuadro tiene ~10-15 % de ruido; se marca más del 20 %).
