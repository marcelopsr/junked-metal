# Datos de ejemplo — leer antes de integrar

**Estos archivos NO son catálogos reales del repositorio.** Los ejemplos identificados con `prototype_`, `placeholder_` o `draft` son de preproducción y requieren reconciliación con los sistemas de Junked Metal. Ninguna cifra de balance está validada.

- `prototype_balance.json`: parámetros propuestos para simulación.
- `prototype_items.json`: ideas originales de objetos, sinergias y evoluciones.
- `prototype_pacts.json`: plantillas de desafíos con consentimiento.
- `prototype_teleporters.json`: variantes de evento del portal.
- `stage_catalog.template.json`: placeholder de Luna y grafo conceptual, sin inventar mapas existentes.
- `boss_registry.template.json`: catálogo vacío **a completar tras auditar Survivor**.
- `run_state.schema.json`: esquema de ejemplo para snapshots JSON.
- `dialogue_cues.csv`: diálogos prototipo y triggers.
- `qa_cases.csv`: casos de prueba transferibles a gestor de tareas.

**Regla:** no desplegar configuraciones con campos `prototype` en builds de producción sin validación explícita. Cada runtime debe tener catálogo aprobado/firmado, versionado y compatible con saves.
