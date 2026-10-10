# Ecosistema de Especialistas Matriciales — Junked Metal

Junked Metal opera con un modelo matricial de **Especialistas por Disciplina y Custodios de Modalidad**, coordinados por un **Orquestador Central**. Este sistema garantiza alta especialización técnica y artística, coherencia estilística diegética (Folded 2.5D chapa oxidada, electrónica artesanal RC de traspatio) y máxima eficiencia en ejecución paralela sin colisiones de archivos.

---

## 1. Principios de Operación

1. **Partición Disjunta Estricta de Archivos:**
   - En cada ciclo paralelo, ningún archivo es modificado por más de un especialista a la vez. El Orquestador asigna conjuntos disjuntos de rutas.
2. **Criterio Profesional Proactivo:**
   - Los especialistas no son meros ejecutores mecánicos. Cuidan los micro-detalles de su disciplina, aplican la escalera YAGNI (Ponytail) y auditan su área al finalizar para reportar `[Oportunidades Detectadas]` que alimentan el Backlog del siguiente ciclo.
3. **Verificación Integrada Centralizada:**
   - Los subagentes no ejecutan servidores ni suites pesadas. El Orquestador corre la verificación canónica (`tsc --noEmit`, `npm test`, `npm run build`, `pm2 restart rc-test`, `npm run shots` y `graphify update .`) una vez que todos los especialistas de la tanda entregan su código.
4. **Gemini Only y Aislamiento:**
   - Todo el ecosistema opera exclusivamente sobre modelos Gemini. Queda prohibida la dependencia o modificación de entornos ajenos (`.claude/`).

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
- **Misión:** Dirección de arte visual, sombras, niebla nocturna volumétrica, iluminación por farol único, texturas de terreno, pasto instanciado y post-procesado CRT/retro.
- **Invariantes:** Un único foco duro direccional, atmósfera nocturna de jardín suburbano descuidado, control de rendimiento en shaders.

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

## 3. Protocolo de Colaboración Orquestador - Especialistas

```text
[Orquestador]
    │
    ├─► 1. Evalúa estado y define tanda de 4 especialistas con partición disjunta
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
    ├─► 6. Commit y Push a origin/master
    │
    └─► 7. Propone al usuario opciones para el siguiente ciclo vía ask_question
```
