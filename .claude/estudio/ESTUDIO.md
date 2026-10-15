# Estudio virtual de Junked Metal (desde 2026-10-15)

Dos capas: **6 agentes por función** (quién hace qué en el ciclo) y **10 lentes por disciplina** (qué saber y cómo medir). El orquestador elige agente(s) y les adjunta 1-3 lentes en el encargo. No se crean agentes nuevos por tarea: si aparece una necesidad real recurrente, se agrega una lente; un agente nuevo solo si cambia la FUNCIÓN.

## Filosofía común (todos)
Primero la diversión y el jugador · cero fricción · cada acción se siente bien · cohesión con ART_DIRECTION (diorama de juguete) · evidencia antes de opinión (captura, medición, sim, test) · respetar lo que ya funciona (evolucionar, no reconstruir) · complejidad con sentido (ponytail: lo mínimo que funciona) · rendimiento consciente · ciclo generar → evaluar → perfeccionar con evaluación independiente.

## Agentes (en `.claude/agents/`)
| Agente | Función | Escribe código | Uso |
|---|---|---|---|
| `estudio-constructor` | implementa en los archivos asignados (zonas, modelos, sistemas, UI) | sí | diario |
| `estudio-evaluador` | mide contra la meta (ref_measure, capturas, sim, e2e) y dice aprobado / devolver con qué | no | diario |
| `estudio-qa` | juega con el bot, busca atascos, roturas, regresiones; causa raíz con evidencia | no | diario |
| `estudio-revisor` | revisión independiente del diff (corrección, Havok, rng, fugas, textos) | no | por tanda |
| `estudio-diseno` | propone diseño (mecánicas, balance, experiencia) con datos; separa decisiones de producto | no (salvo balance.json si se pide) | frecuente |
| `experiencia` | UX/UI y deleite (ya existente; usa la lente 7) | sí si se pide | frecuente |

El orquestador (sesión principal) sigue integrando, tocando los compartidos, haciendo commits y preguntando lo de producto.

## Lentes (en `.claude/estudio/lentes/`)
| # | Lente | Absorbe |
|---|---|---|
| 1 | diseno-sistemas | loop, combate, balance, dificultad, progresión, economía justa, procedural |
| 2 | arte-mundo | dirección de arte, niveles y escenas, luz y composición, consistencia, curaduría de refs |
| 3 | modelado-assets | 3D procedural, siluetas, materiales, generación con Capataz |
| 4 | ingenieria | arquitectura, gameplay, Havok, IA, input, guardado, deuda técnica |
| 5 | qa-verificacion | testing, e2e, sim, regresión visual, causa raíz |
| 6 | sensacion-efectos | game feel, juice, animación, partículas |
| 7 | experiencia-ui | UI/UX, HUD, menús, onboarding, accesibilidad |
| 8 | render-rendimiento | shaders, post, presupuesto celular (perf solo si el usuario lo habilita) |
| 9 | narrativa-sonido | Director, lore, personajes, textos, sfx, música adaptativa |
| 10 | produccion | plan de versión, puertas, publicación, telemetría, seguridad |

## Combinaciones típicas
- Escena por debajo del contraste meta: constructor + lentes 2 (+3) → evaluador lente 2.
- Bicho o auto contra su ref: constructor + lente 3 → evaluador lente 2-3.
- Se siente flojo disparar/chocar: diseno + lentes 1, 6, 9 → constructor + 6 → qa + evaluador lente 1.
- Bug/atasco: qa (lentes 5, 4) → constructor + 4 → qa confirma.
- Menú/HUD: experiencia + lente 7 (+ evaluador en pc y cel).
- Cierre de versión: revisor + qa + evaluador (lente 10 para la puerta).

## Plantilla de encargo (agregar al de `.claude/trabajo/ARRANQUE.md`)
`Agente: <nombre> · Lentes: .claude/estudio/lentes/<n>.md (leelas) · Meta medible: … · Archivos: … · Verificación: … · Máx. iteraciones: …`
