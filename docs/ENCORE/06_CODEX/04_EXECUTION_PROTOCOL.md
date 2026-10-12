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
