# jm-net: servidor de red de Junked Metal

Señalización PeerJS propia (`/peer`), login (clave de grupo o GitHub con lista blanca), credenciales TURN temporales y panel. Node 22.13+ (VPS: 24.21.0, por `node:sqlite`), ESM, dependencias fijas: `express` 4.21.2 y `peer` 1.0.2.

Índice: [Rutas](#rutas) · [Despliegue](#despliegue-vps-ssh-vps) · [Límites](#límites-presupuesto-junked-metal-hasta-75--de-la-vps--6-cpu--11-gb-redserva-25-) · [Rotar claves](#rotar-claves) · [Tests](#tests) · [Login Cloudflare](#login-cloudflare) · [Juego detrás de Access](#juego-detrás-de-access) · [Telemetría](#telemetría) · [Portal admin](#portal-admin) · [Respaldo y Monitoreo](#respaldo) · [Licencias por vencer](#portal-admin) (párrafo dentro de Portal admin)

## Rutas
- `GET /api/health`
- `GET /api/status` (público, 30/min por IP): `{juego, online, login: "ok"|"caido", actualizado}` derivado del monitor (juego = worker; online = coturn, `/peer` vive en el mismo proceso; login = worker + db). Sin detalles, mensajes ni IPs. Lo lee `portada/estado.html`.
- `POST /api/login {clave}` → `{token}` (HMAC-SHA256, 30 días). Rate limit: 10 intentos / 15 min por IP.
- `GET /auth/login?return=<url>` → GitHub → `/auth/callback` → `return#token=...`. `return` solo hacia `https://marcelopsr.github.io`, `http://localhost:5173` y `:5174`. Sin `GITHUB_CLIENT_ID/SECRET` responde 503.
- `POST /api/waitlist {email, mensaje?}` (público, CORS `ORIGINS`; lista de espera T63): 5/h por IP y tope global `WAITLIST_DAILY_MAX` (200/día), 429 al pasarse; correo inválido o mensaje > 300 caracteres 400; campo oculto `web` con valor = se descarta en silencio; con datos válidos siempre 202 (no revela si el mail ya está en la lista o ya es usuario; los usuarios existentes no se guardan). Tabla `waitlist(email, mensaje, at, estado pendiente|invitado|descartado)`. Panel (Usuarios → «Lista de espera»): `GET /admin/api/waitlist`, `POST /admin/api/waitlist/invite {email, planId}` (reusa el invitar normal y marca invitado) y `/discard`. Formulario listo para pegar en la portada: `server/waitlist-form.html`.
- `GET /api/turn` con `Authorization: Bearer <token>` → `{iceServers}` (TURN REST, 1 h).
- `/peer`: PeerJS. El WebSocket exige `token` válido en el query: en el cliente, `new Peer(id, { host: "junkedmetal.duckdns.org", path: "/peer", secure: true, token, config: { iceServers } })`. Rate limit: 30 aperturas / min por IP.
- `GET /panel`: redirige a `/admin` (pestaña Red); el detalle de peers, salas y TURN solo lo ve el admin.
- CORS solo para los orígenes de arriba.

## Despliegue (VPS, `ssh vps`)
- Código en `/opt/junkedmetal/`, pm2 `jm-net` (`ecosystem.config.cjs`), escucha en `127.0.0.1:3310`.
- Actualizar: `rsync -a --exclude node_modules --exclude test --exclude .env server/ vps:/opt/junkedmetal/ && ssh vps 'cd /opt/junkedmetal && npm ci --omit=dev && pm2 restart jm-net'`.
- Caddy: `/etc/caddy/junkedmetal.caddy` (reverse_proxy a 3310, websockets incluidos) importado al final de `/etc/caddy/Caddyfile`. Siempre `sudo caddy validate --config /etc/caddy/Caddyfile` antes de `sudo systemctl reload caddy`.
- coturn: `/etc/turnserver.conf` (3478 UDP/TCP, relay 49160-49200 UDP, `use-auth-secret`, IPs privadas y loopback denegadas). Log `/var/log/coturn/turn.log` (logrotate diario, 7 copias). ufw: 3478/udp, 3478/tcp, 49160:49200/udp.
- Config en `/opt/junkedmetal/.env` (600): `JM_SECRET`, `EXCHANGE_SECRET` (secreto del canje con el Worker, distinto de `JM_SECRET`; sin él se usa `JM_SECRET` con aviso en consola), `TURN_SECRET`, `GROUP_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ALLOW_GITHUB` (logins separados por coma), `PORT`, `TURN_HOST`, `ADMIN_KEY`, `ADMIN_EMAILS`, `REQUIRE_SUBSCRIPTION`, `PAYPAL_MODE` (ver § Portal admin).
- Ver la clave de grupo: `ssh vps "grep ^GROUP_KEY= /opt/junkedmetal/.env"`.

## Límites (presupuesto: Junked Metal hasta 75 % de la VPS = 6 CPU / 11 GB; redserva 25 %)
- jm-net: pm2 `max_memory_restart` 2 GB (un solo proceso Node, usa ~1 CPU como mucho).
- coturn: systemd drop-in `/etc/systemd/system/coturn.service.d/limits.conf` con `CPUQuota=150%` y `MemoryMax=2G`.
- Juntos: unos 2,5 CPU y 4 GB, por debajo del tope de 4,5 CPU / 8 GB.
- coturn: `total-quota=40` allocations (= puertos de relay; ~10 salas de 4 vía TURN), `user-quota=8`, `max-bps=500000` bytes/s por sesión (el juego usa ~64 kB/s por peer).

## Rotar claves
- `GROUP_KEY`: editar `.env`, `pm2 restart jm-net`. Los tokens ya emitidos siguen valiendo hasta vencer.
- `JM_SECRET`: editar `.env`, `pm2 restart jm-net`. Invalida todos los tokens (todos vuelven a entrar).
- `TURN_SECRET`: cambiarlo en `.env` y en `static-auth-secret` de `/etc/turnserver.conf`, luego `pm2 restart jm-net && sudo systemctl restart coturn`.
- Generar valores: `openssl rand -base64 36 | tr -d '/+='`.

## Tests
`cd server && npm test` (node:test: tokens, credenciales TURN, validación de `return`, rate limit).
Los tests no usan red: el servidor de `test/http.test.js` y `scripts/carga.mjs` arrancan con `MONITOR_OFF=1` (el check `worker` de `monitor.js` no hace el GET al Worker y queda "ok" simulado; `coturn`/`disco`/`db` son locales). Además `test/net-guard.mjs` (`node --import`, log en `NET_GUARD_LOG`) rechaza y registra todo `fetch` a un host distinto de 127.0.0.1 y el último test de `http.test.js` falla si hubo alguno.

## Login Cloudflare

Login por mail sin dominio propio: Worker `jm-login` (`server/cf-login/`, wrangler 4.149.0) en `jm-login.mesr-96.workers.dev`, protegido por Cloudflare Access (Zero Trust gratis, team `junkedmetal`, método One-time PIN, política Allow «Mail verificado» cuya lista de mails la reescribe la VPS (`server/access.js`) al arrancar y tras cada invitar, revocar o reactivar: no revocados con licencia vigente + `ADMIN_EMAILS` (invitar exige licencia); requiere `CF_API_TOKEN`, `CF_ACCOUNT_ID`, `CF_ACCESS_APP`, `CF_ACCESS_POLICY` en `.env`, sin ellas no toca nada; errores en Auditoría como `access-error`).

Flujo: `GET /?return=<url>` (orígenes de `ORIGINS`) → Access pide el mail y el PIN → el Worker verifica `Cf-Access-Jwt-Assertion` (RS256 contra `<TEAM_DOMAIN>/cdn-cgi/access/certs`, `aud` = `POLICY_AUD`, `iss` = `TEAM_DOMAIN`, `exp`) → `POST /api/cf-exchange` en la VPS con `{email, ts, sig}`, `sig = base64url(HMAC-SHA256(JM_SECRET, "cf-exchange:<mail>:<ts>"))`, ventana de 60 s → la VPS busca el mail en `/opt/junkedmetal/data/invites.json` (`[{email, status: "active"|"revoked", createdAt}]`, variable `INVITES_FILE` para cambiarla) y, si está activo, devuelve `{token}` (formato `sign()`, uid `cf-<mail>`); si no, 403 y el Worker muestra "Sin invitación: pedí acceso al administrador" → redirección a `return#token=...`.

`verify` es genérico: los uid `cf-*` valen para `/api/turn` y el PeerServer sin cambios. La lista JSON ya no se usa: la reemplazó el portal de administración (SQLite); ver § Portal admin.

Despliegue (requiere un token con Workers Scripts:Edit, Workers Subdomain/Account Settings:Edit, Access: Organizations, Identity Providers, Apps and Policies:Edit):
```sh
cd server/cf-login && npm ci && set -a && . ~/.config/junkedmetal/cloudflare.env && set +a
npx wrangler deploy
# Secreto de canje propio (T51): generarlo (openssl rand -base64 32), ponerlo en la VPS (.env: EXCHANGE_SECRET=..., pm2 restart jm-net --update-env)
# y en el Worker. Cuando ambos lo tengan, quitar JM_SECRET del Worker (npx wrangler secret delete JM_SECRET): así deja de ser la llave maestra.
npx wrangler secret put EXCHANGE_SECRET
# Solo hasta migrar: respaldo con el secreto viejo
# ssh vps "grep ^JM_SECRET= /opt/junkedmetal/.env | cut -d= -f2" | npx wrangler secret put JM_SECRET
# Access: crear org junkedmetal, IdP onetimepin, app self_hosted sobre jm-login.mesr-96.workers.dev con política Allow Everyone;
# copiar el AUD de la app a POLICY_AUD en wrangler.toml y volver a desplegar.
gh variable set LOGIN_URL -R marcelopsr/junked-metal --body "https://jm-login.mesr-96.workers.dev/"
```
Pruebas: `node --test server/cf-login/test/*.test.js` (firma compatible, ventana, return, JWT).

## Juego detrás de Access

GitHub Pages publica solo `portada/` (pública, botón Ingresar). El juego completo lo sirve el Worker `jm-login` (`[assets]` = `dist/`, `/login` = canje de token) y todo ese dominio está detrás de Access: la política solo lista mails con licencia vigente + `ADMIN_EMAILS` (la VPS la reescribe al cambiar usuarios o licencias y cada hora). Sesión de Access: 6 h (quien pierde la licencia sale como mucho a las 6 h). Publicar el juego:
```sh
VITE_NET_HOST=junkedmetal.duckdns.org VITE_LOGIN_URL=https://jm-login.mesr-96.workers.dev/login npm run build
cd server/cf-login && set -a && . ~/.config/junkedmetal/cloudflare.env && set +a && npx wrangler deploy
```
PWA (T60): el juego es instalable desde el Worker. `public/manifest.webmanifest` (id/start_url/scope `./`, standalone, íconos 192/512 any + maskable) y `public/sw.js`: navegación red primero (la respuesta de Access, 302 u opaqueredirect, pasa sin guardarse; el caché solo se usa sin red), `/assets/*` con hash caché primero, y nunca se cachea `/login`, redirecciones ni respuestas no-OK. El Worker fuerza `Cache-Control: no-cache` en `/sw.js` y `application/manifest+json` en el manifest. Si la sesión de Access (6 h) vence, la navegación va al login de Access. Ojo: el `<link rel="manifest">` sin `crossorigin="use-credentials"` se pide sin cookie y Access lo redirige (instalación fallida en el Worker): añadir ese atributo en `index.html` o excluir `/manifest.webmanifest` en una política Bypass de Access.

Admin: botón "Ingresar con Cloudflare" (mail de `ADMIN_EMAILS`); clave y código quedan en "Otras credenciales". "Enviar por mail" abre Gmail con el link ya escrito.

## Telemetría

`POST /api/telemetry {token, type, data}` (token del login en el cuerpo; tipo `[a-z_]`, data JSON hasta 1,5 kB; 120/min por IP y 2000 eventos/día por uid (429); sin token 401; la hora poda eventos de más de 90 días) → tabla `events(at, uid, type, data)` en la misma SQLite. El cliente (`track()` en `src/net.ts`, solo con `VITE_NET_HOST` y sesión) manda `session` al abrir el juego, `run_start` y `run_end` (modo, victoria, tiempo, bajas, nivel, semilla, auto, causa, vuelta y escenario de ENCORE), y `pact_pick` (id, accepted, stage, loop), `stage_end` (choice stay|advance, stage, loop, t, hp 0-1, lv), `upgrade_pick` (id, lv, mode) y `route_pick` (variant, stage, loop). Panel: pestaña Telemetría (conteo por tipo y usuarios de los últimos 7 días, últimos 200 eventos y, en `analysis` de `/admin/api/telemetry`, análisis de 30 días vía `db.telemetryAnalysis`: pactos aceptado/rechazado por id, quedarse vs avanzar por escenario, top 10 mejoras por modo, variantes de ruta más jugadas y partidas iniciadas/terminadas por día UTC). Récords ENCORE: `GET /api/leaderboard` (Bearer; 60/min por IP) devuelve el top 10 `[{name, loop, stage, t, win}]` con la mejor expedición por usuario (`db.encoreTop`: vuelta, escenario, tiempo; `name` = alias si el usuario tiene, si no las 3 primeras letras del mail + "…"); el panel lo muestra con el mail completo en Telemetría. Alias público: `users.alias` (migración automática; 3-16 caracteres, letras/números/espacio/guion/guion bajo, sin @, único sin distinguir mayúsculas, insultos comunes bloqueados en `BLOCKED_ALIAS` de `db.js`). `POST /api/alias {alias}` (Bearer `cf-`; 10/15 min por IP; 400 con el motivo) lo fija; `GET /api/me` (Bearer `cf-`; 60/min) devuelve `{email, alias, status, plan: {name, currentPeriodEnd, active}}`. `GET /api/me/stats` (Bearer `cf-`; 60/min por IP; 401 sin token) devuelve las estadísticas históricas del propio uid (`db.userStats`, reusa `telemetryAnalysis(0, uid)`): `{modes:[{mode, played, won, bestTime|null}], encore:{loop, stage, t, win}|null, pacts:{top:[{id, accepted}] (5), accepted, rejected, rejectedPct}, stages:{stay, advance, stayPct, advancePct}, upgrades:[{id, n}] (5), variants:[{variant, n}], last:{at, mode, win, t, kills, lv}|null}`; sin datos, ceros y listas vacías. En el panel: columna Alias en Usuarios y edición en Gestionar (`/admin/api/user` op `alias`, vacío = borrar). Anti-trampa en `run_end` (`runEndSospechoso` de `db.js`, constantes con nombre y techo `ponytail:`): no se guarda en `events` y se audita `telemetria-sospechosa` (uid + motivo) —respondiendo 204 igual— si `t` no es número 0-86400, `kills`/`lv` negativos o absurdos (>200000 / >500), `loop` fuera de 0-20 o `stage` fuera de 0-4, `t` < 60 s por escenario completado (`(loop*4+stage)*60`, calibrado con FINAL_QA_6: ~150 s/escenario del bot), o más de 6 `run_end` por usuario en 10 min. Desafío diario: `GET /api/daily` (Bearer `cf-`; 60/min por IP) devuelve `{date (UTC AAAA-MM-DD), seed (1..2^31, HMAC-SHA256(JM_SECRET, "daily:"+fecha)), board (top 10 `{name, win, t, kills, lv}`, nunca mail), mine ({..., rank} o null)}`. Un `run_end` cuenta si trae `daily === date` y `seed === seed` del día; solo el primer `run_end` guardado de cada usuario por (fecha, semilla) puntúa (`db.dailyBoard`): primero victorias (menor `t`), luego derrotas (mayor `t`). Panel: tabla "Desafío diario" en Telemetría (`daily` en `/admin/api/telemetry`). Exportar (T43): `GET /admin/api/export?what=events|analysis&days=30` (solo admin; days 1-3650) devuelve CSV UTF-8 con BOM y `Content-Disposition: attachment` con fecha; `events` = at ISO, uid, type, columnas planas de data (mode, win, t, kills, lv, loop, stage, id, choice, variant) y data cruda, hasta 50000 filas (`EXPORT_MAX`); `analysis` = una sección por agregado (`# pactos`, `# quedarse_avanzar`, `# mejoras`, `# variantes`, `# por_dia`) separadas por línea en blanco. Strings que empiezan con `= + - @` llevan `'` delante (inyección de fórmulas). Botones en la pestaña Telemetría. Sesiones de usuario: `lastSeen` en Usuarios y los `session` de acá.

## Portal admin

URL: https://junkedmetal.duckdns.org/admin (HTML/CSS/JS sin build en `server/admin.html`; API en `/admin/api/*`).

**Datos**: SQLite con `node:sqlite` (incluido en Node 24.21.0 de la VPS, sin dependencias nuevas) en `/opt/junkedmetal/data/jm.db` (variable `DB_FILE`), código en `server/db.js`. Tablas: `users(email, status invited|active|revoked, invitedAt, activatedAt, revokedAt, note, lastSeen, tokenVersion)`, `invites(code, email, expiresAt, usedAt)`, `audit(at, actor, action, target, detail, ip)` (ingresos, canjes, acciones del admin y pagos), `admin_codes`, `plans(id, name, price en centavos, currency, period month|year)`, `subscriptions(email, planId, status, provider manual|stripe|paypal, providerRef, currentPeriodEnd)` y `payments(ref)` (idempotencia de pagos). Al arrancar con la tabla `users` vacía importa los activos de `invites.json` (ese archivo ya no se usa después).

**Revocación**: el token lleva `v` = `tokenVersion` del usuario. Los uid `cf-<mail>` se validan en cada uso (`/api/turn`, `/api/stats`, PeerServer) contra la tabla: activo y misma versión. Revocar sube la versión (los tokens viejos mueren, también al reactivar) y cierra sus peers abiertos. Tokens de grupo (`g-`) y GitHub por `ALLOW_GITHUB` (`gh-`) no pasan por la tabla.

**Login de usuarios**: `/api/cf-exchange` acepta `invite` además del mail firmado: activo = token; invitado + código vigente de ese mismo mail = se activa; revocado o sin código = 403. GitHub pide `user:email` y entra por el primer mail verificado que esté activo en la tabla (token `cf-<mail>`, revocable); si ninguno, cae a `ALLOW_GITHUB` por login. El cliente (`src/net.ts`) guarda `?invite=CODE`, lo quita de la URL y lo agrega al link de `VITE_LOGIN_URL`; el Worker (`server/cf-login/worker.js`) lo reenvía en el canje.

**Canje directo (sin Cloudflare)**: `POST /api/invite-redeem {code}` (CORS solo `ORIGINS`, 10 intentos / 15 min por IP). El código (7 días, un solo uso) identifica al mail: vigente y sin usar = lo marca usado, activa al usuario (`activatedAt`), audita `invitacion-canjeada` y devuelve `{token}` (uid `cf-<mail>`, `tokenVersion` actual, revocable igual). Usado, vencido, inválido o usuario revocado = 403 con mensaje. Un usuario ya activo que entra en otro dispositivo necesita otro link: botón "Nuevo link" en su fila del portal (`/admin/api/invite`, vale para activos; invitar a un revocado no lo reactiva, primero "Reactivar"). Cliente: sin `VITE_LOGIN_URL`, `?invite=CODE` se canjea directo contra `https://<NET_HOST>/api/invite-redeem` y la pantalla online muestra "Invitación aceptada" o el error; con `VITE_LOGIN_URL` sigue el flujo del Worker.

**Panel en celular y herramientas de amigos (T48)**: `admin.html` se adapta a 390 px (tablas como tarjetas apiladas vía `@media`, botones/campos de 44 px, nav con scroll horizontal, sin scroll lateral de página; las celdas toman el título de su columna con un `MutationObserver`). Usuarios tiene buscador (mail, alias, nota) y filtros por estado y licencia (vigente/vencida/sin), del lado del cliente. **Invitación por lote**: `POST /admin/api/invite-batch {emails[], planId}` (máx. 50, cuerpo hasta 16 kB; mismo flujo que `/admin/api/invite` con licencia inicial; cada mail falla por separado; repetidos sin distinguir mayúsculas; `accessSync` una sola vez al final) → `{results: [{email, link, expiresAt} | {email, error}]}`; el panel ofrece "Copiar todos" (`mail: link` por línea) y "Enviar por mail" por fila. **Ficha**: `GET /admin/api/user/:email/detail` (solo admin; 404 si no existe) → `{user (sin tokenVersion), sub, stats (db.userStats), runs (últimos 20 run_end), sessions (últimas 10 session: ua, w, h, touch)}`; se abre al tocar el mail en Usuarios.

**Licencias por vencer**: `db.expiring(3)` (`GET /admin/api/expiring` → `{soon, lapsed}`: activas que vencen en 3 días y vencidas en los últimos 7) alimenta el banner de Usuarios con botón "Marcar pagado (+1 período)". El chequeo horario (junto a `accessSync`) audita `licencia-por-vencer` una sola vez por usuario y período (tabla `notices(email, periodEnd)`) y llama `notify(email, texto)` en `index.js`, que hoy solo audita (`notify`); conectar SMTP/Resend va ahí (sin credenciales no se activa).

**Plantillas de correo (T56)**: tres textos editables (invitación, recordatorio de vencimiento a 3 días, renovación/vencida) con las variables `{alias}` `{mail}` `{link}` `{vence}` `{plan}`. Se guardan en la tabla `settings(key, value)` (clave `templates`, JSON) y lo guardado pisa los textos por defecto de `DEFAULT_TEMPLATES` (`db.js`). `GET /admin/api/templates` devuelve `{invite, expiring, lapsed}` (cada una `{subject, body}`); `POST /admin/api/templates` guarda las tres (asunto ≤ 200, texto ≤ 4000 caracteres; excedido, vacío o incompleto = 400 sin guardar) y audita `templates`. Solo admin. En Pagos → «Plantillas de correo» se editan con vista previa; la invitación se usa en Invitar e Invitar varios, y las otras dos en el botón «Avisar por mail» de cada fila del banner de licencias por vencer. El helper `gmail()` de `admin.html` reemplaza las variables y las pasa por `encodeURIComponent` a la URL de Gmail compose (sin credenciales; se abre y se envía a mano).

**Acceso admin**: cookie `jm_admin` (HttpOnly, Secure, SameSite=Strict, path `/admin`, 12 h). Credenciales: `ADMIN_KEY` del `.env`, código de un solo uso de 15 min (`ssh vps "cd /opt/junkedmetal && npm run admin-code"`) o un token `cf-` de un mail de `ADMIN_EMAILS` (por defecto `mertenmsalas@gmail.com`). CSRF: SameSite estricto, escrituras solo `application/json` y `Origin` propio si viene. Rate limit: 10 ingresos / 15 min y 300 llamadas / min por IP. Ver la clave: `ssh vps "grep ^ADMIN_KEY= /opt/junkedmetal/.env"`.

**Pantallas**: Usuarios (estado, última conexión, plan; validar, revocar, reactivar; Gestionar = nota, asignar plan con vencimiento, marcar pagado +1 período, cancelar), Agregar amigo (mail + licencia opcional = un período del plan; link `https://marcelopsr.github.io/junked-metal/?invite=CODE`, 7 días, botón Copiar), Pagos (estado de pasarelas, CRUD de planes), Auditoría, Red (peers, salas, TURN).

**Pagos** (`server/pay.js`, fetch contra REST, sin SDK; responden 503 si faltan credenciales):
- `GET /api/pay/checkout?plan=<id>&provider=stripe|paypal` con `Authorization: Bearer <token cf->` → `{url}`.
- Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`): Checkout Session `mode=payment` con `price_data` y `client_reference_id = plan|mail`; webhook `POST /api/pay/stripe/webhook` verifica `Stripe-Signature` (HMAC-SHA256 de `t.cuerpo` crudo, tolerancia 300 s) y aplica `checkout.session.completed` / `async_payment_succeeded` con `payment_status=paid`. Configurar en el dashboard el endpoint `https://junkedmetal.duckdns.org/api/pay/stripe/webhook` con esos dos eventos.
- PayPal (`PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_MODE=sandbox|live`): OAuth client_credentials, Orders v2 `intent=CAPTURE` con `custom_id = plan|mail` y `experience_context.return_url = /api/pay/paypal/return` (captura y vuelve al juego con `?pago=ok|error`); webhook `POST /api/pay/paypal/webhook` verificado con `POST /v1/notifications/verify-webhook-signature` (`verification_status = SUCCESS`), evento `PAYMENT.CAPTURE.COMPLETED`.
- Un pago se aplica solo si monto y moneda coinciden con el plan; activa o extiende un período desde el vencimiento vigente (o desde ahora si venció); idempotente por id de sesión/captura.
- `REQUIRE_SUBSCRIPTION=false` en `.env`. En `true`, `/api/turn` (402) y abrir sala (peer id `jm-*`, 403) exigen suscripción vigente; admins exentos.

Fuentes: Stripe Checkout Sessions https://docs.stripe.com/api/checkout/sessions/create, firma de webhooks https://docs.stripe.com/webhooks#verify-manually; PayPal autenticación https://developer.paypal.com/api/rest/authentication/, Orders v2 https://developer.paypal.com/docs/api/orders/v2/, verificación de webhooks https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature_post, eventos https://developer.paypal.com/api/rest/webhooks/event-names/; SQLite de Node https://nodejs.org/api/sqlite.html.

**Pendiente**: credenciales de Stripe y PayPal en `/opt/junkedmetal/.env` (más registrar los webhooks); el Worker `jm-login` ya está activo y sirve el juego detrás de Access (§ Juego detrás de Access); el canje directo sigue como alternativa sin Cloudflare. Tests: `cd server && npm test` (tokens, invitar/canjear/revocar, suscripción, firmas de webhooks, integración HTTP del portal).

## Respaldo

- VPS: `server/backup.sh` (se despliega con `rsync server/backup.sh vps:/opt/junkedmetal/`) hace `sqlite3 .backup` de `data/jm.db` a `data/backups/jm-AAAAMMDD.db.gz` y borra los de más de 14 días. Cron del usuario `ubuntu`, diario 04:10, log en `data/backups/backup.log`. Instalar o reinstalar el cron (idempotente, no duplica): `ssh vps /opt/junkedmetal/backup.sh install`. Prueba manual: `ssh vps /opt/junkedmetal/backup.sh`.
- Mac: `npm run backup:pull` copia (rsync, sin borrar) los `jm-*.db.gz` a `~/Backups/junkedmetal/`. No está agendado; si se quiere automático, solo con launchd local.
- Restaurar: `pm2 stop jm-net`, `cd /opt/junkedmetal/data && rm -f jm.db-wal jm.db-shm && gunzip -c backups/jm-AAAAMMDD.db.gz > jm.db` (desde la Mac: `gunzip -c ~/Backups/junkedmetal/jm-AAAAMMDD.db.gz | ssh vps 'cat > /opt/junkedmetal/data/jm.db'`), `pm2 start jm-net`.

**Monitoreo (T22)**: `monitor.js` chequea cada 5 min (y al arrancar) el Worker (`GET jm-login.mesr-96.workers.dev` espera 302), coturn (TCP 127.0.0.1:3478), disco de la carpeta de la DB (alerta < 10 % libre, `fs.statfs`) y la DB. El último estado vive en memoria (`GET /admin/api/health` → `{chequeo: {ok, detail, desde, ultima}}`, solo admin). Audita `monitor-caida` / `monitor-ok` únicamente al cambiar de estado y llama `notify(ADMINS[0], texto)` en caídas. `admin.html` muestra un banner rojo arriba si algo está caído. `/api/health` público no cambia.

**Seguridad T45**: `GET /api/stats` (Bearer) devuelve solo `{uptime, peers, salas}` (contadores); el detalle (uid, ids de sala, coturn) es solo `/admin/api/stats`. Los errores nunca devuelven stack: JSON mal formado 400 / cuerpo >2 kB 413 `{error:"Solicitud inválida"}`, otros 500 `{error:"Error interno"}`; el detalle va a la consola. Cookie `jm_admin` ilegible → 401. `ecosystem.config.cjs` fija `NODE_ENV=production`.

## Seguridad (T51)
- Rate limit: al llenarse el mapa solo se purgan ventanas vencidas; si sigue lleno la clave nueva se rechaza (no se vacía). La IP sale de `req.ip` (`trust proxy` loopback).
- `NODE_ENV=production` quita `localhost:5173/5174` de `ORIGINS` (retorno y CORS). En el Worker, solo `DEV_ORIGINS="true"` (en `.dev.vars`) los habilita.
- `/auth/login` 20/15 min por IP y tope de 1000 estados; webhook PayPal 60/min y `/api/pay/paypal/return` 20/15 min por IP.
- Logout admin: sube la versión de sesión en memoria y corta todas las cookies admin previas (un reinicio también las cierra).
- Variables nuevas en producción: `EXCHANGE_SECRET` en `.env` de la VPS y como secreto del Worker (`wrangler secret put EXCHANGE_SECRET`). Opcional: `TEL_DAILY_MAX` (default 2000). `NODE_ENV=production` ya está en `ecosystem.config.cjs`.
