---
titulo: Accesibilidad: 12 ítems menores
estado: idea
area: juego
prioridad: baja
origen: hallazgo
desde: 2026-10-21
viejo_id: H12
---

## Qué y por qué
Tab llega al canvas, botones <44 px, roles tab/switch, foco débil, sin anuncio de pantalla. Detalle en `docs/AUDITORIA-accesibilidad-menus.md`.

## Alcance
- Toca: menu.ts, menu.css, index.html.
- No toca: nada fuera de eso sin coordinar con el orquestador.

## Cómo verificar
- `npm run verificar -- --nivel tanda` + capturas + navegación por teclado.

## Notas
Migrado del TABLERO.md viejo (`.claude/trabajo/archivo/TABLERO-2026-10.md`).
