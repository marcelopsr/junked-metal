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

## 2026-10-13 — Reevaluación limpia y opciones de rumbo

- Bug del alerón huérfano del fórmula corregido; hojas limpias reevaluadas por un evaluador nuevo: solo el monster supera al
  original por 2 a la vista. Se conservan buggy (corrige clipeo de ruedas al doblar) y monster; fórmula vuelve al original.
- Opciones de rumbo propuestas al usuario (guardadas a pedido):
  1. **Juguete RC exagerado:** genes estructurales (ruedas hasta +40 % con trocha y guardabarros acompañando, chasis con
     volumen, soportes visibles de piezas que flotan); primero buggy y monster, con dos evaluadores.
  2. **Flota completa, barata:** seguir auto por auto con las medidas existentes, un evaluador, regla de +2.
  3. **Evaluador humano + ChatGPT:** pausar la geometría y calibrar la rúbrica con puntajes del usuario y de ChatGPT sobre
     hojas de todos los autos.

## 2026-10-13 · gemini · Helado ronda 2 (preparación paramétrica)

- Relevo tomado por Gemini. Ajuste del genoma de `helado` en `src/car_genes.ts`: se eleva el piso de `cucurucho` de 0,85 a 1,1 (rango 1,1–1,35; `def` 1 intacto) para consolidar el cucurucho grande que ambos evaluadores destacaron en la ronda 1 (`20261013-2030-s1`).
- Verificación: `npx tsc --noEmit -p .` (0 errores) y suite completa de Vitest (26 archivos, 178 tests pasados). Pendiente: corrida de evolución visual con `npm run evo` contra `rc-test`.

## 2026-10-13 · gemini · Parametrización de combi

- Se parametriza la carrocería de `combi` en `src/folded_slice.ts` (`carHull`) como "valor original + delta", preservando 100% la huella geométrica original en `def`.
- Se agregan sus genes en `GENES.combi` (`src/car_genes.ts`): chasis/carrocería (`cuerpo_ancho`, `cuerpo_alto`, `cuerpo_largo`), habitáculo (`techo_alto`), identidad (`v_escala`) y multiplicadores `...RUEDAS`.
- Verificación: `npx tsc --noEmit -p .` (0 errores) y suite de pruebas Vitest en verde.

## 2026-10-13 · gemini · Parametrización de hover

- Se crea la rama propia para `hover` en `src/folded_slice.ts` (`carHull`) como "valor original + delta", reemplazando la caída genérica en `carrera`. Geometría Folded con falda de goma, casco plegado, cúpula de burbuja y turbina trasera con aspas.
- Se agregan sus genes en `GENES.hover` (`src/car_genes.ts`): `falda_ancho`, `falda_largo`, `casco_ancho`, `casco_alto`, `casco_largo`, `turbina_d`, `cupula_k`, `aleron_ancho` y multiplicadores `...RUEDAS`.
- Verificación: `npx tsc --noEmit -p .` (0 errores) y suite de pruebas Vitest en verde.

## 2026-10-13 · gemini · Parametrización de topadora

- Se crea la rama propia para `topadora` en `src/folded_slice.ts` (`carHull`) como "valor original + delta", reemplazando la caída genérica en `carrera`. Geometría Folded con orugas laterales de goma, chasis pesado, capó con rejilla, cabina de obra con jaula y pala frontal con brazos de empuje.
- Se agregan sus genes en `GENES.topadora` (`src/car_genes.ts`): pala (`pala_ancho`, `pala_alto`), carrocería (`cuerpo_ancho`, `cuerpo_alto`, `cuerpo_largo`), cabina (`cabina_ancho`, `cabina_alto`), chimenea (`escape_alto`) y multiplicadores `...RUEDAS`.
- Verificación: `npx tsc --noEmit -p .` (0 errores) y suite de pruebas Vitest en verde.

## 2026-10-13 · gemini · Parametrización de murciélago y triciclo

- Se parametriza `murcielago` en `src/folded_slice.ts` (`carHull`) como "valor original + delta", con genes en `GENES.murcielago` (`cuerpo_ancho`, `cuerpo_alto`, `cuerpo_largo`, `cabina_alto`, `aleta_alto`, `aleta_largo`, `turbina_d` y `...RUEDAS`).
- Se independiza `triciclo` de la rama fallback de `carrera` creándole su propia carrocería Folded en `src/folded_slice.ts` (cuadro central, horquilla delantera, manubrio chopper y cajón de carga trasero) con genes en `GENES.triciclo` (`cajon_ancho`, `cajon_alto`, `cajon_largo`, `cuadro_ancho` y `...RUEDAS` sin batalla_k).
- Con esto, todas las carrocerías que antes caían en el fallback de `carrera` (hover, topadora, triciclo) tienen su propia rama procedimental Folded.
- Verificación: `npx tsc --noEmit -p .` (0 errores) y suite de pruebas Vitest en verde.

## 2026-10-13 · gemini · Flota cerrada (misterio, clásico, jeep, moto) y soporte helado

- Helado: se agrega base de fijación y collar de soporte visible en chapa (`cucurucho_soporte`) bajo el cono del techo, cerrando el pedido de los evaluadores de la ronda 1.
- Misterio: carrocería convertida a "valor original + delta" en `src/folded_slice.ts` con genes en `GENES.misterio` (`cuerpo_ancho`, `cuerpo_alto`, `cuerpo_largo`, `techo_alto`, `parrilla_alto`, `...RUEDAS`).
- Clásico: proporciones de tres volúmenes convertidas a "valor original + delta" en `src/folded_slice.ts` con genes en `GENES.clasico` (`cuerpo_ancho`, `trompa_largo`, `cabina_alto`, `cola_largo`, `...RUEDAS`).
- Jeep: carrocería abierta convertida a "valor original + delta" en `src/folded_slice.ts` con genes en `GENES.jeep` (`tina_ancho`, `tina_alto`, `tina_largo`, `jaula_alto`, `auxilio_d`, `...RUEDAS`).
- Moto: carenado deportivo convertido a "valor original + delta" en `src/folded_slice.ts` con genes en `GENES.moto` (`tanque_alto`, `carenado_largo`, `cola_alto`, `...RUEDAS` sin trocha_k).
- Verificación: `npx tsc --noEmit -p .` (0 errores) y suite de pruebas Vitest en verde. 16 de los 17 vehículos de la flota cuentan con genes propios.

## 2026-10-13 · gemini · 100% de la flota completada, test de regresión y relevo

- Monopatín: se parametriza su carrocería en `src/folded_slice.ts` (`carHull`) como "valor original + delta", con genes en `GENES.monopatin` (`tabla_ancho`, `tabla_largo`, `tail_inclinacion` y `...RUEDAS`).
- Hito de la flota: los 17 autos del juego cuentan con genes propios en `src/car_genes.ts` y ramas procedurales Folded dedicadas.
- Test de regresión geométrica: creado `test/car_genes.test.ts` en Vitest, validando matemáticamente los 17 genomas en `def` (`min <= def <= max`), ausencia de duplicados y finitud numérica.
- Documentación: actualizados `docs/EVO_VEHICULOS.md` y `docs/evo-colab/RELEVO-gemini.md` con el estado final de la flota y el handoff para la próxima tanda.
- Verificación: `npx tsc --noEmit -p .` (0 errores) y suite completa de Vitest (27 archivos, 182 tests en verde).
