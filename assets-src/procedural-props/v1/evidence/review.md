# Revisión Ponytail — props procedurales v1

2026-10-10. Alcance: generador Blender, helpers CarBuild/bicho reutilizados sin modificar, PNG/GLB/catálogo, visor Babylon, verificador y documentación. Carga prevista: una sesión local de producción y un visor de quince variantes; no multitudes del juego.

La entrega crea recursos estáticos completos con semillas, materiales y fuentes editables. No modifica consumidores activos ni depende de nuevas bibliotecas. Las salidas permanecen en su carpeta; regenerar esa versión reemplaza sus archivos, indicado en la guía.

Hallazgos corregidos antes del cierre:

1. La fachada Babylon del juego no exporta ArcRotateCamera; importación profunda igual a la usada por el banco existente. La prueba headless detectó el fallo y pasó después de corregirlo.
2. Convertir a lineal el búfer byte de albedo oscurecía madera y volvía rojiza la pintura amarilla. Se conserva el valor codificado, con lectura de control de los canales PNG y capturas reales después de regenerar.
3. El encuadre inicial cortaba columnas en móvil; radio ajustado por proporción y comprobación de las ocho esquinas del volumen de cada malla dentro del cuadro.
4. La reutilización de materiales reemplaza también submateriales antes de liberar duplicados. Blender abre solo una variante visible para evitar superposición inicial.

Sin hallazgos pendientes que bloqueen este alcance. Pasan auto-comprobaciones geométricas/PNG, inspección binaria de los quince GLB, selección y controles pc/cel. Tipos, 80 tests y build pasan sobre el árbol compartido; no certifican por sí solos el trabajo ajeno concurrente.

Límites deliberados: 19,84 MB de GLB con texturas autónomas repetidas, sin AO horneado, LOD, rigs o colisiones. Cargar solo una selección y compartir materiales/instancias al integrar. No medido rendimiento de hordas ni teléfono físico. El desgaste aún es uniforme; no se declara alcanzada la referencia cinematográfica.
