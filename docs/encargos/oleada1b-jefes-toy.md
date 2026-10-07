# Encargo — Oleada 1b: jefes toy procedurales (`models.ts`)

**Repo:** `rc_fight` (Junked Metal)  
**Alcance:** solo `src/models.ts` — bloques `enemyTemplate` de **cortadora**, **aspiradora**, **cortacercos** y plantillas **sectorTemplate**, **cableTemplate**, **nutTemplate**.  
**Prohibido:** `enemies.ts`, `DEF.size`, `glb.ts`, assets GLB, commits en esta tanda.

**Estado** [Pulido jefes toy](20eef765-f031-471d-81a3-77172d73d8f9): integrado en oleada 1c (`1e08b75` / `5b636a0`).

**Referencias (lectura):**

- [`docs/OPEN_SOURCE_ASSETS_SURVEY.md`](../OPEN_SOURCE_ASSETS_SURVEY.md) — siluetas objetivo por jefe.
- [`docs/ART_DIRECTION.md`](../ART_DIRECTION.md) — rojo = amenaza enemiga (ojos, telegrafías, tuercas).
- [`docs/VISUAL_MODELS_UPGRADE_PLAN.md`](../VISUAL_MODELS_UPGRADE_PLAN.md) — split toy procedural vs plaga GLB.

---

## 1. Objetivo

Siluetas **juguete / chatarra** legibles **a distancia** (día Megabonk): formas gruesas, contraste de color, detalles icónicos (capó rojo, disco bajo, espada larga) sin cambiar cajas de colisión (`DEF[kind].size`).

---

## 2. Criterios de terminado

| Ítem | Criterio |
|------|----------|
| cortadora | Plataforma gris + **capó rojo alto** + volante en cruz + **barra de corte** al frente (+z); ruedas con tapas amarillas; cinta amarilla (junk). |
| aspiradora | **Disco** bajo con paragolpes, domo, franja amarilla, torreta con ojo rojo; **dos sensores** grandes al frente; cepillos laterales gruesos. |
| cortacercos | Motor **naranja** atrás (−z), mango en **D**, gatillo, **espada** dentada hacia +z; LEDs rojos; cable de salida. |
| sectorTemplate | Relleno más visible; borde del arco más grueso; aro emisivo en el piso (barrido cortacercos). |
| cableTemplate | Cable más grueso; tramos naranja/negro (extensión toy); chispas rojas más grandes. |
| nutTemplate | Tuerca hexagonal más grande + hueco central (lectura en vuelo). |
| Verificación | `npx tsc --noEmit -p .` sin errores. |

---

## 3. Estado (2026-10-07)

Implementado en `src/models.ts` (oleada 1b agente). Sin cambio de escala ni `size` en `enemies.ts`.

**Verificación pendiente integrador:** `npm run shots -- --only lab` con `?lab&boss=cortadora|aspiradora|cortacercos` y diff acotado si se actualiza referencia.

---

## 4. Fuera de alcance

- Otros enemigos procedurales (rey, robot, fricción, polilla, tarántula).
- `teleTemplate` / `auraTemplate` (salvo sector ligado al cortacercos).
- Balance, IA de jefes, sonido.
