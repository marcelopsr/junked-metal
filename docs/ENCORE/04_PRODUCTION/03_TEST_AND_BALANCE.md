# Estrategia de QA, balance y simulación

## Estratos de prueba

1. **Unitarias:** curvas, caps, transacciones, votos, boss pool, RNG, timers.
2. **Integración:** RunState + escena + Director + portal + reward + save.
3. **Simulación headless:** miles de runs/steps sin render, seeds extremas.
4. **Visual/humana:** 1–4 viewports, lectura, feedback, ritmo, humor.
5. **Red/caos:** latencia, desconexión, host perdido, relays, móviles.
6. **Compatibilidad/regresión:** modos actuales Survivor/Match-3/carreras/demolición.

## Suite de escenarios

| Caso | Estado | Resultado esperado |
|---|---|---|
| QA-001 | 1 player, seed fija | mismas rutas/boss con mismo input |
| QA-002 | Tiempo suspendido | timer activo no avanza |
| QA-003 | 4 players XP equipo | todos reciben crédito sin importar killing blow |
| QA-004 | 4 players level up | cada uno decide sin pausar otros |
| QA-005 | Pago cofre concurrente | una compra o dos válidas, nunca saldo negativo |
| QA-006 | Teleporter ready 3/4 | no inicia |
| QA-007 | Rejoin durante ready | reconcilia ready sin suplantar otro participante |
| QA-008 | Teleport event anunciado | coincide con evento iniciado |
| QA-009 | 4th stage | aparece voto ENCORE!/FINAL ACT |
| QA-010 | Final vote empate | repite poll, no avanza |
| QA-011 | Boss secret bossId | mismo tras 2 loops/host migrate |
| QA-012 | Arena sabotaje | cambia hazard, no boss |
| QA-013 | Boss defeat | run se cierra, no más loops |
| QA-014 | Full wipe | run se cierra y adjudica reporte una vez |
| QA-015 | Downed → revive | jugador vuelve sin item dupes |
| QA-016 | Downed timeout | retorna próxima etapa, no durante FINAL ACT |
| QA-017 | Tentación privada | solo destinatario ve oferta |
| QA-018 | Pacto impacto serio | no ejecuta sin voto válido |
| QA-019 | Revelación teatral | evento basado en hecho registrado |
| QA-020 | Vecino de mapa secreto solo | puzzle siempre solucionable |
| QA-021 | Simulación proc masiva | no cascada sin límite |
| QA-022 | Host se pierde durante compra | no duplicar ni borrar transacción |
| QA-023 | Host se pierde durante boss | estado coherente, no doble boss/recompensa |
| QA-024 | 2 local + 2 online | input/cámaras sin cross-talk |
| QA-025 | Teléfono VIEWER | cero permisos de gameplay |
| QA-026 | QR caducado/reusado | acceso denegado |
| QA-027 | 2 displays + TV | UI/sonido no invaden cámara privada |
| QA-028 | Jugador nuevo en combate | join rechazado; entre etapas permitido |
| QA-029 | Jugador desconectado | plaza/items reservados |
| QA-030 | 1→4 players | Director adapta suavemente, no escala instantánea injusta |
| QA-031 | Stage layout 1000 seeds | todas rutas y portales accesibles |
| QA-032 | Slow client/drop frames | simulación consistente, VFX degradables |
| QA-033 | Director silencio | cues respetan cooldown/priority |
| QA-034 | UI accesible | texto legible en 1/4 pantalla y contraste |
| QA-035 | Replay de rewardTxn | se concede una vez |

## Parámetros iniciales de balance [PROPUESTA]

- **Tamaño de ciclo:** mínimo 4 etapas (confirmado).
- **Duración inicial objetivo:** 40–60 min (confirmado), promedio 10–15 por etapa como punto de partida (no mínimo).
- **Rescate:** ventana y canalización sujetas a playtest.
- **Director:** budgets y frecuencia por fase ajustables en config externa.
- **Proc:** límite de profundidad, activaciones y presupuesto VFX por tick.
- **Inflación:** precio con techo legible, no aplicable a todos los comercios.

## Métricas de balance

Mediana/p90 de tiempo a primer portal, etapas completadas, duración hasta primera oportunidad FINAL ACT, % runs que eligen ENCORE!, tiempo de etapa perdido buscando portal, tasa de victoria por loop y party size, frecuencia de rescates, diversidad de builds, objetos ignorados, pactos aceptados/rechazados, lag p95, caídas FPS por efecto y churn de sesiones móviles.

## Criterio de éxito lúdico

En pruebas moderadas: jugadores entienden opción de avanzar vs quedarse, no sienten que cada pico es azar injusto, recuerdan al menos un diálogo memorable del Director, el botín y puzzles valen el desvío, disfrutan el cooperativo incluso si alguien juega soporte. No fijar metas numéricas de satisfacción sin investigación de playtests.
