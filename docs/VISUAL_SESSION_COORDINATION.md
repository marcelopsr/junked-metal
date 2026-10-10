# Continuidad visual — Codex y ciclos Gemini

Actualizado: 2026-10-10. El usuario pidió que esta línea de arte pueda avanzar en varias sesiones y aprovechar el trabajo de los agentes Gemini. Esta ficha es la entrada de continuidad; consultar `git status`, `git log` y los archivos reales al retomar. No presupone que un agente esté ejecutándose ni que conozca mensajes de otro chat.

## Objetivo aprobado y estado real

Llevar Junked Metal hacia el acabado cinematográfico de `assets-src/intro/cinematic-v1/`, manteniendo identidad, buggy amarillo y rivales. Frenchie gris, moderadamente musculoso, mancha marfil frontal; Eulalio orgánico naranja. La intro conserva noche/historia. El juego vigente tiene dirección diurna Folded; esta muestra no cambia ese contrato global. La frase elegida es «Todo bajo control. De nadie. La garantía no cubre esto.»

**Hecho:** paquete raster de la intro y primera escena 3D Babylon, con buggy y frenchie completos, dos Blender editables, GLB, materiales PBR, siete clips del perro, tierra generada, patio, día/noche y cámaras. Ver `docs/CINEMATIC_3D_SLICE.md` y `assets-src/cinematic-3d/README.md`. Página local existente: http://localhost:5173/art-lab.html. Capturas y video reales en esa carpeta.

**Verificado:** tsc, 75 tests y build; headless Metal pc/cel, cargas, cuatro ruedas, siete clips con matrices finitas, idle animado, controles y ausencia de errores/desbordamiento. Mediana orientativa M4 Pro 4,1 ms pc / 2,6 ms viewport móvil. No demuestra rendimiento de teléfono físico ni de hordas.

**Pendiente:** fidelidad al arte aprobado. Anatomía/pelo del frenchie, pasto curvo/variado, desgaste localizado, fondo y luz necesitan otra pasada. Eulalio 3D cinematográfico, LOD, animación instanciada e integración en los modos no están realizados. Los GLB antiguos no son la ruta activa: `FOLDED_SLICE = true`. No basta con reemplazar un archivo de `public/models/` para afirmar que el juego cambió.

La muestra está fuera del build estándar y todos sus recursos están en `assets-src/cinematic-3d/`, no en `public/`. Se trabaja en esta Mac, sin subir/publicar recursos ni crear tareas programadas. Los cambios concurrentes de Gemini en modos, HUD, menús, modelos Folded y audio conservan su propio alcance y checkpoint.

## Autonomía de Gemini y revisión opcional

El usuario aclaró el 2026-10-10 que Gemini puede avanzar por su cuenta y que su trabajo puede ser independiente y libre. Codex no es un supervisor obligatorio ni una puerta de aprobación. Dentro del alcance ya autorizado, Gemini puede elegir y priorizar tareas, repartirlas entre sus agentes, implementarlas, verificarlas, integrarlas y cerrar sus ciclos sin esperar una sesión, respuesta o revisión de Codex. Puede continuar otras líneas del proyecto además de estos encargos visuales. Las oportunidades y el orden de esta ficha son recomendaciones, no una cola obligatoria.

Codex podrá revisar posteriormente cuando el usuario lo solicite o como parte de una sesión de revisión autorizada. Esa revisión no es requisito para considerar validada una tanda de Gemini ni para continuar la siguiente. El handoff permite esa revisión posterior y que ambos retomen avances; no crea una dependencia entre sus sesiones.

La autonomía mantiene las decisiones del usuario, los límites de publicación y la evidencia de verificación. Las reservas sirven únicamente para evitar ediciones simultáneas: ninguna herramienta o agente es dueño permanente de un archivo. Una vez terminada y documentada una tanda, sus archivos quedan disponibles. Si hay trabajo sin cerrar o una reserva activa, conservarlo y avanzar en otra tarea; no tomar el silencio de otra sesión como permiso para sobrescribirlo.

## Coordinación de archivos y oportunidades independientes

Las siguientes carpetas son destinos propuestos, no una lista exhaustiva ni trabajo ya iniciado. Gemini puede tomar una oportunidad libre o definir otra dentro de su alcance autorizado. Antes de comenzar registra agente/sesión, fecha, tarea y archivos en la tabla; cambia el estado a en curso. Solo su responsable modifica esos archivos mientras esté en curso. Al terminar deja resultado, commit y límites, y libera la reserva. Si aparece una reserva vigente o un diff ajeno en un archivo necesario, conserva ese diff y toma una tarea independiente; no espera ni pide confirmación para seguir con lo independiente.

| Línea | Responsable / estado | Archivos asignados | Entrega esperada |
|---|---|---|---|
| Composición e integración del banco visual | Sin reserva activa; muestra inicial de Codex verificada | `art-lab.html`, `src/art_lab.ts`, `src/art_lab.css`, `scripts/cinematic-check.mjs`, archivos directamente bajo `assets-src/cinematic-3d/` | Cualquier sesión puede reservar y evolucionar el banco, incorporar recursos y verificarlo sin esperar revisión de Codex |
| Frenchie: anatomía y pelo | Disponible para ciclo Gemini | Solo `assets-src/cinematic-3d/gemini-frenchie/` | Copia refinada del frenchie, script reproducible si aplica, Blender con texturas empaquetadas, GLB, capturas 360° y siete clips comprobados |
| Vegetación y props | Disponible para ciclo Gemini | Solo `assets-src/cinematic-3d/gemini-environment/` | Matas curvas y variadas, cerca/props reutilizables, materiales, Blender/GLB y prueba visual local aislada |
| Eulalio cinematográfico | Disponible para ciclo Gemini | Solo `assets-src/cinematic-3d/gemini-eulalio/` | Copia del gato basada en `07-eulalio.png`, fuente completa a 360°, materiales y conservación/prueba del rig existente |
| Rendimiento e integración futura | Investigación disponible para Gemini; integración pendiente de alcance concreto | Solo `assets-src/cinematic-3d/gemini-performance/` para informe y variantes LOD | Comparar geometría/peso, proponer estrategia compatible con instancias/VAT y cámaras actuales; no modificar runtime compartido todavía |

Los ciclos Gemini pueden seguir su trabajo autorizado en `src/main.ts`, `src/models.ts`, `src/render.ts`, `src/world.ts`, `src/glb.ts`, `src/kart.ts`, menú/HUD, audio, balance, configuración y herramientas comunes. Estos archivos no quedan bloqueados por Codex ni por esta ficha. Para una integración visual que los alcance, definir alcance, plan y responsable, respetando cualquier trabajo activo; Gemini puede realizarla sin revisión obligatoria de Codex cuando tenga autorización del usuario para esa integración. La muestra actual todavía no está integrada ni autoriza por sí sola a reemplazar el arte de las partidas. No copiar ni modificar `.claude/` o `CLAUDE.md`.

Cada encargo entrega `HANDOFF.md` dentro de su carpeta con: estado (propuesto/en curso/validado/bloqueado), responsable y fecha, entrada usada, archivos producidos, qué cambia, qué conserva, comandos y resultados reales, pendientes, commit y siguiente paso concreto. No decir «terminado» si falta exportar, cargar en Babylon o revisar los ángulos. Una herramienta ausente se registra como limitación y se avanza con lo disponible; una imagen estática no sustituye un GLB animado.

## Antes y después de cada sesión

1. Leer esta ficha, el plan de la escena y el último `HANDOFF.md` del encargo. `git status --short` y `git log -5 --oneline`; graphify primero para preguntas de arquitectura. Identificar trabajo ajeno aunque lo haya incluido otro commit. No volver a empezar ni revertirlo.
2. Continuar dentro de las decisiones aprobadas. Se recomienda primero refinar frenchie y vegetación, luego Eulalio; repetir la comparación visual antes de extender el acabado. Cambios nuevos de gameplay/balance, dirección global o integración requieren alcance propio.
3. Producir en los archivos reservados para esa tanda. Reutilizar el rig y los helpers existentes; preservar originales. Las subcarpetas propuestas facilitan trabajo paralelo; los archivos del ensamblaje se pueden evolucionar por cualquiera de las sesiones cuando estén libres.
4. Verificar al final de la tanda. Código: tsc, tests y build. Escena: `npm run test:restart` y `node scripts/cinematic-check.mjs`. Estas herramientas comparten candados del servidor y de performance; no correr una segunda medición pesada al mismo tiempo ni reiniciar pm2 por fuera de su candado. Si otro proceso está usando el recurso, hacer documentación/modelado mientras espera. No dejar navegador renderizando.
5. Guardar evidencia fuera de `.shots/` para entregas duraderas, actualizar el handoff y grafo, y realizar un commit **solo de rutas propias**. No `git add -A`, `git commit -a` ni barrer WIP de otras sesiones, aunque parezca útil como checkpoint. No publicar esta muestra. Registrar resultados de otros módulos como ajenos, sin presentarlos como pruebas propias.
6. Actualizar la entrada de esta línea en `docs/PRODUCT_EVOLUTION.md` y `docs/VISUAL_QUALITY.md` sin reemplazar el checkpoint de los ciclos concurrentes. Cada sesión verifica e integra sus entregas dentro del alcance autorizado, cierra su tanda y puede continuar sin esperar a Codex. Una revisión posterior consulta el estado real; no toma notas antiguas como aprobación nueva.

## Prompt listo para Gemini

```text
Continuar Junked Metal de forma autónoma en esta Mac desde el estado real del repositorio, sin reiniciar el trabajo ni esperar a Codex. El usuario autorizó que Gemini avance y cierre sus propios ciclos; la revisión posterior de Codex es opcional.

Leer AGENTS.md, docs/VISUAL_SESSION_COORDINATION.md, docs/CINEMATIC_3D_SLICE.md, assets-src/cinematic-3d/README.md y los handoffs existentes. Revisar Git y consultar graphify antes de explorar código. Conservar el routing nativo Gemini y no invocar otros proveedores.

Elegir y priorizar trabajo dentro del alcance ya autorizado, incluyendo otras líneas del proyecto. Frenchie y vegetación son oportunidades recomendadas, no obligatorias. Registrar los archivos de la tanda y respetar reservas activas. Si se trabaja arte, comparar contra assets-src/intro/cinematic-v1/, especialmente 10-frenchie-gris.png, 08-buggy.png y 03-entrada-fondo.png. Se pueden repartir tareas independientes entre agentes Gemini, sin trabajar dos agentes sobre el mismo archivo.

Si se toma el frenchie, debe seguir siendo gris, moderadamente musculoso, con mancha marfil visible de frente, orejas de bulldog francés, anatomía continua y siete clips conservados. Para vegetación, buscar matas curvas y variación natural, materiales relightables y geometría reutilizable. No sustituir un modelo por una imagen 2D ni declarar alcanzado el acabado sin capturas reales a 360 grados. Se pueden usar las subcarpetas propuestas o reservar otros archivos libres, incluido el banco visual; conservar las fuentes originales.

Si una parte no se puede completar con las herramientas de esta sesión, documentar qué faltó, conservar la fuente parcial y avanzar con otra tarea disponible. Aprovechar Blender y recursos locales sin crear servidores propios. Respetar trabajo ajeno, decisiones aprobadas y el alcance de cada ciclo. Cambiar física, balance o modelos activos solo si entra en el alcance autorizado para esa tanda; el banco experimental no autoriza automáticamente reemplazar el arte del juego.

Verificar e incorporar las entregas compatibles dentro del alcance autorizado, cerrar la tanda y continuar sin esperar revisión de Codex. Para recursos 3D, conservar Blender con texturas empaquetadas, GLB/materiales y capturas reales. Registrar HANDOFF.md, resultados y commit de rutas propias para que una revisión posterior sea posible. Usar herramientas headless existentes con sus candados y cerrar el navegador. No publicar esta muestra local.
```

## Prompt para retomar conmigo

```text
Continuar la línea visual de Junked Metal desde docs/VISUAL_SESSION_COORDINATION.md. Revisar primero Git, la escena actual y los HANDOFF.md de las carpetas gemini-*; conservar todo avance ajeno. Informar cuáles entregas están realmente disponibles. Incorporar al banco solamente entregas verificadas y compatibles, comparar capturas con el arte aprobado y refinar la diferencia visible. Mantener los recursos experimentales fuera del build normal y conservar física/balance/modelos activos. No publicar. Actualizar evidencia y continuidad para el siguiente ciclo.
```

La continuidad se comparte mediante archivos y prompts trasladados por el usuario. No hay sincronización automática de conversaciones ni trabajo garantizado mientras una sesión está cerrada; un agente debe retomar un prompt para continuar.
