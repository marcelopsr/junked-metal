# Chatarra alineada (match-3 arcade)

Modo independiente: gabinete de 90 s estética Junked Metal, sin economía ni guardado.

## Acceso

- Menú principal → **Chatarra alineada** → **Jugar**
- Dev: `?mute&match3` (semilla opcional `&seed=N`)

## Interfaz integrada

- Pausa: **Esc**, botón táctil **II** (solo pausa en móvil) o gamepad (botón de pausa del perfil).
- En pausa: reanudar, reiniciar, **Opciones** (abre Configuración global del juego; volumen, calma/reducir movimiento, imagen, etc.) y abandonar con confirmación si hay progreso en la partida.
- HUD: movimientos restantes y objetivos con icono de forma + barra (no solo color).

## Nivel 1 (único)

| Parámetro | Valor |
|-----------|--------|
| Tablero | 8×8 |
| Tipos de pieza | 5 (tuerca, engranaje, pila, chip, tornillo) |
| Movimientos | 19 |
| Objetivo A | 18 tuercas (tipo 0) |
| Objetivo B | 18 engranajes (tipo 1) |
| Obstáculos / especiales | ninguno |
| Semilla inicial | `20261007` (reproducible; `&seed=` en dev) |

## Reglas

- Intercambio solo horizontal o vertical entre vecinos.
- Sin match de 3+: el intercambio se revierte y **no** consume movimiento.
- Tras un match válido: limpieza, objetivos, gravedad, relleno y cascadas en el mismo movimiento.
- Cada celda en cruce cuenta una sola vez hacia objetivos.
- Sin jugadas posibles: barajado automático sin penalidad.
- Si se completan los objetivos en el último movimiento, gana la partida.

## Balance

**Balance (comprobado):** simulación con bot aleatorio en 120 semillas (`test/match3_balance.test.ts`), semilla base `20261007`: ~**73 %** victorias y ~**34,7 / 36** piezas de objetivo de media con **19 movimientos** (antes 20 → ~80 % victorias, demasiado laxo para jugador atento). Objetivos siguen en 18 tuercas + 18 engranajes. La semilla fija permite repetir el tablero inicial; un humano que priorice objetivos debería superar al bot aleatorio.

## Animación

Intercambio, eliminación (fade + pop), caída por celda y entrada de piezas nuevas desde arriba; cascadas encadenadas en secuencia. Intercambio inválido: rebote sin consumir movimiento. Con **reducir movimiento** / clase `calm`: resolución instantánea.

## Archivos

- `src/match3_logic.ts` — reglas y estado
- `src/match3.ts` — gabinete 3D, textura del tablero, UI
- `src/match3.css` — marquesina y paneles
- `test/match3.test.ts` — pruebas unitarias

## Presentación

- Piezas: forma propia por color (tuerca, cristal, batería, chip, componente, resorte) dibujadas en `match3_draw.ts`, con degradado, contorno tinta y brillo especular; ocupan ~80 % de la casilla.
- Casillas: hueco oscuro con sombra interior arriba y bisel claro abajo (`match3.ts`).
- Gabinete: desgaste con `edgeRust` de `wornTex` (bordes, esquinas y apoyo; caras centrales sanas). Póster en español.
- Cámara (`fitMatch3Camera`): centrada en la pantalla, el tablero ocupa ~60 % del alto en compu y casi todo el ancho en celular; la marquesina asoma arriba.
- Peso: aplastado al aterrizar, destello de casilla al limpiar, esquirlas del color de la pieza y micro sacudida en combos de 4+ (especiales ya sacudían).
- Sin texturas nuevas: todo es canvas 2D sobre la pantalla emisiva del gabinete.
