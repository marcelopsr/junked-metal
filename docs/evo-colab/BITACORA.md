# Bitácora de intercambios Claude <-> ChatGPT

Cronológica, la más nueva al final. Formato de entrada: fecha, autor, qué se hizo o pidió, archivos, resultado, pendiente. Fuente de hechos técnicos: `docs/EVO_VEHICULOS.md` y `evo/historial.json`.

---

## 2026-10-13 · claude · Estado inicial

Se crea el mecanismo de colaboración (`docs/evo-colab/`). Estado del sistema a hoy:

- **Buggy, ciclo 1** (4 rondas, corridas `20261013-1814-s1` a `-1832-s4`): se exportó `i192` (evaluador visual 38/50 contra 32 del original). Proporciones 0,375 a 0; parecido a la flota 0,665 a 0,63; la legibilidad por silueta empeoró en el proxy (0,165 a 0,18) pero el evaluador la juzgó mejor desde la cámara de partida.
- **Ciclo 2, evaluador** (corrida `20261013-1851-s5`): se agregó la medida de pintura visible (banda 0,22-0,45) y la hoja comparativa `hoja.png`. `i190` reemplazó a `i192` (39 vs 38): alerón dentro de la trocha en la cámara de partida; pintura visible 0,177 a 0,201. Es el buggy vigente en el juego.
- **Ciclo 3, evaluador**: piso sin iluminación bajo las ruedas en las imágenes; la medida de color sigue sin piso.
- **Flota en curso: monster.** Corrida `20261013-1939-s1` (recomendado por métrica `i201`), en evaluación visual. Las corridas anteriores del monster se descartaron: la medida de color dependía del orden (corregido en `evo_probe.ts`).
- Pendiente conocido del buggy: el alerón aún ocupa casi todo el ancho en la vista de partida en versiones anteriores a `i190`; revisar si `i190` lo resuelve en juego.
- Otros 15 autos sin genes (ver "Límites conocidos" en `docs/EVO_VEHICULOS.md`).

Ninguna evaluación de ChatGPT recibida aún. Próximo paso: la persona sube la `hoja.png` de monster a ChatGPT con el prompt del README y pega la respuesta usando `plantillas/EVALUACION.md`.
