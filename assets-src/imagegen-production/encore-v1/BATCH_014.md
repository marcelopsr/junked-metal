# Tanda 014 — Armas Survivor / ENCORE

20 PNG independientes generados con ImageGen integrado. Seleccionados de las veinte primeras armas pendientes del listado original v1; cada ficha conserva `source_job`. El inventario anterior queda histórico, sin duplicar archivos entre checkouts.

Dirección: miniaturas 3D con superficies pintadas en píxeles y desgaste de taller. Son candidatos RAW para iconos y reconstrucción 3D; no modelos integrados ni recetas ejecutables. Algunos presentan halos semitransparentes que requieren limpieza.

| Recurso | PNG | Prompt y ficha |
|---|---|---|
| Gomitas | [Imagen](raw/arma-gomitas.png) | [JSON](jobs/arma-gomitas.json) |
| Clips | [Imagen](raw/arma-clips.png) | [JSON](jobs/arma-clips.json) |
| Chispero | [Imagen](raw/arma-chispero.png) | [JSON](jobs/arma-chispero.json) |
| Petardos | [Imagen](raw/arma-petardos.png) | [JSON](jobs/arma-petardos.json) |
| Tesla | [Imagen](raw/arma-tesla.png) | [JSON](jobs/arma-tesla.json) |
| Lanza | [Imagen](raw/arma-lanza.png) | [JSON](jobs/arma-lanza.json) |
| Agua | [Imagen](raw/arma-agua.png) | [JSON](jobs/arma-agua.json) |
| Yoyo | [Imagen](raw/arma-yoyo.png) | [JSON](jobs/arma-yoyo.json) |
| Bengalas | [Imagen](raw/arma-bengalas.png) | [JSON](jobs/arma-bengalas.json) |
| Regla | [Imagen](raw/arma-regla.png) | [JSON](jobs/arma-regla.json) |
| Helado | [Imagen](raw/arma-helado.png) | [JSON](jobs/arma-helado.json) |
| Bocina | [Imagen](raw/arma-bocina.png) | [JSON](jobs/arma-bocina.json) |
| Trompo | [Imagen](raw/arma-trompo.png) | [JSON](jobs/arma-trompo.json) |
| Tuercas | [Imagen](raw/arma-tuercas.png) | [JSON](jobs/arma-tuercas.json) |
| Bobinas | [Imagen](raw/arma-bobinas.png) | [JSON](jobs/arma-bobinas.json) |
| Ventilador | [Imagen](raw/arma-ventilador.png) | [JSON](jobs/arma-ventilador.json) |
| Canicas | [Imagen](raw/arma-canicas.png) | [JSON](jobs/arma-canicas.json) |
| Burbujas | [Imagen](raw/arma-burbujas.png) | [JSON](jobs/arma-burbujas.json) |
| Matamoscas | [Imagen](raw/arma-matamoscas.png) | [JSON](jobs/arma-matamoscas.json) |
| Dardos | [Imagen](raw/arma-dardos.png) | [JSON](jobs/arma-dardos.json) |

## Reconstrucción posterior

Definir geometría, UV, escala, semilla y parámetros por arma. Conservar los contratos de gameplay y colisión. Separar brillo pintado y emisión cuando corresponda. Verificar lectura a tamaño de icono y bordes alfa antes de integrar.

## Verificación

Se comprueban dimensiones, transparencia real, hashes únicos, correspondencia PNG/JSON y fuente de diseño con `verify.mjs`. No se modificó ni probó el juego.
