# Handoff — Ambientación v1

Fecha: 2026-10-10. Producción: sesión Codex. Estado: recursos y galería verificados, sin integración en partidas. Reserva de producción: liberada; cualquier sesión puede continuar preservando esta versión. Recursos disponibles para cualquier herramienta/modelo elegido por el usuario.

Entrada: selección explícita del usuario de ambientación con alpha, continuación de la biblioteca de superficies y dirección cinematográfica aprobada. Salida: cuatro PNG 1254 × 1254 y cuatro WebP con alpha exacto, prompts, catálogo, referencia de corrección del aceite, README, galería y verificador. 5,21 MB de PNG finales / 1,34 MB de WebP; fuentes intactas.

No se modifican modelos activos, controles, balance ni partidas. Los recursos son detalles planos estáticos; no modelos o efectos físicos. Fuera del build normal, sin publicación. Geometría y normal/ORM ausentes; comprobar escala/halos y coste al integrar.

Próximo paso disponible: reservar una zona del banco visual o del mundo dentro del alcance autorizado, aplicar una selección compartiendo materiales/instancias y comparar ambas cámaras. Puede hacerse de forma autónoma o con un orquestador temporal; no requiere revisión de Codex. Otra sesión puede generar variantes en `v2/` sin alterar esta fuente.

Verificado al cierre: `npx tsc --noEmit -p .`, `npm test` (75 pruebas) y `npm run build` pasan. `node assets-src/environment-library/v1/verify.mjs` pasa en pc 1280×720 y cel 390×844: ocho PNG/WebP por viewport, cuatro diálogos y veinte composiciones, alpha exacto, control de opacidad, proporción cuadrada y cero errores/desbordamiento. Margen exterior: solo ruido alpha ≤ 1/255; primer assert de ceros absolutos se corrigió para registrar este límite conservando la fuente. Capturas/JSON en `evidence/`; navegador cerrado. No se corrió sim/perf: esta tanda no cambia juego ni geometría activa.

Commit de cierre: localizar con `git log --all --oneline -- assets-src/environment-library/v1/`; no insertar un hash futuro ni inferir integración. El árbol compartido contenía cambios de otra sesión; sus archivos no forman parte del commit de esta tanda.

La metodología común fue incorporada por el ciclo concurrente en `b2eb94f`; se conserva ese avance. Esta tanda cierra los recursos por separado y no incluye cambios de gameplay ajenos.
