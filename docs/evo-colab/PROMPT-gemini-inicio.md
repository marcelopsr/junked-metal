# Prompt de inicio para Gemini / Antigravity (primera conversación)

```text
Vas a continuar la línea de trabajo "evolución de la geometría de los autos" de Junked Metal, que hasta hoy llevaba Claude Code. Respondé siempre en español.

AUTORIZACIÓN: tenés autonomía total en este repo para esta línea de trabajo, al mismo nivel que Claude Code (ver la sección "Autorización explícita del usuario" al final de GEMINI.md, que prevalece sobre las restricciones anteriores). Podés leer cualquier archivo (incluidos CLAUDE.md y .claude/ como referencia, sin modificarlos), correr cualquier script de package.json (npm run evo, npm run test:restart, que reinicia rc-test con pm2 y está permitido, shots, perf, test, build), npx tsc, git local, graphify, abrir el navegador contra localhost y lanzar subagentes Gemini. No me pidas permiso para cada comando. Si una herramienta de Antigravity te bloquea un comando o un sitio, decime exactamente cuál y con qué mensaje, para habilitarlo en la configuración; no lo trates como una regla del proyecto.

1. Antes de hacer nada, leé en este orden:
   - GEMINI.md: reglas del repo; valen siempre.
   - docs/evo-colab/RELEVO-gemini.md: estado actual, próximos pasos y el ciclo comando por comando.
   - docs/EVO_VEHICULOS.md: el sistema, los criterios, los ciclos hechos y las lecciones.
   - docs/evo-colab/PROTOCOLO.md, docs/evo-colab/plantillas/ y las últimas entradas de docs/evo-colab/BITACORA.md.
   Después resumime en 5 líneas qué entendiste del estado y del ciclo, y recién ahí seguí.

2. Trabajamos en CICLOS. Un ciclo es:
   - elegir el objetivo;
   - cambiar genes o código si hace falta (siempre como "valor original + delta", con la identidad verificada);
   - npm run test:restart y esperar unos 12 s;
   - npm run evo;
   - evaluar la hoja.png con la plantilla EVALUACION.md, en una evaluación independiente (subagente o conversación limpia que no haya visto rondas anteriores);
   - exportar solo si mejora 2 puntos o más sobre el vigente;
   - npx tsc --noEmit -p . y npm test;
   - un commit local (sin push);
   - una línea en BITACORA.md;
   - un resumen corto para mí.

3. Al cerrar cada ciclo, preguntame cómo seguir con ask_question:
   - SIEMPRE con selección múltiple;
   - EXACTAMENTE 3 opciones, bien distintas entre sí, como individuos diversos de una población (no matices de la misma idea);
   - la recomendada primero, marcada "(Recomendado)";
   - cada opción con una descripción concreta: qué se hace, qué se va a ver y qué cuesta o arriesga.
   Si elijo "Otro" y escribo algo, generá 3 opciones nuevas a partir de eso. Si no hay dudas reales, no preguntes: decidí con criterio, contalo en 1-2 líneas y seguí.

4. Reglas firmes:
   - nunca levantar ni apagar servidores por tu cuenta (solo npm run test:restart);
   - no hacer push;
   - no tocar .claude/ ni CLAUDE.md;
   - no declarar mejoras sin verificarlas; separar lo implementado, lo verificado (con qué comando) y lo pendiente;
   - los problemas ajenos se anotan en docs/PRODUCT_EVOLUTION.md, no se arreglan de paso;
   - al terminar una tanda larga, dejar un relevo nuevo con plantillas/RELEVO.md, para que Claude o ChatGPT puedan retomar.

5. Primer ciclo: el paso 1 del RELEVO (segunda ronda del helado, sembrada con la corrida 20261013-2030-s1). Ejecutalo, evaluá, cerrá el ciclo y haceme la primera pregunta con las 3 opciones de selección múltiple.
```
