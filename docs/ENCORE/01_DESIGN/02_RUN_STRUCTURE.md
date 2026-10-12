# Runs, temporizadores, loops y decisiones irreversibles

## Estructura aprobada

- Primera etapa de cada nueva expedición: **la Luna**.
- Cada ciclo tiene **al menos cuatro etapas superadas**, sin imponer orden fijo fuera del inicio lunar.
- La primera oportunidad de FINAL ACT ocurre al superar el umbral del ciclo 1.
- Después de cada ciclo, el equipo vota entre **ENCORE!** y **FINAL ACT**.
- El reloj global **no se reinicia** durante loops; el reloj de etapa sí reinicia al entrar a otro mapa.
- FINAL ACT es salida de una sola dirección; derrotar al boss concluye la run.

## Relojes: definiciones no ambiguas

| Reloj | Alcance | Avance | Uso |
|---|---|---|---|
| `runElapsedActiveMs` | Toda la run | Mientras el estado es jugable, sin pausas ni cargas | Curva de amenaza, records, informe |
| `stageElapsedActiveMs` | Etapa actual | Desde entrar a etapa jugable | Eventos/permanencia, pistas, desafío local |
| `directorPressure` | Estado derivado | Según tiempo, loop, pactos y desempeño con límites | Presupuesto y señales del Director |

**[PROPUESTA]** El escalado durante la arena final puede congelar nuevas reglas ambientales tras comenzar el enfrentamiento para no sorprender injustamente, pero el reloj global continúa para estadísticas. Se calibra en balance.

## Transiciones

- **Explorar**: spawn controlado + recursos + ruta/secretos.
- **Descubrir**: ubicación del portal se revela por proximidad o ayudas progresivas.
- **Proponer ready**: cualquier jugador solicita; UI muestra 1–4 estados.
- **Confirmar**: todos los jugadores activos deben estar listos para comenzar el evento; un jugador caído recibe flujo de confirmación de espectador cuando corresponda.
- **Resolver evento**: un desafío anunciado, condicionado por mapa y loop.
- **Ruta**: voto destino, solo destinos válidos y conectados.
- **Cierre de ciclo**: voto ENCORE! / FINAL ACT por mayoría; empate implica repetir; no contar abstenciones como aprobaciones silenciosas por defecto.

**Caso límite — jugador AFK [PROPUESTA]**: la sala puede iniciar una verificación de inactividad con aviso; tras un tiempo configurable puede marcarse como desconectado para el ready solo si la autoridad confirma que no participa; no convertir el ready en un veto perpetuo. No saltar sin aviso a alguien activo que está explorando.

## Selección de mapas

`nextCandidateStages = worldGraph.filter(unlocked && biomeRules && loopRequirements && recentRepeatPenalty)`. Cada voto muestra destino, riesgo estimado y tipo general de botín, sin revelar secretos. Empates: repetir, desempate consensuado o desempate determinista transparente [PROPUESTA]; nunca forzar boss por accidente.

## Ciclos evolutivos

- Loop 1: reglas iniciales, cuatro mapas mínimos.
- Loop 2+: nuevas familias/modificadores y rutas; enemigos con mayor variedad y no solo HP.
- Loop 3+: posibilidad de rutas raras/secretos persistentes, sujeto a contenido implementado.
- Si el catálogo no contiene destinos nuevos, combinar variantes válidas de los mapas existentes con reglas reproducibles.

**Evitar** que el loop avance por simplemente cargar un mapa o por reconnect: solo el comando autoritativo `completeStage` cuenta.

## Dificultad temporal [POR BALANCEAR]

Propuesta para pruebas, no escala final:

`threatRaw = baseStageThreat * (1 + 0.02 * minutesActive) * pow(1.11, completedStages) * pow(1.12, completedLoops)`.

No usar un único multiplicador para HP, daño y frecuencia: la salida `threatRaw` alimenta límites independientes (spawnBudget, eliteTiers, encounterMix, frequency). Para loops muy largos, usar curvas amortiguadas, techos y progreso por nuevas variantes, no exponenciales sin control.

## Semillas y reproducibilidad

- `runSeed` se fija en inicio; `stageSeed = hash(runSeed, stageOrdinal, chosenStageId, loopIndex)`.
- RNG distintos para `routes`, `loot`, `encounters`, `secrets`, `boss`, `pacts` y `directorQuips`.
- Nunca permitir que reproducir una voz o animación consuma RNG de gameplay.
- Solo autoridad toma decisiones aleatorias de juego; clientes reproducen eventos confirmados.
- Guardar versionado de reglas y pool de contenido para reproducir una run del build correspondiente.

## Desconexión y reloj

Si el host migra, reconstruir relojes desde tiempo activo acumulado **registrado autoritativamente**, no del reloj de pared de cada cliente. Al suspender toda la expedición, congelar tiempo activo y dejar marcas de fecha solamente para administración. Evitar que recargar la página reduzca minutos de dificultad.

## Criterios de aceptación

1. Dos partidas con misma semilla y mismo orden de acciones producen mismo grafo y boss; el ritmo de diálogos no modifica el loot.
2. El tiempo activo no avanza en pausa/suspensión/carga y no retrocede tras host migration.
3. El loop aumenta solo después de cuatro etapas completadas o del umbral configurable aprobado.
4. Vencer boss cierra run y bloquea el portal ENCORE!.
5. Si hay empate para FINAL ACT, la partida no avanza hasta resolver el voto.
