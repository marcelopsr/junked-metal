# Ilustraciones de evoluciones · v1

## Entrega

32 miniaturas cuadradas en `public/images/evolutions/`, una por cada arma no fusionada. Las PNG de 292×292 y las dos láminas originales de 1254×1254 se conservan aquí. `dardos` se regeneró como imagen individual por claridad y su fuente está en `sources/evo-dardos-individual.png`; las otras 31 imágenes se recortan de las láminas. Las miniaturas WebP se exportaron con `cwebp -q 90`; las fuentes PNG permiten volver a exportarlas.

## Generación

Se generaron dos láminas 4×4 con la herramienta de imágenes integrada de Codex, siguiendo la instrucción del usuario de no usar ComfyUI. Los PNG originales son `sources/sheet-01.png` y `sources/sheet-02.png`. Cada celda está mapeada en orden de izquierda a derecha y de arriba abajo. Se recortó el centro de cada celda con `sips`, retirando los separadores negros.

La salida de la herramienta no expone identificador del modelo, semilla ni parámetros internos; no se inventan esos datos. El contenido de cada celda se detalla en la lista de abajo. El fondo gris cálido se conserva porque las cartas muestran la imagen dentro de su propio marco metálico.

**Dirección compartida enviada en ambos prompts:** ilustración cuadrada de un objeto de mejora aislado para un juego de supervivencia con autos RC; taller de chatarra, plástico moldeado y metal fabricado, pintura amarilla y azul saltada, bordes de acero oxidado, iluminación diurna direccional, sombra de contacto suave, detalle táctil y silueta legible como miniatura. Sin texto, etiquetas, marcas de agua ni objetos que crucen celdas.

## Correspondencia de celdas

| Lámina | Fila 1 | Fila 2 | Fila 3 | Fila 4 |
|---|---|---|---|---|
| 01 | Gomitas · gomitas; clips orbitales · clips; chispero · chispero; bomba de racimo · petardos | antena Tesla · tesla; ariete lápiz · lanza; hidrolavadora · agua; doble yo-yo · yoyo | lluvia de bengalas · bengalas; bumeranes de regla · regla; cono triple · helado; sirena · bocina | trompos · trompo; electroimán de tuercas · tuercas; bobinas eléctricas · bobinas; ventilador industrial · ventilador |
| 02 | canicas · canicas; pistola de burbujas · burbujas; matamoscas eléctrico · matamoscas; dardos de pila · dardos | campo de chapitas · chapitas; paraguas blindados · paraguas; racimo de cohetes · cohete; cintas de fiesta · serpentinas | tambor de hojalata · tambor; fichas de metal · domino; escuadrilla de chapa · avioncito; pintura explosiva · pintura | bumeranes cruzados · bumeran; cañón de confeti · confeti; lupa triple · lupasolar; drones gemelos · dron |

## Límites observados

- Los objetos comparten una representación 3D muy detallada. La imagen generada se acerca más al render de juguete que al pixelado low-poly del mundo; revisar su lectura junto a las cartas antes de extender esta familia a otras pantallas.
- Algunas formas son interpretaciones del prompt, no representaciones literales de la mecánica; en miniatura, validar especialmente dardos, chapitas y avión de chapa.
- Las imágenes son raster cuadradas con fondo opaco. No sirven como calcos transparentes ni como sprites animados.
- `dardos` es una excepción de encuadre: se generó como pieza individual para que las ventosas de goma y la batería se lean mejor en la carta.
- Las cuatro ilustraciones antiguas `public/images/evo-*.webp` se conservan sin borrar; el HUD deja de referenciarlas.

## Armas de juguete nuevas (placeholder)

`evo-lapices`, `evo-jabon`, `evo-teledirigido` y `evo-imanchatarra` son ilustraciones procedurales provisorias (PIL, 292x292, mismo fondo gris cálido). Sustituir por arte generado con el pipeline de la lámina cuando haya una pasada de refinamiento.

## Armas de juguete nuevas (placeholder)

`evo-lapices`, `evo-jabon`, `evo-teledirigido` y `evo-imanchatarra` son ilustraciones procedurales provisorias (Pillow, 292x292, mismo fondo gris cálido). Sustituir por arte generado con el pipeline de las láminas en una pasada de refinamiento.
