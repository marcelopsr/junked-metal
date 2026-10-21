# Supervivencia — Identidad de build (GDD)

Estado: **DESCARTADO por el usuario (2026-10-06)** — no implementar detección de estilo ni sesgo de cartas. Documento de referencia si se retoma.

Relación: complementa [`SURVIVAL_EXPERIENCE_PLAN.md`](./SURVIVAL_EXPERIENCE_PLAN.md) (ritmo/perf/UX ya hechos). Este doc define **por qué una run se siente «build de X»** y no un amontonamiento de armas.

---

## 1. Problema (por qué se siente pobre)

- Hay **muchas armas**, evos y **5 fusiones**, pero las cartas compiten en igualdad: no hay **arquetipos** legibles en 30 s de juego.
- Las pasivas del taller y del nivel **suman %**; no cambian **cómo se juega** (movimiento, riesgo, zona segura).
- Las fusiones son **premio raro** sin guía: el jugador no sabe si persigue «tormenta», «control» o «embestida».
- La run no **se nombra**: al minuto 5 no hay frase mental («soy el de hielo + imán», «soy explosivos en cadena»).

**Objetivo:** a los **3–4 minutos** el jugador puede decir en una frase su build; a los **7** esa frase sigue siendo cierta y las cartas **refuerzan o corrigen** el plan, no lo diluyen.

---

## 2. Visión

**Roguelite de builds RC:** el auto es la plataforma; las armas definen **rol** (presión cercana, zona, cadena, embestida, control). Las pasivas **modifican el rol**, no solo números.

- **Sinergia visible:** HUD / radio / cartas nombran el arquetipo cuando se completa (ej. «CADENA ELÉCTRICA», «CHARCO»).
- **Anti-sinergia suave:** ofertas que **no rompen** el build pero **no lo potencian** (peso menor en el pool si ya hay 3 armas de otro rol).
- **No** nuevo árbol de 20 nodos ni respec completo en v1.

---

## 3. Arquetipos propuestos (v1 — 5 roles)

| Rol | Armas núcleo (ej.) | Pasivas que lo marcan | Sensación |
|-----|-------------------|------------------------|-----------|
| **Cadena** | Tesla, yo-yo, regla | Capacitor, Lupa | Saltos, rebotes, varios blancos |
| **Zona** | Chispero, bengalas, bocina, petardos | Resorte, Imán | El patio se llena de peligro fijo |
| **Proyectil** | Gomitas, helado, agua, trompo | Resorte, Turbo | Distancia y líneas de fuego |
| **Orbita** | Clips | Lego, Litio | Anillo de daño alrededor del auto |
| **Embestida** | Lanza | Turbo, Paragolpes | Velocidad + golpe físico |

Fusiones = **build capstone** (nombre propio + rol híbrido), no arma suelta.

---

## 4. Sistemas a tocar (cuando se apruebe)

| Sistema | Cambio |
|---------|--------|
| `weapons.ts` — `levelOffers` | Peso por rol, tag por arma, boost si 2+ del mismo rol; penalizar ofertas «fuera de rol» suave |
| `weapons.ts` — fusiones | Requisito opcional: «solo si ya tenés rol X» o carta de fusión con preview de arquetipo |
| `ui.ts` / HUD | Rótulo de arquetipo dominante (1 línea bajo TALLER o junto a NV) |
| `balance.json` | Solo si hace falta; prioridad diseño de pool, no números |
| Textos | Neutros, telemetría RC; nombres de arquetipo en MAYÚSCULAS en radio |

**Fuera de v1:** reescribir todas las armas, nuevas fusiones, maldiciones, pilotos con árboles propios.

---

## 5. Fases de implementación (criterio de terminado)

1. **Tags de rol** en datos (tabla o mapa en código mínimo) + función `dominantRole(weapons, passives)`.
2. **Pool de cartas** sesgado por rol dominante (y piloto opcional).
3. **HUD + 1 aviso de radio** al «cerrar» arquetipo (2 armas + 1 pasiva del mismo rol, o fusión).
4. **Sim + 3 semillas:** diversidad de armas elegidas por bot distinta; sin arma rota.
5. Shots `partida-cartas` con arquetipo visible.

---

## 6. Checklist decisiones (toolbox)

- [ ] ¿5 roles de la tabla o menos (3: zona / cadena / embestida)?
- [ ] ¿Sesgo fuerte (70% cartas del rol) o suave (40%)?
- [ ] ¿Pilotos con rol preferido (robot → cadena) o todos neutros?
- [ ] ¿Fusión solo cuando las dos armas son del pool actual o sin restricción?
- [ ] ¿Mostrar arquetipo desde 2 armas o solo con evo/fusión?

---

## 7. Defaults del equipo (si no hay respuesta)

- 5 roles; sesgo **suave** (40%); pilotos **neutros** en v1; fusión **sin restricción**; arquetipo visible con **2 armas mismo rol** o **1 evo**.
