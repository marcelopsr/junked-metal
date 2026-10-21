# Plantilla de encargo a un subagente

Copiá las secciones que apliquen. Cada sección es obligatoria salvo las marcadas (opcional). Escribí en el idioma del proyecto.

```
<rol>
Una frase: qué sos para esta tarea (p. ej. «backend senior que implementa un contrato ya decidido»).
</rol>

<objetivo>
Qué hay que lograr y PARA QUÉ sirve (el porqué permite decidir bien los casos no previstos).
Pedido literal del usuario, si lo hay, entre comillas.
</objetivo>

<contexto>
- Proyecto y carpeta de trabajo (ruta absoluta).
- Qué leer ANTES de empezar, con rutas: CLAUDE.md del proyecto, especificación, plan, archivos fuente clave.
- Decisiones ya tomadas que no se reabren (con fecha o ruta de donde están escritas).
- Estado actual: qué existe, qué está a medias, qué hicieron otros agentes.
</contexto>

<alcance>
- Incluye: lista concreta.
- NO incluye / NO tocar: archivos, carpetas, servicios, entornos. Qué hacer si la tarea parece necesitarlo (parar y avisar).
- Si el proyecto lleva registro de archivos tomados (ver su CLAUDE.md), primer paso: tomar estas rutas; último: soltarlas.
</alcance>

<restricciones>
Reglas del proyecto que aplican (entornos, datos, dependencias, commits, servicios que no se detienen), aunque estén en CLAUDE.md: repetí las que un error haría caras.
</restricciones>

<terminado>
Criterio verificable: qué tiene que ser cierto al final (tests que pasan, comportamiento observable, archivo escrito).
Cómo verificarlo: comandos exactos, rutas, cuentas de prueba.
</terminado>

<informe>
Formato y largo de la respuesta. Por defecto:
1. Resultado en una o dos frases.
2. Cambios (archivo:línea) o hallazgos.
3. Verificación: qué corriste y qué dio (evidencia, no afirmaciones).
4. Lo que no pudiste verificar.
5. Decisiones que tomaste por tu cuenta y dudas para el usuario.
Si el resultado es largo, escribilo en <ruta> y devolvé la ruta más un resumen.
</informe>

<si_hay_dudas> (opcional)
Qué hacer ante ambigüedad: parar y devolver la pregunta, o elegir la opción reversible y anotarla.
</si_hay_dudas>
```

## Variantes por tipo de delegación

**Comprender / planificar (`interprete`)**: pasale el pedido LITERAL del usuario, las rutas de los documentos del proyecto que dan contexto, lo que ya sabés (decisiones, intentos previos) y la ruta donde escribir la especificación. No le des tu interpretación como hecho: marcala como hipótesis.

**Investigar**: la pregunta exacta, para qué decisión sirve la respuesta, fuentes preferidas, qué ya se sabe (para no repetir), y que separe hecho de inferencia y liste lo no verificado.

**Ejecutar**: la especificación (ruta) o el encargo completo de arriba. Nombrá los archivos e interfaces involucrados y el patrón existente a imitar.

**Revisar (`revisor`)**: la especificación o los criterios (ruta), el rango exacto del cambio (`git diff <base>..` o lista de archivos) y el foco (corrección, seguridad, datos, requisitos). NO le pases el razonamiento de quien hizo el cambio ni tu opinión: contexto fresco.

**Validar / criticar**: los criterios o la rúbrica, qué estados o casos probar, cómo acceder (URL, cuentas), qué ya está decidido y no se penaliza, y la lista de problemas abiertos de la vez anterior para verificarlos primero.

## Errores frecuentes

- «Arreglá lo de las sesiones»: sin objetivo, sin archivos, sin criterio de terminado.
- Referirse a «lo que hablamos», «como antes», «el otro agente»: el subagente no lo vio.
- Pegar 300 líneas de contexto en vez de nombrar el archivo que ya las tiene.
- No decir qué NO tocar: dos agentes editan el mismo archivo.
- Pedir «revisá todo»: el revisor inventa hallazgos. Acotá el foco.
- Pasar `model` al lanzar un perfil por modelo y esfuerzo.
