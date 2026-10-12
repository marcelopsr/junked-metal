# JUNKED METAL: ENCORE
## THE SHOW MUST GO ON.

> **Diseño maestro · Edición 1.0 · 11 de octubre de 2026**  
> **Estado:** paquete de preproducción, **no** implementación ni auditoría de código.  
> **Formato:** documentos Markdown, diagramas Mermaid, ejemplos JSON/CSV y guías para Codex/Opus.

**ENCORE** es un modo roguelite de supervivencia, exploración y cooperación para **1–4 jugadores**, construido sobre el universo, el combate y los recursos existentes de *Junked Metal*. Comienza en la Luna, atraviesa al menos cuatro escenarios por ciclo y permite escoger entre otro **ENCORE!** o un **FINAL ACT** irreversible. Un anfitrión macabro, **el Director**, presenta el espectáculo, controla amenazas mediante reglas justas, ofrece pactos peligrosos, recuerda las expediciones y oculta su verdadera identidad.

## Cómo navegar este paquete

| Carpeta | Contenido |
|---|---|
| `00_FOUNDATION/` | Visión, principios, decisiones aprobadas, conceptos y experiencia objetivo. |
| `01_DESIGN/` | Reglas del juego: runs, director, mapas, teleportadores, objetos, pactos, bosses y progresión. |
| `02_NARRATIVE/` | Biblia del Director, misterio, diálogos, guía artística y sonora. |
| `03_ENGINEERING/` | Arquitectura de referencia, red/cooperativo, MultiScreen, guardado, seguridad y UX. |
| `04_PRODUCTION/` | Roadmap, backlog, pruebas, métricas, riesgos y pipeline de producción. |
| `05_DATA/` | Ejemplos de datos versionables. **No son assets definitivos ni estadísticas balanceadas.** |
| `06_CODEX/` | Instrucciones listas para transferir a Codex/Claude y auditar el repositorio real. |
| `07_DIAGRAMS/` | Diagramas Mermaid, legibles también como texto. |

## Lectura recomendada

1. [`00_FOUNDATION/01_VISION.md`](00_FOUNDATION/01_VISION.md)
2. [`00_FOUNDATION/02_DECISION_LOG.md`](00_FOUNDATION/02_DECISION_LOG.md)
3. [`01_DESIGN/01_MASTER_GDD.md`](01_DESIGN/01_MASTER_GDD.md)
4. [`03_ENGINEERING/01_ARCHITECTURE.md`](03_ENGINEERING/01_ARCHITECTURE.md)
5. [`04_PRODUCTION/01_ROADMAP.md`](04_PRODUCTION/01_ROADMAP.md)
6. [`06_CODEX/01_START_HERE_CODEX.md`](06_CODEX/01_START_HERE_CODEX.md)

## Leyenda de estado

- **[CONFIRMADO]**: decisión expresamente aprobada en la conversación.
- **[PROPUESTA]**: diseño recomendado para probar; puede cambiar tras auditar el juego.
- **[POR AUDITAR]**: depende de la implementación real de *Junked Metal*.
- **[POR BALANCEAR]**: parámetros de ejemplo, sujetos a telemetría y playtests.

## Regla de oro

**Primero demostrar que quedarse o avanzar es una decisión emocionante.** Todo lo demás —lore, secretos, escenografía, sistemas avanzados— debe reforzar ese núcleo, nunca ocultarlo.

## Qué NO se afirma aquí

No hemos inspeccionado el repositorio, probado los sistemas Survivor, enumerado jefes reales ni validado la viabilidad de cámaras múltiples, WebRTC, migración de anfitrión o juego local en un dispositivo. Los documentos separan explícitamente la **visión de producto** de una **implementación validada**. El auditor de fase 0 debe reemplazar supuestos por hallazgos demostrables.

## Entrega a un agente

Usá el prompt de `06_CODEX/01_START_HERE_CODEX.md` como instrucción de arranque al abrir el repositorio real. No pedir que implemente todas las fases de una vez: trabajar con diffs pequeños, pruebas y revisiones por hitos.
