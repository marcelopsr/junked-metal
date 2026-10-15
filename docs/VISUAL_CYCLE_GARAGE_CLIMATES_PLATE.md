# Ciclo visual local: flancos de caucho, climas y plancha

Fecha: 2026-10-13. Selecciones del usuario: contraste lateral de la pila del garaje, revisión de la tierra de chatarra en noche/niebla/farol y lectura de la plancha oxidada en celular.

## Alcance

- Mantener mallas, cuerpos físicos, posiciones, colisiones y balance.
- Comparar capturas PC/cel antes de editar. Ajustar solo materiales o UV existentes donde haya una mejora visible.
- Verificar TypeScript, tests, build y capturas finales; actualizar grafo y cerrar en commit local sin publicación.

## Resultado

- La pila del garaje recibió un material derivado que comparte las texturas PBR existentes y aclara moderadamente los flancos en sombra. No cambia la geometría ni las colisiones.
- La tierra de chatarra ya se funde con el patio durante noche, niebla y farol; la comprobación no mostró bordes que requirieran ajuste.
- La plancha recibió un tono Folded algo más claro para distinguirse del suelo en celular. Conserva tamaño, ubicación y colisión.
- Capturas: `.shots/actual/{pc,cel}-garage-final.png`, `.shots/actual/{pc,cel}-plate-final.png` y `.shots/actual/{pc,cel}-{noche,niebla,farol}-latest.png`.
