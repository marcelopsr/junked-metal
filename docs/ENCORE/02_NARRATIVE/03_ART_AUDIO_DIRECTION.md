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
