# QA final ENCORE · parte 1: chequeos y no regresión de Supervivencia

Fecha 2026-10-12, sobre 06801ba (árbol con los cambios de abajo, sin commit).

## Paso 1: tsc, pruebas y build

| Chequeo | Resultado |
|---|---|
| `npx tsc --noEmit -p .` | sin errores |
| `npm test` | 11 archivos, 133 pruebas OK (132 al empezar, más 1 nueva de rutas) |
| `npm run build` | OK (solo el aviso conocido de chunk > 500 kB) |

## Paso 2: sim de Supervivencia contra 9882e8b^ (3923975, antes de ENCORE)

`npm run sim -- --seeds 1,2 --secs 600 --json` y lo mismo con `--zone luna`. La base corrió en un worktree temporal (`../rc_fight_base`, servidor propio con `test:restart`, cerrado con `test:down` y borrado).

| Zona | Semilla | Tiempo | Nivel | Vida | Bajas | Estado | Armas | Base vs actual |
|---|---|---|---|---|---|---|---|---|
| patio | 1 | 166,9 s | 4 | -2 | 24 | over | gomitas3 helado1 | idéntico |
| patio | 2 | 600 s | 36 | 160 | 2068 | play | petardos5 trompo3 chispero3 globos5 bengalas1 clips1 | idéntico |
| luna | 1 | 600 s | 18 | 160 | 592 | play | gomitas5 agua3 yoyo4 clips5 petardos1 | idéntico |
| luna | 2 | 600 s | 28 | 165 | 1561 | play | tesla4 petardos1 trompo5 globos5 bengalas3 clips2 | idéntico |

El JSON completo coincide campo por campo. Solo cambian los "s reales" del resumen, que miden el tiempo de la máquina. **Sin regresión.** La escala coop con N=1 da ×1 (no hay diferencias).

## Fallas encontradas antes del cambio de plan

Antes de recortar el encargo a los pasos 1 y 2, ya había recorrido parte de ENCORE. Estos arreglos están en el árbol de trabajo y cubiertos por `tsc` y `npm test`. Quien haga el recorrido visual en otro worktree tiene que saberlo:

| # | Falla | Arreglo |
|---|---|---|
| 1 | Las rutas repetían una variante dentro de la misma vuelta (LA TARIMA dos veces), contra el diseño "sin repetir" | `encore.ts` `routeOffer` excluye las variantes ya jugadas en la vuelta; prueba nueva en `test/encore.test.ts` (fallaba antes, pasa ahora) |
| 2 | La barra de cofre o máquina ("MÁQUINA DE OPCIONES · -25 % DE VIDA") quedaba fija arriba después de usarlos | `main.ts`: sin objetivo, jefe ni nave, `hudBoss(null)` |
| 3 | El subtítulo del Director pisaba el panel de batería en compu; en celular quedaba debajo de los botones táctiles y partido en 4 renglones | `hud.css` `#dirSub`: `width: max-content`, en compu arriba de `#txl` (y del `#hint` mientras se ve), en celular al 43 vh y, con la oferta abierta, bajo el reloj |
| 4 | En celular, RECHAZAR del pacto quedaba tapado por SALTO; la carta verde dejaba ilegibles VENTAJA y COSTO | `hud.css`: oferta en dos columnas compactas al 28 %; las dos cartas con el mismo fondo oscuro |
| 5 | Un aviso encolado ("J4 FUERA…") salía sobre la pantalla de resultados | `ui.ts` `bannerClear()`, que se llama en el cierre de la partida (`main.ts`) |

Además se agregaron, solo para dev y pruebas: `__enc.shop("cofre"|"maquina")` (`moon_goals.ts` `shopDev`) y las sesiones `encore1/2/4` en `scripts/scenarios.mjs` para `perf`.

## Pendiente o fuera de esta parte

- Con el cambio de plan quedaron sin terminar el recorrido, el cooperativo, `perf` y online. Datos parciales:
  - Una medición A/B de `pc-partida-pausa` en el mismo momento dio 8,3 ms en la base y 8,3-8,4 ms ahora, con 179 draws en las dos. La regresión anterior parece ruido, pero se midió con load average de 13.
  - Online en headless: la señalización de PeerJS funciona (se crea la sala), pero ICE pasa de `checking` a `disconnected`. Los candidatos son mDNS más srflx de una VPN (104.28.x). Probé las flags `WebRtcHideLocalIpsWithMdns` y `allow-loopback`. Hubo un intento con Chrome con interfaz antes de que se pidiera usar solo headless, y también falló.
- Ya existía antes de ENCORE (no lo toqué): al empezar en el patio, la cámara queda sobre la mesa gigante (`occluders` en `world.ts`) y la pantalla se ve tramada y blanca hasta que el auto se mueve. Además, "FAILSAFE RX" tapa el borde inferior del panel de batería.
- Scripts de prueba en `scratch/final/` (`tour.mjs`, `coop.mjs`, `probe.mjs`, `net.mjs`) con capturas de compu, celular y cooperativo de 2 y 4.
