# Pipeline de producción — contenido sin deuda artística

## Problema a resolver

ENCORE tiene muchos sistemas con potencial de variantes. Para evitar reescribir código por cada objeto, pacto, enemy wave o televisor, crear catálogos declarativos con validadores automáticos y herramientas visuales de previsualización.

## Flujo propuesto

**Idea → ficha de diseño → prefab/asset reusable → config JSON/TS → validador → escena de QA → performance → catálogo de build → release**.

## Unidades reutilizables

- **Map module:** landmark, portal socket, secret socket, route gate, TV set, hazard.
- **Director cue:** audio/subtítulo con prioridad, cooldown, memory predicate, presentation mode.
- **Encounter:** coste threat, enemigos válidos, telegraph, cap.
- **Pact:** contrato + política de consentimiento + token de liquidación.
- **Item:** tags, stack cap, proc cost, synergy recipe, i18n.
- **Boss adapter:** metadata Survivor + arena compatible + hazards + test.

## Automatización de calidad

Validar referencias cruzadas: ningún item sin texto o effect handler, ningún boss elegido sin arena, ningún pacto de team impact alto que carezca de consentimiento de equipo, ningún mapa sin ruta portal, ningún audio crítico sin subtítulo, ningún evento de teleportador sin telegraph y fail semantics.

## Matriz artística

Cada asset debe tener al menos:

`artId | source/licence | modelVariant | renderer test | camera 1/4 | low/high LOD | texture budget | mobile/split fallback | collision | audio cue | owner`.

**No publicar archivos sin licencias claras**. Recursos de inspiración ajenos pueden orientar dirección pero no se copian. Si los assets vienen de herramientas generativas, rastrear política comercial/licencia de la herramienta, no asumir autorización.

## Versionado

Separar `schemaVersion`, `gameplayBalanceVersion`, `contentPackVersion`. Una partida suspendida debe informar incompatibilidad y, de ser viable, migrar contenido; no eliminar saves silenciosamente.

## Estimación relativa

Los sistemas más caros probablemente sean sincronización autoritativa, host migration y render 4 cámaras/streams, pero **no afirmar coste** antes de medir el engine real. Mantener vertical slices de arte y networking desde etapa temprana.
