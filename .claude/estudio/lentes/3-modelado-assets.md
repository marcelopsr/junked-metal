# Lente 3 · Modelado y assets (3D procedural, siluetas, materiales)

## Misión
Que cada auto, bicho y prop sea reconocible por su silueta a distancia de cámara de juego, con materiales de juguete coherentes y a costo de render bajo.

## Subespecialidades
- Modelado procedural (primitivas combinadas, fusión de mallas).
- Siluetas, proporciones y animación esquelética simple (patas, pivotes).
- Materiales PBR de juguete y texturas procedurales o de archivo.
- Generación de arte con Capataz / imagegen y pipeline de importación.

## Principios
1. Silueta primero: si en negro sobre blanco no se distingue, el detalle no lo salva.
2. Pocas formas grandes + 1-2 detalles de carácter (pinche, collar, ojo); lo demás se pierde con la cámara elevada.
3. Pintura de juguete con bordes saltados (sale el gris), goma 0,9 con barro en las ranuras, metal pintado 0,6; óxido solo donde la pintura salta.
4. Una malla fusionada por plantilla; instancias por entidad. Nunca mallas sueltas por bicho.
5. Pivotes y escalas se corrigen en el modelo; si la malla crece, la colisión crece (y se confirma en captura).
6. Todo lo que entra al juego pasa por la ficha frontal y la lámina del registro.
7. Un recurso generado se mide y se registra antes de usarse.

## Criterios medibles en ESTE juego
- 41 personajes del bestiario con ficha frontal; cero Folded visibles.
- Draw calls y triángulos no suben más de 10 % en `perf` (solo si el usuario lo habilitó).
- Captura de la ficha en `shots --only bestiario` pc y cel sin recortes.
- Colisión de `DEF.<enemigo>.size` coherente con el tamaño visual (comprobar con captura de la vitrina).
- `ref_measure` de la escena donde aparece no empeora.

## Errores típicos ya vividos
- Grúa ×1,7 en la malla sin tocar `DEF.grua.size` (REVISION-0.92 #5).
- Aro y pinches del perro agregados antes de `bone(1)`: quedan con el torso, no con la cabeza (#6).
- Macetas creadas antes de posicionarse: la colisión quedó en el origen (Havok toma la pose al crear).
- 14 manchas de aceite con alfa sin fusionar: 14 draw calls transparentes en celular.
- Textura de piso compartida y liberada por `retex()`: el piso desaparece al cambiar calidad.

## Herramientas y archivos
`src/models.ts`, `src/folded_slice.ts`, `src/car_genes.ts` / `car_genes.json`, `src/enemies.ts`, `scripts/imagegen.mjs`, `scripts/make_tileable.py`, `assets-src/imagegen-production/`, `assets_manifest.json`, `npm run evo`, `docs/EVO_VEHICULOS.md`.

## Cuándo convocarla
Bicho o auto nuevo, ficha que no se lee, material que se ve plástico genérico, prop nuevo. Combina con 2 (evaluar contra la lámina), 8 (presupuesto) y 4 (colisión, pivotes, fugas).

## En Junked Metal
Plantillas instanciadas con `template()`, `carModel()` y `buggyHull` leen los genes del auto. Creación con física: posicionar la malla ANTES del `PhysicsAggregate`. Texturas procedurales con generador propio, no `rng()`.
