---
paths:
  - "src/car.ts"
  - "src/world.ts"
  - "src/world_layout.ts"
  - "src/run_drive.ts"
  - "src/enemies.ts"
  - "src/enemies/**"
  - "src/zones/**"
  - "src/kart.ts"
  - "src/moon.ts"
  - "src/encore_run.ts"
  - "src/bjs.ts"
  - "src/models/**"
  - "src/main.ts"
---

# Trampas de Havok (ya nos mordieron)

- El cuerpo toma la pose de la malla **al crearse** (`disablePreStep = true`): posicionar/rotar la malla ANTES del `PhysicsAggregate`. Moverla después deja el colisionador en otro lado (así quedaron macetas en el origen hundiendo al auto).
- `setMassProperties` reemplaza TODO: mandar siempre masa + inercia juntas (usar `Car.setMass`).
- No desplazar `centerOfMass` en cuerpos a los que se les fija la velocidad cada frame: Havok resuelve mal el contacto.
- Todo decorado sin colisión usa su propio generador local; nunca consumir el `rng()` del layout jugable (rocas con colisión, matas): cambia el layout de la semilla.
