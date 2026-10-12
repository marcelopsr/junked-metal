# PROMPT PRINCIPAL — PARA CONTINUAR EN CODEX

> Copiar desde aquí en el agente al abrir el repositorio real de **Junked Metal**. Adjuntar esta carpeta `ENCORE/` dentro del repositorio o como carpeta de referencia. Las rutas en esta documentación son del paquete, no rutas confirmadas del código del juego.

```text
Estás trabajando en el proyecto existente Junked Metal. Quiero diseñar e implementar
paulatinamente un modo nuevo llamado JUNKED METAL: ENCORE — THE SHOW MUST GO ON.

ENCORE es un roguelite cooperativo 1–4 jugadores con juego online, local, mixto,
MultiScreen, Luna inicial, Director de Amenazas antagonista, 4 escenarios mínimos
por ciclo, rutas ramificadas, loops evolutivos, temporizadores, pactos, objetos,
y FINAL ACT contra un jefe secreto existente de Survivor. TODOS los detalles
y decisiones confirmadas están documentados en la carpeta ENCORE/. No vuelvas
a preguntarme decisiones ya cerradas allí ni confundas las propuestas con reglas.

PRIMER PASO OBLIGATORIO: Lee ENCORE/README.md,
ENCORE/00_FOUNDATION/02_DECISION_LOG.md, ENCORE/01_DESIGN/01_MASTER_GDD.md,
ENCORE/03_ENGINEERING/01_ARCHITECTURE.md y
ENCORE/04_PRODUCTION/01_ROADMAP.md.

ANTES DE EDITAR CÓDIGO: audita el repositorio real. Encuentra y documenta:
- stack/framework/renderer/game loop;
- modo Survivor y componentes que podemos adaptar sin romperlo;
- nivel lunar, cámaras, controles, dispositivos, físicas y assets;
- jefes y enemigos reales, IDs y compatibilidad;
- sistema actual de estados, recursos, redes, guardados y tests;
- proyectos/modos adicionales que no deben degradarse.

No inventes rutas ni clases. Registra evidencia exacta con nombres de archivos
reales. Produce un informe de fase R0 y actualiza el backlog con descubrimientos.

PROPÓN un plan de implementación de la primera vertical slice lunar. Construye
componentes aislados, configurables, fácilmente testeables. No intentes
implementar todos los sistemas a la vez. No cambies el nombre de ENCORE ni
la personalidad y misterio del Director.

PRIORIDADES: diversión real de quedarme o avanzar; reutilización; fairness;
performance; UI compacta; preservación de Survivor; networking diseñado
desde el dominio para 4 personas incluso si el primer slice se ejecuta solo.

Si hay incertidumbre arquitectónica material, documenta una ADR con 2–3 opciones,
comparando coste y compatibilidad con el repositorio. Si no es material, toma una
decisión razonada y sigue sin bloquearte.

Al finalizar cada lote entrega:
1) resumen de hallazgos y decisiones;
2) rutas/diffs de archivos realmente modificados;
3) pruebas ejecutadas y resultados (sin inventarlos);
4) riesgos conocidos;
5) siguiente lote mínimo y verificable.

Mi preferencia al interactuar conmigo: si ofrecés opciones, ubicá tu
recomendación genuina como opción A. No confundas ello con que siempre apruebo A.
```

## Precondiciones

El agente necesita acceso al repositorio. Este paquete fue creado fuera de él, por lo que **no contiene hallazgos ni modificaciones al juego**. Al disponer del repo, comparar la documentación contra el código y registrar diferencias antes de ejecutar fases.
