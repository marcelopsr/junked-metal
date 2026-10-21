# Formato de un TODO

Un archivo por TODO: `docs/todos/<slug>.md` (slug corto en kebab-case, sin fecha). El tablero `README.md` de esta carpeta es **generado** (`npm run todos`): no se edita a mano. El TODO **es el encargo**: `npm run todos encargo <slug>` imprime el prompt completo para el agente (cuerpo + pie de cierre de `.claude/trabajo/pie-encargo.md`).

## Cabecera

```yaml
---
titulo: Modo foto en pausa
estado: idea          # idea | pregunta | elegida | en-curso | en-lote | hecha | descartada
area: juego           # juego | arte | server | portada | infra | docs
prioridad: media      # alta | media | baja
origen: pedido        # pedido | hallazgo | pendiente | decision | idea
etapa:                # id de una etapa de docs/ROADMAP-1.0.md, si aplica
tomado_por:           # mac | (vacío si nadie)
rama:                 # rama de trabajo, obligatoria si en-curso
desde: 2026-10-21     # cuándo se tomó o cambió de estado
viejo_id: T59         # id del TABLERO.md viejo, si viene de ahí
motivo:               # solo para descartada o pregunta: por qué
---
```

## Cuerpo

```markdown
## Qué y por qué
Una o dos frases: qué ve el jugador y qué problema resuelve.

## Alcance
- Toca: archivos o carpetas permitidos.
- No toca: lo compartido que no se puede tocar (main.ts si otro lo tiene, balance.json, etc.).

## Cómo verificar
- npm run verificar -- --nivel tanda (o rapido), más lo propio: sim N semillas, shots --only X, e2e, captura.

## Notas
Decisiones tomadas, enlaces al informe o a la crítica de origen.
```

## Ciclo

`idea` → `elegida` (el dueño la eligió en una ronda de AskUserQuestion) → `en-curso` (con `tomado_por` y `rama`) → `en-lote` (integrada en una rama de lote, sin publicar) → `hecha` (en master). `pregunta` = espera una decisión del dueño; `descartada` = no se vuelve a proponer (con `motivo`).

Comandos: `npm run todos` (regenera el tablero y valida), `npm run todos estado <slug> <estado>`, `npm run todos tomar <slug> --cuenta mac --rama <rama>`, `npm run todos encargo <slug>`.
