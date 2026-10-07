# Encargo oleada 1b — Polilla (procedural en `src/models.ts`)

Fecha: 2026-10-07 · Oleada **1b** bestiario · Plan: [`VISUAL_MODELS_UPGRADE_PLAN.md`](../VISUAL_MODELS_UPGRADE_PLAN.md) § Oleada 2 (polilla + `wingTemplate`).

**Estado:** aplicado en código procedural (sin GLB). Sin commit en este encargo.

## Alcance

| Permitido | Prohibido |
|-----------|-----------|
| `src/models.ts` — bloque `enemyTemplate("polilla")` y `wingTemplate()` | Otros bloques de `enemyTemplate`, `LEGS`, autos, jefes |
| Este brief | `enemies.ts`, `main.ts`, `balance.json`, commit, push |

**Integrador:** `pm2 restart rc-test`, `shots --only lab,bestiario`, diff visual si hay referencia.

## Objetivo de diseño

Silueta **legible a distancia de lab** (`?lab` fila de enemigos): alas más anchas que el cuerpo, ojos lavanda con bloom (charco de muerte y goo `#c9a0ff` en `main.ts`). Dirección: [`ART_DIRECTION.md`](../ART_DIRECTION.md) — low-poly creíble, emisivos como identidad, sin terror.

## Cambios realizados

### Cuerpo (`enemyTemplate` → `polilla`)

- Tórax/cabeza ligeramente más voluminosos (mejor lectura frontal).
- Antenas un poco más largas y gruesas.
- Ojos: radio **0.20** con `pbr` emisivo `#f0d8ff` sobre base `#c9a0ff`; núcleo blanco **0.08** para punch en bloom (antes `M.glow` 0.13).

### Alas (`wingTemplate`)

- Ala anterior: esfera achatada más ancha (`scale` ~1.45 en X, radio 1.45, bisagra desplazada a +x).
- Ala posterior añadida (segunda esfera semitransparente) para silueta de mariposa/mariposa nocturna.
- Mancha oscura desplazada al borde exterior del ala.
- Color ala un poco más claro (`#c9b88a`) para contraste con pasto de noche.

### Runtime (sin tocar en este encargo)

- Instancia: `enemies.ts` — dos alas en `x = ±0.18`, aleteo en `animate()`.
- Escala de colisión: `DEF.polilla.size` `[1.4, 0.5, 1.1]` en `enemies.ts`.

## Verificación

```bash
npx tsc --noEmit -p .
```

Opcional integrador: `npm run shots -- --only lab` — polilla en fila, alas en aleteo stop-motion.

## Métricas

- Archivos tocados: **1** (`src/models.ts`).
- Partes ala: **2 → 3** mallas por instancia (anterior + posterior + mancha).
- Partes cuerpo: **7 → 9** (ojos + núcleos).

## Riesgos

| Riesgo | Nota |
|--------|------|
| Alas más anchas intersectan vecinos en lab | Aceptable en fila; escala de instancia no cambió |
| Bloom excesivo en ojos | Núcleo pequeño; si molesta en día Megabonk, bajar emissive en integración |

## Definición de hecho

- Solo bloques polilla / `wingTemplate` modificados.
- `tsc` sin errores.
- Brief actualizado (este archivo).
