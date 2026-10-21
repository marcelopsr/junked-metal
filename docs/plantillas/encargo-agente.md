# Encargo a un agente

El encargo sale de un TODO: `npm run todos -- encargo <slug>` imprime el cuerpo del TODO más el pie de cierre (`.claude/trabajo/pie-encargo.md`). Se pega tal cual al agente (esfuerzo bajo por defecto, modelo según `.claude/skills/orquestar/SKILL.md`).

Antes: `npm run todos -- tomar <slug> --cuenta mac --rama <rama>`. Al integrar: `npm run todos -- estado <slug> en-lote` y después `hecha`.

## Qué debe tener el cuerpo del TODO
- **Qué y por qué**: qué ve el jugador y qué problema resuelve; dirección de arte (`docs/ART_DIRECTION.md`) si es visual.
- **Alcance** con archivos disjuntos: lo que toca y lo que no (archivos compartidos como `main.ts`, `balance.json`, `render.ts` los toca solo el orquestador o un agente a la vez).
- **Cómo verificar**: `npm run verificar -- --nivel tanda|rapido` más lo propio (sim N semillas, `shots --only`, e2e, captura medida con `scripts/ref_measure.py`).
- Revisor independiente (`revisor`) si toca `server/`, guardado (`savefmt.ts`) o dinero.

## Qué devuelve el agente
Implementado, verificado (comando y resultado), observado, pendiente; cambios (archivo:línea); bloqueos.
