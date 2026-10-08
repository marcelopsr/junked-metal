# Tokens de Color y Superficies de UI — Junked Metal

## 1. Paleta Base del HUD CRT (`docs/ART_DIRECTION.md`)

| Rol | Hex | Uso |
|---|---|---|
| Carcasa | `#0b0d0a` | Marco exterior de monitores y paneles |
| Panel | `#141813` | Fondo interior de módulos HUD |
| Línea / Borde | `#2c3a28` | Bordes rectos de 1–2 px, grillas técnicas |
| Texto primario (fósforo) | `#b9d3a4` | Lecturas principales, etiquetas activas |
| Texto secundario | `#5f7355` | Subtítulos, unidades, etiquetas pasivas |
| LCD fondo / tinta | `#10170d` / `#8dff6a` | Contadores digitales, velocímetro, reloj |
| Señal (XP) | `#6fb3c4` | Barra de señal/nivel, rareza rara |
| Batería OK / Amenaza | `#7fbf5a` / `#d12a1c` | Celdas de vida del auto / daño o peligro enemigo |
| Turbo / Evolución | `#e0a030` | Indicador de turbo, rareza evolución/dorada |
| Rarezas (Común / Rara / Épica / Evolución) | `#8a9a82` / `#6fb3c4` / `#9a6fb5` / `#e0a030` | Marcos y etiquetas de cartas de mejora |

## 2. Tipografías Empaquetadas (`package.json`)
- `@fontsource/vt323`: Datos numéricos, telemetría, descripciones técnicas en CRT.
- `@fontsource/silkscreen`: Títulos pixelados, alertas de radio, nombres de jefes, cabeceras de cartas.
- `@fontsource/rajdhani`: Interfaz de menús principales (`src/menu.css`), taller y pantallas de navegación.

## 3. Reglas de Copy (Español Neutro Impersonal)
- **Correcto:** *"Presiona Espacio para continuar"*, *"Sobrevive 10 minutos"*, *"El auto quedó destrozado"*, *"Selecciona una pieza"*.
- **Incorrecto (prohibido):** *"Apretá Espacio"*, *"Sobreviví"*, *"Tu auto quedó destrozado"*, *"Elegí lo que quieras"*.
