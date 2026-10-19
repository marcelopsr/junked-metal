# Supervivencia — Plan de 4 Saltos de Mundo + Salto al Jefe del Mundo

**Fecha:** 2026-10-19  
**Objetivo:** Transformar el modo Supervivencia principal de Junked Metal de una experiencia en un solo mapa estático a una odisea roguelite dinámica de saltos dimensionales RC con 4 transiciones de mundo intermedias, seguidas del salto definitivo a la arena del Jefe del Mundo, garantizando que uno de los mundos sea una Luna pura (desolada, realista, sin postes de neón ni elementos de pista arcade).

---

## 1. Contexto y Diagnóstico Actual

Actualmente:
- El juego principal (Supervivencia, `startRun()`) transcurre durante los 10 minutos enteros en una única zona (`save.zone` o `patio`).
- El proyecto posee 11 zonas desarrolladas con gran riqueza visual y física (`patio`, `bosque`, `luna`, `ciudad`, `nieve`, `industrial`, `pileta`, `desvan`, `garaje`, `cocina`, `jardin`).
- El mapa actual de la Luna (`src/moon.ts`) incluye elementos arcade agregados con posterioridad: postes de neón emisivos, kits de chevrons y arcos brillantes, barreras de neumáticos, cactus plásticos y tonos desérticos anaranjados.
- **Petición del usuario:** 
  1. *4 saltos de mundo y luego el salto al jefe del mundo* en el juego principal.
  2. *Uno de los niveles debe ser una Luna pura*, sin nada de neón, solo regolito, cráteres, rocas basálticas, cielo espacial y desolación lunar auténtica.

---

## 2. Estructura de la Progresión de Partida

### Pacing y Duración (Partida de 10 minutos totales)
Dividimos la partida de supervivencia estándar en 5 etapas de exploración + 1 etapa de enfrentamiento final:

| Tramo | Minuto | Etapa | Eventos Clave | Salto |
|---|---|---|---|---|
| **Mundo 1** | 0:00 – 1:50 | Bioma inicial (ej. Patio trasero) | Inicio, aprendizaje, primeras armas y mejoras | **Salto 1/4** hacia Mundo 2 |
| **Mundo 2** | 1:50 – 3:40 | Bioma terrestre (ej. Bosque / Jardín / Cocina) | Oleadas densas + Minijefe 1 (2:40) | **Salto 2/4** hacia Mundo 3 |
| **Mundo 3** | 3:40 – 5:30 | **La Luna (Sin Neón, Solo Luna)** | Gravedad radial, cielo cósmico, cráteres puros | **Salto 3/4** hacia Mundo 4 |
| **Mundo 4** | 5:30 – 7:20 | Bioma contrastante (ej. Nieve / Industrial / Ciudad) | Peligros climáticos + Minijefe 2 (6:20) | **Salto 4/4** hacia Mundo 5 |
| **Mundo 5** | 7:20 – 8:50 | Bioma clímax (ej. Desván / Pileta) | Hordas extremas, élites blindadas y rápidas | **Salto al Jefe del Mundo** |
| **Arena del Jefe** | 8:50 – 10:00+ | El Mundo del Jefe (Arena de Duelo Final) | Duelo definitivo con el Jefe del Mundo (Felipe, etc.) | ¡Victoria de la partida! |

*Nota sobre determinismo:* La secuencia de mundos se deriva deterministamente de la semilla de la partida (`run.runSeed`), garantizando que la Luna pura siempre forme parte de la ruta y que dos partidas con la misma semilla ofrezcan la misma experiencia.

---

## 3. Mecánica del Salto de Mundo ("Salto Dimensional RC")

1. **Aviso y Telemetría:**
   - 20 segundos antes del salto, el HUD de telemetría y la radio emiten alerta: `ANOMALÍA CUÁNTICA RC · VÓRTICE EN FORMACIÓN`.
   - Aparece un vórtice/portal de frecuencia en el mapa, marcado en el radar.
2. **Activación del Salto:**
   - Si el auto entra en el vórtice, el salto se inicia de inmediato (recompensa de aceleración/bonus).
   - Si el tiempo del tramo expira, el vórtice colapsa y arrastra al auto automáticamente mediante un salto cuántico de emergencia.
3. **Efecto Audiovisual del Salto:**
   - Distorsión de pantalla / destello cuántico CRT con estela de velocidad (`warpStreak`).
   - SFX de salto de frecuencia sintetizado.
   - El mundo anterior se limpia sin fugas de memoria: enemigos comunes y restos desaparecen en un destello de partículas.
   - Se preservan intactos: **vida del auto, nivel, XP, armas, mejoras, pasivas, habilidades y estadísticas acumuladas**.
   - Carga limpia de la nueva zona (`setZone(nuevaZona, true)`) y posicionamiento del auto en el punto de llegada seguro.
   - Cartel de telemetría: `SALTO DE MUNDO X/4 · [NOMBRE DEL BIOMA]`.

---

## 4. Rediseño de la Luna: "Luna Pura (Sin Neón, Solo Luna)"

Para cumplir la directiva explícita *"una luna sin nada neon solo luna"*:

1. **Eliminación Total de Elementos Arcade y Neón:**
   - Se eliminan por completo los postes de neón (`moonNeon`), franjas luminiscentes (`moonStrip`), charcos de neón (`moonPuddle`), arcos y torres con emisivos rosas/celestes (`kitArch`, `kitTower`, `kitChevron`), barreras de neumáticos (`kitTires`) y bloques jersey.
   - Se retiran los cactus de juguete y los bordillos de pista roja y blanca (`moonCurb`, `moonCactus`).
   - Se desactiva la ciudad artificial en el horizonte (`city`).
2. **Textura y Materiales Auténticos de Regolito:**
   - Albedo de regolito lunar realista: tonos gris ceniza, grafito, carbón y perla (`#8a8e94`, `#b0b4ba`, `#63666b`, `#d5d8dc`) con microcráteres y polvo fino generado proceduralmente, eliminando el tono anaranjado desértico actual (`#d9985e`).
   - Rocas lunares basálticas y anortositas oscuras y angulares, con bordes impactados de eyecta clara.
3. **Iluminación y Atmósfera del Vacío Cósmico:**
   - Sol puro y directo sin dispersión atmosférica: luz blanca intensa (`#ffffff`, intensidad alta), sombras duras y negras en los cráteres.
   - Cielo espacial negro profundo salpicado de estrellas nítidas y la Tierra suspendida en el firmamento.
   - Sonido ambiental amortiguado y espacial (`sfx.ts`), transmitiendo la soledad de la superficie lunar.

---

## 5. Salto al Jefe del Mundo (Arena Final)

- Al finalizar el Mundo 5, el vórtice final se abre con máxima prioridad: `VÓRTICE AL JEFE DEL MUNDO`.
- El auto salta a la arena del Jefe del Mundo (el patio o escenario temático del jefe final asignado por la semilla: Felipe, la Aspiradora Robot, el Cortacercos o la Caja de Música).
- Se activa la secuencia de entrada del jefe con música de combate, barra de vida y telemetría de enfrentamiento definitivo.
- La victoria ante el jefe corona la expedición completa a través de los mundos.

---

## 6. Plan de Implementación por Fases

- **Fase 1: Módulo de progresión multi-mundo (`src/world_progression.ts`)**:
  - Definición de etapas, cálculo de tiempos de salto, selección de zonas por semilla con inclusión garantizada de la Luna pura.
  - Estado del vórtice dimensional (aviso, radar, colisión con el auto, salto forzado).
- **Fase 2: Motor de transición y conservación de estado (`src/main.ts`, `src/world.ts`)**:
  - Función de salto `jumpToWorld(zoneId)` que ejecute la limpieza controlada, el cambio de zona, la preservación de jugadores y la telemetría.
  - Efectos visuales de vórtice y salto (destello, shaders/partículas, banner HUD).
- **Fase 3: Limpieza y autenticidad del bioma lunar (`src/moon.ts`)**:
  - Refactorización de `moonBuild()` para crear la Luna pura sin neón ni props arcade, con paleta de regolito gris y atmósfera cósmica pura.
- **Fase 4: Salto al Jefe del Mundo y cierre de partida**:
  - Conexión del 5to salto a la arena del jefe final y resolución de victoria.
- **Fase 5: Verificación exhaustiva**:
  - TypeScript `tsc --noEmit -p .`
  - Tests unitarios de progresión y balance en Vitest (`npm test`).
  - Pruebas headless (`npm run sim`, `npm run shots`).
