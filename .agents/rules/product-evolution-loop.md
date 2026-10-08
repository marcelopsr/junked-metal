---
trigger: always_on
description: "Permanent Autonomous Product Evolution & Recursive Discovery Loop: after every completed and validated task, update persistent product context, discover 2-4 high-value opportunities from a fresh lens, make a reasoned recommendation, and request the user's next decision."
---

# Loop Permanente de Evolución de Producto (Recursive Discovery Loop)

## 1. Principio Fundamental
**EL FINAL DE UNA TAREA ES EL INICIO DE UN NUEVO CICLO DE DESCUBRIMIENTO.**

> *"Después de completar y validar una tarea, el agente debe revisar el estado actualizado del producto, identificar oportunidades genuinamente nuevas, presentar recomendaciones priorizadas y solicitar la siguiente decisión del usuario, manteniendo el contexto persistente."*

Flujo continuo:
`EXPLORE → UNDERSTAND → DISCOVER → IMAGINE → PROPOSE → DISCUSS → DECIDE → IMPLEMENT → VALIDATE → REFINE → DOCUMENT → LEARN → NEW DISCOVERY ↺`

## 2. Protocolo al Terminar Cada Tarea
Nunca des por cerrada la colaboración con un simple *"Implementación completada"*. Al finalizar y validar cualquier intervención (`final-verification`):

1. **Validar** lo implementado con evidencia real (`tsc --noEmit`, `npm test`, `npm run build` y herramientas headless proporcionales).
2. **Actualizar el contexto persistente** en `docs/PRODUCT_EVOLUTION.md` (y documentos específicos como `docs/VISUAL_QUALITY.md` o `docs/HANDOFF-PROYECTOS.md` cuando corresponda):
   - Estado actualizado de módulos y fichas.
   - Decisiones aprobadas e ideas descartadas/pospuestas.
   - Backlog de oportunidades y checkpoint de sesión.
3. **Evaluar cómo cambió el producto** y qué oportunidades nuevas emergieron a raíz del cambio.
4. **Rotar la lente de descubrimiento** para no revisar mecánicamente los mismos problemas:
   - *Ciclo de Calidad / Impeccable:* ¿Qué superficies DOM o escenas 3D necesitan refinamiento para acercarse al estándar 40/40 (o 10/10 en `docs/VISUAL_QUALITY.md`) sin forzar cambios innecesarios?
   - *Ciclo de Experiencia (UX/UI):* ¿Qué flujo, lectura en partida o control táctil/gamepad podría resultar más intuitivo?
   - *Ciclo de Integración (Folded 2.5D y Sistemas):* ¿Qué elementos aún desentonan con el lenguaje Folded o podrían conectarse mejor?
   - *Ciclo de Simplificación (Ponytail/YAGNI):* ¿Qué complejidad o deuda (`// ponytail:`) conviene eliminar o resolver más limpio?
   - *Ciclo de Funcionalidades / Innovación / Producto:* ¿Qué capacidad ausente o detalle memorable elevaría la identidad de Junked Metal?
   - *Ciclo de Arquitectura y Rendimiento:* ¿Dónde mejorar draw calls, memoria en `update()` o modularidad?
5. **Presentar entre 2 y 4 oportunidades valiosas** (sin rellenar con ideas triviales):
   - **Qué es** y **qué problema resuelve**.
   - **Qué valor aporta** al jugador o al proyecto.
   - **Complejidad estimada** (Baja / Media / Alta) y **por qué conviene desarrollarla ahora**.
6. **Emitir una recomendación con criterio propio:**
   - Indicar explícitamente cuál opción se recomienda abordar primero y por qué, ponderando impacto, valor para el usuario, coherencia con `PRODUCT.md` / `DESIGN.md`, complejidad, reutilización y riesgo.
   - Si un área ya está bien resuelta, recomendar conservar su estado actual y enfocar en otra dimensión.
7. **Preguntar al usuario la siguiente dirección (`ask_question`):**
   - Formular una pregunta concreta de opción múltiple (con la recomendada primera y marcada `(Recommended)`), permitiendo elegir una alternativa, combinar varias, modificar/descartar o explorar otra dirección.

## 3. Salvaguardas contra el Loop Ciego
- **No implementar sin aprobación:** Ninguna funcionalidad o cambio de diseño/balance nuevo se ejecuta sin decisión previa del usuario.
- **Respetar decisiones cerradas y descartes:**Si el usuario rechaza o pospone propuestas, regístralas en `docs/PRODUCT_EVOLUTION.md` y no vuelvas a insistir con ellas sin nueva evidencia (ej. *nunca proponer economía compartida/tornillos en modos laterales*, *nunca reabrir identidad de build en Supervivencia*, *no reactivar enemigos que temen el faro*).
- **Continuidad entre sesiones:** Mantén siempre al día la sección `Checkpoint de Sesión` en `docs/PRODUCT_EVOLUTION.md` (último trabajo, validación, decisiones, propuestas activas y próxima decisión pendiente).
