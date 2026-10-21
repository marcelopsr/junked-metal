# Hecho: ENCORE (modo principal)

Expediciones por escenarios con pactos, rutas y un Director. Diseño original en [`docs/ENCORE/`](../../ENCORE/README.md) (paquete de preproducción, no auditoría); decisión en [ADR 0001](../../decisiones/0001-encore-modo-principal.md). Escenarios y biomas: [`docs/ENCORE_BIOMAS.md`](../../ENCORE_BIOMAS.md).

## Fichas

- **Expedición y fases.** Escenarios, teleportador, OVERLOAD, ruta, votación, FINAL ACT. `src/encore.ts` (reglas puras, `VARIANTS`, `routeOffer`, `zoneOf`) y `src/encore_run.ts` (estado `erun`, `encEnter`, `encApply`, `calmFirst`). Madurez: estable. Prueba: `test/encore/*.test.ts`, `npm run sim -- --encore`, `npm run e2e`. Crítica: [QA-0.95](../../../.claude/trabajo/archivo/QA-0.95.md), 0 atascos en 10 semillas.
- **Escenarios terrestres y biomas.** patio, jardín, ciudad, bosque, nieve, industrial por sorteo (`EARTH_ZONES`); galpón, desván, pileta, cocina como destinos de ruta; Luna día/noche. `src/zones/*.ts`, `src/moon*.ts`. Madurez: usable (contraste y cámara con TODOs). Prueba: `npm run shots`. Ver [camara-tapada-follaje](../../todos/camara-tapada-follaje.md).
- **Pactos.** Tabla `PACTS` en `src/encore.ts`; números fuera de `balance.json` (TODO [pacts-a-balance-json](../../todos/pacts-a-balance-json.md)). Madurez: usable. Prueba: `test/encore/pactos.test.ts`, `sim --encore --pacts all`.
- **Zonas de pacto.** Beneficio o riesgo dibujado en el piso, riesgo rayado. `src/pact_zones.ts`; colocación por hash, sin `rng()`. Madurez: usable. Prueba: `test/pact_zones.test.ts`, `test/pact_zona_texto.test.ts`. Diseño: `.claude/trabajo/ZONAS-PACTO.md`.
- **Director.** Frases y avisos en HUD, sonido propio por variante. `src/encore_run.ts` (`say`, `tip`), `src/audio/effects.ts`. Madurez: usable. Pendiente de crítica: pisa el botón RECHAZAR en pc (QA-0.93, bug C).
- **Interrupciones del Director.** luces, utilería, corte, sangre; sorteo y reloj puros en `src/encore_events.ts`, efectos en `encore_run.ts`, modelos en `src/models/utileria.ts`. Madurez: usable. Prueba: `test/encore_events.test.ts`. Crítica: [REVISION-0.95](../../../.claude/trabajo/archivo/REVISION-0.95.md) (`iLcg` de módulo sin resembrar).
- **Cartelera.** Afiches de escenarios, pactos, secretos e interrupciones, lo no visto en silueta; logros con pintura. `src/menu/cartelera.ts`. Madurez: usable.
- **Codex y estadísticas.** Descubrimientos en el menú (`src/menu.ts`), estadísticas desde `/api/me/stats` (`src/menu/account.ts`). Madurez: usable; ids crudos abiertos en [codex-ids-crudos](../../todos/codex-ids-crudos.md).
- **Logros.** `src/achievements.ts` (más un pacto especial por secreto descubierto). Prueba: `test/achievements.test.ts`. Madurez: estable.
- **Desafío diario y semanal.** Semilla del día desde el servidor: `daily()`/`weekly()` en `src/net.ts`, `src/weekly.ts`, pantallas en `src/menu/account.ts`. Madurez: usable; marca oficial sin probar contra servidor real. Pendiente: [ranking-semanal](../../todos/ranking-semanal.md).
- **Onboarding.** Primera expedición sin pactos, guía mínima, calma de 20 s (`primera_calma_s`), desafíos ocultos hasta terminar la primera. `src/tutorial.ts`, `src/menu.ts`, `encore_run.ts`. Madurez: usable. Crítica: [QA-0.93-onboarding](../../../.claude/trabajo/archivo/QA-0.93-onboarding.md), bugs A y B ya corregidos en el código (`calmFirst` en `main.ts`).
- **Repetición de la mejor expedición.** `src/rerun.ts`. Madurez: a medias ([repeticion-mejor-expedicion](../../todos/repeticion-mejor-expedicion.md)).

## Balance medido (2026-10-15)

Bot sin pactos 60 % de victorias en 40 semillas, con todos los pactos 45 %; 1 de 40 muere antes de 150 s ([QA semilla 19](../../../.claude/trabajo/archivo/QA-semilla19.md)). Meta de producto en [ROADMAP-1.0](../../ROADMAP-1.0.md) sección 5.
