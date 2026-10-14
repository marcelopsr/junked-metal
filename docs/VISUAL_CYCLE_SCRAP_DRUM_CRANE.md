# Ciclo visual local: chatarra, tambores y grúa

Fecha: 2026-10-13. Alcance elegido por el usuario: las tres propuestas.

## Objetivo

1. El parche de chatarra debe perder su borde rectangular visible sin cambiar su terreno físico, rampa ni distribución de props.
2. Las tapas de los dos tambores deben distinguir tapón, metal expuesto y pintura gastada a la distancia de juego; los detalles van en la plantilla visual existente.
3. La grúa debe ocupar más espacio útil en la vista móvil del bestiario, conservando giro, pellizco, navegación y encuadre de los demás enemigos.

## Implementación mínima prevista

- Reutilizar la máscara de borde y los materiales del patio; ajustar solo la transición de chatarra que provoca el rectángulo.
- Reutilizar los materiales `drumCap` y `drumTrim` y la plantilla `drumCap`; no crear mallas por instancia.
- Ajustar el encuadre de `setupBeastCam` solo para la grúa en pantalla vertical. No tocar el tamaño del modelo en partida.

## Verificación y cierre

Capturas headless antes/después del parche, tapas en PC y celular, y ficha de grúa en PC y celular desde el servidor PM2 de este checkout (`:5278`). Comprobar TypeScript, tests y build una vez al terminar; inspeccionar que los cambios no alcancen física, balance, guardado ni otros enemigos. Commit local de rutas propias, sin push ni publicación.

## Resultado

La línea recta vista desde la cámara de juego era la berma de tierra existente: la mancha visual terminaba antes de cubrirla. Se ampliaron los dos decals existentes en profundidad; la berma y su colisión no cambiaron. Las tapas ahora llevan aro exterior más legible y una placa con junta alrededor del tapón, todo dentro de la plantilla compartida. `setupBeastCam` acerca únicamente a `grua` cuando la pantalla es vertical; el zoom manual sigue operando sobre el mismo cálculo.

Evidencia local: `.shots/actual/{pc,cel}-cycle-crane.png` y `.shots/actual/{pc,cel}-cycle-scrap-drums.png`. `npx tsc --noEmit -p .`, 178/178 tests y `npm run build` pasaron; las cuatro capturas no registraron errores de consola. La vista móvil del patio verifica el detalle de la tapa y la grúa móvil cabe en la zona 3D. No se midió rendimiento en teléfono físico.
