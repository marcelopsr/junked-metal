# Crítica Impeccable: menús principales y HUD de partida (2026-10-13)

DEGRADED: single-context (sin subagentes de evaluación; criterio de diseño y medición hechos en la misma sesión; el detector `impeccable detect` no se corrió, la evidencia es de DOM medido con Playwright + capturas).

Alcance: `src/menu.ts` + `src/menu/`, `src/ui.ts`, `src/hud_tick.ts`, `hud.css`, `menu.css`, `kit.css`, `tutorial.ts` (botón del HUD). Modo: Operate. Servidor: rc-test :5174. Anchos 412 (táctil), 800 y 1366. Capturas: `docs/criticas/capturas-2026-10-13/antes/` y `.../despues/` (principal, modos, config, garaje, taller, bestiario, hud, cartas; `medidas.json` con objetivos < 44 px y desborde horizontal). Contexto: la auditoría `docs/AUDITORIA-accesibilidad-menus.md` (12-oct) ya tiene arreglados C2, A1, A3 (parcial) y A4; no se repiten.

## Nota

| Heurística | Antes | Después |
|---|---|---|
| 1 Visibilidad del estado | 3 | 3 |
| 2 Lenguaje del mundo real | 3 | 3 (voseo del tutorial corregido) |
| 3 Control y libertad | 3 | 3 |
| 4 Consistencia y estándares | 2 | 3 (Desafío semanal sin ícono; botón de tutorial con estilo suelto) |
| 5 Prevención de errores | 3 | 3 |
| 6 Reconocer en vez de recordar | 3 | 3 |
| 7 Flexibilidad y eficiencia | 3 | 3 |
| 8 Estética y minimalismo | 3 | 3 |
| 9 Recuperación de errores | 3 | 3 |
| 10 Ayuda y documentación | 3 | 3 |
| Extra: objetivos táctiles / colisiones HUD | -1 | 0 |
| **Total /40** | **31** | **33** |

Re-crítica tras el paquete pendiente (ronda 2): **34/40** (ver sección al final).

Fortaleza: identidad coherente (chapa oscura, borde naranja, Rajdhani, tokens `--jm-*`), jerarquía clara (Jugar verde dominante, ENCORE/diario, bloque Auto), HUD legible y sin desborde horizontal en los tres anchos, sin errores de consola. Especificidad de diseño: alta, no es UI genérica.

## Hallazgos por severidad

### Alto
1. **"Saltar tutorial" tapa el radar** en 800 y 1366 (posición inline `top:64px; right:12px`, el radar mide ~108 px a escala 1.3) y roza el botón de pausa en 412; alto 42 px. Arreglo: clase `.tut-skip` en `hud.css`, debajo del radar (122 px en grande, 66 px en táctil/<=720), 44 px táctil. APLICADO.
2. **Objetivos táctiles < 44 px** en celular: pestañas de Configuración 38 px (`kit.css:177` gana a `menu.css:468`), pestañas/filtros de Taller 34 px, filtros de Bestiario 28 px. Arreglo: sumar `#tabs/#stabs/#sfilt/#bfilts .tab` al bloque coarse de `kit.css` (carga al final). APLICADO; `medidas.json` después: 0 objetivos chicos en 412 (los 36 px de selects y pestañas con mouse quedan, ver pendientes).

### Medio
3. **Voseo en el tutorial**: "¡LISTO, SOBREVIVÍ!" rompe la regla de texto neutro. Arreglo: "¡LISTO! A SOBREVIVIR". APLICADO (`tutorial.ts`).
4. **Menú principal inconsistente**: "Desafío semanal" mostraba un punto en vez de ícono y su texto quedaba desalineado respecto de Desafío diario. Arreglo: `weekly: "nivel"` en `UI_BTN_ICON` (`icons.ts`). APLICADO.
5. **Taller en 412**: el aviso "Enfoca una mejora..." flota sobre la grilla y corta tarjetas; con la lista a 46 vh sobra poco espacio. PENDIENTE (requiere decidir si el aviso va fijo bajo la grilla o se oculta en táctil, donde no hay "enfocar").
6. **Aviso del HUD en 800 px**: el banner (min 230 px) queda pegado al panel NV de la señal (`max-width: min(400px, 100vw - 640px)`). PENDIENTE.

### Bajo
7. Pestañas/selects de 36 px con mouse o mando (aceptado por diseño, ver B3 de la auditoría).
8. Botón Más modos sin ícono (intencional, documentado en `menu.css`; el texto queda alineado).
9. El texto de estado sobre la escena sin fondo (A2 de la auditoría) sigue pendiente.
10. Falso positivo descartado: "USA LA HABILI5" en capturas es el efecto de estática del banner mientras se tipea (`STATIC` en `ui.ts`), no un bug.
11. Botón de chat rápido (`quickchat.css`, fuera de alcance): en las capturas iniciales aparecía y pisaba chips de armas en táctil; en las finales no apareció (lo muestra otro código, aparentemente de otro agente). Anotar en TABLERO si reaparece.

## Fixes aplicados (archivo)
- `src/hud.css` (final): regla `.tut-skip` + variante táctil.
- `src/tutorial.ts`: sin `style.cssText` inline; texto neutro.
- `src/icons.ts`: `weekly` con ícono.
- `src/kit.css` (bloque `@media (pointer: coarse)`): pestañas de 44 px.

## Verificación
`npx tsc --noEmit -p .` sin errores; `npx vitest run --changed`: 24 archivos, 159 pruebas OK; capturas antes/después a 412/800/1366 sin desborde horizontal y sin errores de consola (`*-logs` vacío).

## Ronda 2: paquete pendiente (2026-10-13)

Fixes (hallazgos 5, 6 y 9):
- Taller 412 (`src/menu.css`, `src/menu.ts`): `#sinfo` pasa a franja fija bajo la grilla (`flex: none`, alto mínimo de 2 líneas, separada 4 px) y la grilla termina con un degradé de 14 px que indica scroll; así las tarjetas cortadas se leen como lista desplazable y no como tapadas. En táctil el texto dice "Tocar una mejora..." (no hay "enfocar").
- HUD 800 (`src/hud.css`): `#banner` con `max-width: min(400px, max(190px, 100vw - 604px))` y `min-width: 190px`. Medido a 800 px: señal termina en x=294, aviso ocupa 302-498 (antes 285-515, solapado 9 px); radar desde 685. A 1366 el aviso no cambia (550-816). A 412 no cambia (regla móvil).
- A2 (`src/menu.css`): chapa `rgba(11,15,20,.92)` con texto `#f8fafc` (contraste > 15:1) en `.list .foot`, `#scr-encore .foot` (los dos textos explicativos de ENCORE no la tenían), `#netStatus`, `#netSession`, `#mainInfo`, `#iosHint`; los vacíos no muestran chapa (`:empty { display: none }`).

Nota final: 1 Visibilidad 3, 2 Lenguaje 3, 3 Control 3, 4 Consistencia 3, 5 Prevención 3, 6 Reconocer 3, 7 Flexibilidad 3, 8 Estética 3 (tarjetas cortadas ahora con degradé), 9 Recuperación 3, 10 Ayuda 3 (aviso táctil correcto), extra 0, ajuste +1 por estado legible sobre la escena y ausencia de colisiones en HUD. **Total 34/40** (objetivo de cierre alcanzado; para 40 quedan: selects/pestañas de 36 px con mouse, Más modos sin ícono, banner del HUD a 8 px de aire de la señal).

Capturas: `docs/criticas/capturas-2026-10-13/antes2/` y `despues2/` (`w412|w800|w1366-taller.png` y `-hud.png`, más `w1366-estado-principal/encore.png` solo después: la sala creada forzada por DOM). Verificación: `npx tsc --noEmit -p .` OK; `npx vitest run --changed`: 24 archivos, 159 pruebas OK; navegador headless cerrado al terminar. Límite: capturas del HUD con el aviso inyectado vía `import("/src/ui.ts").banner`; el antes de A2 no se capturó (el CSS ya tenía parte de la chapa de la ronda 1).
