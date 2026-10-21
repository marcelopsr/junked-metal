# Problemas: Havok y colisiones

Reglas vigentes: [`CLAUDE.md`](../../../CLAUDE.md) (sección Trampas de Havok) y `.claude/rules/havok.md`.

## Trampas de API

- **Macetas en el origen hundiendo al auto.** Causa: el cuerpo toma la pose de la malla al crearse (`disablePreStep = true`); la malla se movió después del `PhysicsAggregate`. Arreglo: posicionar y rotar ANTES de crear el aggregate (`at` en `zones/common.ts`, `stat(..., [x,y,z,ry])`). Las revisiones 0.9, 0.91 y 0.92 lo comprobaron en los biomas nuevos.
- **Inercia perdida al cambiar la masa.** Causa: `setMassProperties` reemplaza todo. Arreglo: mandar siempre masa e inercia juntas; usar `Car.setMass` (`src/car.ts`). Los juguetes del Paseo libre (`libre_juguetes.ts`) hacen lo mismo con masa, inercia y centro de masa en cero.
- **Contacto mal resuelto.** Causa: desplazar `centerOfMass` en cuerpos a los que se les fija la velocidad cada cuadro. Arreglo: no desplazarlo.
- **Doble liberación de cuerpos.** `setZone` libera `worldMeshes` y después corre el `undo` de los juguetes. No rompe: `PhysicsBody.dispose` tiene guarda `_isDisposed` (REVISION-0.95, leído en Babylon 9).

## Casos reales en zonas

- **Pileta: el auto cae al vacío (y=-5620) y la partida termina.** Causa: las paredes del pozo eran solo visuales y las losas tenían 2 de grosor. Arreglo: `wall()` con colisionador desde el fondo (y -20) hasta la explanada, tapa a ras (top 0) para no dejar un cordón de 0,5; piso de seguridad a -30 en `pileta.ts` (frena la caída pero no devuelve al auto: queda un `ponytail:`). Fuente: [QA-0.92](../../../.claude/trabajo/archivo/QA-0.92.md) y su ronda 2.
- **Industrial: atasco de 10 s en (-10,-62).** Causa: dos cajas colindantes forman un nicho más angosto que el auto. Arreglo: separar o quitar una caja; otro rincón se resolvió descartando un grupo de tambores (`industrial.ts`). El destrabe del bot (marcha atrás) no alcanza.
- **Jardín: maceta grande en la salida y arbustos lejos de sus colisionadores.** Causa: `put()` horneaba la pose con `bakeTransformIntoVertices` sobre el MISMO arreglo de mallas llamado varias veces, acumulando la transformación. Arreglo: las piezas reusadas son fábricas (`const bigPot = () => [...]`, `put(bigPot(), ...)`). Fuente: [HITO 0.92](../../../.claude/trabajo/archivo/HITO-0.92-revision.md) punto 1.
- **Ciudad: el auto atraviesa 6 pilones oscuros.** Causa: sin colisionador. Abierto: [ciudad-pilones-sin-colision](../../todos/ciudad-pilones-sin-colision.md).
- **Carrera: la IA se traba 131 veces en 4 puntos.** Causa: colisionadores invisibles `"p"` de los props RC del patio sobre el trazado. Arreglo: `rcColsOff(trk.P, W + 1)` al armar la carrera y `cleanup()` los restaura (`src/kart.ts`, `src/models/props_rc.ts`).
- **Luna: la `y` baja a -175 y parece caída.** Falso positivo: es una esfera con origen en el centro; la curvatura mueve `y`. Medir distancia al centro, no `y`.
- **Neumáticos apilados sin colisión.** Decisión de arte («sin colisión»); una pila de dos se lee como obstáculo. Ver REVISION-0.92 punto 4.
