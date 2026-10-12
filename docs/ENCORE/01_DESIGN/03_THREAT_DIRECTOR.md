# THE DIRECTOR — Threat Director y showrunner

## Dos capas: nunca confundirlas

**Entidad dramática**: un presentador siniestro cuya identidad permanece secreta. Recuerda, comenta y propone acuerdos. **Servicio determinista de gameplay**: selecciona y calendariza encuentros válidos con un presupuesto de amenaza y límites explícitos. El jugador puede creer que la entidad es todopoderosa; el juego no debe ser arbitrario.

## Inputs

`runActiveTime, stageActiveTime, loopIndex, stageOrdinal, activePlayerCount, teamPowerEstimate, pactModifiers, directorMood, pacingPhase, biome, encounterHistory, environment, performanceBudget`.

`teamPowerEstimate` no es excusa para anular objetos: solo ayuda a evitar eventos claramente triviales o imposibles dentro de bandas. No escalar instantáneamente al adquirir cada ítem poderoso.

## Outputs

- `spawnBudget` máximo por ventana.
- `enemyComposition` filtrada por biome/coste/capacidad.
- `eliteChanceBand`, no porcentaje arbitrario sin anuncio.
- `eventCandidateSet` con cooldown y techo de amenazas simultáneas.
- `telegraph` audiovisual con anticipación suficiente.
- `directorReactionEvent` de diálogo opcional desacoplado del motor de combate.

## Pacing: máquina de estados

| Fase | Objetivo | Reglas de referencia |
|---|---|---|
| `EXPLORE` | Dar espacio a orientarse y buscar recursos | Enemigos dispersos, eventos raros |
| `TENSION` | Construir expectativa | Aumentar apariciones y composición |
| `CHAOS` | Pico memorable | Enemigos especiales, altos costes, duración acotada |
| `BREATHER` | Reorganizar y ayudar caídos | Reducir spawns nuevos, no sanar gratis |
| `CLIMAX` | Evento de teleportador/final | Encuentro autoritativo específico, reglas del evento |

Transiciones condicionadas por señales observables: duración mínima de fase, actividad/amenaza real, cooldown entre picos, estado de jefes, etc. En `BREATHER` la amenaza global continúa escalando; solo se reduce temporalmente el gasto del Director.

## Estado de ánimo: variable independiente

| Mood | Consecuencias narrativas | Sesgo de selección permitido |
|---|---|---|
| `ENTERTAINED` | Bravatas y felicitaciones sarcásticas | Eventos variados de espectáculo |
| `BORED` | Quejas teatrales | Candidatos sorprendentes pero telegráficos |
| `IMPRESSED` | Elogios hostiles | Desafíos opcionales con recompensa superior |
| `FRUSTRATED` | Irritación, fallos en la máscara | Composiciones diferentes, sin sobrepasar presupuesto |
| `OBSESSED` | Mensajes personales, interferencia | Pistas/anomalías, no ataques injustos al jugador |

El mood puede derivarse de **tendencias** (rescate, pactos, tiempo, builds, loops) con *hysteresis* para no oscilar cada segundo. Guardar motivo de cada transición para telemetría.

## Algoritmo conceptual

```text
onDirectorTick(confirmedState):
  if not state.playable: return
  score = computeThreatCurve(activeTime, completedStages, loops)
  phase = choosePacingPhase(score, encounterPressure, phaseCooldowns)
  budget = clamp(score * phaseModifier * partyScale, minBudget, perfCap)
  candidates = encounterCatalog.filter(map, loop, capability, safety)
  event = weightedChoice(candidates, runScopedRng.encounters, recentHistory)
  if event.cost <= budget && spawnCapsAllow(event) && warningCanBeShown:
       authority.commit(event, reason, price, telegraph)
  narrativeQueue.maybeEnqueue(contextualReaction, cooldown, priority)
```

**No ejecutar `weightedChoice` independientemente en cada cliente.** El host decide y los peers aplican el evento.

## Fairness: reglas inviolables

1. No enemigos invulnerables sin telegraph/contrajuego.
2. No spawns inevitables encima del jugador; áreas de exclusión y rutas seguras válidas.
3. Limitar eventos simultáneos, proyectiles, partículas, entidades y proc chains.
4. Durante downed/revive, no activar arbitrariamente un evento que impida todo rescate.
5. Las ofertas de pactos muestran coste y ventana de aceptación; el Director puede mentir en diálogos, **no en la UI contractual**.
6. No castigar en silencio a quienes tengan mejores builds ni inducir espirales de derrota irreversibles.
7. Añadir telegraph visible y accesible, no depender solo de audio o color.

## Límite de rendimiento [PROPUESTA]

Presupuestos separados para simulación, spawn, partículas, audio y rayos/colisiones. Si FPS/latencia caen, reducir densidad cosmética primero, luego frecuencia de encuentro nuevo dentro de límites de justicia; **no acelerar en un equipo potente para crear ventaja competitiva en progresión persistente**. No usar FPS del cliente como fuente autoritativa de dificultad.

## Director como memoria

Solo el *narrative projection service* consulta historial persistente; ninguna frase altera presupuesto. El Director puede recordar `win_count`, `loss_vs_boss`, `longest_loop`, `rescues`, `pacts_accepted`, `secrets_discovered`. Evitar etiquetar a una persona de «traidor» por inferencias; comentar hechos concretos almacenados.

## Herramientas de desarrollador [PROPUESTA]

Overlay opcional: `time | threat | phase | mood | budget remaining | spawn caps | queued events | last reason | RNG stream`. Controles de QA: fijar seed, simular loops 1/3/8, ajustar tamaño de party, abrir log estructurado y exportar replay de decisiones. El overlay no debe aparecer en builds finales.

## Test de aceptación mínimo

1000 simulaciones de decisión sin render: ningún spawn inválido, presupuesto siempre no negativo, candidatos nunca fuera del pool, mood no oscila excesivamente, breather después de picos según config y todas las amenazas altas vienen con aviso. Playtest humano verifica tensión frente a frustración; las simulaciones no sustituyen sensación de juego.
