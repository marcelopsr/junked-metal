---
titulo: Subir balance.xlsx a Drive como referencia
estado: idea
area: docs
prioridad: baja
origen: pendiente
desde: 2026-10-21
---

## Qué y por qué
Decidido por el usuario y nunca hecho: subir `balance.xlsx` a su Drive y dejarla como planilla de referencia (la «biblia» del balance, ver ADR 0004).

## Alcance
- Toca: nada del repo; solo generar el archivo con `npm run balance:xlsx` y subirlo.
- No toca: `src/balance.json`.

## Cómo verificar
- La planilla abre en Drive y sus hojas coinciden con `npm run balance:check`.

## Notas
Viene de la sección 5 de `docs/archivo/harness-viejo/HANDOFF-PROYECTOS.md`. Los conectores externos están habilitados desde el 2026-09-29.
