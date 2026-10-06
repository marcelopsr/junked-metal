# Surface brief — Demolición / FABRICACIÓN (Operate)

**Modo:** Operate · **Targets:** `src/duel_fabricacion.ts`, `src/duel_fabricacion.css`, `src/duel_build.ts`, fase `fabricar` en `src/duel.ts`  
**Plan:** `docs/DEMOLICION_FABRICACION_ROBOCRAFT.md`

## Jerarquía

1. Instrucción una línea (fabricar en rejilla).
2. Vista 3D del robot en mesa (dominante).
3. Rejilla 2D por capas Y + cajón de bloques.
4. Telemetría + plantillas + CTA fijo.

## Criterios MVP

| Criterio | Meta |
|----------|------|
| Affordance | Tab inventario → celda verde = colocar; borrar; R/M/Z |
| Carga cognitiva | 5 tabs; plantillas 3; sin lore largo en chips |
| Combate | **Una barra de vida global**; piezas se desprenden al desgastarse (feedback) |
| A11y | Capas con botones ±; focus-visible; CTA deshabilitado si BAN |
| Contraste | Tokens HUD existentes (`#141813`, `#b9d3a4`, `#7fbf5a`) |

## Verificación

`npm run shots -- --only duel` · `impeccable detect` sobre TS/CSS de fabricación
