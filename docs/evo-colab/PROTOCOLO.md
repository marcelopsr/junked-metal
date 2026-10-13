# Protocolo del ciclo compartido

## Ciclo

| Paso | Qué | Quién |
|---|---|---|
| 1 | Definir objetivo del ciclo (auto, qué mejorar). Si es tema de ChatGPT, escribir un `ENCARGO.md`. | Persona o Claude |
| 2 | Correr `npm run evo -- --car <auto> ...` (opcional `--from <corrida>`); genera `.evo/<auto>/<corrida>/` con `hoja.png`, `run.json`, `index.html`. | Claude Code |
| 3 | Evaluación visual del evaluador interno (agente Claude) sobre `hoja.png`. | Claude Code |
| 4 | Evaluación externa: la persona sube `hoja.png` (+ contexto) a ChatGPT; este responde con `EVALUACION.md`. | Persona + ChatGPT |
| 5 | Cruzar votos y métricas; resolver desacuerdos (ver abajo). Si hay propuesta de ChatGPT, incorporarla (ver abajo) y volver al paso 2. | Claude Code (decide lo objetivo) / persona (lo subjetivo) |
| 6 | Exportar: `npm run evo -- --car <auto> --export <corrida> [--id iNN] --motivo "..."`. | Claude Code, con visto bueno de la persona si hay desacuerdo |
| 7 | Verificar con capturas (garaje y cámara de partida) según CLAUDE.md: `npx tsc --noEmit -p .`, `npm run shots -- --changed`. | Claude Code |
| 8 | Commit local, entrada en `BITACORA.md`, `RELEVO.md` si cambia de manos, resumen al usuario. | Claude Code |

## Reglas

1. Ningún cambio entra al juego sin pasar por `npm run evo` y cumplir las restricciones duras (identidad, choques rueda-carrocería, despeje, caja, triángulos, piezas sueltas, errores). `--export` rechaza lo que no cumple.
2. La evaluación de ChatGPT es un voto más. No reemplaza las métricas ni la evaluación visual interna.
3. ChatGPT propone en el vocabulario del sistema: genes (`car_genes.ts`), rangos, bandas (`BANDS` en `evo_probe.ts`) o piezas nuevas descritas en palabras. No entrega geometría libre ni parches que salten el ciclo.
4. Solo Claude Code escribe en el repo y commitea. Los parches de ChatGPT son propuestas.
5. Dirección de arte Folded obligatoria (`docs/ART_DIRECTION.md`): volumen real, chapa/perfiles/remaches, sin papel ni cartón, sin emojis. Textos en español neutro impersonal, sin voseo (las plantillas de este directorio incluidas).
6. Conservar el original: el genoma original sigue siendo la referencia y `--reset` siempre lo restaura. No borrar corridas ni entradas de `evo/historial.json`.
7. Cambios en tanda y una sola verificación al final, proporcional a lo tocado.

## Nombres de archivo

`AAAA-MM-DD-<auto>-<autor>.md`, con autor `claude`, `chatgpt` o `usuario`. Si hay varios el mismo día, sufijo `-2`. Carpetas:

- `docs/evo-colab/encargos/` encargos (`ENCARGO.md` completado)
- `docs/evo-colab/evaluaciones/` evaluaciones
- `docs/evo-colab/relevos/` relevos

Las carpetas se crean al primer uso. Referenciar corridas por su id (`20261013-1851-s5`) e individuos por `iNN`.

## Desacuerdos entre evaluadores

- Métrica dura (restricción incumplida, banda, triángulos, choques): gana la métrica.
- Subjetivo (silueta, identidad, Folded): se anotan ambos puntajes y argumentos en la bitácora; decide la persona. Mientras tanto no se exporta y queda vigente lo actual.
- Si un evaluador veta todas las variantes y el otro no, se corre otra ronda con la retroalimentación de ambos (`--from`) antes de decidir.

## Cómo incorpora Claude una propuesta de ChatGPT

1. Leer la propuesta y traducirla: gen existente (cambiar rango o `def` solo si conserva el original), gen nuevo (parametrizar con "valor original + delta" y verificar la huella de vértices), banda nueva o ajustada, o restricción.
2. Registrar la traducción en la bitácora (qué se tomó, qué no y por qué).
3. Correr `npm run evo` con la semilla y `--from` que corresponda.
4. Reportar a ChatGPT (por la persona) con un `RELEVO.md`: resultados, hoja nueva, qué cambió respecto de su propuesta.
5. Si la propuesta no se puede expresar con genes, anotarla como pendiente con la razón.
