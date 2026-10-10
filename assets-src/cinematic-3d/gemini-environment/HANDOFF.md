# Handoff: Entorno Cinematográfico 3D — Vegetación, Cerca, Luces y Suelo

- **Fecha:** 2026-10-10
- **Especialista:** Gemini Environment Specialist
- **Estado:** Validado localmente (modelos 3D glTF/GLB exportados, fuentes Blender empaquetadas, texturas PBR generadas y 5 capturas de evidencia renderizadas)
- **Carpeta aislada asignada:** `assets-src/cinematic-3d/gemini-environment/`

---

## 1. Objetivo y Referencia Visual

Elevar los componentes ambientales del patio hacia la calidad y acabado de la ilustración cinematográfica de referencia en **`assets-src/intro/cinematic-v1/03-entrada-fondo.png`**:
1. **Pasto Orgánico y Matas Curvas:** Sustituir las láminas triangulares rígidas por matas curvas con curvatura natural arqueada hacia el suelo, canaladura transversal en V, variación entre briznas finas y hojas anchas tipo maleza silvestre, y material PBR con gradiente vertical (raíz ocre → verde oliva → punta dorada que capta la luz rasante) y traslucidez simulada.
2. **Cerca y Delimitación de Pista:** Estacas bajas con abrazaderas metálicas y cáncamos de hierro por los que pasa una cuerda trenzada de color naranja/rojo seguridad delimitando la pista. Al fondo, cerca de madera envejecida con silueta irregular, puntas agrietadas y nudos.
3. **Superficie del Terreno y Huellas:** Suelo de tierra compactada con relieve topográfico, mapa de normales con huellas de neumáticos de autos RC grabadas en bajorrelieve y gravilla dispersa.
4. **Catenaria de Luces de Patio:** Cable suspendido con catenaria física real, portalámparas moldeados con collar de latón, bombillas vintage tipo lágrima Edison ST64 y filamento interno incandescente brillante (#ffaa44, emisión x10).

---

## 2. Recursos Producidos en `assets-src/cinematic-3d/gemini-environment/`

### A. Modelos 3D y Fuentes Blender
| Archivo GLB | Fuente .blend | Primitivas y Geometría | Triángulos | Materiales PBR asignados |
|---|---|---|---|---|
| **`vegetation.glb`** (225 KB) | `vegetation.blend` | 5 arquetipos: `GrassTuft_Fine`, `GrassTuft_Broad`, `GrassTuft_Tall`, `GrassTuft_Mixed`, `GrassTuft_Patch_1x1` | 2.280 | `M_Vegetation_Organic` (Double-sided, Albedo gradiente vertical, Normal V-crease, Subsurface) |
| **`fence_boundary.glb`** (9,0 MB) | `fence_boundary.blend` | 4 ensamblajes: `SafetyStake_Single`, `SafetyBarrier_Straight`, `SafetyBarrier_Corner`, `Fence_AgedSection_5m` | 2.116 | `M_AgedWood` (Albedo, Normal, ORM), `M_RustedHardware`, `M_SafetyRope` (Albedo trenzado) |
| **`patio_lights.glb`** (189 KB) | `patio_lights.blend` | 2 ensamblajes: `Garland_Edison_Span` (18m, 14 lámparas), `EdisonPendant_Single` | 6.336 | `M_Garland_Cable`, `M_Edison_Socket`, `M_Edison_Brass`, `M_Edison_Glass` (Blend trans.), `M_Filament_Incandescent` (Emisión #ffaa44 x10) |
| **`ground_terrain.glb`** (7,2 MB) | `ground_terrain.blend` | 2 mallas: `Ground_ArenaSection` (22×22m con relieve), `Ground_PebbleScatter` (80 piedras facetadas) | 5.568 | `M_Ground_CompactedTracks` (Albedo compuesto tierra+huellas, Normal en bajorrelieve), `M_Pebbles_Scatter` |

### B. Suite de Texturas PBR en `textures/`
- `grass_gradient_albedo.png` (512×512): Gradiente vertical continuo desde raíz oscura (#2a2b15), tallo oliva (#3a521c), cuerpo verde (#537725) hasta punta dorada cálida (#b0c73d), con nervadura central y bordes translúcidos.
- `grass_gradient_normal.png` (512×512): Mapa de normales de canaladura transversal en V que modela el volumen de cada hoja para reflejar la luz rasante en un lado y sombrear el opuesto.
- `ground_compacted_tracks_albedo.png` (1254×1254): Composición de tierra compactada (`01-compacted-earth.webp`) con marcas de neumáticos RC (`02-tire-marks.webp`), oscurecimiento por compactación y manchas de caucho.
- `ground_compacted_tracks_normal.png` (1254×1254): Mapa de normales con las huellas de tacos grabadas en bajorrelieve sobre el micro-grano de la tierra.
- `aged_wood_albedo.png`, `aged_wood_normal.png`, `aged_wood_orm.png` (1254×1254): Texturas derivadas de `04-aged-wood.webp` para tablones envejecidos con vetas y nudos en relieve.
- `safety_rope_albedo.png` (256×256): Textura de cuerda trenzada helicoidal de 3 cabos en color naranja de seguridad (#e24e23 / #7a220e).

### C. Herramientas y Catálogo
- `build_environment.py`: Script maestro ejecutable en Blender 5.2.2 LTS que regenera proceduralmente todas las texturas, mallas, materiales, empaqueta datos y exporta los 4 GLBs y 5 capturas.
- `index.html`: Galería web y catálogo técnico responsive.
- `environment_manifest.json`: Manifiesto estructurado de los módulos creados.

---

## 3. Evidencia Visual Renderizada

Se renderizaron 5 capturas de comprobación a 1280×720 en Blender con iluminación nocturna rasante (luna fría + foco cálido):
1. **`preview-combined.png`** (1,5 MB): Vista general del set integrado a ras de suelo coincidente con la composición de `03-entrada-fondo.png`.
2. **`preview-vegetation.png`** (1,3 MB): Primer plano de las matas de pasto fino, hojas anchas de maleza silvestre y respuesta al foco cálido.
3. **`preview-fence.png`** (1,3 MB): Perspectiva de las estacas bajas con abrazaderas de hierro, cáncamos, cuerda naranja de delimitación y cerca envejecida al fondo.
4. **`preview-lights.png`** (1,6 MB): Detalle superior de la catenaria con portalámparas vintage, bombilla ST64 y filamento incandescente brillante.
5. **`preview-ground.png`** (1,2 MB): Vista rasante del suelo mostrando el relieve de las huellas de rodadura RC y piedras facetadas.

---

## 4. Qué Cambia y Qué Conserva

- **Qué cambia:**
  - Sustituye las láminas triangulares planas provisionales de `art_lab.ts` por matas curvas modeladas en 3D con curvatura hacia el suelo y variación de especies (pasto fino + maleza ancha).
  - Sustituye los cubos uniformes de cerca por estacas bajas con herrajes de hierro y cuerda de seguridad naranja trenzada, más tablones de cerca envejecida con siluetas asimétricas y nudos.
  - Sustituye las esferas simples de luz por bombillas Edison transparentes con filamento incandescente de alta intensidad.
  - Sustituye el suelo liso por terreno con huellas de rodadura RC grabadas en relieve normal y piedras dispersas.
- **Qué conserva:**
  - Trabajo 100% aislado dentro de `assets-src/cinematic-3d/gemini-environment/`. No se modificaron prematuramente archivos del juego activo (`main.ts`, `world.ts`), ni el banco experimental compartido `src/art_lab.ts`.
  - Respeta las direcciones de arte de `docs/ART_DIRECTION.md` (sin emojis, paleta Rajdhani, sin voseo).
  - Los modelos cuentan con baja/media densidad de polígonos adecuada para rendering en tiempo real e instanciación mediante `thinInstance`.

---

## 5. Guía de Integración en `src/art_lab.ts`

Para el orquestador que integre estos componentes en la escena general, estos son los fragmentos exactos listos para incorporar:

### Paso 1: Carga de los contenedores GLB
```typescript
const [vegAsset, fenceAsset, lightsAsset, groundAsset] = await Promise.all([
  B.LoadAssetContainerAsync('assets-src/cinematic-3d/gemini-environment/vegetation.glb', scene),
  B.LoadAssetContainerAsync('assets-src/cinematic-3d/gemini-environment/fence_boundary.glb', scene),
  B.LoadAssetContainerAsync('assets-src/cinematic-3d/gemini-environment/patio_lights.glb', scene),
  B.LoadAssetContainerAsync('assets-src/cinematic-3d/gemini-environment/ground_terrain.glb', scene),
]);

vegAsset.addAllToScene();
fenceAsset.addAllToScene();
lightsAsset.addAllToScene();
groundAsset.addAllToScene();
```

### Paso 2: Instanciación de Vegetación Orgánica (Sustituyendo `blade`)
```typescript
// Ocultar mallas maestras de la biblioteca
const tuftFine = vegAsset.meshes.find(m => m.name === 'GrassTuft_Fine_Mesh') as B.Mesh;
const tuftBroad = vegAsset.meshes.find(m => m.name === 'GrassTuft_Broad_Mesh') as B.Mesh;
const tuftTall = vegAsset.meshes.find(m => m.name === 'GrassTuft_Tall_Mesh') as B.Mesh;

// Configurar thin instances sobre GrassTuft_Fine
const matricesFine: number[] = [];
const matricesBroad: number[] = [];

for (let i = 0; i < (mobile ? 600 : 1500); i++) {
  const x = (random() - 0.5) * 26, z = (random() - 0.5) * 24;
  if (Math.abs(x) < 4.5 && Math.abs(z) < 3.5) continue; // Pista despejada para autos
  const scale = 0.6 + random() * 0.8;
  const yaw = random() * Math.PI * 2;
  const m = B.Matrix.Compose(
    new B.Vector3(scale, scale, scale),
    B.Quaternion.RotationYawPitchRoll(yaw, 0, 0),
    new B.Vector3(x, 0, z)
  );
  if (random() > 0.3) {
    matricesFine.push(...m.m);
  } else {
    matricesBroad.push(...m.m);
  }
}

tuftFine.thinInstanceSetBuffer('matrix', new Float32Array(matricesFine), 16);
tuftBroad.thinInstanceSetBuffer('matrix', new Float32Array(matricesBroad), 16);
```

### Paso 3: Posicionamiento de Cerca y Luces
```typescript
// Colocar cerca de tablas al fondo
const fenceSection = fenceAsset.meshes.find(m => m.name === 'Fence_AgedSection_5m_Mesh');
if (fenceSection) {
  fenceSection.position.set(0, 0, -8);
}

// Colocar barreras de estacas con cuerda de seguridad delimitando el borde de la pista
const straightBarrier = fenceAsset.meshes.find(m => m.name === 'SafetyBarrier_Straight_Mesh');
if (straightBarrier) {
  straightBarrier.position.set(-3.5, 0, 3.2);
}

// La guirnalda Edison ya cuenta con catenaria suspendida a 5.3m de altura
const garland = lightsAsset.meshes.find(m => m.name === 'Garland_Edison_Span_Mesh');
if (garland) {
  garland.position.set(0, 0, -5.0);
}
```

---

## 6. Comprobaciones y Verificación Ejecutada

- **Exportación en Blender:** `python assets-src/cinematic-3d/gemini-environment/build_environment.py` ejecutado de inicio a fin con salida 0.
- **Validación de esquemas glTF 2.0:** Inspeccionado con `npx @gltf-transform/cli inspect`:
  - `vegetation.glb`: 5 primitivas, `TEXCOORD_0`, normales suaves, material de doble cara.
  - `fence_boundary.glb`: 4 primitivas, materiales desacoplados para madera, hierro y cuerda, UVs generadas.
  - `patio_lights.glb`: 5 primitivas, material de filamento emisor desacoplado del vidrio y portalámparas.
  - `ground_terrain.glb`: Malla 22×22m con normales compuestas para relieve de neumáticos.
- **Estado del repositorio:**
  - `npx tsc --noEmit -p .`: 0 errores.
  - `npm test`: 75 pruebas pasando.

---

## 7. Siguiente Paso

El orquestador de la sesión visual (`art_lab.ts`) puede tomar los 4 GLBs y texturas de `assets-src/cinematic-3d/gemini-environment/` para conectarlos a `art_lab.ts`, ejecutando la verificación unificada con `node scripts/cinematic-check.mjs`.
