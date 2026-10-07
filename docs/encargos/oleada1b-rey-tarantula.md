# Encargo oleada 1b — Rey + tarántula (`src/models.ts`)

Fecha: 2026-10-07 · Plan: [`VISUAL_MODELS_UPGRADE_PLAN.md`](../VISUAL_MODELS_UPGRADE_PLAN.md) § Oleada 3 (pack procedural minijefes).

**Estado** (2026-10-07): **cerrado** — siluetas y patas en `enemyTemplate` + `LEGS` / `legTemplate` (solo `rey`, `tarantula`). `tsc` OK. Shots lab/jefes → integrador.

## Alcance y rutas disjuntas

| Permitido | Prohibido |
|-----------|-----------|
| `src/models.ts` — bloques `rey`, `tarantula`, `LEGS.rey`, `LEGS.tarantula`, `legTemplate` (campo opcional `knee`) | `src/enemies.ts`, `glb.ts`, `assets-src/**`, otros `enemyTemplate` |
| Este brief | Commit, push, integrador (`shots`, `build`) |

**No** cambiar `DEF[kind].size` ni `scale` en `enemies.ts`; la silueta debe seguir encajando en la caja Havok existente.

## Objetivo visual

| Id | Identidad emisiva | Silueta |
|----|-------------------|---------|
| `rey` | Ojos lima `#d0ff60` (+ tercer punto `#b8e838`); rodillas `#3a4818` | Elytra dorada ancha, costura central, joroba, cuerno con punta metálica; **6 patas** más gruesas y abiertas |
| `tarantula` | Ojos rosa `#ff4fd8` (5 puntos); rodillas `#5a2860` | Abdomen con **banda naranja** (`tor`), quelíceros largos; **8 patas** más largas y gruesas |

Referencias: [`OPEN_SOURCE_ASSETS_SURVEY.md`](../OPEN_SOURCE_ASSETS_SURVEY.md) § rey / tarantula; escarabajo GLB `eye: #d0ff60`.

## Cambios aplicados

- **Cuerpo rey:** elytra + joroba `shellHi`, costura y banda lateral oscuras, cabeza y cuerno más voluminosos, punta dorada en cuerno.
- **Cuerpo tarántula:** abdomen mayor, `tor` de banda, cefalotórax y quelíceros reforzados, racimo de ojos ampliado.
- **LEGS.rey:** `len` 1.14, `r` 0.088, caderas más abiertas (`hips` ±0.58–0.62).
- **LEGS.tarantula:** `len` 1.62, `r` 0.118, `yaw` ajustado para stance más araña.
- **legTemplate:** `knee` opcional en `LEGS` → esfera emisiva en la articulación (solo rey/tarantula).

## Verificación (agente)

```bash
npx tsc --noEmit -p .
```

Integrador: `pm2 restart rc-test`, `npm test`, `build`, `npm run shots -- --only lab` (fila jefes / `?boss=rey` / tarántula).
