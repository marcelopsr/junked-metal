# Hecho: online, servidor y publicación

Todo el detalle operativo está en [`server/README.md`](../../../server/README.md) (rutas, despliegue en la VPS, límites, rotar claves, login Cloudflare, telemetría, portal admin, respaldo, seguridad). El juego corre igual sin servidor. Hallazgos y arreglos: [problemas/online-y-servidor.md](../problemas/online-y-servidor.md).

## Fichas

- **Login.** Clave de grupo, GitHub con lista blanca y Cloudflare Access (Worker `jm-login`, mail con PIN). Token HMAC de 30 días. `server/index.js`, `server/routes/auth.js`, `server/access.js`, `server/cf-login/worker.js`, cliente `src/net.ts`. Madurez: estable. Prueba: `npm run test:server` (`server/test/*.test.js`), `node --test server/cf-login/test/*.test.js`.
- **Juego detrás de Access.** Pages publica solo `portada/`; el juego completo lo sirve el Worker (`dist/`), con la política de mails reescrita desde la VPS. Madurez: usable; instalación como app sin probar en aparato real.
- **Licencias y pagos.** Planes, canje por invitación, vencimientos, Stripe y PayPal con webhooks idempotentes. `server/db.js`, `server/pay.js`. Madurez: usable. Aviso por vencer: panel y auditoría; el mail real espera credenciales ([mail-real-notificaciones](../../todos/mail-real-notificaciones.md)).
- **Telemetría.** `track()` en `src/net.ts` manda `pact`, `stage`, `upgrade`, `route` y otros a `POST /api/telemetry` (120/min por IP, 2000 eventos al día por usuario, poda a 90 días). Análisis de decisiones y exportación CSV con fórmulas neutralizadas en el panel. Madurez: estable.
- **Récords y ranking.** `/api/leaderboard`, alias público, mi cuenta, historial y perfil, anti-trampa de `run_end` (runs imposibles rechazadas). `server/routes/online.js`, `cuenta.js`, pantallas en `src/menu/account.ts`. Madurez: usable. Pendiente: [ranking-semanal](../../todos/ranking-semanal.md).
- **Salas P2P.** PeerJS propio en `/peer` con TURN temporal (coturn), coop hasta 4, chat rápido sin emoji. `src/net_client.ts`, `src/coop.ts`, `src/quickchat.ts`. Madurez: a medias; falta probarlo entre dos máquinas ([online-dos-maquinas](../../todos/online-dos-maquinas.md)) y elegir auto ([selector-auto-online](../../todos/selector-auto-online.md)). El modo espectador quedó descartado el 2026-10-12 (tope 10 por sala); ver [modo-espectador-online](../../todos/modo-espectador-online.md).
- **Panel admin.** Usuarios, invitación por lote, planes, avisos, moderación de rankings, red, telemetría, plantillas de mail que abren Gmail, ficha de amigo, lista de espera. `server/admin.html`, `server/routes/admin.js`. Madurez: usable. Abierto: [panel-plantillas-navegador](../../todos/panel-plantillas-navegador.md), [lista-espera-punta-a-punta](../../todos/lista-espera-punta-a-punta.md).
- **Monitoreo.** Chequeo cada 5 min (worker, coturn, disco, db), alerta solo en cambio de estado, banner en el panel y `GET /api/status` público. `server/monitor.js`, `portada/estado.html`. Prueba: `server/test/monitor.test.js`. Falta probar contra producción ([estado-html-produccion](../../todos/estado-html-produccion.md)).
- **Respaldo.** Copia diaria de `jm.db` en la VPS (cron, 14 días) y copia a la Mac. `server/backup.sh`, `scripts/backup-pull.mjs` (`npm run backup:pull`). Madurez: estable; se abrió una copia de prueba en la Mac.
- **Carga.** `npm run carga`: 50 jugadores contra un servidor local, tabla p95 por endpoint. `scripts/carga.mjs`.
- **Portada.** `portada/index.html`, `como-se-juega.html`, `primeros-pasos.html`, `cambios.html` (bitácora), `estado.html`, `novedades.json` (se completa solo con `publicar`), vista previa Open Graph (`og.jpg`; sin validar en WhatsApp o Discord: [vista-previa-link](../../todos/vista-previa-link.md)).
- **Pages y CI.** `.github/workflows/pages.yml` recompila y publica `portada/` en cada push a `master`; `revisar.yml` corre `npm test` y `npm run build` en cada PR y en ramas de colaboradores (no publica nada). El build usa `base: "./"`: sin rutas absolutas.
- **Publicar.** `npm run publicar` corre tests, build, e2e, deploy a la VPS y al Worker y chequeos de producción. Ver [herramientas.md](herramientas.md).

## Límites conocidos

Presupuesto de la VPS: hasta 75 % (6 CPU, 11 GB), jm-net 2 GB y coturn 150 % CPU con 40 allocations. Tokens ya emitidos siguen valiendo hasta vencer tras rotar `GROUP_KEY`. Auditoría completa: [AUDITORIA-seguridad-server](../../AUDITORIA-seguridad-server.md).
