# Encargo — Oleada 2 (pilot): `friccion` + `robot` procedurales

**Repo:** `rc_fight` (Junked Metal)  
**Alcance:** solo `src/models.ts` → ramas `enemyTemplate("friccion")` y `enemyTemplate("robot")`.  
**Prohibido:** `assets-src/*`, `src/glb.ts`, `src/enemies.ts` (colisión `DEF.size` sin cambio), `balance.json`, commits en esta tanda.

**Estado** [Procedural fricción robot](763f83aa-b48f-44c0-9622-978247e4a91c) (2026-10-07): **implementado** en `models.ts` (~L540–592); `tsc` OK. Ver en bestiario tras [Integrador bestiario 1b](dba38453-252a-475a-8cf1-d1a297ea5a28).

**Referencias obligatorias (solo lectura):**

- Siluetas y escala: [`docs/OPEN_SOURCE_ASSETS_SURVEY.md`](../OPEN_SOURCE_ASSETS_SURVEY.md) § friccion / § robot (Kenney Toy Car Kit, Kenney Robot Pack).
- Plan maestro: [`docs/VISUAL_MODELS_UPGRADE_PLAN.md`](../VISUAL_MODELS_UPGRADE_PLAN.md) §2.1 (procedural, instancing).
- Emisivos: [`docs/ART_DIRECTION.md`](../ART_DIRECTION.md) (faros `#fff4d0`, robot `#facc15`).
- Colisión fija: `DEF.friccion.size` `[0.9, 0.6, 1.6]`, `DEF.robot.size` `[1.2, 1.7, 1.0]` en `enemies.ts`.

---

## 1. Objetivo de producto

**Cambio de silueta notorio a distancia de partida** (patio, cámara survivor), sin romper instancing ni importar GLB.

| Id | Lectura a distancia | Referencia CC0 |
|----|---------------------|----------------|
| **friccion** | Cochecito naranja tipo *speedster*: morro puntiagudo, cupula de parabrisas, **alerón trasero**, faros blancos en aro cromado, **llave de fricción** lateral, ruedas gordas en las esquinas | Kenney Toy Car `vehicle-speedster` / `vehicle-racer` |
| **robot** | Lata roja de juguete: **torso cilíndrico**, cabeza domo, **llave de cuerda** grande en la espalda (aro + paletas), brazos de chapa, ojos amarillos en visor | Kenney Robot Pack (cuerpo cilíndrico toy) |

Animación: sigue **rígida** (ruedas y cuerpo fusionados; sin patas VAT). Coherente con fila del plan §2.1.

---

## 2. Contrato técnico

| Requisito | Detalle |
|-----------|---------|
| Pipeline | `template()` → `merge()` → `InstancedMesh` (un draw por `Kind`) |
| Materiales | `M.plastic`, `M.metal`, `M.rubber`, `M.glass`, `M.glow` vía `flatten()`; emisivos de identidad sin hornear |
| Escala visual | Ajustar geometría al **interior** de la caja Havok existente; no tocar `DEF.size` ni `scale` de plantilla |
| GLB | **No** en esta oleada (pilot procedural) |
| Deuda | Bloque de malla amplio marcado con `ponytail:` en `models.ts` (extracción futura a `models/enemies/*.ts` si crece el archivo) |

---

## 3. Criterios de terminado (pilot)

1. Silueta distinguible de la versión anterior en lab / partida (`?mute&lab` o plaga juguetes).
2. Faros fricción y ojos robot legibles como emisivos (ART_DIRECTION).
3. `npx tsc --noEmit -p .` sin errores.
4. Sin regresión de instancing (sigue un `enemyTemplate` por tipo).

**Verificación visual sugerida (integrador):** `pm2 restart rc-test` → `npm run shots -- --only lab` o captura con fila de enemigos en lab; diff opcional.

---

## 4. Implementación (2026-10-07)

- **friccion:** perfil extruido más alargado y bajo tipo RC de carrera; paragolpes tubo; faros con `tor` + `sph` glow; alerón; llave lateral; guardabarros con bulbo.
- **robot:** pies + torso cilíndrico; cabeza domo; visor oscuro; llave trasera (eje + toro + cuatro paletas); brazos en tres segmentos; antena con punta ámbar.

**Fuera de alcance:** animar llave o ruedas por instancia; pilot `pilotParts("robot")`; oleada GLB de Kenney.
