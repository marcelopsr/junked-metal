# Plan de Arquitectura: Pipeline de LODs y Animación Instanciada para Supervivencia

**Fecha:** 2026-10-10  
**Línea:** Optimización y Escalabilidad 3D (`gemini-performance`)  
**Meta:** Permitir que la nueva fidelidad artística cinemática (Frenchie, Buggy, Eulalio) escale al combate masivo de Supervivencia (50-150 enemigos simultáneos) manteniendo 60 FPS estables (<16.6 ms) en WebGL móvil y de escritorio.

---

## 1. Diagnóstico del Problema y Cuellos de Botella

En el banco cinemático (`art-lab.html`):
- **Frenchie:** 57.550 triángulos, 1 esqueleto animado (21 huesos).
- **Eulalio:** 58.496 triángulos, 1 esqueleto animado (23 huesos).
- **Buggy:** 115.020 triángulos, 4 ruedas independientes.

Con 1 o 2 entidades en escena, una Mac M4 Pro rinde en 12.3 ms (PC) y 5.6 ms (Móvil). Sin embargo, en una partida real de Supervivencia:
1. **Tope de enemigos en pantalla:** Entre 40 y 120 bichos simultáneos (`maxAlive` en `main.ts`).
2. **Multiplicador de Geometría:** 100 Frenchies a LOD0 representarían **5,75 millones de triángulos** y 2.100 matrices óseas recalculadas por la CPU en cada cuadro (`update()`).
3. **Draw Calls y CPU Overhead:** Si cada enemigo tiene su propio esqueleto y malla no instanciada, Babylon.js despacharía cientos de draw calls y la CPU saturaría el hilo principal de JavaScript transformando vértices.

---

## 2. Jerarquía de LODs (Level of Detail)

| Nivel | Distancia / Contexto | Presupuesto Triángulos | Rig y Animación | Material / Shaders | Propósito |
|---|---|---|---|---|---|
| **LOD0 (Héroe)** | < 10 m, Outro cámara lenta, Garaje, Duelos 1v1 | 50.000 – 115.000 | Esqueleto completo (`PerroRig` / `GatoRig`) con 7 u 8 clips individuales | PBR completo (Albedo, Normal map micro-detalle, ORM, PCF Shadows, clearcoat) | Fidelidad máxima sin concesiones para primeros planos y hero assets. |
| **LOD1 (Horda)** | 10 m – 40 m, Combate masivo estándar | **2.500 – 4.200** (-93% tris) | Mismo esqueleto (`PerroRig` / `GatoRig`), 100% compatible con los mismos clips | PBR optimizado o material unificado con textura compartida | Horda de combate masivo: silueta exacta, orejas, belfos y mancha marfil perfectamente visibles a distancia de juego. |
| **LOD2 (Periferia)** | > 40 m o fuera del cono visual | 500 – 1.000 | Rig simplificado o VAT de baja frecuencia | Material básico con sombreado difuso | Culling dinámico y siluetas lejanas en los bordes del patio. |

---

## 3. Preservación Invariante en la Reducción (Decimation Rig-Safe)

La reducción geométrica a LOD1 no puede ser una simple reducción ciega. Debe cumplir las siguientes reglas:
1. **Preservar Nombres y Asignaciones de Huesos:** Los grupos de vértices (`Vertex Groups`) del rig original (`hips`, `spine`, `chest`, `neck`, `head`, `leg_*`, etc.) deben conservarse intactos en el modificador `Decimate` de Blender (`preserve_groups = True` o reaplicación de pesos vía `DataTransfer`).
2. **Preservar Silueta Identificativa:**
   - **Frenchie:** Orejas de murciélago erguidas, stop nasal a 90°, mancha marfil pectoral, 4 dedos en las patas.
   - **Eulalio:** Orejas puntiagudas con cavidad interna, babero blanco, cola curvada y silueta atigrada.
   - **Buggy:** Jaula antivuelco, perfil de alerón, tacos externos de las ruedas.
3. **Preservar Coordenadas UV:** Las costuras UV deben conservarse para que las texturas PBR existentes sigan encajando sin costuras rotas.
4. **Verificación de Matrices Finitas:** Todos los fotogramas de todos los clips exportados en el GLB de LOD1 deben pasar la prueba de matrices finitas (`isFinite`).

---

## 4. Técnica de Instanciación Masiva: Baked Vertex Animation (VAT) vs. Skeleton Instances

Para dibujar 100 enemigos con 1 solo draw call:

### Opción A: Instancias de Malla con Skeletons Independientes
- Cada instancia comparte los buffers de vértices (VBO), pero posee su propio esqueleto animado.
- *Ventaja:* Cada enemigo puede estar en un frame de animación diferente (uno corre, otro salta, otro muerde).
- *Costo:* La GPU realiza el skinning en el vertex shader, pero la CPU sigue enviando los uniformes de matrices óseas para cada instancia.

### Opción B: Baked Vertex Animation (VAT) con `BABYLON.BakedVertexAnimationManager` (Recomendada para Hordas)
- Las posiciones y normales de cada vértice en cada cuadro de las animaciones (`walk`, `run`, `idle`, `charge`) se pre-hornean en una textura 2D RGBA Float32 de dimensión compacta (ej. 256×128).
- En tiempo de ejecución:
  - Todas las entidades de la horda son **Thin Instances** de la malla LOD1.
  - El shader consulta la textura VAT usando un offset de tiempo (`timeOffset + animIndex`).
  - **100 enemigos animados en 1 solo draw call**, con 0% de costo de CPU para matrices óseas.

---

## 5. Hoja de Ruta de Implementación

1. **Fase 1 · Generación de Modelos LOD1 en Blender:**
   - Crear `assets-src/cinematic-3d/gemini-performance/build_lods.py`.
   - Generar `frenchie_lod1.glb`, `eulalio_lod1.glb` y `buggy_lod1.glb`.
   - Verificar rig, pesos de huesos y los 7 u 8 clips con scripts de validación.
2. **Fase 2 · Banco de Pruebas de Horda Masiva (`bench-lod.html` / `src/bench_lod.ts`):**
   - Escenario controlado que instancie 100 Frenchies / Eulalios simultáneos.
   - Comparar métricas en tiempo real:
     - Escenario A: 100 enemigos LOD0 individuales.
     - Escenario B: 100 enemigos LOD1 con Skeleton Instances.
     - Escenario C: 100 enemigos LOD1 con Thin Instances / VAT.
   - Medición automatizada con Playwright en Chromium Metal (`pc` y `cel`).
3. **Fase 3 · Integración Progresiva en `src/enemies.ts` / `src/models.ts`:**
   - Conectar los contenedores de LOD1 al pool de plantillas de enemigos cuando se active el modo de render de alta fidelidad.
