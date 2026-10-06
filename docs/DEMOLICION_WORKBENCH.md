# Demolición — Mesa de armado (workbench)

**Estado:** MVP en código · **Modo Impeccable:** Operate  
**Archivos:** `src/duel.ts`, `src/duel.css`, `src/duel_paint.ts` (sin cambio de contrato)

## Objetivo

El jugador arma el robot de combate **antes** de ver la arena. La pantalla debe leerse como **mesa de taller RC**: robot al centro, piezas en bandeja, sensación Lego (arrastrar o tocar para encajar). Sin patio, pasto ni cielo de partida survivor.

## Flujo

1. Entrada desde menú → **Armado** (fase `armado`).
2. Escena 3D: taller oscuro + mesa + robot preview (órbita lenta de cámara).
3. Bandeja: 3 categorías × 3 piezas; equipar por **drag HTML** a zonas del robot o **click pieza + click zona**.
4. Telemetría y combo (`comboCheck`); pintura opcional en panel colapsable.
5. **Confirmar armado** → cuenta regresiva → arena acero (flujo actual `beginMatch`).

## Layout (MVP)

```
┌─────────────────────────────────────────────┐
│  «Arrastrá cada pieza al robot» (+ fallback) │
├──────────┬──────────────────────┬───────────┤
│ Stats    │   [3D mesa + robot]  │ (vacío)   │
│ Pintura  │   zonas drop overlay │           │
│ ▼ details│                      │           │
├──────────┴──────────────────────┴───────────┤
│ Bandeja: Chasis | Ruedas | Arma (3 chips c/u)│
├─────────────────────────────────────────────┤
│            [ Confirmar armado ]              │
└─────────────────────────────────────────────┘
```

- **Móvil:** panel stats arriba o debajo de la bandeja; zonas drop ≥44px; bandeja scroll horizontal por categoría.

## Interacción

| Acción | Comportamiento |
|--------|----------------|
| Drag chip → zona | Equipa pieza; chip activo en bandeja; preview 3D actualiza |
| Hover zona con drag | Borde resaltado (`drag-over`) |
| Click chip | Selecciona pieza pendiente |
| Click zona | Si hay pieza pendiente, equipa en esa categoría |
| Teclado pintura | `Q` / `R` sin cambio (§34) |

**Snap:** lógico (no física Havok en armado); el mesh del robot se reconstruye con `paintRobot`.

## A11y

- Instrucción visible + línea fallback («O elegí pieza y tocá la zona en el robot»).
- Zonas con `aria-label` por categoría; chips `aria-grabbed` / `aria-pressed` cuando aplica.
- `:focus-visible` en chips y zonas; confirmar deshabilitado si combo `ban`.
- Sin depender solo del drag (HTML5 + click).

## Pintura (§34)

Queda en `<details>` colapsado por defecto. No compite con la mesa. Misma API `playerPaint`, `PAINT_SLOTS`, swatches.

## Fases

### MVP (esta tanda)

- Mesa procedural + suelo taller; clima `farol` (único foco duro).
- Robot estático centrado en mesa; cámara órbita en `duelTick`.
- Bandeja 9 piezas; drag HTML a 3 zonas; click fallback todas las categorías.
- Stats + warn + CTA; escenarios `shots` duel armado.

### v2

- Ghost 3D de pieza siguiendo el puntero sobre la mesa.
- Rotación manual del robot en mesa (rueda / dos dedos).
- Animación «clic» al encajar; sonido `SFX` taller.
- Proyección 2D de zonas ancladas al mesh (en lugar de posiciones fijas CSS).
- Ruedas/arma con preview parcial antes de soltar.

## Criterios de aceptación (MVP)

- [x] No se llama `buildGrass` ni se ve patio en armado (`showWorld(false)` + mesa).
- [x] Usuario identifica bandeja, robot y zonas sin leer lore largo.
- [x] Al menos chasis equipable por drag; ruedas y arma por drag o click-snap.
- [x] `comboCheck`, `__duel.confirm()`, escenario `duel` shots pasan.
- [x] Copy neutro, sin voseo en instrucciones nuevas.

## Anti-objetivos

- Split screen / multijugador en armado.
- Nuevos ids de balance o piezas cuarta opción.
- Reemplazar `paintRobot` o formato de guardado pintura.
