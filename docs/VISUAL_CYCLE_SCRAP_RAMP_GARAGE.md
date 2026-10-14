# Ciclo visual local: borde de chatarra, rampa y neumáticos del garaje

Fecha: 2026-10-13. El usuario eligió los tres frentes sugeridos.

## Alcance

- Integrar el borde oscuro de la tierra de chatarra con el patio sin cambiar el terreno físico.
- Dar acabado de metal usado a la rampa clara, conservando su geometría y colisión.
- Revisar la escala de la textura de la pila grande del garaje y ajustar solo sus UV si hace falta.

## Verificación

La inspección aisló el rectángulo negro en el decal de huellas del ciclo anterior: al ocultarlo, el suelo tenía el borde integrado. Se quitó aquella máscara y se pasó el desvanecido a los vértices del decal; las marcas vuelven a verse sin el rectángulo. La rampa y la plancha contigua ahora comparten pintura Folded gastada. Las UV de la pila grande repiten cuatro veces el dibujo alrededor de cada cubierta, sin mover las mallas físicas.

Capturas PC y celular: `.shots/actual/{pc,cel}-{patio,garaje}-cycle-final.png`, tomadas desde el PM2 de este checkout. TypeScript, tests, build, grafo y commit local. No publicación.
