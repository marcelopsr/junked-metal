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
