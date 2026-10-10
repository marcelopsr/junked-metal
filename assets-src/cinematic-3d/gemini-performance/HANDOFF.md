# Handoff: Pipeline de LODs y Animación de Horda Masiva para Supervivencia

**Fecha:** 2026-10-10  
**Línea:** Optimización y Escalabilidad 3D (`gemini-performance`)  
**Estado:** Validado y disponible  
**Responsable:** Gemini Performance & LOD Specialist  

---

## 1. Resumen Ejecutivo y Resultados Cuantitativos

Se diseñó e implementó con éxito el pipeline de optimización geométrica y rig-safe decimation para escalar los modelos cinemáticos hacia el combate masivo de Supervivencia (50-100 entidades simultáneas).

### A. Reducción Geométrica por Modelo

| Modelo | LOD0 (Héroe) | LOD1 (Horda Masiva) | Reducción (%) | Tamaño Archivo | Rig y Clips |
|---|---|---|---|---|---|
| **Frenchie** (`frenchie_lod1.glb`) | 57.550 tris | **3.740 tris** | **-93.5%** | 1.32 MB (vs 3.40 MB) | `PerroRig` (21 huesos), 7 clips (`charge`, `death`, `idle`, `jump_slam`, `rage`, `run`, `walk`) con matrices 100% finitas. |
| **Eulalio** (`eulalio_lod1.glb`) | 58.496 tris | **3.802 tris** | **-93.5%** | 1.41 MB (vs 3.60 MB) | `GatoRig` (23 huesos), 8 clips (`death`, `idle`, `jump`, `rage`, `run`, `spin`, `swipe`, `walk`) con matrices 100% finitas. |
| **Buggy** (`buggy_lod1.glb`) | 115.020 tris | **10.180 tris** (Carrocería 4.4k + 4 ruedas 5.7k) | **-91.1%** | 1.11 MB (vs 4.29 MB) | 4 ruedas independientes identificables (`Wheel_*`). |

---

## 2. Benchmark Cuantitativo en Motor Real (Apple M4 Pro / Chromium Metal)

Medición automatizada ejecutada con `scripts/bench-check.mjs` sobre `bench-lod.html`:

| Escenario | Entidades | Triángulos Totales | ms/cuadro (Mediana) | ms/cuadro (P95) | Draw Calls | FPS Estimados |
|---|---|---|---|---|---|---|
| **LOD0 (Héroe x20)** | 20 | 1.151.002 | 4.50 ms | 6.50 ms | 21 | ~222 FPS |
| **LOD1 (Horda x20)** | 20 | 74.762 | 3.90 ms | 5.90 ms | 21 | ~256 FPS |
| **LOD1 (Horda x50)** | 50 | 186.902 | 5.30 ms | 9.40 ms | 51 | ~188 FPS |
| **LOD1 (Horda x100)**| 100| 373.802 | **7.90 ms** | **9.80 ms** | 101 | **~126 FPS** |

### Conclusión Técnica
Con **100 enemigos activos** corriendo simultáneamente con animación esquelética completa en pantalla, el tiempo de cuadro se mantiene **por debajo de 10 ms (P95: 9.8 ms)**, garantizando ampliamente los 60 FPS (presupuesto de 16.6 ms) incluso antes de aplicar *culling* de frustum o VAT.

---

## 3. Archivos Producidos

1. **Modelos 3D y Fuentes:**
   - `assets-src/cinematic-3d/gemini-performance/frenchie_lod1.glb` (1.32 MB) y `frenchie_lod1.blend`.
   - `assets-src/cinematic-3d/gemini-performance/eulalio_lod1.glb` (1.41 MB) y `eulalio_lod1.blend`.
   - `assets-src/cinematic-3d/gemini-performance/buggy_lod1.glb` (1.11 MB) y `buggy_lod1.blend`.
2. **Scripts y Automatización:**
   - `assets-src/cinematic-3d/gemini-performance/build_lods.py`: Script de Blender reproducible para decimation rig-safe.
   - `assets-src/cinematic-3d/gemini-performance/verify_lods.py`: Suite de comprobación de integridad esquelética y deformación.
   - `scripts/bench-check.mjs`: Script de benchmark headless con Playwright y GPU Metal.
3. **Herramienta Interactiva de Benchmark:**
   - `bench-lod.html` y `src/bench_lod.ts`: Escenario de horda interactiva con controles en vivo de 20, 50 y 100 unidades.
4. **Evidencia Visual:**
   - `assets-src/cinematic-3d/gemini-performance/preview-horde-50.png`.
   - `assets-src/cinematic-3d/gemini-performance/preview-horde-100.png`.
5. **Documentación de Arquitectura:**
   - `docs/LOD_AND_INSTANCING_PLAN.md`.

---

## 4. Próximos Pasos de Integración al Juego

1. Conectar `frenchie_lod1.glb` y `eulalio_lod1.glb` al gestor de plantillas en `src/glb.ts` / `src/enemies.ts` cuando el ajuste gráfico esté en Detalle Alto / Ultra.
2. Implementar `BakedVertexAnimationManager` (VAT) para reducir los 101 draw calls a **1 único draw call** para toda la horda si se requiere escalar a dispositivos móviles de gama baja.
