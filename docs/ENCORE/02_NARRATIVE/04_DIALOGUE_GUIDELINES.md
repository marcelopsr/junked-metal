# Biblioteca de diálogos — reglas y muestras

**[PROPUESTA]** Todas estas líneas son originales y utilizables como borradores de prototipo. No son grabaciones finales ni un canon irreversible.

## Estilo

Humor teatral para adultos, sentido de radio/televisión antigua, chistes hacia la chatarra y la situación. No repetir el mismo insulto en bucle. No exponer datos sensibles ni acciones inventadas de jugadores reales. Evitar spoilers y no hablar durante alertas urgentes.

## Paquetes contextuales

### Iniciar Luna
- «¡Luces encendidas! ¡Gravedad opcional! ¡Dignidad no incluida!»
- «Bienvenidos a la Luna. Sí, es un destino romántico. Especialmente si les gustan los cráteres.»
- «Sonrían para el público. No pregunten dónde está el público.»

### Primer rescate
- «¡Qué acto de solidaridad! Producción, ¿esto estaba permitido?»
- «¡Y lo levantan del suelo! ¡Ternura con olor a combustible!»

### Pactos
- «Tengo una oferta extraordinaria y una letra pequeña perfectamente legible.»
- «¡No es trampa si firmaron el contrato!»
- «Rechazaste mi oferta. Una decisión sana. Qué decepción.»

### Desbloqueo/receta
- «¡Eso no estaba en el manual! Bueno, quemamos el manual.»
- «¡Un invento nuevo! ¡Mi departamento legal está llorando!»

### Teleportador
- «¡Un nuevo destino! Elijan con cuidado... o elijan rápido, me da igual.»
- «¡Todos listos! ¡Adelante con el acto más irresponsable de la noche!»

### Bis
- «¡OTRA VUELTA! El público exige más. Y yo soy el público.»
- «Se terminó la función. Qué peculiar: siguen aquí.»

### FINAL ACT
- «¡El último acto! Nadie abandona el escenario antes del aplauso.»
- «Les preparé un invitado. Nos costó muchísimo convencerlo de ser amable. Fracasamos.»

### Victoria
- «¡GANADORES! No confundan esto con haber escapado.»
- «Qué final más hermoso. Casi parece escrito por alguien que no soy yo.»

### Interferencia
- «Ninguno debió recordar… [silencio] ¡Recordar traer provisiones! ¡Ja!»
- «¿Me oyen? ¿Me oyen de verda— ¡PUBLICIDAD!»

## Variaciones y enfriamiento

Cada trigger debe tener 3–8 variantes si es frecuente [POR BALANCEAR]; rareza/cooldown por `cueId`, `triggerGroup` y contexto narrativo. Para hechos persistentes, mencionar **solo valores realmente almacenados**. Los números y nombres se interpolan con formato y sanitización; no sintetizar insultos con nombres personalizados.

## Archivo estructurado

`05_DATA/dialogue_cues.csv` contiene ejemplos listos para motorizar. Los keys de audio son placeholders, no archivos de voz ya existentes. En fase 0 mapear al sistema real de audio e i18n.
