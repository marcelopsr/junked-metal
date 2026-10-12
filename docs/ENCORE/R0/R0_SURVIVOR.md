# R0 — Auditoría del modo Survivor (solo lectura)

Fecha 2026-10-11. Todo verificado leyendo `src/` (nada ejecutado, nada editado). Referencias `archivo:línea` sobre el árbol actual. Contexto ENCORE: D-002 (modo nuevo independiente que reutiliza sistemas), D-029/D-030 (jefe final sorteado entre jefes compatibles de Survivor), `09_FINAL_ACT.md` (no inventar IDs; sin jefe compatible, bloquear FINAL ACT).

## 1. Estado de partida y game loop

| Tema | Evidencia |
|---|---|
| Máquina de estados | `main.ts:86` `let state: "menu"\|"play"\|"level"\|"pause"\|"over"\|"outro"\|"race"\|"duel"\|"match3"`. Survivor = `play`; `level` congela física (`scene.physicsEnabled=false`, `openOffers` `main.ts:432`) |
| Estado de partida | Globals a nivel de módulo en `main.ts:87-143`: `car, weapons, passives, st, hp, maxHp, boost, xp, level, pendingLevels, time, kills, runScrap, runSeed, profile, enemies, gems, pickups, spits, offers, horde, curseK, noRepair, endless, finalKind, bank, abil*`. No hay objeto `RunState`; no es serializable tal cual |
| Arranque | `startRun(d)` `main.ts:248`: `setZone`, `seedRng(runSeed)` (`rng.ts:5`), `makeProfile(runSeed)` (`run.ts:98`), arma `RUN_BOSSES` (`:265`), crea `Car`, `startWeapons(...).map(makeWeapon)`, resetea contadores |
| Limpieza | `clearRun()` `main.ts:220` (dispone enemigos, armas, gemas, pickups, luna, fx) |
| Loop | `update(dt)` `main.ts:753-~1277` (monolito de ~520 líneas); lo llama el render loop (`frameAcc/frameMs` `:1700`). `time += dt` en `:755` |
| Orden dentro de `update` | clima/lluvia → manejo/habilidad → límites del mapa (`hp=0` si sale, `:929`) → spawner (`:933-958`) → enjambre (`:960-967`) → avisos y entrada de jefes (`:969-1000`) → élites (`:1001-1010`) → IA y ataques de enemigos (`:1011-1160`) → armas (`:1196-1198`) → gemas/pickups (`:1210-1245`) → cofre/pelota (`:1248-1260`) → muerte/revive (`:1273-1274`) → niveles pendientes (`:1275`) |
| Dev hooks | `window.__sim/__spawn/__minis/__xp/__endless/__info/__bossDuel` (`main.ts:~1792-1888`); `scripts/sim.mjs` corre partidas headless con `devbot.ts` |
| Semilla | `rng()` determinista (`rng.ts`). `run.ts` deriva jefe final, lluvia y élites de la semilla SIN gastar `rng()` (`pickFinal` `run.ts:65`, `rainAt` `:53`) |

`run.ts` es puro (solo importa `Kind`, `rng`, `BAL`): `Profile = {seed, climate, plague, minis, swarmEvery, ballEvery, chestEvery, rainAt, final, elites}` (`run.ts:41`), `previewProfile(seed)` (`:108`) lo calcula sin tocar el rng global. Testeado en `test/run.test.ts`.

## 2. Spawner y oleadas

- Ritmo continuo, no por oleadas numeradas. Valores en `balance.json > ritmo` (accedidos como `BAL.ritmo` / `R` en `main.ts:39`).
- `spawnAcc += (spawn_base + time/spawn_seg) * wdt * horde * TOUGH.count` (`main.ts:943`); por cada entero: `spawnEnemy(pickWeighted(spawnTable(time, plague)), spawnPoint(_ahead, 52, 72))` (`:944`). Anillo 52–72 m sesgado `spawn_adelanto_s`=1.6 s hacia donde va el auto.
- `spawnTable(t, plague)` `enemies.ts:803`: tipos con `aparece_min` y `peso_base + min*peso_por_min` de `balance.json > enemigos`; la plaga multiplica pesos / adelanta llegada. En luna suma `ALIENS`.
- Tope de vivos: `min(100 PC / 60 táctil, (25 + t/2.2) * horde * dureza_cantidad)` (`main.ts:934`). Cuentan solo no-jefes. Reciclado a >100 m (`:1111`).
- Dureza global (`TOUGH`, `main.ts:732`): cantidad x0.5, vida x2 (+100% cada 200 s: `(1+time/vida_escala_seg)`), daño x4, XP x1.62. Jefes ignoran `hpMul` (`enemies.ts:144`).
- Formaciones (columna de hormigas / escolta de escarabajo + fricción) desde 50 s (`main.ts:947-958`). Enjambre en anillo cada `profile.swarmEvery` (`:960`). Pelota (`ballT`), cofre (`chestT`), élites (`profile.elites`, 2–3, "rapida"/"blindada", `main.ts:1001-1010`, `run.ts:75`), lluvia (`rainAt`).
- Plagas (`run.ts:35`, `BAL.plagas`): tabla de multiplicadores por tipo.
- Eventos con aviso `aviso_evento_s` vía `radioEvent`/`radioBoss` (`ui.ts`).

## 3. Enemigos (`enemies.ts`)

`Kind` (`enemies.ts:12`): `hormiga | escupidora | friccion | robot | escarabajo | rey | cortadora | perro | gato | polilla | tarantula | aspiradora | cortacercos | fuego | cohete | gusano | Alien`. `DEF: Record<Kind, Def>` (`:18`), stats desde `balance.json` vía `stats(k)` (`:16`). `Def = {name,hp,speed,dmg,size,mass,xp,boss?,final?,scale?,color}`.

| Tipo | id | Vida/vel/daño | Notas |
|---|---|---|---|
| bicho | `hormiga` | 11/8/6 | desde 0 min |
| bicho | `friccion` | 18/12.5/7 | 0.5 min |
| bicho | `escupidora` | 22/7/8 | 1.5 min, dispara ácido (`ev==="spit"`) |
| bicho | `robot` | 40/18/10 | 1.5 min, carga en línea |
| bicho | `polilla` | 12/11/5 | 2.5 min |
| bicho | `escarabajo` | 90/4.5/12 | 3.5 min |
| luna | `fuego`, `cohete`, `enjambre, tirador, saltador, emboscador, flotante, tanque, explosivo, curandero` (alias `Alien`, `aliens.ts`) | — | solo con `MOON.on`; `cohete`/`fuego` se usan en luna |

`Enemy` (`enemies.ts:84`): `constructor(kind, pos, hpMul)` (`:142`) crea malla instanciada + `B.PhysicsAggregate` Havok; `update(...)` devuelve eventos string (`"spit","slam","fan","slash","shock","meow","boom","wave","worm_up"...`) que `main.ts:1030-1075` interpreta. IA por `kind` en un `if` encadenado (`:442-700`). `phaseUp`/`enraged` para fase 2 (`:439`: a `fase2_vida`=50 % de vida, solo `boss && !final`).

## 4. Jefes reales (IDs de `Kind`)

Minijefes (`balance.json tipo:"minijefe"`, `boss:true`) y finales (`tipo:"jefe_final"` → `Def.final:true`, dos barras via `Enemy.rearm()` `enemies.ts:135`, `segunda_barra_vida`=0.5, daño x1.5).

| ID | Nombre | Rol | HP | Vel | Dmg | Tamaño (x,y,z) | Ataques (enemies.ts) | Acoplamientos |
|---|---|---|---|---|---|---|---|---|
| `rey` | ESCARABAJO REY | mini | 1800 | 6 | 30 | 6,3.8,8 (scale 3.5) | persecución + contacto | GLB `rey` (`glb.ts:35`) |
| `cortadora` | CORTADORA DE CÉSPED | mini | 3500 | 15 | 45 | 7,4.5,6.4 | carga en línea tras apuntar (`:450`); corta bichos al pasar (`main.ts:1086`) | GLB |
| `tarantula` | TARÁNTULA | mini | 2600 | 7 | 35 | 6,2.6,6.5 (scale 3) | ráfaga de 6 escupitajos + salto con aro (`:509`) | GLB; `ev "slam"` en main |
| `gato` | EULALIO EL MICHU | mini | 2900 | 11 | 32 | 3.4,3.6,6.4 | zigzag, salto, trompo, arranque; fase 2 maúlla e invoca 4 polillas (`:611`, `main.ts:1049`) | GLB con clips (`glb.ts:42`), spawnEnemy("polilla") |
| `perro` | FELIPE EL DOGO | **final** | 8000 | 9 | 40 | 3.2,8,8 | salto/aplastar, embestida en línea (`DOG_RAM`), zoomies, giro (`:658`) | GLB con clips (`glb.ts:41`); `slam` aplasta bichos cercanos |
| `aspiradora` | LA ASPIRADORA ROBOT | **final** | 7500 | 7 | 35 | 6.4,1.6,6.4 | aro de succión (`pull`, tira del auto) + 3 ráfagas de 7 tuercas en abanico (`:549`) | GLB; `teleTemplate`; `e.pull` mueve el body del auto (`main.ts:1076`) |
| `cortacercos` | EL CORTACERCOS ELÉCTRICO | **final** | 7000 | 8 | 40 | 3,2.4,9 | barrido en arco de 10 m + cables con chispas persistentes (`:582`) | GLB; `sectorTemplate`, cables |
| `gusano` | GUSANO LUNAR | final de la luna | ver balance | — | — | 2.2,2.2,2.4 | sale del suelo (`moon_worm.ts`) | **No usable**: depende de `MOON`, esfera lunar, `WORM_AI`, `wormDispose` |

- Minijefes de cada partida: `MINIS = [rey, cortadora, tarantula, gato]`, 2 de 4 sin repetir (`run.ts:44-46`).
- Jefe final de Survivor: `FINALS = ["perro","aspiradora","cortacercos"]` (`run.ts:61`), elegido por `pickFinal(seed)` (`:65`). Luna fuerza `"gusano"` (`main.ts:265`).
- Cronograma: `RUN_BOSSES=[[200,mini0],[400,mini1],[600,final]]` (`jefe1_s/jefe2_s/jefe_final_s`, `main.ts:265`). Aviso 30 s antes (`aviso_jefe_s`), apagón 4 s antes (`main.ts:976-983`), entrada en `:985-999` con `spawnEnemy(kind, spawnPoint(c.pos,30,36))`.
- Bestiario / ataque de pose: `beastTick`, `BATK` (`main.ts:1435-1443`) son para el pedestal del menú, no combate.
- Un jefe a la vez asumido: `enemies.find(e=>e.def.boss)` (`main.ts:1170`) para la barra de HUD (`hudBoss` único).

## 5. Armas, pasivas, evoluciones, ofertas (`weapons.ts`)

- Nivel máximo 5 (`balance.json ritmo.nivel_max`, `weapons.ts:13`). Máx. 6 armas y 6 pasivas distintas (`weapons.ts:812,818`).
- Armas (`WeaponId`, `weapons.ts:64`): `gomitas, clips, chispero, petardos, tesla, lanza, agua, yoyo, bengalas, regla, helado, bocina, trompo`. Fusiones (`FusionId`): `chispazo, globos, anillo, yoyoelec, vapor` (`FUSIONS` `:91`).
- Pasivas (`PassiveId`, `:19`): `iman, resorte, turbo, litio, capacitor, lego, lupa`. `passiveStats(p, perm)` (`:30`) → `PStats` (`st`).
- Evolución: arma Lv5 + su pasiva (`WEAPONS[id].evo`, p. ej. gomitas+resorte, clips+iman, chispero+turbo, petardos+litio, tesla+capacitor, lanza+lego, agua+lupa, yoyo+resorte, bengalas+litio, regla+iman, helado+capacitor, bocina+turbo, trompo+iman). Se otorga SOLO por cofre (`openChest` `main.ts:496` → `evoOffer` `weapons.ts:829`); `choose` marca `evolved=true` (`main.ts:480`). Aviso "EVOLUCIÓN LISTA" (`:487`).
- Fusión: dos armas Lv5/evolucionadas → `fuse()` (`weapons.ts:863`), `fusionOffer` primera carta si existe.
- `levelOffers(ws, ps, n)` (`weapons.ts:807`): pool de armas nuevas (si <6) / subidas de nivel / pasivas, barajado con `rng()`, rellena con carta `heal`. `n = 3 + save.perm.cards` (`main.ts:430`). `Offer = {kind: weapon|passive|evo|fusion|heal, id, title, icon, desc, lv?, syn?}`.
- Acoplamiento: `Weapon.update(ctx: Ctx)` (`:53`: `scene, car, enemies, dt, st, fs, damage, explode`) — interfaz limpia. Pero las clases importan `FX`, `Car`, `Enemy`, modelos y sfx; `dmgSrc` global en main atribuye daño por arma (`main.ts:1197`). `setScoop` es global del camión de helados (`weapons.ts:122`).
- `levelOffers`/`evoOffer`/`fuse`/`passiveStats` son funciones puras sobre arrays: reutilizables ya.

## 6. XP, gemas, subida de nivel

- `xpNeed(l)=floor(4 + 2.5·l + 0.36·l²)` (`balance.ts:41`).
- `gainXp(n)` `main.ts:421`: `xp += n·st.xp·driveMul·early` (rampa x0.78 los primeros 180 s); sube `level` y `pendingLevels` en bucle.
- `dropGems(pos, amount)` `main.ts:158` (valores 1/5/20, `gemTpl`); tope `gemas_tope`=350 (sobre el tope se absorbe directo). Recolección por imán `st.mag`, `pull` + `vy` (`:1210-1232`).
- `pendingLevels>0 && state==="play"` abre cartas (`main.ts:1275`). Drops: pila/iman por `drop_*_prob` (`kill` `:719`), cofre por jefe/élite/`chestT` (`:1248`), macetas `smashed` (`:150`).
- Re-sorteo (`rerolls`), revive (`revives`, `:1273`) vienen del `save.perm` (taller).

## 7. Maldiciones, habilidades, sin fin

- Habilidades (`abilities.ts:6`): `bombardeo, escudo, emp, lenta`; una elegida en `save.ability`; `useAbility` `main.ts:1311`. Estado en globals `abil, abilLv, abilCd, abilOn, bombs, worldK, shieldM` (`:138`).
- Maldiciones (`abilities.ts:20`): `horda` (+50 % enemigos), `sinrep` (sin curación). **Desactivadas**: `startRun` usa `const curses = []` (`main.ts:268`, comentario `ponytail`).
- Sin fin (`goEndless` `main.ts:1356`): tras ganar, "Seguir jugando" desde resultados; empuja `RUN_BOSSES.push([time+120, RUN_BOSSES[len%3][1]])`; cada jefe nuevo con `maxHp *= time/600` (`:991-993`). `endless=true` evita que el jefe final vuelva a ganar (`kill` `:714`). Récord `save.endless`. Muerte en sin fin cuenta como victoria (`:1274`).
- Zonas (`world.ts:163`, `ZONES`): `patio` (default, 320×320 `HALF=160`), `garaje`, `jardin`, `luna`; `zoneId` y `HALF` son `let` exportados.

## 8. Fin de partida

| Camino | Evidencia |
|---|---|
| Victoria | Matar `finalKind` fuera de sin fin: `kill()` `main.ts:714` → `outroAt`, `endRun(true, FINAL_WIN[finalKind])` (`run.ts:70`). Luna: `GOAL_IO.win` (`:749`) |
| Derrota | `hp<=0` sin revive → `endRun(false, ...)` (`:1274`); salir del mapa pone `hp=0` (`:929`) |
| Doble barra | Jefe final con hp≤0 llama `rearm()` antes de morir (`main.ts:1163-1167`) |
| `endRun(win, why)` `main.ts:325` | Logros (`grant`), tornillos `(runScrap + time/div + kills·xp/div)·curseK`, guarda `save` (scrap, best, stats, top-5 runs, diario) salvo `simulating`/`LAB.on`; arma `res` y llama `startOutro` (cámara lenta ~5 s, `outroTick` `:381`) → `openOver(res)` (menu.ts) |
| Límite | A 600 s aparece el jefe final; no hay corte duro por tiempo |

## 9. Reutilización en ENCORE

**Reutilizable casi tal cual (sin tocar Survivor)**
- `run.ts` (perfil determinista, `previewProfile`), `rng.ts` (semilla), `balance.ts/balance.json` (tablas tipadas con `guard` que tira si falta una clave).
- `weapons.ts`: `levelOffers`, `evoOffer`, `fuse`, `passiveStats`, `WEAPONS`, `PASSIVES`, `Weapon`/`Ctx`.
- `abilities.ts`, `enemies.ts` `DEF`/`spawnTable`/`pickWeighted`/`Enemy` (si cada cliente/escena aporta su propio `scene`), `xpNeed`, `savefmt.ts` + patrón `Save` con `parseSave`.
- `kit3d.ts`, `models.ts` (plantillas por `template()`), `fx.ts`, `sfx.ts`, `input.ts`.
- Patrón de modos aislados ya existente: `duel.ts`, `kart.ts`, `match3.ts` se cargan con import dinámico (`loadDuel`/`loadKart` `main.ts:575-598`) y reciben `{scene, cam, onExit}` (`modeOpts` `:591`). ENCORE debe seguir ese patrón, no editar `update()`.

**Acoplado (hay que extraer o duplicar)**
- Todo el estado de partida son `let` de `main.ts` (no hay `RunState`); `update()` mezcla IA, daño, UI, audio, cámara, física. No se puede instanciar dos veces (necesario para split-screen/multiscreen de ENCORE) ni serializar (necesario para networking/migración).
- `spawnEnemy`, `damage`, `kill`, `hurt`, `explode`, `dropGems`, `dropPickup`, `gainXp`, `endRun` son funciones de `main.ts` que tocan globals (`enemies`, `gems`, `car`, `hp`, `save`, DOM vía `hud*`, `banner`).
- Un solo `car` (`main.ts:87`), una sola cámara `cam`, un solo `hp`; `enemies` apunta a un único jugador (`c.pos`) en toda la IA (`dist = hd(e.pos, c.pos)`, `:1110`); sin objetivo múltiple.
- `world.ts`: `HALF`, `zoneId` y `setZone` son globals de módulo; el mundo es un único patio.
- Daño por `dmgSrc` global; `save` (localStorage `rcfight2`, `menu.ts:70`) escrito dentro de `endRun`.
- `enemies.ts` importa `moon`, `aliens`, `moon_worm`: `Enemy` no es independiente de la luna (`MOON.on` por todo `main.ts`).
- Jefes: HUD de un solo jefe; IA con timers por frame (no tick fijo): determinismo para red no garantizado (`Math.random()` en `enemies.ts:~586` y `main.ts:kill`).
- Persistencia: solo meta-guardado en `save`; no existe persistencia de run en curso.

## 10. Jefe secreto del FINAL ACT

Pool compatible propuesto (cumple `Def.final:true`, no depende de luna, dos barras ya implementadas, mensaje de victoria en `FINAL_WIN`): `perro`, `aspiradora`, `cortacercos` (los mismos `FINALS` de `run.ts:61`). `gusano` queda fuera (acoplado a esfera lunar). Los 4 minijefes (`rey, cortadora, tarantula, gato`) no tienen doble barra y pueden servir como guardianes/eventos de mapa, no como final.

**Recomendación: `aspiradora` (LA ASPIRADORA ROBOT)** como primer jefe final implementado en ENCORE: ataque por aro/succión/abanico totalmente telegráfico y sin salto ni embestida de GLB con clips (menos acople a `landT/clipT/vy0`), cuerpo bajo y ancho (6.4×1.6×6.4) legible con 1–4 cámaras, y la succión (`pull`) ya aplica fuerza a un `body` (extensible a varios jugadores con arenas con cover). Segunda opción `cortacercos` (cables persistentes = hazards fáciles de sabotear como "condición de arena"). `perro` es el peor candidato: salto/embestida con animaciones GLB ligadas a un solo auto. Todo sujeto a la matriz de arena que pide `03_PHASE0_AUDIT.md` (radio de arena, nº de jugadores) y a una validación en vivo (no hecha en esta auditoría).

## 11. Brechas y no verificado

- No se ejecutó el juego, tests ni `sim`: el balance (~50 % victorias del bot, `main.ts:933`) es dato de comentario.
- `ZoneId` confirmado (`world.ts:147`): patio, garaje, jardin, luna. Falta revisar `ALIENS` (`aliens.ts`) en detalle.
- Líneas `main.ts:1011-1030` (IA por frame) y `enemies.ts:658-790` (perro) leídas solo parcialmente.
- Dependencia con `devbot.ts` (bot de pruebas) para tests de jefes: `ORBIT_R[boss.kind]`, útil para pruebas automáticas ENCORE.
