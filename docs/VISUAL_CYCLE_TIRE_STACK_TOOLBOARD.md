# Ciclo visual local: pila de neumáticos y tablero de herramientas

Fecha: 2026-10-13. Selecciones del usuario: revisar dibujo/flancos de la pila del patio, revisar siluetas/contraste del tablero del garaje y validar escala/detalle con capturas de juego y acercamiento en PC/cel.

## Plan

- Inspeccionar los materiales compartidos de neumáticos, sus usos y el armado Folded del tablero antes de cambiar nada.
- Comparar capturas PC/cel de juego y acercamiento; ajustar solo mapeo/material si la lectura lo necesita.
- Conservar mallas, ubicaciones, herramientas y colisiones; comprobar efectos sobre todos los consumidores de material compartido.
- Ejecutar verificaciones de código y visuales proporcionales, actualizar graphify, documentar límites y cerrar en commit local sin publicar.

## Resultado

- La pila del patio conserva su mapeo y gana luminosidad base (`#858b89` → `#aeb4b1`) para que los flancos y el dibujo sobrevivan mejor a distancia. El material también se consume desde `world_layout.ts`; el garaje conserva su material tintado propio.
- El tablero mantiene sus cuatro piezas y posiciones. Los materiales de herramientas oscuras pasan a `#82909a` y la herramienta roja a `#c65a43`, separándose mejor de la madera bajo la iluminación actual.
- Capturas finales normales y cercanas en PC/cel: `.shots/actual/{pc,cel}-tires-{normal,close}-final.png` y `.shots/actual/{pc,cel}-toolboard-{normal,close}-final.png`; sin errores de consola.
- Sin cambios de malla, ubicación, UV, colisiones ni física. No se midió rendimiento, de acuerdo con la selección; las capturas son Chromium headless y no sustituyen una prueba en teléfono físico.
