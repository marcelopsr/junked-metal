# QA final 3: cooperativo local (2 y 4 jugadores, compu 1280x720)

Fecha 2026-10-12. Base: 5fb7082 (QA 1). Chrome headless con `scripts/lib/browser.mjs`, `?mute&encore&players=N&seed=3`, `__tick` y `__enc.*`. Joysticks simulados sobrescribiendo `navigator.getGamepads` (más `gamepadconnected`). Capturas en `scratch/qa2/` (no versionadas; guiones `lib.mjs`, `p1.mjs`, `p2.mjs`, `p3.mjs`).

## Resultado por punto

| Punto | 2 | 3 | 4 |
|---|---|---|---|
| Selector `Jugadores · N` | OK: sin joysticks alterna 1/2 y avisa "3 o 4 piden 3 o 4 joysticks"; con 4 joysticks recorre 1-2-3-4 | OK | OK |
| Cuadros | arriba/abajo, 2 cámaras | 2x2 con el cuarto negro (`#quadVoid`) | 2x2, 4 cámaras |
| HUD de vida | `#mateHp` "J2 160/160" y "FUERA" | `#quadHp` por cuadro | igual |
| J2 por flechas / J3-J4 por joystick | la cámara de J2 avanza con flechas | J2 y J3 por joystick se mueven | J2, J3, J4 se mueven, J1 queda quieto |
| Caída y reaparición | cae y vuelve con vida llena al pasar de escenario (teleportador, pacto, ruta) | igual | igual |
| Cambio del que guía | cae J1: `lead` pasa a J2, J1 "FUERA" | igual | igual |
| Cofre, máquina, teleportador por un compañero | cofre y máquina bajo J2 abren cartas "Cofre · J2" y "Máquina de opciones · J2"; cohete bajo J2 con J1 a 29 m pasa a `teleporter` | igual | máquina bajo J4 (joystick): "· J4"; cohete bajo J4: `teleporter` |
| Fin de partida | caen todos: `over`, pantalla de resultados | igual | igual |

Consola: 0 errores en todos los recorridos (el `pageerror` de `reading 'id'` del primer intento era mi simulación: lanzaba `gamepadconnected` sin `gamepad`; corregido en `lib.mjs`).

## Fallas y arreglos

1. **HUD de J3 y J4 tapado** (2x2): las vidas de la fila de abajo caían detrás del ícono de habilidad (J3) y del panel de telemetría del que guía (J4). Arreglo mínimo en `src/hud.css`: `.q3`/`.q4` van arriba de su cuadro (`top: calc(50% + 8px)`). Verificado con capturas de 3 y 4 jugadores.
2. **Hooks de prueba** (solo dev, `src/main.ts`): `__enc.shop(kind, who)` acepta el número de jugador y `__enc.tele(who)` pone el teleportador bajo el auto de `who`; antes todo caía bajo el que guía y no se podía probar la activación por un compañero.

## Observaciones sin cambio

- El recuadro de controles (`#hint.coop`) queda un rato sobre la división y tapa la vida de J2 en el 2x2; se va solo.
- El texto "J4 FUERA HASTA EL 9" de las capturas es el efecto de descifrado del aviso a mitad de animación; el texto final es "…EL PRÓXIMO ESCENARIO".
- Dos compañeros muy juntos (menos de 4,5 m): el cofre lo abre el de menor número (`findIndex` en `shopTick`); es el comportamiento documentado en R7b.
- Sin joysticks físicos: el mapeo real de cada marca no se probó, solo el estándar con RT (7) y eje 0.
- Sin `perf` de la grilla 2x2.

Verificación: `tsc` limpio, `vitest` 133/133.
