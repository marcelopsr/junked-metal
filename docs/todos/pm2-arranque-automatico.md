---
titulo: Arranque automático de pm2 al prender la Mac
estado: idea
area: infra
prioridad: baja
origen: pendiente
desde: 2026-10-21
---

## Qué y por qué
Hoy, tras reiniciar la Mac, hay que correr `npm run pm2:start` a mano. Idea propuesta y no hecha: que los servidores de pm2 suban solos.

## Alcance
- Toca: configuración de pm2 en la Mac (`pm2 startup`/`pm2 save`) y docs.
- No toca: `ecosystem.config.cjs` salvo que haga falta; los servidores de prueba se siguen autogestionando.

## Cómo verificar
- Tras reiniciar la Mac, `npm run pm2:status` muestra los servidores arriba sin intervenir.

## Notas
Viene de «Ideas propuestas y no hechas» en `docs/archivo/harness-viejo/HANDOFF-PROYECTOS.md`. Cambia configuración del sistema: pedir confirmación antes.
