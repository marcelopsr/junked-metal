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
