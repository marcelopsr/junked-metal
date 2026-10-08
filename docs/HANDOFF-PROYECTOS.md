# Junked Metal — Handoff para Claude Projects

Actualizado: 2026-10-08 · Ver `git log -1` para último commit en `master`.

Este documento es autocontenido: alcanza para retomar el proyecto sin el historial de las conversaciones.

---

## 1. Qué es el juego

**Junked Metal** (repo `rc_fight`, carpeta `/Users/msalas/Documents/Devs/Varios/rc_fight`) es un roguelite tipo *Survivor.io* para web: un auto a control remoto sobrevive 10 minutos en un patio contra bichos y juguetes, sube de nivel, elige armas y mejoras en cartas, y al final pelea con un jefe.

- **Tecnología:** Babylon.js 9 + física Havok + TypeScript + Vite. Corre en compu y celular (instalable como app).
- **Creador:** TheDuende. Repo público `marcelopsr/junked-metal`; publicado en https://marcelopsr.github.io/junked-metal/ (cada push a `master` publica).
- **Estilo actual (2026-10-08):** día estilo Megabonk + mundo Folded (chatarra industrial plegada, desgaste y óxido); HUD y menús de paneles de chapa oscura opaca con borde naranja, Rajdhani y tokens `--jm-*`. Noche, PSX y terminal verde son historia. Ver `docs/ART_DIRECTION.md`.
- **Modos:** Supervivencia (principal), Desafío diario (semilla del día), Carrera estilo Mario Kart (copa de 3 pistas, pantalla dividida solo en compu), Batalla de globos, Junket Crush (match-3, campaña de 10 niveles) y Demolición (duelo melee).

### Contenido actual (resumen)
- **Bichos:** hormiga, escupidora, escarabajo (modelos de Blender, animación horneada), autito a fricción, robot, polilla; élites raras Rápida y Blindada.
- **Minijefes:** Escarabajo rey, Cortadora, Tarántula, Eulalio el michu (gato).
- **Jefe final (sorteado por semilla):** Felipe el dogo (bulldog francés gris con pecho blanco), Aspiradora robot, Cortacercos eléctrico. Fase 2 con rugido, tinte rojo, vapor y halo que late.
- **Armas:** gomitas, clips, chispero, petardos, tesla, lápiz-lanza, pistola de agua, yo-yo, bengalas, regla, helado, bocina, trompo; evoluciones con pasivas y 5 fusiones.
- **Meta:** 8 autos, 5 pilotos, piezas visuales, editor de calcos 16×16, taller con mejoras, zonas compradas (Patio, Garaje de la casa, Jardín delantero), 15 logros, bestiario con ficha 3D, estadísticas.
- **Menús:** escenas propias (estante de juguetes de noche; mesa de taller), pantalla de carga con precarga distribuida, configuración de imagen completa (escala, FSR 1, preajustes Bajo/Medio/Alto/Ultra, FXAA/MSAA, nitidez, límite de FPS, FPS de menús, FOV, brillo, gamma).

---

## 2. Reglas de trabajo del usuario (obligatorias)

1. **Preguntar antes de decidir.** Toda decisión de diseño, contenido, texto, precio, balance o publicación se pregunta ANTES con preguntas de opción múltiple (hasta 4 preguntas × 4 opciones, la recomendada primera y marcada, preferir selección múltiple). Nunca decidir y avisar después. Los encargos traen propuestas, no decisiones aplicadas.
2. **Idioma:** responder en español. **Textos del juego:** español neutro e impersonal, sin voseo ("Presiona", "Sobrevive"; nunca "Apretá", "querés", "tu"). Créditos sin tecnologías, "Creado por TheDuende".
3. **Encargos con Opus o Sonnet** (bajo/medio/alto según criterio del orquestador; en paralelo cuando no se pisan); la sesión principal dirige, integra y verifica.
4. **Probar en tanda:** hacer todos los cambios y probar UNA vez al final, no pedacito por pedacito.
5. **Sin servidores ni puertos propios:** usar los de pm2 (ver §4). Un solo navegador liviano y cerrado al terminar.
6. **Git automático:** commit local tras cada tanda con cambios; push a `origin/master` sin preguntar al terminar una tanda significativa o al cerrar sesión. Solo pausar si el usuario dice "no push" o pregunta sobre publicación.
7. **Decisiones tomadas no se vuelven a preguntar.** Descartado explícitamente: enemigos que temen el faro. Maldiciones: ocultas por ahora (código intacto).

---

## 3. Mapa del código (`src/`)

| Archivo | Rol |
|---|---|
| `main.ts` | Arranque, estado de partida, loop `update()`, aparición de enemigos, jefes, hooks de prueba (`__sim`, `__bossDuel`, `__play`, `__lab`…) |
| `balance.json` / `balance.ts` | TODOS los números de balance (enemigos, armas, ritmo, ataques, autos, pilotos, precios, plagas) |
| `enemies.ts` | Tipos de enemigo, IA, fase 2, élites |
| `weapons.ts` | Armas, pasivas, evoluciones, fusiones, cartas |
| `models.ts` / `glb.ts` | Modelos procedurales / modelos importados de Blender con animación horneada (VAT) |
| `world.ts` | Zonas, props, rampas, pasto |
| `render.ts` / `bjs.ts` | Render, luces, postproceso, configuración de imagen / fachada de Babylon por rutas profundas |
| `menu.ts` / `menuscene.ts` / `loading.ts` | Menús y guardado / escenas de menú / pantalla de carga y precarga |
| `ui.ts`, `hud.css` | HUD de partida |
| `kart.ts` | Modos Carrera y Batalla |
| `sfx.ts` | Audio y música sintetizados |
| `assets-src/` | Scripts de Blender (bicho.py, cuadrupedo.py, perro/, gato/…) que generan los GLB de `public/models/` |

Documentación viva: `CLAUDE.md` (reglas, pruebas, balance, herramientas) y `docs/ART_DIRECTION.md`.

---

## 4. Cómo correr y probar

- **pm2** (`ecosystem.config.cjs`): `rc-dev` :5173 (desarrollo con recarga), `rc-test` :5174 (pruebas, sin recarga: `pm2 restart rc-test` tras cambios), `rc-demo` :4173 (build). Logs en `logs/`. Tras reiniciar la Mac: `npm run pm2:start`.
- **App en la Mac:** `/Applications/Junked Metal.app` abre la demo (la levanta con pm2 si está apagada). Actualizar: `npm run demo:refresh`.
- **Herramientas headless** (las usan el asistente y los encargos; el usuario no corre comandos):
  - `npm test` — pruebas de lógica (Vitest), <1 s.
  - `npm run sim -- --seeds 1,2 --secs 600` / `--duel perro` — simulación con bot, sin dibujar, repetible por semilla.
  - `npm run shots [-- --diff | --update]` — 35 capturas (compu y celular) con un Chromium headless sobre Metal, y comparación contra referencias locales.
  - `npm run perf` — ms por cuadro, draw calls, triángulos, memoria por escenario; compara con la medición anterior.
    - **Ojo:** el escenario `partida` (90 s de sim, modo god) mide ~254 draws en PC. El escenario `partida_llena` (300 s de sim, avanzado) mide ~168 draws — no más, porque a los 5 min las armas evolucionadas producen menos proyectiles sueltos y thin-instances agrupan por tipo. El techo real del proyecto es ~670 draws (carrera 2J, split screen). No confundir perf lab/partida con "cuello de botella": son estados normales del juego.
    - **Rendimiento en partidas largas (2026-10-06):** topes estrictos en gemas (`gemas_tope`), restos/marcas (`fx.ts`), pickups por tipo, proyectiles de ácido/tuercas (`SPIT_CAP` en `main.ts`). El loop de `update()` evita `filter`/copias de arrays en spawn, muertes y pickups; armas recorren disparos al revés sin `[...]`; gomitas reutilizan un `Vector3` de golpe. En táctil (`low`) el HUD de armas se actualiza cada 2 cuadros. Regresión: `npm run perf -- --only partida,partida_llena --vp pc` y comparar con el JSON anterior en `.perf/`.
- **Verificación mínima antes de commit:** `npx tsc --noEmit -p .` + `npm run build` + la herramienta que corresponda.
- **Balance:** la planilla de Google Sheets es la referencia ("biblia"). `npm run balance:xlsx` genera `balance.xlsx`; para traer cambios: exportar las hojas a TSV y `npm run balance:import -- archivo.txt`. El usuario todavía no subió la planilla a su Drive (pendiente: subir `balance.xlsx` y convertirla a Hojas de cálculo de Google).

---

## 5. Pendiente y decisiones abiertas

**Pendiente de implementar (ya decidido por el usuario):**
- **Planilla en Drive:** subir `balance.xlsx` y dejarla como referencia.

**Hecho el 2026-10-04:** segunda barra de los jefes finales (vida original 8.000 / 7.500 / 7.000 + segunda barra al 50 % con daño ×1,5, `ataques.segunda_barra_*`), texto de Eulalio, app de la Mac renombrada, CI con `npm test` y README.

**Hecho el 2026-10-08 (rendimiento):** los "~1.600 / ~3.200 draws" eran viejos: la línea base real (`.perf/2026-10-08-0155.json`) daba 142 en partida y 564 en carrera de 2. El mayor gasto era el GlowLayer, que redibujaba toda la escena. Ahora solo dibuja lo emisivo y lo opaco grande (radio > 4 m, que tapa halos; `GLOW_TAPA` en render.ts). PC: carrera 2J 564 → 447 draws (tris 1541k → 1505k), carrera curso 339 → 273, match3 100 → 77, portada 81 → 75, garaje 116 → 108, folded2 307 → 240. Celular sin cambio (no tiene bloom). Partida y lab no se pudieron volver a medir porque había WIP ajeno en weapons.ts. Recorte por distancia: ya existía (`setDrawDist`, DETAIL.draw: Bajo 95, Medio 145, Alto 220, Ultra sin límite) y ahora también alcanza a las instancias (cerca de tablones), poniendo el LOD en su plantilla.

**Hecho el 2026-10-08 (limpieza tras el WIP):** duelo y match-3 con carga perezosa (`import()` en `main.ts`: `loadDuel()`/`loadMatch3()`; `__duel`/`__match3` existen solo tras entrar al modo; `duel.css`/`match3.css` quedan estáticos antes de `kit.css`); vitest excluye `.claude/**`; `dmgBy` ya no cuenta doble el contacto (fuente `contacto <bicho>` vía `hurt()`); nuevas filas `ritmo`: `revive_vida/radio/dano` y `embestida_rebote/_y` (mismos valores). Verificado: `sim` semillas 1,2,3 a 300 s idéntico con y sin el refactor de `weapons.ts`.

**Abierto (preguntar al usuario antes de tocar):**
- (Cerrado por la Fase 1 de `SURVIVAL_EXPERIENCE_PLAN.md`, ya no está abierto) Daño del arma inicial: gomitas `dano_base` 4, la hormiga muere en 3 impactos. Ritmo de XP: `dureza_xp` 1,62 y rampa lenta los primeros 180 s (`xp_temprana_mult` 0,78); el bot llega a nivel 12-13 a los 5 min.
- Menús: portada con o sin bichos de juguete; posición del auto en el menú principal.
- Configuración de imagen: gamma como curva de medios tonos; FSR apagado en carrera de 2 jugadores.

**Modo Demolición (duelo melee):** GDD [`docs/DEMOLICION_GDD.md`](./DEMOLICION_GDD.md); **armado producto = fabricación RoboCraft** (`fabricar`). Armado 3×3 legado solo dev: `?duel=legacy`. Mesa WORKBENCH [`docs/DEMOLICION_WORKBENCH.md`](./DEMOLICION_WORKBENCH.md) congelada. Scorecards: [`fabricacion-scorecard.md`](./impeccable/fabricacion-scorecard.md) 25/25; [`demolicion-scorecard.md`](./impeccable/demolicion-scorecard.md) (armado drag legacy). Regresión: `npm run playtest:duel` (incl. pantalla **inter** tras 1er asalto) + `npm run shots -- --only duel`. **Pendiente:** polaroid inter, GLB §36, sim duelo multi-seed. No tocar `goBattle()` de kart.

**Supervivencia (integrado, árbol limpio al 2026-10-08):** salto arcade (`salto_*` en `balance.json`, F / `#tJump` + barra CD), cartas con barra de vida + sub amenaza + botón re-sortear, chip taller `#wshop`, outro con stat. Verificar: `npm test` (51), `npm run perf -- --only partida_llena,carrera`.

**Supervivencia — mejora de experiencia:** Fases 0–5 en [`docs/SURVIVAL_EXPERIENCE_PLAN.md`](./SURVIVAL_EXPERIENCE_PLAN.md). Identidad de build ([`docs/SURVIVAL_BUILD_IDENTITY.md`](./SURVIVAL_BUILD_IDENTITY.md)): **DESCARTADA por el usuario (2026-10-06)**; el GDD queda solo como referencia.

**Upgrade visual modelos 3D:** oleada **1c** (`5b636a0`, `1e08b75`). Oleada **2** cerrada **`dc5f1e5`** + **`8156093`** ([Integrador oleada 2 escultura](49dfbfed-b98a-44f4-a388-dd0a0e38160f), [Oleada 2 escultura Blender](32406723-a59f-47de-ad78-ccb54f48299b)): 5 GLB con sculpt en blend, 8 autos `carGlb.ts`, `proc2/` para 8 procedurales ([Esculpir 8 enemigos procedural](30b962b3-bcf4-4440-a240-c2733cd9754c)) — runtime procedural salvo plaga/jefes GLB y hulls de auto. Docs: [`OLEADA2_BLENDER_ART.md`](./encargos/OLEADA2_BLENDER_ART.md). **Si “se ve todo igual”:** [`OLEADA1C_VISIBLE_PROOF.md`](./encargos/OLEADA1C_VISIBLE_PROOF.md) (ficha 3D, no grilla); Garaje para autos; polilla/fricción/etc. **no** cambiaron en juego hasta oleada 2b. Pages = `origin/master`. **Pendiente:** proc2 → GLB runtime; `Pilot` GLB; `shots --diff`. (Antes figuraban como "local sin commit" el tope de 2 s de compilación de shaders en `T_EFECTOS` y el WIP de duelo: ya están integrados, git limpio al 2026-10-08.)

**Decisiones del usuario del 2026-10-08:**
- **Arte vigente:** día estilo Megabonk + mundo Folded; HUD de paneles oscuros opacos con borde naranja, Rajdhani, tokens `--jm-*`. Lo de noche, foco duro, PSX y terminal de fósforo verde (VT323/Silkscreen) es historia (`docs/ART_DIRECTION.md`, sección Vigente).
- **Modos en paralelo:** Carrera, Junket Crush (match-3) y Demolición siguen desarrollándose en paralelo a Supervivencia.
- **Sin economía en modos laterales:** esos tres modos NO dan tornillos ni logros (aislados de la economía de Supervivencia). No volver a proponerlo sin una razón nueva.
- **Textos del juego:** español neutro impersonal, sin voseo.

**Ideas propuestas y no hechas:** eventos del patio, objetivos secundarios, enemigos de élite más variados, ranking del diario online, arranque automático de pm2 al prender la Mac.

---

## 6. Prompt de arranque (pegar al empezar en Claude Projects)

```
Continuamos Junked Metal. Leé el handoff (HANDOFF-PROYECTOS.md) y respetá sus reglas de trabajo:
preguntar antes de decidir con opción múltiple, español, textos del juego neutros, encargos con Opus o Sonnet según la tarea,
cambios en tanda y una prueba, pm2 y herramientas headless, commit local salvo que pida publicar.
Empezá preguntándome qué trabajamos hoy, ofreciendo como opciones los pendientes de la sección 5.
```
