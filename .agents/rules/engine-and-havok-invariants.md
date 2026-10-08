---
trigger: glob
globs: "src/**/*.ts, test/**/*.ts, scripts/**/*.mjs, vite*.ts, tsconfig.json"
description: "Enforce Babylon.js 9, Havok physics, determinism, memory pooling, and bundle invariants when working on TypeScript and scripts."
---

# Invariantes de Motor, Física Havok, Determinismo y Rendimiento

## 1. Trampas Críticas de Havok (Obligatorio)
- **Pose antes del cuerpo físico:** `PhysicsAggregate` captura la pose de la malla al crearse (`disablePreStep = true`). Posiciona y rota siempre la malla **ANTES** de instanciar `new B.PhysicsAggregate(...)`. Mover la malla después deja el colisionador desfasado.
- **Masa e inercia juntas:** `body.setMassProperties(...)` sobrescribe todas las propiedades de masa. Pasa siempre masa + inercia juntas (usa `Car.setMass`).
- **`centerOfMass` vs `drive()`:** Nunca desplaces `centerOfMass` en cuerpos cuya velocidad lineal se fija por cuadro (`drive()` en `src/car.ts`), porque Havok resuelve mal el contacto. El desplazamiento de `centerOfMass` solo es válido en el modo Demolición (`src/duel.ts`), que opera con fuerzas y torques (`applyForce` / `applyTorque`).

## 2. Fachada de Babylon.js (`src/bjs.ts`)
- Todo import de `@babylonjs/core` se redirige mediante `tsconfig.json` y `vite.config.ts` a `src/bjs.ts` para ahorrar ~4 MB de parseo inicial.
- Si necesitas una clase, constante o side-effect nuevo de `@babylonjs/core`, expórtalo en `src/bjs.ts` desde su ruta profunda (`@babylonjs/core/.../archivo.js`). Nunca elimines el alias hacia `src/bjs.ts`.

## 3. Determinismo y Semillas (`src/rng.ts`)
- Toda decisión que afecte la partida, spawns, IA, ofertas de cartas, layout del patio o tableros (Match-3) debe usar `rng()` de `src/rng.ts`.
- `Math.random()` está reservado **exclusivamente** para efectos visuales efímeros (partículas, sacudidas cosméticas).

## 4. Rendimiento WebGL y Memoria
- **Cero mallas sueltas por entidad dinámica:** Enemigos, proyectiles, gemas y marcas en el piso deben ser instancias (`template()` en `src/models.ts` o thin instances).
- **Pools obligatorios:** Usa el pool de partículas, restos y marcas de `src/fx.ts`; nunca crees `new B.ParticleSystem` por evento.
- **Hot loop (`update()`):** Evita crear arrays intermedios (`.filter()`, `[...arr]`) o `new B.Vector3()` innecesarios por cuadro; recorre al revés al eliminar elementos y respeta los topes (`maxAlive`, `gemas_tope`, `SPIT_CAP`).
- **Rutas relativas:** El build usa `base: "./"` para servir igual en `:4173` y en GitHub Pages (`/junked-metal/`). Nunca uses rutas absolutas (`/assets/...`) en código, HTML, CSS ni manifiestos.
- **Balance tipado:** Ningún número de balance nuevo va como literal en el código; debe vivir en `src/balance.json` (y su descripción en `DESC` de `scripts/balance-xlsx.mjs`) y leerse desde `BAL` (`src/balance.ts`).
