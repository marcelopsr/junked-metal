# Pixel Art 3D — lote 01

Candidatos de material generados en cinco atlas 2×2. Cada celda está disponible como PNG 256×256 y WebP lossless; los atlas originales se conservan en `atlases/`.

## Familias cubiertas

- Patio: hojarasca, tierra, césped, huerta, cemento y ladrillo.
- Garaje y chatarra: óxido corrugado, chapa turquesa gastada, hormigón aceitado y revoque.
- Props y vehículos: neumático, madera, pintura naranja/turquesa y vidrio ahumado.
- Criaturas: tres variantes de quitina y pelaje corto.

## Estado

Son **candidatos**, no reemplazos activos. Falta probar las costuras de repetición, el tamaño del texel en cámara, UV en mallas 3D, lectura en celular y el aspecto con la iluminación real. No hay mapas normales/ORM: se usarían mapas existentes o material plano hasta generar esos recursos.

## Recursos visuales que aún requieren tandas propias

1. Modelos 3D con UV: ocho autos RC y sus variantes; insectos, máquinas y mascotas/jefes; utilería del patio (árboles, arbustos, cajas, bidones, herramientas, rampas, auto real y rompibles); escenografía del taller y carrera.
2. Props de lectura: calcomanías, carteles, etiquetas y suciedad local, manteniendo la tipografía del mundo separada de los mapas repetibles.
3. Arte 2D que siga visible: retratos del bestiario, pilotos, armas/evoluciones, intro, taller y fondos de menú.
4. Presentación: materiales auxiliares/ORM si la dirección aprobada los necesita, y una pasada de iluminación/render para que el mundo sea pixel art 3D a resolución HD.

La relación detallada entre estos mapas y sus posibles consumidores está en `manifest.json`. No cambiar `docs/ART_DIRECTION.md` ni conectar los candidatos a la partida hasta revisar una muestra aplicada.
