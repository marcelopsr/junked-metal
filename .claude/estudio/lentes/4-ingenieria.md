# Lente 4 · Ingeniería (arquitectura, gameplay, física, IA, guardado)

## Misión
Que el código haga lo pedido con el cambio mínimo correcto, sin fugas, sin romper determinismo y sin deuda escondida.

## Subespecialidades
- Arquitectura y extracciones por responsabilidad.
- Gameplay, IA, input unificado (teclado, gamepad, táctil).
- Física Havok y colisiones.
- Guardado y migración, red y telemetría.
- Deuda técnica (comentarios `ponytail:`).

## Principios
1. Entender antes de editar: listar todo lo que el cambio alcanza (llamadas, exports, tipos, `balance.json`, escenarios de `shots`, docs) y arreglar en el punto común.
2. Causa raíz, no síntoma: una guarda en la función compartida vale más que una en cada llamador.
3. Escalera ponytail: no hace falta → reusar → plataforma → dependencia instalada → mínimo código.
4. Extracción = una responsabilidad por vez, con comprobación del comportamiento antes, nunca mezclada con jugabilidad.
5. Todo lo que se crea al rearmar se libera al desarmar (mallas, texturas dinámicas, observers).
6. Lo que decide la partida usa `rng()`; lo visual usa generador local.
7. Contratos públicos preservados; los atajos llevan `ponytail:` con su techo.

## Criterios medibles en ESTE juego
- `npx tsc --noEmit -p .` sin errores; `npx vitest run --changed`; `npm test` entero antes de commit.
- Misma semilla = mismo resultado en `sim` antes y después de un cambio que no es de jugabilidad.
- 0 errores de consola en e2e y shots.
- Al rearmar zona 5 veces seguidas: sin crecimiento de mallas/texturas (`__info()`).
- `savefmt` con migración probada desde guardados anteriores.

## Errores típicos ya vividos
- Mover la malla después del `PhysicsAggregate`: macetas hundidas en el origen.
- `setMassProperties` solo con masa: pierde la inercia; usar `Car.setMass`.
- `centerOfMass` desplazado en cuerpos con velocidad fijada: contacto mal resuelto.
- `retex()` liberaba una textura cacheada que seguía en uso (REVISION-0.92 #2).
- `clear()` exige estar a más de 24 u de la salida: pilas de contenedores a 21-23 u nunca aparecían (código muerto).
- Pozo de pileta sin colisión en las paredes: el auto caía al vacío (QA-0.92).
- Un `soilEdgeMask` DynamicTexture nuevo por cada armado, nunca liberado.

## Herramientas y archivos
Graphify (`graphify query/path/explain`, `graphify update .`), `src/main.ts`, `src/car.ts`, `src/enemies.ts`, `src/weapons.ts`, `src/input.ts`, `src/savefmt.ts`, `src/devbot.ts`, `src/net.ts`, `tests/`, hooks `__tick`, `__sim`, `__info` (solo dev).

## Cuándo convocarla
Bug de física o lógica, atasco, extracción, fuga, guardado, nuevo sistema. Combina con 5 (reproducir y confirmar), 8 (costo) y 1 (si toca balance). Los compartidos (`render.ts`, `run.ts`, `camera_rig.ts`, `world.ts`, `zones/common.ts`, `bjs.ts`) los toca solo el orquestador.

## En Junked Metal
Babylon.js 9 + Havok + TypeScript + Vite. Enemigos, proyectiles y gemas son instancias; partículas del pool de `fx.ts`; topes (`maxAlive`, gemas 350, restos 240, marcas 500). Edits con la herramienta Edit, jamás reescribir con scripts o sed.
