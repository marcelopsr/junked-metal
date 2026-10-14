# ENCORE: escenarios y mapa a biomas diorama (2026-10-14)

Solo lectura del código. Referencia de arte: `docs/ART_DIRECTION.md` (Vigente). No se usó ninguna imagen del repo. No verificado: `ENC.stages` (cantidad de escenarios por vuelta), el detalle interno de `moon.ts`/`moon_sky.ts` y los materiales finos de cada prop (se leyeron comentarios y paletas, no cada función).

## Cómo se eligen los escenarios (src/encore.ts, src/encore_run.ts, src/world.ts)
- `E.zoneOf(run)` decide la zona; `encEnter()` llama `setZone(z, false)` y `setMoon(z === "luna")`.
- Escenario 0 de la run: siempre `patio` (de día), con la variante LA TARIMA. Votación y FINAL ACT: siempre Luna.
- Vuelta 0: los demás escenarios son lunares (variantes sorteadas, sin zona).
- Vuelta >= 1: un escenario por vuelta (`earthStage`) cae en `patio` o `jardin` por hash (`EARTH_ZONES`).
- Destinos con zona propia (`VARIANTS[].zone`): galpon, desvan, pileta, cocina. Solo se juegan si se eligen en la fase `route` (dos ofertas, `routeOffer`, no repetidas en la vuelta; en vuelta 0 las de zona no se ofrecen). Recompensa y riesgo: `reward`/`risk`.
- `garaje` existe en ZONES pero NO entra en ENCORE (80 m, ver comentario ponytail en encore.ts). `ZONES` oculta galpon como no enumerable.
- Clima: patio/jardin siguen el ciclo de la semilla (`CLIMATES` en run.ts: noche, niebla, farol, madrugada, mañana, mediodía, atardecer, nublado); luna, cocina y garaje tienen clima fijo (`Z.climate`). Galpon, desvan y pileta no definen clima propio.

## Inventario y cambios por escenario
Costo: B bajo, M medio, A alto. Ninguno encaja hoy con el diorama: todos vienen de Folded (chapa, óxido, PBR sucio) y climas oscuros.

| Escenario | Archivo | Hoy | Bioma | Encaja | Cambios (costo) |
|---|---|---|---|---|---|
| Patio (inicio, vuelta>=1) | zones/patio.ts (+ models/props_rc.ts) | Césped con pasto en thin instances, mesa de jardín gigante, baldosas, huerta con surcos, zona de chatarra (neumáticos, tambores, cajas, rampa de chapa), cerca de tablones, arbustos, pileta inflable, puente de tablones, pista de juguete | barrio/patio | Parcial | Cielo y luz atardecer cálido fijo con DOF/viñeta (M); cerca y cajas a colores de paleta oficial rojo/amarillo/azul (B); bordes de pista rojo/blanco en `toyRamps` (B); casa de perro y plantas de juguete (M); chatarra óxido a plástico/goma (M) |
| Jardín | zones/jardin.ts | Césped con franjas de corte, vereda, cordón, calle, auto estacionado, camino de lajas, ligustros, buzón, cantero-rampa, aspersores | ciudad miniatura | Parcial | Calle de asfalto con rayas y bordillo rojo/blanco (B); 3-4 edificios bajos de bloques biselados al fondo en lugar de pared (A); señales, conos, vallas (M); ligustros a bloques verdes tipo Lego (B); luz de mediodía suave (B) |
| Galpón de utilería | zones/galpon.ts | Cemento manchado, paredes de chapa, estantes de atrezo, mesa de trabajo-plataforma, cajas de herramientas gigantes, latas, cajas | industrial | Parcial | Piso de hormigón claro con franjas amarillo/negro (B); palets, tambores, contenedores de colores (M); paredes de chapa pintada con calcas (M); luz de tubos cálida (B) |
| Desván de juguetes rotos | zones/desvan.ts | Tablones oscuros, paredes de chapa, vigas bajas, baúles, cubos de letras rojo/amarillo/azul/verde | garaje/taller | Poco | Subir luz y saturar madera (B); estantes con caja de herramientas y neumáticos (M); lámpara de taller cálida (B); calcas 27/RC en los baúles (B) |
| La pileta vacía | zones/pileta.ts | Explanada de cemento con pozo de azulejo (-5/-16), escalones, rampa, trampolín, hojas secas, desagüe | desierto | Poco | Explanada a arena/tierra cálida, pozo como cañón de roca (M); cactus y rocas de juguete (M); sol alto y cielo arena (B); tierra en lugar de hojas (B) |
| La cocina | zones/cocina.ts (+ KITCHEN_CLIMATE) | Damero crema/terracota, mesadas en L con alacenas, horno, heladera, mesa con 4 sillas y lámpara, tachos, utensilios, leche | nieve | Poco | Damero a blanco/azul hielo, heladera como glaciar, leche como hielo (M); nieve en thin instances sobre mesadas (M); luz fría con lámpara cálida (B). Alternativa de menor costo: dejarla como garaje/taller interior |
| Luna: LA TARIMA, CAMPO DE CRÁTERES, SOL DE FRENTE | moon.ts, moon_sky.ts, LUNA_CLIMATE | Esfera con gravedad radial, cráteres, sol HDR, cielo negro | desierto (roca/polvo) | No | Suelo a ocre/marrón, cielo azul-naranja en lugar de negro (M); roca de juguete (M) |
| Luna: EL LADO OSCURO, LLUVIA DE CHATARRA, NOCHE DE ESTRENO, ENSAYO DE MEDIANOCHE | moon.ts, moon_*.ts, run.ts CLIMATES noche | Lado oscuro, solo luces de naves y erupciones | noche neón | Parcial | Bloom en faros y neón magenta/cian (M); cielo azul noche con ciudad miniatura lejana (A); luces de pista (B) |
| Bosque | (no existe) | Solo `tree()` en zones/common.ts | bosque | Sin zona | Zona nueva (A): fuera de este plan; paliativo: pinos de juguete en patio (M) |

## 3 paquetes disjuntos (paralelo)
- Paquete 1 (exteriores): `src/zones/patio.ts`, `src/zones/jardin.ts`, `src/zones/galpon.ts`, `src/models/props_rc.ts`. Barrio, ciudad, industrial. Clima propio de cada zona definido en su archivo (como KITCHEN_CLIMATE).
- Paquete 2 (interiores y secos): `src/zones/desvan.ts`, `src/zones/cocina.ts`, `src/zones/pileta.ts`. Taller, nieve, desierto.
- Paquete 3 (Luna y noche): `src/moon.ts`, `src/moon_sky.ts`, `src/moon_*.ts`, `CLIMATES` en `src/run.ts`, textos en `VARIANTS` de `src/encore.ts`. Desierto lunar y noche neón.
- Integrador único al final (nadie más toca): `src/world.ts` (enganchar `climate` por zona en ZONES), `src/zones/common.ts`, `src/kit3d.ts` (PAL/M3C), `src/folded.ts`, `src/balance.json`.
- Verificación por paquete: `npx tsc --noEmit -p .` y `npm run shots -- --changed`; `perf` solo si se suman muchas instancias.
