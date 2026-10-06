# Junked Metal — Handoff para Claude Projects

Actualizado: 2026-10-04 · Último commit: `0110547` (rama `master`, solo local; lo publicado en GitHub Pages es anterior).

Este documento es autocontenido: alcanza para retomar el proyecto sin el historial de las conversaciones.

---

## 1. Qué es el juego

**Junked Metal** (repo `rc_fight`, carpeta `/Users/msalas/Documents/Devs/Varios/rc_fight`) es un roguelite tipo *Survivor.io* para web: un auto a control remoto sobrevive 10 minutos en un patio contra bichos y juguetes, sube de nivel, elige armas y mejoras en cartas, y al final pelea con un jefe.

- **Tecnología:** Babylon.js 9 + física Havok + TypeScript + Vite. Corre en compu y celular (instalable como app).
- **Creador:** TheDuende. Repo público `marcelopsr/junked-metal`; publicado en https://marcelopsr.github.io/junked-metal/ (cada push a `master` publica).
- **Estilo actual:** cartoon brillante, contorno suave, menús de vidrio oscuro con tipografía Rajdhani. (Hubo una etapa PS1/retro que ya NO es el norte.)
- **Modos:** Supervivencia (principal), Desafío diario (semilla del día), Carrera estilo Mario Kart (copa de 3 pistas, pantalla dividida) y Batalla de globos.

### Contenido actual (resumen)
- **Bichos:** hormiga, escupidora, escarabajo (modelos de Blender, animación horneada), autito a fricción, robot, polilla; élites raras Rápida y Blindada.
- **Minijefes:** Escarabajo rey, Cortadora, Tarántula, Eulalio el michu (gato).
- **Jefe final (sorteado por semilla):** Felipe el dogo (bulldog francés gris con pecho blanco), Aspiradora robot, Cortacercos eléctrico. Fase 2 con rugido, tinte rojo, vapor y halo que late.
- **Armas:** gomitas, clips, chispero, petardos, tesla, lápiz-lanza, pistola de agua, yo-yo, bengalas, regla, helado, bocina, trompo; evoluciones con pasivas y 5 fusiones.
- **Meta:** 5 autos, 5 pilotos, piezas visuales, editor de calcos 16×16, taller con mejoras, zonas compradas (Patio, Garaje de la casa, Jardín delantero), 15 logros, bestiario con ficha 3D, estadísticas.
- **Menús:** escenas propias (estante de juguetes de noche; mesa de taller), pantalla de carga con precarga distribuida, configuración de imagen completa (escala, FSR 1, preajustes Bajo/Medio/Alto/Ultra, FXAA/MSAA, nitidez, límite de FPS, FPS de menús, FOV, brillo, gamma).

---

## 2. Reglas de trabajo del usuario (obligatorias)

1. **Preguntar antes de decidir.** Toda decisión de diseño, contenido, texto, precio, balance o publicación se pregunta ANTES con preguntas de opción múltiple (hasta 4 preguntas × 4 opciones, la recomendada primera y marcada, preferir selección múltiple). Nunca decidir y avisar después. Los encargos traen propuestas, no decisiones aplicadas.
2. **Idioma:** responder en español. **Textos del juego:** español neutro e impersonal, sin voseo ("Presiona", "Sobrevive"; nunca "Apretá", "querés", "tu"). Créditos sin tecnologías, "Creado por TheDuende".
3. **Encargos con Sonnet** (bajo/medio/alto según dificultad); la sesión principal dirige, integra y verifica.
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
- **Verificación mínima antes de commit:** `npx tsc --noEmit -p .` + `npm run build` + la herramienta que corresponda.
- **Balance:** la planilla de Google Sheets es la referencia ("biblia"). `npm run balance:xlsx` genera `balance.xlsx`; para traer cambios: exportar las hojas a TSV y `npm run balance:import -- archivo.txt`. El usuario todavía no subió la planilla a su Drive (pendiente: subir `balance.xlsx` y convertirla a Hojas de cálculo de Google).

---

## 5. Pendiente y decisiones abiertas

**Pendiente de implementar (ya decidido por el usuario):**
- **Planilla en Drive:** subir `balance.xlsx` y dejarla como referencia.

**Hecho el 2026-10-04:** segunda barra de los jefes finales (vida original 8.000 / 7.500 / 7.000 + segunda barra al 50 % con daño ×1,5, `ataques.segunda_barra_*`), texto de Eulalio, app de la Mac renombrada, CI con `npm test` y README.

**Abierto (preguntar al usuario antes de tocar):**
- Daño base del arma inicial (que la hormiga muera en 3 golpes y no 2): el usuario cortó la pregunta; quedó sin decidir.
- Ritmo de subida de nivel con XP ×2 (el bot llega a nivel 26 a los 5 min).
- Menús: portada con o sin bichos de juguete; posición del auto en el menú principal.
- Configuración de imagen: gamma como curva de medios tonos; FSR apagado en carrera de 2 jugadores; recorte por distancia de props.
- Rendimiento: ~1.600 draw calls en partida y ~3.200 en carrera a 2 jugadores (posible cuello de botella en celulares).

**Modo Demolición (duelo melee):** diseño completo en [`docs/DEMOLICION_GDD.md`](./DEMOLICION_GDD.md) (GDD maestro: reglas, building, piezas, IA, frases, armado profundo §27); checklist de rondas en [`docs/BATTLE_RC_PLAN.md`](./BATTLE_RC_PLAN.md). Implementación pendiente de aprobación explícita (§26 del GDD). No tocar `goBattle()` de kart al implementar.

**Ideas propuestas y no hechas:** eventos del patio, objetivos secundarios, enemigos de élite más variados, ranking del diario online, arranque automático de pm2 al prender la Mac.

---

## 6. Prompt de arranque (pegar al empezar en Claude Projects)

```
Continuamos Junked Metal. Leé el handoff (HANDOFF-PROYECTOS.md) y respetá sus reglas de trabajo:
preguntar antes de decidir con opción múltiple, español, textos del juego neutros, encargos con Sonnet,
cambios en tanda y una prueba, pm2 y herramientas headless, commit local salvo que pida publicar.
Empezá preguntándome qué trabajamos hoy, ofreciendo como opciones los pendientes de la sección 5.
```
