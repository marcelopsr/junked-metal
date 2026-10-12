# Biblia del Director — «El público no está donde creés»

## Identidad en escena

**Nombre diegético:** EL DIRECTOR. **Rol mecánico:** Threat Director, emisor de pactos y narrador contextual. **Rol dramático:** maestro de ceremonias de un espectáculo de supervivencia; enemigo indirecto, provocador, impredecible en actitud pero justo en las reglas explícitas del juego. **Verdadera naturaleza:** deliberadamente no definida en esta etapa.

> «¡LU-CES! ¡CÁ-MA-RAS! ¡CHATARRA!»

## Tres axiomas

1. **Es genuinamente gracioso.** El público se ríe con sus comentarios, no solo se inquieta.
2. **Sus reglas tienen reglas.** Puede prometer, provocar, desafiar y observar, pero los sistemas jugables no hacen trampa.
3. **Cuanto más se conoce, menos se entiende.** La familiaridad deja paso a la sospecha; la extrañeza no se resuelve con una exposición larga.

## La máscara y sus grietas

**Apariencia inicial:** presentador de TV retro sin rostro completo; voz brillante, sonrisa abstracta, monogramas, marcos televisivos, focos y barras de emisión. **No fijar aún una forma física definitiva** ni una especie/origen. **Evolución:** en loops avanzados, un frame queda congelado, la sonrisa se desfasa, habla con una voz seca una frase que parece no haber pronunciado. El audio se recupera y él lo convierte en chiste.

## Voz y comportamiento

Registro: grandilocuente, cortesía venenosa, ritmo de locutor animado, humor adulto sin humillar identidades reales. Sus exclamaciones aparecen en clímax; entre ellos puede hablar bajo, con curiosidad genuina. Usa vocabulario de episodios, ratings, elenco, utilería, guion, productores, público, patrocinadores ficticios, premios, repeticiones y bis.

**Nunca hacer:** insultos relacionados con grupos protegidos, diálogos que parezcan ataques al jugador real, grititos constantes, spoilers, mentiras sobre condiciones de un pacto, bromas durante avisos de accesibilidad, desactivar subtítulos para «asustar».

## Mood y evolución

Mood no equivale a «fase narrativa».

- `ENTERTAINED`: disfruta el caos, llama al grupo «elenco».
- `BORED`: finge bostezos y promete cambiar la programación.
- `IMPRESSED`: su sonrisa se vuelve incómodamente sincera.
- `FRUSTRATED`: carraspea, cuenta hasta tres, deja escapar sarcasmo seco.
- `OBSESSED`: habla como si hubiera conocido al participante antes de su primera run.

Fases narrativas: apertura brillante → reconocimiento → señales anómalas → quiebre ocasional de máscara → revelaciones por exploración. **El tiempo jugado no es el único detonante**: activar secretos, ganarle, fallar y experimentar pactos enriquecen el misterio.

## Reacciones a partidas anteriores

Eventos guardados: muerte vs boss, récord de loops, rescates, pactos secretos, descubrimientos, sinergias. Una frase contextual menciona datos reales y comprobables: «Tercera vez con ese jefe. Admiro tu insistencia». Nunca inventar traiciones que no ocurrieron.

## Pactos privados

El Director se acerca verbalmente a una pantalla/canal privado, ofrece trato con texto contractual claro. Más tarde puede revelar el secreto como gag televisivo, pero no debe activar vergüenza constante ni acoso grupal. Priorizar bromas sobre la situación absurda, no sobre la persona.

## Regla del silencio

El silencio es un recurso. Controlar prioridad de diálogos: aviso vital > información mecánica > anuncio de evento > comentario de humor > easter egg. Limitar frases por ventana [POR BALANCEAR], prioridad a variedad y cooldown contextual. Interrumpir líneas largas ante combate decisivo, salvo avisos de peligro que tienen canal propio.

## Guion de presentación de un loop [PROPUESTA]

«Se terminó la función. / Eso pensaron. / ¿Esas caras? ¡Ese brillo en los ojos! / ¿Quieren otra vuelta? / ¡QUE EMPIECE EL BIS!»

## Guion de anomalía [PROPUESTA]

«Ninguno de ustedes debía ver esa sala». [silencio, ruido blanco]. «¡Ja! ¡Broma de producción! ¿Quién revisó los planos?»

## Integración técnica mínima

`DialogueCue` referencia `trigger, minNarrativeTier, moodFilter, memoryPredicate, priority, cooldownGroup, variants[], audioAssetKeys, subtitleKey, presentationMode, maxDuration`. La elección de voz no consume el RNG de loot ni de jefe. Si falta un audio, el subtítulo sigue funcionando.
