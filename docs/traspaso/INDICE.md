# Traspaso — índice

Punto de entrada para cualquier cuenta o sesión de Claude que continúe Junked Metal. `CLAUDE.md` lo importa, así que se carga solo. Es solo un índice: cada carpeta tiene su `README.md` y archivos cortos, de un tema cada uno. Leer únicamente lo que haga falta para la tarea.

## Protocolo de Claude (el dueño no corre comandos)

El dueño no ejecuta ninguna herramienta: Claude orquesta todo, en frío (sesión nueva) o en caliente. Nunca pedirle que corra un comando; correrlo y contarle el resultado.

- **Al arrancar en frío:** leer [HANDOFF.md](HANDOFF.md), correr `npm run todos` y mirar el tablero ([../todos/README.md](../todos/README.md)), `git log -5` y los agentes o worktrees vivos. Después, en 3 líneas: dónde quedamos y qué sigue.
- **Al encargar un TODO:** `npm run todos -- tomar <slug> --cuenta mac --rama <rama>` y `npm run todos -- encargo <slug>`, que va como prompt del agente (esfuerzo bajo, archivos disjuntos).
- **Al terminar un agente:** `npm run todos -- estado <slug> en-lote`, integrar o encolar, y proponer los siguientes TODOs con AskUserQuestion.
- **Al integrar en master:** los TODOs del lote pasan a `hecha`; si cambia lo que existe, actualizar [hecho/](hecho/README.md).
- **Ideas nuevas, hallazgos o decisiones del dueño:** un TODO nuevo ([../plantillas/todo.md](../plantillas/todo.md), `origen: hallazgo` si apareció de paso) o un ADR en [../decisiones/](../decisiones/README.md); una regla nueva del dueño va a [memoria/](memoria/README.md).
- **Al cerrar una sesión larga:** actualizar `HANDOFF.md` y correr `npm run docs:check`.

## Empezar

1. [HANDOFF.md](HANDOFF.md): estado al día, en curso y próximo paso.
2. [trabajo/](trabajo/README.md): cómo se trabaja (encargos, verificación, servidores, integración, reglas del dueño).

## Según lo que necesite

| Necesito… | Ir a |
| --- | --- |
| encontrar dónde está algo, en el repo o en el juego | [guia/](guia/README.md) |
| hacer una tarea paso a paso | [manual/](manual/README.md) |
| saber qué quiere y qué no quiere el dueño | [memoria/](memoria/README.md) |
| arreglar algo que se rompió o ya nos mordió | [problemas/](problemas/README.md) |
| entender una palabra del proyecto | [GLOSARIO.md](GLOSARIO.md) |
| entender por qué algo es así | [../decisiones/](../decisiones/README.md) |
| saber qué ya existe y cómo quedó | [hecho/](hecho/README.md) |
| ver qué hay para hacer y quién tomó qué | [../todos/README.md](../todos/README.md) |
| la hoja de ruta a 1.0 | [../ROADMAP-1.0.md](../ROADMAP-1.0.md) |
| la dirección de arte vigente | [../ART_DIRECTION.md](../ART_DIRECTION.md) |
| cómo funciona el harness para un tercero | [../HARNESS.md](../HARNESS.md) |
| una plantilla | [../plantillas/README.md](../plantillas/README.md) |

## Reglas de esta documentación

- **Un tema por archivo**, de 80 líneas como máximo. Si crece, se parte y se suma al `README.md` de su carpeta.
- **Una sola fuente de verdad:** se enlaza el documento de origen (`CLAUDE.md`, `.claude/rules/`, `docs/*.md`), nunca se copia.
- **Enlaces relativos**, que funcionan en GitHub y en el editor.
- **Sin bitácora:** el estado vive en `HANDOFF.md`, las reglas en `memoria/`, los porqués en `decisiones/`, las lecciones en `problemas/`, el trabajo en `todos/`.
- `npm run docs:check` (dentro de `npm run verificar`) frena si un enlace se rompe o un archivo pasa de 80 líneas.
