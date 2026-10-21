# Hecho: combate, personajes y vehículos

Todos los números viven en `src/balance.json` (tablas enemigos, armas, armas_extra, pasivas, ritmo, ataques, autos, pilotos, precios, plagas) y se leen tipados desde `src/balance.ts`. Regla: [ADR 0004](../../decisiones/0004-balance-en-json.md); determinismo con `rng()`: [ADR 0005](../../decisiones/0005-determinismo-rng.md).

## Fichas

- **Armas.** 36 filas en `balance.armas`; una clase por archivo en `src/weapons/*.ts` (gomitas, trompo, tesla, cohete, yoyo, ventilador y más), registro `CLASSES` y `makeWeapon` en `src/weapons.ts` (fachada). Arma nueva = un archivo y una línea en `CLASSES`, más `WeaponId` en `weapons/base.ts` y su pieza en `mountFor`. Madurez: usable. Prueba: `test/dps.test.ts`, `npm run dps`. Críticas: [gomitas-domina](../../todos/gomitas-domina.md) (2 a 4 veces el resto).
- **Pasivas y ofertas.** 15 pasivas en `src/weapons/passives.ts`; cartas y `levelOffers()` en `weapons/offers.ts`; cofre especial (`openSpecial`) en `src/main.ts`, progresión en `src/progression.ts`. Madurez: usable. Prueba: `test/cofre_especial.test.ts`, `test/afinidad.test.ts`. Crítica: el cofre descartaba la fusión ([HITO 0.9](../../../.claude/trabajo/archivo/HITO-0.9-revision.md), punto 2).
- **Evoluciones y fusiones.** `src/weapons/fusion.ts`, imágenes de carta en `EVO_ART` de `src/ui.ts`. Madurez: usable. Abiertos: [trompo-evolucionado-flojo](../../todos/trompo-evolucionado-flojo.md), [cartas-evolucion-sin-imagen](../../todos/cartas-evolucion-sin-imagen.md).
- **Enemigos comunes.** `DEF` por tipo y clase `Enemy` en `src/enemies.ts`; IA por bicho en `src/enemies/ai/*.ts` con tabla `AI` en `ai/index.ts` (bicho nuevo = `DEF` y un archivo y una línea). Modelos y patas en `src/models/enemies.ts`. Madurez: estable. Prueba: `test/enemies_comunes.test.ts`, `npm run oleadas`.
- **Minijefes y jefes.** Perro, aspiradora, grúa, proyector, cortacercos, gato, payaso, tarántula, limpiafondos y otros, con segunda barra al 50 % en los finales (`ataques.segunda_barra_*`). Duelos: `npm run sim -- --duel perro,aspiradora --seeds 1,2`. Madurez: usable. Abiertos: [proyector-cae-rapido](../../todos/proyector-cae-rapido.md), [bestiario-grua-vitrina-vacia](../../todos/bestiario-grua-vitrina-vacia.md).
- **Bestiario.** Fichas con vista del modelo (alcance 1.0: 41 personajes); datos en `src/menu/beast_data.ts`, ficha en `src/menu/beast_sheet.ts`, vista en `src/bestiary_preview.ts`. Madurez: usable. QA-0.95 vio 44 fichas pc y cel con modelo, salvo la grúa en celular.
- **Pilotos.** 18 filas en `balance.pilotos` (12 más osito, mecánica, cocinero, mago, fantasma, doble); `PILOTS` en `src/pilots.ts`, habilidades en `src/abilities.ts`. Madurez: usable. Pendiente: [pilotos-habilidad-activa](../../todos/pilotos-habilidad-activa.md).
- **Vehículos.** 17 autos en `balance.autos` y `CARS` en `src/car.ts` (manejo arcade `drive()` sobre Havok); modelos en `src/models/cars.ts`, GLB en `src/carGlb.ts`. Madurez: estable. Prueba: `__car()` en dev, escenario `garaje` de shots.
- **Genes de geometría.** Rango y valor original por auto en `src/car_genes.ts` y `car_genes.json`; los leen `buggyHull` y `carModel`. Evolución con `npm run evo` (DE más Pareto NSGA-II), guía [`docs/EVO_VEHICULOS.md`](../../EVO_VEHICULOS.md), historial en `evo/historial.json`. Madurez: usable. Prueba: `test/car_genes.test.ts`.
- **Combate y daño.** `src/combat.ts` (daño, blindaje frontal de escudo y cangrejo, hitstop), `src/fx.ts` para impactos. Auditoría de partición: [AUDITORIA-main-weapons](../../AUDITORIA-main-weapons.md).
- **Bot.** `src/devbot.ts`, solo dev; detecta el pozo de la pileta con valores fijos. Lo usan `sim`, `e2e` y `__bot`. Límites en [problemas/balance-y-bot.md](../problemas/balance-y-bot.md).

## Plagas y clima

5 plagas (`balance.plagas`) y climas por semilla en `src/run.ts` (`CLIMATES`: noche, niebla, farol, madrugada, mañana, mediodía, atardecer, nublado).
