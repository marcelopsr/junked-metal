---
paths:
  - "src/dev-hooks.ts"
  - "src/devbot.ts"
  - "src/run.ts"
  - "src/rng.ts"
  - "src/render.ts"
  - "src/main.ts"
  - "src/intro.ts"
  - "scripts/**"
---

# Hooks de desarrollo, semillas y modo lab

Solo existen con `import.meta.env.DEV` (`src/dev-hooks.ts`); las herramientas headless dependen de ellos. Inspección a mano siempre en silencio: `http://localhost:5173/?mute` (el audio no se inicializa); al terminar cerrar la pestaña, nunca el servidor.

- Con la pestaña oculta el navegador no corre `requestAnimationFrame`: usar `__tick(n)`, `__time(s)`, `__xp(n)`, `__god()`, `__killAll()`, `__info()`, `__car()`. `__outro()` fuerza la derrota (cámara lenta + foto; con `__tick(n)` se avanza). `?intro` fuerza la intro y `__introAt(s)` la congela en el segundo s; `?mute` y `?lab` nunca la disparan sola.
- **Semillas:** todo lo que decide la partida usa `rng()` (`src/rng.ts`), nunca `Math.random` (solo para efectos visuales). `?seed=N` fija la partida: clima, plaga, patio (layout), orden de minijefes y ritmo de eventos (`src/run.ts`). Determinista desde una carga limpia de la página (entre partidas seguidas Havok diverge un poco). `npm run sim` además fija `Math.random`: es la forma más segura de repetir.
- **Simulación rápida:** `__sim(600)` juega 10 minutos sin dibujar (~5-15 s reales) con el bot y devuelve un resumen; `__dmg()` da el daño por fuente. Si pasa de ~35 s reales corta: seguir con otra llamada. Por línea de comandos: `npm run sim`.
- **Playtest real:** `await __bot(60)` (`src/devbot.ts`) juega sin trampas; tandas de ~60 s de juego.
- **Modo lab (iterar el look):** `?mute&seed=3&lab[&climate=niebla][&boss]` arranca una partida congelada, en god mode, con una fila de cada enemigo delante del auto. Perillas en vivo: `__look({ lampI, glowI, cone, ambMul, moonMul, fogMul, exposure, snap })` (valores en `LOOK`, `render.ts`) y `__lab({ climate, boss, back, up, look })` para re-armar la escena o mover la cámara. Tras `__look` correr `__tick(5)` y capturar. Climas: noche, niebla, farol, madrugada. Un cambio de `main.ts` recarga la página: esperar ~1,5 s a que el lab se rearme.
- Modo Carrera en dev: `?race[&players=2]`; `__race.auto()/info()/give()/use()/skip()`.
- Scripts largos en el navegador: partir en tandas (el tool corta a los pocos segundos).
