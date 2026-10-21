# Harness viejo (era Gemini/Codex)

Documentos del flujo anterior, cuando Codex, Antigravity y Gemini coordinaban por archivos de la raíz de `docs/`. Ya no mandan: se conservan como historia. El flujo vigente es [HARNESS.md](../../HARNESS.md).

| Archivo | Qué era | Qué lo reemplaza hoy |
|---|---|---|
| [PRODUCT_EVOLUTION.md](./PRODUCT_EVOLUTION.md) | Registro persistente de ciclos de producto (1650 líneas): estado por módulo, decisiones, ideas descartadas. | [docs/todos/](../../todos/README.md) (tareas) y [docs/decisiones/](../../decisiones/README.md) (ADR). |
| [SPECIALISTS_ECOSYSTEM.md](./SPECIALISTS_ECOSYSTEM.md) | Equipo de especialistas por disciplina y modalidad, con prompts de arranque para Codex y Gemini. | [docs/traspaso/trabajo/](../../traspaso/trabajo/README.md), [AGENTS.md](../../../AGENTS.md) y [GEMINI.md](../../../GEMINI.md). |
| [VISUAL_SESSION_COORDINATION.md](./VISUAL_SESSION_COORDINATION.md) | Coordinación de sesiones visuales Codex y Gemini (intro, escena 3D, LOD, frenchie). | Igual que arriba, más [ART_DIRECTION.md](../../ART_DIRECTION.md) para el arte. |
| [HANDOFF-SESION.md](./HANDOFF-SESION.md) | Handoff de una sesión concreta (2026-10-12): estado del árbol sin commitear. | [docs/traspaso/HANDOFF.md](../../traspaso/HANDOFF.md). |
| [HANDOFF-PROYECTOS.md](./HANDOFF-PROYECTOS.md) | Handoff general para Claude Projects (2026-10-08): reglas, mapa del código, pendientes. | [docs/traspaso/HANDOFF.md](../../traspaso/HANDOFF.md) y [docs/traspaso/guia/](../../traspaso/guia/README.md). |

## Pendientes rescatados

La sección 5 de HANDOFF-PROYECTOS se revisó el 2026-10-21 antes de archivarla:

- Subir `balance.xlsx` a Drive: [planilla-balance-en-drive](../../todos/planilla-balance-en-drive.md).
- Arranque automático de pm2: [pm2-arranque-automatico](../../todos/pm2-arranque-automatico.md).
- Ranking del diario online: ya existe como [ranking-semanal](../../todos/ranking-semanal.md).
- Eventos del patio y objetivos secundarios: los cubre el Director de ENCORE (`src/encore_events.ts`).
- Dudas de menús (bichos en la portada) y de imagen (gamma, FSR en carrera de 2): quedaron superadas por el estilo Encore y por el archivo de Carrera; no se rescataron.
