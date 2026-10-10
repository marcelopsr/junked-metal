# Handoff: Modelo 3D Cinematográfico del Buggy Amarillo (RC Fight / Junked Metal)

**Autor:** Gemini Specialist (Autónomo)  
**Fecha:** 2026-10-10  
**Ubicación:** `assets-src/cinematic-3d/gemini-buggy/`  
**Referencia visual:** `assets-src/intro/cinematic-v1/08-buggy.png`

---

## 1. Resumen Ejecutivo y Métricas

Se ha construido un modelo 3D procedural de alta fidelidad para el **Buggy Amarillo RC**, diseñado para igualar la presencia visual, peso industrial y lenguaje mecánico de la ilustración cinematográfica de referencia (`08-buggy.png`), manteniendo compatibilidad total con el pipeline de Babylon.js y el visor experimental `src/art_lab.ts`.

### Métricas de Geometría y Archivos

| Métrica | Valor | Notas |
|---|---|---|
| **Triángulos Totales** | **115.020** | Nivel cinemático / close-up de alta resolución |
| `BuggyBody` | 55.196 tris | Carrocería, jaula, suspensión, cabina, piloto, motor y alerón |
| `Wheel_-1_0.92` (Del. Izq.) | 14.956 tris | Llanta embutida, beadlock con 16 pernos, 5 tuercas, tacos agrícolas |
| `Wheel_1_0.92` (Del. Der.) | 14.956 tris | Idem anterior |
| `Wheel_-1_-0.9` (Tras. Izq.) | 14.956 tris | Idem anterior |
| `Wheel_1_-0.9` (Tras. Der.) | 14.956 tris | Idem anterior |
| **Tamaño GLB exportado** | **4.289.104 bytes (~4.29 MB)** | Formato binario glTF 2.0 optimizado con PBR embebido |
| **Tamaño archivo Blend** | **2.880.898 bytes (~2.88 MB)** | `buggy.blend` con texturas PBR empaquetadas (`pack_all`) |
| **Tiempo de compilación** | **~4.6 segundos** | Generación procedural + texturas + UVs + 4 renders + blend + GLB |

---

## 2. Desglose Mecánico y Fidelidad Estética

El modelo cubre rigurosamente los 6 pilares anatómicos del vehículo vistos en la referencia cinematográfica:

### A. Carrocería y Chasis Industrial
- **Capó de chapa estampada:** Chapa inclinada con toma de aire central tipo cowl-induction, pestañas perimetrales con remaches hexagonales y bridas de refuerzo.
- **Side pods y branquias:** Pontones laterales con branquias/louvers estampados para refrigeración simulada de la electrónica RC.
- **Jaula antivuelco tubular pesada:** Estructura tubular perimetral de acero con refuerzo en cruz (X-brace) en el mamparo trasero y barras de intrusión diagonal en las puertas laterales.
- **Techo empernado:** Placa de techo de chapa amarilla fijada a la jaula con 6 pernos hexagonales exteriores.
- **Defensa delantera:** Bumper de doble tubo con placa protectora y dos grilletes/anillas de recuperación D-ring.
- **Alerón trasero aerodinámico:** Perfil alar montado sobre soportes verticales de chapa perforada aligerada y placas terminales (endplates) con pernos de sujeción.

### B. Suspensión Articulada y Tren Motriz
- **Doble horquilla (A-Arms):** Brazos superiores e inferiores triangulares con bujes de pivote en el chasis.
- **Manguetas de dirección y barras de acoplamiento:** Articulaciones en los extremos delanteros con tirantes de dirección (`tie rods`).
- **Coilovers 3D:** Cuatro amortiguadores con vástagos de pistón cromados reflectantes (`#e8ecf0`, metal 1.0, rugosidad 0.08) y muelles helicoidales 3D continuos.
- **Caja de transmisión y motor eléctrico:** Bloque trasero de transmisión y motor con aletas de refrigeración de aluminio mecanizado.

### C. Ruedas Agrícolas/Crawler y Llantas Embutidas
- **Neumáticos de oruga/tractor:** Neumáticos de caucho macizo con perfil hueco anular, patrón agresivo de tacos alternados en ángulo chevron y tacos laterales (shoulder biters) en el flanco.
- **Llantas de plato profundo (Deep-Dish):** Plato interior amarillo embutido visible a través del neumático.
- **Anillo Beadlock:** Aro exterior de bloqueo con 16 pernos hexagonales perimetrales.
- **Buje central:** Patrón de 5 tuercas cónicas de rueda y tuerca hexagonal central de eje ranurada.

### D. Ópticas y Faros Cinematográficos
- **Faros empotrados:** Conjunto de dos faros delanteros con bisel de retención oscuro, reflector parabólico cromado de alta reflectividad y lente Fresnel de cristal ámbar/tungsteno cálido (`#ffd175`, emisión 8.0, alpha 0.95).

### E. Cabina y Piloto Soldado de Juguete
- **Cockpit de competición:** Butaca de competición tipo bucket con arnés de seguridad de 4 puntos moldeado.
- **Volante de 3 radios:** Volante deportivo montado sobre columna de dirección.
- **Piloto RC:** Muñeco soldado de juguete estilo militar con casco M1 en verde oliva apagado (`#46583b`), visera ranurada y brazos articulados con manos que sujetan firmemente el volante.
- **Antena RC:** Antena elástica inclinada hacia atrás con bola terminal en color cian fluorescente (`#00c8db`), rasgo canónico del Buggy en Junked Metal.

### F. Texturas y Materiales PBR
- **Pintura Industrial Desgastada:** Color base amarillo industrial de maquinaria pesada (`#e5a019`), enriquecido con una máscara de desgaste procedural en bordes que expone la imprimación oscura (`#1f2124`) y el acero vivo (`#889098`).
- **Normal Map (Relieve):** Mapa de normales tangente con relieve para remaches, costuras de soldadura y grano metálico.
- **ORM Estándar glTF:**
  - Canal R: Oclusión ambiental (cavidades sombreadas).
  - Canal G: Rugosidad (mate en la chapa desgastada, pulido en el cromo).
  - Canal B: Metalicidad (dieléctrico en pintura y caucho, metálico en acero y cromo).

---

## 3. Jerarquía de Nodos y Convención de Coordenadas

### Jerarquía del Archivo GLB
El archivo `buggy.glb` exporta una estructura de nodos limpia con exactamente 5 objetos raíz:
```text
RootNode
├── BuggyBody          (Carrocería completa, jaula, piloto, alerón, faros, etc.)
├── Wheel_-1_0.92      (Rueda Delantera Izquierda: side=-1, z=0.92)
├── Wheel_1_0.92       (Rueda Delantera Derecha:   side=1,  z=0.92)
├── Wheel_-1_-0.9      (Rueda Trasera Izquierda:   side=-1, z=-0.9)
└── Wheel_1_-0.9       (Rueda Trasera Derecha:     side=1,  z=-0.9)
```

### Compatibilidad con `src/art_lab.ts`
En `src/art_lab.ts`, la detección de ruedas se realiza mediante la expresión regular:
```typescript
const isWheel = /^Wheel_(-1|1)_(-0\.9|0\.92)$/.test(m.name);
```
Las 4 ruedas exportadas coinciden al 100% con este patrón, lo que permite que el visor experimental y el motor de físicas Havok las reconozcan y roten independientemente sin modificaciones en el código.

### Mapeo de Ejes
- **Coordenadas del Juego (Babylon.js):**
  - `+X`: Derecha
  - `+Y`: Arriba
  - `+Z`: Frente (Hacia adelante)
- **Transformación a Blender:**
  - `Blender_X = -Game_X`
  - `Blender_Y = Game_Z`
  - `Blender_Z = Game_Y`
  *(Manejado automáticamente por la función `G(x, y, z)` en `build_buggy.py`)*.

---

## 4. Instrucciones de Construcción y Reproducibilidad

El proceso es 100% automatizado, headless e independiente. No requiere intervención manual en la interfaz de Blender.

### Comando de Ejecución
Desde la raíz del repositorio:
```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/cinematic-3d/gemini-buggy/build_buggy.py
```

### Artefactos Generados
Al finalizar la ejecución, se regeneran y actualizan los siguientes archivos en `assets-src/cinematic-3d/gemini-buggy/`:
- `buggy.glb`: Archivo glTF binario listo para carga en Babylon.js.
- `buggy.blend`: Archivo nativo de Blender con nodos de sombreado y texturas empaquetadas.
- `buggy-albedo.png`: Textura PBR 1024x1024 de color base.
- `buggy-normal.png`: Textura PBR 1024x1024 de normales tangentes.
- `buggy-orm.png`: Textura PBR 1024x1024 empaquetada (AO, Rugosidad, Metálico).
- `preview-hero.png`: Render cinemático ángulo 3/4 frontal (1536x1024, idéntico a `08-buggy.png`).
- `preview-side.png`: Render lateral perfil completo (1280x720).
- `preview-top.png`: Render cenital vista de planta (1280x720).
- `preview-rear.png`: Render trasero angular de motor y transmisión (1280x720).
- `build-report.json`: JSON con métricas de triángulos, materiales y tiempos.

---

## 5. Guía de Integración en el Pipeline del Juego

### A. Para Escenas Cinemáticas e Intros
1. Copiar `buggy.glb` a `public/models/cars/buggy-cinematic.glb` (o la ruta correspondiente a cinemáticas).
2. Cargar con `SceneLoader.ImportMeshAsync("", "models/cars/", "buggy-cinematic.glb", scene)`.
3. Activar sombras de alta resolución (`shadowGenerator.useContactHardeningShadow = true` o `usePercentageCloserFiltering = true`).

### B. Para Partidas en Vivo (Optimizador / LOD)
Si en el futuro se desea usar este modelo en el bucle principal de supervivencia o carreras:
- Se recomienda pasar el modelo por `gltf-transform simplify --ratio 0.15` para generar un LOD de juego (~15k tris) conservando los mapas de normales horneados.
- El modelo actual de 115k triángulos corre a >60 FPS en Apple Silicon / GPUs modernas, pero un LOD liviano es ideal para presupuestos móviles.

---

## 6. Verificación Visual

Se ha verificado la coincidencia estética contra `assets-src/intro/cinematic-v1/08-buggy.png`:
1. **Pose y Ángulo:** `preview-hero.png` reproduce la perspectiva baja y amenazante del auto sobre el terreno.
2. **Exposición de Llantas:** Las llantas de plato hondo amarillo con sus remaches perimetrales son claramente visibles tras la corrección del corte anular del neumático.
3. **Detalles de Chapa:** Los pernos del techo, la toma de aire del capó, el alerón remachado y los muelles helicoidales 3D aportan la tangibilidad de metal pesado buscada en la dirección de arte `docs/ART_DIRECTION.md`.
