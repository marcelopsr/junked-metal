# Servidor, Worker, VPS y portada

Fuente única: [../../../server/README.md](../../../server/README.md) (rutas, despliegue, límites, rotar claves, tests).

- **`server/`:** Node + SQLite (`jm-net`): login, señalización PeerJS `/peer`, credenciales TURN, telemetría, récords, panel admin. Código en `index.js`, `routes/`, `db.js`, `monitor.js`. Tests: `npm run test:server`. El juego funciona sin él.
- **VPS:** `ssh vps`, código en `/opt/junkedmetal/`, pm2 `jm-net`, Caddy y coturn delante. Despliegue y claves: ver el README del servidor.
- **Worker `server/cf-login/`:** login con Cloudflare (`worker.js`, `wrangler.toml`); canjea con el servidor. Lo despliega `npm run publicar`.
- **Cliente:** `src/net.ts` (login, `track()`, récords, salas); `VITE_NET_HOST` y `VITE_LOGIN_URL` se fijan al construir en `scripts/publicar.mjs`.
- **Portada y juego público:** `portada/` y el build se publican en GitHub Pages (https://marcelopsr.github.io/junked-metal/) con `.github/workflows/pages.yml` en cada push a `master`. El build usa `base: "./"`: sin rutas absolutas.
- **Estado público:** `portada/estado.html` lee `GET /api/status`.
- **Auditoría:** [../../AUDITORIA-seguridad-server.md](../../AUDITORIA-seguridad-server.md).

Publicar: [../manual/08-publicar.md](../manual/08-publicar.md).
