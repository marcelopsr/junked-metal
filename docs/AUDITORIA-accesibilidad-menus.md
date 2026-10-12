# Auditoría de accesibilidad de los menús (T29)

Fecha: 2026-10-12. Solo lectura del código; medido con Playwright headless contra `rc-test` :5174 (respetando el candado), en 1280x720 (pc) y 390x844 táctil (cel). Capturas en `scratch/a11y/` (`pc-*.png`, `cel-*.png`, `resultado.json` con las mediciones crudas). Los números de línea son de `src/menu.ts`, `src/kit.css`, `src/menu.css`, `index.html` al momento de la auditoría (otros agentes editan esos archivos: pueden correrse unas líneas).

Pantallas cubiertas: principal, ENCORE (con bloque de sesión online, estado de sala, clave de grupo y récords, forzados visibles), Más modos, Configuración (Imagen, Audio, Controles, Accesibilidad), Codex, pausa y resultados. Además el modal de confirmación de compra.

## Resumen

| Prioridad | Cantidad |
|---|---|
| Crítico | 2 |
| Alto | 4 |
| Medio | 7 |
| Bajo | 5 |

Lo que está bien (medido): contraste de texto con los tokens `--jm-*` (todo texto de panel opaco >= 4,5:1, ver tabla); foco cian de 3 px visible en todos los botones, selects, sliders y fichas `.carc` (0 elementos sin anillo salvo los de H8/M5); no hay trampas de foco en las pantallas (Esc/Backspace/B siempre vuelven, salvo C1); `lang="es"`; los campos de ENCORE tienen `aria-label`; `#netSession` y `#netStatus` son `role="status" aria-live="polite"`; botones de pausa y resultados >= 44 px en pc; el anillo de foco se mantiene tras re-render (`renderConfig` restaura el foco).

---

## CRÍTICO

### C1. Backspace en "Clave de grupo" no borra y expulsa de ENCORE (teclado)
- Archivo: `src/menu.ts:403` (`const txt = ... e.target.type === "text"`) y `src/menu.ts:416` (`e.code === "Backspace"` -> `back()`); campo en `index.html:182` (`<input id="netKey" type="password">`).
- Evidencia (Playwright, pc): en `#netKey` se escribe `abc`, Backspace -> el valor sigue `abc` y la pantalla activa pasa de `scr-encore` a `scr-main`. Causa: el atajo "estoy escribiendo" solo contempla `type="text"`; el campo de clave es `password` y cae en la rama de menú (`preventDefault()` + `back()`). Además ArrowLeft/ArrowRight sacan el foco del campo (lo llevan a otro botón) en vez de mover el cursor. `#netCode` (sin `type`, o sea text) sí funciona.
- Efecto: quien entra con clave de grupo no puede corregir un error de tipeo; con teclado es un bloqueo funcional del login por clave.
- Arreglo mínimo: en 403 usar `e.target instanceof HTMLInputElement && /^(text|password|search)$/.test(e.target.type)` (o `e.target.matches("input:not([type=range])")`). Un cambio de una línea; mismo criterio en `menuPad` si algún día se escribe con mando.

### C2. Modal de confirmación de compra: el foco se escapa a lo de atrás (teclado y mando)
- Archivos: `src/menu.ts:302-309` (`askBuy`/`askClose`), `src/menu.ts:350` (`focusables()` solo mira `#scr-<actual>`, nunca `#ask`), `index.html:140`.
- Evidencia (Playwright, taller): con `#ask` abierto y el foco en "Comprar" (`askyes`), ArrowDown deja el foco en la pestaña "CHASIS" de la pantalla de atrás (`inAsk:false`); ArrowUp igual. Seis Tab seguidos recorren solo pestañas del Taller (`FUERA:` en los 6): el diálogo no atrapa el foco. Enter/A activa entonces un botón oculto bajo el modal (comprar otra cosa o cambiar de pestaña sin ver nada). Además `#ask` no tiene `role="dialog"`, `aria-modal` ni nombre accesible.
- Arreglo mínimo: (1) `focusables()` devuelve los botones de `#ask` cuando `askFn` está activo (`const root = askFn ? "#ask" : "#scr-" + current()`); (2) `#ask`: `role="dialog" aria-modal="true" aria-labelledby` apuntando al `.otitle` (darle `id`); (3) opcional: `inert` en el `.scr.on` mientras el modal está abierto (cubre Tab nativo).

---

## ALTO

### A1. "Otras formas de entrar" (GitHub y clave de grupo) es inalcanzable con flechas y mando
- Archivos: `src/menu.ts:350` (el selector de `focusables()` no incluye `summary`), `index.html:180-184` (`<details id="netAlt">`).
- Evidencia: `encoreDetails.summaryInFocusables = false`; los botones internos con el `details` cerrado tienen `offsetParent` nulo y se filtran. Con el mando (cruceta/stick) nunca se puede abrir el `<summary>`; con teclado solo con Tab. Resultado: el login con GitHub y con clave de grupo no existe para quien juega con mando, y Space/Enter sobre `summary` tampoco se contemplan en `activate()` (`.click()` sí lo abre, pero no hay cómo llegar).
- Arreglo mínimo: agregar `summary` al selector de `focusables()` y, tras `.click()`, el `details` abierto ya hace visibles sus botones. Alternativa más simple: dejar `netAlt` siempre abierto (quitar `<details>`).

### A2. Texto de estado (aria-live) sobre la escena 3D sin fondo propio: contraste ~1,5:1 estimado
- Archivos: `src/menu.css:19` (`.foot { color:#fff1cf; text-shadow:0 2px 0 #3a2a1c }`), usado por `#netSession`, `#netStatus`, `#mainInfo`, "Otras formas de entrar", textos explicativos de ENCORE (`index.html:169-170`).
- Evidencia: captura `scratch/a11y/pc-encore.png` y `cel-encore.png`: "Sesión: jugador (GitHub)", "Otras formas de entrar" y "Sala creada: ABC123" quedan sobre la mesa beige de la escena (~#D8C6A0 por muestreo visual) con texto casi blanco (#FFF1CF): ~1,5:1 sin la sombra; solo se leen por el filo oscuro de 2 px. Es justo el texto que informa errores y estado ("No se pudo crear la sala...", "Escribir la clave de grupo."). El contraste depende del plano de cámara de `menuscene.ts`, por eso no es estable.
- Arreglo mínimo: dar a `.foot` dentro de `.list` y a `#netStatus/#netSession/#mainInfo` el fondo de chapa de los avisos (`.note`/`.jm-tip`: `background: rgba(11,15,20,.9); padding: 6px 10px; border:1px solid var(--jm-borde)`), igual que ya se hace con `.briefCard`. Con `#0B0F14` al 90 % el par con `#fff1cf` da > 15:1.

### A3. Pestañas de Configuración a 38 px en celular (objetivo táctil < 44)
- Archivo: `src/kit.css:177` (`#tabs .tab { min-height: 38px; }`) gana por especificidad (id) a `src/menu.css:449-450` (`@media (pointer:coarse) { .tab ... min-height: 44px }`).
- Evidencia (cel, Configuración y las 4 pestañas): los 6 botones `.tab` miden 38 px de alto (IMAGEN 77x38, JUEGO 69x38, AUDIO 67x38, CONTROLES 101x38, ACCESIBILIDAD 124x38, DATOS 69x38).
- Arreglo mínimo: en `src/menu.css` dentro del bloque coarse: `#tabs .tab { min-height: 44px; }` (o borrar `kit.css:177`).

### A4. Sin soporte de `prefers-reduced-motion` en los menús (y "Reducir parpadeos" no cubre todo)
- Archivos: `src/menu.css:5` (`.scr.on { animation: tune .45s steps(9) }`), `:10` (zap), `:21` (`.press` parpadea), `:426` (`.stamp`), `:659` (`.bindnote` parpadea), `src/style.css:158-159` (iconos de cartas `ico-float` infinito), `src/menu.css:614` (`#bmsg.pop`). Solo existen reglas `@media (prefers-reduced-motion)` en `src/load.css:42` y `src/match3.css:197`; el resto depende del interruptor propio `body.calm` (`menu.ts:207`), cuyo valor por defecto es `false` (`menu.ts:66`) y no se inicializa desde el sistema.
- Evidencia (Playwright con `emulateMedia({reducedMotion:"reduce"})`): en el título sigue corriendo `blink@press` (parpadeo 1,1 s infinito); `getComputedStyle(#scr-main).animationDuration` sigue en `0.45s`; la transición con efecto de tubo/estática (`zap` y `tune`) corre completa en cada cambio de pantalla. `body.calm` además no apaga `.bindnote` (parpadeo 1 s mientras se reasigna una tecla) ni `.stamp` ni `ico-float`.
- Arreglo mínimo: (1) un bloque `@media (prefers-reduced-motion: reduce) { .scr.on, #fe.zap::after, .press, .stamp, .bindnote, .offer .art svg { animation: none !important; } }` en `menu.css`; (2) en el arranque, `save.calm ??= matchMedia("(prefers-reduced-motion: reduce)").matches` solo para instalaciones nuevas; (3) sumar `.bindnote` y `.stamp` a la lista de `body.calm`.

---

## MEDIO

### M1. Tab llega al canvas del juego y al HUD con el menú abierto
- Archivos: `index.html:15` (`<canvas id="c">`, Babylon le pone `tabindex="1"`), y elementos del HUD enfocables detrás de la pausa.
- Evidencia: en todas las pantallas el ciclo de Tab pasa por `BODY` y luego `#c` (`inFe=false`, `outline: none`, sin etiqueta): una parada de foco invisible. En pausa (pc y cel) Tab sale del menú hacia el elemento del HUD "-67 dBm SNR" y `#c`; en celular también a `#tPause` y los botones táctiles (`#tDrift`, `#tJump`...). Con el foco en `#c` las flechas llaman a `focusables()[0]` (el foco salta solo) y es confuso con lector de pantalla.
- Arreglo mínimo: `canvas.tabIndex = -1` tras crear el motor (con `aria-hidden` o `role="img" aria-label`); poner `inert` en `#hud`/`#touch` mientras haya pantalla activa en `#fe` (y quitarlo al reanudar).

### M2. Objetivos táctiles < 44 px que quedan (celular 390x844)
- Evidencia (cel): `#overPhotoBtn` "Guardar foto" 93x32 (`src/replay.css:24`: `padding: 8px 14px; font-size:13px` sin el `min-height` coarse); botones de resultados (`Repetir` 78x42, `Ir al Taller` 142x42, `Menú` 93x42) y de Perfiles (`Guardar` 84x42, `Usar` 58x42, campo de nombre 136x35; `src/menu.css:652` `#opts .row.prof button/input { padding: 6px 10px }`); enlaces del menú principal en apaisado (`menu.css:542`: `min-height: 36px` en `@media (orientation: landscape) and (max-height: 500px)`; en vertical dan 44).
- Arreglo mínimo: en el bloque `@media (pointer: coarse)` de `menu.css:449` agregar `.polaroid button, #opts .row.prof button, #opts .row.prof input, .list.row3 button { min-height: 44px; }`; y el apaisado: `min-height: 44px` en `menu.css:542` o aceptar 36 como excepción documentada de alto 390.

### M3. Pestañas y interruptores sin semántica (roles/aria)
- Archivos: `src/menu.ts:1109` (pestañas `<button class="tab">`, la activa solo con clase `.on`), `src/menu.ts:1132` (interruptores: `<button class="row" data-tog><b class="jm-sw">SÍ/NO</b></button>`, con `font-size:0` en `kit.css` `.jm-sw`), Chatarroteca/Taller/Garaje (`data-btab`, `data-stab`, `data-gtab`).
- Evidencia: `#tabs` sin `role="tablist"`, ningún `aria-selected`; interruptor sin `role="switch"` ni `aria-checked` (`togRole:null`, `togAria:null`): el lector anuncia "botón, Silencio (M)" y el estado depende del texto oculto por tamaño 0.
- Arreglo mínimo: al generar las pestañas `role="tab" aria-selected="${id===tab}"` y `role="tablist"` en el contenedor; al generar `data-tog`: `role="switch" aria-checked="${!!val}"`. Son atributos en dos plantillas HTML de `menu.ts`.

### M4. Fichas `div tabindex="0"` sin rol ni acción anunciada
- Archivos: `src/menu.ts:729-750` (autos, pilotos, habilidades, armas: `<div tabindex="0" class="carc ...">`), `:1319-1390` (Chatarroteca/logros), `:1448-1454` (bloques de ficha).
- Evidencia: tabindex en `div` sin `role` ni `aria-pressed`/`aria-selected`; el estado "elegido" (`.sel`) y "bloqueado" (`.locked`) es solo visual; el panel de Garaje se activa con Enter/clic pero el lector solo lee texto. Los bloques de Chatarroteca (`.bblock tabindex=0`) son paradas de Tab sin función (ruido).
- Arreglo mínimo: fichas accionables -> `<button>` o `role="button"` + `aria-pressed` (o `aria-current`) y `aria-disabled` para bloqueadas; bloques informativos: quitar `tabindex="0"` o dejarlo solo en contenedores con scroll.

### M5. Anillo de foco debilitado en campos de texto de Perfiles y casillas de teclas
- Archivos: `src/menu.css:658` (`#opts .row.prof input:focus { outline: none; border-color: var(--turbo) }`), `:655` (`.slot2:focus { border-color }`), `:86` (`#paint .hrow input:focus` 2 px).
- Evidencia: el campo "Nombre del perfil" pierde el outline cian de 3 px y solo cambia el borde de 1 px de gris a amarillo (fila sin contraste claro vs el fondo `#0B0F14`: borde 1 px = 1,86:1 -> amarillo 10,8:1, pero 1 px es menos que el mínimo de 2 px de WCAG 2.4.11). El usuario no ve dónde está el cursor al navegar con mando.
- Arreglo mínimo: borrar `outline: none` en `menu.css:658` para que valga el anillo cian de `kit.css:76` (ya cubre `input`), y en `.slot2:focus` dejar el outline en lugar de solo el color del borde.

### M6. No hay anuncio del cambio de pantalla ni estructura de encabezados/landmarks
- Archivos: `index.html:139-400` (cada `<section class="scr">` sin `aria-labelledby`, títulos `div.otitle`/`div.brand`, `<nav class="list">` sin nombre), `src/menu.ts:230-260` (`show()`).
- Evidencia: `h1/h2` = 0 en todo el árbol de menús; ninguna región `aria-live` en resultados (el título "FIN DE LA PARTIDA", el récord nuevo y "Alcanza para algo nuevo en el Taller" no se anuncian: `overLive.anyLive=false`); el foco salta al primer botón ("Repetir") y el lector solo dice eso. Lo mismo al entrar a pausa o ENCORE.
- Arreglo mínimo: `.otitle`/`.brand` de cada pantalla a `role="heading" aria-level="1"` (o `<h1>`) y `aria-labelledby` en la `<section>`; en `show()` poner `aria-live="polite"` en un `<div class="sr-only" id="scrAnnounce">` y escribir el título; en resultados, `role="status"` en `#overTxt`/`#overRec`/`#overShop`.

### M7. Dos botones del bloque online sin nombre accesible computable en el árbol, y campo de clave con placeholder redundante
- Archivo: `index.html:181,183`.
- Evidencia: el script marcó `#netLogin` y `#netKeyGo` como "noname" porque su texto está dentro de un `details` cerrado (display none) al medirlos; con el `details` abierto el nombre sale del texto. No es un fallo real hoy. Lo medible: el `placeholder` ("Clave de grupo") es el único rótulo visible del campo y desaparece al escribir; `aria-label` ya está bien.
- Arreglo mínimo: nada obligatorio; opcional un `<label>` visible encima del input. (Se deja por trazabilidad: no cuenta como defecto salvo que el `details` pase a ser nodo oculto con `aria-hidden`.)

---

## BAJO

- **B1. `.foot` del bloque online mezcla estados.** `#netSession` (`index.html:178`) tiene `role="status"` pero empieza `hidden` y su texto cambia mientras está oculto; algunos lectores no anuncian cambios en regiones recién mostradas. Arreglo: quitar `hidden` y vaciar el texto, o dejar `role="status"` en un contenedor fijo y mostrar/ocultar solo el hijo.
- **B2. Teclas de mando en la prueba de control (`kbd.pb.gen`, `.pt-bt kbd { opacity:.35 }`).** `menu.css:679`: texto `#10170D` sobre `#D6DDE4` baja a ~2,15:1 por la opacidad de "no presionado". Es un indicador de estado, no texto de lectura; subir a `opacity:.6` (>= 3:1) alcanza.
- **B3. Selects de 36 px en pc.** `kit.css` `select { min-height: 36px }`, `.tab` 36-38 px, enlaces del principal 40 px en mouse: cumplen la regla táctil porque en coarse suben a 44, pero con mouse/mando quedan bajo 44. Aceptable por diseño; anotarlo.
- **B4. CSS muerto.** `src/menu.css` mantiene `#netKeyBox` (`.hidden`/`grid`) sin elemento en `index.html`. Borrar.
- **B5. Entradas bloqueadas del Codex como `???` y pie de pausa con texto en capas.** `src/menu.ts:226` (`["???", ""]`): el lector lee "interrogación" sin contexto; usar `aria-label="Destino sin descubrir"`. En pausa, `#pauseHint` ("ESC sigue · M sonido") menciona teclado aun con mando o táctil (`menu.ts` pone `ESC` fijo); mostrar la ayuda según el último dispositivo usado.

---

## Contraste calculado con los tokens `--jm-*` (WCAG 2.x)

Pares sobre los fondos reales de panel (`kit.css:9-19`):

| Texto | Sobre fondo `#0B0F14` | Sobre panel `#1F2937` | Sobre botón `#2B3442` | Veredicto |
|---|---|---|---|---|
| `--jm-texto` #F8FAFC | 18,37 | 14,03 | 12,00 | Pasa AAA |
| `--jm-texto2` #9CA3AF | 7,57 | 5,78 | 4,95 | Pasa AA (justo en botón; no bajar el tono) |
| `--jm-amarillo` #FFB400 | 10,78 | 8,23 | 7,04 | Pasa AAA |
| `--jm-amarillo2` #FFD166 | 13,33 | 10,18 | 8,71 | Pasa AAA |
| `--jm-naranja` #FF9138 | 8,57 | 6,54 | 5,60 | Pasa AA |
| `--jm-cian` #00C2FF | 9,30 | 7,10 | 6,07 | Pasa AAA |
| `--jm-verde` #22C55E | 8,43 | 6,44 | 5,51 | Pasa AA |
| `--jm-rojo` #FF3B2E | 5,42 | 4,14 | 3,54 | Pasa solo sobre fondo; en panel/botón NO para texto chico (usar solo en >= 18,66 px negrita o con icono) |
| `--jm-morado` #8B5CF6 | 4,54 | 3,47 | 2,97 | Sobre panel/botón no apto para texto |
| Borde `--jm-borde` #374151 vs fondo | 1,86 | - | - | Borde decorativo: no cumple 3:1 como único indicador de límite de control (ver M5) |
| `--jm-chapa` #B5651D borde de panel | 4,43 | 3,39 | - | Pasa 3:1 como borde de componente |

Botones llenos: texto `--jm-fondo` sobre `--jm-amarillo` 10,78 (amarillo2->#C98A00 6,52 en el degradé), sobre verde 8,43 (en el extremo oscuro del degradé #15803D baja a 3,83, pero el texto queda en la zona media: medición real del texto "Repetir" con el algoritmo aproximado marcó 3,83; no es fallo). Foco cian sobre botón amarillo enfocado: el anillo queda por fuera con `outline-offset` 2-3 px sobre la escena/panel oscuro: contraste del anillo vs panel 7,10, correcto (el par cian/amarillo, 1,16, no se usa porque no se tocan).

Medición automática del DOM (texto visible, fondo efectivo aproximado por capas): 0 incumplimientos en principal, modos, ENCORE, Configuración (Imagen/Audio/Accesibilidad), Codex, pausa y resultados; los únicos hallazgos fueron B2 (kbd de prueba) y el falso positivo del degradé de "Repetir". Lo que no se puede medir con CSS es el texto sin panel sobre la escena (A2).

---

## Orden sugerido de arreglo

1. C1 y C2 (una línea y unas pocas líneas en `menu.ts`/`index.html`): bloquean login por clave y comprar con mando/teclado sin riesgo.
2. A1, A2, A3 (selector de `focusables`, fondo de `.foot`, un selector CSS).
3. A4 + M1 (reduced motion con un bloque CSS; `inert`/`tabIndex` del canvas y HUD).
4. M2-M6 (semántica: tablist/switch, rol de fichas, anuncio de pantalla) en una sola pasada sobre las plantillas de `menu.ts`.
5. Bajos al final.

## Limitaciones

- No se probó con lector de pantalla real (NVDA/VoiceOver) ni con mando físico: el comportamiento "mando" se infiere de `menuPad`/`move()` (misma función que el teclado) y de lo medido con flechas.
- El estado "sesión iniciada", "sala creada" y la lista de récords se forzaron por DOM (sin red), para ver el diseño; el texto real viene de `src/main.ts:633-689` y `src/net.ts`.
- La pausa en celular se midió con la pantalla de pausa abierta por el botón `#tPause`; el resto de pantallas no depende del dispositivo salvo lo anotado.
- Contraste sobre escena 3D (A2) es estimación visual del color de fondo, no un cálculo por píxel.
