# 05. Agregar un enemigo

Objetivo: enemigo nuevo con modelo, aparición, ficha y duelo de prueba.

1. En `src/enemies.ts`: sumar el id al tipo `Kind` y su entrada a `DEF`.
2. En `src/balance.json`, tabla `enemigos`: fila con vida, velocidad, daño, peso, xp, `aparece_min`, `peso_base`.
3. Si tiene IA propia: `src/enemies/ai/<id>.ts` y registrarla en `src/enemies/ai/index.ts`.
4. Modelo: `src/models/enemies` con plantilla instanciada (`template()`); nunca una malla por entidad.
5. Aparición: ajustar `spawnTable()` en `src/enemies.ts` (o dejar que lo haga la tabla de pesos).
6. Bestiario: sumar el `Kind` en `LORE`, `HOW` y `BIOMETRICS` de `src/menu/beast_data.ts` (son `Record<Kind, ...>`: tsc avisa si falta).

Se verifica:
- `npx tsc --noEmit -p .` (los `Record<Kind, ...>` obligan a completar todo).
- `npm run sim -- --duel <id>,aspiradora --seeds 1,2`.
- `npm run shots -- --only bestiario` y `--only lab`.

Trampas:
- Colisión con Havok: posicionar la malla antes del `PhysicsAggregate` ([../../../.claude/rules/havok.md](../../../.claude/rules/havok.md)).
- Respetar el tope `maxAlive`.
