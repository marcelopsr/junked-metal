# Junket Crush (match-3 arcade)

Actualizado: 2026-10-08. Antes se llamó "Chatarra alineada" (gabinete de un nivel de 90 s); hoy es una campaña de 10 niveles con mapa, estrellas y herramientas. Modo lateral: **no da tornillos ni logros** (decisión del usuario, 2026-10-08; está aislado de la economía de Supervivencia). Sí guarda su propio progreso en `save.m3`.

## Acceso

- Menú principal → **Junket Crush** (botón `data-go="match3"` en `index.html`).
- Dev: `?mute&match3` (semilla opcional `&seed=N`, por defecto `20261007`). `__match3` existe solo tras entrar al modo.
- Carga perezosa: `main.ts` hace `import("./match3")` al entrar (`loadMatch3()`); `match3.css` y `duel.css` quedan importados de forma estática antes de `kit.css` para no pisar sus reglas.

## Flujo

Mapa de niveles (nodos con estrellas, "La Ruta del Desguace") → ficha del nivel (descripción, consejo, Jugar) → tablero → resultado (estrellas, récord, recompensa; Siguiente / Repetir / Mapa). Un nivel se abre al ganar el anterior.

- Pausa: **Esc**, botón táctil **II** o gamepad. En pausa: Reanudar, Reiniciar, Mapa, Opciones (abre la Configuración global y vuelve a la pausa) y salir con confirmación si hay progreso en la partida.
- HUD: movimientos restantes y objetivos con icono de forma + barra (no solo color).

## Campaña (`src/match3_levels.ts`)

Solo datos: un nivel nuevo = un objeto más (forma en `LevelDef`, `src/match3_logic.ts`). Cada nivel define tablero (`layout`), tipos de pieza, movimientos, objetivos, umbrales de estrellas, y opcionalmente herramientas de prueba, recompensa y trituradora.

| # | Nivel | Zona | Mov. | Objetivos |
|---|---|---|---|---|
| 1 | Primeras tuercas | Taller chico | 18 | 1800 puntos |
| 2 | Chatarra en cadena | Taller chico | 18 | 32 tuercas (recompensa: 2 martillos) |
| 3 | Cuatro son mejor | Montaña de chatarra | 22 | 22 cristales y 3500 puntos |
| 4 | El taller desordenado | Montaña de chatarra | 22 | 16 cajas |
| 5 | Sobrecarga | Zona de clasificación | 17 | 6500 puntos |
| 6 | El desguace | Zona de clasificación | 22 | 20 óxidos |
| 7 | Reacción industrial | Fábrica oxidada | 20 | 24 baterías, 24 chips, 6 cajas |
| 8 | Cargamento perdido | Depósito de maquinaria | 30 | 3 cargas |
| 9 | Fábrica en crisis | Planta de reciclaje | 30 | 8 cadenas, 12 cajas, 12 óxidos |
| 10 | El Gran Aplastador (jefe) | La trituradora | 32 | 14 cajas, 2 cargas, 2 cadenas; la trituradora tira una caja cada 4 movimientos |

Piezas: 0 tuerca, 1 cristal, 2 batería, 3 chip, 4 componente, 5 resorte. Celdas del `layout`: `.` pieza al azar, `#` hueco, `c`/`C` caja de 1/2 golpes, `r` óxido, `k` cadena, `g` carga, `0`-`5` pieza fija.

## Reglas

- Intercambio solo horizontal o vertical entre vecinos; sin grupo de 3+ el intercambio se revierte y **no** consume movimiento.
- Especiales: 4 en línea = sierra (barre su fila o columna), L = bomba, T = prensa, 5 = núcleo (borra un color). Dos especiales juntos se combinan (sierra + sierra = cruz, bomba + bomba = 5x5, núcleo + pieza = todas de ese color). Un especial alcanzado se dispara en cadena.
- Obstáculos: cajas (golpe desde una línea vecina), óxido, cadenas y cargas (salen por el fondo).
- Cascadas dentro del mismo movimiento; sin jugadas posibles: barajado automático sin penalidad.
- Herramientas: martillo, sierra, imán y llave; **no gastan movimientos**. Se ganan como recompensa de primera victoria y se guardan en `save.m3.tools`.
- Victoria al cumplir todos los objetivos (también en el último movimiento); derrota al quedarse sin movimientos. Los movimientos sobrantes dan la sobrecarga final (bonus de puntos).

## Estrellas y guardado

`starsFor()` da 1 estrella al ganar (exige objetivos), 2 y 3 por puntaje (`stars: [1.ª, 2.ª, 3.ª]` del nivel). Se guarda por id de nivel en `save.m3 = { stars, best, tools }` (`src/menu.ts`; validado en `src/savefmt.ts`): máximo de estrellas, mejor puntaje y herramientas. La recompensa de un nivel se entrega solo la primera vez que se gana.

## Balance

`test/match3_balance.test.ts` juega cada nivel con un bot codicioso (elige la jugada que más avanza los objetivos) y sirve para ajustar movimientos y estrellas; `M3_REPORT=1 npx vitest run test/match3_balance.test.ts` imprime la tabla de victorias y puntajes. Los números de la tabla de arriba son los vigentes en el código; ante cualquier duda manda `match3_levels.ts`.

## Animación

Intercambio, eliminación (fade + pop), caída por celda y entrada de piezas nuevas desde arriba; cascadas encadenadas en secuencia. Intercambio inválido: rebote sin consumir movimiento. Con **reducir movimiento** / clase `calm`: resolución casi instantánea.

## Archivos

- `src/match3_logic.ts`: motor puro (tablero, grupos, especiales, obstáculos, herramientas, estrellas), sin Babylon ni DOM.
- `src/match3_levels.ts`: campaña de 10 niveles.
- `src/match3.ts`: flujo (mapa, nivel, resultado), interfaz HTML, pausa, guardado.
- `src/match3_scene.ts`: gabinete 3D Folded (desgaste con `edgeRust`, póster, pantalla emisiva).
- `src/match3_draw.ts`: dibujo 2D del tablero, mapa y piezas.
- `src/match3.css`: marquesina y paneles.
- `test/match3.test.ts` (reglas y campaña) y `test/match3_balance.test.ts` (bot por nivel).

## Presentación

- Piezas con forma propia por color, degradado, contorno tinta y brillo especular (`match3_draw.ts`); casillas con hueco oscuro, sombra interior arriba y bisel claro abajo.
- Cámara (`fitMatch3Camera`): centrada en la pantalla, el tablero ocupa ~60 % del alto en compu y casi todo el ancho en celular; la marquesina asoma arriba.
- Peso: aplastado al aterrizar, destello de casilla al limpiar, esquirlas del color de la pieza, micro sacudida en combos de 4+.
- Sin texturas nuevas: todo es canvas 2D sobre la pantalla emisiva del gabinete. Capturas de referencia: `docs/visual/2026-10-08-base/pc-match3-*.webp`.
