# 04. Agregar un arma

Objetivo: arma nueva jugable, con balance en la planilla. Reglas: [../../../.claude/rules/balance.md](../../../.claude/rules/balance.md).

1. Mirar un arma parecida en `src/weapons/` (p. ej. `agua.ts`) y la base `src/weapons/base.ts`.
2. Crear `src/weapons/<id>.ts` con la clase (extiende `Weapon`).
3. En `src/weapons/base.ts`: sumar el id a `WeaponId` y la entrada a `WEAPONS` (nombre, descripción, pasiva de evolución).
4. En `src/weapons.ts`: importar la clase y registrarla en `CLASSES`.
5. En `src/balance.json`, tabla `armas`: una fila con el mismo `id` y sus columnas; si hace falta una columna nueva, su descripción va en `DESC` de `scripts/balance-xlsx.mjs`. Ningún número como literal.
6. Si usa efectos, partículas del pool de `fx.ts` e instancias, no mallas sueltas.

Se verifica:
- `npx tsc --noEmit -p .` y `npm test`.
- `npm run sim -- --seeds 1,2,3 --secs 600`; ninguna arma nueva por encima de 3x la mediana de daño (`--json`).
- `npm run shots -- --changed`.

Trampas:
- Textos de descripción con números se actualizan a mano.
- Randomness de la partida con `rng()`, no `Math.random`.
