---
titulo: Cámara tapada por follaje y fachadas
estado: idea
area: juego
prioridad: alta
origen: hallazgo
desde: 2026-10-21
---

## Qué y por qué
QA-0.92: ciudad 84 %, bosque 61-74 %, nieve 58 %, industrial 43 % de muestras con malla entre cámara y auto. Ocultar/atenuar mallas altas que tapan o subir la cámara en esas zonas. Celular: aviso central y toast de radar caen sobre la franja del auto (y≈185-255). Ver `.claude/trabajo/CAMARA-oclusion.md`.

## Alcance
- Toca: camera_rig.ts, hud.css.
- No toca: nada fuera de eso sin coordinar con el orquestador.

## Cómo verificar
- `npm run verificar -- --nivel tanda` + e2e cel + capturas.

## Notas
Lo toca el orquestador (archivo compartido).
