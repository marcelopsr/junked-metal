# Problemas: visual

Meta de contraste por escena de juego: 0,19-0,23 con `scripts/ref_measure.py`; checklist en `docs/art_direction/visual_reference_register.md`. Resumen de la presentación: [hecho/presentacion.md](../hecho/presentacion.md).

## Contraste

- **Garaje: contraste del plano héroe clavado en 0,13 (meta 0,22).** Un disco gris y una losa clara bajo el caballete; identificar la malla apagando una por una. Abierto: [garaje-contraste-heroe](../../todos/garaje-contraste-heroe.md).
- **Industrial 0,14-0,16 con hormigón gris.** La luz ya era neutra; falta composición ([industrial-contraste](../../todos/industrial-contraste.md)). **Jardín 0,15:** arbustos oscuros fuera del encuadre ([jardin-contraste](../../todos/jardin-contraste.md)). **Luna noche 0,17:** falta luz puntual ([luna-noche-contraste](../../todos/luna-noche-contraste.md)). **Obstáculos del Paseo libre 0,10** ([libre-obstaculos-contraste](../../todos/libre-obstaculos-contraste.md)). **Bosque pc 0,15:** pinos y rocas tapan el claro.
- **Luna de día rechazada.** La versión con losas crema planas y bloques oscuros cumplía 0,19/0,22 pero se veía tosca y tapaba. Probar rocas con forma y menor tamaño o sombras largas ([luna-dia-rocas](../../todos/luna-dia-rocas.md)).

## Cámara tapada

- **Follaje y fachadas tapan al auto.** QA-0.92 midió 84 % (ciudad), 61-74 % (bosque), 58 % (nieve), 43 % (industrial); era un techo que contaba el piso, los colisionadores invisibles (`wall*`, `p*`) y follaje fino. Oclusión real (una malla corta 3 de 5 rayos): 6-14 % del tiempo. Arreglo elegido: agujero en el shader (`HOLE` en `render.ts`, llenado por `camera_rig.ts`), sin tocar zonas. Fuente: [CAMARA-oclusion](../../../.claude/trabajo/CAMARA-oclusion.md). Revisión: el radio salió el doble de lo comentado, `HOLE.r` queda viejo fuera del juego y también recorta jefes altos ([HITO 0.92](../../../.claude/trabajo/archivo/HITO-0.92-revision.md) puntos 2-4). Abierto: [camara-tapada-follaje](../../todos/camara-tapada-follaje.md).
- **Celular: aviso central y toast de radar caen sobre el auto;** RECHAZAR tapado por el aviso del Director (pc) y por el botón SALTO (cel). Propuesta: subir `#encAsk` o bajar el aviso; sin cerrar (QA-0.93 bug C).

## Props y texturas

- **Props invisibles en y=-500 (H28).** Causa: `skin`/`crateFold` en el patio. Arreglado en T65 (cambia el aspecto); `potF` (macetas) tenía el mismo patrón. Se mide con `shots --diff`.
- **Fuga de texturas al volver a un bioma.** `pbr(key)` devuelve el material cacheado pero cada `buildWorld` creaba un `DynamicTexture` nuevo (nieve, ciudad, industrial, jardín). Arreglo: cachear la textura a nivel de módulo o crear solo si el material no existe. Queda `soilEdgeMask()` en `patio.ts` (fuga chica).
- **`retex()` dejaba el piso negro.** Causa: liberaba la textura cacheada que seguía en uso. Arreglo: `if (n === o) continue;` en `zones/common.ts`.
- **Carrera suma 6 `DynamicTexture` por carrera** (136 a 166 en 5 carreras). Causa: `cleanup()` no libera texturas. Arreglo: `ctex()` cachea con `tex()` en `kart.ts`; arena y podio sin reverificar.
- **Pilas de contenedores de industrial nunca aparecían.** Causa: `clear()` exigía más de 24 u de la salida y las pilas estaban a 21-23. Arreglo: reservadas antes en (±20,±20), a 28 u.
- **Escala de las zonas de pacto tragada por un comentario.** `m.scaling.set(...)` quedó al final de un `//` en `pact_zones.ts`; la zona se dibujaba de 1 m. Arreglo: línea propia (hoy en `pact_zones.ts:101`).
- **Amortiguadores del monster en rojo** (ART_DIRECTION: sin rojo en el jugador). Pasaron a amarillo, luces traseras ámbar.

## Texto y glifos

- **«FALTAN @» en el banner de cofres.** Causa: la fuente no tiene el glifo del número a medio teclear con estática. Arreglo: las cifras entran enteras (`ui.ts`); el TODO sigue abierto: [banner-cofres-glifo](../../todos/banner-cofres-glifo.md).
- **Cartel «USA LA HABILI4».** Estática solo sobre símbolos y carteles en infinitivo (`tutorial.ts`).
- **Ficha de la grúa con la vitrina vacía en celular.** Sin causa hallada: [bestiario-grua-vitrina-vacia](../../todos/bestiario-grua-vitrina-vacia.md).
- **Ids crudos («survivor», «sangre») en las estadísticas del codex:** [codex-ids-crudos](../../todos/codex-ids-crudos.md).
