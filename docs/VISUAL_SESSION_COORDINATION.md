# Continuidad visual — equipo y recursos compartidos

Actualizado: 2026-10-10. El usuario pidió que esta línea de arte pueda avanzar en varias sesiones y aprovechar el trabajo de los agentes Gemini. Esta ficha es la entrada de continuidad; consultar `git status`, `git log` y los archivos reales al retomar. No presupone que un agente esté ejecutándose ni que conozca mensajes de otro chat.

**Ampliación del usuario:** cualquier herramienta o modelo que él elija puede aportar y reutilizar estos recursos. Codex y Antigravity/Gemini son colaboradores actuales, no roles exclusivos. `docs/SPECIALISTS_ECOSYSTEM.md` define el método común: trabajo autónomo o un orquestador temporal por tanda, fuentes y catálogo compartidos, reservas breves y cierre verificable. Los prompts específicos de abajo son ejemplos de continuidad, no requisitos de proveedor.

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

Las siguientes carpetas son destinos propuestos, no una lista exhaustiva ni trabajo ya iniciado. Gemini puede tomar una oportunidad libre o definir otra dentro de su alcance autorizado. Cualquier herramienta/modelo autorizado puede tomar estas líneas. Los nombres `gemini-*` son destinos históricos propuestos, no una restricción de autoría; se puede reservar una carpeta con nombre neutral sin borrar fuentes previas. Antes de comenzar registra agente/sesión, fecha, tarea y archivos en la tabla; cambia el estado a en curso. Solo su responsable modifica esos archivos mientras esté en curso. Al terminar deja resultado, commit y límites, y libera la reserva. Si aparece una reserva vigente o un diff ajeno en un archivo necesario, conserva ese diff y toma una tarea independiente; no espera ni pide confirmación para seguir con lo independiente.

| Línea | Responsable / estado | Archivos asignados | Entrega esperada |
|---|---|---|---|
| Composición e integración del banco visual | Gemini Orquestador / validado y disponible (2026-10-10) | `art-lab.html`, `src/art_lab.ts`, `src/art_lab.css`, `scripts/cinematic-check.mjs`, archivos directamente bajo `assets-src/cinematic-3d/` | Integración general de modelos PBR, iluminación cinematográfica, selector Frenchie/Eulalio/Dúo, cámaras y mediciones verificadas |
| Frenchie: anatomía y pelo | Gemini Frenchie Specialist / validado y disponible (2026-10-10) | `assets-src/cinematic-3d/gemini-frenchie/`, `assets-src/cinematic-3d/frenchie.glb` | Modelo refinado de bulldog francés con mancha marfil visible, orejas de murciélago erguidas, 7 clips intactos, pelaje mate PBR |
| Buggy industrial y chatarra | Gemini Buggy Specialist / validado y disponible (2026-10-10) | `assets-src/cinematic-3d/gemini-buggy/`, `assets-src/cinematic-3d/buggy.glb` | Buggy amarillo con chatarra ensamblada, remaches, pintura gastada, suspensión A-arms, amortiguadores coilover 3D y 4 ruedas independientes con tacos profundos |
| Vegetación y props | Gemini Environment Specialist / validado y disponible (2026-10-10) | `assets-src/cinematic-3d/gemini-environment/`, `assets-src/cinematic-3d/{vegetation,fence_boundary,patio_lights,ground_terrain}.glb` | Matas curvas de pasto orgánico, cerca de tablas envejecidas con cuerda de seguridad, catenaria con bombillas Edison ST64 y suelo con huellas de neumáticos |
| Eulalio cinematográfico | Gemini Eulalio Specialist / validado y disponible (2026-10-10) | `assets-src/cinematic-3d/gemini-eulalio/`, `assets-src/cinematic-3d/eulalio.glb` | Modelo de Eulalio basado en `07-eulalio.png`, 8 clips de GatoRig intactos, pelaje naranja atigrado mate, babero y calcetines blancos, ojos verdes |
| Rendimiento e integración futura | Gemini Performance Specialist / validado y disponible (2026-10-10) | `assets-src/cinematic-3d/gemini-performance/`, `bench-lod.html`, `src/bench_lod.ts`, `docs/LOD_AND_INSTANCING_PLAN.md` | Modelos LOD1 rig-safe (-93% tris), benchmark automatizado de horda (100 unidades a 7.9 ms / ~126 FPS en Metal), plan de integración a Supervivencia |

Los ciclos Gemini pueden seguir su trabajo autorizado en `src/main.ts`, `src/models.ts`, `src/render.ts`, `src/world.ts`, `src/glb.ts`, `src/kart.ts`, menú/HUD, audio, balance, configuración y herramientas comunes. Estos archivos no quedan bloqueados por Codex ni por esta ficha. Para una integración visual que los alcance, definir alcance, plan y responsable, respetando cualquier trabajo activo; Gemini puede realizarla sin revisión obligatoria de Codex cuando tenga autorización del usuario para esa integración. La muestra actual todavía no está integrada ni autoriza por sí sola a reemplazar el arte de las partidas. No copiar ni modificar `.claude/` o `CLAUDE.md`.

Cada encargo entrega `HANDOFF.md` dentro de su carpeta con: estado (propuesto/en curso/validado/bloqueado), responsable y fecha, entrada usada, archivos producidos, qué cambia, qué conserva, comandos y resultados reales, pendientes, commit y siguiente paso concreto. No decir «terminado» si falta exportar, cargar en Babylon o revisar los ángulos. Una herramienta ausente se registra como limitación y se avanza con lo disponible; una imagen estática no sustituye un GLB animado.

## Antes y después de cada sesión

1. Leer esta ficha, el plan de la escena y el último `HANDOFF.md` del encargo. `git status --short` y `git log -5 --oneline`; graphify primero para preguntas de arquitectura. Identificar trabajo ajeno aunque lo haya incluido otro commit. No volver a empezar ni revertirlo.
2. Continuar dentro de las decisiones aprobadas. Se recomienda primero refinar frenchie y vegetación, luego Eulalio; repetir la comparación visual antes de extender el acabado. Cambios nuevos de gameplay/balance, dirección global o integración requieren alcance propio.
3. Producir en los archivos reservados para esa tanda. Reutilizar el rig y los helpers existentes; preservar originales. Las subcarpetas propuestas facilitan trabajo paralelo; los archivos del ensamblaje se pueden evolucionar por cualquiera de las sesiones cuando estén libres.
4. Verificar al final de la tanda. Código: tsc, tests y build. Escena: `npm run test:restart` y `node scripts/cinematic-check.mjs`. Estas herramientas comparten candados del servidor y de performance; no correr una segunda medición pesada al mismo tiempo ni reiniciar pm2 por fuera de su candado. Si otro proceso está usando el recurso, hacer documentación/modelado mientras espera. No dejar navegador renderizando.
5. Guardar evidencia fuera de `.shots/` para entregas duraderas, actualizar el handoff y grafo, y realizar un commit **solo de rutas propias**. No `git add -A`, `git commit -a` ni barrer WIP de otras sesiones, aunque parezca útil como checkpoint. No publicar esta muestra. Registrar resultados de otros módulos como ajenos, sin presentarlos como pruebas propias.
6. Actualizar la entrada de esta línea en `docs/PRODUCT_EVOLUTION.md` y `docs/VISUAL_QUALITY.md` sin reemplazar el checkpoint de los ciclos concurrentes. Cada sesión verifica e integra sus entregas dentro del alcance autorizado, cierra su tanda y puede continuar sin esperar a Codex. Una revisión posterior consulta el estado real; no toma notas antiguas como aprobación nueva.

## Biblioteca de superficies disponible — v1

El usuario pidió más recursos como la tierra aprobada. La tanda `assets-src/material-library/v1/` aporta ocho albedos independientes: tierra compactada, hierba/tierra, hormigón, madera, acero oxidado, pintura amarilla, asfalto y ladrillo. PNG originales de 1254 × 1254, WebP a igual resolución, prompts exactos y `assets.json` con usos, parámetros iniciales y mapas ausentes. Galería local: http://localhost:5173/assets-src/material-library/v1/index.html. Leer su `README.md` y `HANDOFF.md` antes de integrar.

Gemini puede aplicar estos recursos o producir variantes de forma autónoma dentro de su alcance autorizado; no necesita esperar revisión de Codex. No están aplicados a las partidas. Repetición no certificada sin costuras y normal/ORM pendientes; el atlas Folded activo de 64 px requiere una estrategia propia para conservar detalle. La carpeta no entra en el build normal ni se publica. La reserva de producción se libera al completar esta tanda; futuras sesiones conservan sus originales y usan versiones nuevas.

**Ambientación elegida y producida — v1:** `assets-src/environment-library/v1/` complementa las superficies con cuatro imágenes RGBA independientes: aceite, huellas de neumáticos, hojas y pequeños restos. PNG 1254 × 1254, WebP con alpha exacto, prompts, catálogo, guía y galería de composición sobre tres suelos. Leer su `HANDOFF.md` para el cierre y las pruebas. Son recursos planos disponibles, no efectos físicos ni integración en partidas. Cualquier sesión autorizada puede aportar variantes o aprovecharlos.

**Utilería voxel MagicaVoxel — v1 (2026-10-10):** `assets-src/magicavoxel/v1/` contiene 15 fuentes `.vox` en cinco familias y tres semillas, además de cinco GLB representativos con textura embebida exportados desde MagicaVoxel y convertidos con Blender. Se abrieron e inspeccionaron las familias en MagicaVoxel; verificador local confirma formato y mallas. Biblioteca disponible para cualquier sesión; no está integrada a las partidas ni publicada. Comparativa local de neumáticos Folded vs voxel: `assets-src/magicavoxel/v1/comparison.html`. Ver su `README.md` para conversión y límites.

**Corrección visual explícita del usuario (2026-10-10):** para los props que sigan la línea activa, «esférico» significa volumen 3D redondeado/curvo, no geometría de bloques. El neumático es un aro toroidal porque esa es su forma física. `assets-src/smoothvoxels/v1/` contiene la nueva prueba de tres aros redondeados, fuente MagicaVoxel de alta resolución procesada en Smooth Voxels, export GLB y comparativa pc/cel. Sigue fuera del gameplay: la geometría actual es demasiado pesada para tomarla como asset final de móvil sin reducirla y medirla.

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


## Props procedurales disponibles — v1 (2026-10-10)

`assets-src/procedural-props/v1/` aporta quince modelos GLB reales: pallets, neumáticos apilados, bidones abollados, chapas y tornillería, con tres variantes por semilla. Incluye fuente Blender empaquetada, generador, quince mapas PBR y catálogo. Visor local: http://localhost:5173/assets-src/procedural-props/v1/index.html. Leer README/HANDOFF del paquete antes de regenerar o integrar. Verificados en Babylon pc/cel; reserva de esta tanda liberada.

Complementa los recursos recientes de Gemini; no está integrado en partidas ni sustituye esos archivos. Gemini, Antigravity y cualquier herramienta/modelo autorizado pueden reutilizar una selección, proponer su integración dentro del alcance vigente o crear versiones nuevas, sin esperar revisión obligatoria de Codex. Conservar fuentes editadas, consultar Git y reservas activas; no publicar esta biblioteca local. LOD, AO horneado, instancias de integración y rendimiento real pendientes.

**Props redondeados Smooth Voxels — v1 (2026-10-10):** `assets-src/smoothvoxels/v1/` reúne la pila de cubiertas de volumen curvo y candidatos GLB para maceta de terracota, lata de pintura RC y bidón oxidado. Conserva fuentes `.vox`/`.svox`, el generador local `generate_props.py` y el visor Babylon en http://localhost:5173/assets-src/smoothvoxels/v1/props-preview.html. La maceta/lata pueden compararse con props actuales de `src/world.ts`; el bidón amplía ambientación. **Ninguno está integrado ni reemplaza su lógica/colisión.** Revisar `HANDOFF.md`; reducir geometría y medir móvil antes de plantear integración. El usuario pidió explícitamente modelos redondeados, no aspecto cúbico.
