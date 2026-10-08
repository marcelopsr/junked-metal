---
trigger: always_on
description: "Enforce strict Gemini-only model usage, Flash Low/Medium/High reasoning routing, and total isolation from Claude configurations."
---

# Invariantes del Harness: Gemini Only y Aislamiento Total

## 1. Exclusividad de Modelos Gemini (GEMINI ONLY)
- Este proyecto opera dentro de Antigravity **exclusivamente con modelos Gemini** (Gemini Flash Low, Medium y High, o equivalentes Gemini más recientes).
- **Prohibición estricta:** Nunca utilices, invoques ni recomiendes Claude, Claude Code, Sonnet, Opus, OpenAI, GPT, Codex ni modelos OSS externos, ni como agente principal, ni como revisor, ni como subagente.
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
