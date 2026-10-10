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

---

## 2026-10-09 · Ciclo #8 ( Ejecución en Paralelo por Subagentes: Pausa/Resultados, HUD de Evolución, Créditos/Más Modos y Poda GLTF)

**Capturas verificadas:** `.shots/actual/pc-partida-pausa.png`, `.shots/actual/pc-partida-resultados.png`, `.shots/actual/cel-partida-resultados.png`, `.shots/actual/pc-menu-creditos.png`, `.shots/actual/cel-menu-creditos.png`, `.shots/actual/pc-menu-mas-modos.png`, `.shots/actual/cel-menu-mas-modos.png` (`npm run shots -- --only menu,partida`, 63 capturas en PC y celular sin errores).

### Intervenciones aplicadas por subagentes en paralelo y verificadas en captura
1. **Sinergias bidireccionales en Pausa e íconos SVG completos en Resultados (Subagente 1 · `src/menu.ts`, `src/menu.css`):**
   - **Pausa (`#scr-pause`):** Cada arma no evolucionada en `#kitW` muestra su pasiva de evolución debajo del daño (`Evo: Resorte`, `Evo: Capacitor`) resaltada en `--jm-amarillo2` (`.wsynP.on`) cuando la pasiva ya está equipada; simétricamente, cada pasiva en `#kitP` muestra las armas que evoluciona (`Evo: Lanza-gomitas`, etc.) con el mismo código visual.
   - **Resultados (`#scr-over`):** `#overDmg` incorpora íconos SVG para fuentes no-arma (`Embestida` con `icon("lanza", 18)`, habilidades activas con `ABIL_ICON` y `Pelota` con `icon("mortero", 18)`); `#overHurt` resuelve el `Kind` de cada fuente de daño recibido (`Hormiga`, `Cucaracha`, `Hormiga escupidora`, `Contacto · ...`, `Rebote · ...`, `Salto · ...`, `Barrido · ...`, `Ácido`, `Cables`) y renderiza su silueta `beastIcon(hk, 18)` alineada a la izquierda con truncado limpio (`em` con `text-overflow: ellipsis`).
2. **Placa de chapa en Créditos y progreso vivo en Más Modos / Junket Crush (Subagente 1 · `index.html`, `src/menu.ts`, `src/menu.css`, `scripts/scenarios.mjs`):**
   - **Créditos (`#scr-credits`):** `#scr-credits .roll` utiliza ahora `.briefCard.jm-panel` (`pc-menu-creditos.png`, `cel-menu-creditos.png`), unificando la última pantalla informativa con el sistema de paneles de chapa oscura y tornillos en las esquinas sin alterar el texto original.
   - **Más Modos (`#scr-modes`) y `#scr-match3`:** `refreshModes()` inyecta el progreso de Carrera (`#progRace`: pistas completadas y medallas ganadas sobre 3) y de Junket Crush (`#progM3` y `#m3Brief`: nivel de campaña `X / 10` y estrellas `Y / 30`), cubierto por la nueva captura `mas-modos` (`pc-menu-mas-modos.png`, `cel-menu-mas-modos.png`).
3. **Indicador de sinergia y evolución lista en el HUD de Supervivencia (Subagente 3 · `src/ui.ts`, `src/hud.css`):**
   - `hudSlots()` marca con `.syn-on` las ranuras de armas y pasivas que forman pareja de evolución activa, y con `.evo-ready` + insignia `<b class="evo-tag">EVO</b>` las armas en nivel 5 listas para evolucionar al abrir el próximo cofre (respetando `body.calm`).
4. **Poda estática del chunk muerto GLTF Loader bajo `FOLDED_SLICE` (Subagente 2 + Orquestador · `src/glb.ts`, `src/carGlb.ts`):**
   - Se cortocircuitaron `load()` y `loadOne()` con `FOLDED_SLICE` y `@vite-ignore`, eliminando por completo `dist/assets/2.0-*.js` (`542.16 kB`) y `glTFLoaderAnimation.pure-*.js` (`23.59 kB`) del build de producción.

---

## 2026-10-09 · Ciclos #9 y #10 (Medallas Metálicas en Carrera, Ícono Reloj y Descripciones en Taller, y HUD `#txl` de Habilidad y Salto)

**Capturas verificadas:** `.shots/actual/pc-menu-carrera-menu.png`, `.shots/actual/pc-taller-habilidades.png`, `.shots/actual/cel-taller-habilidades.png`, `.shots/actual/pc-partida-curso.png`, `.shots/actual/cel-partida-curso.png` (`npm run shots -- --only taller,partida`, 33 capturas en PC y celular sin errores).

### Intervenciones aplicadas por subagentes en paralelo y verificadas en captura
1. **Medallas metálicas `.rmedal` en Carrera y SFX sintético en Junket Crush (Ciclo #9 · `src/menu.ts`, `src/race.css`, `src/sfx.ts`, `src/match3.ts`):**
   - Las tarjetas `.rcCard` del submenú de Carrera muestran insignias `.rmedal` con bisel y relieve metálico para oro, plata y bronce; el gabinete Junket Crush incorpora sonidos mecánicos sintetizados (`m3Click`, `m3Swap`, `m3Clear`, `m3Win`).
2. **Ícono SVG `"reloj"` y descripciones completas en `Habilidades` del Taller (Ciclo #10 · Subagente 1 · `src/icons.ts`, `src/menu.ts`):**
   - *Cámara lenta* estrena el ícono SVG `"reloj"` (cronómetro con degradado `#9be3ff → #ffd84d`), eliminando la colisión con la mejora *Señal*.
   - Las 4 fichas de `Habilidades` en el Taller (`pc-taller-habilidades.png`, `cel-taller-habilidades.png`) muestran ahora qué hace cada habilidad junto con su nivel y enfriamiento actual (`Lluvia de petardos alrededor del auto · Nivel 1 (20 s)`, `Ralentiza todo durante 4 s · Nivel 1 (24 s)`).
3. **HUD `#txl` con cabecera de habilidad, estado `LISTO · E` y fila de Salto en escritorio (Ciclo #10 · Subagentes 2 y 3 · `src/ui.ts`, `src/hud.css`, `src/main.ts`):**
   - Se rehabilitó `.h-ptitle.h-abil` en `src/hud.css` (que estaba oculto por `display: none`), mostrando el ícono SVG y nombre de la habilidad equipada (`PETARDOS`), su estado en `#abKey` (`LISTO · E` en verde `#22c55e` en PC y `LISTO` en móvil) y la fila de Salto (`SALTO` / `LISTO · F` con barra de carga) siempre visible en escritorio (`pc-partida-curso.png`).
   - En `src/main.ts`, `choose(i)` dispara por única vez por arma un aviso `EVOLUCIÓN LISTA · <EVO_NAME> (COFRE)` cuando un arma alcanza Nv. 5 con su pasiva pareja equipada.

---

## 2026-10-09 · Ciclo #11 (Meta de Medalla en Vivo y Placa `#rinfo` en Carrera, Insignia `NV X/10` en Junket Crush, Curva Gamma/FSR 2J y Pulsos del Patio)

**Capturas verificadas:** `.shots/actual/pc-carrera-curso.png`, `.shots/actual/cel-carrera-curso.png`, `.shots/actual/pc-carrera-podio.png`, `.shots/actual/cel-carrera-podio.png`, `.shots/actual/pc-match3-juego.png`, `.shots/actual/pc-match3-derrota.png` (`npm run shots -- --only carrera,match3,partida`, 31 capturas en PC y celular sin errores).

### Intervenciones aplicadas por 4 subagentes en paralelo y verificadas en captura
1. **Meta de medalla en vivo en el HUD, chispas dobles de mini-turbo y placa `#rinfo` en el podio (Subagente 1 · `src/kart.ts`, `src/race.css`):**
   - Debajo de `VUELTA X/3`, `.rtime` muestra ahora junto al tiempo la insignia metálica `.rmedal` de la medalla que aún está al alcance (`ORO 1:35.2` -> `PLATA` -> `BRONCE`) tanto en PC (`pc-carrera-curso.png`) como en celular (`cel-carrera-curso.png`).
   - El derrape emite chispas progresivas dobles desde ambas ruedas traseras (`[-0.62, 0.62]`) cambiando de blanco a azul eléctrico (`#4aa8ff` / `#9be3ff`) y naranja incandescente (`#ff9d2e` / `#ffd84d`).
   - En el podio (`pc-carrera-podio.png`, `cel-carrera-podio.png`), `#rinfo` queda enmarcado como placa de chapa oscura con borde superior dorado (`#ffc24d`) e insignia `.rmedal`.
2. **Insignia `NV X/10`, marcas divisorias de estrella y pedidos `.done` en Junket Crush (Subagente 2 · `src/match3.ts`, `src/match3.css`):**
   - El cabezal 3D del gabinete muestra la cápsula `NV X/10` en cian en la esquina superior derecha (`pc-match3-juego.png`), enmarca en verde metálico los pedidos completados (`OK`) y traza líneas divisorias verticales de alto contraste en los 3 umbrales de estrella de la barra de puntaje.
3. **Curva perceptual de gamma de medios tonos y salvaguarda de FSR en pantalla dividida 2J (Subagente 3 · `src/render.ts`, `src/menu.ts`):**
   - `applyGfx()` calibra tanto `midtonesExposure` como `midtonesDensity` en `imageProcessingConfiguration.colorCurves`, y `setSplit()` limpia cualquier instancia de `fsrP` / `fxaaLo` antes de adjuntar la segunda cámara.
4. **Pulsos deterministas del patio y sobrepresión de aspersores (Subagente 4 · `src/main.ts`, `src/world.ts`):**
   - En los segundos `225` y `345` de la partida (`YARD_PULSES`), `update()` lanza una ráfaga de sobrepresión de 10 s (`zoneTick(dt, c.pos, yardPulseT > 0)`) con aviso de radio/banner sin consumir llamadas extra a `rng()`.

---

## 2026-10-09 · Ciclo #12 (Deltas Comparativos en Garaje, Transición `NV X → NV Y` en Cartas, Insignia Mini-Turbo en Carrera y Sello de Taller en Polaroid)

**Capturas verificadas:** `.shots/actual/pc-menu-garaje.png`, `.shots/actual/cel-menu-garaje.png`, `.shots/actual/pc-partida-cartas.png`, `.shots/actual/pc-partida-resultados.png`, `.shots/actual/cel-partida-resultados.png`, `.shots/actual/pc-carrera-curso.png` (`npm run shots -- --only garaje,partida,carrera`, 17 capturas en PC y celular sin errores).

### Intervenciones aplicadas por 4 subagentes en paralelo y verificadas en captura
1. **Deltas comparativos en Garaje y estado de pintura activa (Subagente 1 · `src/menu.ts`, `src/menu.css`):**
   - Cada tarjeta `.carc` en `#scr-garage` compara `Carrocería`, `Velocidad` y `Embestida` contra el auto equipado (`CARS[save.car]`) con deltas `.cdlt.up` (`#22c55e`) y `.cdlt.dn` (`#f59e0b`), muestra `<div class="price">EN USO</div>` / `EN EL GARAJE` en vehículos propios y detalla `${PZ[pz]} · Personalizado / De fábrica` en la cabecera `.hsvt` de `Pintura`.
2. **Transición explícita de nivel (`NUEVA` / `NV X → NV Y`) y pip `.next` en Cartas de Mejora (Subagente 2 · `src/ui.ts`, `src/hud.css`):**
   - `kindLabel()` en `#cards` indica `Arma · NUEVA`, `Pieza · NUEVA` o `NV X → NV Y` (más `· ¡EVO LISTA!` o `· MÁX` en nivel 5), ilumina en dorado el pip `.next` que se encenderá al elegir la carta y enmarca la tarjeta con `.evo-rdy` cuando completa la pareja de evolución.
3. **Insignia reactiva de derrape/mini-turbo y destello de última vuelta en Carrera (Subagente 3 · `src/kart.ts`, `src/race.css`):**
   - `.rspd` incorpora la pastilla `.rturbo` (`DERRAPE`, `TURBO 1` en azul `#4aa8ff`, `TURBO 2` / `TURBO` en naranja `#ff9d2e`) junto a los `km/h`, y `.rlap` se ilumina con `.final` en dorado durante la última vuelta.
4. **Sello gráfico de inspección de taller en la Polaroid de fin de partida (Subagente 4 · `src/replay.ts`, `src/replay.css`):**
   - `showPhoto()` estampa en el margen inferior derecho del papel Polaroid un sello inclinado de doble trazo (`INSPECCIÓN · VICTORIA` en verde taller `#1f6f3a` o `CHASIS SINIESTRADO` en rojo óxido `#9a2c2c`) sin usar `Math.random()`.

---

## 2026-10-09 · Ciclo #13 (Barra de Jefe con `beastIcon` y `FASE 2`, Resumen de Zonas y Contadores en Chatarroteca, Alerta `¡MISIL!` y Récord en Carrera, y `CADENA ×N` / Nodos 3★ en Junket Crush)

**Capturas verificadas:** `.shots/actual/pc-menu-jugar.png`, `.shots/actual/cel-menu-jugar.png`, `.shots/actual/pc-menu-bestiario.png`, `.shots/actual/pc-lab-jefes.png`, `.shots/actual/pc-carrera-podio.png`, `.shots/actual/pc-match3-mapa.png`, `.shots/actual/pc-match3-combo.png` (`npm run shots -- --only jugar,bestiario,carrera,match3,lab`, 47 capturas en PC y celular sin errores).

### Intervenciones aplicadas por 4 subagentes en paralelo y verificadas en captura
1. **Silueta SVG `beastIcon`, porcentaje en vivo e insignia `FASE 2` en `#bossbar` (Subagente 1 · `src/ui.ts`, `src/hud.css`, `src/main.ts`):**
   - `hudBoss()` renderiza la silueta SVG `beastIcon(kind, 20)` junto al nombre del jefe, el porcentaje entero `.b-pct` (`100%`) y la insignia `.b-rage` (`FASE 2`) con degradado incandescente cuando `boss.enraged` está activo (`pc-lab-jefes.png`).
2. **Resumen comparativo de las 3 zonas en `#scr-play` y contadores `(X/Y)` en Chatarroteca (Subagente 2 · `src/menu.ts`, `src/menu.css`):**
   - `#playRec` incorpora la grilla `.zoneRow` con chips `.zchip` para `Patio`, `Garaje` y `Jardín` mostrando el mejor tiempo, estado de bloqueo y estrella de zona conquistada (`★`), y `#btabs` en Chatarroteca muestra `BICHOS (X/13)`, `PILOTOS (X/5)` y `LOGROS (X/19)` (`pc-menu-jugar.png`, `cel-menu-jugar.png`, `pc-menu-bestiario.png`).
3. **Alerta táctica `¡MISIL!` en `.rspd` y diferencial contra récord previo en el podio (Subagente 3 · `src/kart.ts`, `src/race.css`):**
   - `.rspd` muestra la pastilla roja `.rwarn` (`¡MISIL!`) cuando un proyectil teledirigido apunta al jugador, y `#rinfo` en el podio resalta en verde `.rbest` (`¡NUEVO RÉCORD! (-X.XX s)`) o `.rdiff` (`+X.XX s vs récord`) (`pc-carrera-podio.png`).
4. **Insignia `CADENA ×N` en el cabezal y anillo dorado para niveles de 3 estrellas en Junket Crush (Subagente 4 · `src/match3.ts`, `src/match3_draw.ts`):**
   - `paintDisplay()` dibuja la cápsula ámbar `CADENA ×N` junto a `NV X/10` durante reacciones en cadena, y `drawNode()` enmarca con anillo exterior dorado los niveles completados con 3 estrellas en el mapa.

---

## 2026-10-09 · Ciclo #14 (Garaje Unificado en `Piloto`/`Habilidad`/`Arma`, Distancia `Xm` en `#arrows`, Telemetría `#rtab` en Carrera y Metas de Estrellas en Junket Crush)

**Capturas verificadas:** `.shots/actual/pc-menu-garaje.png`, `.shots/actual/cel-menu-garaje.png`, `.shots/actual/pc-partida-curso.png`, `.shots/actual/pc-carrera-curso.png`, `.shots/actual/pc-match3-objetivos.png`, `.shots/actual/pc-match3-victoria.png`, `.shots/actual/cel-match3-victoria.png` (`npm run shots -- --only garaje,partida,carrera,match3`, 33 capturas en PC y celular sin errores).

### Intervenciones aplicadas por 4 subagentes en paralelo y verificadas en captura
1. **Unificación de `Piloto`, `Habilidad` y `Arma` en el Garaje (Subagente 1 · `src/menu.ts`, `src/menu.css`):**
   - En `renderGarage()`, la pestaña `Piloto` muestra la franja `.wsyn` con el arma inicial de serie e ícono SVG, `Habilidad` incorpora el ícono SVG `ABIL_ICON` inline en el título, y las 3 pestañas muestran el pie `<div class="price">EN USO / EN EL GARAJE / DISPONIBLE</div>` en elementos desbloqueados.
2. **Distancia en metros (`Xm`) en flechas de borde fuera de pantalla `#arrows` (Subagente 2 · `src/ui.ts`, `src/hud.css`, `src/main.ts`):**
   - `updateHud()` calcula la distancia horizontal en metros hacia cada jefe o cofre fuera de pantalla y `hudArrows()` renderiza `<small class="adist">${a.dist}m</small>` debajo del glifo direccional.
3. **Telemetría en vivo en la tabla de posiciones `#rtab` de Carrera y Batalla (Subagente 3 · `src/kart.ts`, `src/race.css`):**
   - Cada fila de `#rtab` muestra a la derecha (`<small class="rt-st">`) los globos restantes (`●●●` / `FUERA`) en Batalla o el estado activo (`META` / `ESCUDO` / `TURBO`) en Carrera con memoización DOM (`dataset.h`).
4. **Umbrales de puntaje (`★ / ★★ / ★★★`) en el inicio de nivel y puntos faltantes en Victoria de Junket Crush (Subagente 4 · `src/match3.ts`, `src/match3.css`):**
   - `showIntro()` detalla `Metas: ★ X · ★★ Y · ★★★ Z` (`pc-match3-objetivos.png`) y `showWin()` informa `Siguiente estrella (N★): X pts (faltaron Y)` o `¡Nivel perfeccionado con 3 estrellas!` (`pc-match3-victoria.png`, `cel-match3-victoria.png`).

---

## 2026-10-09 · Ciclo #15 (Identidad de Build en Pausa/Resultados, Placas de Telemetría en `#combo`/`#drv`, Tarjeta `.rbox` en Pausa de Carrera y Contexto en Pausa/Derrota de Junket Crush)

**Capturas verificadas:** `.shots/actual/pc-partida-pausa.png`, `.shots/actual/pc-partida-resultados.png`, `.shots/actual/pc-match3-pausa.png`, `.shots/actual/pc-match3-derrota.png`, `.shots/actual/cel-match3-pausa.png` (`npm run shots -- --only partida,carrera,match3`, 31 capturas en PC y celular sin errores).

### Intervenciones aplicadas por 4 subagentes en paralelo y verificadas en captura
1. **Identidad completa de la build en Pausa (`#scr-pause`) y Resultados (`#scr-over`) de Supervivencia (Subagente 1 · `src/menu.ts`):**
   - `openPause()` y `openOver()` anteponen `Auto · Piloto · Habilidad · Zona` al pie de telemetría (`#pauseSeed` y `#overSeed`), permitiendo identificar de un vistazo con qué combinación se logró una partida al pausar o compartir captura (`pc-partida-pausa.png`, `pc-partida-resultados.png`).
2. **Placas oscuras de telemetría en Racha (`#combo`) y Manejo (`#drv`) con etiqueta explícita `XP ×N` (Subagente 2 · `src/ui.ts`, `src/hud.css`):**
   - `#combo` y `#drv` se enmarcan sobre placa oscura translúcida (`rgba(11, 15, 20, .74)`) con borde izquierdo de estado (`#7dffb0` / `#ffc24d` / `var(--sig)`), garantizando contraste sobre cualquier terreno del patio, y `hudDrive()` explicita `XP ×N` (`pc-partida-pausa.png`).
3. **Tarjeta de chapa oscura `.rbox` con telemetría del circuito en la pausa de Carrera (`#rpause`) (Subagente 3 · `src/kart.ts`, `src/race.css`):**
   - `#rpause` envuelve su contenido en `.rbox` y actualiza `.rsub` en vivo al pausar con el circuito actual, modalidad (`Copa (X/3)`, `Carrera` o `Batalla de globos`), cilindrada (`100cc/150cc/200cc`) y vuelta o tiempo restante.
4. **Nivel, puntaje y movimientos en `#m3-pause` y puntaje alcanzado en `showLose()` de Junket Crush (Subagente 4 · `src/match3.ts`):**
   - Al pausar en el gabinete, `#m3-pause` muestra `PAUSA · NV X` y `<Nombre> · Puntaje: X · Movimientos: Y` (`pc-match3-pausa.png`), y al quedarse sin movimientos `showLose()` informa `Puntaje alcanzado: X pts · Récord: Y pts` (`pc-match3-derrota.png`).

---

## 2026-10-09 · Ciclo #16 (Transición Numérica en Tarjetas del Taller y `Comprables (N)`, Estado `.endless` y Velocidad Punta `.top`, Colores de Podio en Carrera y Telemetría en Cabezal del Mapa de Junket Crush)

**Capturas verificadas:** `.shots/actual/pc-menu-taller.png`, `.shots/actual/cel-menu-taller.png`, `.shots/actual/pc-carrera-curso.png`, `.shots/actual/pc-match3-mapa.png`, `.shots/actual/cel-match3-mapa.png` (`npm run shots -- --only taller,partida,carrera,match3`, 55 capturas en PC y celular sin errores).

### Intervenciones aplicadas por 4 subagentes en paralelo y verificadas en captura
1. **Transición numérica visible en cada tarjeta `.carc.perk` del Taller y contador `Comprables ahora (N)` (Subagente 1 · `src/menu.ts`, `src/menu.css`):**
   - Cada tarjeta del Taller renderiza `<span class="sfx">${i.fx}</span>` en oro cálido (`#ffd24a`) mostrando el delta exacto (ej. `Vida 150 → 160`, `Daño 100% → 110%`, `Imán 100% → 110%`) sin obligar a enfocar una por una, y el botón de filtro muestra `COMPRABLES AHORA (N)` con la cantidad exacta al alcance (`pc-menu-taller.png`, `cel-menu-taller.png`).
2. **Estado `.endless` en el cronómetro y destello de velocidad punta `.top` en `#spd` / `#txr` (Subagente 2 · `src/ui.ts`, `src/hud.css`):**
   - Al alcanzar 10:00 (`d.time >= 600`), `#lcd` / `#clock` activa `.endless` con resplandor dorado, y al acelerar al 90%+ de la velocidad máxima (`s >= 0.9`), `#txr` / `#spd` activa `.top` tiñendo el arco del velocímetro y los `km/h` en ámbar cálido.
3. **Jerarquía cromática de podio en `.rpos` y caja de objeto armada `.ritem.full` en Carrera (Subagente 3 · `src/kart.ts`, `src/race.css`):**
   - `.rpos` colorea el número de puesto según podio (`1º` oro `#ffd84d`, `2º` plata `#d8e2ef`, `3º` bronce `#e09145`, `4º+` blanco `#f4f7fa`) con `data-pl`, y `.ritem` activa `.full` con borde ámbar resplandeciente cuando el corredor lleva un ítem armado (`pc-carrera-curso.png`).
4. **Telemetría en vivo del nivel seleccionado en el cabezal electrónico del mapa de Junket Crush (Subagente 4 · `src/match3.ts`):**
   - `paintDisplay()` cuando `mode === "map"` renderiza en el display digital superior el número de nivel en 7 segmentos (`NIVEL 01` / `JEFE · NV`), nombre en mayúsculas, movimientos permitidos, récord de puntos y las 3 estrellas del nodo seleccionado con `drawStar` (`pc-match3-mapa.png`, `cel-match3-mapa.png`).

---

## 2026-10-09 · Ciclo #17 (Insignia `COBRADO` y Rango Honorífico en Chatarroteca, Rosa Cardinal y Pulso de Cofre en Radar, Insignia `LÍDER` de Copa en Podio y `JEFE X%` en Junket Crush)

**Capturas verificadas:** `.shots/actual/pc-menu-bestiario.png`, `.shots/actual/pc-partida-curso.png`, `.shots/actual/pc-carrera-podio.png`, `.shots/actual/pc-match3-jefe.png`, `.shots/actual/cel-match3-jefe.png` (`npm run shots -- --only bestiario,partida,carrera,match3`, 33 capturas en PC y celular sin errores).

### Intervenciones aplicadas por 4 subagentes en paralelo y verificadas en captura
1. **Insignia `· COBRADO` en logros completados y rango honorífico de bajas en Chatarroteca (Subagente 1 · `src/menu.ts`, `src/menu.css`):**
   - En `renderBestiary()` (`btab === "logros"`), los logros desbloqueados añaden `<b class="ach-ok"> · COBRADO</b>` en verde `#22c55e` junto al premio, y `statsHtml()` incorpora el rango honorífico (`Aprendiz de Patio`, `Cazador de Plagas`, `Chatarrero Veterano`, `Leyenda del Patio`) en el encabezado de `Bajas por tipo`.
2. **Puntos cardinales (`N`, `E`, `S`, `O`) orientados en el radar y pulso `.has-chest` al detectar cofre (Subagente 2 · `src/ui.ts`, `src/hud.css`):**
   - `drawRadar()` dibuja las 4 marcas cardinales rotadas según `rCar.up` (`N` en oro `#ffd24a` y `E/S/O` en verde fósforo `#8dff6a`), y `hudRadar()` aplica `.has-chest` sobre `#radar` cuando hay un cofre activo en el campo (`pc-partida-curso.png`).
3. **Insignia `.cup-lead` (`LÍDER`) y encabezado `COPA (X/3)` en el podio de Carrera (Subagente 3 · `src/kart.ts`, `src/race.css`):**
   - `showResults()` destaca con `<b class="cup-lead">LÍDER</b>` al puntero de la tabla acumulada de la copa y titula las rondas intermedias como `<Circuito> · COPA (X/3)` (`pc-carrera-podio.png`).
4. **Indicador de blindaje restante del jefe (`JEFE X% · NV 10/10`) en el cabezal de Junket Crush (Subagente 4 · `src/match3.ts`):**
   - `paintDisplay()` calcula el porcentaje restante de los objetivos en niveles de jefe (`st.lv.boss`) y renderiza la cápsula superior derecha en rojo carmesí `M3C.error` como `JEFE 100% · NV 10/10` (`pc-match3-jefe.png`, `cel-match3-jefe.png`).

---

## 2026-10-09 · Ciclo #18 (Silueta e Insignia `REGISTRADO` en Visor 3D del Bestiario, Pips Dorados `.max` en `#slots`, Línea de Meta y Rumbo en `#rmap`, y Atajos `1–4` en `#m3-tools`)

**Capturas verificadas:** `.shots/actual/pc-menu-bestiario.png`, `.shots/actual/pc-partida-curso.png`, `.shots/actual/pc-carrera-curso.png`, `.shots/actual/pc-match3-jefe.png`, `.shots/actual/cel-match3-jefe.png` (`npm run shots -- --only bestiario,partida,carrera,match3`, 33 capturas en PC y celular sin errores).

### Intervenciones aplicadas por 4 subagentes en paralelo y verificadas en captura
1. **Silueta `beastIcon` e insignia `REGISTRADO (X bajas)` / `SIN REGISTROS` en el visor 3D del Bestiario (`#scr-beast`) (Subagente 1 · `src/menu.ts`, `src/menu.css`):**
   - `renderBeast()` incorpora en `.bname` la etiqueta `<em class="b-reg ${met ? "ok" : ""}">` con el conteo de bajas registradas (`REGISTRADO (X bajas)` en verde `#22c55e` o `SIN REGISTROS`) y la silueta `beastIcon(k, 24)` junto al nombre de la criatura.
2. **Pips dorados `.max` para armas y pasivas en nivel 5 dentro de `#slots` (Subagente 2 · `src/ui.ts`, `src/hud.css`):**
   - `hudSlots()` asigna la clase `.max` a las armas no evolucionadas en nivel 5 (`!w.evolved && w.lv >= 5`) y a las pasivas en nivel 5 (`p.lv >= 5`), iluminando sus 5 pips `.pips i.on` en dorado `#ffd24a`.
3. **Marca de línea de meta y vector de rumbo del jugador en el mini-mapa `#rmap` de Carrera (Subagente 3 · `src/kart.ts`):**
   - `hud()` traza en `#rmap` una barra transversal dorada sobre `trk.P[0]` indicando la línea de largada/meta y dibuja para el corredor humano (`r.human >= 0`) una aguja de rumbo hacia `fwdOf(r)` y borde oscuro de contraste (`pc-carrera-curso.png`).
4. **Insignias de atajo de teclado (`1–4`) en los botones de herramientas `#m3-tools` de Junket Crush (Subagente 4 · `src/match3.ts`, `src/match3.css`):**
   - `ensureUi()` incluye `<i class="m3-tkey">${i + 1}</i>` en la esquina superior izquierda de cada herramienta (`Martillo`, `Sierra`, `Imán`, `Llave`) en escritorio (`pc-match3-jefe.png`), ocultándose automáticamente en pantallas táctiles (`@media (pointer: coarse)`).

---

## 2026-10-09 · Ciclo #19 (Ficha Diaria con Semilla y Zona Conquistada, Alerta Batería `BAJA` y Daño `!`, Récord de Vuelta en Carrera y Placa `JEFE` en Mapa de Junket Crush)

**Capturas verificadas:** `.shots/actual/pc-menu-diario.png`, `.shots/actual/pc-menu-jugar.png`, `.shots/actual/pc-partida-curso.png`, `.shots/actual/pc-carrera-curso.png`, `.shots/actual/pc-match3-mapa.png` (`npm run shots -- --only jugar,diario,partida,carrera,match3`, 35 capturas en PC y celular sin errores).

### Intervenciones aplicadas por 4 subagentes en paralelo y verificadas en captura
1. **Franja `DESAFÍO DIARIO · FECHA · SEMILLA #` y resaltado `.win-rec` de zona conquistada (Subagente 1 · `src/menu.ts`, `src/menu.css`):**
   - `renderDaily()` antepone la franja `.briefRec` destacada con la fecha y código de semilla (`DESAFÍO DIARIO · 2026-10-09 · SEMILLA #3`) dentro de `#dailyBrief`, y actualiza `#dailyInfo` con el prefijo `Semilla #3 · Récord...` (`pc-menu-diario.png`).
   - `renderPlay()` aplica `.win-rec` en oro cálido `#ffd24a` al renglón de mejor marca en `#playRec` cuando la zona ya fue conquistada (`zr.t >= 600`) (`pc-menu-jugar.png`).
2. **Alerta `· BAJA` pulsante en `#volt` y sufijo `!` en números de daño crítico (Subagente 2 · `src/ui.ts`, `src/hud.css`):**
   - `hudUpdate()` muestra `${volt}V · BAJA` cuando la batería cae por debajo del 25% (`low`), con resplandor y animación `voltPulse` roja en `#txl.low #volt`.
   - `damageNumber()` añade el sufijo `!` (`${Math.round(v)}!`) en números de daño crítico flotantes.
3. **Cronómetro de vuelta cerrada (`fmt(lt)`) y sello `¡RÉCORD!` en `onLap()` de Carrera (Subagente 3 · `src/kart.ts`):**
   - `onLap()` calcula el tiempo de la vuelta recién completada (`lt = t - r.lapT`), actualiza `r.lapBest` y en el aviso central `say()` informa `${lapMsg} · ${fmt(lt)}${isBest ? " ¡RÉCORD!" : ""}` (y `¡Llegaste Nº! · ¡VUELTA RÉCORD!` en meta).
4. **Placa roja `"JEFE"` sobre los nodos de jefe en el mapa de campaña de Junket Crush (Subagente 4 · `src/match3_draw.ts`):**
   - `drawNode()` renderiza una placa compacta `"JEFE"` con fondo rojo carmesí `M3C.rojo` y tipografía técnica centrada en `y - r - 9` sobre las tuercas hexagonales de niveles de jefe (`lv.boss`) en la Ruta del Desguace (`pc-match3-mapa.png`).

---

## 2026-10-10 · Ciclo #20 (Anillos Activos en Probador de Mandos, Nitro Máximo `#boost.full`, Destello `.used` en Carrera y Multiplicador `(×N)` en Junket Crush)

**Capturas verificadas:** `.shots/actual/pc-menu-config.png`, `.shots/actual/pc-partida-curso.png`, `.shots/actual/pc-carrera-curso.png`, `.shots/actual/pc-match3-combo.png` (`npm run shots -- --only config,partida,carrera,match3`, 33 capturas en PC y celular sin errores).

### Intervenciones aplicadas por 4 subagentes en paralelo y verificadas en captura
1. **Iluminación reactiva `.active` en ámbar en el probador de mandos (Subagente 1 · `src/menu.ts`, `src/menu.css`):**
   - En `padTest()`, cuando el stick se deflecta más allá de la zona muerta (`m >= PAD.dead && m > 0.05`), se activa la clase `.active` en `.pt-st`, iluminando el anillo exterior `.pt-ring` y la lectura numérica `em` en ámbar cálido `#ffd24a` con resplandor sutil.
2. **Indicador de nitro al 100% (`#boost.full`) con resplandor cian brillante (Subagente 2 · `src/ui.ts`, `src/hud.css`):**
   - `hudUpdate()` aplica de forma memoizada la clase `.full` sobre `#boost` al alcanzar carga completa (`d.boost >= 100`), otorgando un halo cian eléctrico y degradado incandescente a la barra de impulso.
3. **Destello de confirmación de objeto usado `.used` en `.ritem` (Subagente 3 · `src/kart.ts`, `src/race.css`):**
   - `useItem()` dispara una animación flash instantánea `.used` (borde blanco puro y resplandor de 16 px) sobre la ranura del ítem durante 300 ms antes de limpiar la caja.
4. **Indicador de multiplicador de cascada `(×N)` en textos flotantes de Junket Crush (Subagente 4 · `src/match3.ts`):**
   - `beginStep()` incorpora ` (×${s.chain + 1})` en los números flotantes de ganancia cuando ocurre una reacción en cadena (`s.chain >= 1`), haciendo evidente la bonificación multiplicadora de cada cascada.

---

## 2026-10-10 · Ciclo #21 (Muestra de Color en Garaje, Reparación +35% en Cartas, Pastilla de Escudo en Carrera, Cajas de Chatarra Mejoradas, Críticos FX y Remaches Polaroid)

**Capturas verificadas:** `.shots/actual/pc-menu-garaje.png`, `.shots/actual/pc-partida-cartas.png`, `.shots/actual/pc-carrera-curso.png`, `.shots/actual/pc-match3-juego.png` (`npm run shots -- --only garaje,partida,carrera,match3`, 33 capturas en PC y celular sin errores).

### Intervenciones aplicadas por 6 subagentes en paralelo y verificadas en captura
1. **Pastilla de color sincronizada en la cabecera de Pintura del Garaje (Subagente 1 · `src/menu.ts`, `src/menu.css`):**
   - `renderPaint()` y `hsvBars()` integran un punto cromático circular `<i id="pzdot" class="sw-dot">` dentro del título `.hsvt` de la pieza seleccionada, reflejando en tiempo real el matiz y luminosidad aplicados en la personalización.
2. **Etiqueta explícita `Reparación · +35% vida` en cartas de curación (Subagente 2 · `src/ui.ts`, `src/hud.css`):**
   - `kindLabel()` etiqueta las cartas de salud como `Reparación · +35% vida` y `.offer.heal .kind` destaca el texto en verde esmeralda `#22c55e`, clarificando de un vistazo el beneficio táctico de curación.
3. **Pastilla cian `.rshield` (`ESCUDO Xs`) en el velocímetro de Carrera (Subagente 3 · `src/kart.ts`, `src/race.css`):**
   - `hud()` añade un distintivo cian brillante junto a la lectura de velocidad cuando el corredor humano cuenta con un escudo de protección activo (`h.shield > 0`), mostrando los segundos restantes de invulnerabilidad.
4. **Onda expansiva y virutas reforzadas al destruir cajas de chatarra en Junket Crush (Subagente 4 · `src/match3.ts`, `src/match3_draw.ts`):**
   - En `beginStep()`, el impacto final que destruye una caja de chatarra (`h.left <= 0`) proyecta 16 partículas de residuo y genera un anillo de choque naranja `rings`, haciendo contundente la demolición de obstáculos.
5. **Impactos críticos tridimensionales enriquecidos (Subagente 5 · `src/fx.ts`):**
   - `FX.hit(p, crit)` multiplica a 14 las partículas de destello cuando `crit = true`, combinando chispas doradas `#ffd24a` y anaranjadas `#ff4d00` con mayor velocidad y tamaño para una retroalimentación física más intensa.
6. **Remaches de fijación y botón de taller en el cierre Polaroid (Subagente 6 · `src/replay.ts`, `src/replay.css`):**
   - `showPhoto()` traza 4 remaches envejecidos de color latón en los vértices del marco exterior de la foto, y `.polaroid button` viste el botón de descarga con borde de chapa oxidada, tipografía técnica y elevación con sombra al posar el cursor.

---

## 2026-10-10 · Ciclo #22 (Tornillos con Miles, Bajas Tabulares, Marcha Atrás en Carrera, Alerta Últimos Movimientos, Chispas Skid y Sello Archivador Polaroid)

**Capturas verificadas:** `.shots/actual/pc-menu-garaje.png`, `.shots/actual/pc-partida-curso.png`, `.shots/actual/pc-carrera-curso.png`, `.shots/actual/pc-match3-juego.png` (`npm run shots -- --only garaje,partida,carrera,match3`, 33 capturas en PC y celular sin errores).

### Intervenciones aplicadas por 6 subagentes en paralelo y verificadas en captura
1. **Formato con miles en banco de Garaje y Taller, y tipografía tabular en opciones (Subagente 1 · `src/menu.ts`, `src/menu.css`):**
   - `renderShop()` y `renderGarage()` formatean el saldo de tornillos con separador de miles (`save.scrap.toLocaleString("es-ES")`), y `#opts .row output` adquiere tipografía tabular alineada `font-variant-numeric: tabular-nums` y peso 700 para evitar desplazamientos al variar deslizadores.
2. **Formateo de bajas con miles y estilo tabular en `#lcd .sub` (Subagente 2 · `src/ui.ts`, `src/hud.css`):**
   - `hudUpdate()` formatea el conteo de bajas cuando supera 9999 con `toLocaleString("es-ES")`, y `#lcd .sub` recibe `font-variant-numeric: tabular-nums` para que el ancho de la lectura permanezca perfectamente estable.
3. **Indicador de marcha atrás `.rrev` (`R`) en el velocímetro de Carrera (Subagente 3 · `src/kart.ts`, `src/race.css`):**
   - `hud()` añade una pastilla ámbar `.rrev` (`R`) cuando el auto retrocede (`h.fs < -0.5`), permitiendo confirmar al instante maniobras de reversa tras colisiones o trompos.
4. **Alerta visual y rotulación `¡ÚLTIMOS!` en movimientos críticos de Junket Crush (Subagente 4 · `src/match3.ts`):**
   - `paintDisplay()` despliega un recuadro de aviso rojo translúcido (`rgba(255,59,46,0.18)`) detrás del medidor de movimientos y conmuta la cabecera a `¡ÚLTIMOS!` cuando `movesLeft <= 3`, incrementando la tensión dramática en el tramo final del nivel.
5. **Chispas y fricción de derrape en `FX.skid` (Subagente 5 · `src/fx.ts`):**
   - Se añadió el método `skid(p, hard)` que emite polvo de fricción y ráfagas de 4 micro-chispas incandescentes doradas y anaranjadas en derrapes cerrados.
6. **Sello diegético de archivo en Polaroid (Subagente 6 · `src/replay.ts`):**
   - `showPhoto()` estampa un rótulo técnico `"ARCHIVADO · PATIO RC"` con rotación angular tenue en tono sepia sobre el pie del papel polaroid, enfatizando la memoria diegética de cada carrera o partida.

---

## 2026-10-10 · Ciclo #23 (Logros Avanzados "Casi Listo", Hito Nivel cada 10, Rebufo en Carrera, Halo 3 Estrellas Match-3, Polvo de Aterrizaje y Récord de Zona Polaroid)

**Capturas verificadas:** `.shots/actual/pc-menu-garaje.png`, `.shots/actual/pc-partida-curso.png`, `.shots/actual/pc-carrera-curso.png`, `.shots/actual/pc-match3-mapa.png` (`npm run shots -- --only garaje,partida,carrera,match3`, 33 capturas en PC y celular sin errores).

### Intervenciones aplicadas por 6 subagentes en paralelo y verificadas en captura
1. **Resaltado y sello "CASI LISTO" en logros con progreso avanzado (Subagente 1 · `src/menu.ts`, `src/menu.css`):**
   - En la Chatarroteca (`renderBestiary()`), se incorporó la función `isAchNear()` que evalúa si un logro no completado cuenta con un avance $\ge 70\%$ (supervivencia $\ge 420\text{ s}$ en los desafíos de 10 minutos o diario, o vehículo ya adquirido en el garaje para victorias específicas). Los logros en este estado adquieren el estilo `.ach-near` con borde dorado brillante `#ffd24a` y el sello diegético conmuta a `"CASI LISTO"`.
2. **Insignia dorada e iluminación especial por hito decenal en nivel del HUD (Subagente 2 · `src/ui.ts`, `src/hud.css`):**
   - `hudUpdate()` activa la clase conmutada `.milestone` sobre la pastilla `#lvl` cada 10 niveles (`level % 10 === 0 && level > 0`), tiñendo el indicador con un degradado incandescente ámbar-dorado y resplandor perimetral de hito.
3. **Mecánica de rebufo/succión aerodinámica y pastilla `.rslip` en Carrera (Subagente 3 · `src/kart.ts`, `src/race.css`):**
   - En `stepRacer()`, el corredor humano detecta a rivales directos que rueden por delante dentro de un cono de succión (distancia 2 a 11 unidades, desviación lateral $< 2.2$), acumulando hasta 1.5 s de succión aerodinámica. Al rebasar 0.6 s, la velocidad punta se incrementa un 15% (`top *= 1.15`) y el velocímetro enciende la pastilla amarilla `.rslip` (`REBUFO`).
4. **Halo radial resplandeciente en nodos con 3 estrellas en la Ruta del Desguace (Subagente 4 · `src/match3_draw.ts`):**
   - `drawNode()` proyecta un degradado radial dorado translúcido (`createRadialGradient`) de 12 px de radio exterior sobre las estaciones del mapa completadas con rendimiento perfecto (3 estrellas), diferenciando nítidamente el progreso maestro a lo largo de los hitos del desguace.
5. **Nubes de impacto y dispersión al tocar tierra en `FX.land` (Subagente 5 · `src/fx.ts`):**
   - Se sumó al pool de efectos tridimensionales la rutina `FX.land(p, hard)`, disparando partículas opacas de polvo de patio (`#cdbd9c`) de gran escala física y dispersión baja con amortiguación gravitatoria para enfatizar las caídas y aterrizajes tras rampas.
6. **Distintivo en oro "★ RÉCORD DE ZONA" en Polaroid de victoria (Subagente 6 · `src/replay.ts`):**
   - `showPhoto()` estampa a la derecha del pie de la instantánea Polaroid un distintivo tipográfico en oro `#ffd24a` (`"★ RÉCORD DE ZONA"`) en partidas culminadas con victoria, complementando el sello de inspección y archivado.

---

## 2026-10-10 · Ciclo #24 (Victorias por Auto en Garaje, Blindaje Activo en Batería LiPo, Alerta de Proximidad en Carrera, Resplandor en Fichas Especiales, Sobrecarga Eléctrica 3D y Anotación Técnica Polaroid)

**Capturas verificadas:** `.shots/actual/pc-menu-garaje.png`, `.shots/actual/pc-partida-curso.png`, `.shots/actual/pc-carrera-curso.png`, `.shots/actual/pc-match3-juego.png` (`npm run shots -- --only garaje,partida,carrera,match3`, 33 capturas en PC y celular sin errores).

### Intervenciones aplicadas por 6 subagentes en paralelo y verificadas en captura
1. **Pastilla de victoria registrada o pendiente por auto en el Garaje (Subagente 1 · `src/menu.ts`, `src/menu.css`):**
   - En `renderGarage()`, se evalúa si el jugador posee el vehículo y ha obtenido la victoria asociada (`save.ach.includes("gana_" + k)`). Los autos con victoria despliegan la insignia técnica áurea `<span class="car-vic won">★ VICTORIA REGISTRADA</span>`, mientras que los modelos en propiedad aún no coronados muestran `<span class="car-vic pending">PENDIENTE DE VICTORIA</span>`, incentivando la maestría de toda la flota.
2. **Resplandor cian de blindaje activo en celdas LiPo de salud (Subagente 2 · `src/ui.ts`, `src/hud.css`):**
   - En `hudUpdate()`, se añadió soporte para la propiedad `shield?: boolean` y la clase reactiva `#lipo.shielded`, que proyecta un halo perimetral cian eléctrico `rgba(0, 188, 212, .6)` y refuerza el contorno de cada celda de batería con resplandor drop-shadow.
3. **Pastilla parpadeante de peligro cercano `.rthreat` en Carrera (Subagente 3 · `src/kart.ts`, `src/race.css`):**
   - En `hud()` de carrera, cuando un rival rueda a menos de 3.5 metros sin misil activo en curso, el velocímetro enciende la pastilla naranja parpadeante `<b class="rthreat">¡CERCA!</b>` con animación `r-blink`, proporcionando advertencia sensorial para anticipar roces o adelantamientos cerrados.
4. **Corona y resplandor radial expansivo en piezas especiales de Junket Crush (Subagente 4 · `src/match3_draw.ts`):**
   - En `drawPiece()`, el aura de piezas especiales (sierras, bombas, prensas) se potenció con un gradiente radial `createRadialGradient` pulsante (`r * 0.8` a `r * 1.35`) que difumina la energía luminosa hacia el tablero, haciéndolas resaltar con volumen vibrante.
5. **Efecto de descarga eléctrica tridimensional en `FX.shock` (Subagente 5 · `src/fx.ts`):**
   - Se añadió el método `FX.shock(p)` al pool de partículas 3D, emitiendo 8 micro-arcos de alta velocidad con gradiente cian `#5be7ff` y violeta `#a855f7` con baja sustentación gravitatoria para efectos tesla, arcos voltaicos y trampas electrificadas.
6. **Anotación técnica de escenario en el pie de la foto Polaroid (Subagente 6 · `src/replay.ts`):**
   - En `showPhoto()`, se incorporó una línea técnica en tipografía Rajdhani 600 y tono sepia `rgba(77, 76, 56, 0.7)` (`REGISTRO TÉCNICO · ESCENARIO: ${i.zone.toUpperCase()}`) en el pie del documento polaroid, completando el registro diegético de cada sesión archivada.
