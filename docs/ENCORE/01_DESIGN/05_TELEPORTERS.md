# Teleportadores: búsqueda, preparación, evento y viaje

## Principio

El teleportador es **decisión estratégica**, no cronómetro obligatorio ni castigo por explorar. Cualquier jugador puede encontrarlo y proponer activarlo. El equipo debe conocer el tipo de evento y estar listo antes de comenzar.

## Máquina de estados

`HIDDEN → DISCOVERED → PROPOSED → READY_CHECK → EVENT_LOCKED → EVENT_ACTIVE → EVENT_SUCCESS → ROUTE_VOTE → TRANSITION`.

Rutas alternativas: `PROPOSED → CANCELED`, `READY_CHECK → CANCELED`, `EVENT_ACTIVE → RETRY/FAIL` según tipo de evento, `EVENT_ACTIVE → TEAM_WIPE`.

Solo el host/autoritad puede confirmar transiciones; duplicados/late packets tienen idempotency key.

## Listo en cooperativo

- Cualquier jugador propone.
- UI de cuatro plazas con nombre, rol/dispositivo y estados `EXPLORING / READY / DOWNED / DISCONNECTED`.
- Todos los participantes activos confirman `READY`; no activar durante animación crítica/choque de input.
- Desconectado conserva su plaza pero no debe bloquear para siempre; política de inactividad visible [POR DEFINIR].
- Los jugadores pueden cambiar `READY` a `NOT_READY` hasta que el evento quede bloqueado.
- Al iniciar, avisar si la zona se convierte en área de peligro.

## Catálogo de eventos [PROPUESTA]

| Id | Nombre | Objetivo | Señales | Condición de éxito |
|---|---|---|---|---|
| `BOSS_GUEST` | Invitado especial | Derrotar minijefe compatible | Silueta/anuncio + arena mínima | HP boss = 0 |
| `OVERLOAD` | Sobrecarga | Proteger/cargar dispositivo | Barra/círculo, enemigos entrantes | Carga finalizada |
| `DIRECTOR_WHEEL` | Ruleta del Director | Completar una variante previamente anunciada | Opciones acotadas visibles | Objetivo específico |
| `EXTRACTION` | Escape desesperado | Alcanzar una extracción en ventana telegráfica | Ruta señalada | Participantes elegibles extraídos |
| `INTERFERENCE` | Interferencia | Aguantar condiciones especiales | HUD de distorsión controlada | Timer/desafío completado |
| `GRAND_SHOW` | Gran espectáculo | Secuencia multifase | Presentación especial | Fases finalizadas |

Evitar que la ruleta cambie a eventos ocultos más peligrosos después de la confirmación. El anuncio debe mostrar objetivo, peligros clave, duración estimada [si aplica] y recompensas.

## Distribución y escalado

Los eventos se eligen por `availableAtLoop`, bioma, dificultad, compatibilidad y cooldown; no todos deben estar presentes en primera versión. Dificultad de encuentro depende de presupuesto del Director, cantidad de participantes activos y tope de entidades. Una partida solo no se bloquea por una mecánica obligatoriamente cooperativa.

## Éxito, fracaso, muerte

Recompensas de evento pueden aportar a jugadores elegibles por criterios explícitos; sin monopolización. Si el equipo cae por completo: cierre de run. Si algunos quedan eliminados definitivamente, continúan como espectadores hasta la siguiente etapa bajo las reglas de `06_COOP_COMBAT.md`. Las recompensas deben registrarse una sola vez con transaction ID.

## Cierre de etapa

Guardar checkpoint autoritativo después de registrar botín/estado y antes de liberar la siguiente etapa; en caso de crash, el replay debe ser idempotente. Si completa la etapa `#4` del ciclo, abrir voto ENCORE!/FINAL ACT; si no, voto de ruta. Las elecciones de ruta no cambian retroactivamente el evento del portal.

## Criterios de aceptación

- Un segundo cliente no puede iniciar el evento falsificando READY ajeno.
- Dos solicitudes simultáneas no crean dos eventos.
- El evento preanunciado coincide con el ejecutado.
- Cambiar de mapa no duplica loot, chatarra ni XP.
- En host migration, el evento o se restaura de snapshot compatible o vuelve a una transición segura sin duplicar pagos.
