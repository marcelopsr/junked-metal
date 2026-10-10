# Continuidad visual — Codex y ciclos Gemini

Actualizado: 2026-10-10. El usuario pidió que esta línea de arte pueda avanzar en varias sesiones y aprovechar el trabajo de los agentes Gemini. Esta ficha es la entrada de continuidad; consultar `git status`, `git log` y los archivos reales al retomar. No presupone que un agente esté ejecutándose ni que conozca mensajes de otro chat.

## Objetivo aprobado y estado real

Llevar Junked Metal hacia el acabado cinematográfico de `assets-src/intro/cinematic-v1/`, manteniendo identidad, buggy amarillo y rivales. Frenchie gris, moderadamente musculoso, mancha marfil frontal; Eulalio orgánico naranja. La intro conserva noche/historia. El juego vigente tiene dirección diurna Folded; esta muestra no cambia ese contrato global. La frase elegida es «Todo bajo control. De nadie. La garantía no cubre esto.»

**Hecho:** paquete raster de la intro y primera escena 3D Babylon, con buggy y frenchie completos, dos Blender editables, GLB, materiales PBR, siete clips del perro, tierra generada, patio, día/noche y cámaras. Ver `docs/CINEMATIC_3D_SLICE.md` y `assets-src/cinematic-3d/README.md`. Página local existente: http://localhost:5173/art-lab.html. Capturas y video reales en esa carpeta.

**Verificado:** tsc, 75 tests y build; headless Metal pc/cel, cargas, cuatro ruedas, siete clips con matrices finitas, idle animado, controles y ausencia de errores/desbordamiento. Mediana orientativa M4 Pro 4,1 ms pc / 2,6 ms viewport móvil. No demuestra rendimiento de teléfono físico ni de hordas.

**Pendiente:** fidelidad al arte aprobado. Anatomía/pelo del frenchie, pasto curvo/variado, desgaste localizado, fondo y luz necesitan otra pasada. Eulalio 3D cinematográfico, LOD, animación instanciada e integración en los modos no están realizados. Los GLB antiguos no son la ruta activa: `FOLDED_SLICE = true`. No basta con reemplazar un archivo de `public/models/` para afirmar que el juego cambió.

La muestra está fuera del build estándar y todos sus recursos están en `assets-src/cinematic-3d/`, no en `public/`. Se trabaja en esta Mac, sin subir/publicar recursos ni crear tareas programadas. Los cambios concurrentes de Gemini en modos, HUD, menús, modelos Folded y audio conservan su propio alcance y checkpoint.

## Propiedad de archivos y encargos independientes

Las siguientes carpetas de encargos son destinos propuestos; **no indican trabajo ya iniciado**. El coordinador de Gemini puede tomarlas cuando el usuario le pase el prompt. Antes de comenzar registra agente/sesión, fecha, tarea y archivos en la tabla; cambia el estado a en curso. Solo su dueño modifica esos archivos mientras esté en curso. Al terminar deja resultado, commit y límites, y libera la reserva. Si aparece una reserva vigente o un diff ajeno en un archivo necesario, conserva ese diff y toma una tarea independiente; no espera ni pide confirmación para seguir con lo independiente.

| Línea | Responsable / estado | Archivos asignados | Entrega esperada |
|---|---|---|---|
| Composición e integración del banco visual | Codex / muestra inicial verificada, continuidad en futuras sesiones | `art-lab.html`, `src/art_lab.ts`, `src/art_lab.css`, `scripts/cinematic-check.mjs`, archivos directamente bajo `assets-src/cinematic-3d/` | Escena ejecutable, referencias y revisión de entregas; actualizar el ensamblaje tras evaluar cada recurso |
| Frenchie: anatomía y pelo | Disponible para ciclo Gemini | Solo `assets-src/cinematic-3d/gemini-frenchie/` | Copia refinada del frenchie, script reproducible si aplica, Blender con texturas empaquetadas, GLB, capturas 360° y siete clips comprobados |
| Vegetación y props | Disponible para ciclo Gemini | Solo `assets-src/cinematic-3d/gemini-environment/` | Matas curvas y variadas, cerca/props reutilizables, materiales, Blender/GLB y prueba visual local aislada |
| Eulalio cinematográfico | Disponible para ciclo Gemini | Solo `assets-src/cinematic-3d/gemini-eulalio/` | Copia del gato basada en `07-eulalio.png`, fuente completa a 360°, materiales y conservación/prueba del rig existente |
| Rendimiento e integración futura | Investigación disponible para Gemini; integración pendiente de alcance concreto | Solo `assets-src/cinematic-3d/gemini-performance/` para informe y variantes LOD | Comparar geometría/peso, proponer estrategia compatible con instancias/VAT y cámaras actuales; no modificar runtime compartido todavía |

Fuera de esta reserva visual: `src/main.ts`, `src/models.ts`, `src/render.ts`, `src/world.ts`, `src/glb.ts`, `src/kart.ts`, menú/HUD, audio, balance, configuración y herramientas comunes de pruebas. Los ciclos existentes pueden seguir su trabajo ya autorizado allí; ninguna entrega visual los cambia incidentalmente. Si una futura integración requiere alguno, definir propiedad y plan antes de editarlo. No copiar ni modificar `.claude/` o `CLAUDE.md`.

Cada encargo entrega `HANDOFF.md` dentro de su carpeta con: estado (propuesto/en curso/validado/bloqueado), responsable y fecha, entrada usada, archivos producidos, qué cambia, qué conserva, comandos y resultados reales, pendientes, commit y siguiente paso concreto. No decir «terminado» si falta exportar, cargar en Babylon o revisar los ángulos. Una herramienta ausente se registra como limitación y se avanza con lo disponible; una imagen estática no sustituye un GLB animado.

## Antes y después de cada sesión

1. Leer esta ficha, el plan de la escena y el último `HANDOFF.md` del encargo. `git status --short` y `git log -5 --oneline`; graphify primero para preguntas de arquitectura. Identificar trabajo ajeno aunque lo haya incluido otro commit. No volver a empezar ni revertirlo.
2. Continuar dentro de las decisiones aprobadas. Se recomienda primero refinar frenchie y vegetación, luego Eulalio; repetir la comparación visual antes de extender el acabado. Cambios nuevos de gameplay/balance, dirección global o integración requieren alcance propio.
3. Producir en la carpeta propia. Reutilizar el rig y los helpers existentes; preservar originales. Los archivos directamente bajo `cinematic-3d/` son el ensamblaje de Codex, no la salida de encargos paralelos.
4. Verificar al final de la tanda. Código: tsc, tests y build. Escena: `npm run test:restart` y `node scripts/cinematic-check.mjs`. Estas herramientas comparten candados del servidor y de performance; no correr una segunda medición pesada al mismo tiempo ni reiniciar pm2 por fuera de su candado. Si otro proceso está usando el recurso, hacer documentación/modelado mientras espera. No dejar navegador renderizando.
5. Guardar evidencia fuera de `.shots/` para entregas duraderas, actualizar el handoff y grafo, y realizar un commit **solo de rutas propias**. No `git add -A`, `git commit -a` ni barrer WIP de otras sesiones, aunque parezca útil como checkpoint. No publicar esta muestra. Registrar resultados de otros módulos como ajenos, sin presentarlos como pruebas propias.
6. Actualizar la entrada de esta línea en `docs/PRODUCT_EVOLUTION.md` y `docs/VISUAL_QUALITY.md` sin reemplazar el checkpoint de los ciclos concurrentes. El receptor verifica el estado real y decide cómo incorporar entregas; no toma notas antiguas como aprobación nueva.

## Prompt listo para Gemini

```text
Continuar Junked Metal en esta Mac desde el estado real del repositorio, sin reiniciar el trabajo. Coordinar el ciclo con la línea visual de Codex autorizada por el usuario el 2026-10-10.

Leer AGENTS.md, docs/VISUAL_SESSION_COORDINATION.md, docs/CINEMATIC_3D_SLICE.md, assets-src/cinematic-3d/README.md y los handoffs existentes. Revisar Git y consultar graphify antes de explorar código. Conservar el routing nativo Gemini y no invocar otros proveedores.

Tomar primero el encargo independiente de frenchie o vegetación que esté libre en la tabla. Registrar la reserva. Refinar el recurso contra las imágenes aprobadas de assets-src/intro/cinematic-v1/, especialmente 10-frenchie-gris.png, 08-buggy.png y 03-entrada-fondo.png. Si el otro encargo también está libre y hay agentes Gemini disponibles, repartir ambas carpetas a responsables distintos dentro del ciclo. No trabajar dos agentes sobre el mismo archivo.

El frenchie debe seguir siendo gris, moderadamente musculoso, con mancha marfil visible de frente, orejas de bulldog francés, anatomía continua y siete clips conservados. La vegetación debe tener matas curvas y variación natural, materiales relightables y geometría reutilizable. No sustituir el recurso por una imagen 2D ni declarar alcanzado el acabado sin capturas reales a 360 grados. Trabajar en las subcarpetas gemini-frenchie/ o gemini-environment/ asignadas; conservar el banco y las fuentes originales.

Si una parte no se puede completar con las herramientas de esta sesión, documentar exactamente qué faltó, conservar la fuente parcial y dejar un siguiente paso ejecutable. Aprovechar Blender y recursos locales disponibles sin crear servidores propios. No tocar física, balance, modelos activos Folded, configuración, archivos de otra sesión ni el ensamblaje del banco visual. Los otros ciclos ya autorizados pueden seguir fuera de estas reservas.

Entregar Blender con texturas empaquetadas, GLB y materiales, capturas reales, HANDOFF.md con comandos/resultados y commit de rutas propias. Usar herramientas headless existentes con sus candados y cerrar el navegador. No publicar la muestra. Dejar la entrega disponible para que Codex la revise e incorpore al banco en una sesión posterior.
```

## Prompt para retomar conmigo

```text
Continuar la línea visual de Junked Metal desde docs/VISUAL_SESSION_COORDINATION.md. Revisar primero Git, la escena actual y los HANDOFF.md de las carpetas gemini-*; conservar todo avance ajeno. Informar cuáles entregas están realmente disponibles. Incorporar al banco solamente entregas verificadas y compatibles, comparar capturas con el arte aprobado y refinar la diferencia visible. Mantener los recursos experimentales fuera del build normal y conservar física/balance/modelos activos. No publicar. Actualizar evidencia y continuidad para el siguiente ciclo.
```

La continuidad se comparte mediante archivos y prompts trasladados por el usuario. No hay sincronización automática de conversaciones ni trabajo garantizado mientras una sesión está cerrada; un agente debe retomar un prompt para continuar.
