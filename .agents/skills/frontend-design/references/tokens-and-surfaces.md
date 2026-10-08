# Tokens de Color y Superficies de UI — Junked Metal (Vigente 2026-10-08)

Fuente única de verdad: `:root` en `src/kit.css` y `PAL` / `M3C` en `src/kit3d.ts` (`docs/ART_DIRECTION.md`, `DESIGN.md`). Si cambia un HEX en uno, actualizar ambos.

## 1. Paleta Oficial (`--jm-*` / `PAL`)

| Rol | Token CSS | Valor HEX | Uso principal |
|---|---|---|---|
| Acento primario | `--jm-amarillo` / `--jm-amarillo2` | `#FFB400` / `#FFD166` | Pestañas activas, bordes de selección, estrellas, turbo/evolución |
| Acento secundario | `--jm-naranja` | `#FF9138` | Acentos cálidos, subtítulos destacados, calor industrial |
| Amenaza / Peligro | `--jm-rojo` | `#FF3B2E` | Exclusivo para enemigos, daño recibido y botones `.danger` (nunca jugador) |
| Señal / Foco | `--jm-cian` | `#00C2FF` | Foco de teclado/gamepad (`3px solid`), XP/señal, acentos eléctricos |
| Acción / Vida OK | `--jm-verde` | `#22C55E` | Botones `.primary`, barra de vida del jugador, estados completados |
| Especial / Élite | `--jm-morado` | `#8B5CF6` | Enemigos élite, rareza épica/fusión |
| Fondos | `--jm-fondo` / `--jm-fondo2` / `--jm-panel` | `#0B0F14` / `#14181F` / `#1F2937` | Carcasa oscura y relleno opaco de paneles |
| Bordes y Chapa | `--jm-borde` / `--jm-chapa` / `--jm-chapa-osc` / `--jm-tornillo` | `#374151` / `#b5651d` / `#3a2414` / `#6b4a2a` | Marco de chapa con borde naranja gastado (3 px) y tornillos esquineros |
| Texto | `--jm-texto` / `--jm-texto2` | `#F8FAFC` / `#9CA3AF` | Texto principal alto contraste y texto secundario técnico |

## 2. Tipografía y Escala (`@fontsource/rajdhani`)
- **Fuente única vigente:** `Rajdhani, system-ui, sans-serif`.
- **Títulos y etiquetas (`700`, mayúsculas):**
  - Display: `clamp(46px, 9vw, 92px)`
  - H1 (`--jm-t-h1`): `clamp(30px, 4.2vw, 44px)`
  - H2 (`--jm-t-h2`): `22px`
  - Label / Kicker (`--jm-t-kicker`): `13px`, `letter-spacing: 0.16em`
- **Cuerpo funcional (`500`):** `16px` (`line-height: 1.35`).

## 3. Reglas de Copy
- **UI del juego (español neutro impersonal):** *"Presiona Espacio"*, *"Sobrevive 10 minutos"*, *"El auto quedó destrozado"*, *"Selecciona una mejora"*.
- **Prohibido:** voseo (*"Apretá"*, *"Sobreviví"*) y tuteo (*"Tu auto"*, *"Elegí"*).
- **Textos diegéticos del mundo 3D:** En inglés (*"JUNKET CRUSH"*, *"GOOD METAL / BETTER DAYS"*, *"PLAY / FIX - FIX / REPEAT"*).
