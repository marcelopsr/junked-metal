# Arte individual de evoluciones

## Alcance

Crear una ilustración propia para cada una de las 32 evoluciones de arma (`WeaponId`, excluidas las cinco fusiones), conservar las dos láminas generadas como fuentes y conectar los 32 archivos a las cartas `kind: "evo"` en `src/ui.ts`.

## Dirección visual y entrega

- Ilustración cuadrada, un objeto principal, sin letras ni texto incrustado.
- Motivo de taller de chatarra RC con amarillo y azul gastados, acero oxidado, fondo gris cálido uniforme y silueta legible en la miniatura de 76 px.
- Recortar cada celda con margen para retirar las líneas de la lámina; exportar como WebP en `public/images/evolutions/evo-<id>.webp`.
- Guardar láminas PNG originales y prompts en `assets-src/evolution-art/v1/` para conservar la fuente editable/referencial.
- No alterar balance, nombres, mecánicas ni artes de fusión.

## Catálogo

`gomitas`, `clips`, `chispero`, `petardos`, `tesla`, `lanza`, `agua`, `yoyo`, `bengalas`, `regla`, `helado`, `bocina`, `trompo`, `tuercas`, `bobinas`, `ventilador`, `canicas`, `burbujas`, `matamoscas`, `dardos`, `chapitas`, `paraguas`, `cohete`, `serpentinas`, `tambor`, `domino`, `avioncito`, `pintura`, `bumeran`, `confeti`, `lupasolar`, `dron`.

## Verificación

Comprobar que existan los 32 archivos, que el mapa use IDs exactos (sin coincidencias parciales por título), compilar TypeScript y build, y capturar la pantalla de cartas en escritorio y móvil. Mantener la referencia previa de screenshots: el cambio visual de las cartas es intencional.

## Cierre de la tanda

Validada localmente. Las 32 miniaturas y PNG fuente están en `assets-src/evolution-art/v1/` y `public/images/evolutions/`; el mapa usa el ID exacto de `WeaponId`. `dardos` usa generación individual porque la celda original se leía como bocinas. Se añadió el escenario `evo-cards`, que fuerza un cofre de evolución y comprueba que el WebP cargue. Captura PC y móvil completada.

- `npx tsc --noEmit -p .`: OK.
- `npm test`: 22 archivos y 150 tests OK.
- `npm run build`: OK; conserva el aviso previo de chunk grande de menú.
- `npm run shots -- --only evo-cards`: 2 capturas OK.
- `npm run shots -- --only partida`: las cartas normales PC/móvil y los pasos de curso, outro y resultados pasaron; pausa falló por timeout en PC y móvil.
- No se actualizaron referencias visuales ni se publicó el cambio.

El modelo, seed y parámetros internos de la herramienta de imágenes no se exponen; los prompts exactos se conservan en `assets-src/evolution-art/v1/PROMPTS.md`. La salida es un render de juguete más realista que la dirección pixelada del mundo. Las láminas 4×4 también limitan la composición de cada celda; revisar dardos, chapitas y avioncito si se hace una pasada de refinamiento.
