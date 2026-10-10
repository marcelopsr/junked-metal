# Handoff: Bulldog Francés ("Frenchie") 3D Cinematográfico

Entrega de fidelidad visual cinematográfica del modelo 3D del Bulldog Francés ("Frenchie") para **Junked Metal**, adaptado a partir del rig original `assets-src/perro/perro.blend` para igualar la referencia aprobada [`10-frenchie-gris.png`](../intro/cinematic-v1/10-frenchie-gris.png).

---

## 1. Métricas Principales del Modelo

| Métrica | Valor | Especificación / Referencia |
|---|---|---|
| **Archivo GLB** | `frenchie.glb` | 3,395,748 bytes (~3.4 MB) |
| **Archivo Blend** | `frenchie.blend` | 2,923,479 bytes (~2.9 MB, texturas empaquetadas) |
| **Triángulos** | 57,550 tris | Malla única unificada (`Perro.002`) con Subsurf x1 aplicado |
| **Vértices** | 36,384 verts | Sin huecos, sin costuras abiertas, estanco y manifold |
| **Esqueleto** | `PerroRig` (21 huesos) | Rest pose y escalas compatibles con el original de Babylon.js |
| **Clips de Animación** | **7 clips (100% preservados)** | `charge`, `death`, `idle`, `jump_slam`, `rage`, `run`, `walk` |
| **Matrices Óseas** | **Finitas en todos los fotogramas** | Cero NaNs, cero Infs verificados en todos los clips |
| **Materiales PBR** | 1 unificado (`FrenchieCoat`) | Shader Principled PBR con Albedo, Normal y ORM |
| **Texturas PBR** | 3 mapas (1024×1024 PNG) | Albedo, Normal (tangent-space con micro-pelaje), ORM |

---

## 2. Fidelidad Anatómica y Dirección de Arte

El modelo cumple rigurosamente con todos los rasgos distintivos de la referencia cinematográfica:

1. **Orejas de Murciélago (Bat Ears):**
   - Altura compactada (factor 0.74 en malla y huesos de edición `ear_R` / `ear_L`) para eliminar las proporciones de orejas de conejo del modelo anterior.
   - Contorno elíptico con puntas redondeadas, flare exterior de ~15° y concavidad frontal.
   - Cara interna en tono rosado cálido (`#c49694`).
2. **Cráneo y Fisonomía Facial:**
   - Cráneo plano y cuadrado con ensanchamiento temporal/masetero.
   - Stop nasal pronunciado a 90°.
   - Pliegues y arrugas frontales onduladas sobre el stop.
   - Belfos carnosos caídos (flews) cubriendo la comisura de la mandíbula inferior.
   - Trufa anatómica negra satinada (`#141618`, roughness 0.30) con narinas esculpidas hacia el interior y surco de filtrum vertical.
3. **Ojos Expresivos 3D ("Grumpy Bulldog"):**
   - Esferas 3D con curvatura corneal anatómica adelantada.
   - Sistema concéntrico de materiales por anillos:
     - Pupila central negra profunda (`#050506`).
     - Iris prominente en color ámbar/miel dorado (`#c47820`, roughness 0.08).
     - Esclerótica marfil circundante (`#e8e2d5`).
   - Párpado superior caído (hooded brow) que cubre el 20-30% superior del iris, proyectando la clásica mirada severa y gruñona de la ilustración.
4. **Musculatura y Postura:**
   - Pecho ancho y bajo con pectorales dobles prominentes y hendidura esternal central marcada.
   - Hombros robustos y codos proyectados hacia afuera (postura bulldog encorvada y baja).
   - Cola corta en espiral / muñón compacta en la rabadilla (`tail`).
5. **Patas y Garras (16 Dedos y 16 Garras):**
   - 4 dedos carnosos independientes en arco por cada pata (delanteras y traseras).
   - Almohadillas plantares y garras oscuras curvadas (`#202328`) en cada dedo apuntando hacia el suelo.
   - Influencias ponderadas al 100% a sus respectivos huesos de pata (`fpaw_L`, `fpaw_R`, `hpaw_L`, `hpaw_R`).
6. **Babero Marfil (Chest Patch):**
   - Mancha orgánica marfil (`#f5f1e8`, roughness 0.85) delimitada sobre el pecho y esternón con bordes rasgados, visible en ángulos frontales y de 3/4.

---

## 3. Galería de Renders de Verificación

Los 4 renders capturados en EEVEE con iluminación balanceada de 3 puntos (Key cálido, Fill frontal y Rim cian) demuestran la fidelidad:

- **Frontal (`frenchie_front.png`):** Muestra el babero marfil en el pecho, la separación de los 4 dedos y garras por pata, la postura bulldog y la vivacidad de los ojos ámbar y bat ears.
- **Tres Cuartos (`frenchie_three_quarter.png`):** Exhibe el volumen muscular de los pectorales y hombros, la colita en espiral, las patas traseras y la silueta del hocico chato.
- **Primer Plano Rostro (`frenchie_head_close.png`):** Confirma el iris ámbar brillante con pupila negra, ceño caído, trufa negra con narinas, stop nasal a 90° y pliegues en la frente.
- **Detalle de Patas (`frenchie_paws.png`):** Demuestra los 4 dedos individuales carnosos con sus respectivas garras oscuras en las 4 extremidades.

---

## 4. Reproducción y Verificación Automatizada

### Compilación completa desde cero
```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/cinematic-3d/gemini-frenchie/build_frenchie.py
```
*Genera `frenchie.blend`, hornea mapas PBR con Cycles Metal GPU, exporta `frenchie.glb` y produce los 4 renders de comprobación.*

### Suite de verificación de animaciones y matrices
```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --python assets-src/cinematic-3d/gemini-frenchie/verify_frenchie.py
```
*Valida que existan los 7 clips, comprueba que ninguna matriz contenga NaNs o Infs en ningún fotograma y certifica la integridad de la malla.*
