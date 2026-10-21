# 09. Worktrees y servidores de prueba

Objetivo: probar sin pisar a otros agentes. Detalle: [../../../.claude/rules/pruebas-herramientas.md](../../../.claude/rules/pruebas-herramientas.md).

1. Mismo árbol: `npm run test:restart` asegura que `rc-test` :5174 y `rc-test-2..6` estén arriba (si ya lo están, no hace nada). Las herramientas alquilan un servidor libre solas.
2. En un worktree: `npm run test:restart` primero (crea `node_modules` como symlink y levanta `rc-test-<carpeta>`, puerto 5200-5299), luego `shots`, `sim`, `perf`; al cerrar, `npm run test:down` (borra solo el de ese worktree).
3. Ver estado y candados: `npm run test:ls`.
4. Candado colgado: `npm run test:unlock` (solo libera muertos o vencidos).

Se verifica: `npm run test:ls` muestra el servidor arriba y sin dueño al terminar.

Trampas:
- Nunca `pm2 restart/stop/delete` de `rc-test*` a mano, ni `kill`: el hook lo bloquea. Los servidores sirven siempre el código actual.
- `perf` es exclusivo; no correrlo junto a otras pruebas.
- Inspección a mano: `http://localhost:5173/?mute`, y cerrar la pestaña.
