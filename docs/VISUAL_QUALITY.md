# Calidad visual — registro de evolución

Historial acumulativo: cada evaluación se agrega abajo, nunca se reemplaza. Las notas (1-10) son una
rúbrica para comparar iteraciones entre sí, no una medida objetiva. Una nota sube solo con evidencia
visual (captura antes/después en las mismas condiciones), nunca porque se tocó un archivo.

## Método

### Qué aporta Impeccable (capacidades reales, v. instalada en `~/.claude/skills/impeccable`)
- `impeccable detect --json <archivos>`: detector mecánico de antipatrones de UI web (HTML/CSS/TS):
  transiciones de layout, easing con rebote, bordes de acento laterales, imágenes rotas, etc.
  **No ve el canvas 3D**: solo evalúa el HUD y los menús DOM.
- Comandos de criterio (`critique`, `audit`, `polish`, `layout`, `typeset`…): guías y heurísticas
  (Nielsen, carga cognitiva) para pantallas DOM. `critique` exige dos evaluaciones aisladas en
  subagentes (diseño + detector).
- Subagentes propios (`impeccable-finish-reviewer`, etc.) pensados para builds web con un DESIGN.md;
  el proyecto no tiene PRODUCT.md/DESIGN.md (pendiente `/impeccable init` si se quiere usar a fondo).
- Para las escenas 3D Impeccable no alcanza: se complementa con `npm run shots` (capturas
  deterministas), `npm run perf` y un revisor independiente con la rúbrica de abajo.

### Condiciones de captura (reproducibles)
`npm run shots -- --vp pc` contra pm2 `rc-test`: 1280x720, `?mute&seed=3`, preset Medio, bucle
congelado a 1/60 s por cuadro, cámara y estado fijados por `scripts/scenarios.mjs`. Las capturas de
referencia se guardan en `docs/visual/<fecha>-<etapa>/` en WebP (q82).

### Rúbrica (misma en cada evaluación)
| # | Dimensión | Qué se mira |
|---|---|---|
| 1 | Geometría | Siluetas, uniones visibles, nada de bloques sin intención |
| 2 | Materiales | Se distingue chapa / plástico / quitina / madera |
| 3 | Texturas | Desgaste con lógica (bordes, uso), no ruido uniforme; resolución adecuada |
| 4 | Iluminación y profundidad | Dirección de luz, sombras de contacto, separación de planos |
| 5 | Composición | El foco del juego está en cuadro, el HUD no lo tapa |
| 6 | Coherencia Folded 2.5D / ART_DIRECTION | Cumple las reglas vigentes |
| 7 | Legibilidad | Se lee el gameplay: jugador, amenazas, objetivos |
| 8 | Acabado | Sin cortes, solapes, textos a medio dibujar, piezas a medio hacer |
| 9 | Personalidad | Humor, escala de juguete, identidad propia |
| 10 | Integración | Los elementos pertenecen al mismo mundo |

### Ciclo
Capturar → auditar (detector + revisor independiente) → diagnosticar la causa (geometría, textura,
luz, composición, material, presentación) → implementar → recapturar igual → reevaluar con la misma
rúbrica (revisor que no hizo el cambio, sin decirle cuál es la versión nueva) → verificar
(`tsc`, `npm test`, `build`, `shots --diff`, `perf`) → iterar.

---

## 2026-10-08 · Línea base

**Capturas:** `docs/visual/2026-10-08-base/` (14 escenas, pc).
**Evaluador:** subagente `revisor` independiente, con ART_DIRECTION y la rúbrica; no hizo cambios.
Nota del evaluador: ART_DIRECTION se contradice (sección HUD «terminal gastada» con VT323 vs. la UI
actual Rajdhani/kit); priorizó las secciones más nuevas (Folded, Megabonk, Etapa 2).

| Escena | Geo | Mat | Tex | Ilum | Comp | Coh | Leg | Acab | Pers | Integ |
|---|---|---|---|---|---|---|---|---|---|---|
| Survivor · lab-noche | 5 | 5 | 5 | 4 | 6 | 6 | 6 | 6 | 6 | 5 |
| Survivor · lab-jefes | 6 | 7 | 7 | 6 | 4 | 7 | 5 | 5 | 8 | 5 |
| Survivor · partida-curso | 4 | 4 | 5 | 4 | 3 | 4 | 5 | 4 | 4 | 4 |
| Survivor · partida-cartas | n/a | n/a | 5 | 6 | 6 | 5 | 7 | 6 | 7 | 5 |
| Carrera · largada | 5 | 4 | 5 | 4 | 7 | 3 | 7 | 5 | 6 | 4 |
| Carrera · curso | 4 | 4 | 5 | 4 | 5 | 3 | 5 | 4 | 5 | 4 |
| Junket Crush · gabinete | 7 | 7 | 6 | 6 | 5 | 8 | 8 | 5 | 7 | 6 |
| Junket Crush · juego | 7 | 7 | 7 | 7 | 8 | 8 | 8 | 7 | 8 | 8 |
| Menú · portada | 7 | 6 | 6 | 8 | 7 | 7 | 8 | 8 | 8 | 8 |
| Menú · principal | 6 | 7 | 6 | 7 | 5 | 5 | 8 | 6 | 5 | 6 |
| Menú · garaje | 6 | 6 | 6 | 6 | 5 | 6 | 8 | 6 | 8 | 6 |
| Menú · bestiario | n/a | n/a | 5 | 6 | 4 | 5 | 6 | 4 | 7 | 4 |

Demolición (armado 3-5, pelea 2-7) se evaluó pero **el modo quedó descontinuado** (decisión del
usuario, 2026-10-08): fuera de las próximas iteraciones. Se probó una corrección de cámara (no
quedar detrás del muro del ring) y se revirtió por la discontinuación.

### Problemas identificados (causa → arreglo propuesto)
1. **Carrera** (material, luz, presentación): sin post retro ni paleta de clima, niebla lechosa sin
   dirección de luz, rectángulos que flotan en el cielo, público y vallas de color plano sin desgaste:
   choca con los autos Folded. → Mismo shader retro, materiales FOLD, fondo como siluetas de la casa.
2. **Survivor en partida** (composición, luz): aviso de radio y tutorial tapan el centro, el tutorial
   sigue a 1:30 (en la captura no hubo entrada del jugador), sin luz direccional ni sombra de contacto,
   4 enemigos rojo-naranja. → Avisos en banda superior, tutorial que se va solo, sombra de contacto por
   instancia, tonos base distintos por bicho.
3. **Textos del mundo y uniones** (presentación, geometría): pósters en español y el mismo póster en
   dos idiomas (`src/kit3d.ts:138`), patas de jefes sin unión visible.
4. **Bestiario** (composición, acabado): fila cortada y pisada por «MEJORES PARTIDAS», descripciones
   truncadas, sin miniaturas de los bichos.
5. **Junket Crush gabinete** (textura, composición): desgaste uniforme en todo el mueble; dos manchas
   verdes planas en los laterales (sin confirmar en código qué son).
- Falso positivo de captura: «TRAY@» en el aviso es el efecto de tipeo a medio camino, no un error.

### Detector Impeccable (`detect --json index.html src`): 19 hallazgos
- 8 `bounce-easing` (menu.css, hud.css, match3.css, replay.css, style.css): **se mantienen**, el rebote
  es parte del tono cartoon de juguete; la regla del detector apunta a UI de producto.
- 5 `layout-transition` (`transition: width` en barras de vida/carga): real, menor; pasar a
  `transform: scaleX` si aparece en `perf`.
- 3 `side-tab` (kit.css:114, match3.css:171, menu.css:278) y 1 `border-accent-on-rounded`
  (kit.css:172): revisar contra el kit; candidatos a quitar.
- 2 `broken-image` (index.html, match3.ts:625 con `src=""` inicial): se llena por código; verificar
  que nunca se vea vacío.
- 1 `repeating-stripes-gradient` (index.html): franjas de peligro, intencional.

### Fortalezas a no perder
Junket Crush en juego (mejor integración Folded), la escritura con humor (cartas, bestiario), la escala
de juguete en el cuarto de la portada y los jefes de chapa gastada.

### Cambios implementados / puntuación posterior
Ninguno todavía en esta entrada: la intervención de Demolición se revirtió. Próximas prioridades:
Carrera (1) y Survivor en partida (2).

---

## 2026-10-08 · Ciclo #1 (Supervivencia, Chatarroteca, Carrera Folded y Utilería del Patio)

**Capturas verificadas:** `.shots/actual/` (`npm run shots -- --only menu,lab,partida,carrera,folded`, 75 capturas en PC y celular sin errores de consola).

### Intervenciones aplicadas y verificadas en captura
1. **Carrera (`src/kart.ts`, `src/world.ts`):**
   - **Causa de los rectángulos flotantes en `pc-carrera-curso.png`:** La fachada de la casa (`house()` en `src/world.ts:239`, alto 90) tenía `color: "#efe6d8"` + `emissive: "#6a6050"`, que con el sol diurno y `levels = 0.85` del shader retro saturaba a blanco puro y se fundía con el cielo, dejando solo la puerta y las ventanas flotando en el aire. Se reemplazó por ladrillo cálido (`#9c5c46`, `emissive: "#1f120d"`, superficie `brick`) con cornisas horizontales, alféizares y marcos oscuros (`#36261e`).
   - **Materiales Folded en pista y circuito:** Pórtico de largada en chapa plegada (`FOLD.painted`) con bases `TRIM.hazard` (`FOLD.trim()`), cartel `START` en tipografía `Rajdhani` con flejes oxidados, cajas de objetos `?` como módulos de telemetría con remaches, rampas con labio `TRIM.hazard`, carteles de curva con caja 3D trasera, barreras de neumáticos con llanta interior pintada y vallas sin z-fighting.
2. **Survivor en partida y laboratorio (`src/fx.ts`, `src/main.ts`, `src/hud.css`, `src/enemies.ts`, `src/folded_slice.ts`, `src/models.ts`):**
   - **Composición HUD:** Aviso `#banner` anclado al borde superior (`top: 10px` en PC, bajando solo si `#bossbar` está visible) y fuente compacta (`clamp(15px, 2.1vw, 20px)`), liberando el centro de juego. El tutorial `#hint` se desvanece a los 7 s (`visibility: hidden; pointer-events: none`).
   - **Sombras de contacto (1 draw call, 0 allocs):** `contactShadows(carPos, enemies)` en `src/fx.ts` dibuja discos suaves por thin-instance debajo del auto y hasta 259 enemigos (incluyendo polillas en vuelo con escala atenuada por altura y jefes saltando).
   - **Tonos base y articulaciones:** Diferenciación cromática entre plagas (`hormiga` caoba `#6e3520`, `escupidora` oliva ácido `#6b8a22` con saco `#b8ff28`, `robot` pies/pelvis de acero oscuro `#282c34` contra torso carmesí `#e0322a`, patas de `rey` `#3c4450` y `tarantula` `#4a3228`). Se sumaron cilindros de rótula/cadera y bisagra de tobillo en `foldLeg` y pasadores de cadera/hombro en `petBody` (`perro` y `gato`).
3. **Chatarroteca (`src/icons.ts`, `src/menu.ts`, `src/menu.css`):**
   - La sección `#records` (*Mejores partidas*) ahora se muestra únicamente en la pestaña `Estadísticas`, liberando `calc(100dvh - 208px)` en `Bichos`, `Pilotos` y `Logros` (entran 2 filas completas de 4 fichas en 1280x720 sin cortes).
   - Se crearon 13 siluetas SVG dedicadas (`beastIcon` en `src/icons.ts`) conectadas a `.bthumb` en cada tarjeta de la Chatarroteca.
4. **Utilería y restos Folded (`src/folded_slice.ts`, `src/world.ts`, `src/fx.ts`):**
   - `potFold()` (macetas de chapa terracota con flejes oxidados y remaches) y `gnomeFold()` (gnomos de jardín de chapa plegada con hebilla de acero, barba en placas y ojos emisivos) integrados en `pots()`, `gnomes()`, `planterAlley()`, `toyScatter()` y `hose()` sin alterar semillas (`rng()`).
   - `debris()` en `src/fx.ts` ahora instancia placas de chapa pintada con tuerca/remache central (`FOLD.painted` + `FOLD.bare()`).

### Hallazgos nuevos detectados en las capturas de este ciclo (para Ciclo #2)
- En `pc-partida-pausa.png`, el cuadro `#hint` de controles queda visible detrás de los botones de pausa y se superpone con el pie de texto (`ATARDECER · PLAGA DE HORMIGAS · Semilla 3`).
- En `pc-partida-cartas.png`, el borde inferior de las 3 cartas de nivel y la leyenda `"1 · 2 · 3 o clic — Enter confirma"` pisan la barra `#bar` (`12.6V`).
- Siguen pendientes del listado inicial: pósters bilingües en `src/kit3d.ts:138`, desgaste uniforme/manchas laterales del gabinete de Junket Crush (`src/match3_scene.ts`), utilería de mesa en `src/menuscene.ts` y antipatrones DOM puntuales (`side-tab`, `layout-transition`).

---

## 2026-10-08 · Ciclo #2 (Claridad en Partida: Cartas de Nivel, Sinergias y Pausa en Vivo)

**Capturas verificadas:** `.shots/actual/pc-partida-cartas.png`, `.shots/actual/cel-partida-cartas.png`, `.shots/actual/pc-partida-pausa.png`, `.shots/actual/pc-partida-curso.png`, `.shots/actual/cel-partida-curso.png` (`npm run shots -- --only partida`, 5 capturas sin errores).

### Intervenciones aplicadas y verificadas en captura
1. **Eliminación de solapamientos en Cartas de Nivel y Pausa (`src/hud.css`, `src/style.css`):**
   - `#hud:has(~ #levelup:not(.hidden))` y `#hud:has(~ #fe:not(.hidden))` ocultan `#hint` y `#txl` mientras están abiertas las cartas de nivel o el menú de pausa.
   - En `pc-partida-cartas.png` y `cel-partida-cartas.png`, las 3 cartas de mejora quedan centradas con aire limpio arriba y abajo, sin pisar el panel inferior `12.6V` (mientras `#luHp` muestra `VIDA 160/160` en el encabezado).
   - En `pc-partida-pausa.png`, desaparece el cuadro `#hint` traslúcido detrás de `SEGUIR / CONTROLES / CONFIGURACIÓN / ABANDONAR` y el pie `ATARDECER · PLAGA DE HORMIGAS · Semilla 3 · ESC sigue · M sonido` se lee limpio.
2. **Indicador de sinergia de evolución y fusión en cada carta (`src/weapons.ts`, `src/ui.ts`, `src/style.css`, `src/kit.css`):**
   - Cada carta de arma, pasiva, evolución o fusión incluye un sello `.syn` con ícono SVG de 14 px y etiqueta en español neutro (`Evo · Pila de litio`, `Evo · Imán de heladera`, `Evo · Petardos / Bengalas`), que cambia a estado resaltado dorado (`Par listo · ...`, clase `.syn.on`) cuando el jugador ya tiene la contraparte en su inventario.
   - Integrado tanto en el diseño vertical de PC como en la grilla horizontal compacta de celular (`grid-template-areas: "art kind" "art name" "art desc" "art syn" "art pips"`).
3. **Desglose de daño en vivo en Pausa (`src/main.ts`, `src/menu.ts`, `src/menu.css`):**
   - En `#scr-pause`, cada fila de `#kitW` muestra bajo el nombre del arma su daño acumulado y porcentaje del total (`1.240 · 68%` o `0 daño` al inicio) junto con una barra inferior proporcional (`--w-pct`), y la columna `PARTIDA` suma la fila `Daño total`.
   - Se fijó `white-space: nowrap` en `#fe li b` para evitar que `×1.00 (pico ×1.00)` se parta en dos renglones.

### Hallazgos visuales detectados para Ciclo #3
- En `pc-match3-gabinete.png`, las dos manchas verdes laterales que tapan los tercios izquierdo y derecho del cuadro son esferas/masas de follaje cercanas a la cámara en `src/match3_scene.ts`.
- En `pc-menu-garaje.png` y `pc-menu-taller.png`, la lámpara articulada celeste (`src/menuscene.ts`) sigue en plástico liso (`M.plastic`) con la bombilla asomando a través del cono superior, desentonando con el auto y la caja de herramientas Folded.
- En `pc-menu-taller.png`, las 9 tarjetas de `CHASIS` (4×2 + 1 huérfana) empujan `#shopPreview` y `VOLVER` hasta el borde inferior en 1280×720, y la opacidad de tarjetas sin saldo apaga demasiado el título y el ícono.

---

## 2026-10-09 · Ciclo #3 (Gabinete Junket Crush, Mesa de Menú Folded, Póster en Inglés y Limpieza DOM)

**Capturas verificadas:** `.shots/actual/pc-match3-mapa.png`, `.shots/actual/cel-match3-juego.png`, `.shots/actual/pc-menu-garaje.png`, `.shots/actual/cel-menu-garaje.png`, `.shots/actual/pc-menu-taller.png` (`npm run shots -- --only menu,match3`, 56 capturas en PC y celular sin errores).

### Intervenciones aplicadas y verificadas en captura
1. **Eliminación de las masas verdes laterales y desgaste localizado en el gabinete de Junket Crush (`src/match3.ts`, `src/main.ts`, `src/match3_scene.ts`):**
   - **Causa raíz de las dos manchas verdes en el gabinete:** Al entrar a Junket Crush (`enterMatch3()` en `src/main.ts`), `menuOff()` llamaba a `showWorld(true)`, encendiendo todo el patio (`worldMeshes` y `layoutMeshes` en el origen `(0,0,0)`) superpuesto con el cuarto de ladrillo del gabinete; además, la precarga diferida (`worldTask`) podía terminar estando ya en `"match3"` y el filtro `hiddenFlora` solo ocultaba nombres con `/bush|tree|crown/`, dejando visibles las macetas y plantas fusionadas del patio a ambos lados del gabinete.
   - **Solución:** `startMatch3()` ahora invoca `showWorld(false)` directamente (y `worldTask` respeta `state === "menu" || state === "match3"`), despejando por completo el cuarto de ladrillo en `pc-match3-mapa.png` y ahorrando draw calls del patio oculto.
   - **Desgaste con lógica física en el gabinete:** El mapeo UV planar de los laterales (`src/match3_scene.ts:99`) multiplicaba `y * 1.3` (llegando a `v = 2.53` con `WRAP_ADDRESSMODE`), lo que repetía la franja de óxido de borde de `wornTex` 2,5 veces a mitad de la chapa lateral. Se normalizó el UV planar al contorno `[0..1]` con `CLAMP_ADDRESSMODE` para que el óxido de borde caiga únicamente en los cantos, esquinas y zócalo, y se sumaron chapas de roce (`rust`) bajo la base del joystick y del botón de disparo.
2. **Mesa de taller y lámpara articulada Folded en Menú (`src/menuscene.ts`):**
   - **Causa del aspecto plástico y solape de la bombilla:** `benchBuild()` y `transmitter()` usaban `M.plastic` liso (`#9ccfe8`, `#c98a5a`) y la esfera `sph(1.5)` del foco en `[2.5, 6.5, -1]` atravesaba la pared lateral del cono `cyl(1.2, 3.8, 2.6)`.
   - **Solución:** Se migraron la lámpara articulada, la cajonera 3×3, el transmisor RC, la mesa de trabajo, las herramientas del tablero perforado y la batería a materiales `wornMat` (`#3a6b7c`, `#262a30`, `M3C.naranja`, `M3C.amarillo`, `#a0452a`), y se rediseñó la campana facetada de 8 caras con cuello oscuro y foco `sph(1.1)` alojado dentro de la boca del cono sin atravesar la chapa (`pc-menu-garaje.png`, `pc-menu-taller.png`).
3. **Póster 100% en inglés y limpieza de antipatrones DOM (`src/kit3d.ts`, `index.html`, `src/hud.css`, `src/kit.css`):**
   - Se alineó el póster del taller (`poster()` en `src/kit3d.ts:138`) con `docs/ART_DIRECTION.md` (`"GOOD METAL / BRIGHTER DAYS"`), visible en la pared izquierda de `pc-match3-mapa.png`.
   - Se asignó un GIF transparente 1×1 válido en `#overPhotoImg` (`index.html`), se quitó `transition: width` residual en `.h-track > div` (`src/hud.css`) y se migró `.jm-sw::after` a `transform: translateX(26px)` en compositor (`src/kit.css`).

---

## 2026-10-09 · Ciclo #4 (Claridad en Garaje, Sinergias en ARMA y Grilla/Contraste en Taller 720p)

**Capturas verificadas:** `.shots/actual/pc-menu-garaje.png`, `.shots/actual/cel-menu-garaje.png`, `.shots/actual/pc-taller-garaje-arma.png`, `.shots/actual/cel-taller-garaje-arma.png`, `.shots/actual/pc-menu-taller.png`, `.shots/actual/cel-menu-taller.png`, `.shots/actual/pc-taller-arsenal.png` (`npm run shots -- --only garaje,taller`, 26 capturas en PC y celular sin errores).

### Intervenciones aplicadas y verificadas en captura
1. **Cifras reales y barras con riel completo en Garaje (`src/menu.ts`, `src/menu.css`, `src/kit.css`):**
   - En la pestaña `AUTO` del Garaje (`pc-menu-garaje.png`, `cel-menu-garaje.png`), cada atributo (`Carrocería`, `Velocidad`, `Embestida`) se organiza en una celda `.stc` dentro de una grilla de 3 columnas iguales (`grid-template-columns: repeat(3, 1fr)`), mostrando la cifra real en amarillo (`150`, `54` km/h, `×3` en *El Divorciado*; `220`, `45`, `×4,5` en *El Loco Cuarentón*; `110`, `68`, `×2,4` en *El Apurado*) sobre una barra de progreso con riel oscuro completo (`.stb`).
   - Se ajustó la altura útil de `#cars` (`55vh` en PC y `43vh` en celular vertical), eliminando el recorte inferior de la tercera tarjeta (*El Apurado*) en `cel-menu-garaje.png`.
2. **Sinergia de evolución en `ARMA` inicial y vista previa en Taller (`src/menu.ts`, `src/menu.css`, `src/kit.css`):**
   - En la pestaña `ARMA` del Garaje (`pc-taller-garaje-arma.png`, `cel-taller-garaje-arma.png`), cada arma muestra un bloque `.wsyn` con el ícono SVG de su pasiva par y la receta completa (`Evoluciona con RESORTE → Gomitas Saltarinas`, `Evoluciona con IMÁN DE HELADERA → Tornado de Clips`, `Evoluciona con MOTOR TURBO → Estela Infernal`).
   - En el Taller (`ARSENAL` y `AUTOS`), enfocar un arma o un auto muestra en `#sinfo` su sinergia de evolución o sus cifras base junto al cálculo de tornillos/partidas restantes (`pc-taller-arsenal.png`).
3. **Grilla 3×3 equilibrada y contraste de chapa oscura en Taller (`src/menu.css`, `src/kit.css`):**
   - **Encuadre PC 720p (`pc-menu-taller.png`):** `#shop` pasa a una grilla de 3 columnas (`repeat(3, minmax(210px, 256px))`), transformando los 9 ítems de `CHASIS` de una disposición `4 + 4 + 1` con fila huérfana a un bloque simétrico `3 × 3`. El mayor ancho por tarjeta evita que títulos como `MOTOR REBOBINADO`, `NAFTA DE ENCENDEDOR`, `PARAGOLPES DE FIERRO` y `GATILLO ENGRASADO` se partan en dos líneas, dejando amplio aire sobre `#sinfo` y `VOLVER`.
   - **Encuadre móvil (`cel-menu-taller.png`):** Las pestañas `#stabs` quedan en 2 filas limpias de 4 botones (sin dejar `ZONAS` huérfana en una 3ª fila), los filtros `#sfilt` ya no truncan la palabra `COMPRADAS` en el borde derecho y `#shop` usa 2 columnas aprovechando todo el ancho de la pantalla.
   - **Contraste sin saldo (`#shop .perk.no`):** Se reemplazó `opacity: .5` por fondo de chapa oscura opaco (`rgba(11, 15, 20, .92)`) con título nítido (`#e2e8f0`), diferenciando las mejoras comprables por su borde bronce `--jm-chapa` y precio en `--jm-amarillo` brillante.

---

## 2026-10-09 · Ciclo #5 (Cierre de Partida `#outro` / `#scr-over`, Solución de Gradientes SVG Ocultos y Fin de Fase C Folded)

**Capturas verificadas:** `.shots/actual/pc-partida-outro.png`, `.shots/actual/cel-partida-outro.png`, `.shots/actual/pc-partida-resultados.png`, `.shots/actual/cel-partida-resultados.png`, `.shots/actual/pc-partida-pausa.png`, `.shots/actual/pc-carrera-podio.png`, `.shots/actual/cel-carrera-podio.png` (`npm run shots -- --only partida,carrera`, 15 capturas en PC y celular sin errores).

### Intervenciones aplicadas y verificadas en captura
1. **Solución de íconos SVG invisibles en Pausa y Resultados (`src/icons.ts`):**
   - **Causa raíz:** Cada llamada a `icon(id)` generaba un `<linearGradient id="ig-${id}">` con el mismo `id` que los íconos ya insertados dentro de `#hud`. Cuando `#hud` pasaba a `.hidden` (`display: none`) al abrir Pausa (`#scr-pause`) o Resultados (`#scr-over`), Chromium resolvía `stroke="url(#ig-...)"` contra el primer `<linearGradient>` del DOM (oculto dentro de `#hud.hidden`), dejando los íconos de armas completamente invisibles.
   - **Solución:** Se incorporó un sufijo incremental único por instancia (`ig-${id}-${++uid}`) en `icon()`, `uiIcon()` y `beastIcon()`, haciendo que todos los íconos de armas en `#scr-pause` y `#scr-over` se rendericen nítidos y con su degradado completo.
2. **Cámara lenta (`#outro`), Polaroid determinista y Reporte de Fin de Partida (`src/replay.ts`, `src/replay.css`, `src/menu.css`, `src/main.ts`, `src/style.css`):**
   - **Polaroid (`src/replay.ts`):** Se migró la tipografía del epígrafe de las fuentes inexistentes `Silkscreen`/`VT323` a `Rajdhani` (`700` y `600`) y se reemplazó `Math.random()` en las fibras del papel por un LCG determinista (`s = 20261009`) para que las capturas de referencia tengan `0%` de ruido aleatorio.
   - **Cámara lenta (`#outro`):** `endRun()` ahora oculta `#banner` junto con `#hud` y `#touch` se oculta durante `#outro` y `#race.podium`, evitando que alertas de radio o controles táctiles tapen la explosión en cámara lenta (`cel-partida-outro.png`).
   - **Grilla de `#scr-over` en PC y celular:** Se corrigió la especificidad de `#fe #overDmg li, #fe #overHurt li` (que antes era pisada por `#fe li { display: flex }`, truncando los nombres de armas y bichos) y de `#scr-over .overGrid` en `@media (max-width: 700px)` (que antes era pisada por `.overRow` de `replay.css`). Ahora `pc-partida-resultados.png` y `cel-partida-resultados.png` entran íntegros en cuadro sin truncados ni desbordes verticales.
3. **Cierre de Fase C Folded: Podio 3D de Carrera y Muros Rompibles (`src/kart.ts`, `src/race.css`, `src/world.ts`):**
   - **Podio Folded (`buildPodium` en `src/kart.ts`):** Bloques de chapa plegada (`FOLD.painted` en oro `#eab308`, plata `#94a3b8` y bronce `#c27838`), tapa superior de acero (`FOLD.bare()`), faja `TRIM.hazard` en el zócalo, placas frontales `1 / 2 / 3` orientadas hacia la cámara (`yaw + Math.PI`) y foco `setLamp` apuntando al podio durante la ceremonia (`pc-carrera-podio.png`, `cel-carrera-podio.png`).
   - **Muros de ladrillo rompibles (`brickWalls` en `src/world.ts`):** Migrados a `FOLD.painted("#b45309", 0.8, 340 + (i % 4))` + `crateFold` bajo `FOLDED_SLICE`, completando el 100% de la Fase C Folded sin alterar la secuencia de `rng()`.

---

## 2026-10-09 · Ciclo #6 (Submenús de Lanzamiento `#scr-race`, `#scr-play` y `#scr-daily`)

**Capturas verificadas:** `.shots/actual/pc-menu-jugar.png`, `.shots/actual/cel-menu-jugar.png`, `.shots/actual/pc-menu-diario.png`, `.shots/actual/cel-menu-diario.png`, `.shots/actual/pc-menu-carrera-menu.png`, `.shots/actual/cel-menu-carrera-menu.png` (`npm run shots -- --only menu`, 46 capturas en PC y celular sin errores).

### Intervenciones aplicadas y verificadas en captura
1. **Ficha de largada en Supervivencia (`#scr-play` en `index.html`, `src/menu.ts`, `src/menu.css`):**
   - Se incorporó un panel de chapa `.briefCard.jm-panel` con la descripción de la zona activa (`#zoneDesc`), una franja destacada `.briefRec` con la mejor marca personal de la zona (`MEJOR MARCA EN PATIO: 10:12 · 420 BAJAS` o aviso sin marca) y una grilla `.briefKit` 2×2 con el equipamiento activo (`Auto`, `Piloto`, `Arma inicial` con su ícono SVG real resolviendo el arma del piloto cuando corresponde, y `Habilidad` con ícono SVG).
2. **Pronóstico determinista del Desafío Diario (`#scr-daily` en `index.html`, `src/run.ts`, `src/menu.ts`, `src/menu.css`):**
   - Se expuso `previewProfile(seed)` en `src/run.ts` usando un generador local aislado (sin consumir el `rng()` global) y cubierta con test unitario en `test/run.test.ts`.
   - `#scr-daily` presenta una grilla `.briefGrid` con el escenario y clima del día (`Patio · Atardecer`), la plaga dominante (`Plaga de hormigas`), los dos minijefes apilados en `.briefMinis` con sus siluetas `beastIcon` sin truncarse (`Cortadora de césped` y `Eulalio el michu`) y el jefe final de los 10:00 (`Felipe el dogo`), seguida por `.briefKit` y el récord diario.
3. **Grilla de 2 columnas y tarjetas de circuito con metas de medalla en Carrera (`#scr-race` en `index.html`, `src/menu.ts`, `src/menu.css`):**
   - Los controles de `#scr-race` pasaron de una pila vertical de 11 botones a `.raceGrid` en 2 columnas (`Largada` con `uiIcon("carrera")` junto a `Batalla de globos`, `Modo`, `Cilindrada` + `Vueltas`, `Jugadores` + `Control J1`, `Volver`), adaptándose en celular (`isTouch`) ocultando el selector de jugadores y expandiendo `Control J1` a ancho completo.
   - Debajo se sumó `#rcBrief` con las 3 tarjetas `.rcCard` (`Patio`, `Jardín`, `Garaje`), cada una mostrando la insignia de medalla (`ORO` / `PLATA` / `BRONCE` / `SIN MARCA`), el mejor tiempo personal y los tiempos objetivo (`Oro`, `Plata`, `Bronce`) calculados dinámicamente con `medalTimes(i, c.laps, c.cc)` según las vueltas y cilindrada elegidas. Un clic sobre cualquier tarjeta selecciona esa pista en modo *Carrera suelta*.
   - El pie de controles `#fe #rcHelp` se enmarcó sobre una franja de chapa oscura (`rgba(11, 15, 20, .88)`) sin sombra de texto múltiple, garantizando lectura limpia sobre la madera clara del escritorio.

---

## 2026-10-09 · Ciclo #7 (Chatarroteca Completa: `Pilotos`, `Logros` con Progreso e Íconos y `Estadísticas` con Barras y Siluetas)

**Capturas verificadas:** `.shots/actual/pc-menu-bestiario-pilotos.png`, `.shots/actual/cel-menu-bestiario-pilotos.png`, `.shots/actual/pc-menu-bestiario-logros.png`, `.shots/actual/cel-menu-bestiario-logros.png`, `.shots/actual/pc-menu-bestiario-stats.png`, `.shots/actual/cel-menu-bestiario-stats.png`, `.shots/actual/pc-menu-bestiario.png` (`npm run shots -- --only menu`, 52 capturas en PC y celular sin errores).

### Intervenciones aplicadas y verificadas en captura
1. **Pestaña `Pilotos` con arma de serie, estado y tipografía limpia (`src/menu.ts`, `src/menu.css`):**
   - Cada ficha de piloto incorpora la franja `.wsyn` con el ícono SVG y nombre de su arma inicial (`Arma de serie: LANZA-GOMITAS` / `ANTENA TESLA` / `PETARDOS`), el borde `.sel` cuando es el piloto activo y el pie `.price` alineado al fondo con su estado (`EN USO`, `EN EL GARAJE`, `Bloqueado · N tornillos` o `Logro: ...`).
   - Se eliminó la regla heredada `.ficha.locked b { letter-spacing: .4em }` que deformaba los nombres de los pilotos bloqueados y sus armas de serie.
2. **Pestaña `Logros` con íconos por categoría, avance contextual y premios sin repetición (`src/menu.ts`, `src/menu.css`):**
   - `achIco(k)` asigna a cada uno de los 19 logros su ícono SVG propio (`uiIcon("vehiculo")` para victorias por auto, `beastIcon(k)` para jefes derrotados, `icon("chispazo" | "globos" | "anillo")` para fusiones e íconos específicos para hazañas).
   - `achProg(k, ok)` añade progreso contextual (`.achProg`) en logros pendientes o acumulativos (`Mejor marca: 8:32 / 10:00` con barra `.stb`, `Bajas registradas: N` en jefes, y `Auto en el garaje · falta ganar la partida` vs. `Requiere desbloquear el auto en el Taller` en logros por vehículo).
   - `rewardName(id)` evita duplicar el nombre de la ranura cuando la pieza ya empieza con él (`Premio: Alerón alto` en vez de `Alerón Alerón alto`, y `Escape · Chimeneas`).
3. **Pestaña `Estadísticas` en grilla 3×2 con barras `.stb`, íconos SVG y placa `#records` (`src/menu.ts`, `src/menu.css`):**
   - `#scr-bestiary[data-btab="stats"] #beasts` se organiza en una grilla simétrica de 3 columnas en PC (`2×3` para las 6 tarjetas) y 1 columna en móvil.
   - `Partidas` suma barra de porcentaje de victorias; `Tiempo jugado` incluye `Mejor tiempo`; `Arma favorita` muestra el ícono SVG del arma principal y las 3 armas con mayor daño acumulado con barras `.stb`; `Bajas por tipo` incorpora `beastIcon(k, 16)` y barras proporcionales `.stb` para cada especie; y la tabla `#records` (*Mejores partidas*) queda enmarcada en una placa de chapa oscura con filo superior `--jm-chapa`.
   - Además, se añadió `#beasts` a `SCROLL` y se resetea `$("beasts").scrollTop = 0` al abrir la Chatarroteca desde el menú principal o al cambiar de pestaña (`d.btab`), corrigiendo el desplazamiento residual en móvil tras inspeccionar fichas del final de la lista.

