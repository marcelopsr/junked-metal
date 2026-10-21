---
titulo: Quitar Demolición de master
estado: elegida
area: juego
prioridad: media
origen: decision
desde: 2026-10-21
---

## Qué y por qué
Sacar el modo Demolición de master según `.claude/trabajo/ARCHIVO-demolicion.md` (encargos A y B). Conservar `MODE_NM.duel` y no borrar claves de localStorage. Respaldo: rama y tag `archivo/demolicion`.

## Alcance
- Toca: menu.ts, kit.css, run_loader.ts, audio/effects.ts. `main.ts`: el agente entrega el parche aparte y lo integra el orquestador.
- No toca: nada fuera de eso sin coordinar con el orquestador.

## Cómo verificar
- `npm run verificar -- --nivel tanda` + tsc, npm test, e2e, shots --changed.

## Notas
Esperar a que no haya agentes en esos archivos.
