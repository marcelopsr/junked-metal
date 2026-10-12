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
