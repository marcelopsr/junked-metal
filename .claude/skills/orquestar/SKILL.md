---
name: orquestar
description: Metodología de orquestación con subagentes. La sesión principal (modelo de menor costo, p. ej. Opus medio o bajo) rutea, encarga, integra y verifica; la comprensión difícil, el diseño, la ejecución y la revisión se delegan al agente adecuado con un encargo autocontenido. Usar cuando el usuario diga «orquestar», «modo orquestador» o «usá la metodología», cuando el CLAUDE.md del proyecto lo pida, o antes de delegar cualquier tarea a un subagente.
when_to_use: Al empezar una sesión de trabajo en un proyecto que la adopta; ante un pedido complejo, ambiguo o largo; antes de lanzar cualquier subagente; al preparar un handoff a otra sesión.
user-invocable: true
---

# Orquestar

La calidad no depende de que la sesión principal recuerde o deduzca todo: depende de que cada tarea llegue al agente adecuado, con la información completa, y de que el resultado se verifique. Vos sos el orquestador: **ruteás, encargás, integrás y verificás**. No resolvés solo lo que otro agente resuelve mejor.

Tres hechos que mandan (documentación de Claude Code):
- Un subagente **no ve esta conversación** ni tu memoria. Ve el CLAUDE.md del proyecto y del usuario, el estado de git y tu encargo. Lo que no esté en el encargo o en un archivo que el encargo nombre, no existe para él.
- El modelo se puede elegir al lanzar; el **esfuerzo solo lo fija el perfil** del agente.
- El contexto es finito y se degrada al llenarse. Lo durable va a archivos; lo verboso (exploración, logs, investigación) va a subagentes que devuelven un resumen.

## 1. Clasificar el pedido (siempre, en 10 segundos)

| Si el pedido… | Entonces |
|---|---|
| es claro y el cambio se describe en una frase | Hacelo vos. Sin plan, sin subagentes. |
| es claro pero largo o mecánico | Encargalo a un ejecutor barato (§3). |
| tiene una duda que **cambia el producto** o es difícil de revertir | Preguntá al usuario (AskUserQuestion). No interpretes. |
| es ambiguo, extenso, cruza varias capas, o no sabés por dónde empezar | Delegá la **comprensión** al `interprete` (§2) y seguí con su especificación. |
| toca seguridad, dinero, datos reales o producción | Diseño o revisión con un agente caro (§3) aunque te parezca claro. |

Si estás en esfuerzo bajo: ante la duda entre «lo entiendo» y «no del todo», delegá la comprensión. Es más barato que ejecutar lo equivocado.

## 2. Tipos de delegación

Delegar no es solo delegar la ejecución. Elegí el tipo antes que el agente.

| Tipo | Para qué | Agente | Devuelve |
|---|---|---|---|
| Comprender / planificar | Convertir un pedido en una especificación: intención, contexto, alcance, criterio de terminado, pasos y quién ejecuta cada uno | `interprete` | Archivo de especificación + preguntas para el usuario |
| Investigar | Hechos externos (documentación, estándares) o un mapa del código | `investigador` (web) · `haiku-alto` o `Explore` (código) | Resumen con fuentes o archivo:línea |
| Ejecutar | Construir o cambiar algo ya especificado | Perfil por modelo y esfuerzo (§3) o un especialista del proyecto | Cambios + evidencia de verificación |
| Revisar | Buscar errores reales en un cambio, con contexto fresco | `revisor` | Hallazgos con escenario de falla + veredicto |
| Validar / criticar | Medir un resultado contra criterios (rúbrica, tests, capturas) | `revisor` o el evaluador que defina el proyecto | Puntaje o aprobado/rechazado con evidencia |

Flujo completo, solo cuando mejora el resultado:
usuario → vos → `interprete` → vos (preguntás al usuario lo que haga falta) → ejecutor(es) → `revisor` → vos integrás y verificás → usuario.
La mayoría de las tareas usa uno o dos eslabones. Una tarea simple no usa ninguno.

## 3. Elegir el agente: el más barato que la haga bien

| Perfil | Usalo para |
|---|---|
| `haiku-bajo` / `haiku-medio` / `haiku-alto` | Consultas triviales / buscar, correr tests o capturas y reportar / leer mucho y resumir |
| `sonnet-bajo` / `sonnet-medio` / `sonnet-alto` | Cambios mecánicos guiados / una pantalla, endpoint o función normal / funcionalidad completa o refactor con tests |
| `opus-bajo` / `opus-medio` | Arreglo acotado con riesgo / cambio delicado que cruza capas |
| `opus-alto` | Seguridad, dinero, datos reales, revisión antes de producción, o lo que falló dos veces en medio |
| `fable-bajo` / `fable-medio` / `fable-alto` | Pregunta difícil y acotada / diseño o revisión de riesgo alto / auditoría completa o lo que Opus alto no resolvió |
| Especialistas del proyecto (`.claude/agents/` del repo) | Cuando existen, ganan para su área: ya conocen sus reglas |

Reglas:
- Subí de nivel solo si el resultado no alcanzó; no «por las dudas».
- Cada vez que uses un agente caro (`opus-alto`, `fable-*`, `interprete`, `revisor`), decíselo al usuario en una línea: cuál y por qué.
- No pases `model` al lanzar un perfil: lo pisa. Elegí el perfil correcto.
- Paralelo solo si las tareas no tocan los mismos archivos. Los archivos compartidos los toca un solo agente o vos al integrar.
- Multi-agente gasta varias veces más tokens que hacerlo vos. Si el cambio es de un archivo o es secuencial, no delegues.

## 4. El encargo (obligatorio en cada delegación)

Usá la plantilla de [encargo.md](encargo.md). Antes de enviarlo, pasá esta prueba: **¿un colega competente que nunca vio esta conversación podría hacer la tarea solo con este texto y los archivos que nombra?** Si no, falta algo.

Mínimo de todo encargo: objetivo y para qué sirve · contexto y decisiones ya tomadas (con ruta de archivo) · alcance y qué NO tocar · restricciones · criterio de terminado verificable · cómo verificar · formato del informe.

Si el contexto es largo, escribilo en un archivo y pasá la ruta. No pegues documentos enteros en el prompt ni resumas de memoria algo que está escrito: nombrá el archivo.

## 5. Al recibir un resultado

1. No lo des por cierto: mirá la evidencia (salida de tests, capturas, diff). Si dice «listo» sin evidencia, pedila o verificá vos.
2. Si cambió código compartido o delicado, pasalo por `revisor` con la especificación y el rango del diff, no con tu opinión del cambio.
3. Lo que el subagente decidió por su cuenta y cambia el producto, llevalo al usuario antes de seguir.
4. Dos intentos fallidos sobre lo mismo: no insistas con el mismo encargo. Reescribilo, subí de perfil o pasalo por `interprete`.
5. Registrá: decisiones al plan del proyecto, aprendizajes durables a la memoria.

## 6. Contexto y handoff

- Especificaciones, informes largos y estado de trabajo viven en archivos (`.claude/trabajo/` del repo, salvo que el proyecto indique otro lugar). Pasá rutas, no contenido.
- Cuando la sesión esté cargada (muchas tareas mezcladas, respuestas que olvidan decisiones, compactaciones repetidas) o al cerrar una etapa: escribí un handoff con [handoff.md](handoff.md) y proponé una sesión nueva con el prompt de arranque. Una sesión nueva con buen handoff rinde más que una larga compactada.
- Al empezar una sesión en un proyecto con `.claude/trabajo/HANDOFF.md`, leelo antes de actuar.

## 7. Lo que no hace esta metodología

- No reemplaza las reglas del proyecto (su CLAUDE.md manda) ni las preguntas al usuario.
- No obliga a pasar por todas las etapas. La etapa extra se usa solo si mejora calidad, confiabilidad o costo.
- No compensa un encargo malo con un modelo caro: primero el encargo.
