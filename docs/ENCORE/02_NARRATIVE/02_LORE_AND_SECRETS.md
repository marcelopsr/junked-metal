# Arquitectura del misterio: detrás del telón

## Principio narrativo

La narrativa es ambiental y reactiva: nunca exigir leer diez documentos en medio de un combate. Cada hallazgo debe funcionar por sí solo como imagen, audio, evento o interacción, pero también poder conectarse a un misterio mayor. No explicar en este documento la verdadera identidad del Director porque el usuario eligió el misterio, no una explicación concreta.

## Motivos visuales propuestos

- **El Ojo/Obturador:** no es un ojo biológico obligatorio; símbolo de vigilancia y de cámara.
- **La sonrisa desfasada:** icono de marca televisiva que se altera en bucles altos.
- **La claqueta inconclusa:** cada loop añade una línea de producción al registro.
- **Butacas vacías:** «el público» existe como discurso, pero no se verifica quién observa.
- **Frecuencias fantasma:** radio, televisores y terminales que emiten frases fuera de contexto.

## Tres canales de revelación

1. **Historial personal:** comentarios y recuerdos entre runs según logros, récords y caídas.
2. **Exploración física:** puertas, terminales, transmisiones, zonas ocultas y acertijos accesibles solo/co-op.
3. **Consecuencias jugables:** pistas de boss y secretos que sabotean peligros de la arena final.

## Red de pistas [PROPUESTA]

No lineal pero ordenable por evidencias. Una pista puede tener `prerequisites[], hints[], revealLevel, continuityKey, reward[]` y una política `oncePerProfile` o `oncePerRun`. El códice debe mostrar hechos separados de hipótesis. Una línea del Director puede ser dudosa por ficción; el registro del jugador debe distinguir observación verificable de interpretación.

## Ejemplo de arco de descubrimiento (no canon)

**Acto 1 / sonrisa:** el jugador ve «APLAUSOS» en una pantalla que no está conectada. **Acto 2 / audiencia:** una terminal registra «cuatro participantes, cero espectadores». **Acto 3 / eco:** al llegar a loop alto, el Director repite una frase exacta pronunciada en una run anterior. **Acto 4 / backstage:** un mapa secreto muestra que las pantallas reciben señal desde lugares imposibles. El arco no decide quién o qué las controla.

## Secretos en cooperativo

- Interacciones conjuntas opcionales: cuatro placas para acelerar apertura, pero una ruta solo debe existir mediante activación alternativa en secuencia.
- Hallazgos individuales se anuncian opcionalmente al equipo; secretos con efecto en boss final se sincronizan para todos.
- Evitar exigir voz o conocimiento externo para descifrar un puzzle; incluir apoyos accesibles.

## Revelación del boss final

Las pistas sobre el ejecutor final deben ser coherentes y condicionales al `bossId` elegido al inicio. No añadir un segundo sorteo de boss al final. Revelar silueta o mecánica posible, nunca spoiler total sin descubrir el hallazgo correspondiente.

## El Director y la victoria

Derrotar al ejecutor pone fin a la run; **no** a la entidad. Puede felicitar, cambiar de canal, abrir un misterio o fingir que todo era parte del guion. Preservar el sentido satisfactorio de victoria: escena breve y opcionalmente omisible.
