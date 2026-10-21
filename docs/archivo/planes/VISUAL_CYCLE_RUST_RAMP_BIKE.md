# Ciclo visual local: rampa oxidada y bicicleta del garaje

Fecha: 2026-10-13. Selecciones del usuario: revisar el contraste del metal/bordes de la rampa oxidada del patio y la lectura del cuadro/ruedas de la bicicleta contra la pared; comparar noche, niebla y farol en PC/cel a distancia y de cerca.

## Plan

- Inspeccionar `patioBuild()`, `ramp()` y `garageBuild()` para separar mallas visuales, materiales compartidos y colisiones antes de intervenir.
- Capturar ambas piezas en los tres climas y dos encuadres en PC/cel.
- Ajustar únicamente materiales existentes si las capturas muestran pérdida de lectura; conservar forma, ubicación, UV y física.
- Ejecutar verificaciones proporcionales, documentar capturas, actualizar graphify y cerrar con commit local sin publicar.

## Resultado

- La rampa oxidada pasó de `#7a5038` a `#b47e4d` con desgaste Folded moderado; en la comparación gana contraste cálido contra la tierra, especialmente en farol y en la vista de juego. Forma, posición y colisión permanecen iguales.
- Las ruedas de la bicicleta usan un material PBR rugoso local `#3f454a` en vez del caucho casi negro compartido, que se perdía contra la pared en noche y niebla. El cuadro azul, geometría y posición no cambian.
- Matriz final: 36 capturas `.shots/actual/{pc,cel}-{patio,garaje}-{noche,niebla,farol}-{normal,close}.png`, tomadas desde PM2 `rc-test-rcfight-documents` (`:5278`); no se registraron errores de consola.
- Las vistas cercanas aíslan material y detalle y pueden recortar partes de la bicicleta; las normales permiten leerla completa en contexto. Capturas Chromium headless: no se midió rendimiento ni se probó en teléfono físico.
