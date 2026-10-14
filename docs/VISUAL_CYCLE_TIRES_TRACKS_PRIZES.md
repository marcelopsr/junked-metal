# Ciclo visual local: neumáticos, huellas y premios

Fecha: 2026-10-13. El usuario eligió las tres opciones de pulido visual.

## Alcance

1. Neumáticos de descarte del patio: mejorar la separación visual entre las dos cubiertas y la lectura del caucho con los materiales y mallas actuales. Conservar sus cuerpos físicos y la respuesta a impactos.
2. Huellas de la zona de chatarra: desvanecer los extremos del decal existente sin mover su recorrido ni modificar las otras huellas del patio.
3. Premios de la grúa Folded: aumentar la separación de color y luz frente al vidrio, conservando geometría, encuadre, instancias y colisiones.

## Ruta mínima

- Revisar capturas cercanas PC/cel desde el servidor PM2 de este checkout (`:5278`) y ajustar solo los materiales o piezas visuales necesarias.
- Para las huellas, aplicar una máscara pequeña al material del decal de chatarra; no editar el original que comparten otras zonas.
- Usar materiales Folded ya existentes para los premios y mantenerlos en la plantilla de la grúa.

## Cierre

- Caucho aclarado levemente mediante el material compartido; las mallas y cuerpos físicos no cambiaron. La primera prueba resultó demasiado gris y se redujo el ajuste final.
- El decal de chatarra usa su propio material y una máscara de 64 px que desvanece ambos extremos. Los otros tres decales conservan su material.
- Los premios usan tres colores más claros en los materiales Folded existentes. La geometría y las instancias de la grúa no cambiaron.
- Capturas finales PC/cel: `.shots/actual/{pc,cel}-{tire,tracks,crane}-final.png`. El navegador no registró errores. TypeScript, 178 tests y build pasaron. Grafo actualizado. Cierre local sin publicación.
