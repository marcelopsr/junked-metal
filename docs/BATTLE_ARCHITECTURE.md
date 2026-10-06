> **⚠ REFERENCIA OBLIGATORIA antes de implementar:**
> - `.claude/trabajo/SPEC-modo-robots.md` — especificación completa del modo (fuente de verdad)
> - `docs/BATTLE_RC_PLAN.md` — plan de ejecución cuando exista
>
> Este documento describe la arquitectura interna de `src/duel.ts`. Si hay contradicción con la SPEC, la SPEC manda.

# Arquitectura de módulo `duel.ts` – Modo combate melee (BattleBots)

**Propósito:** Nuevo modo de juego estilo BattleBots. El jugador arma un robot (chasis + ruedas + arma melee) y lo enfrenta a 1 enemigo IA en una arena cerrada. **No hay proyectiles ni ítems de carrera**: el daño es 100 % por contacto físico. No pertenece al loop roguelite survivor.

**Nombre interno:** `duel` (`src/duel.ts`). El nombre `battle` ya está tomado por el modo de globos de `kart.ts` (`startBattle()`, L404); no reutilizarlo ni confundirlo.

**Estado actual:** Especificación lista (SPEC-modo-robots.md). Sin código todavía.

---

## 0. Decisiones de diseño críticas (divergen de kart.ts)

| Punto | kart.ts (globos) | duel.ts (BattleBots) |
|---|---|---|
| Proyectiles | ✅ petardo, misil | ❌ **prohibidos** — melee puro |
| Ítems de carrera | ✅ turbo, escudo, rayo, chicle | ❌ **prohibidos** — sin cajas de ítems |
| Manejo | `drive()` — fija velocidad por frame | **Fuerzas/torques Havok** — el CdG del armado importa |
| `centerOfMass` | No se desplaza (trampa Havok) | Se desplaza según piezas; requiere manejo por fuerzas (ver §0.1) |
| Enemigos | 10 autos IA genéricos | 1 enemigo IA con barra de vida y tipo fijo |
| Armado | Auto fijo del garaje | 3 ranuras: chasis / ruedas / arma melee |
| Número de jugadores | 1-2 (split-screen en escritorio) | 1 jugador vs 1 IA (MVP) |
| Modo en menú | `api.battle()` (L160, menu.ts) | `?duel` en dev; sin entrada en menú principal en fase 1 |

### 0.1 Por qué fuerzas Havok y no `drive()`

`drive()` en `car.ts` fija `setLinearVelocity` cada frame (L86-88). Esto:
- Cancela la inercia en X/Z — el auto **nunca puede volcar**.
- Hace que desplazar `centerOfMass` rompa la resolución de contactos Havok (trampa documentada en CLAUDE.md).

En el modo BattleBots **el volcado es una victoria y el centro de gravedad del armado debe importar** (pieza "cuña baja" mete el chasis bajo el rival y lo levanta). Por eso `duel.ts` maneja los robots con `applyForce` / `applyTorque`, no con `drive()`.

Si durante el prototipo las fuerzas resultan inestables, el fallback es arcade (`drive()` + inercia asimétrica "coreografiada" sin CdG real), pero ese cambio debe registrarse en la SPEC.

---

## 1. Qué reutilizar directamente

### 1.1 Clase `Car` (renderizado y animación visual)
- **Archivo:** `src/car.ts`
- **Métodos clave:** `constructor`, `.animate(dt, steer, fs, maxSpeed)`, `.dispose()`.
- **Por qué:** Malla, colisionador y animación visual ya funcionan. Se instancia igual que en kart.ts.
- **Diferencia clave:** `duel.ts` **no llama `drive()`**; aplica fuerzas directamente sobre `car.body`.
- **`setMass()`:** Llamar con masa + inercia correctos según chasis elegido; nunca setear masa sola.

### 1.2 Primitivas de modelos (`models.ts`)
- **Exportados útiles:** `box()`, `cyl()`, `sph()`, `merge()`, `place()`, `wheel()`, `pbr()`, `PARTS`.
- **Por qué:** Las piezas del robot se construyen proceduralmente. `PARTS` ya tiene orugas, defensas, ruedas todoterreno reutilizables como mallas de ranura.
- **`carModel()` no sirve directo:** el robot se arma por piezas, no por `CarKind`.

### 1.3 Ciclo de entrada (`input.ts`)
- **Exportado:** `pollPlayer(ctl): { throttle, steer, drift, item }`
- **Integración:** `duel.ts` llama `pollPlayer()` en el bucle. El campo `item` se ignora (no hay ítems).

### 1.4 Audio sintetizado (`sfx.ts`)
- **Reutilizar:** `music("battle")` a 150 BPM (ya existe), `SFX.explosion()`, `SFX.whoosh()`, `SFX.splat()`.
- **No reutilizar:** `SFX.miniTurbo()`, `SFX.shield()`, `SFX.boing()` (son de ítems de carrera).

### 1.5 Efectos visuales (`fx.ts`)
- **Pool:** `FX.sparks()`, `FX.dust()`, `FX.death()`, `burst()`, `mark()`.
- **`IMPACT` por arma:** chispas del color del arma al contacto; nunca rojo para lo del jugador.
- **Sin cambios en fx.ts.**

### 1.6 Generador determinista (`rng.ts`)
- `seedRng(seed)` + `rng()` para spawns y decisiones de IA. `Math.random()` solo para efectos visuales.

### 1.7 `setZone("patio")` y clima
- **`world.ts`:** `setZone("patio")` + clima `mediodia` (igual que la batalla de globos de kart.ts).
- La arena es un recinto propio ~25 m montado en el patio de día.

### 1.8 HUD (referencia de estilo, no copiar directo)
- `ui.ts` / `hud.css` como referencia visual (Silkscreen, estética CRT, fósforo verde).
- La barra de vida del enemigo es roja (amenaza); la propia son celdas de batería.
- El HUD de duel.ts vive en `duel.css`, no en `hud.css`.

---

## 2. Qué NO reutilizar de kart.ts — razones críticas

### 2.1 Proyectiles (`spawnProj`, física de misil/petardo) ❌ PROHIBIDO
- **Por qué:** El modo es melee puro, sin proyectiles. La SPEC lo explicita.
- **No hay excepción:** ni "para debug" ni "como ítem raro". El diseño de combate es 100 % contacto.

### 2.2 Sistema de ítems (cajas, turbo, escudo, rayo, chicle) ❌ PROHIBIDO
- **Por qué:** Ítems de carrera rompen la fantasía BattleBots y el diseño de daño por contacto.
- **No reutilizar:** `weightedItem()`, `useItem()`, `stepWorld()` para cajas, tipos `Item`, `ITEM_ICON`.

### 2.3 `drive()` de `car.ts` ⚠ NO usar en robots de duel
- **Por qué:** Ver §0.1. Fija velocidad por frame y cancela la física real de volcado.
- **Excepción permitida:** Si el prototipo Havok resulta inestable y se decide fallback arcade, documentarlo en la SPEC y en un comentario `ponytail:` en el código.

### 2.4 Lógica de circuito (tracks, vueltas, lap timing) ❌ NO aplica
- Sin circuito, sin vueltas, sin `nearestIdx()`, sin `onLap()`.
- **Arena en duel.ts:** Recinto cuadrado/circular ~25 m, piso de acero, paredes sólidas.

### 2.5 Sistema de puntuación de carrera (medallas, `placeOf()`) ❌ NO aplica
- No hay posiciones de carrera. Victoria = vida del enemigo a 0. Derrota = vida propia a 0 o volcado 10 s.

### 2.6 Clase `Racer` de kart.ts ❌ NO reutilizar
- Tiene campos de circuito (`lap`, `idx`, `frac`, `lapBest`) que ensucian el tipo. Crear `DuelBot` en duel.ts.

### 2.7 Enemigos roguelite (`enemies.ts`, `weapons.ts`, `main.ts` spawner) ❌ Sin overlap
- El modo duel no tiene enemigos de tipo `Enemy`, ni armas roguelite, ni spawner del loop principal.
- No importar nada de `enemies.ts` ni `weapons.ts` en `duel.ts`.

### 2.8 Split-screen (`setSplit` de render.ts) — pospuesto
- MVP es 1 jugador. No implementar split-screen en fase 1.
- En móvil: siempre 1 jugador (regla global del proyecto).

---

## 3. Mecánica de daño por contacto (núcleo del modo)

```
daño = base_arma × vel_relativa_norm × factor_masa
       (trompo: × RPM_actual / RPM_max)
```

- **Ventana entre golpes:** cooldown 0,4–0,6 s por par arma-víctima (evita que el contacto continuo derrita la vida). El jugador lo lee como golpes discretos con flash blanco + chispas.
- **Knockback:** impulso proporcional al daño sobre el punto de contacto. Sierra: agrega componente vertical. Trompo: impulso lateral + freno propio (conservación "de mentira" pero legible).
- **Detección:** Eventos de colisión Havok o chequeo de distancia por frame (decidir en prototipo; el cooldown amortigua ráfagas).
- **Victoria:** Vida enemigo → 0 → humo + piezas desprendidas (`wear()` de Car como referencia).
- **Derrota:** Vida propia → 0 **o** robot volcado/inmovilizado 10 s continuos (cuenta regresiva visible).

---

## 4. Estructura propuesta de `src/duel.ts`

```typescript
// ── Configuración & tipos ──────────────────────────────────────────────────
export type DuelCtl = "kbd" | "pad0";
export type DuelCfg = { ctl: DuelCtl };
export const duelCfg: DuelCfg = { ctl: "kbd" };

type DuelBot = {
  id: number;            // 0 = jugador, 1 = enemigo IA
  car: Car;
  human: boolean;
  hp: number;            // vida actual
  hpMax: number;
  hitAt: number;         // timestamp último golpe recibido (cooldown)
  immobileAt: number;    // timestamp inicio inmovilidad (volcado)
  // Arma melee
  weaponMesh: B.Mesh;
  weaponRpm: number;     // solo trompo
  // Cámara (solo jugador)
  camPos: B.Vector3;
  camYaw: number;
};

type RobotConfig = {
  chassis: "caja" | "cuña" | "plancha";
  wheels:  "estandar" | "gigantes" | "orugas";
  weapon:  "trompo" | "sierra" | "pala";
};

// ── Constantes de arena ────────────────────────────────────────────────────
const ARENA_SIZE = 25;    // metros, recinto cuadrado
const KO_TIME    = 10;    // segundos volcado = derrota

// ── Hooks exportados para main.ts ──────────────────────────────────────────
export function initDuel(deps: Deps): void;
export function startDuel(cfg: RobotConfig): void;
export function endDuel(): void;
export function duelTick(dt: number): void;
export function duelActive(): boolean;
```

**Funciones internas clave:**
- `buildArena()` — piso acero rayado, paredes sólidas, iluminación de día.
- `makeBot(cfg, isPlayer)` — instancia `Car`, aplica masa+inercia según chasis, ancla arma.
- `stepBot(b, dt)` — fuerzas/torques de Havok según input o IA.
- `duelAi(b, dt)` — IA del enemigo (embestir, circular, distancia de arma).
- `checkContact(a, b, dt)` — daño por contacto con cooldown.
- `applyKnockback(b, point, force)` — impulso en punto de contacto.
- `showResults(won)` — pantalla de resultados con tiempo y daño.

---

## 5. Pantalla de armado

```
ARMADO
┌─────────────────────────────────────────────────────┐
│  [Vista 3D del robot — gira en tiempo real]          │
│                                                     │
│  CHASIS:  [Caja ▸]  [Cuña]  [Plancha]               │
│  RUEDAS:  [Estándar ▸]  [Gigantes]  [Orugas]         │
│  ARMA:    [Trompo ▸]  [Sierra]  [Pala]               │
│                                                     │
│  Masa: ██████░░  Vel: ████░░░░  Vida: ████████       │
│                                                     │
│            [  A PELEAR  ]                           │
└─────────────────────────────────────────────────────┘
```

- Vive en `duel.ts` (pantalla propia, `Scr`-like) o como `Scr` nueva en `menu.ts` (decisión de usuario).
- Vista 3D = malla del robot ensamblada en escena offline, rotando (misma escena BJS, cámara separada).
- Los stats (masa, velocidad, vida) leen de `BAL.duelo` en `balance.json`.

---

## 6. Patrón de entrada `?duel` (dev)

```typescript
// En main.ts — análogo a ?race
if (import.meta.env.DEV && /[?&]duel\b/.test(location.search)) {
  setTimeout(() => goDuel(), 1500);
}
```

**Hooks dev (consola):**
```javascript
__duel.auto(on)       // piloto automático del jugador
__duel.godMode()      // jugador invulnerable
__duel.info()         // HP, RPM, estado de volcado
__duel.kill()         // mata al enemigo (prueba victoria)
```

---

## 7. Cambios en módulos existentes

### 7.1 `main.ts`
- Importar `initDuel`, `startDuel`, `duelTick`, `duelActive`.
- `goDuel()` análoga a `goRace()`.
- Enganchar `duelTick(dt)` en loop `update()` (patrón idéntico a `raceTick`).
- Patrón `?duel` en dev.
- **No tocar** `goBattle()` / `battleTick` (son los globos de kart.ts).

### 7.2 `kart.ts`
- **No modificar.** `battle` en kart.ts sigue siendo los globos. No renombrar nada ahí.

### 7.3 `models.ts`
- Sin cambios. `cyl()`, `box()`, `pbr()` ya son `export`.

### 7.4 `balance.json` / `balance.ts`
- Agregar tabla `duelo` con filas por chasis, ruedas y arma (vida, masa, daño base, vel, RPM_max).
- Agregar descripciones en `DESC` de `scripts/balance-xlsx.mjs`.
- **No hardcodear** ningún número de balance en `duel.ts`.

### 7.5 `scripts/scenarios.mjs`
- Agregar escenario `duel` para `shots` y `perf` (entrada `?duel`, verificar armado + pelea).

---

## 8. Decisiones arquitectónicas

### 8.1 Archivo único `duel.ts`
- Un archivo, ~800-1000 líneas máximo (como `kart.ts` como referencia).
- **Techo ponytail:** Si crece a >1200 líneas, extraer `duelAi.ts` y `duelArena.ts`.

### 8.2 `DuelBot` propio, no hereda de `Racer`
- `Racer` de kart.ts tiene campos de circuito innecesarios. `DuelBot` es limpio y mínimo.

### 8.3 Independencia del loop roguelite
- `duel.ts` no importa `enemies.ts`, `weapons.ts`, ni el spawner de `main.ts`.
- No suma XP al jugador, no toca `Save` en fase 1 (solo localStorage simple si hace falta).

### 8.4 Semillas
- `seedRng(seed)` en `startDuel()` para reproducibilidad (pruebas headless).

---

## 9. Testing y verificación

### Funcional (antes de merge)
- [ ] `?duel` abre armado sin crash; se puede cambiar las 3 ranuras y verse en 3D.
- [ ] La pelea corre: enemigo ataca, daño por contacto con feedback (flash + chispas), barra de vida baja.
- [ ] Dos armados distintos se sienten distintos (orugas empujan al trompo fuera; trompo a RPM alta derrumba la caja).
- [ ] Victoria y derrota funcionan; "Reintentar" vuelve al armado.
- [ ] Sin proyectiles ni ítems de ningún tipo en la arena.

### Headless
```
npx tsc --noEmit -p .
npm test
npm run build
npm run shots -- --only duel
npm run perf  -- --only duel
```

### Rendimiento
- Escenario `duel` en `scenarios.mjs` con armado + pelea.
- Comparar con `race`: arena cerrada sin decoración de pista → similar o mejor.

---

## 9.5 Profundidad de armado (remisión a GDD §27–§33)

El detalle de puntos de anclaje, reglas de CoG por combo, tabla de stats por pieza, sistema de umbrales de combos (BAN / WARN), pruebas físicas de la preview mesa, reutilización de primitivas de `models.ts` y candidatos de ampliación viven en **`docs/DEMOLICION_GDD.md` §27–§32**. Este documento no los repite; referirse al GDD como fuente de verdad antes de implementar la pantalla de armado y `comboCheck()`.

---

## 10. Puntos de integración futuros (solo anotados, fuera de alcance fase 1)

- `Save`: campos `duel: { chassis, wheels, weapon }` + desbloqueos por tornillos.
- Pintura por zona del garaje aplicada al robot (`CarOpts.paint/trim/rim`).
- Entrada en menú principal junto a Carrera, con precarga vía `launch()`.
- Más arenas (más entradas tipo `TRACKS` de kart.ts).
- Más enemigos IA, cada uno con tipo de arma distinto.
- Economía: precios en tornillos, tabla `precios` en `balance.json`.

---

## 11. Resumen de reutilización

| Componente | Reusar | Archivo | Notas |
|---|---|---|---|
| **Clase Car (visual)** | ✅ SÍ | `car.ts` | Sin llamar `drive()` |
| **`drive()`** | ❌ NO | `car.ts` | Reemplazar por fuerzas Havok |
| **Primitivas models** | ✅ SÍ | `models.ts` | `box`, `cyl`, `PARTS`, etc. |
| **Input unificado** | ✅ SÍ | `input.ts` | Ignorar campo `item` |
| **FX pool** | ✅ SÍ | `fx.ts` | Sin cambios |
| **Audio** | ✅ PARCIAL | `sfx.ts` | `music("battle")` + explosiones; no miniturbo/shield |
| **RNG** | ✅ SÍ | `rng.ts` | Sin cambios |
| **HUD (estilo)** | ✅ REFERENCIA | `ui.ts`, `hud.css` | CSS propio en `duel.css` |
| **`setZone("patio")`** | ✅ SÍ | `world.ts` | Clima mediodia |
| **Proyectiles** | ❌ **PROHIBIDO** | `kart.ts` | Modo melee puro |
| **Ítems de carrera** | ❌ **PROHIBIDO** | `kart.ts` | Sin cajas, sin ítems |
| **`startBattle()` / Racer** | ❌ NO | `kart.ts` | Son los globos, no tocar |
| **Circuito / vueltas** | ❌ NO aplica | `kart.ts` | Arena propia en duel.ts |
| **Enemies / weapons roguelite** | ❌ NO aplica | `enemies.ts`, `weapons.ts` | Sin overlap |

---

**Actualizado:** 2026-10-06 — alineado con `SPEC-modo-robots.md`
**Módulo:** `src/duel.ts` (antes descrito erróneamente como `battle.ts`)
**Estado:** Documento de arquitectura, sin código
