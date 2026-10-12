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
