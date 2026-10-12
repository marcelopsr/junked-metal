# Playbook del primer prototipo: «Que duela quedarse»

## Hipótesis

Si el jugador puede mejorar explorando pero el tiempo empeora los encuentros, la elección de activar el portal o buscar otro objeto se vuelve memorable. Este prototipo existe para medir esa sensación **antes** de construir todo el espectacular lore.

## Run de papel (5 minutos)

Dibujar mapa lunar con 3 sectores, 2 cofres y portal oculto en una de 3 ubicaciones válidas. Cada minuto sube un nivel de amenaza. El jugador obtiene chatarra por enemigos y puede gastar 100 en cofre. Si activa portal, tiene un evento de defensa; si se queda, puede conseguir otro cofre antes de que aparezca un élite. Registrar decisiones y emociones, no solo tiempos.

## Vertical slice digital (solo, sin feature fake)

1. Inicia desde menú ENCORE sin romper Survivor.
2. Usa controlador y cámara reales del juego.
3. Luna con spawn seguro, 1 cofre, 1 pista de portal, 1 evento de carga.
4. HUD pequeño: run time, stage time (segundo nivel), amenaza y XP.
5. Director pronuncia 3 líneas contextuales y guarda 1 memoria entre runs.
6. Al resolver portal, transición segura a una segunda escena o *test room* explícita.
7. Guardar y reanudar checkpoint con boss secreto placeholder válido **solo si hay boss auditado**; no fingir final jugable.

## Primer playtest con 3 preguntas

- ¿En qué momento quisiste irte del mapa, y por qué?
- ¿Qué recompensa te hizo cambiar de idea?
- ¿Sentiste que el Director jugaba contigo de forma emocionante o injusta?

## Observables

Necesidad de abrir 2+ cofres, tiempo promedio al encontrar portal, proporción que lo activa de inmediato vs sigue explorando, confusiones de HUD, claridad de telegraph, FPS y episodios de sobrecarga cognitiva.

## Fracaso constructivo

Si quedarse nunca compensa, revisar valor de loot y curva. Si todo el mundo espera siempre hasta agotar recursos, revisar riesgos/opciones de salida. Si el portal se percibe como misión de búsqueda aburrida, adelantar pistas. Si el Director interrumpe, reducir duración/cooldown.
