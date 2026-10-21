# Oleada 1c — prueba visible (Bestiario)

Fecha: 2026-10-07. Objetivo: que el cambio se note en **≤30 s** abriendo fichas 3D (no solo la grilla de texto).

## Dónde mirar (usuario)

1. Menú principal → **Bestiario** → tocar **Hormiga** (o Escupidora / Escarabajo / Fricción / Robot).
2. En la ficha (`#scr-beast`): el bicho gira sobre el carrete de hilo a la izquierda (arriba en celular).
3. Comparar con memoria o con capturas en `.shots/actual/`:
   - **Hormiga:** mandíbulas y antenas más gruesas, cuerpo ~24% más grande en pantalla, ojos rojos más brillantes.
   - **Escupidora:** saco lima translúcido + cuerpo rojo del GLB (ya no solo `DEF.color` plano en Body), ojos ámbar más fuertes.
   - **Escarabajo:** caparazón metálico verde + franjas `Shine`/`Dark` del GLB.
   - **Fricción / Robot:** silueta ~22% mayor (procedural), colores más saturados y faros/ojos más luminosos.

La pantalla **solo lista** (`#scr-bestiary`, shot `bestiario`) **no muestra mallas** — solo tarjetas HTML. Si solo se abre esa pantalla, oleada 1/1b/1c parecen “iguales”.

**Oleada 2 (2026-10):** el salto grande en pantalla ya fue **1c**; el sculpt en `.blend` de plaga/jefes es **sutil** en el GLB publicado. Lo más nuevo en juego: **Garaje** (hull Blender en los 8 autos). Los 8 bichos procedural de `proc2/` siguen dibujados con `models.ts` hasta integración GLB.

## Capturas (headless, rc-test :5174)

| Shot | PC | Celular |
|------|-----|---------|
| Grilla bestiario (sin 3D) | `.shots/actual/pc-menu-bestiario.png` | `.shots/actual/cel-menu-bestiario.png` |
| Primera ficha (cualquier bicho visto) | `.shots/actual/pc-menu-ficha.png` | `.shots/actual/cel-menu-ficha.png` |
| Ficha **Hormiga** (3D) | `.shots/actual/pc-menu-ficha-hormiga.png` | `.shots/actual/cel-menu-ficha-hormiga.png` |

Regenerar: `pm2 restart rc-test` → `npm run shots -- --only bestiario,ficha,ficha-hormiga`.

## Cambios técnicos (1c)

- `src/glb.ts`: `visual` en instancia (+22–24%), Body usa albedo/metal del GLB, ojos con emisivo fuerte.
- `src/enemies.ts`: aplica `GLB[kind].visual` al escalado de la malla (colisión `DEF.size` intacta).
- `src/models.ts`: `VIS_1C` 1.22 en fricción, robot, cortadora, aspiradora, cortacercos.
- `public/models/ant.glb`: reexport con `export_clean.py` (silueta más toy).
- `DEF.size`: **sin cambios** (documentado).

## Diagnóstico “no veo nada” (oleada 1/1b)

1. **Vista equivocada:** grilla bestiario ≠ ficha 3D (`beastTick` en `main.ts`).
2. **Body GLB → `M.plastic(DEF.color)`** (pre-1c): detalle de color del mesh en Body se perdía; geometría sí, pero sutil a distancia de cámara.
3. **Caché / build viejo:** demo en `:4173` o PWA sin `npm run build` / hard refresh; dev en `:5173` con HMR a veces deja GLB en caché del navegador → recargar con vaciado o usar `:5174` tras `pm2 restart rc-test`.
