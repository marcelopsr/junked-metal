# Diseño del mundo, Luna, rutas y proceduralidad

## Objetivo artístico

Los escenarios son lugares memorables, no salas clonadas. Usar **autoría manual de macroestructura** (silueta, composición, landmarks, navegación primaria, ritmo de zonas) y **variación procedural de microestructura** (elementos, rutas secundarias, botín, eventos, obstáculos, secretos, portal). Estética Retro-Industrial Folded 2.5D sin confundir «plegado» con papel literal. Los modelos completos deben tolerar las cámaras del juego y el cooperativo local.

## Luna — primera etapa obligatoria

**[POR AUDITAR]** El mapa lunar existente es un punto de partida, no se conocen sus dimensiones, colisiones, assets ni topología. Antes de editarlo: inventariar spawn points, navmesh/pathfinding, hazards, lighting, cámara, rendimiento y posibilidad de acceso a 4 jugadores. **[PROPUESTA]** narrativamente, la Luna es el plató de apertura donde los jugadores reciben su primer contacto con el Director.

## Contrato de un mapa

Cada `StageDefinition` necesita:

- `id`, `theme`, `minimumLoop`, `navigationBounds`, `primaryRoute`, `spawnAnchors`.
- `landmarks`: orientan y hacen memorable el lugar.
- `teleporterZones`: posiciones aptas para todos los eventos que puedan ocurrir.
- `secondaryPathSockets`, `shops`, `chests`, `machines`, `contractTerminals`, `secretAnchors`.
- `enemyPools`, `eventPools`, `ambientHazards`, `audioZones`, `directorScreenSockets`.
- `coopTraversalAlternatives`: camino equivalente en solitario y pantallas divididas.
- `performanceLodProfile` y cobertura de pruebas de cámara.

## Construcción procedural segura

1. Seleccionar variante macro validada de mapa (`stageVersion` + `runSeed`).
2. Reservar ruta crítica y un trayecto accesible de spawn → teleportador.
3. Aplicar variación de rutas secundarias/obstáculos compatibles.
4. Colocar puntos de interés con distancia mínima/áreas de exclusión.
5. Asignar secretos/pistas mediante RNG separado.
6. Elegir teleporter zone apta para evento y tamaño del grupo.
7. Validar navegación de todos los personajes/vehículos disponibles.
8. Registrar `layoutHash` y publicar al host/peers.

Si la variante falla validación, **fallback** a una variante prevalidada. No regenerar infinitamente ni permitir bloquear la partida.

## Rutas ramificadas

`StageGraph` contiene nodos y aristas con restricciones de ciclo y secretos. El equipo vota el próximo destino entre candidatos válidos. No asumir nombres de mapas que no fueron encontrados en el repositorio; usar `stage_id` y visualización de ejemplo en mapas semilla. En loops avanzados desbloquear nuevos nodos y alterar el orden posible; no repetir forzosamente la Luna.

## Cambios del Director

El Director presenta la reorganización como un cambio de escenografía. **Solo modificar estructura mientras no haya ocupantes en la zona o durante transición**; mantener checks de colisión. Cambios en vivo pueden limitarse a luces, pantallas, hazards señalizados y puertas preautorizadas, nunca terreno que desaparece bajo los pies sin telegraph.

## Secretos y puzzles

Tres niveles: `DISCOVERY` (pista/objeto), `ACTION` (puzzle/evento) y `PAYOFF` (información, objeto, o alteración del FINAL ACT). Los secretos de co-op pueden requerir coordinación, pero **siempre debe existir solución para solo** (activar secuencia de interruptores, eco temporal, dron/equipo existente, temporizador accesible). Registrar hallazgo persistente sin convertir el modo en una búsqueda obligatoria de lore.

## Teleportador localizable

Señales redundantes: partículas/luz o radio/silbido y pistas de terminal. Mapa se descubre caminando; ping del descubridor es global. **Ayuda adaptativa** después de búsquedas largas (por tiempo de etapa o recorrido sin progreso) y mapa de aproximación; no agregar señuelos falsos que hagan injusta la búsqueda. La ubicación debe cambiar por semilla, pero siempre en zonas válidas.

## Calidad exigida

- Ruta crítica 100% navegable en todas las seeds de prueba.
- Cero spawns fuera de mapa, cofres dentro de geometría o terminales inalcanzables.
- Jugar con zoom/cámara de 1, 2 y 4 cámaras y con táctil.
- Indicadores de navegación comprensibles también sin sonido y con daltonismo.
- La variante procedural nunca debe superar el presupuesto de draw calls/partículas del nivel.
- La ruta elegida es la misma para todos los peers.
