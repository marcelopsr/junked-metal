# Combate, personajes y cooperación

## Base [POR AUDITAR]

Reutilizar controles, armas, clases, vehículos, enemigos, colisiones y HUD del Survivor existente cuando sea correcto. No suponer clases, tipos de arma ni cámara actuales. A partir de ellos, permitir estilos propios, especiales y sinergias sin romper Survivor.

## Cuatro plazas, participantes independientes

Una plaza representa **un jugador**, no una conexión de red o un dispositivo. Un host puede tener dos jugadores locales, un remoto uno y otro remoto uno: total 4. Cada jugador tiene `participantId`, inventario, build, subestado y asignación de input/cámara. La economía global y el mapa no se replican por pantalla.

## XP y evolución

Enemigos derrotados por cualquier participante otorgan XP global al equipo; al cruzar umbral, cada jugador activo recibe crédito de elección propio. **Tres opciones** por nivel, rerolls limitados, canje aplazable sin detener el combate. El sistema explica sinergias, pero no garantiza una build. Un mismo jugador puede tener varias elecciones pendientes. Definir cuándo obtiene niveles un participante caído o incorporado entre mapas [PROPUESTA], sin duplicar selección.

## Combos cruzados

Un efecto aplica `statusTag` a enemigos (ej. `BURNING`, `FROZEN`, `CHARGED`); otro efecto puede reaccionar sobre ese estado sin importar cuál participante lo aplicó. Los efectos también deben combinarse por un solo jugador con build apropiada. Las reacciones llevan `procDepth`, `owner`, `tickBudget` y límite de activaciones para evitar infinitos. No asumir que fuego/hielo/electricidad ya existen en el juego: los nombres son ejemplos de diseño.

## Sin fuego amigo

Daño proveniente de ataques de jugador a aliados = 0 en reglas normales. Peligros ambientales independientes dañan según su propia configuración. Pactos no podrán introducir daño PvP irreversible sin consentimiento explícito, y el diseño confirmado no requiere fuego amigo.

## Caída, rescate, eliminación

`ALIVE → DOWNED(timer) → REVIVED` por interacción canalizada de un compañero o `ELIMINATED_UNTIL_NEXT_STAGE` al vencer timeout. El reviver está expuesto y debe poder abortar. Si todos caen/eliminados: `TEAM_WIPE`. Duración, alcance y si se puede mover caído son [POR BALANCEAR]. El Director puede bromear, pero no crear instantáneamente una ejecución sin contrajuego.

Regla sugerida para grupos: un eliminado temporal observa aliados, conserva inventario y revive con condiciones seguras al entrar a siguiente etapa. Durante boss final no existe «siguiente etapa»: el equipo debe triunfar con supervivientes restantes o perder.

## Jugador que entra tarde

Solo entre etapas, hasta máximo cuatro. Recibe **Kit de bienvenida del Director** configurado a `stageOrdinal, loopIndex, teamProgressionBand`, con objeto(s) y elecciones/XP equivalentes que eviten quedar inútil. No dar mejor equipamiento promedio que quien estuvo desde el comienzo sin coste o razón. El Director lo presenta.

## Desconexión vs abandono

`DISCONNECTED_RESERVED`: plaza/equipo reservado y posibilidad de rejoin en cualquier momento seguro. `LEFT_PERMANENT`: opcionalmente transferir parte de recursos de forma explícita, atómica y auditable; luego libera plaza para ingreso entre etapas. Ni muerte ni desconexión deben regalar objetos duplicados. Escalado del Director ajusta cantidad **activa**, con histeresis para evitar bajar/subir amenazas continuamente.

## Cooperativo local y remoto

Split-screen configurable 2P y 3–4P, cámara compartida opcional donde técnicamente resulte jugable. Cada viewport tiene HUD, subtítulos y selector propio; el input no se filtra al jugador de al lado. En remoto, cada cliente tiene sus propios viewports locales. Con streaming a teléfono, la cámara es propiedad de participantId; emparejar un mando/visor no crea plaza nueva.

## Regla social

No ofrecer beneficios solo al daño causado. Soporte, exploración, descubiertos, pings, rescates y pactos grupales son contribuciones válidas. Informes de fin de run deberían mostrar diferentes formas de colaborar sin ranking humillante o acoso.
