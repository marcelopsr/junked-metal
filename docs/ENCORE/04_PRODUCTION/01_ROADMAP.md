# Roadmap incremental — de prototipo lunar a ENCORE completo

> El usuario aprobó la **visión completa**. Las fases ordenan la implementación, no eliminan funciones. Los plazos son intencionalmente omitidos: sin auditar el repositorio y el equipo, cualquier estimación sería engañosa.

## R0 — Auditoría y arquitectura verificable (obligatoria)

**Objetivo:** descubrir cómo funciona realmente Junked Metal. Inventariar Survivor, Luna, jefes, armas, mapa/cámara, render, input, network, guardados, arte y test tooling. Crear ADR de stack, dependencias y estrategia de reutilización. **Entregables:** informe de código con rutas reales, matriz de reutilización `use / adapt / rebuild`, snapshot de baseline, pruebas de no regresión y backlog revisado. **Gate:** ningún servicio nuevo propuesto ignora equivalentes existentes. **Riesgo:** arquitectura de red incompatible con stack actual.

## R1 — Núcleo de run y primera Luna jugable

Crear `RunState` versionado, stage loader, tiempo activo global/local, primera capa de Director con presupuesto, XP/chatarra, mini UI y teleportador localizable. Un evento del portal, un cofre, tres mejoras por nivel, un jugador. **Gate:** sesión reproducible por seed, explorar/avanzar sin softlock, combate heredado Survivor intacto.

## R2 — Mundo de cuatro etapas y loop mínimo

Añadir grafo de rutas, cuatro etapas válidas (pueden reutilizar variantes hasta crear contenido suficiente), elección de destino, checkpoint entre escenas, continución ENCORE!, escalado por tiempo/ciclo. **Gate:** run puede completar cuatro mapas, iniciar segundo loop, persistir loot y tiempo, y no repetir siempre ruta fija.

## R3 — Director narrativo y eventos variables

Implementar pacing + mood separados, telegraphs, eventos de teleportador `OVERLOAD`, `BOSS_GUEST` y otro candidato validado, cola de diálogos, subtítulos, TV/terminales, memoria narrativa básica y pactos rápidos. **Gate:** Director reacciona a eventos reales, no spamea, no transgrede presupuesto. **Contenido avanzado** como GRAN SHOW se programa en fase posterior.

## R4 — Objetos, sinergias y decisiones estratégicas

Cofres, tiendas, máquinas de opciones, reciclaje, stacking, efectos por tags, proc cap, evoluciones por receta, meta códice y precios dinámicos. **Gate:** dos builds diferentes viables, una sinergia cruzada simulada incluso en solitario; 30+ min sin caída de FPS por efectos encadenados. Cantidades concretas dependen de contenido existente.

## R5 — FINAL ACT completo

Auditar bosses de Survivor, crear compatibilidad por adapter, sortear `bossId` fijo desde run start, pistas/secretos, arena exclusiva, modificadores por sabotaje, vote ENCORE!/FINAL ACT y run report de victoria/derrota. **Gate:** varios bosses compatibles (si existen), tras ganar no se puede seguir loopeando, secretos modifican solo arena.

## R6 — Cooperativo online 1–4 como capacidad central

No empezar networking aquí **desde cero**: la arquitectura de R0–R5 ya debe modelar participant IDs, autoridad y determinismo de decisiones; aquí se materializa el multijugador real. Host authoritative, 2→4 peers, XP grupal, scrap compartida, items individuales, votos, caídas/rescates, rejoin, kit de bienvenida entre mapas. **Gate:** 4 jugadores terminan run y vuelven sin desincronización grave ni duplicación.

## R7 — Local, mixto y MultiScreen básico

Input router, 2–4 cámaras, cámara compartida opcional, GUI de viewports, remapeo, pruebas 2 jugadores locales + remotos. Ventana extra y salida a TV con fallback. **Gate:** inputs aislados, HUD y subtítulos legibles por viewport, simulación jugable con objetivos de rendimiento.

## R8 — Móviles como segunda pantalla y mando

Pairing por QR/código temporal, autorización anfitrión, roles `VIEWER/CONTROLLER/FULL_PLAYER`, streaming WebRTC y calidad adaptativa, Touch UI. **Gate:** móvil puede recibir cámara, funcionar como mando y combinar ambos; dispositivo adicional no consume plaza. Sin compatibilidad de navegador verificada, dejar fallback y no prometer casting universal.

## R9 — Migración de host y suspensión robusta

Snapshots versionados, réplicas seguras, epoch/election, recovery, guardados al completar mapa, suspensión y reanudación, join-in-progress solo en transición, antidupe. **Gate:** caos de desconexión con host perdido, estado económico íntegro, continuidad con pausa breve o recovery explícito y sin doble autoridad.

## R10 — Profundización creativa y publicación

Pactos `STAGE/RUN`, tentaciones secretas y revelaciones, todos los eventos, loops visualmente evolutivos, secretos solo/co-op, música/VFX/audio final, localización, accesibilidad, guías, manual de QA, balance con telemetría, pruebas de carga/compatibilidad. **Gate:** juego estable, historia coherente, socialmente divertido, accesible y sin funciones de UX falsas.

## Secuencia paralela sugerida

- **Track Gameplay:** R1→R5.
- **Track Network:** investigación R0, prototipo de autoridad R1, implementación creciente R6→R9.
- **Track Art/Audio:** dirección desde R0, slices R1/R3, producción fuerte R10.
- **Track Content:** catálogos/validadores desde R1, iteración hasta R10.
- **Track QA:** pruebas desde R0, bots de caos desde R6.

## Puertas de calidad transversales

1. No regresión Survivor/otros modos.
2. Juego reproducible con seed y versión de contenido.
3. Estabilidad de inventario/economía/snapshots.
4. FPS y latencia medidos en hardware objetivo [POR DEFINIR].
5. UI con teclado/gamepad/touch y split-screen.
6. Accesibilidad (sin dependencia de color/sonido).
7. Narrativa no interrumpe momentos críticos.

## El primer hito que demostraría diversión

Una partida de 20 minutos sobre la Luna en la que dos decisiones se sientan reales: «¿abro otro cofre o activo el portal?» y «¿arriesgo un pacto a cambio de una mejora?». Después, un pequeño loop funcional permite verificar si la tensión escala como queremos.
