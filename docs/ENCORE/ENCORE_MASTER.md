# JUNKED METAL: ENCORE — DOSSIER MAESTRO CONSOLIDADO

**THE SHOW MUST GO ON.** Documento de lectura única compilado automáticamente desde el paquete de especificaciones. Para trabajar y editar es preferible usar los archivos Markdown individuales. Datos JSON/CSV y diagramas no se incorporan literalmente aquí.

> Estado: documentación de preproducción, no repositorio auditado ni juego implementado.
## Índice de documentos
1. `AGENTS.md`
2. `QUICKSTART.md`
3. `README.md`
4. `00_FOUNDATION/01_VISION.md`
5. `00_FOUNDATION/02_DECISION_LOG.md`
6. `00_FOUNDATION/03_REFERENCE_RUN.md`
7. `01_DESIGN/01_MASTER_GDD.md`
8. `01_DESIGN/02_RUN_STRUCTURE.md`
9. `01_DESIGN/03_THREAT_DIRECTOR.md`
10. `01_DESIGN/04_WORLDS_AND_ROUTES.md`
11. `01_DESIGN/05_TELEPORTERS.md`
12. `01_DESIGN/06_COOP_COMBAT.md`
13. `01_DESIGN/07_LOOT_AND_ECONOMY.md`
14. `01_DESIGN/08_PACTS.md`
15. `01_DESIGN/09_FINAL_ACT.md`
16. `01_DESIGN/10_METAPROGRESSION.md`
17. `01_DESIGN/11_PROTOTYPE_PLAYBOOK.md`
18. `02_NARRATIVE/01_DIRECTOR_BIBLE.md`
19. `02_NARRATIVE/02_LORE_AND_SECRETS.md`
20. `02_NARRATIVE/03_ART_AUDIO_DIRECTION.md`
21. `02_NARRATIVE/04_DIALOGUE_GUIDELINES.md`
22. `02_NARRATIVE/05_EPISODES_AND_SETPIECES.md`
23. `03_ENGINEERING/01_ARCHITECTURE.md`
24. `03_ENGINEERING/02_NETWORKING_AND_MIGRATION.md`
25. `03_ENGINEERING/03_MULTISCREEN.md`
26. `03_ENGINEERING/04_SAVE_AND_STATE.md`
27. `03_ENGINEERING/05_DATA_AND_EVENTS.md`
28. `03_ENGINEERING/06_UI_UX_AND_ACCESSIBILITY.md`
29. `03_ENGINEERING/07_SECURITY_AND_PRIVACY.md`
30. `04_PRODUCTION/01_ROADMAP.md`
31. `04_PRODUCTION/02_BACKLOG.md`
32. `04_PRODUCTION/03_TEST_AND_BALANCE.md`
33. `04_PRODUCTION/04_METRICS.md`
34. `04_PRODUCTION/05_CONTENT_PIPELINE.md`
35. `04_PRODUCTION/06_RISKS_AND_ADRS.md`
36. `06_CODEX/01_START_HERE_CODEX.md`
37. `06_CODEX/02_OPUS_DESIGN_REVIEW.md`
38. `06_CODEX/03_PHASE0_AUDIT.md`
39. `06_CODEX/04_EXECUTION_PROTOCOL.md`
40. `07_DIAGRAMS/README.md`

---

---

# PARTE 01: AGENTS.md

# Instrucciones para agentes que trabajen dentro de ENCORE/

- Consultar `README.md` y `00_FOUNDATION/02_DECISION_LOG.md` antes de cualquier edición.
- El objetivo es **Junked Metal: ENCORE**; respetar Survivor y otros modos.
- No confundir archivo de ejemplo/prototipo con dato del repositorio.
- No declarar features implementadas si no existe diff probado.
- Si se ofrecen opciones al usuario, ubicar la recomendación genuina en opción **A**.
- Documentar ADRs, pruebas y riesgo de regresión; avanzar en fases pequeñas.
- No cambiar decisiones [CONFIRMADO] sin petición expresa.
- Conectar creatividad a jugabilidad, rendimiento y facilidad de mantenimiento.


---

# PARTE 02: QUICKSTART.md

# ENCORE — Empezar aquí en 90 segundos

**Junked Metal: ENCORE — THE SHOW MUST GO ON**. Roguelite de 1–4 jugadores que empieza en la Luna. Tras mínimo cuatro escenarios por ciclo, los jugadores votan **ENCORE!** (seguir en un loop evolutivo) o **FINAL ACT** (arena con boss secreto fijo desde el inicio; derrotarlo cierra run). El antagonista **Director** es un presentador macabro de identidad desconocida, con memoria, humor, amenazas justas y pactos consentidos.

**Para jugar con el diseño:** `00_FOUNDATION/01_VISION.md` + `01_DESIGN/01_MASTER_GDD.md`.

**Para evitar reinterpretaciones:** `00_FOUNDATION/02_DECISION_LOG.md`.

**Para producir:** `04_PRODUCTION/01_ROADMAP.md` + `04_PRODUCTION/02_BACKLOG.md`.

**Para pasar a Codex:** `06_CODEX/01_START_HERE_CODEX.md` y `06_CODEX/03_PHASE0_AUDIT.md`. Abrir el repositorio real y adjuntar esta carpeta; aún no se inspeccionó ni modificó el código del juego.

**Datos:** todo en `05_DATA/` es prototipo/plantilla, no contenido existente validado.


---

# PARTE 03: README.md

# JUNKED METAL: ENCORE
## THE SHOW MUST GO ON.

> **Diseño maestro · Edición 1.0 · 11 de octubre de 2026**  
> **Estado:** paquete de preproducción, **no** implementación ni auditoría de código.  
> **Formato:** documentos Markdown, diagramas Mermaid, ejemplos JSON/CSV y guías para Codex/Opus.

**ENCORE** es un modo roguelite de supervivencia, exploración y cooperación para **1–4 jugadores**, construido sobre el universo, el combate y los recursos existentes de *Junked Metal*. Comienza en la Luna, atraviesa al menos cuatro escenarios por ciclo y permite escoger entre otro **ENCORE!** o un **FINAL ACT** irreversible. Un anfitrión macabro, **el Director**, presenta el espectáculo, controla amenazas mediante reglas justas, ofrece pactos peligrosos, recuerda las expediciones y oculta su verdadera identidad.

## Cómo navegar este paquete

| Carpeta | Contenido |
|---|---|
| `00_FOUNDATION/` | Visión, principios, decisiones aprobadas, conceptos y experiencia objetivo. |
| `01_DESIGN/` | Reglas del juego: runs, director, mapas, teleportadores, objetos, pactos, bosses y progresión. |
| `02_NARRATIVE/` | Biblia del Director, misterio, diálogos, guía artística y sonora. |
| `03_ENGINEERING/` | Arquitectura de referencia, red/cooperativo, MultiScreen, guardado, seguridad y UX. |
| `04_PRODUCTION/` | Roadmap, backlog, pruebas, métricas, riesgos y pipeline de producción. |
| `05_DATA/` | Ejemplos de datos versionables. **No son assets definitivos ni estadísticas balanceadas.** |
| `06_CODEX/` | Instrucciones listas para transferir a Codex/Claude y auditar el repositorio real. |
| `07_DIAGRAMS/` | Diagramas Mermaid, legibles también como texto. |

## Lectura recomendada

1. [`00_FOUNDATION/01_VISION.md`](00_FOUNDATION/01_VISION.md)
2. [`00_FOUNDATION/02_DECISION_LOG.md`](00_FOUNDATION/02_DECISION_LOG.md)
3. [`01_DESIGN/01_MASTER_GDD.md`](01_DESIGN/01_MASTER_GDD.md)
4. [`03_ENGINEERING/01_ARCHITECTURE.md`](03_ENGINEERING/01_ARCHITECTURE.md)
5. [`04_PRODUCTION/01_ROADMAP.md`](04_PRODUCTION/01_ROADMAP.md)
6. [`06_CODEX/01_START_HERE_CODEX.md`](06_CODEX/01_START_HERE_CODEX.md)

## Leyenda de estado

- **[CONFIRMADO]**: decisión expresamente aprobada en la conversación.
- **[PROPUESTA]**: diseño recomendado para probar; puede cambiar tras auditar el juego.
- **[POR AUDITAR]**: depende de la implementación real de *Junked Metal*.
- **[POR BALANCEAR]**: parámetros de ejemplo, sujetos a telemetría y playtests.

## Regla de oro

**Primero demostrar que quedarse o avanzar es una decisión emocionante.** Todo lo demás —lore, secretos, escenografía, sistemas avanzados— debe reforzar ese núcleo, nunca ocultarlo.

## Qué NO se afirma aquí

No hemos inspeccionado el repositorio, probado los sistemas Survivor, enumerado jefes reales ni validado la viabilidad de cámaras múltiples, WebRTC, migración de anfitrión o juego local en un dispositivo. Los documentos separan explícitamente la **visión de producto** de una **implementación validada**. El auditor de fase 0 debe reemplazar supuestos por hallazgos demostrables.

## Entrega a un agente

Usá el prompt de `06_CODEX/01_START_HERE_CODEX.md` como instrucción de arranque al abrir el repositorio real. No pedir que implemente todas las fases de una vez: trabajar con diffs pequeños, pruebas y revisiones por hitos.


---

# PARTE 04: 00_FOUNDATION/01_VISION.md

# Visión creativa — Un espectáculo que aprende

## Elevator pitch

**Junked Metal: ENCORE — The Show Must Go On** es un roguelite cooperativo de acción y exploración en escenarios retroindustriales Folded 2.5D. En la Luna, de 1 a 4 concursantes entran en el espectáculo de una entidad conocida solo como **el Director**. Mientras más tiempo sobreviven, más peligrosa resulta la función. Cada ruta, objeto, pacto y decisión de continuar transforma la expedición. El equipo puede tentar al destino con otro **ENCORE!**, o apostar todo en el **FINAL ACT** contra un ejecutor secreto del Director.

## Fantasía del jugador

1. **Somos un grupo de desastres extraordinariamente competentes.** Cooperamos, improvisamos y sobrevivimos a un universo que nos toma el pelo.
2. **Cada minuto importa.** Quedarse a buscar objetos fortalece la build; avanzar evita escaladas temporales, pero renuncia a recursos.
3. **El mundo nos reconoce.** El Director comenta nuestras victorias, errores, pactos y secretos descubiertos sin romper el ritmo.
4. **Cada run cuenta una anécdota.** Combinaciones, traiciones cómicas de bajo impacto, rescates imposibles, rutas inesperadas y jefes anticipados por pistas.
5. **Los loops añaden significado.** No solo números más grandes: nuevas reglas, escenografía, secretos y desafíos.

## Los 8 pilares

- **Decisión bajo presión**: tiempo global + tiempo de mapa + presión del Director; información clara y riesgos justos.
- **Cooperación sin castigo social**: 1–4 jugadores, XP grupal, builds individuales, rescate, objetos voluntariamente transferibles y sin daño aliado normal.
- **El Director es sistema y personaje**: presupuesto de amenazas, estados de ánimo, voz teatral, memoria persistente y misterio evolutivo.
- **Riesgo consentido**: pactos claros, voluntarios y diferenciados por impacto; secretos menores no deben sabotear al equipo.
- **Mundos reconocibles pero cambiantes**: mapas diseñados a mano y variaciones procedurales sincronizadas.
- **Juego largo, sin esperas inútiles**: primera expedición objetivo de 40–60 min; sin timer mínimo artificial y con reanudación.
- **Acceso flexible**: online, local, mixto, pantallas independientes y móviles emparejados bajo control del anfitrión.
- **Reutilización consciente**: Survivor como fuente principal de combate, personajes/vehículos, enemigos y jefes; cero refactors especulativos.

## Identidad estética

**Retro-Industrial Folded 2.5D.** Volúmenes tridimensionales completos y legibles, materialidad plegada/mecánica sin confundirla con papel infantil ni gomitas. Humor adulto con sensibilidad artesanal. El Director tiene lenguaje de espectáculo televisivo antiguo, casino industrial, interferencia audiovisual y una máscara que se resquebraja progresivamente.

## Contrato emocional

- La muerte duele, pero una expedición fallida puede dejar conocimiento, descubrimientos o desbloqueos.
- El juego celebra la creatividad del jugador, no invalida builds potentes para mantener artificialmente la dificultad.
- La hostilidad es del **personaje Director**; el sistema debe ser transparente, accesible y justo.
- Las historias compartidas tienen más valor que una pantalla saturada de efectos.

## Qué NO es ENCORE

No es una sustitución de Survivor; no es una copia de la expresión audiovisual de Risk of Rain; no es un juego PvP oculto; no requiere IA generativa en tiempo real; no necesita cientos de mapas hechos a mano; no debe destruir rendimiento por cascadas infinitas de proc; no obliga a participar en pactos.

## Frases de identidad originales, provisionales

- «¡Bienvenidos de nuevo, mis gloriosos desperdicios!»
- «El espectáculo continúa. Ustedes, por desgracia, también».
- «¿Otra vuelta? El departamento de seguridad acaba de renunciar».
- «THE SHOW MUST GO ON.»

Las líneas son propuestas originales para pruebas; su tono final se trabaja en `02_NARRATIVE/`.


---

# PARTE 05: 00_FOUNDATION/02_DECISION_LOG.md

# Registro de decisiones — Fuente de verdad

**Prioridad:** si cualquier archivo contradice esta tabla, este registro prevalece para decisiones del usuario. Las cifras de balance no aprobadas se consideran prototipos, no decisiones.

| ID | Área | Decisión | Estado |
|---|---|---|---|
| D-001 | Nombre | **Junked Metal: ENCORE**, lema «THE SHOW MUST GO ON.» | CONFIRMADO |
| D-002 | Naturaleza | Nuevo modo roguelite independiente de Survivor; reutilizar sus sistemas existentes. | CONFIRMADO |
| D-003 | Jugadores | Solo o cooperativo **máximo 4**; online, local y mixto. | CONFIRMADO |
| D-004 | Inicio | La primera etapa es la **Luna**. | CONFIRMADO |
| D-005 | Mapas | **Mínimo cuatro escenarios por ciclo**, rutas ramificadas elegidas en equipo. | CONFIRMADO |
| D-006 | Loops | Evolutivos: rutas, amenazas, eventos, sectores y secretos cambian; la Luna no es obligatoria en loops posteriores. | CONFIRMADO |
| D-007 | Duración | Primera expedición objetivo **40–60 minutos**; loops extensibles. | CONFIRMADO |
| D-008 | Tiempo | Cronómetro global continuo, cronómetro por mapa y presión independiente del Director. | CONFIRMADO |
| D-009 | Director | Presentador macabro teatral + entidad misteriosa; estados de ánimo, memoria entre partidas, historia dinámica y secretos. | CONFIRMADO |
| D-010 | Apariciones | Pantallas/radio/voz/subtítulos/interferencias, cada vez más anómalas; sin saturación de comentarios. | CONFIRMADO |
| D-011 | Diálogo | Frases modulares producidas, variaciones y contextualización; TTS para prototipo y localización prevista; no requiere LLM en vivo. | CONFIRMADO |
| D-012 | Director jugable | Director de Amenazas adaptativo con presupuesto, límites justos y fases exploración/tensión/caos/respiro/clímax. | CONFIRMADO |
| D-013 | Pactos | Rápidos, de escenario y de expedición; individuales, colectivos votados y tentaciones privadas menores. | CONFIRMADO |
| D-014 | Secreto social | Revelaciones teatrales posteriores; consecuencias colectivas serias requieren votación, menores pueden ser secretas. | CONFIRMADO |
| D-015 | Moneda | Chatarra temporal compartida por equipo; persiste entre mapas; precios variables con escalado/caps. | CONFIRMADO |
| D-016 | Fuentes de objetos | Cofres aleatorios, tiendas visibles, máquinas del Director, recicladoras y cofres especiales. | CONFIRMADO |
| D-017 | XP | Experiencia compartida; selección de habilidades y builds individuales. | CONFIRMADO |
| D-018 | Nivel | Tres opciones aleatorias, rerolls limitados, sinergias sugeridas, mejoras pendientes que no pausan a otros. | CONFIRMADO |
| D-019 | Objetos | Stacking, sinergias, evoluciones por combinaciones/máquinas, descubrimientos y secretos. | CONFIRMADO |
| D-020 | Co-op builds | Reacciones elementales/cooperativas también reproducibles en solitario con la build adecuada. | CONFIRMADO |
| D-021 | Fuego amigo | No hay daño aliado normal; peligros del entorno sí afectan a todos. | CONFIRMADO |
| D-022 | Combate | Expandir Survivor con exploración y estilos propios de personajes/vehículos existentes. | CONFIRMADO |
| D-023 | Caída | Incapacitado → rescate temporizado; si falla, regreso siguiente mapa; wipe total termina run. | CONFIRMADO |
| D-024 | Botín | Objetos individuales; transferencias voluntarias; recompensas de jefes con oportunidades equitativas. | CONFIRMADO |
| D-025 | Teleportador | Cualquiera propone; interfaz «listo» para todos; al confirmar comienzan eventos variables anunciados. | CONFIRMADO |
| D-026 | Búsqueda | Teleportador de ubicación variable con señales, mapa revelado, terminales y marcadores compartidos; ayudas graduales. | CONFIRMADO |
| D-027 | Generación | Mapas diseñados a mano con variaciones procedurales controladas y semilla sincronizada. | CONFIRMADO |
| D-028 | Secretos | Rutas ocultas, acertijos ambientales, transmisiones, secretos resolubles también solo, historia persistente. | CONFIRMADO |
| D-029 | Jefe final | Sorteado en secreto de los jefes compatibles de Survivor al iniciar la run; identidad fija, pistas progresivas. | CONFIRMADO |
| D-030 | Arena final | Arena exclusiva, con condiciones manipulables mediante secretos, sin cambiar el jefe seleccionado. | CONFIRMADO |
| D-031 | Final | Tras ≥4 escenarios, votación **ENCORE!** o **FINAL ACT**. Mayoría; empates se vuelven a votar. Vencer al jefe **termina la run**. | CONFIRMADO |
| D-032 | Persistencia | Autoguardado al completar escenarios, suspender y reanudar, reconexión segura, sin rollback explotable. | CONFIRMADO |
| D-033 | Host | Migración automática del anfitrión si se desconecta, apoyada en snapshots. | CONFIRMADO |
| D-034 | Nuevos jugadores | **Solo entre escenarios**; reconexiones de jugadores existentes en cualquier momento seguro. | CONFIRMADO |
| D-035 | Jugador tardío | Kit aleatorio equilibrado «Bienvenida del Director». | CONFIRMADO |
| D-036 | Abandonos | Reservar inventario ante desconexión; transferencia voluntaria si abandono definitivo; antidupe. | CONFIRMADO |
| D-037 | MultiScreen | Split-screen/cámara compartida; ventana independiente; TV; teléfono como receptor, mando o jugador completo. | CONFIRMADO |
| D-038 | Pairing | QR + código temporal; autoriza anfitrión; asigna roles; configuración recordada sin omitir autorización. | CONFIRMADO |
| D-039 | Sostenibilidad | Balance y rendimiento protegen el juego incluso con loops largos y sinergias masivas. | CONFIRMADO |

## Preguntas abiertas — no inventar resolución

1. **Motor real, renderer y runtime:** [POR AUDITAR].
2. **Jefes/escenarios/personajes que existen**, identificadores y compatibilidad: [POR AUDITAR].
3. **Networking existente, backend y guardados:** [POR AUDITAR].
4. **Input local:** mouse/teclado, gamepad, touch, accesibilidad del split-screen, captura de foco: [POR AUDITAR].
5. **Mecanismo concreto para evitar bloqueo de ready** (timeout, abandono, abstención) [PROPUESTA].
6. **Qué se entiende por ganar una votación cuando hay abstenciones**, política de anfitrión [PROPUESTA].
7. **Plataformas y límites reales de TV/casting**, WebRTC, NAT, P2P, relay [POR AUDITAR].
8. **Parámetros:** velocidades, daño, precio, probabilidad, RNG, duraciones de revive/cooldowns [POR BALANCEAR].
9. **Monetización, licencia, clasificación etaria, idioma final de voces** [NO DEFINIDO].

## Nota editorial

La petición de que mi recomendación aparezca siempre como opción «A» corresponde al formato de preguntas, no a reglas de diseño del juego.


---

# PARTE 06: 00_FOUNDATION/03_REFERENCE_RUN.md

# Una expedición imaginaria — vertical de experiencia

> **[PROPUESTA NARRATIVA]** Escena conceptual, no especificación literal de contenido ya implementado.

**00:00 · Estación lunar.** Cuatro participantes aparecen ante una televisión chisporroteante. Un foco parpadea; el Director los saluda por sus apodos de partida. Un indicador compacto muestra `00:00 | AMENAZA 1 | MAPA 1/4 | LOOP 1`.

**08:40 · Exploración.** Un jugador encuentra una terminal que sugiere la dirección del teleportador. Otro busca cofres. La experiencia sube para todos, aunque estén lejos. Un tercero combina electricidad y combustible; el cuarto descubre un símbolo repetido en un túnel.

**12:10 · El trato.** Un televisor ofrece una apuesta rápida con premio claro. Una invitación privada propone a un jugador conseguir un objeto si activa una breve emboscada menor para el equipo. La consecuencia está descrita; acepta. El Director sonríe en otra pantalla, pero no cambia reglas ni hace daño aliado.

**14:25 · Preparación.** El primer jugador localiza el teleportador. Todos reciben un marcador y un ping. El equipo termina las compras, ve el tipo de evento —«Sobrecarga»— y confirma «listo».

**15:40 · Sobrecarga.** Se activa una defensa intensa. El Director gasta su presupuesto en enemigos apropiados para cuatro jugadores; anuncia élites con señales. Uno cae, otro lo rescata. La tensión se rompe en un respiro antes del viaje.

**16:15 · Ruta.** La pantalla de transición ofrece dos destinos y una votación. El equipo elige una zona industrial. El Director revela públicamente al comprador secreto de la emboscada anterior: todos se ríen, nadie perdió progreso irreversiblemente.

**31:00 · Secretos.** Una transmisión relacionada con el jefe oculto confirma un patrón de ataques. Encuentran maquinaria que puede sabotear parte de la arena final. El sistema registra ese descubrimiento sin revelar al Director por completo.

**52:30 · MAPA 4/4.** Tras otro evento del teleportador, aparece la votación: `ENCORE!` frente a `FINAL ACT`. El equipo elige ENCORE!. La dificultad continúa desde el cronómetro global y se amplía el catálogo de rutas.

**77:00 · LOOP 2.** El Director deja de sonar como un conductor amigable por dos segundos. El escenario conocido contiene una nueva ruta; la build del grupo es poderosa, pero hay amenazas cualitativamente diferentes. El jugador anfitrión pierde internet; un checkpoint autoritativo reciente permite migración de anfitrión con una pausa breve y reconexión.

**104:00 · FINAL ACT.** El equipo vota el acto final. Las pistas de expediciones previas permiten reconocer al ejecutor, mientras un mecanismo saboteado reduce un peligro ambiental de la arena. Vencer termina la run; una derrota también la termina. Se muestra el informe de espectáculo, se guardan logros y una nueva pista sobre el Director.

## Prueba de calidad narrativa

- ¿El Director comenta lo sucedido en lugar de recitar texto desconectado?
- ¿El jugador siempre conoce el coste de un pacto antes de aceptarlo?
- ¿Quedarse o avanzar es una elección real?
- ¿Las rutas alternativas justifican el desvío?
- ¿Un jugador local y otro remoto tienen las mismas oportunidades?
- ¿Al vencer al jefe se cierra la run, incluso en loop avanzado?


---

# PARTE 07: 01_DESIGN/01_MASTER_GDD.md

# GAME DESIGN DOCUMENT — ENCORE

**Estado:** diseño de producto v1; cifras en borrador. **Lectura obligatoria:** registro de decisiones.

## 1. Resumen

Género: acción/exploración roguelite con combates continuos, recolección y builds sistémicas; 1–4 jugadores online, local o mixto; partidas objetivo de 40–60 minutos hasta la primera posibilidad habitual de final y extensión voluntaria por loops. Comienza en la Luna. Cada ciclo consta de **al menos cuatro mapas**, con rutas ramificadas y variación procedural controlada. El equipo busca y prepara teleportadores que disparan eventos anunciados, vota el siguiente destino y tras el cuarto escenario opta por **ENCORE!** (loop) o **FINAL ACT** (arena exclusiva del jefe aleatorio oculto, fija desde el inicio). Ganar cierra la expedición.

## 2. Core loop de 30 segundos

**Moverse → combatir → recoger XP/chatarra → localizar oportunidades y señales → comprar/crear sinergias → decidir cuánto tiempo quedarse → activar evento del teleportador → votar destino → avanzar/loopear → FIN.**

Meta loop: **run → muerte/victoria → informe del Director → descubrimientos y desbloqueos → nueva run**. Diferenciar progresión temporal (poder de run) y meta (nuevas opciones, cosméticos, revelaciones); no trasladar chatarra de la expedición a otros modos.

## 3. Flujo de estados

`MENU` → `LOBBY` → `RUN_INIT` → `STAGE_EXPLORE` → `PORTAL_READY` → `PORTAL_EVENT` → `STAGE_RESOLVE` → `ROUTE_VOTE` → (`STAGE_LOAD` o, después de mínimo 4, `FORK_VOTE`) → (`NEXT_LOOP` o `FINAL_ACT_PREP`) → `BOSS_ARENA` → (`WIN` o `WIPE`) → `RUN_REPORT` → `META_COMMIT`.

`SUSPEND` solo en puntos consistentes y `RECONNECT/MIGRATION` como estados transitorios; los reingresos de participantes originales no consumen plazas adicionales.

## 4. Reglas duras

1. **Solo cuatro plazas** por expedición; un dispositivo puede representar múltiples participantes locales.
2. **No hay fuego amigo normal**; los peligros del mundo pueden dañar a todos.
3. XP es **de equipo**, pero subir de nivel habilita elecciones individuales (3 opciones, rerolls limitados, elecciones aplazables).
4. Chatarra **de equipo**, persiste entre mapas y no entre runs. Los precios pueden escalar de forma visible y acotada.
5. El Director puede ser un mentiroso **dentro de la ficción**; los compromisos mecánicos presentados en UI son exactos y verificables.
6. Pacto con impacto importante sobre el grupo → requiere voto grupal; impactos privados menores → pueden quedar ocultos temporalmente y revelarse después.
7. Jefe de la arena final → se elige de jefes compatibles de Survivor al inicio; permanece fijo toda la run; las pistas y sabotajes no cambian su identidad.
8. Evento de teleportador → anunciado antes del ready; requiere preparación compartida. Resolverlo precede a transición.
9. Equipo decide FINAL ACT o ENCORE! tras cumplir umbral de mapas por ciclo; mayoría y empates revotados.
10. **Victoria en FINAL ACT cierra la run**; no ofrecer «volver al loop» después del jefe.
11. Desconexión reserva pertenencias, migración de host recupera estado; nuevos jugadores entran **solo entre escenarios**.
12. Las ventajas cooperativas deben ser alcanzables también en solitario mediante herramientas o builds disponibles, no imposibles por diseño.

## 5. Economía de combate

**Inputs:** derrotar enemigos y completar desafíos aporta XP grupal y chatarra; eventos, jefes, cofres, tiendas, recicladoras y máquinas del Director dan objetos y oportunidades. **Outputs:** comprar, abrir, rerollear donde aplique, ensamblar, explorar y arriesgar pactos. Ningún sistema debe exigir una tienda obligatoria para superar el primer ciclo. Objetos están asignados a jugadores; intercambios voluntarios.

Tres ejes distintos: **habilidades por nivel**, **objetos pasivos/activables** y **pactos**. Evitar que tres interfaces compitan por la atención durante combate; niveles pendientes no congelan a otros. Sinergias se comunican con etiquetas claras y *codex* permanente de descubrimientos.

## 6. Combate/avance

Basarse en Survivor [POR AUDITAR]. Adaptar el control actual de personajes/vehículos y perspectiva de cámara. No convertir el combate en otro género por defecto: exploración más profunda, navegación hacia objetivos y encuentros contextualizados. El Director gobierna amenazas mediante un presupuesto y fases de ritmo; no aplicar rubber-banding opaco para negar power fantasy. Dar  telemetría visible del escalado de amenaza en el HUD.

## 7. Diseño de rutas

Primera etapa = Luna. Siguientes destinos provienen de un grafo validado por reglas de bioma/loop, con elecciones de equipo. Cada etapa debe tener: identidad visual, rutas primarias legibles, 1–3 oportunidades secundarias [POR BALANCEAR], sitios de riesgo/recompensa, señales de teleportador, secretos opcionales y localizaciones aptas para evento. En loops posteriores: rutas reordenadas y sectores/desafíos especiales; las variantes nunca deben bloquear ruta crítica ni romper cámara/cooperativo.

## 8. Director como autor de ritmo

Los estados de Director son **humor/persona** y **pacing**, no la misma variable. Humor: entretenido, aburrido, impresionado, frustrado, obsesionado; puede influir en diálogos/ofertas y elegir eventos dentro de un catálogo justo. Pacing: exploración, tensión, caos, respiro, clímax; gobierna presupuesto de encuentros y frecuencia de estímulos. El tiempo y loops siguen escalando aunque haya un respiro.

## 9. Historia

Historia ambiental fragmentada: transmisiones, pantallas físicas, símbolos, acertijos, anomalías, recuerdos entre runs. El Director alterna máscara de presentador televisivo y señales de naturaleza desconocida. No explicar demasiado pronto qué es. El diálogo usa variantes escritas y voz tratada; no requiere generación en vivo. Memoria persistente solo de eventos significativos, con opciones de accesibilidad y privacidad.

## 10. Co-op y juego justo

El host autoritativo gestiona verdad del mundo; cada participante tiene identidad única independiente del dispositivo. Split-screen local, online y mixto comparten reglas. XP global, chatarra global, objetos personales; voto de rutas/final, ready de teleportador y pactos según impacto. Sin fuego amigo. Caída → rescate temporizado → observación y regreso siguiente etapa; wipe acaba run. Nuevos jugadores entre etapas reciben kit equilibrado según loop; desconectados recuperan equipo reservado.

## 11. Segundo dispositivo / MultiScreen

El jugador puede usar TV/ventana/teléfono como visor, mando o cliente con visor+input. Una pantalla adicional **no crea participante**. Distinguir renders locales y transmisión de video; WebRTC para video remoto donde sea viable, y autorización temporal mediante QR/código. El anfitrión aprueba asociación y cambios de rol; gestionar permisos de captura/entrada, latencia y calidad. Matriz detallada en `03_ENGINEERING/03_MULTISCREEN.md`.

## 12. FINAL ACT

Se accede por votación del equipo tras el umbral. Arena preparada para distintos jefes existentes, con metadatos de compatibilidad. El boss secreto puede ser anticipado por pistas; sabotajes obtenidos en mapas alteran arena/hazards, nunca sustituyen al boss. Derrota cierra run por wipe; victoria cierra run y registra informe, logros, secretos y recompensa meta. El Director permanece como misterio narrativo.

## 13. UX de alto nivel

HUD compacto, 3 relojes/capas sin duplicar cifras innecesarias: tiempo global principal, contador de etapa secundario y nivel de presión visual. Lo esencial es visible incluso en un cuarto de pantalla. Pantallas de co-op deben manejar lectura a distancia, subtítulos individuales, prompts locales y notificaciones no invasivas. Con controles táctiles la interacción no debe ocultar el combate.

## 14. Primer corte jugable (vertical slice)

**Solo → Luna → XP/chatarra → 3 mejoras → cofre → Director presupuesto básico → teleportador con UN evento → cambio a una segunda etapa (prototipo) → guardar/restaurar.** Después agregar 2 jugadores, sincronización, voto, muerte, loop, FINAL ACT y MultiScreen por entregas. Esta es una **secuencia de implementación**, no una eliminación del alcance aprobado.

## 15. Definición de diversión

En 15–20 min de prueba, el jugador debe: entender que quedarse cuesta tiempo, reconocer al menos una combinación satisfactoria, encontrar teleportador sin frustración, disfrutar al menos una reacción memorable del Director y querer intentar otra ruta. El sistema debe respetar FPS, latencia, input y claridad aunque el espectáculo sea caótico.

## 16. Dependencias documentales

- `02_RUN_STRUCTURE.md`: reloj, ciclo, reglas de transición.
- `03_THREAT_DIRECTOR.md`: presupuesto, mood, pacing y fairness.
- `04_WORLDS_AND_ROUTES.md`: grafo, semilla y secretos.
- `05_TELEPORTERS.md`: eventos y ready.
- `06_COOP_COMBAT.md`: reglas de participantes, rescate y builds.
- `07_LOOT_AND_ECONOMY.md`: objetos, chatarra y crafting.
- `08_PACTS.md`: contratos y voto.
- `09_FINAL_ACT.md`: boss y arena.
- `10_METAPROGRESSION.md`: misterio persistente y retención.


---

# PARTE 08: 01_DESIGN/02_RUN_STRUCTURE.md

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


---

# PARTE 09: 01_DESIGN/03_THREAT_DIRECTOR.md

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


---

# PARTE 10: 01_DESIGN/04_WORLDS_AND_ROUTES.md

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


---

# PARTE 11: 01_DESIGN/05_TELEPORTERS.md

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


---

# PARTE 12: 01_DESIGN/06_COOP_COMBAT.md

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


---

# PARTE 13: 01_DESIGN/07_LOOT_AND_ECONOMY.md

# Chatarra, cofres, mejoras, máquinas y sinergias

## Tres economías, no una

1. **Chatarra de run — [CONFIRMADO]** fondo grupal compartido; se conserva entre mapas, se pierde al terminar run.
2. **XP global — [CONFIRMADO]** sube el nivel de todos; elecciones individuales.
3. **Metaprogresión — [CONFIRMADO]** desbloqueos/descubrimientos permanentes; no se paga con chatarra de run salvo conversión explícita futura [NO APROBADA].

## Fuentes y sumideros

Ingresos: enemigos, eventos, cofres especiales, pactos y objetivos. Gastos: cofres, tiendas, máquinas del Director, recicladoras/ensamblaje cuando corresponda. Toda transacción valida el saldo **en autoridad**, jamás confiar en el saldo de un cliente.

## Compras en equipo

Saldo visible a todos y registro compacto `Jugador → gasto → cosa adquirida`. Evitar que un jugador lo gaste todo: **[PROPUESTA]** pequeña confirmación/votación para compras superiores a un porcentaje configurable del fondo, con cooldown de gasto extremo; no votar cada cofre. Importante: no introducir fricción excesiva que contradiga el ritmo roguelite.

## Precio dinámico

Algunas fuentes escalan con amenaza/tiempo y loops (el dinero nunca desaparece solo). Mostrar precio antes de activar y explicar la tendencia. Propuesta de prototipo:

`price = clamp(round(basePrice * (1 + 0.012 * activeMinutes) * pow(1.08, completedLoops)), min, max)`.

No aplicar misma fórmula a todas las tiendas ni permitir inflación infinita. Un equipo que ahorra debe tener algunas oportunidades significativas de gasto posterior.

## Proveedores de recompensa

| Tipo | Visible antes de pagar | Aleatoriedad | Agencia |
|---|---|---|---|
| Cofre misterioso | Rareza/tabla aproximada | Alto | Decidir abrir |
| Tienda | Objeto y coste | Oferta cambiante | Compra dirigida |
| Máquina del Director | Conjunto de opciones | Moderada | Elegir solo una |
| Recicladora | Entrada, regla y resultado conocido/tabla | Variable | Intercambiar voluntariamente |
| Cofre especial | Banda de rareza | Mediano | Requiere evento/secretos |
| Ensambladora | Receta identificada | Bajo | Fusionar/evolucionar |

## Objetos y rarezas [PROPUESTA]

Definir `common / uncommon / rare / legendary / director / secret` como **categorías de diseño**, no paleta final ni cantidades garantizadas. Cada objeto tiene `itemId, rarity, tags, stackPolicy, effectId, procRules, cap, description, VFXCost, synergyHints`.

- `STACK`: copias suman beneficio mediante curva limitada, potencialmente rendimientos decrecientes.
- `SYNERGY`: coexistencia de tags crea reacción nueva sin consumir objetos.
- `EVOLUTION`: receta desbloqueada y condición (ensambladora/secretos/loop) transforma objeto o conjunto.
- `PASSIVE/ACTIVE`: disponibilidad según arquitectura actual y pruebas de usabilidad.

## Fórmula de stacking [PROPUESTA]

Para evitar probabilidades >100% y explosiones exponenciales: `effectiveChance = cap * (1 - exp(-n*k))`. Otras estadísticas pueden sumar con diminishing returns. El motor debe limitar reacciones por frame, entidad y run.

## Rerolls

Cada jugador tiene créditos limitados para cambiar sus tres opciones por nivel. No implican pausa global. Opcionalmente el Director ofrece una cuarta carta bajo pacto. La selección se genera en autoridad desde `lootRng`, pero puede ponderarse suavemente por sinergias; registrar cuánto se ponderó para depurar sesgos.

## Intercambios

Ciertos objetos se pueden regalar de forma voluntaria; cada transferencia tiene transaction ID, idempotencia, inventario propietario, consentimiento y validación de disponibilidad. No permitir comercio en estados inestables de migración/suspensión. No incluir mercado real ni monetización como suposición.

## Descubrimiento permanente

El códice muestra recetas conocidas, pistas de sinergia y efectos probados; las recetas secretas no deben revelarse por datos públicos de UI antes de descubrirse si queremos preservar misterio. Evitar que la progresión permanente obligue a grind para competir.

## Ejemplos creativos NO implementados

- **Bobina de mala suerte**: ataques cargados pueden rebotar a objetivo cercano.
- **Bomba de aplausos**: ciertas eliminaciones producen ondas de impacto.
- **Motor del bis**: tras completar un evento especial, bonificación temporal limitada.
- **Pagaré del Director**: deuda temporal de chatarra a cambio de elección de objeto; deberá ser un pacto con condiciones muy claras.

Cada ejemplo exige audit de efectos existentes antes de proponer código o gráficos nuevos.


---

# PARTE 14: 01_DESIGN/08_PACTS.md

# Pactos del Director — riesgos, tentaciones y secretos

## Filosofía

Pacto = oportunidad de **riesgo voluntario + consecuencia comprensible + recompensa emocionante**. El Director puede ser embaucador en diálogos; los términos de la UI son contractuales y verdaderos. Los pactos se relacionan con su mood y memoria, pero nunca son coercitivos.

## Taxonomía aprobada

**Por duración**: `QUICK` (segundos/minutos), `STAGE` (hasta salir del mapa), `RUN` (hasta terminar expedición). **Por impacto**: `PERSONAL`, `TEAM` o `TEMPTATION` (favor personal que introduce perjuicio menor y temporal al grupo).

**Por exposición**: `PUBLIC` o `PRIVATE_UNTIL_REVEAL`. Cualquier coste **importante** para el equipo requiere votación. Un pacto privado solo puede provocar efectos de bajo impacto, limitados en tiempo y listados en pantalla al participante; en determinadas condiciones se revela teatralmente a los demás.

## Canales

1. Televisor o terminal físico interactivo (canal regular).
2. Invitación espontánea contextual (canal especial, no interrumpe combate); aparece como invitación compacta, ignorable, con expiración.
3. Pactos extraordinarios de loops avanzados, solo si compatibles con balance y estado actual.

## Contrato de un pacto

Campos: `id, offerId, tier, category, secrecy, eligibleTargets, consentPolicy, costSummary, rewardSummary, startTrigger, successCondition, failCondition, duration, maxTeamImpact, cooldown, rarity, cancelPolicy, fairnessTags`. Reglas de emisión y de activación quedan separadas.

Estados: `GENERATED → OFFERED → ACCEPTED/DECLINED/EXPIRED → ACTIVE → SUCCEEDED/FAILED/CANCELED → SETTLED → REVEALED_IF_APPLICABLE`.

## Pactos ilustrativos [PROPUESTA]

| Pacto | Tipo | Coste | Recompensa | Protección |
|---|---|---|---|---|
| Doble o chatarra | QUICK/TEAM | Emboscada visible, 90 s | Cofre de calidad superior | Consentimiento de grupo |
| La salud no es garantía | RUN/PERSONAL | Reducir HP máximo de run | Objeto singular | Mínimo de HP utilizable |
| Cobro al final | STAGE/PERSONAL | Precios aumentados en este mapa | Mejora puntual | Cap de precio |
| Producción sorpresa | QUICK/TEMPTATION | Pequeño grupo extra durante 45 s | Carta extra individual | Impacto menor, timer y reveal |
| ¿Un bis? | STAGE/TEAM | Modificador anunciado del portal | Premio grupal al completar | Voto + preparación |
| Apagón promocional | QUICK/PERSONAL | HUD secundario reducido por segundos | Chatarra extra | Nunca ocultar datos vitales ni accesibilidad |

Las cifras son muestras de diseño, no contenidos aprobados. **No combinar** penalizaciones incapacitantes con situaciones de rescate inevitable ni pactos «secretos» que comprometan la run de otros.

## Voto de pacto colectivo

Pacto de grupo inicia poll sincronizada por participante. El consentimiento debe permitir una regla de aprobación clara **[PROPUESTA: mayoría para pactos menores, unanimidad para coste permanente de run al equipo]**; el usuario aprobó que pactos grandes requieran votación, pero no una regla numérica concreta. Si hay empate/abstención, no ejecutar pacto irreversible. Nadie puede aceptar por otro.

## Tentaciones privadas

- Oferta solo visible en viewport/celular del destinatario, pero nunca cifrar información falsa sobre consecuencias.
- `maxTeamImpact` impuesto por servidor, con catálogo cerrado de consecuencias menores.
- Registrar quién aceptó y por qué se disparó; revelación posterior como comentario teatral, opcionalmente atenuable por ajustes sociales/accesibilidad.
- Los jugadores afectados deben poder identificar mecánicamente la amenaza cuando ocurre, aunque no sepan quién la provocó.
- Evitar premiar reiteradamente al jugador que sabotea; hay cooldowns y alternativas altruistas.

## Integración con estado emocional del Director

El mood modifica frecuencia y selección de propuestas dentro de ventanas máximas, **no** altera condiciones una vez ofertadas. Una oferta aceptada se ejecuta como transacción autoritativa con idempotencia y guardado. Las recompensas por completar deben liquidarse una sola vez.

## Control de abuso

- No se aceptan pactos cuando la sala está migrando host o guardando snapshot.
- Coste/recompensa no pueden cambiar tras aceptar, aunque suba el temporizador.
- Pactos pendientes al suspender/reanudar restauran tiempo activo restante y expiración correcta.
- Pactos que afectan a la economía compartida requieren autorización explícita según impacto.
- Moderación social: opción de **silenciar insinuaciones personalizadas** del Director sin desactivar la mecánica.


---

# PARTE 15: 01_DESIGN/09_FINAL_ACT.md

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


---

# PARTE 16: 01_DESIGN/10_METAPROGRESSION.md

# Metaprogresión, secretos y longevidad

## Separación de progresiones

- **Dentro de run**: tiempo, nivel, XP, chatarra, inventario, pactos, boss, rutas y modificadores.
- **Entre runs**: códice de hallazgos, recetas descubiertas, cosméticos/logros, estadísticas, fragmentos narrativos, historial del Director, desbloqueo de opciones.

Evitar convertir la metaprogresión en multiplicadores permanentes demasiado potentes. La ilusión de poder debe venir de decisiones y objetos de cada expedición; los logros deben abrir **posibilidades**, no volver el modo trivial.

## Misterio del Director: 4 capas [PROPUESTA]

1. **La máscara**: presentador gracioso que celebra la tragedia como entretenimiento.
2. **La programación**: emisiones anómalas, líneas que no encajan, pantallas con instrucciones contradictorias.
3. **La grieta**: aparece un segundo tono/voz, recuerdos persistentes, señales de que la transmisión puede ocultar una voluntad distinta.
4. **Detrás del telón**: piezas de una explicación progresiva sin revelación gratuita de todo el misterio.

La identidad verdadera **no está fijada en el diseño confirmado**. Este documento evita decretar que sea IA, humano, entidad cósmica u otra cosa.

## Memoria persistente

Datos significativos: `first_win`, `times_defeated_by_bossId`, `longest_loop`, `rescues`, `special_synergies`, `pacts_accepted`, `pacts_declined`, `secret_ids_discovered`, `finishes_with_team_size`. El Director puede escoger diálogo basado en hechos registrados; no inferir rasgos personales reales ni identificar al usuario de forma ofensiva.

## Descubrimientos

- **Hallazgo:** encontrar pista/receta de forma ambiental o mediante pacto.
- **Comprensión:** el códice enlaza piezas relacionadas; puede mostrar información contextual de boss sin resolver todo.
- **Efecto:** desbloqueo narrativo, cosmético, variante de evento, entrada de historia o nueva oportunidad de juego.

Algunas rutas solo aparecen tras loops altos; otras se desbloquean entre runs. Una ruta nunca debe requerir cuatro humanos si se permite jugar solo.

## Recompensas por récords

Desafíos especiales del Director: completar X loops, revivir N aliados, finalizar con una build rara, revelar un boss sin entrar al acto final, triunfar bajo condiciones pactadas. Los valores X/N son **[POR BALANCEAR]**. Dar alternativas accesibles a quien juega solo o usa ayudas de accesibilidad.

## Curva de motivación

Primeras 2 horas: comprender ritmo y descubrir primeras sinergias. 2–10 horas: ver loops evolutivos, explorar rutas, aprender pactos. Más adelante: metas autoimpuestas, secretos ocultos, récords y maestría. Estos horizontes son **[PROPUESTA]**, no objetivos de retención comprobados.

## Antifricción

Reintentar desde lobby rápido, cinemáticas omitibles, resumen corto del Director, códice consultable, guardados seguros, accesibilidad en audio/subtítulos y respeto a la atención del equipo. No exigir grind para descubrir las piezas esenciales del misterio.


---

# PARTE 17: 01_DESIGN/11_PROTOTYPE_PLAYBOOK.md

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


---

# PARTE 18: 02_NARRATIVE/01_DIRECTOR_BIBLE.md

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


---

# PARTE 19: 02_NARRATIVE/02_LORE_AND_SECRETS.md

# Arquitectura del misterio: detrás del telón

## Principio narrativo

La narrativa es ambiental y reactiva: nunca exigir leer diez documentos en medio de un combate. Cada hallazgo debe funcionar por sí solo como imagen, audio, evento o interacción, pero también poder conectarse a un misterio mayor. No explicar en este documento la verdadera identidad del Director porque el usuario eligió el misterio, no una explicación concreta.

## Motivos visuales propuestos

- **El Ojo/Obturador:** no es un ojo biológico obligatorio; símbolo de vigilancia y de cámara.
- **La sonrisa desfasada:** icono de marca televisiva que se altera en bucles altos.
- **La claqueta inconclusa:** cada loop añade una línea de producción al registro.
- **Butacas vacías:** «el público» existe como discurso, pero no se verifica quién observa.
- **Frecuencias fantasma:** radio, televisores y terminales que emiten frases fuera de contexto.

## Tres canales de revelación

1. **Historial personal:** comentarios y recuerdos entre runs según logros, récords y caídas.
2. **Exploración física:** puertas, terminales, transmisiones, zonas ocultas y acertijos accesibles solo/co-op.
3. **Consecuencias jugables:** pistas de boss y secretos que sabotean peligros de la arena final.

## Red de pistas [PROPUESTA]

No lineal pero ordenable por evidencias. Una pista puede tener `prerequisites[], hints[], revealLevel, continuityKey, reward[]` y una política `oncePerProfile` o `oncePerRun`. El códice debe mostrar hechos separados de hipótesis. Una línea del Director puede ser dudosa por ficción; el registro del jugador debe distinguir observación verificable de interpretación.

## Ejemplo de arco de descubrimiento (no canon)

**Acto 1 / sonrisa:** el jugador ve «APLAUSOS» en una pantalla que no está conectada. **Acto 2 / audiencia:** una terminal registra «cuatro participantes, cero espectadores». **Acto 3 / eco:** al llegar a loop alto, el Director repite una frase exacta pronunciada en una run anterior. **Acto 4 / backstage:** un mapa secreto muestra que las pantallas reciben señal desde lugares imposibles. El arco no decide quién o qué las controla.

## Secretos en cooperativo

- Interacciones conjuntas opcionales: cuatro placas para acelerar apertura, pero una ruta solo debe existir mediante activación alternativa en secuencia.
- Hallazgos individuales se anuncian opcionalmente al equipo; secretos con efecto en boss final se sincronizan para todos.
- Evitar exigir voz o conocimiento externo para descifrar un puzzle; incluir apoyos accesibles.

## Revelación del boss final

Las pistas sobre el ejecutor final deben ser coherentes y condicionales al `bossId` elegido al inicio. No añadir un segundo sorteo de boss al final. Revelar silueta o mecánica posible, nunca spoiler total sin descubrir el hallazgo correspondiente.

## El Director y la victoria

Derrotar al ejecutor pone fin a la run; **no** a la entidad. Puede felicitar, cambiar de canal, abrir un misterio o fingir que todo era parte del guion. Preservar el sentido satisfactorio de victoria: escena breve y opcionalmente omisible.


---

# PARTE 20: 02_NARRATIVE/03_ART_AUDIO_DIRECTION.md

# Arte, sonido y puesta en escena — Retro-Industrial Folded 2.5D

## ADN visual

Cuerpo físico de objetos: chapa doblada, bisagras, soportes estampados, bordes biselados y planos facetados, sin recurrir por defecto a textura de papel ni aspecto gomoso. Señales de desgaste, color industrial, foco de escenario y composiciones con buena legibilidad. Diseñar materiales y meshes reutilizables con variantes paramétricas. No sustituir los modelos tridimensionales completos por tarjetas 2D si la cámara puede rotar.

## Lenguaje del Director

**Televisor:** marcos antiguos industriales, tornillos, control rotatorio, estática. **Tipografía:** gran contraste, lectura en 1/4 viewport, gestos teatrales controlados; evitar fuentes parodia ilegibles. **Luz:** focos de estudio, contraluz, letreros de «ON AIR», flashes breves dentro de opciones de fotosensibilidad. **Interferencias:** cortes, *glitch* mínimo y no intrusivo; nunca ocultar alertas de daño esenciales.

## La Luna

Tratarla como escenario de apertura de ENCORE, aprovechando su arte real [POR AUDITAR]. Paleta de vacío/metal/polvo, retroindustria y puntos de referencia claros; el televisor del Director y el teleportador deben leerse con cámara móvil. Siluetas de enemigos y zonas activables deben contrastar con el terreno.

## Evolución por loop

- 1: escenario familiar, emisiones teatrales.
- 2: señales visuales alternativas, decorados cambiados, puertas/maquinaria.
- 3+: rutas raras, anomalías de pantalla y atmósfera; nunca oscurecer todo sin consentimiento de legibilidad.

**No obligar** a que todas las anomalías narrativas indiquen escalada de peligro. Diferenciar visualmente telegraph de amenaza (claro) y corrupción de lore (decorativo).

## VFX y efectos de build

El juego puede ofrecer combos explosivos; cada proc debe tener LOD de VFX por cámara, límite por frame y reducción de partículas secundarias. Mantener señalización de hazards e identidad de efectos incluso en ajustes bajos. Cuando cuatro jugadores compartan pantalla, priorizar siluetas y forma sobre brillo.

## Audio

Voz de presentador TV retro, banda estrecha y saturación leve; anomalías usan degradación progresiva. No comprometer la inteligibilidad de subtítulos/audio. Diseño con buses: `director_voice`, `gameplay_sfx`, `music`, `ambient`, `voice_chat_if_any`. Sidechain moderado a voz del Director **solo** para anuncios críticos. En MultiScreen: evitar reproducir la voz cuatro veces sobre TV y móviles cercanos; elegir destino/rol de audio.

## Accesibilidad por diseño

Subtítulos escalables, etiquetas hablante, alto contraste, vibración opcional, cambios visuales equivalentes a avisos sonoros, modo reducido de flashes, control separado de volumen/frecuencia del Director, sliders de tamaño HUD y UI a distancia de TV. Los controles táctiles deben evitar superponerse al centro del combate.

## Kit de entregables por escenario

- Moodboard interno con fuentes de assets propias/licenciadas [POR AUDITAR].
- Siluetas/landmarks en 3 niveles de zoom.
- Variantes por loop sin re-modelar todo.
- Sockets para spawn, loot, secretos, portal y pantallas del Director.
- Perfil de cámara y test 1/2/4 viewports.
- Perfil de audio y buses.
- LODs/optimización probados.

## Integración con herramientas de arte

Las transformaciones Folded 2.5D pueden producirse por pipeline procedural o packs de texturas/meshes, pero no suponer la existencia de herramientas concretas. Antes de reemplazar Blender, validar exportación, licencias, UV, compresión y compatibilidad con renderer real.


---

# PARTE 21: 02_NARRATIVE/04_DIALOGUE_GUIDELINES.md

# Biblioteca de diálogos — reglas y muestras

**[PROPUESTA]** Todas estas líneas son originales y utilizables como borradores de prototipo. No son grabaciones finales ni un canon irreversible.

## Estilo

Humor teatral para adultos, sentido de radio/televisión antigua, chistes hacia la chatarra y la situación. No repetir el mismo insulto en bucle. No exponer datos sensibles ni acciones inventadas de jugadores reales. Evitar spoilers y no hablar durante alertas urgentes.

## Paquetes contextuales

### Iniciar Luna
- «¡Luces encendidas! ¡Gravedad opcional! ¡Dignidad no incluida!»
- «Bienvenidos a la Luna. Sí, es un destino romántico. Especialmente si les gustan los cráteres.»
- «Sonrían para el público. No pregunten dónde está el público.»

### Primer rescate
- «¡Qué acto de solidaridad! Producción, ¿esto estaba permitido?»
- «¡Y lo levantan del suelo! ¡Ternura con olor a combustible!»

### Pactos
- «Tengo una oferta extraordinaria y una letra pequeña perfectamente legible.»
- «¡No es trampa si firmaron el contrato!»
- «Rechazaste mi oferta. Una decisión sana. Qué decepción.»

### Desbloqueo/receta
- «¡Eso no estaba en el manual! Bueno, quemamos el manual.»
- «¡Un invento nuevo! ¡Mi departamento legal está llorando!»

### Teleportador
- «¡Un nuevo destino! Elijan con cuidado... o elijan rápido, me da igual.»
- «¡Todos listos! ¡Adelante con el acto más irresponsable de la noche!»

### Bis
- «¡OTRA VUELTA! El público exige más. Y yo soy el público.»
- «Se terminó la función. Qué peculiar: siguen aquí.»

### FINAL ACT
- «¡El último acto! Nadie abandona el escenario antes del aplauso.»
- «Les preparé un invitado. Nos costó muchísimo convencerlo de ser amable. Fracasamos.»

### Victoria
- «¡GANADORES! No confundan esto con haber escapado.»
- «Qué final más hermoso. Casi parece escrito por alguien que no soy yo.»

### Interferencia
- «Ninguno debió recordar… [silencio] ¡Recordar traer provisiones! ¡Ja!»
- «¿Me oyen? ¿Me oyen de verda— ¡PUBLICIDAD!»

## Variaciones y enfriamiento

Cada trigger debe tener 3–8 variantes si es frecuente [POR BALANCEAR]; rareza/cooldown por `cueId`, `triggerGroup` y contexto narrativo. Para hechos persistentes, mencionar **solo valores realmente almacenados**. Los números y nombres se interpolan con formato y sanitización; no sintetizar insultos con nombres personalizados.

## Archivo estructurado

`05_DATA/dialogue_cues.csv` contiene ejemplos listos para motorizar. Los keys de audio son placeholders, no archivos de voz ya existentes. En fase 0 mapear al sistema real de audio e i18n.


---

# PARTE 22: 02_NARRATIVE/05_EPISODES_AND_SETPIECES.md

# Episodios del espectáculo — ideas creativas para ENCORE

> **[PROPUESTAS]** Esta colección es una caja de herramientas creativa. Ninguna pieza exige crear un mapa nuevo ni se considera aprobada automáticamente. El Director tiene humor de show televisivo macabro, pero su identidad verdadera sigue sin definirse.

## Gramática del espectáculo

Cada encuentro memorable necesita **presentación** (qué sucede), **regla** (qué debe hacer el jugador), **riesgo visible**, **contrajuego**, **recompensa o consecuencia**, **remate del Director** y **variaciones por loop**. Si falta contrajuego, no es un episodio: es un castigo.

## Doce episodios originales

### E01 — El patrocinador invisible

Una pantalla anuncia que el próximo teleportador está patrocinado por una marca industrial ficticia. Aparecen tres terminales, cada una ofrece una ventaja y un inconveniente explícitos. El equipo elige una por voto; la marca nunca se muestra entera. **Loop+**: el mismo eslogan aparece tachado con otro nombre.

### E02 — Corte de transmisión

La voz del Director desaparece durante unos segundos y quedan solo señales ambientales muy legibles. Los enemigos siguen bajo reglas existentes. Una terminal registra el silencio como «SEÑAL: PRESENTE / VOZ: AUSENTE». **Recompensa:** pista narrativa, no poderes arbitrarios.

### E03 — El bis más barato del universo

Pacto rápido en un monitor: sobrevivir a un evento corto para conseguir un objeto de rareza visible, con presión proporcional. **Remate:** «¡Sale más barato que la dignidad! Bueno, no investigué la dignidad».

### E04 — Sala de audiencias vacías

Un sector opcional contiene butacas mirando a una pantalla apagada. Resolver un puzzle de cables/interruptores (en solo o co-op) revela una frecuencia. En otra run, esa frecuencia cambia una línea del Director. Misterio persistente, sin recompensa de combate obligatoria.

### E05 — La máquina de aplausos

Máquina del Director que presenta 3 objetos, solo 1 seleccionable. Cada opción tiene efectos claros. El sonido de aplausos aumenta si hay una sinergia especialmente divertida, pero la máquina no altera en secreto el resultado de la elección.

### E06 — Festival de chatarra

Evento de teleportador en que la arena recibe piezas móviles desde sockets predefinidos. Es visible desde la preparación. El objetivo es sobrevivir/defender y usar cobertura; los elementos no aparecen debajo de personajes. En loops altos cambian combinaciones, no se destruye legibilidad.

### E07 — Audición final

Tres retos breves se presentan como «audiciones» durante exploración. Superar uno otorga una pista del ejecutor secreto; superar los tres puede revelar un sabotaje de arena final. No necesita mapear 3 niveles nuevos; usa sockets de stage compatibles.

### E08 — Error de continuidad

En el segundo loop, un landmark que ya conocían tiene un letrero distinto y un objeto de utilería imposible. El Director lo niega. Si el equipo investiga, descubre entrada de códice. La ruta principal sigue intacta.

### E09 — Los técnicos de producción

Se activa una defensa donde maquinaria autónoma intenta reparar el teleportador mientras enemigos atacan. Los participantes ayudan mediante combate y reparaciones sin skill check exclusivo de co-op. Respetar input del Survivor actual.

### E10 — Premio al peor amigo

Tras una tentación privada de impacto menor, el Director revela el episodio cuando la amenaza ya pasó. Muestra consecuencias claras y un chiste sin insultar al jugador real; puede silenciarse en ajustes sociales. La cooperación sigue siendo necesaria.

### E11 — La última butaca

Un hallazgo raro en loops avanzados sugiere que quizá no hay público. No hay exposición. La música se detiene brevemente, aparece un aplauso aislado y el juego sigue. El Director no comenta el hecho hasta una run posterior.

### E12 — La prueba de luces

La arena final puede tener varias torretas/focos peligrosos. Un puzzle completado en mapas anteriores permite desactivar **una** fuente de peligro. El boss fijo conserva patrones y dificultad principal. Se comunica claramente en briefing del FINAL ACT.

## Identidad del menú ENCORE [PROPUESTA]

La entrada al modo se presenta como un viejo aparato televisivo industrial integrado en el mundo de Junked Metal. Las opciones de lobby son botones táctiles/mando legibles: **Iniciar función**, **Invitar elenco**, **Pantallas y dispositivos**, **Códice**, **Historial**, **Accesibilidad**. El menú no se convierte en un show largo antes de jugar; la intro es saltable.

## Ficha de personaje del Director [PROPUESTA]

En vez de revelar retrato, construir una **firma gráfica** reconocible: tres barras horizontales como señal de transmisión, un iris/obturador y una sonrisa que parece una luz de ON AIR. A medida que se avanza, la firma se desvía unos píxeles o pierde un fotograma; siempre con una opción de reducir movimiento y sin simular errores reales del navegador.

## Marcadores de calidad

Un episodio nuevo se acepta solo si: puede describirse en una frase, no exige más de 20 segundos de explicación, su riesgo es justo, tiene recompensa o revelación significativa, se puede ejecutar en solo, no requiere copiar assets protegidos y no genera más deuda técnica que diversión.


---

# PARTE 23: 03_ENGINEERING/01_ARCHITECTURE.md

# Arquitectura de referencia — modular, auditable y evolutiva

> **[PROPUESTA]** No se inspeccionó código de Junked Metal. Esta arquitectura define responsabilidades e interfaces; el agente debe mapearla al stack real y proponer alternativas antes de introducir frameworks nuevos.

## Topología conceptual

```text
UI y dispositivos ──> Session/Participant Registry ──> Run Orchestrator
            ├── Viewports/Input Router             ├── World/Route Planner
            ├── Director Presentation               ├── Time/Pacing/Threat Director
            ├── Local/Remote Device Bridge           ├── Encounters/Teleporter
            └── Co-op HUD                            ├── Combat/XP/Inventory/Pacts
                                                     ├── Boss/FINAL ACT
                                                     └── Persistence/Event Log
                                     ↑
                         Transport + Host Authority
```

Servicios acoplados mediante comandos/eventos versionados, no imports circulares. Gameplay autoritativo procesa eventos serializados; render/audio leen proyecciones de estado. La UI nunca ajusta daño/dinero/loot desde el cliente.

## Capas propuestas

1. **Domain** (`run`, `player`, `loot`, `pact`, `director`, `map`, `boss`): estado y reglas puras, comprobables sin renderer.
2. **Application** (`RunOrchestrator`, `JoinFlow`, `HostMigration`, `VoteCoordinator`, `SaveCoordinator`): comandos, orden y transacciones.
3. **Adapters**: combate y spawn de Survivor, scene loader, physics, audio, input, gamepad, network, storage.
4. **Presentation**: HUD, cámaras, subtítulos, pantallas del Director, ventanas/segundas pantallas, QR.
5. **Developer tooling**: simulador, replay de comandos, seed inspector, event tracers, performance budgets.

## Contratos canónicos

```ts
type ParticipantId = string;
type RunId = string;
type StageId = string;
type Command = { commandId: string; runId: RunId; actorId: ParticipantId;
  epoch: number; expectedRevision: number; type: string; payload: unknown };
type DomainEvent = { eventId: string; runId: RunId; revision: number;
  authorityEpoch: number; atActiveMs: number; type: string; payload: unknown };
```

`commandId` evita repetición; `revision` ordena; `epoch` evita dos hosts con autoridad simultánea. Los payloads deben validarse por esquema y capacidad; una API «unknown» deliberadamente no autoriza confiar en cliente.

## Invariantes de dominio

- `activeParticipants <= 4`, IDs no reutilizados durante run.
- `completedStagesInLoop >= 4` antes de FINAL ACT.
- `bossId` inmutable desde inicio hasta cierre de run.
- `scrapBalance >= 0`; compras idempotentes con propietario del objeto válido.
- `runState = CLOSED` bloquea todos los comandos de gameplay.
- `timeActive` es monotónico salvo cargar snapshot consistente.
- `stageSeed` y `runSeed` iguales para peers sin importar número de viewports.
- `severeTeamPact` requiere política de votos satisfecha.
- `multiscreenViewer` no se considera participant ni obtiene autoridad.

## Flujo transaccional de comando

1. Recibir comando con identidad autenticada o token de sesión.
2. Comprobar epoch, revision, fase actual, slot, capacidad, idempotencia.
3. Ejecutar reglas puras en host autoritativo; si error, responder código explicable.
4. Emitir evento y nueva revision.
5. Persistir en log/snapshot según política.
6. Publicar proyección a clientes y render; confirmar comando.

En un juego de acción en tiempo real, no todos los inputs se convierten en transacciones persistidas; movimiento/predicción usa red rápida con simulación autoritativa, reconciliación y estados delta. **Las mutaciones económicas/decisiones irreversibles sí requieren transacciones.**

## Reutilización Survivor: estrategia *strangler*

- Auditar `SurvivorGame` y superficies de configuración.
- Introducir un `GameModeAdapter` que exponga controles/combate sin cambiar contratos del modo original.
- Reutilizar servicios existentes solo tras pruebas de compatibilidad.
- Extraer componentes genéricos de manera gradual, con tests regresivos de Survivor tras cada refactor.
- No inventar rutas de archivos ni package names en esta especificación.

## Networking de alta frecuencia

Propuesta: host authoritative con entradas secuenciadas y replicación con snapshots/deltas; interpolación en peers; predicción local solo para movimiento si el stack lo permite. La física y combate determinista entre browsers pueden variar; **no basar host migration solo en lockstep perfecto sin demostrar determinismo**. Snapshots completos con epoch son más robustos.

## Observabilidad

`run_started, stage_completed, director_phase_changed, director_budget, teleport_event_started, pact_offered/accepted/settled, item_purchased/evolved, player_downed/revived, checkpoint_committed, migration_started/completed/failed, final_act_started, boss_defeated, run_closed`.

No enviar nombres privados ni voz/chat sin consentimiento; registrar IDs seudónimos y eventos útiles para depuración.

## Design review de la fase 0

Antes de codificar: identificar motor, lenguaje, renderer, física, routing, state store, server/signaling, modelo de hosting, cámaras/inputs, assets y estructura real; registrar decisión arquitectónica (ADR) con alternativas y costo. Si existe un motor que ya resuelve MultiScreen/multiplayer, reusar.


---

# PARTE 24: 03_ENGINEERING/02_NETWORKING_AND_MIGRATION.md

# Red: 1–4 online/local/mixto, host migration y join-in-progress

## Distinciones esenciales

**Participante** ≠ **conexión** ≠ **dispositivo** ≠ **viewport**. Ejemplo: computadora A hospeda la run con dos participantes locales; computador B conecta un participante y smartphone C muestra cámara de A, sin participante nuevo. Una máquina puede alojar varias cámaras físicas o streamings sin aumentar plazas.

## Autoridad

Propuesta de primera arquitectura: **host autoritativo** con canales de datos para inputs/eventos; peers aplican snapshots/deltas. Los comandos irreversibles (botín, votos, pactos, boss, timers, save) se resuelven en host. Sistemas de señalización/STUN/TURN/reconexión requieren infraestructura o servicio existente [POR AUDITAR]. El modo local sin red debe usar la misma simulación, pero múltiples inputs.

## Conectividad [PROPUESTA]

- Signaling server de salas con tokens temporales, no datos de juego autoritativos.
- Data channels WebRTC o transporte existente; enviar inputs de alta frecuencia con canal apropiado y comandos confirmados por canal confiable.
- Relay TURN para redes donde P2P falla, con coste de ancho de banda que debe medirse.
- Emparejamiento/mando remoto diferente de unir participante online (ver MultiScreen).
- Compatibilidad con navegadores de escritorio y móvil: prueba, no presunción.

## Migración de anfitrión

**Desafío:** los participantes deben tener un estado reciente lo bastante completo para continuar la simulación. **No basta con elegir otro host**; hay que transferir autoridad, RNG, entidades, economía y Director.

Estados recomendados:

`RUNNING → HOST_LOST → FROZEN → ELECTION → RESTORE_SNAPSHOT → RECONCILE → RESUME`.

1. Host envía snapshots versionados y diffs/eventos a réplicas autorizadas con checkpoint hashes.
2. Detección de pérdida por timeout/canal cerrado; detener decisiones irreversibles.
3. Determinar *epoch* nuevo; elegir peer elegible con snapshot de mayor revisión verificada, latencia/capacidad adecuadas.
4. Nueva autoridad carga snapshot, reejecuta eventos confirmados que falten, reasigna conexión e incrementa epoch.
5. Los clientes descartan comandos del epoch anterior (evitar split brain).
6. Reconciliar inputs recientes, reanudar el reloj activo desde valor guardado y notificar.
7. Si no hay peer válido: suspender/run recovery desde checkpoint estable, **no** simular continuidad instantánea ficticia.

**[POR DISEÑAR]** Arbitraje de epoch con signaling/coordinador de sala. Sin un coordinador confiable, dos hosts pueden proclamarse líderes. El roadmap incluye prueba de *split-brain* antes de declarar la función terminada.

## Reconnect

Participante existente reingresa cualquier momento seguro con `rejoinToken` rotatorio, `participantId`, `runId`, `lastKnownRevision`, no crea player nuevo. Mientras está offline, su inventario queda reservado. Rejoin obtiene snapshot autoritativo y se restaura control al completarse sync; si combate sigue activo, aparecer en estado/sitio seguro y no atravesar la escena invulnerable sin límite.

## Incorporación tardía

Jugador **nuevo** solamente durante `STAGE_RESOLVE`, `ROUTE_VOTE` o `STAGE_LOAD` prevalidado, nunca en combate o boss. Validar slot libre (<4). Kit de bienvenida generado una sola vez con `joiningRewardTxnId`, seed y tabla ligada a loop y niveles del equipo; sin duplicación por reintento. Mostrar intro breve del Director omitible.

## Salida definitiva

Al declararse `LEFT_PERMANENT`, cerrar token anterior, ofrecer transferencia voluntaria a otros si procede, liberar plaza solo cuando la transferencia se confirma o cancela; nunca abandonar recursos flotando en un estado explotable. Reducir capacidad de encuentros gradualmente con histeresis.

## Votos

- Rutas: votar solo entre destinos de grafo elegible.
- Teleportador: «ready» individual; evento inicia cuando todos activos preparados, sujeto a política visible de AFK.
- FINAL ACT: mayoría entre ENCORE!/FINAL ACT; empates se repiten; después cierre de voto y confirmación de transición.
- Pactos: política según gravedad, más estricta que tentaciones menores.

Evitar que jugadores controlados desde el mismo dispositivo voten bajo una sola identidad de conexión; **cada participantId tiene voto propio**.

## Save/recover sin servidor dedicado

La partida puede ejecutarse en host de un jugador, pero la reanudación «otro día» requiere que al menos un responsable tenga snapshot persistente y clave/token. **Si ningún dispositivo conserva el estado, no habrá recuperación**. Opciones: guardar snapshots cifrados y firmados localmente, sincronizar en todos los peers autorizados o almacenar en backend. Evaluar seguridad y UX frente a costes. La confirmación de visión no significa que el backend exista.

## Pruebas de caos mínimas

Desconectar anfitrión en exploración, pacto aceptado, teleportador ready, boss final y durante compra; pérdida de paquetes; peers con snapshots inconsistentes; dos hosts candidatas; rejoin desde móvil; 2 jugadores locales + 2 remotos; 4 pantallas con inputs independientes. **No duplicar loot ni perder estado de run** salvo si se usa rollback explícito a un checkpoint consistente después de fallo irrecuperable, y nunca para evitar derrota.


---

# PARTE 25: 03_ENGINEERING/03_MULTISCREEN.md

# ENCORE MultiScreen — cámaras, TV, ventanas y teléfonos

## Capacidad aprobada

Hasta 4 participantes en una run, pero **número de pantallas diferente de número de jugadores**. En una partida local/mixta: split-screen 2–4, cámara compartida opcional, cámara en ventana separada, televisión vía salida de sistema/casting compatible y teléfono mediante vinculación segura.

## Tres funciones móviles

| Rol | Video | Input | Crea participantId |
|---|---|---|---|
| `VIEWER` | Recibe cámara designada | No | No |
| `CONTROLLER` | Opcional vista mínima/status | Envía input táctil a jugador asignado | No, se vincula a existente |
| `FULL_PLAYER` | Recibe cámara + UI | Envía input táctil | Sí **solo si** fue admitido como jugador dentro de 4; de lo contrario asocia a existente |

Distinguir `FULL_PLAYER` vía **stream** (render en host) de ejecución nativa del motor en móvil (solo si auditoría confirma viabilidad). El usuario pidió ambas funciones, no asumió que el teléfono tenga GPU capaz de render completo.

## Modos de visualización

- `SPLIT_2`: horizontal o vertical según aspect ratio.
- `SPLIT_3_4`: grilla 2×2, incluyendo cuarto panel configurable si son tres.
- `SHARED_CAMERA`: seguir centro/grupo y avisar límites; requiere test de jugabilidad.
- `DETACHED_WINDOW`: vista exclusiva en nueva ventana/popup de mismo origen; depende de permisos de browser y arquitectura del renderer.
- `REMOTE_SCREEN`: video de cámara por WebRTC hacia TV con browser o teléfono.
- `OS_CAST`: duplicación/casting del sistema operativo como fallback.

## Restricciones técnicas reales

1. Una ventana JavaScript nueva no puede renderizar automáticamente el mismo canvas GPU de otra: requiere render secundario, compartir datos, canvas espejo o capturar video.
2. `BroadcastChannel` sirve para coordinación de pestañas en contexto de origen compatible, **no** transporte a otro teléfono o red.
3. `canvas.captureStream()` puede proveer video desde canvas compatible; renderizar cámaras separadas puede necesitar render targets y canvas/video independientes.
4. WebRTC exige signaling, STUN/TURN frecuente en internet, manejo de codecs y red; latencia no está garantizada.
5. Chromecast/AirPlay/API de Presentation tienen cobertura desigual; ofrecer fallback HDMI/casting nativo/enlace navegador.
6. Capturar cuatro cámaras 3D exige presupuesto GPU; un host pequeño puede no soportar cuatro streams a 60 fps. Adaptación de resolución/FPS por receptor es obligatoria.
7. Touch remoto añade latencia extra; mantener HUD y controles dimensionados para móvil y opción mando separado.

## Emparejamiento QR/código

`CREATE_PAIR_REQUEST → SHOW_QR_AND_SHORT_CODE → DEVICE_CONNECT → HOST_APPROVES → ASSIGN_ROLE → ACTIVE → REVOKED/EXPIRED`.

- Token temporal, un solo uso, TTL corto; QR no incluye credenciales permanentes.
- Anfitrión ve nombre genérico del dispositivo y permisos solicitados, puede aprobar/revocar.
- Recordar preferencias locales **no** equivale a reutilizar autorización indefinida.
- Cada rol restringe mensajes; VIEWER jamás envía input gameplay y CONTROLLER jamás ve cámara no autorizada.
- Cambio de rol durante run requiere comprobación para evitar doble input y apropiación de cámara.

## Input router

`physicalInput → deviceBinding → participantId → validatedInputActions`. Multiplex gamepads y touch por participante; menú contextual por viewport; bloqueo de foco para evitar que dos jugadores respondan al mismo teclado. Si móvil pierde conexión, el input se neutraliza con seguridad (no mantener disparo continuo).

## Audio

Definir salidas: voz Director, SFX, música, mensajes personales, audio del juego y futuro chat de voz. En TV y móviles próximos, silenciar duplicados opcionalmente. Pactos privados nunca deben aparecer en una pantalla de espectador público por error. Subtítulos privados en dispositivo correcto.

## Interfaz «Pantallas y dispositivos» [PROPUESTA]

Lista de participantes (máx. 4), lista de pantallas, asignación drag/drop con alternativa accesible, botón «Añadir dispositivo», QR/código, aprobar, cambiar rol, expulsar, calidad, test de latencia y audio. Mostrar cuando una capacidad no está soportada por navegador, sin botón engañoso.

## Perf budget [POR BALANCEAR]

Perfiles `ECO 480p/20-30fps`, `BALANCED 720p/30fps`, `HIGH 1080p/30-60fps` como objetivos tentativos por stream, nunca garantías. Priorizar responsive input y simulación sobre codificación de video. Registrar render ms, encode ms, RTT, packet loss, bitrate y thermal warning si API disponible.

## Criterios de aceptación

- Receptor vinculado VIEWER no puede mover al personaje.
- Una pantalla nueva no consume plaza.
- Un jugador local puede jugar mirando TV con teléfono como mando.
- Dos móviles ven cámaras separadas sin recibir pactos privados ajenos.
- Revocar el dispositivo corta señal/input sin detener la run.
- Si falla streaming, gameplay continúa y se muestra fallback.


---

# PARTE 26: 03_ENGINEERING/04_SAVE_AND_STATE.md

# Persistencia: snapshots, reanudación y consistencia

## Objetivo

Suspender expediciones largas y reanudarlas días después; reconectar al perder internet; migrar anfitrión; impedir duplicaciones o volver a un estado previo para escapar de una derrota. Los snapshots son persistencia **de juego**, no puntos libres para «save scumming».

## Tres niveles de datos

1. **Perfil persistente**: desbloqueos, hallazgos, logros, historial narrativo del Director, ajustes; por `profileId`.
2. **Run state**: seed, escena actual, loop, stage, boss secreto, inventarios, chatarra, XP, pactos, votos, RNG streams, timers activos, flags de secretos, event log.
3. **Estado efímero de render**: partículas, animación cosmética, cámaras, UI, conexiones WebRTC; se reconstruye, no necesita snapshots de gameplay.

## Snapshot versionado

Campos críticos: `schemaVersion`, `contentVersion`, `runId`, `revision`, `authorityEpoch`, `checksum`, `savedAt`, `activeDuration`, `state`, `rngStreams`, `participants`, `world`, `director`, `economy`, `eventsApplied`.

Las colecciones con objetos inventarios deben usar IDs únicos por instancia (`instanceId`) y transacciones; no solo contador de unidades, para evitar dupe accidental.

## Puntos de guardado

- **Autoguardado confirmado:** al completar escenario y antes de permitir viaje.
- **Guardado operativo [PROPUESTA]:** durante transición de sesión, migración, recompensas y estado replicado, sujeto a atomicidad; recuperación de combate por evento/snapshot sin ofrecer rollback explotable.
- **Suspensión:** sólo cuando el estado es consistente, con voto/autoridad del anfitrión y política para compañeros desconectados.

## Algoritmo de commit

`prepare(snapshot) → validate invariants → write temp + checksum → fsync/server ack → atomic commit → announce revision`. Si existe backend: transacción o compare-and-swap por `revision`; si es archivo local: escritura atómica cuando plataforma lo permita. Clientes no sobrescriben estado autoritativo con versiones anteriores.

## Snapshot + event log

Guardar snapshot periódico + eventos compactos posteriores permite migración/replay sin guardar cada input. Los eventos de economía deben tener claves idempotentes. No se requiere determinismo bit a bit del renderer, sí coherencia del estado autoritativo. En caso de fallo de restore, cerrar de manera segura y explicar al jugador, nunca otorgar infinitos objetos.

## Ejemplos de restauración

- **Corte internet de 1 jugador:** mantiene reserva, reconecta a authority, reconstruye UI y cámara.
- **Corte de host:** peer replica válida con epoch superior, restauración y reconcile.
- **Suspensión voluntaria:** congelar cronómetros activos, guardar fase/seed/inventarios/pactos; continuar días después.
- **Cierre en boss final:** restaurar únicamente si existe snapshot consistente del estado combatible; si la plataforma no puede garantizarlo, documentar límites antes de habilitar guardado durante bosses.

## Acceso y privacidad

Metadatos de sala y perfil almacenados con mínima información, tokens rotativos, control de acceso por participantId. No guardar transmisiones de voz ni video en snapshots. Historial narrativo del Director debe poder reiniciarse/borrarse a petición mediante controles de producto futuros [PROPUESTA].

## Matriz de aceptación

Snapshot migrado conserva boss oculto, seed, reloj, chatarra, votos, pactos secretos sin filtrarlos a otros jugadores y selección de mejoras pendiente. Guardado con objetos duplicate IDs es inválido. Replay de `rewardGranted(eventId)` dos veces concede una vez.


---

# PARTE 27: 03_ENGINEERING/05_DATA_AND_EVENTS.md

# Contratos de datos, comandos y eventos

## Criterio

Los archivos `05_DATA/` son **esquemas y datasets de ejemplo**, no implementación de estructuras existentes. La fase 0 debe crear un mapa de campos reales y migraciones si el juego ya maneja estado de partida.

## IDs y versiones

IDs estables por `runId`, `stageInstanceId`, `participantId`, `itemInstanceId`, `pactOfferId` y `rewardTxnId`. Tipos sin depender de número local del player. Cada cambio que rompe compatibilidad exige `schemaVersion` y migración o rechazo explícito.

## Inventario de comandos

| Comando | Permiso | Condición |
|---|---|---|
| `PROPOSE_PORTAL` | jugador activo | portal descubierto, explorando |
| `SET_READY` | titular de participante | etapa de preparación |
| `CAST_ROUTE_VOTE` | participante elegible | destinos validos |
| `CAST_FINAL_VOTE` | participante elegible | ≥4 mapas ciclo actual |
| `ACCEPT_PACT` | destino autorizado | oferta activa + consentimiento |
| `PURCHASE_ITEM` | participante autorizado | saldo + stock + cap |
| `CLAIM_LEVEL_UP` | titular | crédito de elección disponible |
| `TRANSFER_ITEM` | propietario + destinatario | consentimiento y estado estable |
| `RESCUE_ALLY` | jugador vivo | aliado caído y en rango |
| `PAIR_DEVICE` | anfitrión | token corto válido + autorización |
| `JOIN_RUN` | anfitrión / sistema | jugador nuevo solo entre etapas |
| `REJOIN_RUN` | dueño de token | participante previamente registrado |
| `SUSPEND_RUN` | política sala | fase consistente y confirmación |

## Catálogo de eventos

`RUN_STARTED`, `STAGE_ENTERED`, `XP_GAINED`, `PLAYER_LEVEL_AVAILABLE`, `ITEM_PURCHASED`, `ITEM_EVOLVED`, `PACT_OFFERED`, `PACT_ACCEPTED`, `PACT_SETTLED`, `PLAYER_DOWNED`, `PLAYER_REVIVED`, `PLAYER_ELIMINATED`, `TELEPORTER_DISCOVERED`, `TELEPORTER_EVENT_STARTED`, `STAGE_COMPLETED`, `ROUTE_SELECTED`, `LOOP_STARTED`, `FINAL_ACT_SELECTED`, `BOSS_REVEALED`, `BOSS_DEFEATED`, `TEAM_WIPED`, `RUN_CLOSED`, `SAVE_COMMITTED`, `HOST_MIGRATED`.

## Ejemplo de evento

```json
{
  "eventId": "evt-000042", "runId": "run-demo-001",
  "revision": 42, "authorityEpoch": 2, "atActiveMs": 182000,
  "type": "ITEM_PURCHASED", "payload": {
    "transactionId": "purchase-abc", "buyerId": "p1",
    "itemInstanceId": "itm-f93", "itemId": "placeholder_coil",
    "currency": "SCRAP", "cost": 130
  }
}
```

## Invariantes de catálogo

Un item no referencia sinergias inexistentes; un evento de teleportador no exige un enemy pool no compatible; un boss compatible tiene adaptador y arena; una pista del jefe seleccionado no apunta a boss distinto. Validación de config antes de habilitar versión de contenido.

## Migración de versión

Guardar build/content hash. No permitir reanudar una run de un build incompatible sin migración probada; ofrecer mensaje explicativo y export/soporte, no borrar silenciosamente. Los event logs redactados son útiles para informes de errores sin nombres/identificadores privados.


---

# PARTE 28: 03_ENGINEERING/06_UI_UX_AND_ACCESSIBILITY.md

# UX de ENCORE: compacto, teatral y accesible

## Principio

La pantalla debe ayudar a sobrevivir, no convertirse en otro enemigo. El estilo Retro-Industrial Folded 2.5D vive en componentes compactos, bordes mecánicos, jerarquías precisas y microinteracciones artesanales; no en paneles gigantes de chapa.

## HUD mínimo visible

`RUN 18:42 | MAPA 03/04 | LOOP 02 | AMENAZA: HOSTIL` junto a salud/recursos/estado de habilidad; tiempo de etapa y presión detallada como segunda capa para quien lo habilite. Evitar presentar triple reloj como tres cronómetros gigantes; la presión del Director puede ser indicador/código visual accesible con etiqueta, no tiempo duplicado.

## Disposición según modo

- **1 viewport:** HUD amplio pero compacto, pistas contextuales a margen.
- **2 splits:** HUD simplificado, texto 14–16px equivalente según resolución/densidad, subtítulos locales.
- **3–4 splits:** priorizar números críticos y pictogramas inequívocos; selector nivel en mini panel propio.
- **Teléfono:** controles táctiles de pulgar, safe areas, feedback háptico opcional; mostrar funcionalidad importante sin cubrir centro.
- **TV:** legibilidad a distancia y foco visible de gamepad.

## Interacciones de alto valor

- `PING`: marcar portal, objeto, ruta, peligro, secreto. Color + ícono + etiqueta, nunca solo color.
- `LEVEL_PENDING`: contador en esquina que no roba foco; selección de 3 mejoras sin pausar.
- `PACT_OFFER`: invitación no intrusiva con duración/impacto y ver detalles; privadas solo en viewport correcto.
- `READY_CHECK`: indicador de cada participante y cuenta de preparación, cancelable hasta lock.
- `FINAL_VOTE`: ENCORE! vs FINAL ACT con consecuencia irreversible explicada.
- `DIRECTOR_BROADCAST`: subtítulo compacto/voz, skip de intros y limitación de spam.
- `PAIR_DEVICE`: QR, código legible, autorización y botón revocar.

## Pantalla de fin

Presentación breve del Director seguida de informe útil: victoria o wipe, duración, loop, rutas, boss, daño, ayudas/rescates, pactos, secretos, mayor sinergia y recompensa meta. No competir por un «MVP» que devalúe roles de apoyo.

## Accesibilidad imprescindible

Tamaño HUD/subtítulos, fuentes legibles, contraste, alternativa a colores, lectura para pantalla dividida, control por teclado/gamepad/touch, remapeo de teclas si ya lo soporta el juego, vibración opcional, reduced motion/flashes, subtítulos de eventos sin audio, control individual del Director, modo silencioso de reveal social, confirmaciones para acciones irreversibles.

## Buenas sensaciones

Cada acción importante confirma su resultado: compra, intercambio, listo, voto, pacto, rescate, conexión de móvil. Evitar «hizo clic pero no sé qué pasó». Los estados vacíos y los fallos de red deben explicar qué hacer. La sensación premium depende de que el juego sea confiable tanto como de lo vistoso de las animaciones.


---

# PARTE 29: 03_ENGINEERING/07_SECURITY_AND_PRIVACY.md

# Seguridad, privacidad y resiliencia

## Superficies de ataque

Tokens QR/código de pairing, sesiones online, señales WebRTC, voto remoto, APIs de items/scrap, snapshots de estado, perfiles persistentes, pantallas receptoras de pactos privados, host migration y reportes de eventos.

## Reglas

- Autorizar **por rol**: espectador solo recibe video permitido; controlador emite input solo para participantId asignado; host confirma pairing/cambio de rol.
- Tokens efímeros (TTL, un solo uso, revocables), conexión cifrada donde corresponda, límites de intentos y registro de eventos de pairing.
- La UI de pactos secretos no puede transmitirse por error a espectadores o viewports de otros usuarios.
- Toda compra, recompensa, XP, cambio de mapa y elección de boss se valida en autoridad con idempotencia.
- Migración de host usa epochs y quorum/arbitraje para evitar doble autoridad; P2P no asegura anticheat perfecto y debe explicarse en documentación técnica.
- Guardar solo metadatos narrativos necesarios; no retener video/voz de cámaras remotas por defecto.
- Sustituir nombres de dispositivo/usuario por alias seguros en logs, siempre con posibilidad de depuración con consentimiento.

## UX segura

Botones de «Desvincular», «Expulsar pantalla», «Silenciar revelaciones personales», «Eliminar datos narrativos» [función propuesta], «Revisar sesiones». No revelar contraseña/código de sala en streaming visible públicamente si compromete acceso.

## Riesgos específicos

- **Denegación de servicio por videos:** limitar streams y bitrate.
- **Abuso de chat/locución social:** mensajes del Director basados en hechos, no suposiciones sobre personas reales.
- **Dupe de ítems:** transaction IDs e inventario reconciliado.
- **Replay de QR/código:** expiración + autorización + nonce.
- **Host malicioso:** modelo P2P host-authoritative no es igual de seguro que servidor dedicado; las recompensas permanentes deberían validarse mediante backend si tienen valor externo o competitivo.


---

# PARTE 30: 04_PRODUCTION/01_ROADMAP.md

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


---

# PARTE 31: 04_PRODUCTION/02_BACKLOG.md

# Backlog por epic — IDs estables para Linear/GitHub/Codex

Prioridad `P0` requisito de núcleo; `P1` requerido para producto completo; `P2` expansión/pulido. Ninguna tarea implica que se haya implementado.

| ID | Prio | Fase | Historia / tarea | Verificación |
|---|---|---|---|---|
| ENC-001 | P0 | R0 | Mapear codebase Survivor y cámara | rutas/tests encontrados |
| ENC-002 | P0 | R0 | Auditar nivel Luna y performance | informe con mediciones |
| ENC-003 | P0 | R0 | Enumerar bosses reales y compatibilidad | tabla sin nombres inventados |
| ENC-004 | P0 | R0 | Auditar networking/saves/inputs | ADR firmado |
| ENC-005 | P0 | R0 | Registrar baseline regresión de todos los modos | tests ejecutables |
| ENC-010 | P0 | R1 | Máquina de estado Run/Stage | invariantes test |
| ENC-011 | P0 | R1 | Relojes global/local y pausas | monotonicidad |
| ENC-012 | P0 | R1 | Director simple con budgets | caps probados |
| ENC-013 | P0 | R1 | XP grupal y elección 3 cartas | sin pausa global |
| ENC-014 | P0 | R1 | Chatarra temporal y cofre | compras atómicas |
| ENC-015 | P0 | R1 | Teleporter discover/ready/event | un único disparo |
| ENC-016 | P0 | R1 | HUD mínimo de amenaza y tiempo | legible |
| ENC-020 | P0 | R2 | Grafo de rutas y candidatos | no softlocks |
| ENC-021 | P0 | R2 | Generación por seeds con validadores | seeds reproducibles |
| ENC-022 | P0 | R2 | Loop tras cuatro etapas | progresión correcta |
| ENC-023 | P0 | R2 | Guardado de etapa | reanuda mismo estado |
| ENC-030 | P1 | R3 | Pacing de cinco fases | logs de transiciones |
| ENC-031 | P1 | R3 | Mood y memoria Director | no inventa hechos |
| ENC-032 | P1 | R3 | Pantallas/voz/subtítulos | fallback texto |
| ENC-033 | P1 | R3 | Varias variantes de portal | preanuncio coincide |
| ENC-034 | P1 | R3 | Pactos rápidos con consentimiento | liquidación única |
| ENC-040 | P1 | R4 | Catálogo item/rara/stacking | cap y validación |
| ENC-041 | P1 | R4 | Tienda/máquina/recicladora | costos claros |
| ENC-042 | P1 | R4 | Interacciones entre tags | proc cap |
| ENC-043 | P1 | R4 | Evoluciones y códice | descubrimiento persistente |
| ENC-044 | P1 | R4 | Precios dinámicos con techo | no inflación rota |
| ENC-050 | P0 | R5 | Sorteo boss secreto inmutable | same after restore |
| ENC-051 | P0 | R5 | Arena y adaptadores de Survivor | boss compatible |
| ENC-052 | P1 | R5 | Pistas/revelaciones/sabotajes | no reroll |
| ENC-053 | P0 | R5 | ENCORE vs FINAL ACT poll | mayoría/empate |
| ENC-054 | P0 | R5 | Cierre final + metareward | no doble premio |
| ENC-060 | P0 | R6 | Registry de 1–4 jugadores | IDs por participante |
| ENC-061 | P0 | R6 | Net authority/snapshots/deltas | sincronía bajo lag |
| ENC-062 | P0 | R6 | XP y scrap compartidas reales | no dupes |
| ENC-063 | P0 | R6 | Rescate/caída/retorno etapa | full wipe |
| ENC-064 | P1 | R6 | Kit late join entre mapas | equilibrado |
| ENC-065 | P1 | R6 | Pactos/votos por participante | consentimiento correcto |
| ENC-070 | P0 | R7 | Input router 4 local | no cross control |
| ENC-071 | P1 | R7 | Split 2/3/4 + cámara shared | legibilidad y FPS |
| ENC-072 | P1 | R7 | Ventana separada/TV fallback | renderer validado |
| ENC-073 | P0 | R7 | 2 local + 2 online | cuatro slots exactos |
| ENC-080 | P1 | R8 | Pair QR/código y aprobación | revocar token |
| ENC-081 | P1 | R8 | WebRTC video receiver | RTT/FPS monitoreados |
| ENC-082 | P1 | R8 | Controlador móvil touch | input bound al jugador |
| ENC-083 | P1 | R8 | Móvil jugador completo | video + input sin slot extra |
| ENC-084 | P1 | R8 | Pantalla privada sin leaks | pruebas rol |
| ENC-090 | P0 | R9 | Snapshots/versionado/idempotencia | replay sin dupes |
| ENC-091 | P0 | R9 | Host election/epoch/recovery | sin split-brain |
| ENC-092 | P0 | R9 | Suspensión voluntaria | duración sin deriva |
| ENC-093 | P1 | R9 | Reconnect durante run | build preservada |
| ENC-094 | P1 | R9 | Abandono y cesión voluntaria | transacción segura |
| ENC-100 | P1 | R10 | Pactos largos/secretos | no griefing |
| ENC-101 | P1 | R10 | Evolución de mapas/secretos | solo siempre posible |
| ENC-102 | P1 | R10 | Director narrativa tier/diálogos | cooldowns |
| ENC-103 | P1 | R10 | LOD, 4 cámaras y VFX budgets | target FPS |
| ENC-104 | P1 | R10 | Accesibilidad y localización | matriz QA |
| ENC-105 | P1 | R10 | Stress/network/browser/device tests | reportes reproducibles |
| ENC-106 | P2 | R10 | Evolución visual/sonora avanzada | dirección aprobada |

## Convención de issue

**Contexto:** archivo fuente + decisión D-xxx. **Alcance:** exactamente un subsistema. **Cambios aceptables:** lista acotada. **Fuera de alcance:** evitar refactor accidental. **Criterios:** tests/escenas/input/budget. **Pruebas:** comando y resultado. **Rollback:** forma segura de deshacer sin perder datos. **Dependencia:** issue previo cerrado.

## Regla de trabajo

No marcar nada como DONE sin diff real, tests y revisión visual en el repositorio auténtico. El backlog es un contrato de trabajo, no un changelog de implementación.


---

# PARTE 32: 04_PRODUCTION/03_TEST_AND_BALANCE.md

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


---

# PARTE 33: 04_PRODUCTION/04_METRICS.md

# Telemetría de producto y observabilidad

## Propósito

Tomar decisiones de balance basadas en evidencia, no convertir cada interacción en vigilancia. Priorizar telemetría local para QA y mínima producción agregada con consentimiento cuando corresponda.

## Eventos de alto valor

| Evento | Campos permitidos sugeridos | Hipótesis |
|---|---|---|
| `run_started` | run id seudónimo, party size, build | ¿Ingresan grupos completos? |
| `stage_started` | stage id, loop, threat band | ¿Dónde cae el ritmo? |
| `portal_discovered` | stage elapsed, hint tier | ¿Es excesiva la búsqueda? |
| `portal_activated` | elapsed, event type, party size | ¿El equipo decide avanzar? |
| `pact_offered` | category, offered tier | ¿Las oportunidades son claras? |
| `pact_accepted` | pact id, opt-in | ¿Hay riesgo/recompensa atractivos? |
| `level_choice` | options tags, selection, rerolls | ¿La aleatoriedad ofrece agencia? |
| `item_evolved` | recipe id, stack depth | ¿Existen builds diferentes? |
| `loop_decision` | ENCORE/FINAL, loop | ¿El bis es tentador? |
| `run_ended` | victory/wipe/abandon, duration, loop | ¿La curva de éxito es razonable? |
| `host_migrated` | result, duration, revision gap | ¿Es resiliente? |
| `multiscreen_started` | role, target profile, codec | ¿El streaming funciona? |

## Medición de experiencia

- Tiempo hasta primer momento divertido (autorreporte, no solo logs).
- % jugadores que entienden el dilema de tiempo/loot.
- Clasificación de molestias: UI / host / lag / pacto / búsqueda / duración.
- Tasa de acuerdos de votos, número de revotaciones.
- Tiempo esperando incapacitado o muerto hasta próximo mapa.
- Incidentes de pantalla privada visible indebidamente (objetivo cero).

## Rendimiento

FPS p50/p95, CPU/GPU frame time, entidad count, particles/procs por frame, encoder ms, WebRTC RTT/jitter/packet loss, reconnect duration, snapshot size, event log growth. Registrar sin ID personal persistente salvo necesidad operativa y consentimiento.

## Registro para balance

Cada decisión del Director debe contener: `why`, `threat`, `phase`, `mood`, `budget`, `activePlayers`, `candidatePool`, `seedStream`. Un tester debe poder explicar por qué apareció un enemigo/evento, no solo que apareció.

## Señales negativas y corrección

Si la tasa de victoria aumenta al reducir exploración, revisar economía de riesgo. Si familias de builds monopolizan, mejorar opciones subutilizadas antes de aplicar nerf universal. Si grupos de cuatro no completan por FPS, optimizar antes de aumentar recompensas. Si el Director molesta, reducir frecuencia antes de quitar personalidad.


---

# PARTE 34: 04_PRODUCTION/05_CONTENT_PIPELINE.md

# Pipeline de producción — contenido sin deuda artística

## Problema a resolver

ENCORE tiene muchos sistemas con potencial de variantes. Para evitar reescribir código por cada objeto, pacto, enemy wave o televisor, crear catálogos declarativos con validadores automáticos y herramientas visuales de previsualización.

## Flujo propuesto

**Idea → ficha de diseño → prefab/asset reusable → config JSON/TS → validador → escena de QA → performance → catálogo de build → release**.

## Unidades reutilizables

- **Map module:** landmark, portal socket, secret socket, route gate, TV set, hazard.
- **Director cue:** audio/subtítulo con prioridad, cooldown, memory predicate, presentation mode.
- **Encounter:** coste threat, enemigos válidos, telegraph, cap.
- **Pact:** contrato + política de consentimiento + token de liquidación.
- **Item:** tags, stack cap, proc cost, synergy recipe, i18n.
- **Boss adapter:** metadata Survivor + arena compatible + hazards + test.

## Automatización de calidad

Validar referencias cruzadas: ningún item sin texto o effect handler, ningún boss elegido sin arena, ningún pacto de team impact alto que carezca de consentimiento de equipo, ningún mapa sin ruta portal, ningún audio crítico sin subtítulo, ningún evento de teleportador sin telegraph y fail semantics.

## Matriz artística

Cada asset debe tener al menos:

`artId | source/licence | modelVariant | renderer test | camera 1/4 | low/high LOD | texture budget | mobile/split fallback | collision | audio cue | owner`.

**No publicar archivos sin licencias claras**. Recursos de inspiración ajenos pueden orientar dirección pero no se copian. Si los assets vienen de herramientas generativas, rastrear política comercial/licencia de la herramienta, no asumir autorización.

## Versionado

Separar `schemaVersion`, `gameplayBalanceVersion`, `contentPackVersion`. Una partida suspendida debe informar incompatibilidad y, de ser viable, migrar contenido; no eliminar saves silenciosamente.

## Estimación relativa

Los sistemas más caros probablemente sean sincronización autoritativa, host migration y render 4 cámaras/streams, pero **no afirmar coste** antes de medir el engine real. Mantener vertical slices de arte y networking desde etapa temprana.


---

# PARTE 35: 04_PRODUCTION/06_RISKS_AND_ADRS.md

# Riesgos, trade-offs y decisiones arquitectónicas pendientes

| Riesgo | Impacto | Mitigación propuesta | Verificar en |
|---|---|---|---|
| Coop host migration + browser physics | Muy alto | snapshots autoritativos, epochs, sim tests; no confiar en lockstep perfecto | R0/R6/R9 |
| 4 cámaras 3D + streams | Muy alto | pruebas tempranas de render targets/LOD/cap FPS | R0/R7/R8 |
| Reanudar días después sin backend | Alto | storage redundante/plan de backend mínimo | R0/R9 |
| Duplicación de objetos en crash | Alto | IDs de instancia, transacciones idempotentes | R1/R4/R9 |
| Director reacciona de forma injusta | Alto | fairness caps, cooldown, telegraphs y simulación | R3 |
| Moneda compartida causa conflictos | Medio/alto | transparencia, compras caras con confirmación limitada | R4/R6 |
| Pactos privados causan griefing | Alto | contrato legible, bajo impacto, revelación contextual, controles sociales | R3/R10 |
| Mapas generados bloquean ruta | Alto | rutas críticas reservadas y validación de seeds | R2 |
| Sinergias infinitas destruyen FPS | Alto | caps por proc/entidad/frame y VFX LOD | R4 |
| Late join desequilibra equipo | Medio | kit por banda y pruebas por loop | R6 |
| Boss Survivor no cabe en arena | Alto | matriz de compatibilidad antes de implementar arena | R0/R5 |
| Director habla demasiado | Medio | prioridades y cooldowns, opciones accesibles | R3 |
| Casting en TV no funciona universalmente | Medio | salida HDMI/duplicación como fallback + receiver web | R8 |
| Pérdida de conexión del mando móvil | Medio/alto | input neutralizado; reconexión role-bound | R8 |
| Alcance creativo crece sin fin | Muy alto | gates del roadmap, catalog tags, backlog y MVP probado | todas |

## ADRs por completar tras auditoría

- `ADR-001`: motor/red/render real y adapter Survivor.
- `ADR-002`: transporte authoritative y signaling.
- `ADR-003`: snapshots replicados y storage persistente.
- `ADR-004`: 4 viewports GPU y second-screen architecture.
- `ADR-005`: estrategia de inputs touch/gamepad/local.
- `ADR-006`: catálogo JSON vs TS vs formato propio.
- `ADR-007`: frontera de backend para metaprogresión y anticheat.

## Política «no inventar progreso»

Todo ADR debe enlazar diff, medición o prueba ejecutada. No declarar «resuelto» un riesgo porque existe una librería que promete hacerlo; verificar en el stack y dispositivos del juego.


---

# PARTE 36: 06_CODEX/01_START_HERE_CODEX.md

# PROMPT PRINCIPAL — PARA CONTINUAR EN CODEX

> Copiar desde aquí en el agente al abrir el repositorio real de **Junked Metal**. Adjuntar esta carpeta `ENCORE/` dentro del repositorio o como carpeta de referencia. Las rutas en esta documentación son del paquete, no rutas confirmadas del código del juego.

```text
Estás trabajando en el proyecto existente Junked Metal. Quiero diseñar e implementar
paulatinamente un modo nuevo llamado JUNKED METAL: ENCORE — THE SHOW MUST GO ON.

ENCORE es un roguelite cooperativo 1–4 jugadores con juego online, local, mixto,
MultiScreen, Luna inicial, Director de Amenazas antagonista, 4 escenarios mínimos
por ciclo, rutas ramificadas, loops evolutivos, temporizadores, pactos, objetos,
y FINAL ACT contra un jefe secreto existente de Survivor. TODOS los detalles
y decisiones confirmadas están documentados en la carpeta ENCORE/. No vuelvas
a preguntarme decisiones ya cerradas allí ni confundas las propuestas con reglas.

PRIMER PASO OBLIGATORIO: Lee ENCORE/README.md,
ENCORE/00_FOUNDATION/02_DECISION_LOG.md, ENCORE/01_DESIGN/01_MASTER_GDD.md,
ENCORE/03_ENGINEERING/01_ARCHITECTURE.md y
ENCORE/04_PRODUCTION/01_ROADMAP.md.

ANTES DE EDITAR CÓDIGO: audita el repositorio real. Encuentra y documenta:
- stack/framework/renderer/game loop;
- modo Survivor y componentes que podemos adaptar sin romperlo;
- nivel lunar, cámaras, controles, dispositivos, físicas y assets;
- jefes y enemigos reales, IDs y compatibilidad;
- sistema actual de estados, recursos, redes, guardados y tests;
- proyectos/modos adicionales que no deben degradarse.

No inventes rutas ni clases. Registra evidencia exacta con nombres de archivos
reales. Produce un informe de fase R0 y actualiza el backlog con descubrimientos.

PROPÓN un plan de implementación de la primera vertical slice lunar. Construye
componentes aislados, configurables, fácilmente testeables. No intentes
implementar todos los sistemas a la vez. No cambies el nombre de ENCORE ni
la personalidad y misterio del Director.

PRIORIDADES: diversión real de quedarme o avanzar; reutilización; fairness;
performance; UI compacta; preservación de Survivor; networking diseñado
desde el dominio para 4 personas incluso si el primer slice se ejecuta solo.

Si hay incertidumbre arquitectónica material, documenta una ADR con 2–3 opciones,
comparando coste y compatibilidad con el repositorio. Si no es material, toma una
decisión razonada y sigue sin bloquearte.

Al finalizar cada lote entrega:
1) resumen de hallazgos y decisiones;
2) rutas/diffs de archivos realmente modificados;
3) pruebas ejecutadas y resultados (sin inventarlos);
4) riesgos conocidos;
5) siguiente lote mínimo y verificable.

Mi preferencia al interactuar conmigo: si ofrecés opciones, ubicá tu
recomendación genuina como opción A. No confundas ello con que siempre apruebo A.
```

## Precondiciones

El agente necesita acceso al repositorio. Este paquete fue creado fuera de él, por lo que **no contiene hallazgos ni modificaciones al juego**. Al disponer del repo, comparar la documentación contra el código y registrar diferencias antes de ejecutar fases.


---

# PARTE 37: 06_CODEX/02_OPUS_DESIGN_REVIEW.md

# Prompt de revisión para Opus High — creatividad con ingeniería

```text
Actúa como Game Director + Technical Director + Narrative Director de
Junked Metal: ENCORE. Lee el paquete ENCORE/ completo y el repositorio real,
si está disponible. Tu obligación es proteger TODAS las decisiones
[CONFIRMADO] del decision log y diferenciar [PROPUESTA], [POR AUDITAR]
y [POR BALANCEAR].

Quiero creatividad de nivel excepcional, pero no novedad por novedad.
Eleva el modo con propuestas específicas de riesgo/recompensa, humor del
Director, ritmo de expediciones largas, sinergias y diseño retroindustrial
Folded 2.5D. Para cada idea demuestra:
- valor concreto para el jugador;
- reutilización de sistemas/arte;
- complejidad técnica;
- test mínimo para saber si funciona;
- impacto en juego solo, cuatro jugadores y rendimiento;
- si es una propuesta y no una decisión confirmada.

Revisa primero el núcleo: el dilema tiempo vs botín, selección de ruta,
teleportadores variables, Director con estados, memoria, pactos justos,
loops evolutivos y FINAL ACT oculto. Propón tres mejoras verdaderamente
valiosas y descarta explícitamente ideas vistosas que perjudican ese núcleo.

Si intervienen especialistas, asigna contexto por dominio, sin crear
subagentes excesivamente estrechos. Unifica los hallazgos en decisiones
consistentes. No afirma pruebas que no ejecutó.

Entrega revisión de GDD, riesgos de diseño, playtest plan y roadmap revisado.
No empieces refactor masivo del juego sin revisar el repositorio.
```


---

# PARTE 38: 06_CODEX/03_PHASE0_AUDIT.md

# Checklist ejecutable conceptualmente — Auditoría R0

> **No ejecutar comandos inventados.** Usar los comandos existentes del repo para instalar, test, lint, build y ejecutar. Registrar evidencia.

## Reconocimiento

- [ ] Detectar raíz, workspaces/packages y gestor de dependencias.
- [ ] Confirmar lenguaje, runtime, framework, engine, renderer, física.
- [ ] Enumerar modos actuales y rutas de entrada/escenas.
- [ ] Encontrar Survivor completo (input, combate, XP, loot, enemigos, AI, bosses, HUD).
- [ ] Encontrar Luna, otras escenas y editor/pipeline de assets.
- [ ] Revisar cámaras, split rendering, mobile/touch/gamepad.
- [ ] Revisar networking/signaling/server/STUN/TURN existente.
- [ ] Revisar storage/profile/save y estrategia de versionado.
- [ ] Encontrar tests, CI, lint, typecheck, e2e, performance harness.

## Evidencia obligatoria

- [ ] Tabla sistema → ruta real → API → dependencia → posibilidad de reuso.
- [ ] Matriz de jefes EXISTENTES: ID, tamaño, attacks, compatibilidad de arena.
- [ ] Capturas/comparativas de Luna y Survivor en desktop y móvil (si hay servidor de dev).
- [ ] Perfil de rendimiento en 1 viewport y stress preliminar en múltiples viewports.
- [ ] Gaps contra cada D-001..D-039 que dependa de código.
- [ ] ADRs pendientes completadas o con bloqueo justificado.

## Baseline de regresión

- [ ] Survivor sigue jugable.
- [ ] Otros modos se abren/funcionan según su alcance actual.
- [ ] No se mezclan tokens/estilos de ENCORE con UI de modos ajenos por accidente.
- [ ] Build/typecheck/tests existentes pasan o se registra baseline roto preexistente.

## Salida

Producir `ENCORE/06_CODEX/PHASE0_FINDINGS.md` **en el repositorio**, que describa hechos reales. No generarlo en esta entrega sin acceso al código.


---

# PARTE 39: 06_CODEX/04_EXECUTION_PROTOCOL.md

# Protocolo de ejecución para agentes: Codex / Opus / especialistas

## 1. No perder las decisiones

Leer `README.md`, `00_FOUNDATION/02_DECISION_LOG.md` y `01_DESIGN/01_MASTER_GDD.md`. Confirmar que cada issue menciona decisión D-xxx o `PROPUESTA`. Las preguntas nuevas del agente deben presentar su recomendación **como opción A**, por preferencia del usuario, sin transformar la posición en aprobación automática.

## 2. Reparto de especialidades reutilizables

- **Gameplay Systems Specialist**: run loop, XP, economía, loot, melee/ranged/movilidad, fairness.
- **Director & Narrative Specialist**: mood, memoria, audio, textos, pactos, misterio.
- **World & Level Design Specialist**: Luna, mapas, navegación, rutas, proceduralidad, iluminación.
- **Networking & Persistence Specialist**: autoridad, migración, guardado, rejoin, antidupe.
- **MultiScreen & UX Specialist**: cámaras, input, ventanas, TV, WebRTC, controles, accesibilidad.
- **QA & Balance Specialist**: pruebas automatizadas, simulación, telemetría, performance, regresión.

No fragmentar en agentes tan estrechos que cada tarea pierda el contexto de las reglas transversales. El integrador principal conserva la arquitectura y mergea los resultados.

## 3. Handoff mínimo a cada subagente

Identidad del modo; decisiones D-001..D-039 relevantes; código real inspeccionado y rutas de archivos; interfaces y restricciones; lista de no-regresión; criterios de aceptación; output esperado; contexto de avances previos y bloqueos. Nunca pasar solo «haz el sistema X» sin especificar reglas acordadas.

## 4. Jerarquía de evidencias

1. Decisiones confirmadas del usuario.
2. Código actual y tests del repo.
3. Hallazgos de auditoría reproducibles.
4. Propuestas con tradeoffs.
5. Inspiraciones de juegos externos (no como licencias para copiar).

Si el código choca con una decisión, documentar migración técnica; si el diseño propuesto choca con una decisión, corregir la propuesta.

## 5. Lotes de implementación

Cada lote contiene `objetivo → diff acotado → tests → revisión visual → balance → riesgo → commit recomendado`. Documentar características implementadas versus no implementadas. Nunca usar capturas simuladas como si fueran gameplay real.

## 6. Criterio de parada

El agente detiene cambios destructivos si encuentra datos del usuario, saves existentes, schema migrations irreversibles, integración desconocida de red, o modifica Survivor sin pruebas. Pedir resolución solo cuando la información no puede descubrirse inspeccionando el repo.


---

# PARTE 40: 07_DIAGRAMS/README.md

# Diagramas ENCORE

Estos archivos `.mmd` son texto Mermaid, no imágenes. Se pueden abrir con extensiones Mermaid en editores Markdown o renderizar mediante herramientas locales cuando se habiliten. **No** son evidencia de un código ejecutado.

- `01_RUN_FLOW.mmd`: estados de run y loops.
- `02_DIRECTOR_SYSTEM.mmd`: entradas y salidas del Director.
- `03_NETWORK_AUTHORITY.mmd`: autoridad de host y migración.
- `04_MULTISCREEN.mmd`: flujo de cámaras y roles de móvil.
- `05_PACT_LIFECYCLE.mmd`: consentimiento y liquidación de pactos.

