# jm-net: servidor de red de Junked Metal

Señalización PeerJS propia (`/peer`), login (clave de grupo o GitHub con lista blanca), credenciales TURN temporales y panel. Node 22.13+ (VPS: 24.21.0, por `node:sqlite`), ESM, dependencias fijas: `express` 4.21.2 y `peer` 1.0.2.

## Rutas
- `GET /api/health`
- `POST /api/login {clave}` → `{token}` (HMAC-SHA256, 30 días). Rate limit: 10 intentos / 15 min por IP.
- `GET /auth/login?return=<url>` → GitHub → `/auth/callback` → `return#token=...`. `return` solo hacia `https://marcelopsr.github.io`, `http://localhost:5173` y `:5174`. Sin `GITHUB_CLIENT_ID/SECRET` responde 503.
- `GET /api/turn` con `Authorization: Bearer <token>` → `{iceServers}` (TURN REST, 1 h).
- `/peer`: PeerJS. El WebSocket exige `token` válido en el query: en el cliente, `new Peer(id, { host: "junkedmetal.duckdns.org", path: "/peer", secure: true, token, config: { iceServers } })`. Rate limit: 30 aperturas / min por IP.
- `GET /panel`: peers y salas (`jm-*`), usuarios, últimas allocations TURN y uptime. Pide clave de grupo o token.
- CORS solo para los orígenes de arriba.

## Despliegue (VPS, `ssh vps`)
- Código en `/opt/junkedmetal/`, pm2 `jm-net` (`ecosystem.config.cjs`), escucha en `127.0.0.1:3310`.
- Actualizar: `rsync -a --exclude node_modules --exclude test --exclude .env server/ vps:/opt/junkedmetal/ && ssh vps 'cd /opt/junkedmetal && npm ci --omit=dev && pm2 restart jm-net'`.
- Caddy: `/etc/caddy/junkedmetal.caddy` (reverse_proxy a 3310, websockets incluidos) importado al final de `/etc/caddy/Caddyfile`. Siempre `sudo caddy validate --config /etc/caddy/Caddyfile` antes de `sudo systemctl reload caddy`.
- coturn: `/etc/turnserver.conf` (3478 UDP/TCP, relay 49160-49200 UDP, `use-auth-secret`, IPs privadas y loopback denegadas). Log `/var/log/coturn/turn.log` (logrotate diario, 7 copias). ufw: 3478/udp, 3478/tcp, 49160:49200/udp.
- Config en `/opt/junkedmetal/.env` (600): `JM_SECRET`, `TURN_SECRET`, `GROUP_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ALLOW_GITHUB` (logins separados por coma), `PORT`, `TURN_HOST`, `ADMIN_KEY`, `ADMIN_EMAILS`, `REQUIRE_SUBSCRIPTION`, `PAYPAL_MODE` (ver § Portal admin).
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

## Login Cloudflare

Login por mail sin dominio propio: Worker `jm-login` (`server/cf-login/`, wrangler 4.149.0) en `jm-login.mesr-96.workers.dev`, protegido por Cloudflare Access (Zero Trust gratis, team `junkedmetal`, método One-time PIN, política Allow «Mail verificado» cuya lista de mails la reescribe la VPS (`server/access.js`) al arrancar y tras cada invitar, revocar o reactivar: no revocados con licencia vigente + `ADMIN_EMAILS` (invitar exige licencia); requiere `CF_API_TOKEN`, `CF_ACCOUNT_ID`, `CF_ACCESS_APP`, `CF_ACCESS_POLICY` en `.env`, sin ellas no toca nada; errores en Auditoría como `access-error`).

Flujo: `GET /?return=<url>` (orígenes de `ORIGINS`) → Access pide el mail y el PIN → el Worker verifica `Cf-Access-Jwt-Assertion` (RS256 contra `<TEAM_DOMAIN>/cdn-cgi/access/certs`, `aud` = `POLICY_AUD`, `iss` = `TEAM_DOMAIN`, `exp`) → `POST /api/cf-exchange` en la VPS con `{email, ts, sig}`, `sig = base64url(HMAC-SHA256(JM_SECRET, "cf-exchange:<mail>:<ts>"))`, ventana de 60 s → la VPS busca el mail en `/opt/junkedmetal/data/invites.json` (`[{email, status: "active"|"revoked", createdAt}]`, variable `INVITES_FILE` para cambiarla) y, si está activo, devuelve `{token}` (formato `sign()`, uid `cf-<mail>`); si no, 403 y el Worker muestra "Sin invitación: pedí acceso al administrador" → redirección a `return#token=...`.

`verify` es genérico: los uid `cf-*` valen para `/api/turn` y el PeerServer sin cambios. La lista JSON es provisoria; la reemplaza el portal de administración (SQLite).

Despliegue (requiere un token con Workers Scripts:Edit, Workers Subdomain/Account Settings:Edit, Access: Organizations, Identity Providers, Apps and Policies:Edit):
```sh
cd server/cf-login && npm ci && set -a && . ~/.config/junkedmetal/cloudflare.env && set +a
npx wrangler deploy
ssh vps "grep ^JM_SECRET= /opt/junkedmetal/.env | cut -d= -f2" | npx wrangler secret put JM_SECRET
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
Admin: botón "Ingresar con Cloudflare" (mail de `ADMIN_EMAILS`); clave y código quedan en "Otras credenciales". "Enviar por mail" abre Gmail con el link ya escrito.

## Portal admin

URL: https://junkedmetal.duckdns.org/admin (HTML/CSS/JS sin build en `server/admin.html`; API en `/admin/api/*`).

**Datos**: SQLite con `node:sqlite` (incluido en Node 24.21.0 de la VPS, sin dependencias nuevas) en `/opt/junkedmetal/data/jm.db` (variable `DB_FILE`), código en `server/db.js`. Tablas: `users(email, status invited|active|revoked, invitedAt, activatedAt, revokedAt, note, lastSeen, tokenVersion)`, `invites(code, email, expiresAt, usedAt)`, `audit(at, actor, action, target, detail, ip)` (ingresos, canjes, acciones del admin y pagos), `admin_codes`, `plans(id, name, price en centavos, currency, period month|year)`, `subscriptions(email, planId, status, provider manual|stripe|paypal, providerRef, currentPeriodEnd)` y `payments(ref)` (idempotencia de pagos). Al arrancar con la tabla `users` vacía importa los activos de `invites.json` (ese archivo ya no se usa después).

**Revocación**: el token lleva `v` = `tokenVersion` del usuario. Los uid `cf-<mail>` se validan en cada uso (`/api/turn`, `/api/stats`, PeerServer) contra la tabla: activo y misma versión. Revocar sube la versión (los tokens viejos mueren, también al reactivar) y cierra sus peers abiertos. Tokens de grupo (`g-`) y GitHub por `ALLOW_GITHUB` (`gh-`) no pasan por la tabla.

**Login de usuarios**: `/api/cf-exchange` acepta `invite` además del mail firmado: activo = token; invitado + código vigente de ese mismo mail = se activa; revocado o sin código = 403. GitHub pide `user:email` y entra por el primer mail verificado que esté activo en la tabla (token `cf-<mail>`, revocable); si ninguno, cae a `ALLOW_GITHUB` por login. El cliente (`src/net.ts`) guarda `?invite=CODE`, lo quita de la URL y lo agrega al link de `VITE_LOGIN_URL`; el Worker (`server/cf-login/worker.js`) lo reenvía en el canje.

**Canje directo (sin Cloudflare)**: `POST /api/invite-redeem {code}` (CORS solo `ORIGINS`, 10 intentos / 15 min por IP). El código (7 días, un solo uso) identifica al mail: vigente y sin usar = lo marca usado, activa al usuario (`activatedAt`), audita `invitacion-canjeada` y devuelve `{token}` (uid `cf-<mail>`, `tokenVersion` actual, revocable igual). Usado, vencido, inválido o usuario revocado = 403 con mensaje. Un usuario ya activo que entra en otro dispositivo necesita otro link: botón "Nuevo link" en su fila del portal (`/admin/api/invite`, vale para activos; invitar a un revocado no lo reactiva, primero "Reactivar"). Cliente: sin `VITE_LOGIN_URL`, `?invite=CODE` se canjea directo contra `https://<NET_HOST>/api/invite-redeem` y la pantalla online muestra "Invitación aceptada" o el error; con `VITE_LOGIN_URL` sigue el flujo del Worker.

**Acceso admin**: cookie `jm_admin` (HttpOnly, Secure, SameSite=Strict, path `/admin`, 12 h). Credenciales: `ADMIN_KEY` del `.env`, código de un solo uso de 15 min (`ssh vps "cd /opt/junkedmetal && npm run admin-code"`) o un token `cf-` de un mail de `ADMIN_EMAILS` (por defecto `mertenmsalas@gmail.com`). CSRF: SameSite estricto, escrituras solo `application/json` y `Origin` propio si viene. Rate limit: 10 ingresos / 15 min y 300 llamadas / min por IP. Ver la clave: `ssh vps "grep ^ADMIN_KEY= /opt/junkedmetal/.env"`.

**Pantallas**: Usuarios (estado, última conexión, plan; validar, revocar, reactivar; Gestionar = nota, asignar plan con vencimiento, marcar pagado +1 período, cancelar), Agregar amigo (mail + licencia opcional = un período del plan; link `https://marcelopsr.github.io/junked-metal/?invite=CODE`, 7 días, botón Copiar), Pagos (estado de pasarelas, CRUD de planes), Auditoría, Red (lo de `/panel`).

**Pagos** (`server/pay.js`, fetch contra REST, sin SDK; responden 503 si faltan credenciales):
- `GET /api/pay/checkout?plan=<id>&provider=stripe|paypal` con `Authorization: Bearer <token cf->` → `{url}`.
- Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`): Checkout Session `mode=payment` con `price_data` y `client_reference_id = plan|mail`; webhook `POST /api/pay/stripe/webhook` verifica `Stripe-Signature` (HMAC-SHA256 de `t.cuerpo` crudo, tolerancia 300 s) y aplica `checkout.session.completed` / `async_payment_succeeded` con `payment_status=paid`. Configurar en el dashboard el endpoint `https://junkedmetal.duckdns.org/api/pay/stripe/webhook` con esos dos eventos.
- PayPal (`PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_MODE=sandbox|live`): OAuth client_credentials, Orders v2 `intent=CAPTURE` con `custom_id = plan|mail` y `experience_context.return_url = /api/pay/paypal/return` (captura y vuelve al juego con `?pago=ok|error`); webhook `POST /api/pay/paypal/webhook` verificado con `POST /v1/notifications/verify-webhook-signature` (`verification_status = SUCCESS`), evento `PAYMENT.CAPTURE.COMPLETED`.
- Un pago se aplica solo si monto y moneda coinciden con el plan; activa o extiende un período desde el vencimiento vigente (o desde ahora si venció); idempotente por id de sesión/captura.
- `REQUIRE_SUBSCRIPTION=false` en `.env`. En `true`, `/api/turn` (402) y abrir sala (peer id `jm-*`, 403) exigen suscripción vigente; admins exentos.

Fuentes: Stripe Checkout Sessions https://docs.stripe.com/api/checkout/sessions/create, firma de webhooks https://docs.stripe.com/webhooks#verify-manually; PayPal autenticación https://developer.paypal.com/api/rest/authentication/, Orders v2 https://developer.paypal.com/docs/api/orders/v2/, verificación de webhooks https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature_post, eventos https://developer.paypal.com/api/rest/webhooks/event-names/; SQLite de Node https://nodejs.org/api/sqlite.html.

**Pendiente**: credenciales de Stripe y PayPal en `/opt/junkedmetal/.env` (más registrar los webhooks); (opcional, ya no necesario para invitar) Worker `jm-login` + `VITE_LOGIN_URL`. Tests: `cd server && npm test` (tokens, invitar/canjear/revocar, suscripción, firmas de webhooks, integración HTTP del portal).
