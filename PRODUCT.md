# Product

<!-- impeccable:product-schema 1 -->

Nota: escrito sin entrevista al usuario (encargo autónomo del 2026-10-08). Lo inferido de docs y código va marcado "(supuesto)"; lo demás sale de `CLAUDE.md`, `docs/HANDOFF-PROYECTOS.md` y las decisiones del usuario del 2026-10-08.

## Platform

web

(Web instalable como PWA; en teléfono es web móvil, no nativo.)

## Users
- Jugadores casuales de roguelite tipo "survivor" en navegador, en compu (teclado, mouse, gamepad) y en celular (táctil). (supuesto)
- Sesiones cortas: una partida dura 10 minutos; las de modos laterales, pocos minutos. (supuesto)
- Creador y único mantenedor: TheDuende, que dirige el desarrollo junto con agentes de IA.
- Pantalla dividida para 2 jugadores solo en compu; en teléfono nunca hay 2 jugadores (decisión del usuario).

## Product Purpose
Junked Metal es un roguelite web donde un auto a control remoto sobrevive 10 minutos en un patio gigante contra bichos y juguetes, sube de nivel, elige armas y mejoras en cartas, y termina contra un jefe sorteado por semilla. Una meta ligera (autos, pilotos, taller, zonas, logros, bestiario) da razones para volver. Éxito: partidas legibles y rejugables, que corran fluidas en compu y en un celular.

## Positioning
Survivor-like con identidad propia: un auto RC con física real (Havok) en un mundo de chatarra industrial plegada. No es otro survivor de figuras genéricas: el mundo, el HUD y los modos laterales comparten una misma estética de taller. (supuesto: formulación)

## Operating Context
- Supervivencia es el modo principal. Desafío diario usa la semilla del día; `?seed=N` fija una partida (todo lo que decide la partida usa `rng()`).
- Modos laterales en desarrollo paralelo: Carrera estilo Mario Kart (copa de 3, pantalla dividida solo en compu), Junket Crush (match-3, campaña de 10 niveles) y Demolición (duelo melee con fabricación del vehículo).
- Publicado en https://marcelopsr.github.io/junked-metal/ (cada push a `master` publica) y como app de la Mac (`/Applications/Junked Metal.app`, build de producción).
- Stack: Babylon.js 9, Havok, TypeScript, Vite. Todo el balance vive en `src/balance.json`.

## Capabilities and Constraints
- Rendimiento primero: instancias y plantillas, tope de enemigos/gemas/restos/marcas, render a resolución interna baja con píxeles visibles, preajustes Bajo/Medio/Alto/Ultra.
- Textos del juego en español neutro impersonal, sin voseo ("Presiona", "Sobrevive"). Branding, carteles, chistes y nombres propios (Junket Crush) en inglés.
- Carrera, Junket Crush y Demolición NO dan tornillos ni logros: están aislados de la economía de Supervivencia (decisión del usuario, 2026-10-08; no volver a proponerlo sin una razón nueva). Junket Crush guarda su propio progreso (`save.m3`).
- Descartado: identidad de build (detección de estilo y sesgo de cartas) en Supervivencia.
- Pendiente de decidir por el usuario: posición del auto y bichos de juguete en la portada del menú; gamma como curva de medios tonos en Configuración de imagen.

## Brand Commitments
- Nombre: Junked Metal (repo `rc_fight`); creador: TheDuende. Los créditos van sin tecnologías.
- Dirección de arte vigente (2026-10-08, decisión del usuario): día estilo Megabonk + mundo Folded (chatarra industrial plegada, desgaste y óxido), HUD de paneles oscuros opacos con borde naranja, Rajdhani y tokens `--jm-*`. Noche, PSX y terminal verde son historia. Detalle en `docs/ART_DIRECTION.md`.
- Nada de emojis ni UI genérica.

## Evidence on Hand
- Capturas de referencia en `docs/visual/2026-10-08-base/` y láminas en `docs/images/`; scorecards en `docs/impeccable/`.
- No hay testimonios, métricas de jugadores ni analítica: no inventarlos. (supuesto: no hay usuarios medidos)

## Product Principles
- Legibilidad antes que espectáculo: la escena y el HUD se leen siempre, en compu y en celular.
- Un solo lenguaje visual para todos los modos (chapa oscura, naranja gastado, Rajdhani).
- Las decisiones del usuario se preguntan antes de aplicarse y las cerradas no se reabren.
- Rendimiento como característica: nada que rompa el presupuesto de draws en un celular.
- La economía de Supervivencia no se mezcla con los modos laterales.

## Accessibility & Inclusion
- Existen "Reducir parpadeos" (sin destello ni chispas) y modo calmo (`calm`, animaciones casi instantáneas en Junket Crush). Respetar también `prefers-reduced-motion`.
- Información de objetivos con ícono de forma y barra, no solo color.
- Foco cian visible con teclado, gamepad y mouse; controles táctiles propios.
- Texto en español neutro; no se exigió un estándar WCAG específico. (supuesto)
