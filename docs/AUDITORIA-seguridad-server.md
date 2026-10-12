# Auditoría de seguridad — server/ (T42)

Fecha: 2026-10-12. Alcance: `server/index.js`, `db.js`, `lib.js`, `pay.js`, `access.js`, `monitor.js`, `admin.html`, `panel.html`, `backup.sh`, `cf-login/worker.js`, con `server/README.md` como contexto. Revisión de solo lectura (no se tocó código). Las líneas son las del working tree de hoy; `index.js` cambió durante la revisión (se agregó `/admin/api/export`), así que pueden correrse unas líneas.

## Resumen

| # | Severidad | Hallazgo | Dónde |
|---|-----------|----------|-------|
| 1 | **Alta** (RESUELTO T45) | `/api/stats` le da a cualquier token los mails de todos los conectados y el log de coturn | index.js:170-173, 233-236 |
| 2 | Media (RESUELTO T45) | Se filtra el stack trace en errores de Express (no hay `NODE_ENV=production` ni manejador de errores) | index.js:42, 243, 383; server/ecosystem.config.cjs |
| 3 | Media (RESUELTO T51) | Se puede saltear el rate limit vaciando el mapa (`hits.clear()` al pasar 5000 claves) | lib.js:57 |
| 4 | Media (RESUELTO T51) | Telemetría sin cuota por usuario ni retención: un token puede llenar el disco | index.js:177-187 |
| 5 | Media (RESUELTO T51) | El Worker comparte `JM_SECRET`, la clave que firma tokens y la cookie admin | cf-login/worker.js:51, lib.js:30 |
| 6 | Baja (RESUELTO T51) | `/auth/login` sin rate limit: el mapa `states` crece sin tope (DoS de memoria) | index.js:106-115 |
| 7 | Baja (RESUELTO T51) | Webhook PayPal y `/api/pay/paypal/return` sin rate limit: cada POST anónimo hace 2 llamadas a PayPal | index.js:367-379, pay.js:56-61, 89-100 |
| 8 | Baja (RESUELTO T51) | En producción, `ORIGINS` incluye `http://localhost:5173/5174`: el token puede ir a parar al localhost de la víctima | lib.js:4, worker.js:3 |
| 9 | Baja | El token viaja en la query del WebSocket `/peer?token=` y puede quedar en los logs de acceso | index.js:144-147 |
| 10 | Baja | El nombre público deja ver los primeros 3 caracteres del mail | index.js:189 |
| 11 | Baja (RESUELTO T51) | La cookie admin no se invalida en el servidor (el logout solo la borra en el navegador; dura 12 h) | index.js:244, 270 |
| 12 | Info | `eq()` filtra el largo de la clave de grupo o de admin | index.js:59 |
| 13 | Info | Los respaldos `.db.gz` (con mails) quedan con la umask por defecto | backup.sh:15-18 |
| 14 | Info | Login de admin con un token del juego: un XSS en el juego llevaría a una sesión admin | index.js:265 |

Revisado y **sin hallazgo**:
- **SQL:** todo va parametrizado. En `telemetryAnalysis`/`userStats` solo se interpolan constantes (claves `J("…")` y el fragmento `AND uid=?2`); `uid` siempre va bindeado.
- **IDOR:** `/api/me` y `/api/me/stats` usan el uid del token, no un parámetro.
- **XSS en admin.html:** `esc` escapa `& < > " '` y todos los campos que controla el usuario pasan por él. Los no escapados son números, booleanos o valores con CHECK/regex: `u.status`, `currency` `[A-Z]{3}`, `loop`/`stage`/`t` validados por `runEndSospechoso`.
- **CSRF en /admin/api:** cookie `SameSite=Strict` + `path=/admin`, POST obligatorio en JSON (fuerza preflight) y chequeo de Origin. El CORS no manda `Allow-Credentials`.
- **Open redirect:** `safeReturn` acepta solo orígenes de la lista, sin credenciales en la URL. El retorno de PayPal redirige a la constante `GAME_URL`.
- **Webhooks:** Stripe verifica HMAC sobre los bytes crudos con tolerancia de 300 s y comparación en tiempo constante. PayPal verifica con la API. Los pagos son idempotentes por ref. `settle` exige que el monto y la moneda coincidan con los del plan.
- **Secretos en la auditoría:** `act()` audita el body, pero ninguna ruta que pasa por `act` recibe secretos. El login de admin no audita la credencial.
- **Shell:** el servidor no usa `child_process`. `backup.sh` solo interpola rutas propias.
- **Export CSV:** solo para admin, con fórmulas neutralizadas (`csvCell`).

---

## 1. Alta — `/api/stats` filtra mails a cualquier usuario

**RESUELTO (T45):** `/api/stats` devuelve solo `{uptime, peers: n, salas: n}`; el detalle sigue en `/admin/api/stats`. Test en `http.test.js`. Pendiente: `panel.html` (público) aún espera el detalle y debe migrar a admin o a los contadores.

**Dónde:** index.js:233-236 (ruta) y 170-173 (`stats()`). El cliente es `panel.html:22`.

**Escenario:** cualquiera con un token válido, aunque sea el de la clave de grupo (`g-…`) o el de un jugador recién invitado, llama `GET /api/stats` con `Authorization: Bearer <token>`. La respuesta trae `peers[].uid` y `usuarios[]` con la forma `cf-<mail>`, o sea los mails completos de todos los conectados en ese momento. También trae `turn`: las últimas 25 líneas del log de coturn, con IPs y usernames TURN. El mismo fallo deja ver los ids de sala `jm-…`, que permiten intentar unirse. Esto contradice la regla aplicada en daily y leaderboard ("nunca mail completo").

**Arreglo mínimo:** dejar `/api/stats` solo para admin. `/admin/api/stats` ya existe y `admin.html` lo usa. Hay dos opciones: borrar la ruta y `panel.html`, o responder con `res.status(410)`. Si el panel público hace falta, devolver solo contadores (`{uptime, salas, peers: n}`).

**Test** (en `server/test/http.test.js`): con un token de jugador (`invite-redeem`), `GET /api/stats` responde 404/410, o su JSON no contiene `"@"` ni la clave `turn`. `GET /admin/api/stats` con la cookie admin sigue respondiendo 200.

## 2. Media — Stack trace en las respuestas de error

**RESUELTO (T45):** manejador de errores final (4xx → "Solicitud inválida", resto → "Error interno", log en consola), `safeDecode` para la cookie admin y `NODE_ENV=production` en `ecosystem.config.cjs` (recargar con `pm2 reload ecosystem.config.cjs --update-env`).

**Dónde:** pm2 de producción (`server/ecosystem.config.cjs`) no define `NODE_ENV`; si `.env` tampoco lo hace, Express 4 queda en modo `development`. No hay un `app.use((err, req, res, next) => …)` antes del 404 (index.js:383).

**Escenario:**
- `curl -X POST -H 'Content-Type: application/json' -d '{' https://junkedmetal.duckdns.org/api/login` devuelve 400 con una página HTML que incluye `SyntaxError … at JSON.parse … /opt/junkedmetal/node_modules/body-parser/…`.
- Un body de más de 2 kB devuelve 413 con stack.
- `Cookie: jm_admin=%E0` en `/admin/api/users` hace que `decodeURIComponent` (index.js:243) lance un `URIError`, que termina en 500 con stack.

Con esto se filtran rutas internas y versiones de las dependencias. No pude verificar si `.env` de la VPS define `NODE_ENV`.

**Arreglo mínimo:** agregar un manejador antes de `server.listen`:
```js
app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.status ? "Solicitud inválida" : "Error interno" }));
```
Y en `adminOf`, envolver `decodeURIComponent` en `try`, o directamente no decodificar: el token es base64url y no lleva `%`.

**Test:** un POST a `/api/login` con body `"{"` responde 400 con `content-type` JSON y el body no contiene `node_modules` ni `at `. Un `GET /admin/api/users` con `Cookie: jm_admin=%E0` responde 401, no 500.

## 3. Media — Se puede saltear el rate limit vaciando el mapa

**RESUELTO (T51):** `limiter` purga solo ventanas vencidas y rechaza claves nuevas si sigue lleno; `ipOf` usa `req.ip`. Tests en `lib.test.js`. (Pendiente opcional: agrupar IPv6 por /64.)

**Dónde:** lib.js:57. Cuando `hits.size > 5000` se hace `hits.clear()` y se borran **todos** los contadores de ese limitador.

**Escenario:** un atacante con un /64 IPv6 (o que manda cualquier valor en `X-Forwarded-For`, si Caddy alguna vez lo deja pasar; ver más abajo) hace 5001 requests con IPs distintas a `/api/login`. El mapa se vacía y vuelve a tener 10 intentos. Repetido, tiene fuerza bruta casi ilimitada contra `GROUP_KEY` y `ADMIN_KEY` (`/admin/api/login`). Además, `ipOf` (index.js:30) lee el primer valor de `X-Forwarded-For` en vez de `req.ip`. Hoy depende de que Caddy descarte el XFF entrante (es el comportamiento por defecto sin `trusted_proxies`; no verificado en la VPS).

**Arreglo mínimo:** en vez de `clear()`, borrar solo las entradas vencidas: `for (const [k, v] of hits) if (now - v.t > windowMs) hits.delete(k)`. Si sigue lleno, rechazar (`return false`) en lugar de vaciar. Para la IP, usar `req.ip` (ya está `trust proxy: loopback`) y agrupar IPv6 por /64.

**Test** (en `lib.test.js`): `const ok = limiter(2, 60e3)`; se agota la clave `"a"`, se llama con 5001 claves distintas y `ok("a")` sigue dando `false`.

## 4. Media — Telemetría: crecimiento sin tope

**RESUELTO (T51):** cuota de 2000 eventos/día por uid (429) y `hourly()` borra eventos de más de 90 días (`db.pruneEvents`). Sin lista blanca de `type` (el formato `[a-z_]{1,32}` se mantiene).

**Dónde:** index.js:177-187. El límite es 120/min **por IP**, la cuota por uid aplica solo a `run_end` y nada borra eventos viejos.

**Escenario:** un token válido (vale 30 días, incluido el de grupo) desde varias IPs manda `type: "x"` con `data` de 1500 bytes en bucle. Eso es unos 170 k filas/día por IP, alrededor de 260 MB/día por IP, hasta llenar el disco. Ahí cae SQLite (el monitor lo avisa, pero tarde) y también los respaldos.

**Arreglo mínimo:**
- Limitador por uid además del de IP: `const telUid = limiter(300, 60e3)` y `if (!telUid(w.uid)) return res.status(429).end()`.
- Lista blanca de `type` (los que usa el juego).
- Poda en `hourly()`: `DELETE FROM events WHERE at < now - 180 días`.

**Test:** con un token, 301 POST a `/api/telemetry` en el mismo minuto (cambiando `X-Forwarded-For`) y el último devuelve 429.

## 5. Media — El Worker tiene la llave maestra

**RESUELTO (T51):** `EXCHANGE_SECRET` firma/verifica el canje (server y Worker); cae a `JM_SECRET` con aviso solo en la transición. Falta desplegar: ver server/README.md.

**Dónde:** cf-login/worker.js:51 firma el canje con `env.JM_SECRET`. Es el mismo secreto que firma los tokens de juego (`sign`) y la cookie admin (`setAdmin`, index.js:244).

**Escenario:** cualquiera con acceso a la cuenta de Cloudflare (o a `wrangler secret`), o una fuga del Worker, puede fabricar `sign(JM_SECRET, "admin:x", 43200)`. Eso da una sesión admin completa sin pasar por `ADMIN_KEY` ni por un código, además de tokens `cf-<cualquier mail>` (estos sí validados contra la tabla).

**Arreglo mínimo:** un secreto aparte, `EXCHANGE_SECRET`, que se use solo en `exchangeOk`/`exchangeSig` (server y Worker). Rotarlo y dejar `JM_SECRET` solo en la VPS. Opcional: firmar la cookie admin con su propio `ADMIN_COOKIE_SECRET`.

**Test** (en `lib.test.js`): `exchangeOk(EXCHANGE, body)` acepta una firma hecha con `EXCHANGE` y rechaza una hecha con `JM_SECRET`. En `http.test.js`, una cookie firmada con el secreto del exchange da 401 en `/admin/api/me`.

## 6. Baja — `/auth/login` llena memoria

**RESUELTO (T51):** 20 intentos/15 min por IP y tope de 1000 estados (purga vencidos primero).

**Dónde:** index.js:106-115. Ningún limitador, y cada request agrega una entrada a `states`; solo se purgan las de más de 10 min.

**Escenario:** con GitHub configurado, unos 1000 req/s anónimos son 600 k entradas vivas, cientos de MB. Combinado con `max_memory_restart: 2G` termina en reinicios del proceso.

**Arreglo mínimo:** `const ghOk = limiter(20, 15 * 60e3)` al principio de `/auth/login`, y tope `if (states.size > 1000) return res.status(429)…`.

**Test:** 21 GET a `/auth/login?return=https://junkedmetal.duckdns.org/` desde la misma IP y el último devuelve 429 (con `GITHUB_CLIENT_ID` puesto en el env del test).

## 7. Baja — Amplificación hacia PayPal

**RESUELTO (T51, parcial):** limiter en el webhook (60/min) y en `/return` (20/15 min). Sin cachear el access token de PayPal.

**Dónde:** index.js:367-379. Cada POST al webhook con los 5 headers (cualquier valor) dispara `paypalToken` y `verify-webhook-signature` (pay.js:56-61, 89-100). `/api/pay/paypal/return?token=AAAAA` dispara token + capture.

**Escenario:** un bot anónimo genera miles de llamadas OAuth a PayPal, el límite de la cuenta se agota y los webhooks legítimos fallan, con lo que los pagos no se aplican.

**Arreglo mínimo:** `payOk(ipOf(req))` en `/api/pay/paypal/return`, un limitador propio laxo (p. ej. 60/min) en el webhook, y cachear el access token de PayPal hasta su `expires_in`.

**Test:** en `pay.test.js`, dos `paypalVerify` seguidos con un `fetchFn` contador hacen 1 sola llamada a `/v1/oauth2/token`. En `http.test.js`, 21 GET a `/api/pay/paypal/return` y el último da 429.

## 8. Baja — Orígenes localhost en producción

**RESUELTO (T51):** localhost solo si `NODE_ENV !== "production"`; en el Worker solo con `DEV_ORIGINS="true"`.

**Dónde:** lib.js:4 y worker.js:3. `safeReturn` acepta `http://localhost:5173`.

**Escenario:** se le manda a la víctima `https://jm-login…/login?return=http://localhost:5173/`. Si en su máquina corre cualquier cosa en el 5173 (otro proyecto Vite, malware), recibe `#token=…` con 30 días de validez. Lo mismo pasa con `/auth/login?return=`. Para CORS es menor, porque el token no se envía solo.

**Arreglo mínimo:** sumar los orígenes localhost solo si `E.DEV_ORIGINS === "true"` (en el Worker, si `env.DEV === "true"`).

**Test:** en `lib.test.js`, `safeReturn("http://localhost:5173/")` da `null` cuando la lista no incluye dev.

## 9. Baja — Token en la URL del WebSocket

**Dónde:** index.js:144-147, `GET /peer?token=…`. Es una limitación de PeerJS.

**Escenario:** si Caddy tiene `log` activo, los tokens de 30 días quedan en texto plano en `/var/log/caddy`. Quien lea esos logs se hace pasar por los jugadores.

**Arreglo mínimo:** sin cambiar PeerJS, tener `log` apagado en el site o usar `log { format filter { request>uri query { delete token } } }` en `junkedmetal.caddy`. A futuro, un token corto de un solo uso para `/peer` emitido por `/api/turn`.

**Test:** manual. `grep token= /var/log/caddy/*` no devuelve nada tras conectar.

## 10. Baja — Prefijo del mail en rankings

**Dónde:** index.js:189. Sin alias, el nombre público es `mail.slice(0,3)+"…"`.

**Escenario:** cruzando con otras fuentes, los primeros 3 caracteres ayudan a identificar al jugador. Es menor, pero va contra la idea de "nombre público".

**Arreglo mínimo:** sin alias, usar `"Piloto-" + hash(uid).slice(0,4)` (HMAC con `JM_SECRET`, estable).

**Test:** en el test de leaderboard/daily, un usuario sin alias aparece con un nombre que no empieza con su mail.

## 11. Baja — Cookie admin no revocable

**RESUELTO (T51):** versión de sesión admin en memoria (`admin:<nombre>:<epoch>`); el logout la sube y las cookies previas dan 401.

**Dónde:** index.js:244, 270. Firma sin estado de 12 h; el logout solo hace `clearCookie`.

**Escenario:** si la cookie fue robada (equipo compartido, copia de devtools), hacer logout no la invalida. Tampoco hay forma de cortar todas las sesiones salvo rotar `JM_SECRET`, que además invalida todos los tokens de jugadores.

**Arreglo mínimo:** una variable `adminEpoch` en memoria (o en una tabla) que se incluye en el uid firmado (`admin:<name>:<epoch>`). El logout la incrementa. Es aceptable que un reinicio cierre las sesiones.

**Test:** login, logout y reusar la cookie vieja en `/admin/api/me` da 401.

## 12-14. Informativos

- **12:** `eq()` (index.js:59) devuelve `false` antes de comparar si los largos difieren, así que filtra el largo de `GROUP_KEY`/`ADMIN_KEY`. Arreglo: comparar `sha256(a)` contra `sha256(b)` con `timingSafeEqual`. Test: `eq("x","xx") === false` sin lanzar.
- **13:** backup.sh:15-18 deja los `.db.gz` con los permisos de la umask. Arreglo: `umask 077` al principio del script. Test manual: `stat -c %a` da `600`.
- **14:** index.js:265 acepta un token del juego como login admin si el mail está en `ADMINS`. Un XSS en el juego (el token vive en el `localStorage` del juego) se convertiría en un acceso admin. Conviene dejar esa vía solo en desarrollo, o exigir además un código. No es explotable hoy sin un XSS previo.

## Rutas sin rate limit (para cerrar junto con 3/6/7)

`/auth/login`, `/auth/callback`, `/api/turn`, `/api/stats`, `/api/pay/stripe/webhook`, `/api/pay/paypal/webhook`, `/api/pay/paypal/return`. Ojo: `who()` hace `db.seen()` (una escritura) en cada request autenticado, así que `/api/turn` sin límite también genera escrituras.

## No verificado

- Si el `.env` de la VPS define `NODE_ENV` (hallazgo 2).
- Si Caddy descarta el `X-Forwarded-For` entrante y si tiene `log` activo (hallazgos 3 y 9).
- No se ejecutaron tests ni requests reales: la revisión es estática.
