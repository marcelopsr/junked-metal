# Hecho: Paseo libre (Free Roam)

Mundo grande de 600x600 con barrios conectados, sin enemigos ni reloj, cualquier auto desbloqueado. Diseño: [`.claude/trabajo/FREEROAM-diseno.md`](../../../.claude/trabajo/FREEROAM-diseno.md) (D1-D7, la tabla de tuercas quedó desactualizada); decisiones en [ROADMAP-1.0](../../ROADMAP-1.0.md) sección 5. La lógica pura está separada del motor y se prueba con `npm test`.

## Fichas

- **Mundo y barrios.** Skatepark, parque tipo Central Park, parque acuático, bosque nevado y circuito de obstáculos. `src/zones/libre.ts` (base), `libre_skate.ts`, `libre_parque.ts`, `libre_acuatico.ts`, `libre_nieve.ts`, `libre_obstaculos.ts`. Madurez: usable. Prueba: escenarios de `npm run shots` (el de skate pide su propio escenario: [libre-skate-shots-y-drawdist](../../todos/libre-skate-shots-y-drawdist.md)). Crítica: contraste bajo en obstáculos ([libre-obstaculos-contraste](../../todos/libre-obstaculos-contraste.md)).
- **Control y física del paseo.** `src/zones/libre_control.ts`: aire, giros, rampas. Madurez: a medias; cabeceo en el aire y hielo solo visual ([libre-aire-cabeceo](../../todos/libre-aire-cabeceo.md), [libre-hielo-y-pendientes](../../todos/libre-hielo-y-pendientes.md)).
- **Juguetes con física.** Bloques y cajas que el auto empuja. `src/zones/libre_juguetes.ts`. Madurez: usable. Crítica: [REVISION-0.95](../../../.claude/trabajo/archivo/REVISION-0.95.md) los revisó (pose antes del cuerpo, masa e inercia juntas, liberación correcta).
- **Trucos.** Aire, giros, vueltas, combo y medallas. `src/free_tricks.ts`. Prueba: `test/free_tricks.test.ts`. Madurez: estable.
- **Tuercas doradas.** 24 tuercas que desbloquean una pintura. `src/free_nuts.ts`. Madurez: usable (dos tuercas mal ubicadas, ver nota del tablero viejo en [libre-hielo-y-pendientes](../../todos/libre-hielo-y-pendientes.md)).
- **Desafíos con récord.** Coleccionables, aros, trucos, códec del fantasma. `src/free_challenges.ts`. Prueba: `test/free_challenges.test.ts`. Madurez: estable.
- **Metas por barrio.** Objetivos estilo Tony Hawk; completar un barrio da el logro `barrio_*` y una pintura. `src/free_goals.ts`, `src/achievements.ts`, `src/menu/garage_paint.ts`. Prueba: `test/free_goals.test.ts`. Madurez: estable.
- **Secretos.** 4 secretos, uno por barrio, guardados como bits en `save.libre.secretos`. `src/free_secrets.ts` (lógica), `src/zones/libre_secretos.ts` (lugares). Prueba: `test/free_secrets.test.ts`. Madurez: estable.
- **Fantasma del récord.** Clon translúcido del auto que repite el mejor intento. `src/free_ghost.ts`. Madurez: usable; revisado sin hallazgos en REVISION-0.95.
- **Modo foto y polaroid.** `src/photo-mode.ts`, `src/share.ts`. Madurez: usable; falta modo foto en pausa ([modo-foto-pausa](../../todos/modo-foto-pausa.md)).
- **Pausa y atajos en celular.** Muestra atajos de teclado en táctil ([libre-pausa-atajos-tactil](../../todos/libre-pausa-atajos-tactil.md)).

## Cómo se prueba

- Lógica: `npm test` (los cinco `test/free_*.test.ts`).
- Recorrido: hook `__paseo(60)` en dev; QA-0.95 lo corrió 4 veces con 20/20 tramos y 24/24 tuercas, 0 errores de consola.
- Fugas al rearmar: sin cambios en 5 rearmados (554 mallas, 105 texturas, 363 cuerpos).

## Guardado

El estado va en `save.libre` (`src/savefmt.ts`, migración probada con `test/save_versiones.test.ts`). Campos: desafío, aviso, ghost, metas, secretos. Los campos nuevos leen con `?.` y valores por defecto.
