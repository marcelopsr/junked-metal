---
titulo:               # corto, lo que ve el usuario
estado: idea          # idea | pregunta | elegida | en-curso | en-lote | hecha | descartada
portal: sede          # sede | jugador | central | plataforma
prioridad: media      # alta | media | baja
etapa:                # id de una etapa del roadmap
origen: pendiente     # facturita | brecha | pendiente | decision
tomado_por:           # mac | pc2 | (vacío si nadie)
rama:                 # obligatoria si en-curso
desde:                # AAAA-MM-DD
ficha:                # ../modulos/<modulo>.md
brecha:               # ítem de BRECHA-100, si aplica
motivo:               # obligatorio si descartada o pregunta
---

## Qué y por qué
Una o dos frases: qué ve el usuario y qué problema resuelve.

## Alcance
- Toca: carpetas permitidas.
- No toca: navegacion/, flotante/, server.ts, package.json raíz (o lo que corresponda).

## Cómo verificar
- npm run verificar + el test del módulo.
- Capturas 412 y 1366 de <rutas>, con <cuenta>.
- Toques: <tarea> ≤ 3.

## Notas
Decisiones tomadas, enlaces a la crítica o al informe del agente.
