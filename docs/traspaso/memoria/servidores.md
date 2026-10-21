# Servidores autogestionados

Los servidores de prueba (`rc-test` y el grupo, y `rc-test-<carpeta>` en worktrees) se autogestionan: ni el orquestador ni los agentes los reinician; sirven el código actual solos y solo se levantan si están caídos. Sin Vite propio ni puertos nuevos; un solo Chromium headless, abierto solo durante la tanda.

**Why:** 2026-10-15 una verificación de versión falló porque otros procesos reiniciaron servidores a mitad del e2e; antes, varios Chrome y Vite por encargo dejaron la Mac lenta (2026-10-04).

**How to apply:** en los encargos no pedir `test:restart` para «tomar código nuevo»; si parece viejo, correr de nuevo. El hook `guard.sh` bloquea reiniciar, parar o borrar `rc-test*`. Ver [../trabajo/entornos.md](../trabajo/entornos.md).
