# jm-net: servidor de red de Junked Metal

Señalización PeerJS propia (`/peer`), login (clave de grupo o GitHub con lista blanca), credenciales TURN temporales y panel. Node 20.6+ (VPS: 24), ESM, dependencias fijas: `express` 4.21.2 y `peer` 1.0.2.

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
- Config en `/opt/junkedmetal/.env` (600): `JM_SECRET`, `TURN_SECRET`, `GROUP_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ALLOW_GITHUB` (logins separados por coma), `PORT`, `TURN_HOST`.
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
