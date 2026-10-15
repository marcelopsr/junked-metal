# Arte ImageGen — Survivor / ENCORE

Checkout de destino: `/Users/msalas/Devs/Varios/rc_fight`.

- `raw/`: PNG originales independientes.
- `jobs/`: prompts y ficha de cada recurso.
- `inventory.json`: estado verificable de las tandas.

## Alcance

La tanda 012 contiene diez propuestas visuales de objetos para los sistemas Survivor/ENCORE: Director, teleportador, economía, pactos y señalización. Se conserva la dirección aprobada por el usuario: miniatura 3D HD con detalle pixelado pintado. Los documentos de ENCORE aportan función y lenguaje retroindustrial; las imágenes no implementan mecánicas. El cohete teleportador tiene antecedente en el flujo actual; los acabados y máquinas nuevos son propuestas de arte.

## Reconstrucción procedural pendiente

Cada ficha registra piezas, semilla y parámetros que habrá que definir al construir el recurso 3D. Un PNG generado no es una receta ejecutable ni un material PBR. Se necesitarán malla, UV, máscaras, materiales, escala y validación de colisiones/instancias.

## Tandas anteriores

Los 116 PNG anteriores permanecen en `/Users/msalas/Documents/Devs/Varios/rc_fight/assets-src/imagegen-production/v1/raw/`. No se han trasladado ni integrado automáticamente a este checkout. Esta tanda inicia un inventario enfocado en ENCORE.

## Catálogo actual

30 PNG: [tanda 012](BATCH_012.md), [tanda 013](BATCH_013.md). La tanda 013 agrega ocho objetos, ocho materiales y cuatro decals. Los materiales son base color candidatos; repetición sin costuras y PBR no verificados. Los decals pueden requerir limpieza de halos semitransparentes antes de integrarse.
