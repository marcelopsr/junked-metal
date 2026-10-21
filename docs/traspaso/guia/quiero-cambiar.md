# Quiero cambiar X, mirá Y

| Quiero cambiar | Mirá |
|---|---|
| Un arma (comportamiento) | `src/weapons/<id>.ts`; registro en `src/weapons.ts` (`CLASSES`) y textos en `src/weapons/base.ts` (`WEAPONS`). Receta: [../manual/04-agregar-un-arma.md](../manual/04-agregar-un-arma.md) |
| Un enemigo | `src/enemies.ts` (`DEF`, `spawnTable`), IA en `src/enemies/ai/`. Receta: [../manual/05-agregar-un-enemigo.md](../manual/05-agregar-un-enemigo.md) |
| Un número de balance | `src/balance.json`. Receta: [../manual/06-tocar-balance.md](../manual/06-tocar-balance.md) |
| Un menú o pantalla | `src/menu.ts`, `src/menu/`, `src/menu.css` |
| El HUD o las cartas de mejora | `src/ui.ts`, `src/hud.css`, `src/hud_tick.ts` |
| El look de un escenario | `src/zones/<escenario>.ts`, `src/render.ts`, `src/world.ts`. Receta: [../manual/07-cambio-visual.md](../manual/07-cambio-visual.md) |
| Un modelo | `src/models/` y `src/models.ts` (instanciado, nunca mallas sueltas) |
| Un texto del juego | Donde se dibuja; español neutro impersonal, sin voseo ([../../ART_DIRECTION.md](../../ART_DIRECTION.md)). Bestiario: `src/menu/beast_data.ts` |
| Un sonido | `src/sfx.ts`, `src/audio/`; radio en `src/radio.ts` |
| La portada web | `portada/` (novedades: `portada/novedades.json`) |
| El guardado | `src/savefmt.ts` (migración, con prueba) y `Save` en `src/menu.ts` |
| Un auto | `src/car.ts` (`CARS`), `src/car_genes.json`, `src/models/cars` |
| Un piloto | `src/pilots.ts` y tabla `pilotos` de `src/balance.json` |
| El servidor o el login | [servidor.md](servidor.md) |
| Cómo se prueba | [pruebas.md](pruebas.md) |
