# Encargo: <título>

- Fecha: AAAA-MM-DD
- De: <claude | chatgpt | usuario>  Para: <claude | chatgpt>
- Auto: <buggy | monster | ...>  Corrida de referencia: <id>

## Objetivo
Una o dos frases. Qué debe quedar mejor y cómo se nota (por ejemplo, desde la cámara de partida).

## Contexto
Estado actual en pocas líneas, decisiones ya tomadas, lo que ya se probó y no funcionó. Enlazar bitácora y relevo.

## Archivos adjuntos
- [ ] `hoja.png` de <corrida>
- [ ] `docs/evo-colab/PROTOCOLO.md`
- [ ] `src/car_genes.ts` / `evo/historial.json` / `run.json`
- [ ] Otros: ...

## Fuera de alcance
Qué no tocar (colisionador, cantidad de triángulos, otros autos...).

## Criterios de aceptación
- Cumple restricciones duras tras `npm run evo`.
- Medible: <objetivo/banda concreta>.
- Visual: <qué se debe leer en la hoja>.

## Formato de respuesta
Si es diseño: lista de propuestas, cada una con gen o banda, valor o rango propuesto, razón visual y riesgo. Si es evaluación: usar `EVALUACION.md`. Español neutro, sin emojis. Indicar qué es hecho, qué es opinión y qué no se pudo ver.
