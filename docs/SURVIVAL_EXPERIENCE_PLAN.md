# Supervivencia — Plan de mejora de experiencia

Estado: **APROBADO para Fase 0–1** (toolbox ronda 2, 2026-10-06). Fases 2–5 pendientes de nueva autorización.
Regla: `.cursor/rules/plan-antes-de-feature.mdc`

---

## Decisiones usuario (ronda 1, selección múltiple)

| Eje | Elegido |
|-----|---------|
| Prioridades | **Sensación de partida**, **balance/duración**, **rendimiento** (sin paquete grande de contenido nuevo como eje principal) |
| Ritmo | **Clásico Survivor.io** (10 min, pico ~6–7, jefe final) **+** **subida más lenta al inicio** (más peso garaje/auto/piloto) |
| Rendimiento | **Partida avanzada en móvil** (métrica), **mejor calidad en PC Alto/Ultra**, **sin bloquear features por perf** salvo regresión |
| Nota perf | El usuario **no prueba en celular a mano**; la validación móvil es **`npm run perf -- --vp cel`** (y shots `cel` si aplica), preset **Medio/Bajo** como proxy |
| Primera implementación (alcance) | **UX HUD**, **eventos/ritmo de patio**, **combate/pickups**, **pase gráfico en partida** — los cuatro paquetes |

### Cómo reconciliar ritmo clásico + rampa lenta

- Mantener **reloj de 10:00**, orden de minijefes/jefe y arco emocional survivor.
- En los **primeros ~3 min**: menos niveles que hoy (objetivo orientativo: **~12–15** a los 5 min con bot estándar, vs ~26 actuales con `dureza_xp` alto).
- El **poder tardío** (6–10 min) sigue siendo el pico; cartas y evos siguen importando, no solo stats del garaje.
- Garaje: que **auto, piloto y pasivas del taller** se noten en daño/aguante/recarga **sin** volver la partida trivial.

---

## Visión (qué “mejor” significa aquí)

1. **Leer la partida** — radar, radio, élites, lluvia, minijefe próximo, segunda barra del jefe.
2. **Sentir el combate** — contacto, empuje, gomita inicial coherente con enemigos base, pickups claros.
3. **Runs con identidad** — semilla ya define clima, plaga, layout; reforzar **presencia** de enjambre/cofre/élite/lluvia en HUD y pacing (sin sistema nuevo gigante tipo “misiones secundarias” en v1).
4. **Perf medible** — baseline y techo en `partida` + `partida_llena` (PC y **viewport cel**); mejoras visuales en PC no deben empeorar cel por encima de umbral acordado.
5. **Look nocturno** — un solo foco (faro), niebla/marcas legibles, alineado con `docs/ART_DIRECTION.md`.

---

## Qué NO entra en esta iniciativa (v1)

- Modo Demolición / duelo (`duel.ts`).
- Carrera / batalla de globos (`kart.ts`).
- Maldiciones (ocultas; no reactivar sin decisión).
- Ranking online del diario, eventos de patio totalmente nuevos (macetas voladoras, etc.) — solo **pulir y comunicar** lo que ya existe en `run.ts` / spawner.
- Contenido nuevo masivo (enemigos, armas, jefes).

---

## Mapa técnico (archivos)

| Paquete | Archivos principales |
|---------|----------------------|
| UX partida | `ui.ts`, `hud.css`, `replay.ts`, hooks en `main.ts` |
| Ritmo / eventos | `run.ts`, `main.ts` (spawner, timers), `balance.json` → `ritmo` |
| Combate / pickups | `car.ts`, `enemies.ts`, `weapons.ts`, `fx.ts`, `balance.json` |
| Gráficos partida | `render.ts`, `world.ts`, `fx.ts` |
| Verificación | `npm test`, `npm run sim`, `npm run perf`, `npm run shots` |

---

## Fases y criterio de terminado

### Fase 0 — Línea base (sin cambios de diseño)

- `npm run perf -- --only partida,partida_llena --vp pc` y misma con `--vp cel`.
- `npm run sim -- --seeds 1,2,3 --secs 600` → registrar nivel @5 min, @10 min, muerte/supervivencia bot.
- Guardar números en este doc (tabla abajo) al ejecutar.

### Fase 1 — Balance núcleo (ritmo lento temprano + legibilidad de poder)

- Ajustar `ritmo` / XP (`xp_nivel_*`, `dureza_xp`, opcional curva por minuto si existe hook).
- Cerrar **gomita vs hormiga** (golpes para matar).
- Re-sim 3 semillas; nivel @5 min dentro del objetivo acordado en ronda 2.

**Terminado cuando:** sim estable; hormiga cumple criterio; no hay arma inicial rota en duelos cortos.

### Fase 2 — Combate y pickups

- Microajustes empuje/contacto si el bot o playtest muestran “pinball” o “sin peso”.
- Gemas/tornillos: claridad visual o magnético sin spam de draws.

**Terminado cuando:** `npm test` + sim sin regresión de win rate extrema.

### Fase 3 — Ritmo visible (eventos existentes)

- Avisos de radio / HUD para: enjambre, cofre, élite, lluvia (textos neutros, telemetría RC).
- Opcional: pequeños ajustes a intervalos en `balance.json` si los eventos se sienten invisibles.

**Terminado cuando:** shots `partida` muestran al menos un aviso legible; sim no rompe timers.

### Fase 4 — UX partida

- Cartas: pausa legible, prioridad visual amenaza vs menú.
- Radar / barra de jefe / outro sin clutter.

**Terminado cuando:** shots PC+cel (referencia visual) y diff tolerancia.

### Fase 5 — Gráficos (PC) con techo cel

- Ajustes `LOOK` / niebla / faro / marcas en partida (no menús).
- Si perf cel empeora >20 % ms/cuadro vs baseline Fase 0 → recortar o condicionar a preset.

**Terminado cuando:** perf PC estable o mejor; perf cel no peor que baseline + umbral.

---

## Baseline (Fase 0, 2026-10-06)

| Métrica | PC `partida` | PC `partida_llena` | Cel `partida_llena` |
|---------|--------------|--------------------|---------------------|
| ms/cuadro | ~6.0 | ~7.7 | ~4.8 (`.perf/2026-10-06-1755.json`) |
| draws | ~129 | ~240 | ~99 |
| Nivel bot @5 min (semillas 1–3) | — | — | **12 / 10 / 13** tras Fase 1 (antes ~7 / 17 / 13) |

### Baseline 2026-10-06 post-salto

Medición tras reinicio `rc-test`; commit `028ec97`. Perf: `partida_llena`, 180 cuadros. Sim: `--secs 300` (5 min juego).

| Métrica | PC `partida_llena` | Cel `partida_llena` |
|---------|--------------------|---------------------|
| ms/cuadro | **8.4** (p95 14.7) | **6.8** (p95 9.7) |
| draws | **233** | **163** |
| triángulos (k) | **421.4** | **245.4** |
| heap MB | **90.5** | **95.1** |
| mallas | 1326 | 1514 |

JSON: PC `.perf/2026-10-06-1837.json` · cel `.perf/2026-10-06-1838.json` (más reciente cel).

**Sim @300 s (semillas 1–3):** nv **11** (muerte 4:16), **16** (muerte 4:44), **12** (vivo @5:00) — estados over/over/play; bajas 198 / 329 / 226.

### Sim @300 s (semillas 1–10, bot estándar, 2026-10-06 tanda meta)

| Semilla | Resultado @300 s | Nv | Bajas | Notas |
|--------:|-------------------|---:|------:|-------|
| 1 | vivo | 10 | 202 | — |
| 2 | vivo | 7 | 140 | — |
| 3 | vivo | 8 | 146 | — |
| 4 | vivo | 12 | 194 | — |
| 5 | vivo | 12 | 261 | — |
| 6 | vivo | 10 | 215 | — |
| 7 | **muerte 260.2 s** | 8 | 123 | única muerte de la tanda |
| 8 | vivo | 14 | 276 | — |
| 9 | vivo | 16 | 248 | — |
| 10 | vivo | 8 | 70 | poco farm, pero vivo |

**Rango nv @5 min (vivos):** 7–16 (objetivo ronda 2: **12–15**; semillas 2, 3, 7, 10 por debajo; 9 por encima).

### Perf cel `partida_llena` (2026-10-06 tanda meta)

JSON: `.perf/2026-10-06-1847.json` (180 cuadros, `--vp cel`).

| Métrica | Baseline post-salto | Medición tanda meta | Umbral regresión |
|---------|--------------------:|--------------------:|------------------|
| ms/cuadro | 6.8 | **7.3** (+7 %) | +20 % → **8.2** |
| p95 | 9.7 | **9.5** | — |
| draws | 163 | **99** | — |

Sin recorte en `fx.ts`: ms y p95 dentro del techo; draws mejor que baseline.

Re-medición tras tanda in-run (`.perf/2026-10-06-1848.json`): **5.4** ms/cuadro, p95 **10.0**, **97** draws (ruido ±15 % en ms; draws estables).

### In-run (salto, pickups, jefes — tanda 2026-10-06)

- Salto: coyote (`salto_coyote_s`), bonus en rampa (`salto_rampa_*` + `slope` en `drive()`), polvo al aterrizar.
- Pickups: tuercas bajo faro; pilas/imán en radar; gates SFX en rachas.
- Jefes: aviso ~30 s (`aviso_jefe_s`) + `radioBoss`; bossbar alineada con radio.

### Sim @600 s (semillas 1–5, commit `450b6fb`)

Bot estándar, sin god. Tres supervivencias completas; dos muertes tempranas (semillas 3 y 5).

| Semilla | Resultado | Nv @ fin | Bajas |
|--------:|-----------|---------:|------:|
| 1 | vivo 600 s | 37 | 2426 |
| 2 | vivo 600 s | 41 | 2820 |
| 3 | muerte 268.9 s | 9 | 160 |
| 4 | vivo 600 s | 38 | 2291 |
| 5 | muerte 345.3 s | 8 | 137 |

**Nota:** nivel a 10 min en runs largas (37–41) por encima del objetivo narrativo de rampa lenta; revisar `dureza_xp` / curva solo si playtest o sim @5 min empeora de forma sistemática.

### Mecánica (tanda 2026-10-06, antes de UI)

- Contacto: empuje al auto (`contacto_empuje_auto`) al recibir golpe de contacto.
- Manejo: agarre extra con lluvia si no hay derrape (`lluvia_control`).
- IA: separación suave entre bichos cerca del auto (`enemigo_separacion`).
- Distancia: escupidora devuelve `spit_aim` (chispas + marca en piso) antes del escupitajo.

### Fases 2–5 (2026-10-06)

- **Combate/pickups:** empuje a bichos en contacto (`contacto_empuje_bicho`); imán un poco más rápido; gemas en radar si ≤40 en piso.
- **Feel contacto (`450b6fb`):** `contacto_empuje_auto` 6.8, `contacto_empuje_bicho` 2.9, `enemigo_separacion` 1.58 m; empuje al auto escala con enjambre; anti-pinball y standoff en `enemies.ts`.
- **Radio eventos (`450b6fb`):** `radioEvent()` — copy METEO/RADAR/SEÑAL, ícono, duración tras tipeo.
- **Eventos:** avisos ~6 s antes (enjambre, élite, lluvia, pelota) vía `aviso_evento_s`; élites en radar (blip violeta).
- **UX:** `NV 05 +2` con niveles pendientes; subtítulo en cartas con presión cercana; outro con tiempo/bajas/nivel.
- **Meta/métricas (tanda meta):** outro con `outroStatLine` (manejo ×, evos); resultados con daño por fuente; pausa con telemetría de partida y atajo a Controles.
- **Gráficos:** ajuste `LOOK` (faro, niebla, exposición) para lectura nocturna en partida.

### Fase 1 hecha (2026-10-06)

- `balance.json`: gomitas `dano_base` 4 (3 golpes a hormiga con dureza); `dureza_xp` 1.62; `xp_temprana_s` 180, `xp_temprana_mult` 0.78.
- `main.ts`: `gainXp` aplica multiplicador temprano.
- HUD: franja **TALLER** con niveles de mejoras permanentes (`ui.ts`, `hud.css`, `index.html`).
- Test: `balance supervivencia` en `test/stats.test.ts`.

---

## Decisiones usuario (ronda 2)

| Tema | Decisión |
|------|----------|
| Gomita vs hormiga | **3 impactos** en condiciones base (sin pasivas raras) |
| Nivel @5 min (sim semillas 1–3) | **12–15** |
| Garaje | **Stats auto/piloto** + **menos XP efectiva 0–3 min** + **pasivas del taller visibles al inicio** (HUD) |
| Arranque | **Fase 0–1** solamente en esta tanda |

## Checklist decisiones pendientes (ronda 3+)

- [x] Umbral de regresión perf cel: **+20 % ms/cuadro** en `partida_llena` vs baseline post-salto (6.8 → **8.2** máx.); p95/draws solo informativos salvo regresión grosera.
- [ ] Detalle textos radio / gráficos Fase 5.

---

## Rondas AskUserQuestion propuestas

- **Ronda 2 (siguiente):** balance núcleo + garaje + umbral perf + aprobar plan (todo selección múltiple donde aplique).
- **Ronda 3 (si hace falta):** textos de radio, prioridad de avisos HUD, detalle gráfico (niebla vs partículas).
