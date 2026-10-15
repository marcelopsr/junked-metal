# Objetos ENCORE del hito 0.9: inventario (2026-10-15)

Conclusión: los cinco ya existen como modelos procedurales de juguete en `src/moon_goals.ts` (plantillas con `template()`, `toy()`, desgaste con `chips`). No se construyó nada nuevo.

| Objeto | Ref | Plantilla (moon_goals.ts) | Uso en el juego |
|---|---|---|---|
| Terminal de pactos | ref319 | `terminalTpl` (obj_terminal_pactos) | `decorTick`, fase pact |
| Director (TV + foco) | ref314, ref315 | `tvTpl`, `spotDirTpl` | `decorPlan`, cada escenario |
| Baliza de ruta | ref311 | `routeBeaconTpl` | `decorTick`, fase route (junto al cohete) |
| Núcleo de sobrecarga | ref316 | `overloadCoreTpl` | `decorTick`, fase overload (pulsa por escala) |
| Recicladora | ref317 | `recyclerTpl` | SIN uso: `recyclerPlace` exportada y sin llamadas |

Antes: 4 con modelo y uso, 1 con modelo y sin uso. Después: igual.

Pendiente: enganchar la recicladora (la economía de tornillos no la define aún; decisión de producto) y capturas individuales: no hay hook dev que coloque un objeto aislado (`dev-hooks.ts`/`main.ts` son compartidos). Las capturas por fase salen del e2e/shots de ENCORE.

No verificado: `npm run e2e` no corrió porque el servidor propio del worktree (:5253) no estaba levantado y la orden fue no reiniciar servidores. ref_measure no se midió por no haber captura nueva.
