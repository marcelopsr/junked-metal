---
titulo:               # corto, lo que ve el jugador
estado: idea          # idea | pregunta | elegida | en-curso | en-lote | hecha | descartada
area: juego           # juego | arte | server | portada | infra | docs
prioridad: media      # alta | media | baja
origen: pendiente     # pedido | hallazgo | pendiente | decision | idea
etapa:                # id de una etapa de ../ROADMAP-1.0.md, si aplica
tomado_por:           # mac | (vacío si nadie)
rama:                 # obligatoria si en-curso
desde:                # AAAA-MM-DD
viejo_id:             # id del TABLERO viejo, si viene de ahí
motivo:               # obligatorio si descartada o pregunta
---

## Qué y por qué
Una o dos frases: qué ve el jugador y qué problema resuelve.

## Alcance
- Toca: archivos o carpetas permitidos.
- No toca: lo compartido (main.ts, render.ts, balance.json…) salvo que el encargo lo diga.

## Cómo verificar
- `npm run verificar -- --nivel tanda` + lo propio (sim N semillas, shots --only X, e2e, captura medida).

## Notas
Decisiones tomadas, enlaces al informe o a la crítica de origen.
