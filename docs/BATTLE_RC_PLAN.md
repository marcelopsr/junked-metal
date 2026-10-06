# Battle RC — Plan maestro del modo de duelo melee

> **Decisiones de diseño cerradas en [`docs/DEMOLICION_GDD.md`](./DEMOLICION_GDD.md)** (incl. §34–37 materiales, UI, balance; §36 assets OS + [`ATTRIBUTIONS.md`](./ATTRIBUTIONS.md)).
> Este documento es histórico y sirve como checklist de rondas de decisión; el GDD manda en caso de contradicción.

Estado: **BORRADOR — sin aprobar. Prohibido implementar hasta cerrar las decisiones del checklist.**
Fecha: 2026-10-06 · Regla asociada: `.cursor/rules/plan-antes-de-feature.mdc`

Este documento planifica un modo nuevo: **duelo 1 contra 1 estilo BattleBots** entre robots RC armados por
piezas, con combate cuerpo a cuerpo (sin proyectiles). NO es la "Batalla de globos" ya existente
(10 corredores con objetos, documentada en `docs/BATTLE_ARCHITECTURE.md`); ese documento se usa acá
solo como mapa de qué código ya sabe hacer arenas, pilotos y HUD.

---

## Decisiones usuario (2026-10-06 ronda 1)

Toolbox cerrado. Decisiones vinculantes para la implementación:

| # | Pregunta (origen: SPEC-modo-robots.md R1) | Decisión |
|---|---|---|
| 1 | Nombre del modo | **«Demolición»** (UI definitivo; interno `duel`, módulo `src/duel.ts`) |
| 2 | UX del armado | **Pantalla propia estilo garaje 3D + ranuras** (`Scr` nueva en `duel.ts`, 3 ranuras + vista 3D del robot; patrón visual del garaje de `menu.ts`) |
| 3 | Arquetipo del enemigo v0 | **Cuña embestidora** (IA de acometida directa; enseña el sistema; par natural del trompo) |
| 4 | Fidelidad física | **Sim-lite** (`applyForce`/`applyTorque`, NO `drive()`; el CoG del armado importa físicamente; puede volcar) |

**Pendientes de Ronda 1 según este plan (no cerrados en esta sesión):**
- P2 de la Ronda 1 del plan: relación con la progresión (tornillos/modo lateral) → **pasa a Ronda 2**
- P3 de la Ronda 1 del plan: escenario/arena del MVP → **pasa a Ronda 2** (pregunta de look de arena)

> Nota: las preguntas de R1 del SPEC-modo-robots.md y de este plan no son idénticas; los ítems del
> checklist §10 se actualizan abajo.

**Consecuencias directas:**
- `drive()` queda fuera del loop del modo duel (fuerzas puras sobre Havok).
- Trampa Havok: NO fijar velocidad → `centerOfMass` SÍ se puede desplazar según el armado.
- El nombre "batalla" queda reservado para los globos de `kart.ts`; nunca usar para este modo.
- **MVP sin proyectiles** (confirmado): §4.2 y §2 son correctos al respecto; ninguna sección de este doc debe proponer proyectiles para el modo duel.

---

## 1. Visión y límites

### Qué es (MVP)
- El jugador **arma su robot** con piezas: chasis, ruedas, arma melee. El armado define la física
  (masa, centro de gravedad, velocidad, agarre).
- **Un nivel, un enemigo** con barra de vida. Duelo en una arena cerrada hasta el KO.
- Combate **solo por contacto**: embestidas, armas rotatorias, cuñas, knockback. **Cero proyectiles.**
- Objetivo final (después, NO ahora): un **vertical slice** jugable de punta a punta
  (taller → duelo → resultado). No se codea nada hasta aprobar este plan.

### Qué NO es (fuera del MVP, posible futuro)
- Torneos, brackets, más de un enemigo, más de una arena.
- Multijugador local (split-screen) — el reuso lo permite, pero no entra en el MVP.
- Daño por pieza con desmembramiento completo (piezas que se caen y cambian la física en vivo):
  se evalúa como futuro; el MVP usa el modelo de vida que se decida en la Ronda 3.
- Proyectiles de cualquier tipo (decisión firme del usuario: BattleBots es melee).
- Economía profunda de piezas (rarezas, mercado). El MVP usa el origen de piezas que se decida.

---

## 2. Nombres candidatos del modo

(Texto visible del juego: español neutro, sin voseo. Decisión en Ronda 1.)

| Candidato | Nota |
|---|---|
| **Duelo de chatarra** | Encaja con "Junked Metal", directo |
| **Arena RC** | Corto, describe el lugar |
| **Combate** | Genérico pero claro en el menú (como "Carrera") |
| **Demolición** | Agresivo, estilo BattleBots |

---

## 3. Flujos de pantalla

```
Menú principal
  └─ [Nombre del modo]
       └─ Taller de duelo (armado del robot)
            ├─ elegir chasis  → vista previa 3D en vivo (patrón garaje: peek)
            ├─ elegir ruedas  → cambia velocidad/agarre mostrados
            ├─ elegir arma    → se monta en el slot del chasis
            ├─ (CoG según decisión R2-P4)
            └─ [Pelear]
       └─ Presentación del duelo (nombres, barras, cuenta regresiva — patrón kart begin())
       └─ Duelo (arena, HUD con 2 barras de vida + telemetría RC)
            ├─ KO / condición de fin → cámara lenta breve (patrón outro)
            └─ Resultado (ganador, daño hecho/recibido, duración; patrón showResults de kart)
                 ├─ Revancha
                 ├─ Volver al taller
                 └─ Salir al menú
```

- El taller de duelo reutiliza los patrones del garaje (`menu.ts`: vista previa `peek`,
  listas con scroll, confirmación de compra si las piezas cuestan tornillos).
- Entrada dev: `?duelo` (análogo a `?race` / `?battle`), hooks `__duel.info()/skip()/give()`.

---

## 4. Sistemas

### 4.1 Armado (piezas, slots, física)
- **Slots del MVP** (cantidad final en Ronda 2): chasis (define masa base, puntos de montaje y vida),
  ruedas (velocidad, agarre, altura), arma (daño, masa en voladizo → mueve el CoG).
- Cada pieza aporta `{ masa, offsetCoG, stats }`. El armado produce un bot con:
  - masa total y **centro de gravedad** resultante (afecta volcado en impactos),
  - velocidad/aceleración/giro (parámetros de `drive()` de `car.ts`),
  - vida máxima y daño del arma.
- **Trampa Havok conocida (CLAUDE.md):** NO desplazar `centerOfMass` en cuerpos con velocidad fijada
  cada frame. `drive()` fija velocidades → el CoG se simula **a mano**: la inercia se ajusta vía
  `Car.setMass` (masa + inercia juntas) y el volcado se resuelve con lógica propia (umbral de impulso
  según CoG), no con el solver. Esto es un supuesto técnico central del plan.
- Modelos: piezas procedurales en `models.ts` (patrón `template()` + instancias), montadas como
  hijos del nodo visual del `Car`. Un collider único por bot (caja o convex) — no un cuerpo por pieza.

### 4.2 Combate melee
- **Daño por contacto:** en cada colisión bot-bot se calcula la velocidad relativa en el punto de
  impacto; si supera un umbral, el que tiene el arma activa en esa cara hace daño (fórmula exacta
  en Ronda 3: física pura vs. números por arma con multiplicador de velocidad).
- **Armas rotatorias** (spinner horizontal/vertical): giran acumulando "energía"; el golpe descarga
  daño y knockback grandes y frena el giro (como BattleBots: el spinner queda vulnerable tras el golpe).
  El giro es visual + estado lógico; el daño se aplica por detección de contacto, no por el solver.
- **Knockback:** impulso aplicado con `applyImpulse` tras el contacto, proporcional al daño y a la
  diferencia de masa. Cuidado con la trampa Havok: el impulso se aplica entre frames de `drive()`.
- **Volcado:** si el impulso recibido supera el umbral (función del CoG), el bot vuelca; qué pasa
  después (queda fuera, se endereza solo, botón de enderezar) se decide en Ronda 3.
- **Sin proyectiles:** ninguna entidad separada del cuerpo del bot hace daño.

### 4.3 IA enemiga v0
- Un solo enemigo con barra de vida. Base: patrón `battleAi()` / `aiInput()` de `kart.ts`
  (perseguir objetivo, girar hacia él, acelerar), simplificado a un objetivo fijo (el jugador).
- v0: perseguir y embestir de frente; retroceder y re-alinearse tras cada choque; mantener el arma
  orientada al jugador. Sin estados complejos ni dificultades. Personalidad/dificultad = futuro.
- El enemigo usa el MISMO sistema de bot armado (chasis+ruedas+arma con una configuración fija):
  un solo código de combate para ambos.

### 4.4 UI
- **Dos barras de vida** (jugador y enemigo) estilo terminal RC (fósforo sobre negro, VT323/Silkscreen,
  sin esquinas redondeadas; paleta de `docs/ART_DIRECTION.md` §HUD).
- Telemetría RC del duelo: velocímetro, estado del arma (revoluciones del spinner como aguja/LCD),
  avisos de radio ("¡Impacto directo!"). Nivel de detalle en Ronda 4.
- Nombres de los bots sobre las barras; daño flotante reutilizando los números de daño de `ui.ts`.

---

## 5. Reuso técnico

Mapa detallado en `docs/BATTLE_ARCHITECTURE.md` (válido también para este modo). Resumen:

| Componente | Archivo | Reuso |
|---|---|---|
| `drive()` + clase `Car` (física arcade, animación, `setMass`) | `car.ts` | Directo; el bot ES un Car con piezas montadas |
| Arena cerrada (`buildArena()` L220) | `kart.ts` | Adaptar (muro circular ya existe) |
| IA de persecución (`battleAi()` L541, `aiInput()` L581) | `kart.ts` | Base de la IA v0 |
| Golpes entre autos (`hurtRacer()` L527) | `kart.ts` | Referencia para contacto y knockback |
| Presentación/resultado (`begin()`, `showResults()`, podio) | `kart.ts` | Adaptar a 1v1 |
| Input unificado (`pollPlayer()`) | `input.ts` | Directo |
| Vista previa y compra del garaje (`peek`, confirmación) | `menu.ts` | Patrón para el taller de duelo |
| Piezas procedurales, `template()`, `carModel()` | `models.ts` | Base de las piezas nuevas |
| FX pool (`burst`, chispas, restos), `SFX`, `music()` | `fx.ts`/`sfx.ts` | Directo |
| `rng()`/`seedRng()` para duelos reproducibles | `rng.ts` | Directo |
| `npm run sim -- --duel` (duelos headless existentes) | scripts | Patrón para probar balance del modo |

Módulo nuevo: `src/duel.ts` (o el nombre que salga de Ronda 1) + CSS propio, enganchado en
`main.ts` como `kart.ts` (init/tick/active). Techo ponytail: si pasa de ~1200 líneas, separar
armado (taller) de combate.

## 6. Arte y sonido (según `docs/ART_DIRECTION.md`)

- **De día** (giro Megabonk 2026-10-03): sol alto, colores saturados, low-poly con texturas
  pixeladas ≤96 px NEAREST, contornos suaves, post retro con dither.
- Bots = **réplicas RC creíbles**: policarbonato con stickers, amortiguadores visibles, daño visible
  (humo y chispas con poca vida, piezas flojas).
- Impactos con peso: flash blanco, chispas del material, esquirlas, sacudida; hit-stop solo en golpes
  grandes. Código de amenaza: rojo = enemigo, verde fósforo = jugador (también en las barras de vida).
- Arena contando la historia del patio: objetos cotidianos como paredes (libros, cajas, herramientas).
- Sonido sintetizado (`sfx.ts`): motor + arma rotatoria (zumbido que sube de tono), impacto metálico,
  campana de inicio. ¿`music("battle")` existente o tema nuevo? → Ronda 4.
- Prohibido: emojis, UI genérica, esquinas redondeadas, blancos puros.

## 7. Balance

- Sección nueva en `src/balance.json` (misma mecánica que el resto: tipado en `balance.ts`,
  exportable a la planilla con `npm run balance:xlsx` + `DESC` en `scripts/balance-xlsx.mjs`):
  - **`duelo_piezas`**: id, slot (chasis/ruedas/arma), masa, vida, daño, velocidad, agarre, costo.
  - **`duelo_ritmo`**: umbral de daño por velocidad, factor de knockback, umbral de volcado,
    tiempo de carga del spinner, duración máxima del duelo.
- Quedan en código (como siempre): tamaños de colisión, colores, offsets de montaje, animaciones.
- Verificación de balance: extender `npm run sim -- --duel` o hook `__duel.sim()` para duelos
  headless reproducibles por semilla (decisión de herramienta en Ronda 4).

## 8. Riesgos

| Riesgo | Detalle | Mitigación / detección |
|---|---|---|
| **Havok + CoG** | Desplazar `centerOfMass` con velocidades fijadas rompe contactos (trampa documentada) | CoG simulado a mano (inercia + lógica de volcado propia); prototipo física PRIMERO (Fase 1) |
| **Havok + impulsos** | `drive()` fija velocidad cada frame; un `applyImpulse` simultáneo puede no verse | Aplicar knockback suspendiendo `drive()` unos frames (estado "aturdido"), patrón `spin` de kart.ts |
| **Volcado injugable** | Bots volcados que no se recuperan = frustración | Decisión explícita en R3-P2 + auto-enderezado de la IA |
| **Rendimiento** | Ya hay ~1.600 draw calls en partida; el modo debe ser MÁS liviano (2 bots, 1 arena) | Piezas instanciadas de plantillas; escenario `perf` propio antes de cerrar Fase 3 |
| **Alcance** | El armado por piezas puede crecer sin fin (más slots, más piezas) | MVP cerrado por este plan: los slots y piezas que salgan de Ronda 2, ni uno más |
| **Dos "batallas"** | Confusión entre Batalla de globos existente y este modo | Nombre distinto (Ronda 1) y módulo separado |

## 9. Fases 0–3 (con criterios de terminado)

### Fase 0 — Decisiones y diseño cerrado (SIN código)
Rondas de AskUserQuestion (§11) hasta vaciar el checklist (§10); actualizar este documento con lo decidido.
- **Terminado cuando:** checklist §10 sin pendientes, plan marcado APROBADO por el usuario, `/graphify --update` sobre docs.

### Fase 1 — Prototipo de física del duelo (lo riesgoso primero)
`src/duel.ts` mínimo: arena, 2 bots con configuración FIJA (sin taller), daño por contacto,
knockback, volcado, barras de vida, KO, IA v0. Entrada `?duelo` + hooks dev.
- **Terminado cuando:** `?duelo` juega un duelo completo hasta KO sin crashes; el knockback y el
  volcado se sienten (verificado con capturas + duelo headless); `npx tsc --noEmit -p .`, `npm test`,
  `npm run build` verdes; ningún proyectil existe.

### Fase 2 — Armado (taller de duelo)
Piezas en `balance.json` (`duelo_piezas`), taller con vista previa, el armado cambia la física real
(masa, CoG, velocidad, vida, daño), guardado de la configuración en `Save`, enemigo con armado fijo propio.
- **Terminado cuando:** cambiar cada pieza produce diferencia medible en el duelo (sim headless con
  2+ configuraciones); la configuración persiste entre sesiones; compra/desbloqueo según lo decidido en R2-P3.

### Fase 3 — Vertical slice presentable
Flujo completo menú → taller → presentación → duelo → resultado; UI telemetría final; FX/SFX de
impactos; música; escenarios `shots` y `perf` del modo; textos en español neutro.
- **Terminado cuando:** flujo completo sin consola; `npm run shots -- --diff` sin cambios no queridos
  (nuevas referencias del modo aceptadas); `perf` del duelo ≤ que el de carrera; revisión
  `/ponytail-review` del diff; usuario prueba y aprueba el slice.

## 10. Checklist de decisiones pendientes (todas requieren al usuario)

Ninguna se decide sin toolbox. Total: **16**.

| # | Decisión | Ronda |
|---|---|---|
| 1 | ~~Nombre del modo~~ → **Demolición** ✓ | R1 ✓ |
| 2 | Relación con la progresión (modo lateral vs. integrado al save/tornillos) | R2 |
| 3 | Escenario/arena del MVP (look de la arena) | R2 |
| 4 | ~~Identidad del enemigo v0~~ → **Cuña embestidora** ✓ | R1 ✓ |
| ★ | ~~UX del armado~~ → **Pantalla propia 3D + ranuras** ✓ | R1 ✓ |
| ★ | ~~Fidelidad física~~ → **Sim-lite (fuerzas Havok)** ✓ | R1 ✓ |
| 5 | Slots de pieza que entran al MVP | R2 |
| 6 | Set de armas melee inicial | R2 |
| 7 | Origen de las piezas (todo libre vs. compra con tornillos) | R2 |
| 8 | CoG: automático por piezas vs. ajuste manual del jugador | R2 |
| 9 | Fórmula de daño (física pura vs. tabla por arma × velocidad) | R3 |
| 10 | Volcado: consecuencia y recuperación | R3 |
| 11 | Condición de fin del duelo | R3 |
| 12 | Modelo de vida (barra única vs. daño por zona) | R3 |
| 13 | Alcance de la telemetría RC en el HUD | R4 |
| 14 | Música del duelo | R4 |
| 15 | Herramienta de verificación (extender `sim --duel` vs. hook propio) | R4 |
| 16 | Orden de arranque (¿Fase 1 directo tras aprobar, o maqueta visual del taller antes?) | R4 |

## 11. Rondas sugeridas de AskUserQuestion

Contenido completo para que el coordinador las lance tal cual (4 preguntas × 4 opciones,
recomendada primera). Si una respuesta abre dudas nuevas → ronda extra antes de codear.

### Ronda 1 — Identidad y marco del modo

**P1. ¿Cómo se llama el modo?** (selección única)
- **Duelo de chatarra (Recomendado)** — Encaja con el nombre del juego (Junked Metal) y con el tono de patio/chatarra. Evita confusión con la "Batalla de globos" existente. Módulo `duel.ts`.
- **Arena RC** — Corto y descriptivo del lugar. Más neutro, menos personalidad; sirve si el modo crece a más formatos (torneo, 2v2).
- **Demolición** — Agresivo, evoca BattleBots directamente. Riesgo: promete destrucción total de piezas que el MVP quizá no tenga.
- **Combate** — Genérico y claro en el menú, al nivel de "Carrera". Gana claridad, pierde sabor.

**P2. ¿Cómo se relaciona con la progresión del juego?** (selección única)
- **Modo lateral puro (Recomendado)** — Como Carrera: no suma XP ni afecta el save del roguelite. Las piezas viven solo en el modo. Más simple, cero riesgo de romper la economía actual; se integra después si funciona.
- **Integrado a los tornillos** — Las piezas se compran con los tornillos del save general. Da propósito extra a la moneda, pero obliga a balancear precios contra el taller actual desde el día uno.
- **Con recompensas hacia el roguelite** — Ganar duelos da tornillos o desbloqueos del juego principal. Motiva jugarlo, pero acopla los dos balances (más riesgo).
- **Integrado total (piezas = garaje)** — El armado usa los autos y piezas del garaje existente. Máximo reuso visual, pero mezcla dos sistemas de stats pensados para cosas distintas.

**P3. ¿Dónde se pelea el duelo del MVP?** (selección única)
- **Arena propia en el patio (Recomendado)** — Octágono/círculo cercado con objetos cotidianos (ladrillos, maderas, libros) sobre el pasto. Reutiliza `buildArena()` de kart.ts y la dirección de arte del patio; identidad propia con poco costo.
- **El garaje de la casa** — Piso de cemento con manchas de aceite, herramientas alrededor. Muy BattleBots, pero es una zona comprable del roguelite: puede confundir.
- **Mesa de taller** — Pelea en miniatura sobre la mesa (la escena del menú taller ya existe). Original y vistoso, pero escala y cámara nuevas = más riesgo técnico.
- **Arena "show" nueva** — Gradas de juguetes, luces de espectáculo. La más BattleBots y la más cara en arte; mejor como futuro.

**P4. ¿Quién es el enemigo v0 (el único del MVP)?** (selección única)
- **Robot RC espejo (Recomendado)** — Otro bot armado con el mismo sistema de piezas (configuración fija agresiva). Un solo código de combate para ambos; el enemigo demuestra el sistema de armado.
- **El robot de juguete existente** — Reutiliza el enemigo `robot` del roguelite adaptado a la arena. Menos trabajo de modelo, pero no pelea con las mismas reglas (menos BattleBots).
- **Juguete nuevo con personalidad** — Un rival con nombre e historia (como Eulalio o Felipe). Más carisma, más costo de arte y balance.
- **Autito a fricción agrandado** — Versión arena del enemigo existente: embiste sin arma. El duelo más simple posible, pero no muestra las armas rotatorias.

### Ronda 2 — Sistema de armado

**P1. ¿Qué slots de pieza entran al MVP?** (selección múltiple)
- **Chasis + ruedas + arma (Recomendado)** — Los tres que piden la visión: masa/vida, movilidad y daño. Suficiente para que el armado importe sin explotar el alcance.
- **+ Placa/cuña defensiva** — Cuarto slot pasivo (reduce daño frontal, puede levantar al rival). Suma la dinámica cuña-vs-spinner de BattleBots; +1 sistema que balancear.
- **+ Motor** — Slot que cambia aceleración y velocidad máxima por separado de las ruedas. Más profundidad, más combinaciones que probar.
- **Solo chasis + arma** — Mínimo absoluto; las ruedas vienen con el chasis. Menos trabajo, pero el armado se siente pobre.

**P2. ¿Qué armas melee entran al set inicial?** (selección múltiple)
- **Spinner horizontal + cuña (Recomendado)** — El arma icónica de BattleBots más su contra natural. Dos estilos de juego opuestos con solo dos armas.
- **+ Spinner vertical** — Lanza al rival hacia arriba (knockback vertical espectacular). Tercer estilo; exige que el volcado esté bien resuelto.
- **+ Martillo/hacha** — Brazo que golpea hacia abajo al presionar un botón. Primer arma activa (botón), agrega input nuevo al modo.
- **+ Embestidor (ram)** — Sin arma móvil: todo el daño por masa y velocidad. El más fácil de balancear; bueno como configuración del enemigo v0.

**P3. ¿Cómo se consiguen las piezas en el MVP?** (selección única)
- **Todo desbloqueado (Recomendado)** — En el MVP todas las piezas están libres: el foco es probar que el armado y el combate funcionan. La economía llega después con datos reales.
- **Compra con tornillos** — Se compran con la moneda del save (si R1-P2 lo permite). Da progresión inmediata, pero balancear precios sin conocer el meta es adivinar.
- **Desbloqueo por victorias** — Ganar duelos abre piezas nuevas. Requiere más de un enemigo o dificultades para sostenerlo: choca con "1 nivel, 1 enemigo".
- **Set fijo inicial + 1 desbloqueo demo** — Casi todo libre con un desbloqueo de muestra para probar el flujo de compra. Híbrido razonable si se quiere testear UI de compra.

**P4. ¿El centro de gravedad lo maneja el jugador?** (selección única)
- **Automático por piezas (Recomendado)** — Cada pieza tiene masa y posición; el CoG resulta solo y se muestra en la vista previa (marcador). El jugador lo siente sin otra pantalla más; menos riesgo Havok.
- **Ajuste manual acotado** — Deslizador para mover lastre adelante/atrás dentro de un rango. Una decisión táctica extra (estabilidad vs. agresividad) con UI mínima.
- **Posicionamiento libre de piezas** — El jugador ubica las piezas sobre el chasis (grilla). El sueño BattleBots completo; mucha UI y validación: fuera de alcance MVP.
- **Sin CoG en MVP** — Todos los bots igual de estables; el CoG llega después. Simplifica, pero mata el volcado, que es la mitad de la gracia melee.

### Ronda 3 — Reglas del combate

**P1. ¿Cómo se calcula el daño de un golpe?** (selección única)
- **Tabla por arma × velocidad relativa (Recomendado)** — Daño base por arma (en `balance.json`) multiplicado por qué tan fuerte fue el contacto. Balanceable en planilla y repetible en sim; la física aporta el multiplicador, no el número.
- **Física pura** — El daño sale solo del impulso del contacto Havok. Máximo realismo, mínimo control: difícil de balancear y de reproducir en pruebas.
- **Números fijos por arma** — Cada toque del arma hace su daño fijo con cooldown. Lo más predecible y lo menos físico: las embestidas dejan de importar.
- **Híbrido con críticos** — Tabla × velocidad + crítico si se golpea la parte trasera/expuesta. Más profundidad, se puede agregar sobre la opción recomendada después.

**P2. ¿Qué pasa cuando un bot vuelca?** (selección única)
- **Vulnerable + auto-enderezado lento (Recomendado)** — Volcado queda indefenso unos segundos (recibe daño aumentado) y se endereza solo con una animación torpe. Castiga sin frustrar; la IA también puede volcar.
- **Botón de enderezar** — Minijuego de presionar/mashear para volverse. Más interacción, más input que enseñar.
- **KO directo si no se endereza en 10 s** — Como BattleBots real (cuenta del árbitro). Dramático, pero duelos que terminan sin golpe final pueden sentirse anticlimáticos.
- **No existe el volcado en MVP** — Los bots nunca vuelcan (se fuerza la rotación). Elimina el riesgo Havok más grande, pero pierde el punto del CoG.

**P3. ¿Cuándo termina el duelo?** (selección única)
- **KO por vida a cero (Recomendado)** — Simple y claro: la barra llega a cero, cámara lenta, resultado. Sin jueces ni tiempo en el MVP.
- **KO o tiempo límite con decisión por daño** — A los N minutos gana quien hizo más daño. Evita duelos eternos contra IA defensiva; agrega UI de tiempo.
- **KO o inmovilización** — Si un bot no se mueve 10 s (volcado o roto), pierde. Fiel a BattleBots; depende de cómo se resuelva R3-P2.
- **Al mejor de 3 asaltos** — Rounds cortos con reinicio. Más estructura de show; alarga el MVP.

**P4. ¿Cómo se modela la vida del bot?** (selección única)
- **Barra única por bot (Recomendado)** — Vida total que baja con los golpes; daño visible cosmético (humo, chispas, piezas flojas) según porcentaje. Claro de leer y barato; el "1 enemigo con barra de vida" pedido, literal.
- **Barra + estados de pieza** — La barra manda, pero el arma y las ruedas pueden "romperse" visualmente al cruzar umbrales (el spinner se frena, el bot renquea). Más drama con costo medio.
- **Vida por zona (frente/lados/atrás)** — Daño localizado con multiplicadores por zona expuesta. Más táctico, HUD más complejo.
- **Vida por pieza con pérdida real** — Las piezas se caen y la física cambia en vivo. El sueño completo: claramente post-MVP.

### Ronda 4 — Presentación y verificación

**P1. ¿Cuánta telemetría RC lleva el HUD del duelo?** (selección única)
- **Esencial (Recomendado)** — Dos barras de vida estilo fósforo con nombres, velocímetro propio y estado del arma (revoluciones del spinner). Legible en celular; lo demás se suma si hace falta.
- **Terminal completa** — Batería, señal, avisos de radio del roguelite adaptados al duelo. Máxima identidad, riesgo de ruido en 1v1.
- **Minimalista de show** — Solo las dos barras grandes arriba, estilo pelea de arcade. Lee perfecto, pierde la identidad RC.
- **Esencial + avisos de radio** — Lo esencial más mensajes del locutor por radio ("¡Golpe crítico!"). Un toque de show con costo bajo.

**P2. ¿Qué música suena en el duelo?** (selección única)
- **Reutilizar `music("battle")` (Recomendado)** — El tema de batalla sintetizado ya existe; cero costo para el MVP. Tema propio después si el modo queda.
- **Tema nuevo sintetizado** — Composición propia en `sfx.ts` (más percusión/metal). Identidad desde el día uno, horas extra de audio.
- **Sin música, solo ambiente** — Motores, chispas y público lejano. Tenso y raro (bueno), pero puede sentirse vacío.
- **Tema del jefe reutilizado** — La música de jefe del roguelite. Gratis y dramática, pero mezcla identidades.

**P3. ¿Con qué se verifica el balance del duelo?** (selección múltiple)
- **Extender `npm run sim -- --duel` (Recomendado)** — El runner de duelos headless ya existe para jefes; agregar bots del modo. Reproducible por semilla, corre en la tanda de verificación estándar.
- **Escenario `shots` + `perf` del modo** — Capturas del taller/duelo/resultado y medición de rendimiento. Obligatorio antes de cerrar Fase 3 igual; marcar acá si se quiere desde Fase 1.
- **Hook `__duel.sim(n)` en consola** — Duelo rápido sin dibujar desde el navegador dev. Útil para iterar a mano; redundante si el runner CLI queda bien.
- **Solo pruebas manuales** — Jugar los duelos a mano. No reproducible: desaconsejado como único método.

**P4. ¿Qué se hace primero al aprobar el plan?** (selección única)
- **Fase 1: prototipo de física (Recomendado)** — Atacar primero lo riesgoso (contacto, knockback, volcado, CoG sobre Havok) con bots fijos y cero UI. Si la física no se siente bien, el resto no importa.
- **Maqueta del taller primero** — Armar la pantalla de armado con piezas de mentira para validar el flujo. Valida UX temprano, pero pospone el riesgo técnico real.
- **Las dos en paralelo (encargos)** — Un encargo física + un encargo taller (archivos distintos). Más rápido en calendario; más integración después.
- **Vertical slice directo** — Todo de una hasta el slice. Máximo riesgo de retrabajo: desaconsejado.

---

*Documento de planificación. Al cerrar cada ronda, actualizar §10 y las secciones afectadas,
y recién con el checklist vacío marcar el plan como APROBADO y arrancar Fase 1.*
