---
name: puerta
description: Puerta de versión de Junked Metal: verificación completa en segundo plano, hallazgos a TODOs, versión +0.01, tag, publicar en seco y, con el OK del dueño, publicar real. Usar con /puerta o al cerrar una versión (memoria ritmo-y-versiones).
user-invocable: true
---

# /puerta

Cada update grande sube la versión de a 0.01 (0.97 → 0.98) con puerta de hito, tag y `npm run publicar` con el OK del dueño. Solo lo corre el orquestador, nunca un subagente, y nunca con agentes de construcción vivos.

1. **Estado limpio:** ningún TODO `en-curso`; `git status` sin cambios ajenos sin integrar; `docs/traspaso/HANDOFF.md` al día. Si hay algo a medias, `/cerrar-tanda` primero.
2. **Verificación completa:** `npm run verificar -- --nivel puerta` con `run_in_background: true` (tsc, test:todo, balance:check, build, e2e pc y cel ×5, sim ENCORE 20 semillas, shots pc y cel completos; tarda varios minutos). Esperar la notificación. Cada fase que falla → TODO con `origen: hallazgo`, `prioridad: alta`; se arregla antes de seguir o el dueño decide publicar igual (preguntarlo).
3. **Hito del roadmap:** marcar en `docs/ROADMAP-1.0.md` la etapa cumplida y lo que queda; `docs/traspaso/hecho/` al día con lo nuevo de la versión.
4. **Versión:** `npm version 0.NN.0 --no-git-tag-version`, entrada en `portada/novedades.json` si `publicar` no la genera sola (lo hace con `--commit`), commit `chore(release): v0.NN.0` y tag `v0.NN.0`.
5. **Publicar en seco:** `npm run publicar -- --seco` y mostrar al dueño los pasos y el resumen de la verificación. Pedir el OK con AskUserQuestion (publicar / publicar sin e2e / esperar).
6. **Publicar real:** `npm run publicar -- --commit "release: v0.NN.0"` (push incluido: lleva el marcador `# push-ok` si se corre por fuera). Después: `npm run demo:refresh` para la app del Mac, chequeos de producción que imprime `publicar`, y `docs/traspaso/HANDOFF.md` con la versión publicada y la siguiente.
7. Cerrar con una ronda de propuestas (`/ronda`) para la versión siguiente.
