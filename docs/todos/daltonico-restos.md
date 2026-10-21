---
titulo: Modo daltónico: lo que falta
estado: idea
area: juego
prioridad: media
origen: pendiente
desde: 2026-10-21
---

## Qué y por qué
hud.css #22c55e → var(--ok); relleno 3D de peligro #ff2a1a → #D55E00 con save.cb (models/enemies.ts teleFill/teleFillArc, moon_events lunaAvisoArea); captura de Configuración con el modo activo; revisar naranja --low vs amarillo del rayado.

## Alcance
- Toca: hud.css, models/enemies.ts, moon_events.ts.
- No toca: nada fuera de eso sin coordinar con el orquestador.

## Cómo verificar
- `npm run verificar -- --nivel tanda` + shots con save.cb.

## Notas
Migrado del TABLERO.md viejo (`.claude/trabajo/archivo/TABLERO-2026-10.md`).
