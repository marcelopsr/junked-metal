# Registro de referencias visuales (fuente de verdad visual)

Cada imagen que manda el usuario es una **directiva de diseño vinculante**. Se guarda en `assets-src/ref-rcrace/`, se mide con `scripts/ref_measure.py` y se registra acá. Las imágenes las genera ChatGPT, así que pueden diferir entre sí: manda el conjunto, no un detalle aislado. El inventario de piezas (66 elementos, qué existe y qué falta) sigue en `assets-src/ref-rcrace/assets_manifest.json`; la dirección de arte escrita, en `docs/ART_DIRECTION.md` (sección Vigente).

## Cómo registrar una imagen nueva

1. Guardarla como `assets-src/ref-rcrace/refN.png` (sin duplicados: comparar contra las existentes).
2. `.venv-ref/bin/python scripts/ref_measure.py assets-src/ref-rcrace/refN.png` (con `--crop x0,y0,x1,y1` si es una lámina con paneles: medir solo el render).
3. Agregar una fila a la tabla de abajo (categoría, qué muestra y los números) y, si trae una pieza nueva, una línea en `referencias_extra` del manifiesto.

## Objetivos medidos (lo que el juego tiene que alcanzar)

**Para la cámara de partida mandan las escenas `ref23`, `ref25`, `ref28`, `ref31`, `ref33`, `ref66`, `ref69` y `ref70`** (misma cámara elevada en 3/4 con el auto chico): contraste **0,19-0,23**, luminancia 0,36-0,43, saturación 0,46-0,65, nitidez alta en casi todo el cuadro. Composición común: **cinta ancha de tierra rojiza** (#B5603A) que domina el suelo, bordeada por bloques rojo/blanco y pilas de neumáticos; pasto solo en islas con flores dentro de las curvas; props densos y de fondo alto (galpón, cerca, árboles, edificios). La tabla de abajo (láminas y planos héroe) vale para menús, foto y cierre.

Promedio de los renders de referencia. «Juego» es la última medición de la misma métrica (2026-10-14, patio ENCORE, cámara de juego, sin HUD).

| Métrica | Referencias | Juego | Qué la mueve en el motor |
|---|---|---|---|
| Contraste (desvío de luminancia) | **0,25-0,28** | 0,11 | luces altas + sombras oscuras: sol vs ambiente, `shadows.darkness`, `contrast` |
| Luces (15 % más brillante) | **#E4C4A2-#F1D49C** (crema) | #93863E | exposición, sol, bloom: hoy no hay luces altas |
| Sombras (15 % más oscuro) | **#1A0B07-#2B0C05**, R/B 2,6-7 (marrón cálido) | #422E13 | `ColorCurves` sombras cálidas, `hemi.groundColor` |
| Medios | **#824E37-#98583F** (ámbar) | #605721 (oliva) | tono del pasto/tierra, curvas de medios |
| Saturación media | 0,56-0,61 | 0,69 | ya alcanzada (no subir más) |
| Nitidez por zona | franja central nítida, bordes arriba **y** abajo borrosos (tilt-shift) | pareja | post-proceso de desenfoque por altura de pantalla |
| Sol | en cuadro o al costado (contraluz) | detrás | dirección del sol del clima |

## Referencias

| Archivo | Categoría | Qué muestra | Medición (lum · contraste · sat · sombras / medios / luces · sol) |
|---|---|---|---|
| `lamina1.png` | Biblia de arte (paneles) | Héroe buggy rojo «27» en pista de tierra; 6 autos, partes modulares, skins, 8 biomas, piezas de pista Lego, props, materiales, kits | render 0,0-790,410: 0,39 · 0,25 · 0,57 · #1A0B07 / #8E5236 / #E4C4A2 · (32 %, 53 %) |
| `lamina2.png` | Biblia de arte (paneles) | Héroe buggy de frente; paleta, estilo (diorama, voxel suave, texturas pintadas, luz cinematográfica, DOF), desglose Lego, materiales, construcción de escenarios, UI/HUD, VFX | render 360,0-1290,390: 0,43 · 0,27 · 0,56 · #1E0D0B / #98583F / #DBD8D5 · (58 %, 34 %) |
| `lamina3.png` | Biblia de arte (paneles) | Héroe «RC Racers»; paleta oficial (rojo #E53935, amarillo #FBC02D, azul #42A5F5, verde #66BB6A; naranja #FB8C00, morado #8E24AA, marrón #795548, gris #9E9E9E), Bebas Neue + Inter, iconografía, 7 mundos, mapas PBR | render 0,0-670,350: 0,45 · 0,28 · 0,40 · #191312 / #8C6044 / #E7E4E0 · (18 %, 28 %) |
| `ref8.png` | Iluminación interior + set de taller | Taller de madera cálida, buggy amarillo sobre caballete rojo, banco con herramientas, neumáticos, carro rojo, portón abierto a la pista (torre de agua, banderines, bordillos). Luz dorada lateral desde el portón, DOF fuerte | 0,39 · 0,25 · 0,59 · #2B0C05 / #824E37 / #EED2AF · (74 %, 27 %) |
| `ref9.png` | Iluminación exterior + set de pista | Buggy amarillo con jaula en tierra con piedritas 3D, bordillos en bloques, rampa de madera, tambor azul, cono, matas y flores, cabaña. Contraluz de atardecer, bokeh, tilt-shift (arriba y abajo borrosos) | 0,44 · 0,25 · 0,61 · #271209 / #95663A / #F1D49C · (21 %, 30 %) |
| `ref10.png` | Pieza de pista | Rampa de salto de madera curva: 6-8 tablones en dos tonos, costillas, caballete triangular, bulones oscuros | (pieza aislada: no se mide la luz) |
| `ref11.png` | Pieza de pista | Cono naranja con 2 franjas blancas reflectivas, boca abierta, base cuadrada negra; polvo en la base | (pieza aislada) |
| `ref14.png` (+ recortes `ref14_*.png`) | Hoja de materiales PBR | 6 muestras: pintura amarilla saltada en bordes (gris debajo), tubo de jaula negro con soldaduras y polvo, neumático de tacos con barro seco en las ranuras, llanta negra de 5 rayos con desgaste plateado, resorte rojo brillante con pintura saltada, tierra roja con piedras angulosas | tierra: 0,35 · 0,14 · 0,74 · #3F1A0A / #954D27 / #D2814B; neumático: 0,21 · 0,14 · 0,26 · #0C0A07 / #362F2A / #866E5C |
| `ref15.png` | Textura continua (cartón) | Cartón corrugado kraft con rasgaduras que dejan ver la onda. Uso directo: `public/textures/carton.webp` (512) para cajas y escenarios de cartón | 0,60 · 0,09 · 0,47 · #966C44 / #BF9364 / #D8B385 |
| `ref16.png` | Textura continua (chapa) | Chapa antideslizante de rombos, gris con óxido en los bordes. Uso directo: `public/textures/chapa-antideslizante.webp` (512) para piso del galpón, rampas metálicas y plataformas | (textura) |
| `ref17.png` | Desglose del auto (vista explotada) | Buggy amarillo: carrocería de paneles con pintura saltada y franjas negras, alerón con soportes, jaula tubular negra con motor, 4 ruedas de tacos con barro y **aro amarillo** + llanta negra de 6 rayos, 4 amortiguadores con resorte rojo, paragolpes con agujeros, antena con bola roja | (pieza aislada) |
| `ref18.png` | Kit de pista modular (Lego) | Baldosas de tierra con marco de madera y **encastre gris tipo puzzle**: recta, curva suave, curva 90°, rampa de tablones, lomo de tierra, plataforma de madera; módulos de borde: neumáticos de colores apilados, barrera rojo/blanco en bloques, tambor + cono | (piezas) |
| `ref19.png` | Kit de pista elevada | Rampa elevada con baranda de chapa, curva peraltada sobre caballetes, cruce en X con bordillos rojo/blanco, puente sobre pista, loop de madera y metal, bifurcación en Y; tierra rojiza `#B5603A` | (piezas) |
| `ref20.png` | Kit de props de entorno | Neumáticos apilados (negros y rojos), conos, tambor oxidado, palets, caja de herramientas roja, cajón de madera, cerco de alambre, señal amarilla/negra, macetas de lata con plantas secas, rocas, arco de largada a cuadros, gradas de madera | (piezas) |
| `ref21.png` | Pieza | Barrera metálica roja/blanca con patas en escuadra y bulones | (pieza) |
| `ref22.png` | Pieza | Palet de madera gastada con clavos | (pieza) |
| `ref23.png` | **Escena con cámara de partida: patio** | Circuito de tierra rojiza en un patio con cerca de madera y galpón; bordillos rojo/blanco en bloques, pilas de neumáticos, conos, rampa y puente de madera, arco de largada a cuadros, islas de pasto con flores, rocas, mesa con herramientas en primer plano; luz dorada lateral | 0,37 · **0,20** · 0,61 · #2A160A / #755031 / #E9A966 · (39 %, 51 %) |
| `ref24.png` | Pieza | Caja de herramientas roja con esquineros metálicos y traba | (pieza) |
| `ref25.png` | **Escena con cámara de partida: garaje** | Pista dentro de un garaje: tramos de madera elevados sobre caballetes + tramos de tierra, bordillos rojo/blanco continuos, neumáticos, estanterías con cajas, banco con herramientas, portón abierto con luz | 0,36 · **0,23** · 0,52 · #1C0D08 / #7B4F39 / #E2BB96 · (17 %, 22 %) |
| `ref26.png` | Pieza | Banco de carpintero de madera con morsa | (pieza) |
| `ref27.png` | Pieza | Estantería metálica de 3 estantes con óxido | (pieza) |
| `ref28.png` (`ref28a`/`b`) | **Escenas con cámara de partida: bosque e industrial** | a) Bosque: camino de tierra, arroyo con rocas y cascadita, puente de madera, helechos, troncos, neumáticos. b) Industrial: contenedores, cajones, túnel de caño de hormigón en un lomo, rampa con franjas amarillas/negras, tambores, cerco de alambre, piso de hormigón + tierra | a: 0,39 · 0,22 · 0,57 · #21170A / #6F5631 / #EBC681; b: 0,41 · 0,20 · 0,50 · #2E1C10 / #885F43 / #DBB088 |
| `ref29.png` | Pieza | Llave inglesa naranja gastada | (pieza) |
| `ref30.png` | Pieza | Destornillador de mango rojo | (pieza) |
| `ref31.png` (`ref31a`/`b`) | **Escenas con cámara de partida: ciudad y desierto** | a) Ciudad: plaza de adoquines con fuente, casas con toldos, faroles, rampa, conos, bordillos y neumáticos. b) Desierto: cañón rojo con arco de piedra, puente de madera sobre el cauce seco, cactus, cerco de madera, camino de tierra con curvas | a: 0,40 · 0,19 · 0,46 · #2E1D0F / #7D5E47 / #DBB185; b: 0,43 · 0,20 · 0,65 · #4A220E / #945C3A / #F6B071 |
| `ref32.png` | Pieza | Taladro rojo y negro | (pieza) |
| `ref33.png` (`ref33a`/`b`) | **Escenas con cámara de partida: nieve y neón** | a) Nieve: aldea de cabañas con luces, pinos nevados, salto de nieve, bordillos, cerco, atardecer rosado. b) Neón: asfalto mojado con reflejos magenta/cian, chevrons de neón, neumáticos en hilera, edificios con ventanas, skyline | a: 0,53 · 0,25 · 0,29 · #311B17 / #938496 / #F3DAC4; b: 0,26 · 0,18 · 0,46 · #140B14 / #473350 / #AC90AE |
| `ref34.png` | Pieza | Maceta de terracota gastada con olivo | (pieza) |
| `ref35.png` | Pieza | Manguera verde enrollada con acople de bronce | (pieza) |
| `ref36.png` | Kit de bioma: ciudad | Baldosas de adoquín oscuro con línea blanca y cordón de piedra con franjas rojo/blanco (recta, curva), casa con techo de tejas, toldo rayado y balcones con flores, farol con maceta colgante, fuente octogonal, banco con canteros | (piezas) |
| `ref37.png` | Kit de bioma: garaje | Pista de madera oscura con borde de bloques rojo/blanco (recta, curva elevada sobre patas), rampa de chapa antideslizante con caballete rojo, carro de herramientas rojo con ruedas, banco con tablero perforado y herramientas, neumáticos de tacos apilados | (piezas) |
| `ref38.png` | Kit de bioma: bosque | Camino de tierra con bordes de rocas con musgo, helechos y pinos (recta, curva S), puente de troncos sobre arroyo, grupo de rocas, tronco caído con estacas, claro con tocón y helechos | (piezas) |
| `ref39.png` | Kit de bioma: patio | Camino de tierra rojiza con borde de tablones y pasto (recta), curva bordeada de neumáticos pintados de colores, rampa de palets, cerca de madera despintada con enredadera, girasoles en maceta y balde, cobertizo rojo con techo de chapa y regadera | (piezas) |
| `ref40.png` | Kit de bioma: desierto | Baldosas de arena con bordes de roca roja en bloques (recta, curva peraltada), puente sobre cauce seco, arco de roca en estratos, grupo de cactus (saguaro, barril con flor), cerco de madera | (piezas) |
| `ref41.png` | Kit de bioma: industrial | Losas de hormigón con tierra y cordón amarillo/negro (recta, curva), túnel de chapa ondulada oxidada, contenedores y cajones, tambores y bloques de hormigón, valla amarilla/negra sobre bases de hormigón | (piezas) |
| `ref42.png` | Piezas del auto: amortiguadores | 6 pares: rojo, azul con cuerpo plateado, naranja, negro con aro rojo, brazo en A azul, amarillo; resorte negro, ojales de bronce, pintura saltada | (piezas) |
| `ref43.png` | Piezas del auto: luces | Faros redondos con reja (ámbar), barra de 4 faros, barra de 3 con reja, faros cian, antenas con punta roja, barra trasera roja/ámbar; soportes de metal oscuro gastado | (piezas) |
| `ref44.png` | Piezas del auto: paragolpes | Tubulares con chapa perforada, de 2 barras, cubrecárter de chapa con calados, jaula delantera, splitter de carbono, paragolpes macizo | (piezas) |
| `ref45.png` | Piezas del auto: alerones | Amarillo con placas caladas, blanco con franjas naranja/negra, carbono con placas naranja, morado con 4 faros, cian con placas amarillas, chato de chapa; soportes de metal con eslabones | (piezas) |
| `ref46.png` | Carrocerías (6) | Superdeportivo amarillo a damero, pickup azul/amarillo, rally blanco con franjas verde/roja, pickup morada con naranja, deportivo naranja con capó negro, auto redondo cian con franja amarilla; todas con barro y pintura saltada, pasos de rueda negros | (piezas) |
| `ref47.png` | Chasis (6) | Jaula tubular con amortiguadores rojos, escalera con azules, plano con placa blanca/roja y dorados, crawler con verdes, plano con morados, tina blanca/naranja | (piezas) |
| `ref48.png` | Llantas (6) | Beadlock amarilla con aro de bulones, 5 rayos oscura, 12 rayos blanca, 5 rayos naranja, 5 rayos crema, de agujeros azul; pintura saltada en el borde | (piezas) |
| `ref49.png` | Neumáticos (6) | Tacos con barro rojizo, tacos finos, de tractor, slick, de nieve, de lluvia con surcos | (piezas) |
| `ref51.png` | Kit de bioma: nieve | Hielo con bordes de roca nevada (recta, curva, rampa), cabaña con ventanas encendidas y carámbanos, pinos nevados, valla roja/blanca nevada | (piezas) |
| `ref52.png` | Kit de bioma: neón | Asfalto mojado con bordes de neón cian/magenta (recta, curva, rampa), neumáticos con neón, local de ladrillo con carteles, flecha de neón | (piezas) |
| `ref53.png` | Hoja de texturas (10) | Tierra roja con piedras, asfalto con grava, hormigón agrietado, madera gastada, chapa azul oxidada con remaches, goma de tacos con barro, plástico amarillo rayado, nieve granulada, roca con musgo, asfalto mojado con reflejos neón | (texturas) |
| `ref54.png` | Kit de pista de asfalto sobre madera | Baldosas de asfalto con línea blanca y encastre de chapa (recta, cruce), transición asfalto→tierra, rampa de tablones, pilar de altura, tramo con baranda | (piezas) |
| `ref55.png` / `ref56.png` | Auto héroe + despiece: pickup | Pickup azul con caja amarilla, ruedas de tacos con barro, paragolpes tubular con chapa perforada; despiece: cabina, caja, paragolpes, chasis escalera, 4 amortiguadores, antena con punta roja | ref55: escena de pista de tierra a ras del suelo, hora dorada |
| `ref57.png` / `ref59.png` | Auto héroe + despiece: monster | Monster morado/naranja con jaula, barra de 4 faros, amortiguadores naranjas, llantas beadlock naranjas, neumáticos enormes con barro | ref57: escena de patio con cerca, girasoles, banderines, rampa |
| `ref58.png` | Auto héroe: rally | Rally blanco con franjas verde/roja, 4 faros redondos, llantas blancas de 8 rayos, barro | escena de patio |
| `ref61.png` / `ref64.png` | Auto héroe + despiece: «escarabajo» | Auto redondo cian con franja amarilla, faros redondos, llantas amarillas de 6 rayos, alerón amarillo, antena con bola roja, amortiguadores amarillos | ref61: escena con puente, túnel de piedra y pinos |
| `ref62.png` / `ref63.png` | Auto héroe + despiece: drift | Deportivo naranja con alerón alto, llantas negras de 5 rayos con maza de bronce, slicks, splitter de carbono | ref62: escena de pista con torre y puente |
| `ref65.png` / `ref66.png` | Kit de boxes + **escena con cámara de partida** | Arco de largada con semáforos, torre de control de madera, banco techado con herramientas, estante con cargadores, carro rojo, podio con fondo a cuadros; ref66: todo junto en el patio, cerca de madera, bordillos de bloques en curva, neumáticos | ref66: 0,43 · **0,20** · 0,53 · #372416 / #8F6040 / #EFB980 |
| `ref67.png` | Baldosas de pista por superficie | Misma baldosa con 6 superficies: tierra→asfalto, madera→asfalto, hielo→hormigón, arena→barro rojo, charco con piedras, grava→hormigón; marco de madera con escuadras de chapa | (piezas) |
| `ref68.png` | Kit de bordes | Neumáticos apilados con estacas, barrera de plástico roja/blanca (tipo New Jersey), valla de madera, cartel de chevrons amarillo/negro, reflector en trípode, torre de madera con lona | (piezas) |
| `ref69.png` | **Escena con cámara de partida: circuito mixto** | Pista circular que pasa de tierra a asfalto a puente de madera a hormigón, bordes de madera con escuadras, arroyo y rocas en el centro, pinos | 0,42 · **0,21** · 0,55 · #2B1F0E / #845E3B / #E9BC89 |
| `ref70.png` | **Escena con cámara de partida: circuito de tierra** | Curvas de tierra con surcos, muro de neumáticos con estacas, barreras de plástico rojo/blanco, chevrons, torre con lona, reflector, pinos y lago | 0,40 · **0,18** · 0,57 · #311F0E / #865F3B / #DDA973 |
| `ref71.png` | Kit de props de boxes | Podio a cuadros, banderines a cuadros, pórtico rojo/blanco, rack de ruedas, cajones de colores con esquineros, reflectores dobles | (piezas) |
| `ref72.png` | Kit de pista elevada de madera | Curva, S, cruce y rampa de tablones sobre caballetes con barandas rojo/blanco, puente azul, pasarela con escaleras | (piezas) |
| `ref73.png` | Carrocerías (6, misma forma) | Un mismo casco de buggy en 6 libreas: amarillo pixelado, azul con barro, blanco tricolor, morado/naranja, naranja/negro, cian/amarillo | (piezas) |
| `ref74.png` | Collage de escenas de bioma | 6 escenas con la cámara de partida en un mosaico (patio, desierto, garaje, nieve, neón, bosque) | (escena) |
| `ref75.png` | Kit de boxes | 3 arcos de largada (semáforos de 15 luces, bandera a cuadros, arco curvo azul con 3 semáforos) con columnas a cuadros y bases de hormigón, boxes techados con herramientas, podio con trofeos, tribuna con butacas de colores; toldos en franjas rojo/amarillo/azul | (piezas) |
| `ref76.png` | Kit de bordes (con base de tierra) | Barrera New Jersey roja/blanca, neumáticos apilados negros/rojos/grises, conos sobre base negra, valla de 2 tablones con bulones, guardarraíl metálico, barrera con banda de neón naranja | (piezas) |
| `ref77.png` | Grupos de props por bioma | Taller (caja roja abierta, gato, neumáticos, taladro), industrial (tambores oxidados, palets, bloques de hormigón), jardín (cajón con girasoles, maceta, manguera, ladrillos), bosque (rocas con musgo, tronco, pinos), desierto (cajones, bidón, roca roja, cactus), nieve (cartel de flechas, cerca, pino, roca nevada) | (piezas) |
| `ref78.png` | Kit de puentes | Puente de madera con baranda, puente de vigas de acero, paso de hormigón, túnel de chapa ondulada en un lomo, puente de hormigón sobre pilares, puente de madera sobre arroyo; terraplenes de tierra con rocas y pasto | (piezas) |
| `ref79.png` | Kit de pista elevada de asfalto | Loop, espiral, cruce en X, bifurcación en Y, cruce a dos niveles, S; bordes amarillos con franja roja/blanca, pilares de hormigón con pies amarillos | (piezas) |
| `ref80.png` | Kit de rampas de madera | Rampa baja, rampa alta de salto, rampa larga, lomo doble, rampa doble paralela, plataformas; superficie de tablones oscuros, bordes rojo/blanco y amarillo, escuadras azules | (piezas) |
| `ref81.png`–`ref83.png`, `ref91.png`–`ref94.png` | **Enemigos (insectos mecánicos)** | Escarabajo rinoceronte amarillo con ojos verdes, mosca con ojos compuestos rojos y alas de celofán, saltamontes verde de cobre, hormiga roja de cobre, bicho verde con abdomen de líquido ácido brillante, escarabajo iridiscente azul/verde, araña negra con placas amarillas/naranjas; todos de metal pintado y gastado con remaches y articulaciones de bronce | (personajes) |
| `ref84.png`–`ref90.png`, `ref95.png`–`ref97.png` | Piezas del auto (sueltas) | Llanta de 5 rayos negra gastada, rueda de tacos con barro, amortiguador rojo, antena negra con punta roja, barra de 4 faros con reja, paragolpes tubular con placa calada, escape doble de titanio, alerón negro/rojo con soportes, carrocería naranja con franjas blancas/negras, chasis tubular con amortiguadores naranjas | (piezas) |
| `ref98.png`–`ref112.png` | **Los vehículos del juego** | Monopatín con piloto, moto deportiva azul/blanca, jeep verde, clásico rojo/crema, combi «misterio» con flores, murciélago violeta, triciclo con caja, moto de cross con piloto, camión de helados, buggy amarillo con franjas negras (×2), topadora, combi amarilla todoterreno, tanque amarillo, monster amarillo | (personajes) |
| `ref113.png`–`ref125.png` | Props sueltos | Podio de madera y chapa, rocas, cerca de estacas, barrera roja/blanca de chapa, neumáticos de tacos, pelota rojo/azul/amarillo, flotador celeste, chapa oxidada doblada, cucha de perro con techo rojo, cartel de flecha amarillo, cajón de madera, tambor amarillo, arbusto, pino | (piezas) |
| `ref127.png` | Enemigo: polilla | Polilla de alas de madera tallada con anillos oculares crema/marrón, cuerpo de pelusa crema, antenas de pluma doradas, patas de cobre | (personaje) |
| `ref128.png` / `ref129.png` | Enemigo: babosa / divisor | Gelatina rosa brillante con ojos blancos; `ref128` con una grieta oscura en el medio (el que se parte = **divisor**), `ref129` entera (**babosa**) | (personajes) |
| `ref130.png` | Vehículo: auto de juguete | Deportivo naranja de plástico con franjas amarillas, alerón, engranaje crema visible, ruedas negras con eje plateado; desgaste blanco en aristas (el «juguete» más simple: base para `mini.ts`) | (personaje) |
| `ref131.png` | Kit de garaje / taller | Carro de herramientas rojo abierto, estante de ruedas RC, banco con chasis RC en el tapete de corte, tambores con gato y bidón, soporte de cables enrollados, estante con latas y cajas | (piezas) |
| `ref132.png` | Kit de jardín | Banco de macetas con regadera, canilla con manguera y aspersor, arenero con baldes y castillos, portón de madera con enredadera, cantero de ladrillo con girasoles y lavandas, cobertizo rojo | (piezas) |
| `ref133.png` | Kit de ciudad | Parada de colectivo, farol con banco, obra con conos y barrera amarilla/negra, cantero con bicicletero, local con toldo rayado, esquina con semáforo, cebra y bolardos | (piezas) |
| `ref134.png` | Enemigo/jefe: robot de cuerda | Robot de lata rojo con aristas doradas y desgaste plateado, ojos amarillos emisivos, parrilla y dial en el pecho, llave de cuerda dorada en la espalda, pinzas plateadas | (personaje) |
| `ref135.png` | Enemigo/jefe: cortacésped | Tractor cortacésped rojo gastado, asiento negro, volante, plato de corte gris oxidado, rodillo de cuchillas rojo adelante, ruedas de tacos con llanta roja | (personaje) |
| `ref136.png` | Enemigo/jefe: aspiradora robot | Disco azul acero gastado con paragolpes negro, 2 ojos rojos grandes al frente, torreta con ojo rojo arriba, rejillas | (personaje) |
| `ref137.png` | Enemigo/jefe: aspiradora | Aspiradora celeste sobre orugas, manguera corrugada negra con boca celeste, bolsa de tela beige manchada, ojos amarillos con reja | (personaje) |
| `ref138.png` | Enemigo/jefe: cortacercos | Cortacercos naranja con manija negra, espada de dientes plateados y remaches | (personaje) |
| `ref143.png` | Kit de bioma: bosque | Rocas con musgo y helechos, grupo de pinos con tocón, tronco caído sobre rocas, arroyo con piedras y totoras, cartel de madera, pila de troncos con musgo | (piezas) |
| `ref144.png` | Kit de bioma: desierto | Mesa de roca roja en bloques, grupo de cactus (saguaro, barril con flor, agave), torre de agua oxidada sobre caballete, cajones con lona, rodadora con rama seca, arco de roca | (piezas) |
| `ref145.png` | Kit de bioma: industrial | Contenedores apilados con barrera amarilla/negra, pórtico grúa amarillo con gancho, palets y cajas de rejilla, máquina con caños oxidados, bolardos y guardarraíl a franjas, volquete con chatarra | (piezas) |
| `ref146.png` | Kit de bioma: nieve | Pinos nevados con rocas, cabaña de troncos con ventanas encendidas y carámbanos, cerca con carámbanos, quitanieves naranja, laguna congelada con muelle, leñera nevada | (piezas) |
| `ref147.png` | Kit de bioma: neón | Arco de neón magenta sobre asfalto mojado, farol cian con baranda, puesto con toldo y luces, cartel de chevrons de neón, tablero eléctrico con cables, cantero con plantas tropicales y balizas | (piezas) |
| `ref148.png` | **Escenas con cámara de partida, 6 biomas (de cerca)** | Patio (curva de tierra con troncos, girasoles, cobertizo), garaje (rampa de chapa, bordillos de bloques, rack de neumáticos), ciudad (curva de asfalto, local con toldo, faroles), bosque (puente de tablones sobre arroyo), desierto (curva entre mesas rojas, chevrons), neón (asfalto mojado, contenedores, barreras amarillas) | (escena) |
| `ref149.png` | Hoja de materiales en cubos (10) | Asfalto con grava, tierra roja con piedras, madera gastada con nudo, chapa antideslizante oxidada, plástico rojo con tapa amarilla, goma de tacos con barro, hormigón agrietado, nieve/hielo, roca mojada con musgo, cartón corrugado con pintura azul. Versión 3D de `ref53` (mismo set, mismo orden aprox.) | (texturas) |
| `ref150.png` | Enemigo: muñeco/presentador | Muñeco de madera de ventrílocuo con galera negra y cinta roja, frac rojo con bordes dorados, moño, mandíbula articulada, manivela de bronce en la espalda, articulaciones con remaches | (personaje) |
| `ref151.png` | Enemigo: payaso de caja sorpresa | Cabeza de payaso de madera blanca con nariz roja y sonrisa con dientes, pelo rojo facetado, gorro cónico negro; resorte de metal; caja violeta con estrellas amarillas, esquineros de bronce y manivela con mango rojo | (personaje) |
| `ref152.png` | Enemigo: ladrón | Mapache/zorro de chapa amarilla gastada con antifaz negro remachado, cola en espiral, bolsa de tela marrón con una tuerca, patas de hierro | (personaje) |
| `ref153.png` | Enemigo: hechicero/escudo | Robot chiquito con capucha de tela crema y parches verdes, ojos amarillos emisivos, báculo con orbe verde brillante, morral con hebilla, botas verdes | (personaje) |
| `ref154.png` | Enemigo: francotirador | Soldadito de plástico verde con casco remachado, ojos ovalados, gomera de madera con elástico rojo, correaje marrón | (personaje) |

## Mapa de personajes (referencia → código)

- **Vehículos** (`CARS` en `car.ts`, arquetipos de `models/mini.ts`): `ref98` monopatín, `ref99`/`ref105` moto, `ref100` jeep, `ref101` clásico, `ref102` misterio, `ref103` murciélago, `ref104` triciclo, `ref106` helado, `ref107`/`ref112` buggy, `ref108` topadora, `ref109` combi, `ref110` tanque, `ref111` monster. **Tanda c (imágenes por auto, fondo negro):** `ref234`/`ref238`/`ref244` buggy, `ref235` monster, `ref236` fórmula, `ref237` tanque, `ref239` buggy con piloto, `ref240` helado, `ref241` combi, `ref242` hovercraft (auto nuevo), `ref243` topadora, `ref245` triciclo, `ref246` murciélago, `ref247` clásico, `ref248` jeep, `ref249` moto, `ref218` pickup, `ref269` pickup de juguete (base simple de `mini.ts`), `ref210` despiece de rally, piezas `ref250` chasis, `ref251` carrocería, `ref252` alerón, `ref256` faros, `ref257` defensa, `ref259` escape; hojas `ref167`, `ref168`, `ref253`. Regla común: carrocería de juguete de chapa pintada con bordes saltados, ruedas de tacos con barro, antena con bola, amortiguadores de color.
- **Enemigos** (`DEF` en `enemies.ts`): `ref90`/`ref91` hormiga, `ref82` mosca, `ref81`/`ref93` escarabajo, `ref83` saltamontes (brincador), `ref94` araña, `ref92` bicho ácido, `ref127` polilla, `ref129` babosa, `ref128` divisor (gelatina partida). **Tanda c:** `ref260`/`ref304` hormiga, `ref261`/`ref307` ácido, `ref262`/`ref264` escarabajo (azul / rinoceronte dorado), `ref263` saltamontes, `ref265` araña, `ref266` polilla, `ref267` babosa, `ref268` gusano (nuevo), `ref277`/`ref284` saltador (rana mecánica / de cuerda), `ref283` kamikaze, `ref280` explosivo/divisor, `ref279` ovni (Luna), `ref278` escorpión-cangrejo, `ref287` bicho tanque, `ref289` escudero, `ref286` francotirador, `ref275` muñeco, `ref292` bicho de brasa, `ref296` taladro, `ref294` cohete; hojas `ref169`-`ref171`, `ref173`. Otros: `ref150` muñeco, `ref151` payaso, `ref152` ladrón, `ref153` hechicero (escudo), `ref154` francotirador. Jefes: `ref134` robot, `ref135` cortacésped, `ref136` aspiradora robot, `ref137` aspiradora, `ref138` cortacercos; **tanda c:** `ref270` cortacésped, `ref271` cortacercos, `ref297`/`ref308` perro (bulldog), `ref298` gato, `ref299` proyector de cine, `ref302` máquina de garra, `ref303` caja de música. Regla común: insecto **mecánico** de metal pintado con remaches, articulaciones de bronce y ojos de vidrio.

## Kits por bioma (mapa a escenarios ENCORE, ver `docs/ENCORE_BIOMAS.md`)

| Bioma | Kit | Escena | Borde de pista | Suelo |
|---|---|---|---|---|
| Patio | `ref39`, `ref18`, `ref20`; tanda c: `ref172`, `ref202`, `ref203`, `ref213`, `ref216`, `ref293` | `ref23`; tanda c: `ref160` (noche), `ref233` (atardecer) | bloques rojo/blanco, neumáticos de colores, tablones | tierra rojiza |
| Garaje / taller | `ref37`; tanda c: `ref175`, `ref192`, `ref194`-`ref201`, `ref211`, `ref212`, `ref215` | `ref25`, `ref8` | bloques rojo/blanco sobre madera | madera oscura, chapa |
| Bosque | `ref38`; tanda c: `ref204`, `ref214`, `ref306` | `ref28a`; tanda c: `ref232` | rocas con musgo, troncos | tierra con agujas de pino |
| Industrial | `ref41`; tanda c: `ref176`, `ref193`, `ref196`, `ref197`, `ref205`, `ref206`, `ref226`, `ref229` | `ref28b` | cordón amarillo/negro | hormigón con tierra |
| Ciudad | `ref36`; tanda c: `ref217`, `ref300` | `ref31a` | cordón de piedra rojo/blanco | adoquín |
| Desierto (Luna de día) | `ref40`; tanda c: `ref295`, `ref309` | `ref31b` | rocas rojas en bloques | arena |
| Nieve | tanda c: `ref301`, `ref305` | `ref33a` | bloques rojo/blanco, cerco | nieve con huellas |
| Neón (Luna de noche) | tanda c: `ref310` | `ref33b` | neumáticos en hilera, chevrons de neón | asfalto mojado |

Tanda c, hojas con los 6 biomas a la vez (para componer cualquier bioma): arcos `ref273`, barreras `ref276`, talleres `ref272`, obstáculos `ref274`/`ref285`, charcos `ref281`, túneles `ref282`, gradas `ref288`, podios `ref291`, curvas `ref254`, rectas `ref255`, rampas/puentes `ref258`, pistas completas `ref290` (escena). Texturas por bioma: patio `ref155`/`ref186`, garaje `ref174`/`ref179`, bosque `ref156`/`ref178`/`ref188`, industrial `ref180`/`ref181`, ciudad `ref183`-`ref185`, desierto `ref190`, nieve `ref187`, neón `ref191`.

Regla común de los kits: **cada bioma cambia el borde y el suelo, no la lógica**. Todas las baldosas tienen encastre y un borde que define la pista. En código, esto es una función de borde y una textura de suelo por zona, sobre el mismo trazado.

## Parámetros de render derivados (qué usar en el motor)

- **Luz:** hora dorada, sol bajo (12-18°) en contraluz o lateral, color ≈ #FFC27A; ambiente cálido y débil (≈ 1/5 del sol); sombras proyectadas visibles y suaves.
- **Cámara / post:** efecto miniatura por tilt-shift (franja nítida ≈ 45 % central); en planos héroe (menú, foto, final) DOF por profundidad con foco en el auto; viñeta cálida; bloom que deje halo en los bordes contraluz.
- **Color:** sombras marrón cálido (no negras ni azules), medios ámbar, luces crema; la saturación ya está bien.
- **Materiales (de `ref14`):** pintura de juguete con **bordes saltados** (sale el gris de abajo, no óxido); goma negra con **barro seco en las ranuras** (marrón #866E5C en los huecos, no encima de los tacos); llanta de 5 rayos oscura con desgaste plateado en aristas; resortes rojos brillantes; tierra roja con **piedras angulosas** grandes y chicas.
- **Materiales (rugosidad visual):** tierra 0,95 con piedritas 3D; madera 0,7-0,8 con veta y bordes gastados; plástico de juguete 0,35-0,5 con algo de clearcoat; goma 0,9 con polvo marrón en flancos; metal pintado 0,6 con pintura saltada (único lugar con óxido).
- **Composición:** densidad alta de props bajos alrededor del auto (neumáticos, bordillos, rampas, conos, matas), objetos de fondo altos (torre de agua, pinos, cabaña) para dar escala.

## Checklist visual (antes de dar por terminado un cambio de UI, shader, escenario o cámara)

1. Capturar la escena afectada sin HUD (`scratchpad` `zshot.mjs`/`ab.mjs` o `npm run shots`).
2. Medirla con `scripts/ref_measure.py` y comparar con «Objetivos medidos».
3. Mirarla al lado de la referencia de su categoría.
4. Si una métrica empeoró o la comparación a ojo no se acerca, iterar antes de entregar. Reportar los números de antes y de después.

## Aprendizajes (no repetir pruebas)

- **2026-10-14 · El contraste es de composición, no de gradación.** En el patio (cámara de juego), exposición 0,88 → 1,5 movió el contraste 0,11 → 0,13; `contrast` 2,2 y curvas agresivas (sombras cálidas, luces +40, sombras −40) también dieron 0,13. Las referencias sacan su 0,25 de: cielo claro en cuadro, siluetas oscuras en primer plano (neumáticos, bordillos), tierra clara al sol y poco pasto parejo. Palancas reales: qué ocupa el cuadro (más tierra y props oscuros, menos pasto liso), horizonte visible y contraluz. La gradación solo afina el tono (sombras cálidas), no crea contraste.
- **2026-10-14 · Las sombras existían pero no se veían:** con ambiente fuerte el sol era el 22 % del brillo. Arreglado bajando `hemiI` y `environmentIntensity` de día (`render.ts` `applyClimate`) y subiendo el sol.
- **2026-10-14 · Tilt-shift agregado** (`render.ts`, `LOOK.tilt` = 9 px a 720 de alto; franja nítida centrada al 40 % desde abajo, ±16 %). Nitidez del patio: fila de arriba 25-100 → 12-27 (fondo desenfocado como las referencias), centro sin cambios. Corre también en táctil (×0,7) y se apaga en pantalla dividida. Abajo queda suave a propósito: en partida hay que leer lo que se acerca.
- **2026-10-14 · Composición tipo `ref23` aplicada y el contraste sigue en 0,11.** Caminos de tierra 2,1× más anchos, bordillos en bloques, islas con flores, paleta de tierra rojiza clara (`dirtTextures`: #5a2e18 → #F0B57A) y sin tinte oscuro en `pathMat`: las luces subieron #8B8244 → #AC8346, pero el desvío de luminancia no. Lo que falta respecto de `ref23`: **sombras proyectadas largas y profundas** (#2A160A) de neumáticos, cercas y props, y objetos oscuros grandes en primer plano; además, un velo verdoso en el tercio superior. Próximo intento: sol más bajo y lateral (sombras largas), `darkness` menor y props oscuros cerca de la cámara; revisar de dónde viene el velo (niebla o tilt-shift sobre el pasto lejano).

## Tanda 2026-10-14c (ref155-ref310)

156 imágenes copiadas de `~/.codex/generated_images` (origen en `assets-src/ref-rcrace/_origen_tanda_c.tsv`), deduplicadas por firma 16×16 y clasificadas a ojo. Contenido incluye 2-3 colores hex dominantes (cuantizados, sin el fondo negro/transparente). Medición solo en escenas (`ref_measure.py`: lum · contraste · sat · sombras / medios / luces); en texturas va la «costura» (diferencia del borde que cierra el mosaico ÷ diferencia entre vecinos: ≈1-2,3 = se repite sin corte visible, >3 = hay corte). Las hojas 3×2 de kits siguen el orden: arriba patio · garaje/industrial · ciudad; abajo bosque · desierto (Luna de día) · neón (Luna de noche); las de pista (`ref254`, `ref255`, `ref258`) llevan nieve en lugar de bosque.

| Ref | Categoría | Bioma | Contenido | Medición | Entra en |
|---|---|---|---|---|---|
| ref155 | otro | patio | Hoja: tierra oscura con piedritas y hojas secas (izq.), chapitas/placas rojo-crema y bandeja metálica; #564033 #7E5840 #B89370 | — | suelo patio; chapitas HUD |
| ref156 | textura | bosque | Tierra marrón con surcos, piedritas y agujas de pino, vertical; #6A452E #362215 | costura 4,43 | suelo bosque (agujas) |
| ref157 | UI | varios | 12 insignias/pegatinas de chapa crema (tilde, estrella, cruz, franjas, mira) sobre fondo transparente; #EFCFA0 #EFAA2D #7F5437 | — | iconos HUD, pegatinas |
| ref158 | otro | garaje | Bandeja de chapa oxidada con tuercas y arandelas, 3 vistas; #88827C #4E3E34 | — | prop taller |
| ref159 | UI | varios | Las mismas 12 insignias sobre negro (variante de `ref157`); #F6D5A3 #C90F0E #6F4728 | — | iconos HUD (ver ref157) |
| ref160 | escena | patio | Auto 4x4 de noche con faros en camino de tierra y hojas, luna llena, cerco y cobertizo al fondo, DOF fuerte; #583119 #825232 #AF794A | lum 0,17 · contr 0,15 · sat 0,69 · #0B0401 / #341F13 / #A2683D | patio noche, luz, contraste |
| ref161 | textura | varios | Hoja 2x2: chapa naranja descascarada, óxido marrón, goma de tacos, madera; #4A3021 #954A23 #231B15 | costura 14,76 | chapa/goma/madera (recortar) |
| ref162 | textura | varios | Hoja 2x2: hojas verdes, tierra con agujas, adoquín beige, ladrillo rojo; #7B603C #77381D #382214 | costura 4,67 | hojas/adoquín/ladrillo (recortar) |
| ref163 | textura | varios | Hoja 2x2: roca parda hexagonal, caños oxidados verticales, chapa turquesa oxidada, hormigón sobre ladrillo; #97795D #5D3E2C #7D593F | costura 3,95 | industrial/ciudad (recortar) |
| ref164 | textura | varios | Hoja 2x2: escamas cobre, tejido verde-oliva, escamas ámbar, pelaje beige; #5E552A #B28859 #3E1C0D | costura 5,50 | piel de bicho (recortar) |
| ref165 | textura | varios | Hoja 2x2: chapa naranja, turquesa descascarado, caucho de bloques, azul rayado; #C3490D #396464 #171C21 | costura 8,07 | chapa/goma (recortar) |
| ref166 | otro | varios | 8 decals sobre negro: manchas de aceite, huellas, derrame rojo, escombros, goteras, chapa, franjas amarillo/negro; #653E23 #B64C11 #873008 | — | marcas en el piso (fx) |
| ref167 | vehículo | varios | 9 autos RC pixel-pulido oxidados (monster, formula, buggy, rally, moto, combi helado/camper, jeep); #8E7867 #625043 #4E3323 | — | vehículos, skins |
| ref168 | vehículo | varios | 8 vehículos: hovercraft, topadora, triciclo, murciélago, buggy peludo, clásico, moto, kart con piloto; #876E5A #51331F #65503F | — | vehículos |
| ref169 | personaje | varios | Hoja de 20 enemigos y jefes mecánicos (hormiga, polilla, escarabajo, araña, babosa, robot, bichos ácidos); #513523 #894925 #B8703B | — | bestiario completo |
| ref170 | personaje | varios | Hoja de enemigos: misma lista que ref169 con trazos distintos (más hormigas, gusano, araña, bichos de brasa) (variante de `ref169`); #604631 #AF7544 | — | bestiario |
| ref171 | personaje | varios | Hoja de enemigos y jefes: tanque, ácido, saltamontes, francotirador, rey escarabajo, cortacésped, tarántula, perro, gato, aspiradora, payaso; #6D4A32 #422B1F #A06036 | — | bestiario / jefes |
| ref172 | kit | patio | Hoja de 20 props patio/garaje: cajas, tambor, neumáticos, rampa, caja de herramientas, maceta, manguera, regadera, gnomo, carretilla, banco, cono; #56311B #97592E #BB7F4B | — | props patio-garaje |
| ref173 | personaje | varios | Hoja de enemigos (3 filas): escudero, francotirador, payaso, tanque, proyector, cortacercos, máquina; #623014 #9E5B2D #C58144 | — | bestiario |
| ref174 | textura | garaje | Parches de chapa roja tipo escamas con remaches sobre fondo gris oscuro; #C74021 #54311E | costura 3,12 | chapa roja de garaje |
| ref175 | kit | garaje | Cajón de madera con esquineros de metal y brillo naranja, estilo pixelado; #B3632A #7A421F #E39D55 | — | prop |
| ref176 | kit | industrial | Tambor rojo con camuflaje pixelado blanco/gris, aros; #6B3A24 #C3260E #851A05 | — | prop |
| ref177 | kit | garaje | Pila de 3 neumáticos con taco, pixelados, óxido naranja; #6D5344 #412D22 #A6724A | — | prop neumáticos |
| ref178 | textura | bosque | Tierra con hojas de otoño, agujas de pino y piedras; #402311 #854E27 #A66E3E | costura 1,94 | suelo bosque |
| ref179 | textura | garaje | Tablones de madera cálida con nudos y clavos; #AB6B30 #7C4B29 #331F13 | costura 2,62 | piso/pared madera |
| ref180 | textura | industrial | Chapa naranja con óxido gris descascarado; #E85807 #5C4534 #883F18 | costura 1,68 | chapa industrial |
| ref181 | textura | industrial | Hormigón claro agrietado con granos; #AFA497 #94897D | costura 2,05 | suelo industrial |
| ref182 | textura | varios | Huella de neumático en chevron, bloques negros; #393A3B #1B1B1C #6D665F | costura 11,82 | goma / borde de pista |
| ref183 | textura | ciudad | Ladrillo rojo con revoque beige descascarado; #A25334 #C1AA88 #AE8B66 | costura 2,22 | muros de ciudad |
| ref184 | textura | ciudad | Adoquín grande gris con musgo en juntas; #927D65 #695D51 #362D21 | costura 3,87 | calle ciudad / camino |
| ref185 | textura | ciudad | Asfalto negro con grava y huellas; #4B4948 #2A2B2C #66625F | costura 2,21 | asfalto ciudad / neón |
| ref186 | textura | patio | Agua turquesa con cáusticas; #016D87 #29B6AF #6ED9C7 | costura 6,02 | pileta / charcos |
| ref187 | textura | nieve | Pizarra/hielo azul acero con vetas; #415262 #2A3643 | costura 13,46 | hielo / piso nieve |
| ref188 | textura | bosque | Hojas verdes superpuestas; #707934 #425026 #1C2614 | costura 4,45 | follaje / pasto |
| ref189 | textura | varios | Escamas verdes con brillo amarillo; #304928 #122114 #566938 | costura 4,41 | piel de bicho/jefe |
| ref190 | textura | desierto | Superficie lunar gris con cráteres y rocas; #87898E #686B72 #444850 | costura 2,08 | suelo Luna de día |
| ref191 | textura | neón | Placas de acero azulado con remaches y ranuras; #7A8187 #57626B #27292B | costura 6,36 | suelo/paredes neón |
| ref192 | kit | garaje | Cajón de madera con refuerzos en X y esquineros; #CE8342 #6A3A20 #9C5B30 | — | prop |
| ref193 | kit | industrial | Tambor amarillo oxidado con tapones; #914917 #C67517 #60301A | — | prop |
| ref194 | kit | garaje | Pila de 3 neumáticos de taco con barro; #7B6353 #513F36 #A48369 | — | prop neumáticos |
| ref195 | kit | garaje | Rampa curva de madera con soportes; #F3AC5D #A96130 #D27F4C | — | prop/rampa |
| ref196 | kit | industrial | Barrera de chapa rojo/blanco con patas; #E1CFB9 #BC1813 #542922 | — | borde de pista |
| ref197 | kit | industrial | Palet de madera gastado; #CDA378 #735238 #A7784F | — | prop |
| ref198 | kit | garaje | Caja de herramientas roja abierta de asa; #AC1C17 #523C34 #CE3930 | — | prop taller |
| ref199 | kit | garaje | Banco de taller de madera con morsa; #995B30 #C88854 #562F1B | — | prop taller |
| ref200 | kit | garaje | Llave inglesa oxidada con mango naranja; #827166 #D65324 #A38A76 | — | prop taller |
| ref201 | kit | garaje | Destornillador de mango rojo; #D7433A #5A4742 #721412 | — | prop taller |
| ref202 | kit | patio | Manguera verde enrollada con boquilla de bronce; #285B3C #3D7A57 #6D926F | — | prop jardín |
| ref203 | kit | patio | Maceta de terracota con olivo; #727440 #8E3F25 #54542B | — | prop jardín |
| ref204 | kit | bosque | Arbusto verde-amarillo compacto; #9D953B #717332 #464924 | — | prop vegetación |
| ref205 | kit | industrial | Cartel de flecha amarilla/negra en chapa; #F9B40A #392D29 #81614B | — | señal de pista |
| ref206 | kit | industrial | Chapa oxidada doblada; #B86443 #5F4D47 #866357 | — | prop chatarra |
| ref207 | kit | patio | Escalera de pileta cromada con 3 escalones (con restos de fondo en el alfa) (variante de `ref209`); #BEAB9A #535D6E #B18F71 | — | prop pileta |
| ref208 | kit | patio | Flotador celeste inflado; #26B9D4 #56D2E9 #1D6A7B | — | prop pileta |
| ref209 | kit | patio | Escalera de pileta cromada con 3 escalones (limpia); #C4AC93 #4A566A #816B5A | — | prop pileta |
| ref210 | vehículo | varios | Auto rally blanco con franjas verde/rojo desarmado: carrocería, chasis, amortiguadores, 4 ruedas, faros; #4C3C33 #5C584F #D6BCAC | — | despiece de auto |
| ref211 | kit | garaje | Dos neumáticos de taco apilados (variante de `ref194`); #493E37 #796A61 #9B8675 | — | prop neumáticos |
| ref212 | kit | industrial | Portón/persiana de chapa con marco amarillo y franjas; #6F7178 #4D494B #E7A145 | — | prop garaje |
| ref213 | kit | patio | Regadera de chapa verde; #3E5D2F #788259 #9AA179 | — | prop jardín |
| ref214 | kit | bosque | Grupo de 3 rocas grises poligonales; #A78D77 #705D4F #46362C | — | prop rocas |
| ref215 | kit | garaje | Tuerca y tornillo grandes oxidados; #B09787 #6E4734 #442D23 | — | prop taller |
| ref216 | kit | patio | Cerca de madera con postes y clavos; #D9BEA1 #503426 #BA8155 | — | borde patio |
| ref217 | kit | ciudad | Barrera doble rojo/blanco con travesaños; #9D1108 #AE9081 #E03127 | — | borde de pista |
| ref218 | vehículo | varios | Pickup amarilla con rayos turquesa/naranja, ruedas con llanta naranja; #F19519 #3F322E #494C53 | — | vehículo |
| ref219 | kit | varios | Cruce en X de pista de madera con topes rojo/azul; #E9A66F #9F684F #532E1E | — | pieza de pista |
| ref220 | kit | varios | Curva de pista de madera con cordón rojo/blanco; #DC986D #643118 #CC634A | — | pieza de pista |
| ref221 | kit | varios | Cubo amarillo con rombos turquesa/naranja y esquineros; #DA8C12 #FBC525 #41605E | — | caja de ítem |
| ref222 | kit | varios | Recta de pista de madera con cordón rojo/blanco y línea de puntos; #B87E55 #6D2F1E #D8C0A3 | — | pieza de pista |
| ref223 | kit | varios | Curva de pista de madera (otro ángulo) (variante de `ref220`); #DC8C55 #572F1D #B76D46 | — | pieza de pista |
| ref224 | kit | varios | Rampa de madera naranja con flecha crema; #AA724B #F4CDA7 #E58D5B | — | pieza de pista |
| ref225 | kit | varios | Looping de madera con rieles y refuerzos; #895033 #C67146 #856E5F | — | pieza de pista |
| ref226 | kit | industrial | Puente de tablones con barandas amarillas; #9D7253 #554B45 #DD9F4C | — | pieza de pista |
| ref227 | kit | varios | Plataforma/salto de madera con cordón rojo/blanco; #D39F71 #5D524C #4D392E | — | pieza de pista |
| ref228 | kit | varios | Túnel de madera con arco rojo y franjas amarillo/negro; #C33927 #58493F #B2835A | — | pieza de pista |
| ref229 | kit | industrial | Caballete de madera amarillo con esquineros; #E98D1E #A26742 #533123 | — | prop |
| ref230 | kit | varios | Arco de largada de torre con luces y cartel; #E7DAC4 #45342B #BD8568 | — | largada |
| ref231 | kit | varios | Podio de 3 niveles amarillo/azul con chapa; #F4AC2D #BC7351 #4A5259 | — | resultados |
| ref232 | escena | bosque | Diorama aéreo de pista con puente, rampa, lago y pinos, borde rojo/blanco; #CB935C #493924 #7B4C2B | lum 0,42 · contr 0,21 · sat 0,55 · #261B0F / #836543 / #ECB274 | composición de pista |
| ref233 | escena | patio | Línea de largada con arco, bloques, neumáticos y caja de ítems sobre tierra, atardecer; #C58555 #614837 #976947 | lum 0,41 · contr 0,20 · sat 0,58 · #311C11 / #8D5B3A / #EFBA7D | patio atardecer, contraste |
| ref234 | vehículo | varios | Buggy amarillo/negro con alerón alto y aro amarillo; #6D625B #4F453E #F9C829 | — | auto jugador |
| ref235 | vehículo | varios | Monster truck amarillo/negro con ruedas enormes; #625A5A #3D3737 #EBBF37 | — | auto jugador (monster) |
| ref236 | vehículo | varios | Fórmula amarilla/negra de ruedas expuestas con alerón; #70645D #4E4545 #F9CF28 | — | auto jugador |
| ref237 | vehículo | varios | Tanque amarillo con oruga y cañón; #756A5F #E0A017 #53483F | — | auto jugador (tanque) |
| ref238 | vehículo | varios | Buggy amarillo/negro con jaula, alerón y amortiguadores; #665D56 #F4BB2C #413935 | — | auto jugador (buggy) |
| ref239 | vehículo | varios | Buggy amarillo con piloto de casco; #635954 #4D4039 #F8C635 | — | auto jugador |
| ref240 | vehículo | varios | Camión de helados rosa/crema con cucurucho y ruedas rosa; #48403C #E48082 #F7D2B3 | — | auto jugador (helado) |
| ref241 | vehículo | varios | Combi amarilla/crema todoterreno; #E39F0D #EFDDC5 #494648 | — | auto jugador (combi) |
| ref242 | vehículo | varios | Hovercraft buggy amarillo con turbinas laterales; #BD8518 #867765 #3C322B | — | vehículo nuevo |
| ref243 | vehículo | varios | Topadora amarilla con pala; #756860 #50443E #ECB840 | — | auto jugador (topadora) |
| ref244 | vehículo | varios | Buggy amarillo/negro con alerón (casi igual a ref238) (variante de `ref238`); #70645D #F9C41A #51463E | — | auto jugador |
| ref245 | vehículo | varios | Triciclo turquesa/crema con caja; #615043 #D2BB94 #3D3731 | — | auto jugador (triciclo) |
| ref246 | vehículo | varios | Murciélago violeta con alas; #393539 #504B54 #9C7C75 | — | auto jugador (murciélago) |
| ref247 | vehículo | varios | Clásico rojo/crema cromado; #55423B #B21E1B #796759 | — | auto jugador (clásico) |
| ref248 | vehículo | varios | Jeep verde militar abierto; #6E5E44 #3A312D #AC9870 | — | auto jugador (jeep) |
| ref249 | vehículo | varios | Moto deportiva azul/blanca; #433C37 #585352 #104C8F | — | auto jugador (moto) |
| ref250 | vehículo | varios | Chasis RC desnudo con amortiguadores naranja; #595351 #975831 #38302C | — | despiece / garaje |
| ref251 | vehículo | varios | Carrocería naranja con tomas y franjas; #BE3E03 #F2863F #6E5347 | — | despiece / skins |
| ref252 | vehículo | varios | Alerón negro con detalles rojos; #363234 #C52925 #801C17 | — | pieza de auto |
| ref253 | vehículo | varios | 6 autos RC en hoja (buggy, pickup, rally, monster violeta, deportivo, kart); #4D4D4E #2E2F2E #A3795E | — | vehículos / skins |
| ref254 | kit | varios | 6 curvas de pista por bioma (asfalto, tierra, madera, chapa, nieve, neón); #554643 #AC6846 #79635A | — | curva por bioma |
| ref255 | kit | varios | 6 rectas de pista por bioma (asfalto, tierra, madera, chapa, nieve, neón); #B16A41 #78645E #422C2C | — | recta por bioma |
| ref256 | vehículo | varios | Barra de 4 faros con rejilla; #7A6F66 #C7A26E #554C47 | — | pieza de auto |
| ref257 | vehículo | varios | Defensa tubular negra con ranuras; #332E2C #5A5B67 #7F7A7B | — | pieza de auto |
| ref258 | kit | varios | 6 rampas/puentes por bioma; #B66B3D #746763 #413032 | — | rampas por bioma |
| ref259 | vehículo | varios | Escape doble de titanio azul/ámbar; #684023 #3C2F33 #B09B88 | — | pieza de auto |
| ref260 | personaje | patio | Hormiga mecánica roja; #72493C #9A5E4B #50271C | — | enemigo hormiga |
| ref261 | personaje | varios | Bicho ácido verde lima con abdomen brillante; #869A19 #51361A #B49F35 | — | enemigo ácido |
| ref262 | personaje | varios | Escarabajo azul iridiscente con caparazón; #326977 #4F3A30 #756964 | — | enemigo escarabajo |
| ref263 | personaje | patio | Saltamontes mecánico verde; #947E39 #4A301D #6D6325 | — | enemigo saltamontes |
| ref264 | personaje | varios | Escarabajo rinoceronte dorado con cuerno; #C68834 #443326 #825324 | — | élite/jefe escarabajo |
| ref265 | personaje | varios | Araña naranja/negra con placas; #715E53 #3E2F26 #B27E54 | — | enemigo araña |
| ref266 | personaje | patio | Polilla de alas talladas con ojos; #945C3B #EDC79A #C18252 | — | enemigo polilla |
| ref267 | personaje | varios | Babosa verde-oliva con manchas; #956F3F #755025 #4F3215 | — | enemigo babosa |
| ref268 | personaje | patio | Gusano segmentado rosa/rojo; #CD7053 #9B4332 #5C231A | — | enemigo nuevo (gusano) |
| ref269 | vehículo | varios | Pickup de juguete naranja con alerón (base simple); #FC7520 #DC4C0F #402F2A | — | base mini.ts |
| ref270 | personaje | patio | Tractor cortacésped rojo; #4F4442 #D42E2B #B7816D | — | jefe cortacésped |
| ref271 | personaje | patio | Cortacercos naranja con espada de dientes; #605C5E #C54407 #B79E8F | — | jefe cortacercos |
| ref272 | kit | varios | 6 talleres/paradas por bioma (mesa, galpón, kiosco, cabaña, toldo en roca, búnker neón); #6E6867 #604635 #AF8D72 | — | props de salida |
| ref273 | kit | varios | 6 arcos de largada por bioma; #3F2F2B #776655 #B7865C | — | arco por zona |
| ref274 | kit | varios | 6 obstáculos/rampas por bioma (cobertizo, taller, escalera, tronco, roca, contenedores); #3A3029 #A96D48 #DCAE82 | — | obstáculos |
| ref275 | personaje | varios | Muñeco de ventrílocuo con galera y frac, de cuerpo entero; #6A5B53 #534339 #A58369 | — | enemigo muñeco |
| ref276 | kit | varios | 6 barreras con chevron por bioma (madera, New Jersey, neumáticos, chapa con LED, nieve, neón); #352D2A #EBAC43 #9D3321 | — | borde de curvas |
| ref277 | personaje | varios | Rana mecánica naranja con propulsores; #EF6A25 #8B684D #5B483A | — | enemigo saltador |
| ref278 | personaje | desierto | Escorpión-cangrejo de roca gris con cola cian; #85776E #453228 #715545 | — | enemigo tanque/jefe |
| ref279 | personaje | neón | Ovni azul/amarillo con cúpula cian y tentáculos; #468380 #41332A #9B8061 | — | enemigo Luna |
| ref280 | personaje | varios | Bomba de vidrio verde con flejes y patas; #493021 #72704B #70452C | — | enemigo explosivo/divisor |
| ref281 | kit | varios | 6 charcos/agua por bioma (barro, aceite, desagüe, arroyo, oasis, lavadero); #97765A #684831 #959589 | — | charcos |
| ref282 | kit | varios | 6 túneles por bioma (cerca, mesa, callejón, tronco, arco de roca, contenedores); #604235 #65635B #9E684B | — | obstáculos pasables |
| ref283 | personaje | varios | Bomba roja caminante con ojos y mecha; #852510 #6F4E3F #CC7B52 | — | enemigo kamikaze |
| ref284 | personaje | varios | Rana de cuerda verde con resortes; #B0B650 #82694B #423928 | — | enemigo saltador |
| ref285 | kit | varios | 6 obstáculos por bioma (manguera, herramientas, puente, rocas, cajas, caños); #3F3228 #9F6E46 #D79F67 | — | layout |
| ref286 | personaje | varios | Francotirador violeta con sombrero ancho y rifle; #483135 #90518D #6C4B50 | — | enemigo francotirador |
| ref287 | personaje | industrial | Bicho tanque gris con cilindro cian y 6 patas; #84776F #94A19A #664D3E | — | enemigo/jefe tanque |
| ref288 | kit | varios | 6 gradas/miradores por bioma; #543E35 #8C5D3C #C19D73 | — | fondo |
| ref289 | personaje | varios | Escudero azul con escudo de chapa amarilla; #7F8395 #C18638 #856F63 | — | enemigo escudo |
| ref290 | escena | varios | 6 pistas completas por bioma en isométrica (patio, garaje, ciudad, bosque, desierto, neón); #5B3D32 #A46B4A #E7A46B | lum 0,29 · contr 0,22 · sat 0,50 · #0E0C10 / #4A352D / #E0AF79 | biomas, composición |
| ref291 | kit | varios | 6 podios por bioma (bandera, trofeos, plaza, tocones, roca, neón); #2F2F30 #8C5539 #9E7A54 | — | resultados |
| ref292 | personaje | varios | Bicho de brasa con abdomen en llamas; #715649 #492D1F #ECAC3A | — | enemigo de fuego |
| ref293 | kit | patio | 6 tramos de pista de barro y pasto con puentes; #704B35 #472F21 #84725C | — | suelo patio-bosque |
| ref294 | personaje | varios | Cohete rojo/plata con llama; #77645F #E53D30 #B59485 | — | proyectil/jefe cohete |
| ref295 | kit | desierto | 6 tramos de pista de tierra y madera; #B9855E #503220 #764B31 | — | suelo patio-desierto |
| ref296 | personaje | industrial | Bicho taladro amarillo con núcleo cian; #FCBB47 #574E45 #E59234 | — | enemigo taladro |
| ref297 | personaje | varios | Bulldog francés gris con collar, tres cuartos; #9A847B #715D5C #514749 | — | jefe perro |
| ref298 | personaje | varios | Gato naranja atigrado, pixelado; #F6832A #C1501B #E5C6A2 | — | jefe gato |
| ref299 | personaje | varios | Proyector de cine oxidado con rollos y lente; #836A5A #A68466 #4A3022 | — | jefe/enemigo proyector |
| ref300 | kit | ciudad | 6 tramos de asfalto mojado y madera con borde rojo/blanco; #756F75 #585760 #363131 | — | suelo ciudad |
| ref301 | kit | nieve | 6 tramos de pista con nieve y hielo; #9FA7BE #504C51 #716B6F | — | suelo nieve |
| ref302 | personaje | varios | Máquina de garra naranja con peluches; #E46B24 #674D43 #896854 | — | jefe garra |
| ref303 | personaje | varios | Caja de música rosa con bailarina y dientes; #532C1C #7C4C30 #C98E6B | — | jefe caja de música |
| ref304 | personaje | patio | Cabeza de hormiga roja con ojos de vidrio (primer plano); #753821 #855D4B #BE6040 | — | enemigo hormiga |
| ref305 | kit | nieve | 6 tramos de pista con hielo, puentes y nieve; #605D64 #969AAD #313136 | — | suelo nieve |
| ref306 | kit | bosque | 6 tramos de pista de tierra con musgo y hojas; #9B7E51 #766A41 #554F2E | — | suelo bosque |
| ref307 | personaje | varios | Bicho ácido verde con cañón y tubos; #876846 #AE8A60 #4E3623 | — | élite ácido |
| ref308 | personaje | varios | Bulldog francés gris de perfil; #AA9182 #776463 #564C4D | — | jefe perro (otra pose) |
| ref309 | kit | desierto | 6 tramos de pista pedregosos y tierra roja; #A38573 #745C4B #3F332B | — | suelo desierto/industrial |
| ref310 | kit | neón | 6 tramos de asfalto mojado con neón magenta/cian; #49333F #365070 #755352 | — | suelo neón |

- **2026-10-15 · Medir cada bioma con SU luz.** Los biomas (bosque, nieve, ciudad, industrial) traen `climate` propio en `ZONES` (`world.ts`, `BIOME()`): sombras del color del bioma, menos niebla y exposición 1,05-1,35. Capturar con `__lab({back, up})` SIN `climate`; con `climate:"encore"` se fuerza el atardecer del patio y el contraste sale 0,05-0,08 más bajo (bosque: 0,14 con encore → 0,19 con FOREST). Un camino claro (tierra apisonada #b8875a) sobre suelo oscuro rinde más contraste que un camino oscuro sobre suelo oscuro.
- **2026-10-15 · Piso violeta del lado oscuro de la Luna** = emisivo `NEON_FLOOR` del piso (se suma sin luz y la exposición/tonemap lo levanta), no la niebla ni el tinte. Ver `moon.ts`.

## Tanda 2026-10-15 (ref311-ref322)

Objetos de sistemas ENCORE (ChatGPT, `assets-src/imagegen-production/encore-v1/raw/`, prompt en `jobs/<nombre>.json`; origen en `_origen_tanda_d.tsv`). Son propuestas de arte, no recetas: al construirlas hay que definir malla, materiales y escala.

| Ref | Categoría | Contenido | Entra en |
|---|---|---|---|
| ref311 | prop | Baliza de ruta | señal del destino elegido |
| ref312 | prop | Cofre de chatarra | cofres ENCORE |
| ref313 | prop | Cofre especial | cofre del Director |
| ref314 | prop | Televisor del Director | Director (HUD/escena) |
| ref315 | prop | Foco del Director | Director, iluminación de escenario |
| ref316 | prop | Núcleo de sobrecarga | fase overload |
| ref317 | prop | Recicladora | economía/tornillos |
| ref318 | prop | Teleportador cohete | teleportador |
| ref319 | prop | Terminal de pactos | pactos |
| ref320 | prop | Máquina de tienda | tienda |
| ref321 | escena | Iluminación del garaje (batch-10 mini-worlds) | garaje/taller |
| ref322 | escena | Escenas por condición de pista (batch-10 mini-worlds) | biomas, clima |

## Tanda 2026-10-15b (ref323-ref360, imagegen encore-v1)

Importadas con `node scripts/imagegen.mjs --importar` (origen en `_origen_imagegen.tsv`; prompt de cada una en `assets-src/imagegen-production/encore-v1/jobs/<nombre>.json`). Clasificación por nombre de job: `arma-*` = íconos/modelos de armas; `encore-material-*` = texturas candidatas; `encore-decal-*` = decals; `piloto-*` = pilotos nuevos; resto = objetos ENCORE.

| Ref | Job |
|---|---|
| ref323 | encore-ensambladora |
| ref324 | encore-rele-lunar |
| ref325 | encore-bateria-run |
| ref326 | encore-camara-director |
| ref327 | encore-bobina-cable |
| ref328 | encore-compuerta-lunar |
| ref329 | encore-baliza-rescate |
| ref330 | encore-caja-transmision |
| ref331 | encore-material-regolito |
| ref332 | encore-material-chapa-marfil |
| ref333 | encore-material-chapa-burdeos |
| ref334 | encore-material-metal-oxidado |
| ref335 | encore-material-madera-plató |
| ref336 | encore-decal-huellas-rc |
| ref337 | encore-decal-aceite |
| ref338 | encore-decal-flecha-ruta |
| ref339 | encore-decal-anillo-activacion |
| ref340 | arma-gomitas |
| ref341 | arma-clips |
| ref342 | arma-chispero |
| ref343 | arma-petardos |
| ref344 | arma-tesla |
| ref345 | arma-lanza |
| ref346 | arma-agua |
| ref347 | arma-yoyo |
| ref348 | arma-bengalas |
| ref349 | arma-regla |
| ref350 | arma-helado |
| ref351 | arma-bocina |
| ref352 | arma-trompo |
| ref353 | arma-tuercas |
| ref354 | arma-bobinas |
| ref355 | arma-ventilador |
| ref356 | arma-canicas |
| ref357 | arma-burbujas |
| ref358 | arma-matamoscas |
| ref359 | arma-dardos |
| ref360 | piloto-osito |
