---
trigger: always_on
description: "Enforce strict Gemini-only model usage, Flash Low/Medium/High reasoning routing, and total isolation from Claude configurations."
---

# Invariantes del Harness: Gemini Only y Aislamiento Total

## 1. Exclusividad de Modelos Gemini (GEMINI ONLY)
- Este proyecto opera dentro de Antigravity **exclusivamente con modelos Gemini** (Gemini Flash Low, Medium y High, o equivalentes Gemini más recientes).
- **Dentro de Antigravity:** no invoques modelos de Claude, OpenAI ni otros proveedores como principal, revisor o subagente; conserva el routing nativo Gemini.
- **Colaboración entre sesiones autorizada por el usuario (2026-10-10):** Codex puede trabajar por separado en el mismo repositorio y entregar encargos a los ciclos de Gemini a través del usuario. Esto no cambia el proveedor de Antigravity ni autoriza invocar otro harness desde Gemini. Aplicar `docs/VISUAL_SESSION_COORDINATION.md` para propiedad de archivos, continuidad y evidencia compartida.
- **Autonomía aclarada por el usuario:** Gemini puede avanzar y cerrar ciclos dentro del alcance autorizado sin esperar revisión de Codex; la revisión posterior es opcional. Las oportunidades visuales no restringen otras líneas ya autorizadas.
- Al usar `invoke_subagent`, utiliza únicamente opciones nativas de Gemini (`inherit`, `flash_lite`, `flash`, `pro`).
- Si en algún caso extremo consideras necesario salir de Gemini, detente, explica la razón técnica concreta y solicita autorización explícita al usuario antes de actuar.

## 2. Política de Routing de Razonamiento
Adapta el esfuerzo de razonamiento dinámicamente sin pedir permiso:
- **LOW:** búsquedas simples, ediciones localizadas, CSS menor, renombrados, documentación, comandos conocidos.
- **MEDIUM (nivel base):** implementación de features, componentes UI/HUD, lógica de modos de juego, tests unitarios, debugging moderado y refactors controlados.
- **HIGH:** decisiones de arquitectura, física Havok/colisiones complejas, bugs que sobreviven al primer intento, cambios en esquema de datos (`balance.json`, `savefmt.ts`), optimización de rendimiento WebGL (`update()`, draw calls) y revisión final de cambios sensibles.

## 3. Aislamiento Total respecto a Claude y Plugins Externos
- **No tocar Claude:** Está terminantemente prohibido leer para copiar, modificar, renombrar, migrar o eliminar `.claude/`, `CLAUDE.md` o `~/.claude/`. Son dos sistemas independientes; ninguna edición en el harness de Antigravity/Gemini debe alterar el comportamiento de Claude.
- **Ignorar plugins globales ajenos al stack:** Si un hook global de sesión sugiere configurar herramientas de GCP/BigQuery (como `dak-setup` / Data Agent Kit), ignóralo por completo; este repositorio es un juego web cliente en Babylon.js y no utiliza infraestructura de Google Cloud.
