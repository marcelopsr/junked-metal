# Handoff: Gato "Eulalio" 3D Cinematográfico

Entrega de fidelidad visual cinematográfica del modelo 3D del gato **Eulalio** para **Junked Metal**, esculpido, texturizado y verificado de forma autónoma a partir del rig original `assets-src/gato/gato.blend` para igualar la referencia oficial aprobada [`07-eulalio.png`](../../intro/cinematic-v1/07-eulalio.png).

---

## 1. Métricas Principales del Modelo

| Métrica | Valor | Especificación / Referencia |
|---|---|---|
| **Archivo GLB** | `eulalio.glb` | 3,596,552 bytes (~3.6 MB) |
| **Archivo Blend** | `eulalio.blend` | 3,065,808 bytes (~3.1 MB, texturas empaquetadas) |
| **Triángulos** | 58,496 tris | Malla única unificada (`Gato.002`) con Subsurf x1 aplicado |
| **Vértices** | 29,561 verts (38,173 con splits UV/normales en GLB) | Estanco, manifold, sin costuras abiertas |
| **Esqueleto** | `GatoRig` (24 huesos) | Rest pose y escalas 100% compatibles con Babylon.js |
| **Clips de Animación** | **8 clips (100% preservados)** | `death`, `idle`, `jump`, `rage`, `run`, `spin`, `swipe`, `walk` |
| **Matrices Óseas** | **Finitas en todos los fotogramas** | Cero NaNs, cero Infs verificados en todos los clips y frames |
| **Materiales PBR** | 1 unificado (`EulalioCoat`) | Shader Principled PBR con Albedo, Normal y ORM |
| **Texturas PBR** | 3 mapas (1024×1024 PNG) | Albedo, Normal (tangente con micro-pelaje), ORM |

---

## 2. Fidelidad Anatómica y Dirección de Arte

El modelo cumple con todos los requerimientos anatómicos y estéticos de la ilustración de referencia:

1. **Silueta Felina y Mechones de Pelaje Esponjoso:**
   - Base de pelaje atigrado anaranjado cálido (*ginger tabby*, `#ea6c18`) con volumen corporal ampliado y redondeado.
   - Mechones escalonados en 3 niveles en las mejillas (*jowls* felinos) que otorgan la silueta triangular y ancha característica de Eulalio.
   - Mechones protectores en los bordes de las orejas y pelaje interior.
   - Pectorales y flancos redondeados con transición suave hacia la panza y el lomo.

2. **Ojos de Eulalio ("Bored / Condescending Cat"):**
   - Forma almendrada estilizada perfectamente integrada a la curvatura facial.
   - Iris prominente en color verde-amarillento pálido / chartreuse (`#d4e157` / `#cddc39`, roughness 0.08 satinado/especular).
   - Pupila vertical elíptica en hendidura negra profunda (`#080808`).
   - Delineador oscuro perimetral (`#140e0c`) que define el contorno del ojo.
   - Párpado superior encapuchado caído a medio cerrar con inclinación de ~10° hacia el exterior, proyectando la icónica actitud aburrida, escéptica y condescendiente de la ilustración.

3. **Hocico, Bigotera, Nariz y Bigotes:**
   - Bigoteras redondeadas prominentes en color crema/marfil (`#faf1e3`), uniéndose en la línea media.
   - Nariz rosada definida (`#e85b7a`, roughness 0.35) con forma triangular invertida, orificios nasales oscuros (`#38121a`) y surco de filtrum vertical.
   - Barbilla redondeada en color crema bajo la comisura descendente de la boca ("meh frown").
   - 6 bigotes estilizados tridimensionales (3 por lado) curvados con caída natural hacia las puntas en color blanco puro (`#ffffff`).

4. **Babero Pectoral en Capas (Chest Bib):**
   - Cascada frontal prominente en color crema/blanco que va desde la garganta (bajo la barbilla) hasta la parte inferior del pecho entre las patas delanteras.
   - Estructurado en 4 niveles de mechones triangulares superpuestos que proyectan volumen 3D hacia adelante, apoyados sobre un fondo continuo en crema.

5. **Patas con Calcetines Blancos, 4 Dedos, Garras y Almohadillas:**
   - Calcetines blancos que cubren los pies y se extienden por el antebrazo.
   - 4 dedos carnosos y redondeados individuales por cada pata (16 dedos en total).
   - Garras retráctiles oscuras (`#22201e`, roughness 0.45) asomando sutilmente entre los dedos.
   - Almohadillas digitales en cada dedo y almohadilla central plantar en tono malva satinado (`#785660`, roughness 0.50).
   - Influencias ponderadas al 100% en sus respectivos huesos (`fpaw_L`, `fpaw_R`, `hpaw_L`, `hpaw_R`).

6. **Cola Esponjosa Atigrada:**
   - Cola radialmente engrosada (factor 1.48x) con punta redondeada y contorno esponjoso.
   - Patrón de anillos atigrados oscuros rojizos (`#822808`) intercalados con la base naranja.
   - Ponderación continua a lo largo de los huesos `tail1` → `tail2` → `tail3` → `tail4`.

7. **Materiales y Texturas PBR:**
   - **Pelaje mate suave:** Roughness ~0.82, metálico 0.0.
   - **Ojos de alto brillo:** Roughness ~0.08 para reflejos especulares de la córnea.
   - **Nariz satinada:** Roughness ~0.35.
   - **Normal map:** Combina las curvaturas anatómicas horneadas con micro-textura de relieve de pelaje procedural.
   - **ORM map:** Empaqueta Occlusion en R, Roughness en G y Metallic en B.

---

## 3. Galería de Renders de Verificación

Los 4 renders capturados en EEVEE con iluminación de estudio de 4 puntos (Key cálido, Fill frontal, Rim cian y Bounce inferior) demuestran la fidelidad:

- **Primer Plano de Cabeza (`eulalio_head_close.png`):** Exhibe los ojos almendrados chartreuse con pupila en hendidura, la caída condescendiente de los párpados superiores, la nariz rosada con narinas, la bigotera crema, los 6 bigotes blancos, los mechones de las mejillas y las orejas.
- **Frontal Completo (`eulalio_front.png`):** Muestra el babero pectoral en capas, los calcetines blancos, la separación de los 4 dedos por pata y la pose firme.
- **Tres Cuartos (`eulalio_three_quarter.png`):** Muestra la cola gruesa atigrada con anillos, las rayas curvas del lomo, los mechones laterales y la silueta esponjosa.
- **Detalle de Patas (`eulalio_paws.png`):** Confirma los 4 dedos cilíndricos carnosos independientes con sus respectivas garras oscuras y calcetines en las 4 extremidades.

---

## 4. Reproducción y Verificación Automatizada

### Compilación completa desde cero
```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/cinematic-3d/gemini-eulalio/build_eulalio.py
```
*Genera la geometría con Subsurf, hornea albedo, normal y orm en Cycles Metal GPU, crea el material unificado `EulalioCoat`, normaliza pesos de huesos, guarda `eulalio.blend` con texturas empaquetadas, exporta `eulalio.glb` y produce los 4 renders de comprobación.*

### Suite de verificación de animaciones y matrices
```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/cinematic-3d/gemini-eulalio/verify_eulalio.py
```
*Valida que existan los 8 clips, comprueba que ninguna matriz contenga NaNs o Infs en ningún fotograma y certifica la integridad de la malla.*

---

## 5. Próximos Pasos

1. **Integración Cinemática:** El archivo `eulalio.glb` está listo para ser cargado en las escenas cinematográficas o en la galería de personajes cinemáticos junto a `buggy.glb` y `frenchie.glb`.
2. **Compatibilidad en Juego:** Como conserva idénticos los 24 huesos y los 8 clips de `GatoRig`, puede reemplazar o alternar como skin HD del jefe gato en el juego cuando se active el render cinematográfico.
