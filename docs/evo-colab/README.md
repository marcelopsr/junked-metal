# Evolución de autos: colaboración Claude + ChatGPT

Mecanismo en Markdown para que Claude Code y ChatGPT (u otro modelo) sigan juntos la evolución generativa de la geometría de los autos de Junked Metal, cada uno a su manera, pasándose el trabajo por archivos `.md`. Fuente técnica del sistema: `docs/EVO_VEHICULOS.md`. Reglas del ciclo: `PROTOCOLO.md`.

## Qué es

Los autos tienen genes (medidas con rango en `src/car_genes.ts`). `npm run evo` los evoluciona, mide con restricciones duras y objetivos, y genera una hoja comparativa `.evo/<auto>/<corrida>/hoja.png`. Un evaluador visual la puntúa, la mejor variante se exporta al juego y se verifica con capturas. La dirección de arte Folded (`docs/ART_DIRECTION.md`) es obligatoria.

## Roles

| Quién | Acceso | Mejor uso |
|---|---|---|
| Claude Code | Repo, comandos, navegador headless | Ejecuta `npm run evo`, mide, integra genes/rangos/bandas, exporta, verifica con capturas, commitea (local), resume. Es el único que escribe en el repo. |
| ChatGPT (chat, sin repo) | Solo lo que se le adjunta | Evaluador visual independiente sobre `hoja.png`; diseñador que propone genes nuevos, bandas o rangos; crítico de dirección de arte; redacta propuestas de piezas. Responde con `EVALUACION.md` o `ENCARGO.md` completados. |
| ChatGPT con Code Interpreter / Codex | Archivos subidos o repo clonado | Lo anterior, más analizar `run.json` e `historial.json` (tendencias, genes que no varían, correlaciones) y proponer parches como diff. Un parche es propuesta: lo aplica y prueba Claude Code. |
| Persona (usuario) | Todo | Decide lo subjetivo, sube y baja archivos entre ambos, aprueba exportaciones al juego. |

## Cómo arrancar una sesión con ChatGPT

Adjuntar:
1. `docs/evo-colab/PROTOCOLO.md` y `docs/evo-colab/plantillas/EVALUACION.md` (más `ENCARGO.md` si se le pide diseñar).
2. `docs/evo-colab/BITACORA.md` (últimas entradas) y el último `RELEVO.md` si existe.
3. La imagen `.evo/<auto>/<corrida>/hoja.png` (y, si se quiere, 2-3 PNG de `img/` del original y del vigente).
4. Opcional: `src/car_genes.ts` (lista de genes con rangos), `evo/historial.json`, y `run.json` de la corrida si usa Code Interpreter.
5. Tratado como referencia visual: la sección Folded de `docs/ART_DIRECTION.md`.

Prompt inicial (copiar y pegar):

```
Eres evaluador/diseñador externo de un sistema de evolución de autos RC para el juego Junked Metal (estilo Folded: chatarra industrial plegada, volumen real, chapa, perfiles, remaches; cámara de partida elevada, el auto se ve chico). Adjunto el protocolo, la bitácora y la hoja comparativa de la corrida actual (filas: original, vigente, finalistas; columnas: cámara de partida, 3/4, trasera, lateral, lejos).
Reglas: no tienes acceso al repo ni puedes correr nada; tu voto es uno más y las métricas duras mandan. Responde en español neutro, sin emojis, usando EXACTAMENTE la plantilla EVALUACION.md (puntajes 1-10 por silueta, proporciones, integración, identidad, Folded; ganadora; defectos; retroalimentación con nombres de genes de car_genes.ts; veredicto sí/no en garaje y en cámara de partida). Si se pide diseño, responde con la plantilla ENCARGO.md invertida: propuesta en términos de genes, rangos y bandas, nunca código ni geometría libre. Sé crítico: si ninguna variante supera al original, dilo.
```

Luego pegar la respuesta de ChatGPT en `docs/evo-colab/evaluaciones/AAAA-MM-DD-<auto>-chatgpt.md` (lo hace Claude Code o la persona) y anotarla en `BITACORA.md`.

## Archivos

- `PROTOCOLO.md`: ciclo, reglas, nombres, desacuerdos.
- `plantillas/ENCARGO.md`, `EVALUACION.md`, `RELEVO.md`: formatos de intercambio.
- `BITACORA.md`: registro cronológico de intercambios.
