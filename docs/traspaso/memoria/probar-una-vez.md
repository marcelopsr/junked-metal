# Probar una vez, en proporción al cambio

Hacer todos los cambios de la tanda y probar UNA vez al final, no pedacito por pedacito. Elegir la prueba según lo tocado (tsc siempre; vitest si hay lógica; shots --changed si es visual; sim 1-2 semillas si es balance); suites completas solo para renovar referencias o si el dueño lo pide. Todo headless, nada que robe el foco. Los comandos largos (perf, e2e, shots, sim) en segundo plano, esperando la señal de fin.

**Why:** filosofía del dueño (2026-10-04 y 2026-10-10): «no revisar toda la casa cada vez»; le molesta el ciclo cambiar-probar-cambiar y los procesos que bloquean (2026-10-14: «todo elegantemente en segundo plano»).

**How to apply:** `npm run verificar -- --nivel tanda` al cerrar cada encargo; el hook Stop lo recuerda. Ver [../trabajo/verificacion.md](../trabajo/verificacion.md).
