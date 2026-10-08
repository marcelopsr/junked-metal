# Junked Metal — Dirección de arte

Referencia para cualquier asset, shader o pantalla nueva. Actualizada el 2026-10-08. Todo lo anterior a esta fecha que contradiga la sección "Vigente" está en "Historia (no vigente)" al final.

## Vigente (2026-10-08)

**Dirección:** partidas de **DÍA** al estilo Megabonk (sol alto, cielo azul, colores saturados, low-poly con texturas pixeladas y contornos suaves) sobre un mundo **Folded**: chatarra industrial plegada y ensamblada (chapa, perfiles, remaches), con desgaste y óxido. HUD y menús de **paneles de chapa oscura opaca con borde naranja gastado**, tipografía **Rajdhani** y tokens `--jm-*`.

Reglas que mandan:
- **Nada de emojis ni UI genérica** (glassmorphism, pills genéricas, `system-ui` suelto, blancos puros, degradados morados). Íconos SVG propios (`icons.ts`).
- **Textos del juego:** español neutro e impersonal, sin voseo ni "tu/te" ("Presiona", "Sobrevive", "El auto quedó destrozado"). Créditos sin tecnologías: historia breve y "Creado por TheDuende". Branding, carteles, slogans, chistes, nombres propios ("Junket Crush", "GOOD METAL / BRIGHTER DAYS") y los textos del mundo (calcos, carteles de los modelos) van en inglés y fuera de la traducción.
- **Mundo Folded, volumen real a 360°:** orden de diseño silueta, material, color, detalle. No es papel, cartón ni sprites. Detalle en "Folded 2.5D" más abajo.
- **Desgaste con intención:** pintura saltada en bordes y esquinas, óxido desde las uniones; más desgaste en piezas de contacto, menos en paneles grandes.
- **Lectura clara:** la escena se lee siempre bien (no es terror). Rojo = amenaza enemiga; no usar rojo para nada del jugador.
- **Rendimiento primero:** instancias y plantillas, atlas único, texturas ≤256 sin filtrar, nada de mallas sueltas por entidad.

**Tokens reales (src/kit.css, `:root`; fuente única de la paleta: `PAL`/`M3C` en `src/kit3d.ts`, si cambia un HEX cambiar los dos):**

| Rol | Token | Valor |
|---|---|---|
| Acentos | `--jm-amarillo` / `--jm-amarillo2` / `--jm-naranja` | `#FFB400` / `#FFD166` / `#FF9138` |
| Estado | `--jm-rojo` / `--jm-cian` / `--jm-verde` / `--jm-morado` | `#FF3B2E` / `#00C2FF` / `#22C55E` / `#8B5CF6` |
| Fondos | `--jm-fondo` / `--jm-fondo2` / `--jm-panel` / `--jm-borde` | `#0B0F14` / `#14181F` / `#1F2937` / `#374151` |
| Texto | `--jm-texto` / `--jm-texto2` | `#F8FAFC` / `#9CA3AF` |
| Chapa | `--jm-chapa` (borde naranja gastado) / `--jm-chapa-osc` / `--jm-tornillo` | `#b5651d` / `#3a2414` / `#6b4a2a` |
| Forma | `--jm-r` / `--jm-gap` / `--jm-pad` | 3px / 10px / 14px |

**Tipografía:** Rajdhani (paquete `@fontsource/rajdhani`, local) para todo: títulos 700 en mayúsculas (`--jm-titulo`), texto funcional 500 (`--jm-texto-f`). Escala `--jm-t-*` (h1 clamp 30-44px, h2 22, kicker 13, cuerpo 16, chico 13, número 30). El foco es cian (`outline: 3px solid var(--jm-cian)`), igual con teclado, joystick o mouse.

**HUD y menús:** `kit.css` se carga última y pisa los estilos de vidrio de `style.css`, `menu.css` y `hud.css` (los encabezados de esos archivos todavía dicen "vidrio" o "terminal": están desactualizados, manda `kit.css`). Panel = chapa oscura (gradiente opaco ~.96) con borde naranja de 3px, tornillos en las cuatro esquinas, sombra interior; botones de chapa pintada (verde `.primary`, amarillo `.warn`, rojo `.danger`); pestañas activas amarillas; tarjetas seleccionadas con filo amarillo. Barras sin esquinas redondeadas.

**Modos:** Supervivencia (principal), Carrera, Junket Crush (match-3) y Demolición comparten esta dirección; Carrera, Junket Crush y Demolición siguen en desarrollo y no dan tornillos ni logros (ver HANDOFF §5).

### Personajes, mundo y combate (vigente)

#### Personajes
- **Enemigos:** anatomía creíble y amenazante. Patas articuladas animadas, mandíbulas, brillo de caparazón.
- **Autos del jugador:** réplica RC detallada (carrocería de policarbonato con stickers de marca propia,
  amortiguadores visibles, llantas con taco). **Daño visible** (humo, chispas, piezas que se caen con
  poca vida). **Personalización** en el taller (color, llantas) y mejoras de la partida montadas en el auto.

#### Mundo
- Suelo rico: pasto que se mueve con el viento, marcas de neumático persistentes, tierra, charcos.
- Objetos cotidianos detallados que cuentan la historia del patio.
- Destrucción del entorno: macetas que se rompen, marcas de explosión, objetos que vuelan.

#### Combate (efectos)
- Impactos con peso: hit-stop, destello, esquirlas del material, sacudida proporcional.
- Explosiones físicas: humo, fuego, onda que empuja, marcas quemadas en el piso.
- Muertes con restos: insectos patas arriba / en pedazos con física; juguetes desarmados.
- Números de daño (críticos más grandes).

#### Combate (agregado 2026-10-03)
- Flash blanco breve en cada golpe; hit-stop solo en críticos y jefes.
- Insectos muertos quedan patas arriba unos segundos con un charco del color de sus ojos; juguetes sueltan tornillos, resortes y chispas.
- Feedback de impacto por arma (`fx.ts` `IMPACT`, `sfx.ts` `SFX.impact`): chispas del color del arma (verde fósforo = propias), pedazos del caparazón, squash de 3 pasos en el bicho, sacudida y sonido propios. Con "Reducir parpadeos" no hay destello ni chispas.
- Final de partida: ~5 s de cámara lenta (0,2x) con barras de cine y la cámara orbitando el auto; luego los resultados con una foto polaroid (zona, tiempo, bajas, auto) que se puede guardar como PNG.
- Intro de 4 cuadros pixelados (casa que apaga la luz, bichos en el pasto, el auto se enciende entre juguetes, logo); solo en el primer arranque y desde Créditos.

Nota: de "Combate (agregado)" el resumen de impacto por arma, hit-stop, restos y cámara lenta final siguen vigentes; "verde fósforo = disparos propios" es de la etapa de terminal (ver Historia): hoy cada arma usa su color. La intro de 4 cuadros mantiene su arte pixelado de noche.

## Referencia técnica vigente

### Giro a Megabonk (2026-10-03)
Las partidas son **de día**: sol alto, cielo azul, colores saturados (desat ~1), low-poly con texturas pixeladas y contornos suaves.
Los climas nocturnos siguen en `CLIMATES` solo para el lab. El faro del auto queda casi apagado de día (`day` en `Climate`). Esta sección reemplaza lo de "noche" y "un solo foco duro" de arriba.

### Folded 2.5D (sistema base, 2026-10-07)

**Qué es:** mundo 3D completo construido como papercraft y fabricado como chatarra industrial: superficies simples plegadas y
ensambladas (chapa, perfiles, remaches) cuya riqueza sale del material, la textura procedural, los trims, los calcos y la luz.
No es papel, cartón, foam ni sprites. Orden de diseño: silueta → material → color → detalle. Referencia: el gabinete de
Junket Crush (`src/match3_scene.ts`) y las láminas de `docs/images/`. Inventario y clases A–F: `docs/ASSET_INVENTORY.md`.

**Regla 360°:** enemigos, criaturas, vehículos, destructibles, cajas, barriles, máquinas y props cercanos son volumen real
(frente, atrás, lados, arriba, grosor, uniones). Planos solo en partículas, humo, vegetación lejana, fondo, y planos
"inteligentes" (alas, carteles, placas) con grosor mínimo y unión visible. Validar en el banco `?folded`
(`npm run shots -- --only folded`: 0/90/180/270 + arriba) y en las cámaras reales de cada modo.

**Paleta:** `PAL` (= `M3C`) en `src/kit3d.ts` es la fuente única: acentos de la guía UI (amarillo #FFB400, naranja #FF9138,
rojo #FF3B2E, cian #00C2FF, verde #22C55E…), fondos (#0B0F14, #14181F, #1F2937) y metales (metalClaro #9aa0a8, metalOsc #262a30,
oxido #5c3a24, chapa #b5651d). `kit.css` copia los mismos HEX en `--jm-*`: si cambia uno, cambiar los dos. `FOLD_PAINT` = chapas
apagadas para utilería (no compiten con enemigos).

**Materiales (`FOLD`, `src/folded.ts`):** `painted(color, wear, seed)`, `bare`, `rust`, `dark`, `rubber`, `plastic(color)`,
`screen(color)`, `emissive(color)`, `trim`, `decal`. Todos PBR estándar con `snapMat` (vértices pixelados del mundo, igual
que `pbr()`); se crean una vez por combinación y se cachean. Variantes por parámetro, nunca un pipeline nuevo.

**Desgaste:** `wear` 0..1 controla pintura saltada en bordes y esquinas y mugre (no ruido uniforme); sobre 0,5 asoma óxido bajo
la pintura. Bordes, ruedas, uniones y zonas de contacto se gastan más: usar wear alto en piezas de contacto y bajo en paneles grandes.

**Trim sheet (`TRIM`):** una textura de 256x256 con 8 franjas: hazard, junta (soldadura), remaches, rejilla, borde gastado,
perfil, tornillos, óxido. `geoKit.trimStrip(len, h, fila)` la aplica con volumen y repetición a lo largo.

**Calcos (`DECALS`):** atlas 512x256 de 8: warning, numero, flecha, calavera, label, rayon, mancha, voltaje. `geoKit.decal(id, lado)`
pega un plano sobre una cara (zOffset, recorte por alfa). Textos del mundo en inglés (no son UI).

**Kit de geometría (`geoKit(scene, add)`):** box, cyl, sph, tube, bend (doblez), panel (chapa con cantos doblados), plate
(placa atornillada), foldBox (caja plegada con flejes y pestañas), profile (L), grate (rejilla), hinge (bisagra), wheel (rueda
con banda y maza), bracket (escuadra), trimStrip, decal; remaches y tornillos se acumulan y `thin()` los vuelve thin instances.
`add` decide qué hacer con cada malla (el gabinete fusiona por material).

**Optimización:** fusionar por material (una malla por material por objeto/plantilla), remaches/tornillos en thin instances,
enemigos siguen siendo instancias de plantillas (`template()`), texturas ≤256 sin filtrar y compartidas, nada de 4K por objeto.
Preferir generar en build (scripts → GLB/atlas) a armar pesado en runtime.

**Pipeline para un enemigo nuevo (sin abrir Blender desde cero):** 1) base: esqueleto/colisión del GLB existente o un `DEF` en
enemies.ts; 2) silueta: 3-5 volúmenes grandes con `geoKit.panel`/`foldBox`; 3) placas: `plate` y `bend` en uniones;
4) material: `FOLD.painted` + `bare`/`rust` en articulaciones; 5) paleta: un acento de `PAL` por identidad; 6) calcos: número o
warning con `decal`; 7) desgaste: wear alto en patas y bordes; 8) animar: pivots en articulaciones (TransformNode) y VAT/plantilla
como hoy. Mirarlo en `?folded` a 360° antes de llevarlo a la partida.

**Activo por defecto (2026-10-07):** todo el juego usa Folded (`FOLDED_SLICE = true` en `src/folded.ts`; ya no hay bandera
`?folded2`). Modelos en `src/folded_slice.ts`: bichos (`PROC`), jefes sin clips, mascotas jefe con clips (`PETS`), los 8 autos
(`carHull` + `foldWheel`, también en Carrera), cerca, cajas y utilería del mundo (lata, herramientas, regadera, auto real, labio de
rampa). Los GLB viejos (`public/models/*.glb`, `public/models/cars/`) y los procedurales anteriores siguen en el repo sin usarse.

**Atlas:** las piezas armadas con `kit()` llevan sus UV a una celda de 64 px de un atlas único de 1024 (albedo + metal/rugosidad +
emisivo; 256 celdas): una plantilla Folded queda en 2-3 submallas (atlas, trim, calcos) en vez de una por color.

**procBake (`src/glb.ts`):** un modelo Folded se arma en piezas, cada pieza móvil marcada con `bone(i)` (peso 1), y sus poses se
hornean al mismo VAT y escala de nodo (`GLB[k].visual`) que un GLB: cientos de instancias animadas con los draws de una. Bichos y
jefes simples: ciclo `walk` (10 cuadros) + `attack` (6). Mascotas: un tramo por clip con el mismo nombre y largo (24/s) que la
acción de Blender, así `SEQ` de enemies.ts y `glbPlay` no cambian. Colisión, IA y balance no se tocan (sim idéntica).

**Remaches:** en plantillas (piezas muy repetidas: bichos, autos, cerca, cajas) los remaches y tornillos se hornean como
cilindros de 6 lados y solo donde se leen; nada de remaches "reales" en piezas que se instancian cientos de veces (la cerca con
remaches de verdad eran 460k triángulos): usar la franja `remaches` del trim. Utilería que tiene colisionador derivado de su
malla (cilindro, casco convexo) se viste con `skin()` de world.ts: el colisionador viejo queda invisible y una instancia Folded
lo cubre, así la física y la semilla no cambian.

### Superficies: macro + detalle (2026-10-08)

- Todo piso grande se arma en dos escalas: **macro** (textura de color que cubre ~90 m, manchas con intención: pisado, quemado, húmedo; sin grano) y **detalle** (`surface(mat, perfil, repeticiones)` en `render.ts`, detailMap de Babylon: grano + relieve + brillo salidos de UNA altura, así el brillo sigue a la forma).
- Perfiles: `grass` (hojas peinadas), `soil`, `concrete`, `asphalt` (agregado pulido), `steel` (cepillado), `leaf` (follaje superpuesto), `brick`. Uno nuevo = un objeto en `SURF`.
- Escala del detalle: 1 texel ≈ 1 píxel a la distancia de juego (piso de partida: cada ~4,5 m). Más chico se pierde en el mipmap; más grande se ve la baldosa.
- Anisotropía por defecto 8 (Medio): el piso casi siempre se ve rasante.
- `flatten()` (models.ts) no aplana materiales con detalle: si un prop fusionado tiene que conservar relieve, usar `surface()`.

### Etapa 2: acabados (2026-10-08)

Nota: lo de sombras de noche, faro y resplandor aplica solo a los climas nocturnos (lab); de día mandan el sol y el hemisférico.

- **Desgaste:** vive en Folded (`wornCanvas` de `kit3d.ts` → celdas del atlas de `folded.ts`): pintura saltada concentrada en bordes, óxido desde esquinas y borde de apoyo, rugosidad/metal por zona (pintura, chapa expuesta, goma) en el canal ORM. Es la única fuente: no agregar máscaras paralelas en `render.ts`.
- **Sombras con tinte:** el rebote del hemisférico de noche es tierra cálida apagada (`NIGHT_GROUND`, render.ts), no negro: bajos y panzas se leen; el contraste lo da el faro.
- **Separación de siluetas:** `environmentIntensity` 0,65: Fresnel del cielo como filo frío en los contornos, sin luz extra (cada material ya usa sus 4 luces: hemi, luna, faro, resplandor).
- **Emisivo y bloom:** sin cambios (GlowLayer 0,35, bloom umbral 0,95): el brillo queda en ojos, faros y tuercas, sin velar el color.
- **Golpe recibido:** `glitchHit()` hace destellar rojo el resplandor del auto ~0,2 s (respeta modo calmo). El polvo de derrapes y aterrizajes es color tierra, no blanco.
- **Goma con polvo:** `FOLD.rubber` lleva franjas de tierra en los cantos de su celda (hombros de la banda y borde de apoyo), más mates (rugosidad 1); el centro de la banda queda goma negra.
- **Uniones oxidadas:** tornillos y remaches del kit usan `FOLD.bolt` (cabeza de acero con anillo de óxido) y la maza de la rueda es `FOLD.rust`. La pintura Folded baja a rugosidad 0,42 para separarse de la chapa expuesta (0,35 metal) y del óxido (0,95); el centro de cada cara conserva pintura.
- **Quitina:** `FOLD.chitin(color)` para bichos (hormiga, escupidora, escarabajo, polilla en las bandas, tarántula en cuerpo y bandas): color liso, rugosidad 0,28, cantos oscuros y mates, un reflejo ancho. Sin desgaste de chapa: la diferencia bicho/máquina se lee por material.
- **Máquinas:** robot y fricción con más desgaste de pintura (0,75-0,9). Todo es celda del atlas compartido: cero texturas ni materiales nuevos por objeto.

---

## Historia (no vigente)

Direcciones anteriores, conservadas como referencia. No usar para trabajo nuevo.

### Sensación
**Retro low-fi de la era PS1 (PSX-style), low-poly y luminoso.** Un auto RC en un patio que se vuelve noche mientras dura la partida.
Referencias de partida: Buckshot Roulette y Lethal Company, pero el norte es la estética PS1 en general. **No es terror ni tétrico**:
la escena se lee siempre bien. Low-poly sin verse cuadrado (nada de bloques). Decidida el 2026-10-03.
**Ajuste 2026-10-03: moderno + "crude/janky retro".** PS1 es sabor (píxel, dither, color 15 bits), no imitación: nada de affine warping,
Gouraud ni draw distance corta. Moderno en luz y feedback (bloom en emisivos, glitch VHS al recibir daño, apagón antes de cada jefe);
tosco y hecho a mano en la UI (cartas torcidas, bordes mordidos, cinta de papel, fuentes pixel VT323 + Silkscreen, animaciones a pocos cuadros).

### Paleta y render
- **Ciclo atardecer → noche:** cada partida arranca en ATARDECER y anochece entre el 20% y el 65% del tiempo hasta la noche de la semilla
  (noche de luna, niebla, farol ámbar, madrugada). El Perro llega de noche. Mañana y nublado existen solo para el lab. (src/run.ts: `mixClimate`, `nightfall`)
- **Paleta propia por clima** (`ramp`: sombra, medio, luz) que el post mezcla con el color: cada clima tiene identidad de color.
- **Faro del auto** (SpotLight, `setLamp`) + resplandor; el turbo hace destellar y abrir el cono.
- **Render PSX:** resolución interna baja (Calidad 1080p, Ultra 1440p, Equilibrado 720p, Rendimiento 540p) escalada sin filtrar;
  texturas procedurales ≤96 px NEAREST; temblor de vértices PS1 suave (`SnapPlugin`, `LOOK.snap`).
- **Post retro (shader `retro`):** contornos de 1 px por profundidad (sin pasto), paleta del clima, dither Bayer 4x4 + 32 niveles (15 bits),
  grano, scanlines, viñeta, aberración. Perillas en `LOOK` (render.ts), ajustables en vivo con el modo lab.
- **Código de amenaza:** rojo = ataque enemigo (escupitajo); verde fósforo = disparos propios (gomitas). No usar rojo para nada del jugador.
- **Identidad por emisivo:** ojos que brillan por tipo (hormiga rojo, escupidora ámbar, escarabajo lima, autito faros blancos, robot amarillo, Perro rojo);
  tuercas de XP emisivas.
- **Ambiente:** polvo flotando en el haz del faro; luciérnagas cuando anochece.

### HUD: terminal gastada del transmisor
Misma telemetría RC (batería por celdas, señal/XP, reloj, turbo, velocímetro, armas, flechas), vista como equipo de campo viejo en un monitor CRT:
fósforo verde sobre negro, bordes rectos, scanlines con parpadeo sobre todo el HUD.
- Cartas de mejora = monitores CRT: carcasa de plástico, pantalla con scanlines, se "sintonizan" al aparecer (keyframes `tune`/`off`),
  ícono SVG rasterizado a 24 px y escalado pixelado (`pixelateIcon` en ui.ts).
- Tipografía: **VT323** (datos) + **Silkscreen** (títulos y jefes). Fuentes locales (OFL).
- Prohibido: emojis, esquinas redondeadas, glassmorphism, pills genéricas, `system-ui`, blancos puros.

### Paleta de UI
| Rol | Hex |
|---|---|
| Carcasa | `#0b0d0a` |
| Panel | `#141813` |
| Línea / borde | `#2c3a28` |
| Texto (fósforo) | `#b9d3a4` |
| Texto secundario | `#5f7355` |
| LCD fondo / tinta | `#10170d` / `#8dff6a` |
| Señal (XP) | `#6fb3c4` |
| Batería OK / baja | `#7fbf5a` / `#d12a1c` |
| Turbo | `#e0a030` |
| Rareza: común / rara / épica / evolución | `#8a9a82` / `#6fb3c4` / `#9a6fb5` / `#e0a030` |
