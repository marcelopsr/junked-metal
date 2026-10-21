# Celular: nunca dos jugadores

En teléfono o táctil nunca hay pantalla dividida ni 2 jugadores (carrera o batalla); está forzado en código (`raceCfg.players = 1` con `isTouch`, selector oculto). La pantalla dividida existe solo en compu (teclado + joystick).

**Why:** decisión del dueño 2026-10-04: pantalla chica y un solo control táctil.

**How to apply:** no diseñar, optimizar ni probar split screen en celular.
