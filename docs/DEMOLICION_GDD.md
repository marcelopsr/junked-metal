# Demolición — GDD del modo duelo (prototipo)

Documento maestro de diseño. Código: `src/duel.ts` (nombre interno `duel`; **no** confundir con `battle` = globos en `kart.ts`).

**Referencias técnicas:** [BATTLE_ARCHITECTURE.md](./BATTLE_ARCHITECTURE.md). Si hay contradicción, **este GDD manda**.

**Historial:** 2026-10-06 — toolbox A–J + K–L (parcial). Ver §17–18.

---

## 1. Visión

Modo **BattleBots / RC**: armar un robot en el taller, entrar a una **arena de acero de día**, pelear **solo melee** (sin proyectiles ni ítems de carrera) contra **un rival** en **mejor de 3 asaltos**. Física **sim-lite Havok** (fuerzas/torques; el centro de gravedad del armado importa).

Fuera de alcance v1: economía, guardado de loadout en `Save`, multijugador, editor de arena (anotado v2).

---

## 2. Reglas de partida

| Regla | Detalle |
|--------|---------|
| Formato | **Mejor de 3 asaltos**; gana quien llegue a **2 victorias** |
| Victoria en asalto | Vida del **rival → 0** |
| Derrota en asalto | Vida **propia → 0** |
| Vida entre asaltos | **Reset al máximo** al inicio de cada asalto |
| Loadout | **Mismo armado** los tres asaltos (no cambiar piezas entre asaltos) |
| Volcado | **No** pierde el asalto; quedás **vulnerable** hasta enderezar (botón + física) |
| Empate por tiempo | **No** en v1 |
| Doble KO (mismo frame) | Gana el **jugador** |
| Abandonar (pausa / menú) | Cuenta como **derrota 2–0** |
| Duración feel | Asaltos **largos** (~2+ min de desgaste); números en `balance.duelo` |

### Daño melee

- Sin proyectiles ni ítems de `kart.ts`.
- **Cooldown** ~0,5 s por par atacante–víctima.
- Daño escala con **velocidad relativa** al impacto.
- Dañan **chasis y arma**.
- **Trompo:** daño extra según **RPM** (botón arma mantiene/subida de RPM).
- **Sierra:** **knock-up** + daño mientras el **filo** toca (con cooldown global).
- **Pala:** prioriza **empuje Havok** sobre daño numérico.
- Feedback: **números flotantes**, **shake** de cámara en golpe fuerte, **flash blanco** en malla golpeada. *Default equipo:* SFX metal/scrape en v1 si encaja en `sfx.ts`.

---

## 3. Controles y flujo

### Controles (asalto)

- Igual que **supervivencia** (`input.ts`: teclado / gamepad / joystick táctil).
- **Botón arma** (RPM trompo / sierra).
- **Botón enderezar** cuando volcado (cooldown anti-spam).
- **Pausa:** reanudar o abandonar (derrota 2–0).
- Sin derrape/turbo de carrera salvo que se añada después como impulso Havok acotado.

### Flujo pantallas

1. Menú principal → **Demolición** (descripción ~2 líneas).
2. **Armado** (3D + preview física).
3. **3-2-1-GO** (robots quietos hasta GO).
4. **Asalto** (cámara **persecución**).
5. **Inter-asalto:** marcador **0–1–2**, tip opcional de radio en asaltos 2–3 (*default:* subir agresividad IA, no copy obligatorio).
6. Tras 2 victorias → **resultados** estilo polaroid/telemetría (daño dado/recibido); **reintentar** vuelve a armado.
7. `?seed=` reproduce duelo (dev y jugadores).

### Armado

- Pantalla **propia** (no pestaña garaje survivor v1).
- **3 ranuras × 3 opciones:** chasis / ruedas / arma melee.
- Barras **masa / velocidad / vida** (sin números finos en HUD de pelea).
- **Preview:** mesa de taller, caída suave ~10 cm; rotación/orbita estilo garaje; **sin rival visible**.
- Botón opcional *default equipo:* “empujar” lateral para probar estabilidad.

#### Chasis

| Id | Rol |
|----|-----|
| Caja | Estable, vida alta, velocidad media |
| Cuña | Punta baja, bonus embestida, vida baja |
| Plancha | Muy rápida, fácil volcar (CoG alto) |

#### Ruedas

| Id | Rol |
|----|-----|
| Estándar | Equilibrio |
| Gigantes | Más tracción y empuje, menos giro |
| Orugas | Más estabilidad, menos velocidad punta |

#### Armas (jugador elige una)

Trompo, sierra, pala — comportamiento §2.

---

## 4. Rival v1

- **Arquetipo:** cuña embestidora.
- **Nombre en HUD** (flavor; ej. línea “CUÑA INDUSTRIAL”).
- **IA:** bot estilo **devbot** — perseguir, alinear embestida, acelerar si HP bajo; **objetivo ganar**, sin guiones rígidos por fase. *Escalado:* mayor agresividad en asaltos 2 y 3 (parámetros, no nuevas animaciones).
- No adapta por arma del jugador en v1.

---

## 5. Arena y presentación

- ~**25 m** cuadrado, **piso acero rayado**, **paredes sólidas**.
- **Día** (legible, distinto del survivor nocturno).
- Sin trampas, público TV ni baranda extra en v1.
- Arte: chatarra RC, HUD en `duel.css`, telemetría ([ART_DIRECTION.md](./ART_DIRECTION.md)).
- Código amenaza: rojo = rival; verde fósforo = jugador (donde aplique).

---

## 6. Copy y tono

- Español **neutro**, sin voseo.
- HUD **telemetría** (ENLACE / DAÑO / ASALTO).
- **Humor más picante** / doble sentido permitido en menú e interludios; cuidar coherencia con público web.
- Puede haber **poco texto** durante el asalto (barras + números).

---

## 7. Móvil

- Joystick virtual como survivor.
- Botón **arma** grande.
- HUD pensado **una mano** (controles abajo).
- *Default:* hereda preajuste gráfico global (no forzar Bajo salvo problemas de perf).

---

## 8. Audio

- Música canal **battle** existente durante pelea (`sfx.ts`).
- *Opcional v1.1:* pitch RPM trompo; armado más silencioso hasta GO.

---

## 9. Balance y datos

- Tabla **`duelo`** en `balance.json` (chasis, ruedas, armas, rival, cooldowns, HP, masas).
- Tipado en `balance.ts`; **sin literales** de balance en `duel.ts`.
- Importador planilla: filas nuevas en `DESC` de `balance-xlsx.mjs` cuando existan.

---

## 10. Integración técnica (resumen)

- `main.ts`: `goDuel()`, `duelTick`, `?duel`; **no** tocar `goBattle()` de kart.
- `menu.ts`: entrada Demolición.
- Hooks dev: `__duel.auto`, `__duel.godMode`, `__duel.info`, `__duel.kill` (ver arquitectura).
- `scripts/scenarios.mjs`: escenario `duel` para shots/perf (post-UI).
- Verificación: `tsc`, `npm test`, `build`, `shots --only duel`, `perf --only duel`.

---

## 11. v2 anotado (no prototipo)

- Más rivales (trompo horizontal, caja pinchos, etc.).
- Editor de **arena / trampas**.
- Sincronizar piezas con garaje survivor.
- 2 jugadores local (desktop); empate por tiempo; IA anti-arma.

---

## 12. Checklist de cobertura

| Área | Estado |
|------|--------|
| Reglas / asaltos | ✅ usuario |
| Daño melee | ✅ usuario |
| Armado + preview | ✅ usuario |
| Armas (3) | ✅ usuario |
| IA rival | ✅ usuario (bot) |
| Arena | ✅ usuario |
| Controles / móvil | ✅ usuario |
| Copy / humor | ✅ usuario |
| Audio | ✅ usuario (música) |
| Resultados | ✅ usuario |
| Edge cases | ✅ + defaults |
| Balance numérico | ⏳ tuning en implementación |
| Shots / perf | ⏳ post-UI |
| Accesibilidad (texto tamaño, color) | default = mismos que juego global |
| Meta / logros / tutorial | ✅ H |
| Paredes / luz / HP ratio | ✅ I |
| Resultados / menú / post | ✅ J |
| Frases / spawn / cámara menú | ✅ K |
| HP 100 / IA escala / QA / fallback | ✅ L |
| Building / combinaciones | ✅ M |
| Personajes / daño visual | ✅ N |
| Combate extra | ✅ O |

---

## 13. Progresión, meta y primer uso (H)

| Tema | Decisión |
|------|----------|
| Desbloqueo | **Siempre visible** en menú principal |
| Tutorial | **Panel corto** 3 viñetas (armar → pelear → 2 de 3); saltable |
| Logros v1 | Contador **local** de victorias + logro **“Ganar un mejor de 3”** (`achievements.ts` si encaja) |
| Survivor | Modo **aislado** (sin XP/tornillos/autos del garaje en v1) |

## 14. Combate fino y arena (I)

| Tema | Decisión |
|------|----------|
| Paredes | **Rebote** moderado; **chispas** al rozar rápido |
| Stun | **Sin** aturdir IA en v1 (solo knockback) |
| Volcado jugador | No mover hasta **enderezar** (*default*) |
| Luz | **Cielo tenue + focos colgantes ámbar** (taller) |
| HP | **Simétricos** jugador vs cuña (misma escala en balance) |

## 15. Presentación y resultados (J)

| Tema | Decisión |
|------|----------|
| Post | **Mismos** presets que Config global del jugador |
| Menú | Botón **“Demolición”** |
| Rival HUD | **CUÑA INDUSTRIAL** |
| Resultados | Stats daño + marcador 2–0/2–1 + **iconos armado** + **frase humor** (pool victoria/derrota) |

---

## 17. Copy, spawn, cámara (K)

| Tema | Decisión |
|------|----------|
| Frases resultados | Pool **~16** victoria + **~16** derrota (humor picante / taller) |
| Spawn | **Extremos opuestos**, mirándose |
| Cámara | Persecución con **anti-clip** cerca de paredes |
| Menú descripción | **“Duelo de chatarra. Sin balas.”** |

## 18. Balance inicial y QA (L)

| Tema | Decisión |
|------|----------|
| HP base | **100 / 100** (jugador y CUÑA INDUSTRIAL) |
| IA asaltos | Agresividad **×1.0 → ×1.15 → ×1.3** |
| QA | **Óptimo scripteado:** escenario `shots`/`perf` duel + `__duel.auto` sin crash; **Vitest** en fórmula de daño/cooldown si se extrae módulo puro |
| Riesgo física | Tras ~2 intentos sim-lite inestable → **fallback arcade** permitido (documentar en código) |

### Nota: “fallback arcade” (Fase 0)

**Sim-lite** = el robot se empuja con **fuerzas Havok** reales; puede **volcar** y el centro de gravedad del armado importa.

**Fallback arcade** = plan B si eso es inestable (robot que vibra, se atraviesa el suelo, volcados irreversibles): volver al manejo **`drive()`** del survivor (velocidad fijada cada frame), **sin volcado real**; el “volcar” sería animación o stat. Menos BattleBots, pero jugable más rápido.

---

## 20. Armado / building (M)

| Tema | Decisión |
|------|----------|
| Layout | **3 columnas** CHASIS \| RUEDAS \| ARMA bajo vista 3D (estilo garaje) |
| Desbloqueo piezas | **Todas** las opciones disponibles v1 |
| Combinaciones | Proponer **todas** las combos; **bloquear** solo si rompen física o superan umbral (estabilidad/altura RPM); oruga+trompo alto → warning o ban según prototipo |
| Preview | **Empujar**, **inclinar mesa ~5°**, **reset** pose |

## 21. Personajes y fantasía (N)

| Tema | Decisión |
|------|----------|
| Rival | **CUÑA INDUSTRIAL** — matón de patio, embiste |
| Jugador | **Operador RC** anónimo (mismo fantasy survivor) |
| Escala | Robot **escala RC** survivor |
| Daño visual | **Humo/chispas** &lt;30 % HP; **pieza cosmética** suelta al 0 % (hitbox sin cambio) |

## 22. Mecánicas combate extra (O)

| Tema | Decisión |
|------|----------|
| Pinchazo pared | **Mismo** daño que contacto libre (sin bonus) |
| Arma desprendida | **No** en v1 |
| Choque frente a frente | Gana **masa** (física) |
| Input | Misma **inversión** y **deadzone** que survivor; *default equipo:* aceleración motor gradual |

---

## 24. Roadmap armado y contenido (P — v2+, diseño solamente)

### Evolución del building

- Tras MVP **3×3**, pasar a **ranuras fijas extra**: motor, batería, blindaje, **arma secundaria** (mismo layout garaje; no grid libre v2).

### Armas melee futuras (candidatas)

| Arma | Nota |
|------|------|
| Martillo neumático | Golpe vertical, anti-volcado rival |
| Pinchos 360° | Daño pasivo por contacto; cooldown estricto |
| Lanza / pinchador | Alcance frontal, vulnerable por costado |
| Trompo vertical | Perfil Tombstone; IA distinta |

*Línea roja:* sin proyectiles ni ítems de carrera; llama solo si se modela como **cono melee** sin proyectil (no priorizado).

### Chasis / locomoción futuros

- Hexápodo lento (estabilidad, baja velocidad).
- **Tanque** oruga ancha + torreta (sin confundir con chasis “orugas” v1).
- Perfil **invertido** (wedge que pelea al revés).

### Rivales futuros

1. **CUÑA INDUSTRIAL** (v1).
2. **Trompo horizontal** (Tombstone) — siguiente candidato.
3. Caja pinchos, 2v1 jefe: **más tarde**.

---

## 25. Pool de frases — resultados (16 + 16)

Tono: humor **picante** / taller / garantía void; español neutro; una línea aleatoria por pantalla de resultados.

### Victoria (16)

1. Garantía extendida: la de ellos venció antes.
2. Tres asaltos, dos certificados de chatarra.
3. La CUÑA INDUSTRIAL pidió vacaciones permanentes.
4. Operación exitosa: tornillos ajenos en el piso.
5. El patio ya tiene un nuevo adorno metálico.
6. Radio confirma: el rival no pasa la revisión técnica.
7. Victoria limpia, como el suelo después de una fiesta de soldadura.
8. Dos de tres: matemáticas que el rival no entendió.
9. Prototipo aprobado. El otro, desguace.
10. Se registró el golpe de gracia en triplicado.
11. La mesa de armado queda libre para celebrar.
12. Embestida final: factura pagada en partes.
13. El contador de victorias locales sube sin pedir permiso.
14. Chatarra premium entregada por el oponente.
15. Tres asaltos bastaron para el veredicto.
16. Fin del duelo: solo queda barrer tuercas ajenas.

### Derrota (16)

1. El taller cobra extra por humillación; no está en la lista de precios.
2. Dos de tres en contra: el robot pide receso técnico.
3. La CUÑA INDUSTRIAL firmó el acta de conformidad… tuya.
4. Garantía propia anulada por exceso de abolladuras.
5. Se recomienda leer el manual antes del tercer asalto.
6. Derrota registrada: el piso ganó más tuercas que vos.
7. El operador RC solicita café y otro chasis.
8. Tres asaltos, dos veces en el suelo mirando focos.
9. El rival no dejó ni tornillo suelto para recuerdo.
10. Resultado: chatarra con tu nombre, sin descuento.
11. La mesa de armado espera; el ego, en reparación.
12. Dos asaltos perdidos: el marcador no miente.
13. Fin del mejor de tres: silencio en la radio.
14. Prototipo rechazado por el jurado de una sola cuña.
15. Se sugiere menos bravura y más tornillos.
16. Abandono o KO: el desguace no distingue.

*(Revisión de copy antes de build público si alguna línea cruza el techo deseado.)*

---

## 26. Aprobación

Implementación de código (`duel.ts`) **después** de mensaje explícito: **«aprobado, implementar»** (o equivalente) sobre este documento.

---

## 27. Robot como ensamble — puntos de anclaje y reglas de CoG

### Puntos de anclaje del robot

Cada robot se construye uniendo tres slots a un **origen de chasis**. El sistema no es libre (no es un grid 2D) sino una jerarquía de tres rangos fijos:

```
          [ ARMA ]
             │
      ┌──────┴──────┐
  [CHASIS — origen del cuerpo rígido Havok]
      │              │
 [RUEDA iz]     [RUEDA der]
 (par delant.)  (par delant.)
 [RUEDA iz]     [RUEDA der]
 (par tras.)    (par tras.)
```

| Punto | Id interno | Descripción |
|-------|-----------|-------------|
| `chassis_anchor` | origen | Centro geométrico del chasis; de ahí cuelgan todos los demás. El cuerpo rígido Havok se posiciona aquí. |
| `wheel_fl / wheel_fr` | par delantero | Dos ruedas simétricas en X. Con orugas se instancia una banda continua izquierda + una derecha (sin rueda individual). |
| `wheel_rl / wheel_rr` | par trasero | Igual que delantero. Ruedas traseras pueden girar diferencial. |
| `weapon_mount` | frente del chasis | Punto de montaje del arma. Su Y depende del chasis elegido (cuña lo baja, plancha queda casi al ras). |

### Reglas de CoG por combo

El **centro de gravedad** (CoG) se calcula sumando masas y posiciones de cada pieza. No es un valor exacto expuesto al jugador, sino una clasificación interna que usa la física de Havok y el sistema de umbrales (§29).

| Factor | Efecto sobre CoG |
|--------|-----------------|
| Chasis cuña | CoG bajo (Y ~0.2 m). Volcado muy difícil. |
| Chasis caja | CoG medio (Y ~0.4 m). Referencia del balance. |
| Chasis plancha | CoG bajo-medio pero altura muy reducida: poca holgura vertical para armas. |
| Ruedas gigantes | Elevan el chasis ~0.15 m → CoG sube. |
| Orugas | No elevan el chasis; tracción alta compensa tendencia lateral. |
| Trompo (alto) | Masa excéntrica arriba; en trompo v1 el perfil es bajo (~0.3 m) pero con mucho torque reactivo. |
| Sierra | Brazo lateral; desequilibrio transversal bajo, reactivo al girar. |
| Pala | Masa adelante; desplaza CoG hacia el frente, ayuda a embestir pero desfavorece los giros. |

**Regla práctica de implementación:**
```
cog_y = (chassis.cog_y × chassis.mass + wheels.cog_y × wheels.mass + weapon.cog_y × weapon.mass)
        / (chassis.mass + wheels.mass + weapon.mass)
```
Valores en `balance.json / duelo`; no hardcoded en `duel.ts`.

### Enlace con §24 — ranuras v2

El building v1 tiene **3 ranuras fijas** (chasis / ruedas / arma). La evolución a v2 descrita en §24 agrega ranuras extra (motor, batería, blindaje, arma secundaria) sobre el **mismo layout de 3 columnas**.

Para que la migración no requiera reescribir la lógica de composición:
- Los puntos de anclaje deben ser un **array extensible**, no una enumeración cerrada de 5 elementos.
- Los modificadores de stats (vel, giro, empuje, estabilidad, masa) deben sumarse como una lista de `Partial<RobotStats>`, no como ramas `if/else` por combo.
- La pantalla de armado debe leer el número de ranuras activas de `balance.json` (`duelo_ranuras_v1 = 3`); activar v2 es subir ese número y agregar filas en la tabla de piezas, sin tocar el layout de UI.

---

## 28. Tabla de piezas v1 — stats, silueta y modos de falla

### Chasis (3 opciones)

| Id | Masa (kg) | HP bonus | Traction | Silhouette | Failure modes |
|----|-----------|----------|----------|------------|---------------|
| `caja` | 3.0 | +30 | base | Bloque rectangular alto, plano frontal. | *Slow spin-up*: masa alta retrasa el giro inicial. Pala enemiga lo vuelca si viene de costado. |
| `cuña` | 2.2 | −10 | +10% | Triángulo visto de perfil; frente casi a ras del piso. | *Tip over* casi imposible solo. Vulnerable a ataques verticales (sierra desde arriba). |
| `plancha` | 1.8 | −20 | −5% | Losa plana muy baja; sin volumen vertical visible. | *Tip over* al recibir golpe lateral fuerte (CoG no tan bajo como cuña, pero menos tracción). |

### Ruedas (3 opciones)

| Id | Masa (kg) | Vel bonus | Traction | Silhouette | Failure modes |
|----|-----------|-----------|----------|------------|---------------|
| `estandar` | 0.4 | base | base | Círculo moderado; rueda de goma negra. | Sin falla dominante; no destaca en nada. |
| `gigantes` | 0.9 | −10% | +20% | Círculo grande; eleva el chasis visiblemente. | *Tip over* aumenta (chasis más alto). Giro lento en espacio reducido. |
| `orugas` | 1.1 | −20% | +35% | Banda plana continua a cada lado. | *Slow spin-up* por inercia de banda. Pivotear en el lugar genera mucho torque reactivo (puede desestabilizar el arma). |

### Armas (3 opciones)

| Id | Masa (kg) | DPS feel | RPM mecánica | Silhouette | Failure modes |
|----|-----------|----------|--------------|------------|---------------|
| `trompo` | 0.8 | **Ráfaga** — daño bajo a RPM bajas, muy alto a RPM máxima (~3 s carga). | Sube con botón mantenido; se frena al impacto fuerte. | Disco/anillo sobre el chasis; perfil bajo en v1. | *Slow spin-up* si se interrumpe seguido. A RPM alta el torque reactivo puede girar el propio robot. |
| `sierra` | 0.7 | **Sostenido** — daño moderado constante + knock-up mientras el filo toca. | Sin mecánica de RPM; daño por tiempo de contacto con cooldown. | Brazo lateral con disco de corte; asimétrico en X. | Desequilibrio en X puede desviar la trayectoria al girar. Knock-up propio si choca a alta velocidad. |
| `pala` | 1.2 | **Empuje** — muy bajo daño numérico; victoria por posicionamiento (Havok). | Sin RPM. | Cuchara / pala frontal; masa adelante visible. | Desplaza CoG hacia el frente → giro lento. Contra trompo a RPM alta pierde el intercambio. |

---

## 29. Sistema de umbrales — combos bloqueados y advertidos

### Clasificación

| Nivel | Acción en UI | Criterio |
|-------|-------------|---------|
| **BAN** | El botón "A PELEAR" aparece desactivado; tooltip explica el motivo. | Combo que rompe la física o hace el match injugable (volcado permanente, colisión de geometría de arma con el chasis, clearance < 0). |
| **WARN** | Mensaje de advertencia naranja bajo las barras de stats; el jugador puede igualmente confirmar. | Combo que funciona pero tiene desventaja estructural severa o comportamiento contraintuitivo. |
| **OK** | Sin aviso. | Todo lo demás. |

### Tabla de combos v1

| Combo | Nivel | Motivo |
|-------|-------|--------|
| `plancha` + `gigantes` | **BAN** | Las ruedas gigantes elevan el chasis más que su altura total; clearance negativo (ruedas pasan el techo de la plancha). |
| `plancha` + `sierra` | **WARN** | El brazo de la sierra casi toca el piso con este chasis tan bajo; al primer impacto lateral el arma golpea el suelo antes de al rival. |
| `plancha` + `trompo` | **WARN** | Disco demasiado cerca del piso; a RPM alta vibra el conjunto y puede hacer flip involuntario. |
| `cuña` + `orugas` + `trompo` | **WARN** | CoG combinado alto relativo al chasis estrecho de la cuña; oruga+trompo → torque reactivo excesivo. El jugador puede avanzar, pero se le avisa que el robot girar sin querer. |
| Todos los demás | **OK** | — |

### Implementación (referencia para `duel.ts`)

```typescript
// ponytail: threshold simple — si se añaden muchos combos, convertir en tabla en balance.json
function comboCheck(cfg: RobotConfig): "ok" | "warn" | "ban" {
  const { chassis, wheels, weapon } = cfg;
  if (chassis === "plancha" && wheels === "gigantes") return "ban";
  if (chassis === "plancha" && (weapon === "sierra" || weapon === "trompo")) return "warn";
  if (chassis === "cuña" && wheels === "orugas" && weapon === "trompo") return "warn";
  return "ok";
}
```

El **mensaje de advertencia/ban** usa la misma tipografía del HUD (Silkscreen, fósforo verde sobre negro); el texto de BAN va en rojo (código amenaza), el de WARN en ámbar.

---

## 30. Preview mesa — pruebas físicas del armado

La **mesa de taller** en la pantalla de armado no es solo estética: ejecuta tres **microtest físicos** para mostrar el comportamiento antes de entrar a la arena.

| Prueba | Descripción | Trigger | Dónde se ve |
|--------|-------------|---------|------------|
| **Caída** | Robot se instancia ~10 cm sobre la mesa y cae por gravedad; el rebote y la postura de aterrizaje revelan el CoG. | Automático al confirmar una pieza. | La malla cae y se asienta sola. |
| **Empuje lateral** | Impulso lateral suave (0.4 N·s) que simula un golpe de pala. Muestra si el combo se inclina, se frena rápido o se desliza. | Botón "EMPUJAR" (tooltip: "simular golpe lateral"). | El robot se desplaza ~5 cm y vuelve a reposar. |
| **Inclinación 5°** | La superficie de la mesa se inclina 5° (rotación del plano de colisión) y se libera. Combos estables vuelven a la horizontal; inestables se van de costado. | Botón "INCLINAR MESA" (aparece solo en modo debug en v1; en producción lo activa automáticamente para WARN/BAN). | El robot se desliza o se mantiene. |
| **Reset pose** | Devuelve el robot a la posición inicial centrada y nivelada. | Botón "RESET" o al cambiar cualquier pieza. | Transición suave (lerp de posición/rotación en 0.3 s). |

**Nota de implementación:** estas pruebas corren en la misma escena Babylon.js de la pantalla de armado, con una cámara de órbita separada. No requieren una escena nueva; solo suspender la gravedad del patio y crear un plano-mesa temporal.

---

## 31. Mallas procedurales — reutilización de `models.ts`

Cada pieza del robot se construye con las primitivas ya exportadas de `src/models.ts`. **No se crean mallas sueltas por entidad** (regla de rendimiento del proyecto).

### Chasis

| Id | Primitivas | Notas |
|----|-----------|-------|
| `caja` | `box(w, h, d, mat, pos)` × 1 para el cuerpo principal + `box` pequeños para pernos decorativos | Material `M.matte("#2b2d31")` para el casco; `pbr()` para la zona pintable. |
| `cuña` | `extrude(perfil_triángulo, ancho, mat, pos)` (igual que la carrocería de `buggy` en `carModel`) | El perfil es `[[-1,0],[1,0],[0.9,0.3],[−0.5,0.5]]` aproximado. |
| `plancha` | `box(w, h_muy_bajo, d, mat, pos)` + `box` de guardabarros laterales | `h` ≈ 0.15 m; los guardabarros son cajas delgadas en X. |

### Ruedas

| Id | Primitivas | Notas |
|----|-----------|-------|
| `estandar` | `wheel(d, w, rim, "")` ya exportado en `models.ts` | Directo. |
| `gigantes` | `wheel(d*1.5, w*1.3, rim, "todoterreno")` | Reutiliza el estilo "todoterreno" de `PARTS.tires`. |
| `orugas` | `box(largo, h_banda, ancho_banda, mat, pos)` + `cyl` pequeños como rodillos | Instancia una banda izquierda y una derecha. `PARTS.tires.oruga` es referencia visual. |

### Armas

| Id | Primitivas | Notas |
|----|-----------|-------|
| `trompo` | `cyl(r, r, h_bajo, mat, pos)` para el disco + `box` de soporte/eje | `cyl` con `tess=16` para que el disco sea redondo. Eje con `cyl` delgado. |
| `sierra` | `cyl(r, r, h_fino, mat, pos, rot_lateral)` + brazo con `box` | El brazo es un `box` rectangular horizontal en X. El disco se rota 90° en Y. |
| `pala` | `box(ancho, alto, prof_poca, mat, pos_frontal)` + `box` de refuerzos | Cuchara plana frontal. Dos refuerzos diagonales con `box` delgados. |

### Merge y template

Cada combo `(chasis, ruedas, arma)` se construye con `merge(name, parts)` en una sola llamada, generando una malla de instancia única para la preview de armado. En la arena se usa el mismo merge; el `PhysicsAggregate` se aplica sobre el resultado.

---

## 32. Candidatos extra v1 — ampliación opcional de 3×3 a 3×4

Estas piezas **no están en el alcance de la implementación v1**. Se proponen como candidatos si el usuario decide ampliar el grid. Cada categoría agrega una cuarta opción.

### Chasis adicional: `hexápodo` (experimental)

> Candidato más llamativo; el más difícil de implementar.

- **Descripción:** Seis patas Havok (estilo artrópodo); sin ruedas convencionales.
- **Stats:** Masa alta (+20% vs caja), HP alto (+40%), velocidad muy baja (−40%), tracción máxima.
- **Silueta:** Cuerpo ovalado con seis brazos articulados; mucho más alto que cualquier otro.
- **Tradeoff:** Requiere animación de patas (reusar sistema de patas de `enemies.ts`). Física de contacto compleja. **Ponytail: no implementar en v1** sin aprobación explícita.

### Ruedas adicionales: `balón` (ruedas esféricas)

> El más fácil de añadir; un `sph()` ya existe en `models.ts`.

- **Descripción:** Cuatro esferas de caucho en las esquinas (estilo Moroser Robotics).
- **Stats:** Igual masa que estándar, velocidad +5%, tracción −15%, giro omnidireccional (+30%).
- **Silueta:** Cuatro esferas visibles en esquinas; chasis flotante sobre ellas.
- **Tradeoff:** El giro omnidireccional requiere lógica de dirección distinta (cada esfera puede girar en cualquier eje). **Ponytail:** calcular velocidad omnidireccional es nueva lógica de control; no es trivial.

### Arma adicional: `martillo` (golpe vertical)

> El mejor candidato por diferenciación de juego; impulso vertical interesante contra combos de pala.

- **Descripción:** Brazo que cae verticalmente con fuerza sobre el rival.
- **Stats:** Masa media, DPS feel: **golpe** (spike de daño alto cada ~1.5 s), sin sostenido.
- **Silueta:** Brazo articulado sobre el chasis; visible en reposo elevado, cae al activar.
- **Tradeoff:** Requiere animación de pivote del brazo. Contra trompo a RPM alta no puede protegerse. Sin proyectil (golpe melee puro, sin física de proyectil).

### Resumen de tradeoffs de expansión

| Pieza | Dificultad impl. | Diferenciación | ¿Reusa código existente? |
|-------|-----------------|---------------|--------------------------|
| `hexápodo` | Alta | Muy alta | Parcial (patas `enemies.ts`) |
| `balón` | Media | Media | Sí (`sph()` de `models.ts`) |
| `martillo` | Media | Alta | Sí (física Havok, sin lógica nueva de proyectil) |

---

## 33. Formulario AskUserQuestion — decisiones de building y armado

> **Para el orquestador:** pegar estas 4 preguntas como una sola ronda de `AskUserQuestion` (4 preguntas × 4 opciones, selección única en las que se excluyen, múltiple donde conviven).

---

**Pregunta 1 — Profundidad del grid de armado en la UI**

¿Cuánto detalle se muestra en la pantalla de armado al comparar piezas?

1. **(Recomendado) Barras + tooltip al seleccionar** — tres barras visuales (Masa / Vel / Vida) siempre visibles; al pasar el cursor o seleccionar una opción aparece un tooltip con el efecto diferencial (+10% tracción, −5% velocidad). Sin números absolutos en la UI de pelea; solo en el tooltip de armado.
2. **Solo barras, sin tooltip** — UI más limpia; el jugador aprende por feel. Riesgo: combos WARN pueden sorprender sin señal de aviso previo al efecto (se muestra el ícono de advertencia igual, pero sin descripción).
3. **Barras + panel de stats expandido** — al hacer clic en una pieza se abre un panel con todos sus valores numéricos (masa exacta, HP bonus, traction%). Más info, UI más densa. Útil si se añaden piezas candidatas (§32).
4. **Solo nombres e íconos, sin barras** — máxima simplicidad. El jugador elige por pura fantasía visual (nombre + silueta). Riesgo: decisiones sin feedback; requiere un tutorial más explícito.

---

**Pregunta 2 — Expansión del conteo de piezas (3×3 → más)**

¿Arrancamos con exactamente 9 piezas (3+3+3) o se amplía antes de implementar?

1. **(Recomendado) 3×3 como está — MVP primero** — implementar solo las 9 piezas actuales. Si el prototipo funciona y el balance es divertido, añadir piezas candidatas (§32) como actualización. Menor riesgo de scope creep.
2. **Añadir el martillo al grid v1 (3×3×4)** — el arma `martillo` es la candidata más diferenciada y más fácil de implementar (solo animación de brazo + física Havok). Agrega variedad táctica sin complejidad de control nueva.
3. **Añadir ruedas balón al grid v1 (3×4×3)** — el balón requiere nueva lógica de dirección omnidireccional; añade variedad de locomoción pero cuesta más que el martillo. Elegir solo si hay tiempo de pulir el control.
4. **Expandir a 3×4×4 desde el principio** — ambas adiciones (balón + martillo). Scope mayor: 16 piezas, más combos que verificar en el threshold system (§29), más shots de referencia. Solo si se arranca con semanas de margen.

---

**Pregunta 3 — Estilo visual de las piezas**

¿Cómo se ve el material y el acabado de las piezas en la mesa de armado?

1. **(Recomendado) Chatarra RC** — piezas con acabado imperfecto: pintura descascarada (`M.matte` con variación de color), bordes con óxido sutil (`M.metal("#a0522d")` en zonas de impacto). Coherente con el universo survivor (mismo patio, mismo taller). Costoso en textura procedural: requiere un par de patrones en `render.ts`.
2. **Industrial limpio** — piezas con acabado metálico uniforme (`M.metal`, `pbr()` liso). Más fácil de implementar (sin textura de desgaste). Contrasta bien con el piso de acero rayado de la arena. Riesgo: puede sentirse "genérico" vs la estética survivor.
3. **Personalizable por zona (igual que autos del garaje)** — cada pieza tiene una zona pintable (como `CarOpts.paint/trim/rim`). Requiere `pbr("paint_" + id)` por pieza y la lógica del selector de color del garaje. Alta fidelidad, mayor complejidad de UI y render.
4. **Placeholder monocromático en v1** — todas las piezas en un gris neutro plano durante el prototipo; refinar el look después de confirmar que la física y el balance funcionan. Menor fricción de arte en la fase de prototipo.

---

**Pregunta 4 — Fantasía de attachment (cómo se ven los ensambles en la UI)**

¿Cómo se representa el acto de "unir" una pieza al robot en la preview 3D?

1. **(Recomendado) Animación snap discreta** — al seleccionar una pieza, la malla nueva aparece en la posición correcta con una interpolación rápida (0.15 s) y un destello blanco. Sin elementos de tuercas ni imanes: la unión es implícita. Mínimo código extra; el destello reutiliza el flash de impacto de `fx.ts`.
2. **Tuercas y pernos visibles** — pequeñas cajas cilíndricas en los puntos de anclaje (`chassis_anchor`, `weapon_mount`) que parpadean al montar. Más detalle visual; requiere cuatro `cyl` adicionales por ensamble y gestión de visibilidad.
3. **Efecto magnético** — la pieza "vuela" desde una esquina de la pantalla hacia el punto de anclaje con una curva de Bezier. Muy llamativo; requiere animación de traslación en espacio de cámara + conversión de coordenadas. Mayor costo de implementación.
4. **Sin animación — swap instantáneo** — la pieza anterior desaparece y la nueva aparece sin transición. La opción más simple; acelera la iteración durante el prototipo. Puede sentirse abrupto en la build pública.

---

## 34. Materiales, color y texturas por pieza (v1)

**Decisión usuario (2026-10-06):** el armado no es solo stats; cada pieza se ve **pro** con **metal / plástico / pintura**, **colores** y **texturas procedurales**. Anula el “gris industrial fijo” de rondas anteriores.

### Alcance v1

- **Personalización completa** en pantalla de armado Demolición (no esperar a v2).
- **Mismo pipeline visual** para jugador y rivales: los enemigos usan el **mismo sistema de materiales y zonas**, pero con **build y paleta fijas** (misma calidad “pro”, sin editor en pelea).

### Zonas pintables / material por pieza

| Pieza | Zonas | Notas |
|-------|--------|--------|
| Chasis | Cuerpo + detalles (trim) | 2 materiales/colores como carrocería del garaje |
| Ruedas / orugas | Llanta / banda (goma) vs disco | Plástico mate vs metal |
| Arma | Cuerpo + filo/disco (según tipo) | Trompo: disco; sierra: filo; pala: cuchara |
| Cosméticos (×2) | Color propio por adorno | Antena, banderita, etc. |

### Presets de material (por zona)

Cada zona elige un **preset** que define PBR base (reutilizar `pbr()` / `M` de `render.ts`):

| Preset | Feel | Parámetros típicos |
|--------|------|---------------------|
| Metal cepillado | Industrial BattleBots | metalness alto, rough medio, textura procedural rayas finas |
| Plástico mate | Juguete RC / cubiertas | metalness bajo, rough alto, color saturado |
| Pintura brillante | Carrocería lacada | metalness medio, rough bajo, specular visible |
| Óxido / uso | Chatarra, bordes | rough alto, color marrón, procedural chips |

El jugador puede combinar **preset + color** (paleta o selector HSV reutilizando patrón del garaje donde encaje).

### Texturas

- **Solo procedurales** `canvasTex` / NEAREST (como patio y autos); **sin bitmaps externos** en v1.
- Variantes por preset: rayado metal, grano plástico, flake pintura, manchas óxido.

### Persistencia

- **Loadout de piezas** (chasis/ruedas/arma/cosméticos) + **materiales/colores por zona** → `localStorage` clave `duel_paint` (junto al nombre del robot).
- No sincronizar con `Save` del survivor en v1 (modo aislado); *opcional v2:* importar color del auto del garaje como atajo.

### Rival CUÑA INDUSTRIAL

- **Build fija:** cuña + orugas + pala (§34 toolbox R).
- **Look fijo pero mismo sistema:** chapa oscura + bandas naranja industrial + pala acero cepillado (valores en `balance.json` fila `duel_rival_cuña` o tabla `duel_paint_presets`); el jugador **no** edita al rival, pero el enemigo se ve tan detallado como el robot del jugador.

### Implementación (referencia)

- Reusar patrones de `menu.ts` / garaje (pintura por zona, HSV si ya existe para cel).
- Materiales por sub-malla al `merge()` del robot: ids de zona en metadata de cada primitiva en `duel_build.ts` o equivalente dentro de `duel.ts`.
- `ponytail:` si el garaje ya exporta helpers de pintura, extraer lo mínimo compartido a una función en `models.ts` o `duel_paint.ts` solo cuando duel lo necesite.

### Checklist

| Ítem | Estado |
|------|--------|
| Color/material chasis ×2 | ✅ v1 |
| Ruedas/arma/cosmético | ✅ v1 |
| Presets metal/plástico/pintura/óxido | ✅ v1 |
| Texturas procedurales | ✅ v1 |
| Rival mismo pipeline, paleta fija | ✅ v1 |

---

## 35. Armado — toolbox Q y R (resumen)

| Tema | Decisión |
|------|----------|
| Cosméticos | 2 ranuras; pool 6 tipos; masa mínima afecta CoG en preview |
| UI | Flechas ‹ ›; 3 presets Tanque/Veloz/Trompo |
| Montaje VFX | Tornillos + efectos pro (snap, chispa soldadura, etc.) |
| CUÑA build | Cuña + orugas + pala |
| Nombre robot | localStorage + polaroid |
| Lore | 1 línea picante por pieza en panel detalle |

*(Color/material: ver §34 — reemplaza “gris fijo”.)*

