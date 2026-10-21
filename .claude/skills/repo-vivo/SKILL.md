---
name: repo-vivo
description: Método de trabajo «repo vivo» de Marcelo para cualquier repo — documentación modular de traspaso, TODOs un-archivo-por-tarea con tablero generado (el TODO es el encargo), decisiones ADR, críticas versionadas, frituras con agentes en worktrees e integración por lotes; Claude orquesta todo. Usar al arrancar un repo nuevo, al montar o revisar su documentación, al organizar TODOs, o cuando el usuario pida «aplicá la metodología», «armá la documentación», «traspaso», «tablero de TODOs».
---

# Repo vivo

Un repo que se explica solo: cualquier cuenta o sesión de Claude entra en frío y en minutos sabe qué existe, cómo se trabaja, qué falta y qué sigue, sin redescubrir. El dueño decide (con AskUserQuestion); **Claude orquesta y corre todo** — nunca le pide que ejecute comandos.

Referencia viva completa: el repo redserva (`~/Devs/Varios/redserva/documentos/redserva/traspaso/INDICE.md`).

## Principios

1. **Todo lo que importa viaja con el repo.** La memoria de usuario de Claude (`~/.claude/projects/…/memory/`) no viaja entre máquinas ni cuentas: lo durable se cura a `docs/traspaso/memoria/`.
2. **Modular:** un tema por archivo, ≤ 80 líneas; cada carpeta con su `README.md` índice. Si crece, se parte.
3. **Una sola fuente de verdad:** se enlaza, no se copia. Enlaces relativos.
4. **Sin bitácora:** el estado vive en `HANDOFF.md`; reglas en `memoria/`; porqués en `decisiones/`; lecciones de incidentes en `problemas/`; trabajo en `todos/`.
5. **El TODO es el encargo:** cada TODO trae qué y por qué, alcance (toca / no toca), cómo verificar. Lanzar un agente = pasarle ese archivo + el pie de cierre.
6. **Lo generado no se edita a mano** (tablero de TODOs). `docs:check` corre dentro de la verificación y frena si la documentación se rompe.
7. **Críticas versionadas:** rúbrica, informes y listas «brecha a 100» en `docs/criticas/`; capturas y logs pesados fuera de git.

## Estructura

```text
CLAUDE.md                 → importa @docs/traspaso/INDICE.md (y @AGENTS.md si existe)
docs/
  traspaso/
    INDICE.md             portada + «Protocolo de Claude» + tabla «Necesito… → Ir a»
    HANDOFF.md            estado, en cola, en curso, próximo paso (se actualiza al cerrar sesión)
    trabajo/              cómo se trabaja: frituras, integración, entornos, reglas del dueño
    guia/                 dónde está cada cosa (repo, app, API, «quiero cambiar X → mirá Y»)
    manual/               recetas paso a paso, una por archivo (NN-<tarea>.md)
    memoria/              reglas del dueño curadas (una por archivo, con Why / How to apply)
    hecho/                catálogo de lo que ya existe, con ficha, madurez y nota de crítica
    problemas/            síntoma → causa → arreglo, por área
    GLOSARIO.md
  todos/                  un <slug>.md por TODO + FORMATO.md + README.md (tablero generado)
  decisiones/             ADR NNNN-<slug>.md + README.md
  roadmap/README.md       etapas con id, criterio de terminado y avance
  criticas/               rúbrica, informes /100, BRECHA-100-*.md
  estado/                 nota /100 por módulo (RUBRICA: funciona 30, experiencia 30, pruebas 20, docs 10, deuda 10), «ahora estamos en» y camino a 100
  plantillas/             todo, encargo-agente, pie-encargo, ficha-modulo, critica, decision
scripts/todos.mjs         npm run todos [estado|tomar|encargo]
scripts/docs-check.mjs    npm run docs:check (enlaces, ≤80 líneas, cabeceras, ramas, tablero)
```

## Montarlo en un repo nuevo

1. Leer el repo (README, CLAUDE.md/AGENTS.md, estructura, scripts del package) y preguntar al dueño con AskUserQuestion solo lo de producto (portales, reglas que ya tiene).
2. Copiar `scripts/` de esta skill a `scripts/` del repo y `plantillas/` a `docs/plantillas/` (`todos-FORMATO.md` → `docs/todos/FORMATO.md`). Ajustar si el repo usa otra carpeta que `docs/` (constantes `DIR`/`BASE` al principio de cada script) y las cuentas (`TODOS_CUENTAS=mac,pc2`).
3. Sumar a `package.json`: `"todos": "node scripts/todos.mjs"`, `"docs:check": "node scripts/docs-check.mjs"`, y `docs:check` dentro del script de verificación del repo.
4. Escribir `docs/traspaso/` en paralelo con 2-4 agentes (carpetas disjuntas): guía + manual (leen mucho del repo), hecho + críticas, decisiones ADR; Claude escribe INDICE, HANDOFF, memoria curada y glosario.
5. Migrar a `docs/todos/` todo lo pendiente (ideas, brechas de crítica, pendientes sueltos, decisiones abiertas como `estado: pregunta`) y armar `docs/roadmap/README.md`.
6. Importar el índice desde `CLAUDE.md` (`@docs/traspaso/INDICE.md`), correr `npm run todos` y `npm run docs:check` hasta verde, commit y push.

## Protocolo de Claude (en todo repo con este método)

- **Arranque en frío:** leer HANDOFF, `npm run todos`, mirar tablero, `git log -1` y agentes vivos → 3 líneas: dónde quedamos y qué sigue.
- **Lanzar trabajo:** `todos tomar <slug> --cuenta <c> --rama <r>` + `todos encargo <slug>` como prompt del agente (worktree propio, pie de cierre).
- **Agente terminó:** cerrar worktree, `todos estado <slug> en-lote`, encolar la rama, proponer los siguientes TODOs con AskUserQuestion.
- **Integrar o terminar una crítica:** los TODOs del lote → `hecha`; actualizar `hecho/` y las notas de `estado/`.
- **Decisión nueva del dueño:** ADR en `decisiones/` o regla en `memoria/`; idea nueva → TODO.
- **Cierre de sesión larga:** actualizar HANDOFF y `npm run docs:check`.
- Varias cuentas: nunca dos en la misma rama; `tomar` falla si otra cuenta la tiene; una sola integra por vez.
