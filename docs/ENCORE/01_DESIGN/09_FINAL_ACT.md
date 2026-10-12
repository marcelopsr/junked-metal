# FINAL ACT — Boss oculto, arena adaptable, victoria definitiva

## Regla aprobada

El Director selecciona **un boss existente y compatible del modo Survivor** al comenzar la run; su `bossId` queda fijo e invisible. Solo aparecen pistas opcionales hasta llegar al FINAL ACT. Al completar ≥4 mapas del ciclo, el equipo puede votar ENCORE! o FINAL ACT. La victoria ante el boss **termina la expedición**.

## Catálogo y compatibilidad [POR AUDITAR]

No inventar nombres de jefes existentes. Para cada boss real, registrar:

- Dimensiones y volumen de colisión, desplazamiento 2.5D/3D y restricciones de cámara.
- Tipos de ataque, rango, velocidad, áreas, proyectiles, hazards, fase(s), invocaciones.
- Mínimo viable para 1/2/3/4 jugadores y movilidad solo/coop.
- Ciclos de animación/audio/VFX, condiciones de inicio y muerte.
- Dependencias ocultas del modo Survivor; desacoplarlas cuidadosamente.
- Afinidad para variantes de arena y telegraph legible en split-screen.

Solo bosses con `compatible:true` entran al pool. **Si no hay ninguno, el desarrollo debe bloquear habilitación de FINAL ACT y reportar contenido pendiente, no seleccionar un ID falso.**

## Selección al inicio

`bossId = rng.boss.choice(compatibleBossesForRun)`. Guardar hash/pool versionado en estado autoritativo; impedir que un cliente altere el boss o fuerce reroll. La identidad persiste tras rejoin, save y host migration. El Director puede sembrar pistas de ese jefe en señales, eventos y secretos.

## Pistas con intención

- `VAGUE`: símbolos o sonidos temáticos sin identificarlo.
- `MECHANICAL`: evidencia de un ataque/amenaza concreta.
- `CONFIRMING`: imagen incompleta, log o patrón reconocible.
- `CONTRACT`: pista a cambio de riesgo conocido.

Un sistema de pistas debe evitar contradicciones; no confundir misterio dramático con dar pistas imposibles. Las pistas pueden ser públicas, personales u obtenidas por exploración; los descubrimientos relevantes pueden añadirse al códice de run.

## Manipular el espectáculo

Los jugadores pueden encontrar secretos que alteren **las condiciones de la arena**, nunca la identidad del boss. Ejemplos **[PROPUESTA]**: sabotear una torreta ambiental, abrir un punto de cobertura, desactivar una trampa, habilitar plataforma de escape, mejorar telegraph de un ataque. Cada efecto se valida por boss y arena para evitar que se elimine todo el desafío.

Estado: `finalArenaModifiers[]`, con `sourceSecretId`, `appliesToBossTags`, `effect` y `stackCap`. Mostrar resumen de sabotajes disponibles en preparación de FINAL ACT.

## Arena exclusiva

Un único escenario de calidad alta, diseñado con sockets de hazards/cover y variantes por boss. Orientado a readability para 1–4 cámaras, plataformas y restricciones de navegación. No crear una arena distinta para cada boss salvo que auditoría pruebe necesidad. Comprobación de spawn seguro, telegraph y vfx budgets.

## Escalado [POR BALANCEAR]

El boss escala con tiempo, loop y participantes activos, pero priorizar patrones/alternancias sobre HP absurdo. Adaptación suave ante desconexión, sin reducir instantáneamente al boss a vida menor que la actual sin una regla clara. Los bosses del modo base **no deben alterarse globalmente**; ENCORE usa adaptadores/configuración propios.

## Estados de FIN

`VOTE_LOCKED → ENTER_ARENA → INTRO → ACTIVE → BOSS_DEAD → REWARD_COMMIT → RUN_REPORT → CLOSED`.

`ACTIVE → TEAM_WIPE → RUN_REPORT → CLOSED`. No existe `BOSS_DEAD → NEXT_LOOP`. Si uno o más compañeros mueren durante el boss, no hay siguiente etapa para resucitar; los demás pueden seguir hasta victoria o wipe.

## Informe postrun

Duración, loops, mapas, jefe, secretos, apuestas, objetos relevantes, rescates, daño, contribución individual sin humillación, récords, meta desbloqueada y comentario contextual del Director. Guardar once con idempotencia; no permitir cobrar recompensa dos veces tras refresh.

## Pruebas obligatorias

Un boss elegido nunca cambia tras suspender; arena soporta jugadores extremos; sabotaje no rompe la IA; victory cierra sesión; cliente no puede elegir boss arbitrariamente; final reward se adjudica solo una vez; el Director reacciona sin bloquear input/skip.
