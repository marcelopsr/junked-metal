# Problemas: online y servidor

Auditoría completa con explotación y tests: [AUDITORIA-seguridad-server](../../AUDITORIA-seguridad-server.md). Operación: [`server/README.md`](../../../server/README.md). Catálogo: [hecho/online.md](../hecho/online.md). Los números H son del tablero viejo ([TABLERO-2026-10](../../../.claude/trabajo/archivo/TABLERO-2026-10.md)).

## Seguridad (T45 y T51)

- **H4: `/api/stats` filtraba mails `cf-`, el log de coturn con IPs y las salas a cualquier token.** Arreglo: devuelve solo `{uptime, peers: n, salas: n}`; el detalle quedó en `/admin/api/stats`. Test en `server/test`.
- **H5: errores devolvían el stack** (JSON mal formado, cuerpo mayor a 2 kB, cookie `%E0` daban 500). Arreglo: manejador de errores final (4xx «Solicitud inválida», el resto «Error interno»), `safeDecode` para la cookie y `NODE_ENV=production` en `server/ecosystem.config.cjs`.
- **H6: el rate limit se salteaba con `hits.clear()` y `ipOf` tomaba `X-Forwarded-For` crudo.** Arreglo en `server/lib.js` (limiter con tope y IP confiable).
- **H7: telemetría sin cuota ni retención.** Arreglo: 2000 eventos al día por usuario (429) y poda a 90 días.
- **H8: el Worker compartía `JM_SECRET`, que firma tokens y la cookie admin.** Arreglo: `EXCHANGE_SECRET` propio para el canje; cuando ambos lo tengan, borrar `JM_SECRET` del Worker (`wrangler secret delete`).
- **H9: `/auth/login` y el retorno de PayPal sin límite; `localhost` en `ORIGINS` de producción; la cookie admin no se invalidaba al salir.** Arreglo: límites por IP, `ORIGINS` de producción sin localhost y logout que invalida en el servidor. Quedan sin arreglar (bajos): el token viaja en la query del WebSocket `/peer?token=` y puede quedar en logs; el nombre público muestra 3 caracteres del mail; los respaldos `.db.gz` usan la umask por defecto.
- **Lo que está bien por diseño:** SQL parametrizado, escape en `admin.html`, CSRF con `SameSite=Strict` más Origin, webhooks Stripe con HMAC y PayPal verificado por API, pagos idempotentes por referencia, CSV con fórmulas neutralizadas.

## Cliente y despliegue

- **H23: instalar como app falla en el Worker.** Causa: el manifest no llevaba `crossorigin="use-credentials"` y Access lo redirige. Arreglo: atributo agregado en `index.html`; `sw.js` no guarda el 302 de Access. Falta probar en aparato real ([instalar-app-real](../../todos/instalar-app-real.md)).
- **H15: T45 dejó `/panel` roto.** Causa: leía `/api/stats` completo. Arreglo: `/panel` redirige a `/admin` y `panel.html` se borró.
- **H19 y H22: los tests heredaban `CF_*` reales y hacían un GET real al Worker.** Causa: el check `worker` de `monitor.js` y variables del entorno. Arreglo: `MONITOR_OFF=1` en los tests y en `scripts/carga.mjs`, más `server/test/net-guard.mjs` que registra salidas a la red.
- **H18 y H20: panel en celular con summaries de 20 px, botón de Cloudflare de 42 px y navegación cortada.** Arreglo: `min-height` 44 y nav en dos filas.
- **H10-H12: accesibilidad de menús.** Backspace en «Clave de grupo» (campo `password`) volvía al menú; el modal de compra no atrapaba el foco; pestañas de 38 px; sin `prefers-reduced-motion`. Arreglo: T33 (`menu.ts`, `menu.css`, `kit.css`). Informe: [AUDITORIA-accesibilidad-menus](../../AUDITORIA-accesibilidad-menus.md).

## Servicio

- **El monitor alertaba en cada chequeo.** Arreglo: alerta solo en cambio de estado (`server/monitor.js`, test).
- **Spam en la lista de espera.** Arreglo: 5 por hora por IP, tope global `WAITLIST_DAILY_MAX` (200/día), campo oculto `web` que se descarta con 202. Falta recorrerlo de punta a punta: [lista-espera-punta-a-punta](../../todos/lista-espera-punta-a-punta.md).
- **Mail real de avisos.** Pausado por falta de credenciales: [mail-real-notificaciones](../../todos/mail-real-notificaciones.md).
- **Sala real entre dos máquinas sin probar** (TURN): [online-dos-maquinas](../../todos/online-dos-maquinas.md).
