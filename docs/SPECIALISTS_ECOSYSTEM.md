# Ecosistema de Especialistas Matriciales — Junked Metal

Junked Metal comparte un equipo de **especialistas por disciplina y modalidad**, con las herramientas y modelos que el usuario elija: Codex, Antigravity, Gemini u otras sesiones autorizadas. Todos pueden producir, aportar, reutilizar, integrar y revisar recursos. Los roles se asignan por tarea, no por proveedor; este catálogo es una ayuda para repartir trabajo, no una plantilla obligatoria.

**Decisión del usuario, 2026-10-10:** se puede trabajar de forma autónoma o con un orquestador para una tanda concreta. No hay supervisor permanente ni revisión obligatoria de Codex. La continuidad reside en el repositorio, las fuentes, los catálogos y los handoffs, no en que otra sesión esté abierta. Para la línea artística, consultar `docs/VISUAL_SESSION_COORDINATION.md` y `docs/ART_DIRECTION.md`: el juego vigente es diurno Folded y la intro/muestra cinematográfica conserva la noche.

---

## 1. Principios de Operación

1. **Partición Disjunta Estricta de Archivos:**
   - En cada ciclo paralelo, ningún archivo es modificado por más de un especialista a la vez. Con orquestador, este asigna rutas disjuntas; en trabajo autónomo, cada sesión registra una reserva temporal y toma archivos libres. Las reservas se liberan al cerrar la tanda; no crean propiedad permanente.
2. **Criterio Profesional Proactivo:**
   - Los especialistas no son meros ejecutores mecánicos. Cuidan los micro-detalles de su disciplina, aplican la escalera YAGNI (Ponytail) y auditan su área al finalizar para reportar `[Oportunidades Detectadas]` que alimentan el Backlog del siguiente ciclo.
3. **Verificación al cierre de la tanda:**
   - Con orquestador, los especialistas entregan fuentes y controles propios; el orquestador integra y realiza una verificación compartida al final. Una sesión autónoma verifica y cierra su propia entrega. Aplicar las comprobaciones del proyecto según alcance; usar `npm run test:restart` y los candados existentes, sin servidores propios ni mediciones pesadas simultáneas. Una revisión independiente requerida por la tarea se mantiene, pero no tiene que pertenecer a un proveedor concreto.
4. **Herramientas elegidas por el usuario y aislamiento:**
   - Cada sesión conserva su configuración nativa hasta que el usuario indique otra. La configuración Gemini de Antigravity no restringe a todo el equipo ni impide usar recursos aportados por otros modelos. No invocar otro harness, cambiar proveedores ni alterar configuraciones ajenas por iniciativa propia. No modificar `.claude/` ni `CLAUDE.md`.
5. **Entrega reutilizable y verificable:**
   - Recursos: original editable, exportación usable, prompt o script si existe, catálogo de rutas/usos/formatos y límites, y evidencia real. Código: archivos afectados, comprobaciones y resultado. Dejar `HANDOFF.md` o checkpoint existente con responsable, estado, commit, pendientes y siguiente paso. Preservar fuentes anteriores y WIP ajeno; commits solo de rutas propias. Una propuesta, un recurso generado y una integración probada son estados diferentes.

---

## 2. Catálogo de Especialistas (11 Roles)

### A. Especialistas Horizontales (Disciplinas Transversales)

#### 1. Diegetic HUD & Telemetry Specialist
- **Territorio primario:** `src/ui.ts`, `src/hud.css`
- **Misión:** Diseñar y refinar la instrumentación de cabina y telemetría de radio RC (pantallas monocromas, voltímetros analógicos LiPo, alertas de canal, indicadores térmicos, barras de combustible/carga).
- **Invariantes:** Tipografía Rajdhani, texturas de chapa troquelada, sin emojis, contrastes nítidos de fósforo ámbar, cian y esmeralda.

#### 2. Menu, Workshop & Flow Specialist
- **Territorio primario:** `src/menu.ts`, `src/menu.css`
- **Misión:** Flujos de garaje, taller de chatarra, banco de trabajo, selector de carrocerías, catálogo de pinturas, configuración y bestiario.
- **Invariantes:** Estética de archivador de taller mecánico sucio con etiquetas Dymo, tornillería en esquinas, jerarquía visual compacta para móvil y escritorio.

#### 3. Combat Feel & VFX Specialist
- **Territorio primario:** `src/fx.ts`
- **Misión:** Efectos de partículas instanciadas, esquirlas metálicas, humo criogénico, estelas de derrape, micro-chispas de fricción, chispazos de plasma y marcas sobre asfalto y barro.
- **Invariantes:** Pool de partículas sin fugas de memoria, respeto estricto de draw calls, escala física verosímil para modelos a escala 1:10.

#### 4. Audio & Synth Sound Designer
- **Territorio primario:** `src/sfx.ts`
- **Misión:** Síntesis procedural pura por Web Audio API (osciladores seno, triángulo, sierra, ruido filtrado). Zumbidos de motor eléctrico RC, relés analógicos, chirridos de neumáticos, estática y avisos acústicos.
- **Invariantes:** Cero archivos WAV/MP3 externos pesados; síntesis ligera determinista con envolventes limpias para evitar pops o distorsión.

#### 5. Procedural 3D & Folded Modeler
- **Territorio primario:** `src/models.ts`, `src/kit3d.ts`
- **Misión:** Modelado procedural mediante CSG y mallas fusionadas (`template()`), alerones, tomas de aire, tensores, jaulas antivuelco, antenas con banderín y tuercas cromadas.
- **Invariantes:** Geometría low-poly optimizada; colisionadores Havok creados antes de mover transformadas; materiales PBR metálicos y plásticos con envejecimiento.

#### 6. Visual Polish & LookDev Specialist
- **Territorio primario:** `src/render.ts`, `src/world.ts`
- **Misión:** Dirección de arte visual, sombras, niebla, iluminación, texturas de terreno, pasto instanciado y post-procesado según la dirección aprobada de cada escena.
- **Invariantes:** Juego diurno Folded vigente, noche para la intro cinematográfica, identidad de patio RC y control de rendimiento en shaders. Consultar las decisiones más recientes de `docs/ART_DIRECTION.md`.

#### 7. UX, Flow & Interaction Specialist
- **Territorio primario:** `src/input.ts`, `src/intro.ts`, `src/savefmt.ts`
- **Misión:** Sensibilidad y respuesta de mandos (teclado, gamepad analógico, palancas táctiles virtuales en pantalla), navegación por foco accesible, robustez del guardado y secuencias narrativas.
- **Invariantes:** Migraciones de guardado no destructivas, compatibilidad móvil estricta (sin botones invisibles ni tap targets menores a 44px).

#### 8. Archive & Polaroid Specialist
- **Territorio primario:** `src/replay.ts`, `src/replay.css`
- **Misión:** Presentación fotográfica instantánea al cierre de partida (Polaroid gastada con sellos entintados diegéticos, odómetro analógico, marcas de emulsión y repetición en cámara lenta).
- **Invariantes:** Canvas 2D renderizado con fidelidad retro; sellos tipográficos coherentes con fichas de inspección técnica.

---

### B. Custodios Verticales de Modalidad

#### 9. Survival Gameplay Steward
- **Territorio primario:** `src/main.ts`, `src/enemies.ts`, `src/weapons.ts`, `src/balance.json`, `src/balance.ts`
- **Misión:** Supervivencia pura contra enjambres de insectos, juguetes rotos y aspiradoras asesinas. Curva de tensión, sinergias de armas y evoluciones, oleadas y jefes de patio.
- **Invariantes:** Balance desacoplado en `balance.json`; determinismo con `rng()`; colisiones Havok seguras.

#### 10. Racing Mode Steward
- **Territorio primario:** `src/kart.ts`, `src/race.css`
- **Misión:** Competencia de carreras de karts RC en pista perimetral. Físicas arcade de derrape y salto, rebufo dinámico, items de pista, IA de oponentes con personalidades y Lakitu.
- **Invariantes:** Pantalla dividida reservada exclusivamente a PC; soporte fluido de 10 karts simultáneos.

#### 11. Junket Crush Cabinet Steward
- **Territorio primario:** `src/match3.ts`, `src/match3_draw.ts`, `src/match3_logic.ts`, `src/match3.css`
- **Misión:** Minijuego arcade integrado en gabinete 3D tipo feria/bar. Reglas match-3 de piezas mecánicas, multiplicadores de combo, feedback háptico/visual y metas por nivel.
- **Invariantes:** Independencia económica respecto al modo Supervivencia (sin tornillos cruzados).

---

## 3. Dos formas de continuar

**Autónoma:** leer Git, instrucciones y último handoff; elegir una tarea autorizada, reservar archivos libres, producir, verificar, registrar el resultado y liberar la reserva. Si otro encargo necesita esos archivos, avanzar en otra línea sin sobrescribir ni esperar revisión de Codex. La libertad de priorizar conserva las decisiones de arte, gameplay y publicación del usuario.

**Orquestada:** cuando se use coordinación para una tanda, cualquier sesión autorizada puede asumir ese rol. Define objetivo y criterio de entrega, reparte trabajo independiente según recursos disponibles y reúne las entregas. No hay número fijo de agentes ni proveedor obligatorio. El orquestador coordina esa tanda; no adquiere control permanente del proyecto.

```text
[Orquestador]
    │
    ├─► 1. Evalúa estado y define una tanda con rutas disjuntas y criterio de entrega
    │
    ├─► 2. Despliega subagentes en paralelo con contexto y asignación específica
    │      │
    │      ├─► Especialista A (ej. Menu & Workshop)    ──► Modifica sus archivos + Detecta oportunidades
    │      ├─► Especialista B (ej. Diegetic HUD)       ──► Modifica sus archivos + Detecta oportunidades
    │      ├─► Especialista C (ej. 3D Modeler)         ──► Modifica sus archivos + Detecta oportunidades
    │      └─► Especialista D (ej. Audio Synth)        ──► Modifica sus archivos + Detecta oportunidades
    │
    ├─► 3. Recibe entregas de código y reportes de oportunidades
    │
    ├─► 4. Ejecuta Verificación Canónica Centralizada (tsc, test, build, pm2, shots, graphify)
    │
    ├─► 5. Actualiza documentación histórica (VISUAL_QUALITY, PRODUCT_EVOLUTION)
    │
    ├─► 6. Commit de rutas propias; publicar solo según autorización de esa línea
    │
    └─► 7. Libera reservas y deja handoff; pregunta solo si hay decisiones reales abiertas
```

## 4. Prompt común para cualquier herramienta o modelo

```text
Continuar Junked Metal en esta Mac desde el estado real de Git y los handoffs. Leer AGENTS.md, docs/SPECIALISTS_ECOSYSTEM.md y, para arte, docs/VISUAL_SESSION_COORDINATION.md. Conservar decisiones aprobadas, configuración nativa y trabajo concurrente. Usar graphify para orientación.

Trabajar de forma autónoma dentro del alcance autorizado. Si esta tanda tiene orquestador, respetar su reparto temporal de rutas y criterio de entrega. Elegir tareas libres y reutilizar recursos existentes; cualquier integrante puede aportar fuentes, modelos, imágenes, materiales, código o revisión. No esperar aprobación de Codex para avanzar o cerrar una entrega verificable.

Registrar los archivos reservados, preservar originales y entregar fuentes/exportaciones, catálogo, comprobaciones reales, pendientes y commit solo de rutas propias. Verificar al final de la tanda con herramientas locales existentes y sus candados. Liberar reservas. La línea cinematográfica y sus bibliotecas son locales: no publicar ni dar por integrada una imagen o un GLB sin probarlo en el juego. No hay sincronización automática de chats ni trabajo garantizado al cerrar una sesión.
```
