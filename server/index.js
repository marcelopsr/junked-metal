// Junked Metal: señalización PeerJS propia + auth + credenciales TURN + panel.
import http from "node:http";
import { dirname } from "node:path";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFile, open } from "node:fs/promises";
import express from "express";
import { ExpressPeerServer } from "peer";
import { ORIGINS, sign, verify, decode, turnCred, safeReturn, limiter, exchangeOk } from "./lib.js";
import { openDb, eventsCsv, analysisCsv, EXPORT_MAX, normMail, checkAlias, runEndSospechoso, dayOf, dailySeed, MAX_RUN_END, RUN_END_WINDOW, validMail, WAITLIST_MSG_MAX } from "./db.js";
import * as pay from "./pay.js";
import { syncAccess } from "./access.js";
import { createMonitor, defaultChecks } from "./monitor.js";

const E = process.env;
for (const k of ["JM_SECRET", "TURN_SECRET", "GROUP_KEY"]) if (!E[k]) throw new Error(`falta ${k} en .env`);
const PORT = +(E.PORT || 3310), HOST = E.TURN_HOST || "junkedmetal.duckdns.org";
const ALLOW_GH = (E.ALLOW_GITHUB || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const TURN_LOG = E.TURN_LOG || "/var/log/coturn/turn.log";
const started = Date.now();
// Portal admin (server/README.md § Portal admin).
const db = openDb(E.DB_FILE || "/opt/junkedmetal/data/jm.db", E.INVITES_FILE || "/opt/junkedmetal/data/invites.json");
const ADMINS = (E.ADMIN_EMAILS || "mertenmsalas@gmail.com").split(",").map(normMail).filter(Boolean);
const PUBLIC = E.PUBLIC_URL || "https://junkedmetal.duckdns.org", GAME_URL = E.GAME_URL || "https://jm-login.mesr-96.workers.dev/";
const REQUIRE_SUB = E.REQUIRE_SUBSCRIPTION === "true";
// Secreto del canje con el Worker, aparte de JM_SECRET (que firma tokens y cookie admin). Sin él se usa JM_SECRET (transición).
const EXCHANGE_SECRET = E.EXCHANGE_SECRET || E.JM_SECRET;
if (!E.EXCHANGE_SECRET) console.warn("aviso: falta EXCHANGE_SECRET en .env; el canje del Worker usa JM_SECRET (ver server/README.md)");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", "loopback"); // Caddy en 127.0.0.1 reescribe X-Forwarded-For
const server = http.createServer(app);
const ipOf = (req) => req.ip || req.socket.remoteAddress; // trust proxy loopback: req.ip ya sale de Caddy, no del XFF crudo

app.use((req, res, next) => {
  const o = req.headers.origin;
  if (o && ORIGINS.includes(o)) {
    res.set({ "Access-Control-Allow-Origin": o, Vary: "Origin", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "GET, POST" });
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
// Webhooks de pago: cuerpo crudo (la firma de Stripe se calcula sobre los bytes exactos). Van antes de express.json.
app.use("/api/pay", express.raw({ type: "application/json", limit: "1mb" }));
app.use("/admin/api/invite-batch", express.json({ limit: "16kb" })); // 50 mails no entran en 2 kB; este parser va antes y el global lo salta
app.use("/admin/api/templates", express.json({ limit: "32kb" })); // 3 plantillas de hasta 4 kB; el tope fino se valida en db.saveTemplates (400)
app.use(express.json({ limit: "2kb" }));

// Token → {uid, email}. Los uid "cf-<mail>" (Cloudflare y GitHub por mail) se validan contra la tabla: usuario activo y misma tokenVersion.
function who(token) {
  const d = decode(E.JM_SECRET, token);
  if (!d) return null;
  if (!d.u.startsWith("cf-")) return { uid: d.u, email: null };
  const email = d.u.slice(3);
  if (!db.tokenOk(email, d.v)) return null;
  db.seen(email);
  return { uid: d.u, email };
}
const bearerWho = (req) => who((req.headers.authorization || "").replace(/^Bearer /, ""));
const bearer = (req) => bearerWho(req)?.uid ?? null;
const mailToken = (email) => sign(E.JM_SECRET, "cf-" + email, undefined, undefined, db.user(email).tokenVersion);
// REQUIRE_SUBSCRIPTION=true: TURN y abrir sala exigen suscripción vigente (los admins quedan exentos; tokens de grupo y GitHub sin mail no la tienen).
const subOk = (w) => !REQUIRE_SUB || (!!w?.email && (ADMINS.includes(w.email) || db.subActive(w.email)));
const eq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

app.get("/api/health", (req, res) => res.json({ ok: true, uptime: Math.round(process.uptime()) }));

const loginOk = limiter(10, 15 * 60e3);
app.post("/api/login", (req, res) => {
  if (!loginOk(ipOf(req))) return res.status(429).json({ error: "Demasiados intentos, probá más tarde" });
  if (!eq(req.body?.clave ?? "", E.GROUP_KEY)) return res.status(401).json({ error: "Clave incorrecta" });
  res.json({ token: sign(E.JM_SECRET, "g-" + randomBytes(4).toString("hex")) });
});

// Login Cloudflare: el Worker jm-login manda el mail verificado por Access (y el código ?invite= si vino); acá se decide con la tabla users.
const exchOk = limiter(30, 15 * 60e3);
app.post("/api/cf-exchange", async (req, res) => {
  if (!exchOk(ipOf(req))) return res.status(429).json({ error: "Demasiados intentos" });
  const email = exchangeOk(EXCHANGE_SECRET, req.body);
  if (!email) return res.status(401).json({ error: "Firma inválida" });
  const invite = typeof req.body.invite === "string" ? req.body.invite.slice(0, 64) : null;
  const before = db.user(email)?.status, u = db.redeem(email, invite);
  if (!u) { db.audit(email, "login-rechazado", email, before || "sin usuario", ipOf(req)); return res.status(403).json({ error: "Sin invitación" }); }
  db.audit(email, before === "invited" ? "invitacion-canjeada" : "login", email, "cloudflare", ipOf(req));
  res.json({ token: mailToken(email) });
});

// Canje directo de la invitación (sin Cloudflare): el código de un solo uso identifica al mail; mismo token que cf-exchange.
const redeemOk = limiter(10, 15 * 60e3);
app.post("/api/invite-redeem", (req, res) => {
  if (!redeemOk(ipOf(req))) return res.status(429).json({ error: "Demasiados intentos, probá más tarde" });
  const code = typeof req.body?.code === "string" ? req.body.code.slice(0, 64) : "";
  const r = db.redeemCode(code);
  if (!r.user) { db.audit("?", "invitacion-rechazada", null, r.error, ipOf(req)); return res.status(403).json({ error: r.error }); }
  db.audit(r.user.email, "invitacion-canjeada", r.user.email, "directo", ipOf(req));
  res.json({ token: mailToken(r.user.email) });
});

// Lista de espera pública (T63): 5/h por IP y tope global diario (WAITLIST_DAILY_MAX, 200). Honeypot `web` con valor = se descarta en silencio.
// Siempre 202 con datos válidos: no revela si el mail ya está en la lista o ya es usuario. ponytail: límites en memoria, se reinician con el proceso.
const wlOk = limiter(5, 3600e3), wlDay = limiter(+(E.WAITLIST_DAILY_MAX || 200), 86400e3);
app.post("/api/waitlist", (req, res) => {
  if (!wlOk(ipOf(req)) || !wlDay("global")) return res.status(429).json({ error: "Demasiadas solicitudes, intenta más tarde" });
  const b = req.body || {}, email = normMail(b.email), mensaje = typeof b.mensaje === "string" ? b.mensaje.trim() : "";
  if (!validMail(email)) return res.status(400).json({ error: "Correo inválido" });
  if (mensaje.length > WAITLIST_MSG_MAX) return res.status(400).json({ error: `El mensaje admite hasta ${WAITLIST_MSG_MAX} caracteres` });
  if (b.web) return res.status(202).json({ ok: true }); // honeypot: no se guarda
  if (!db.user(email)) db.waitlistAdd(email, mensaje);
  res.status(202).json({ ok: true });
});

app.get("/api/turn", (req, res) => {
  const w = bearerWho(req);
  if (!w) return res.status(401).json({ error: "Token inválido" });
  if (!subOk(w)) return res.status(402).json({ error: "Suscripción vencida o inexistente" });
  const c = turnCred(E.TURN_SECRET, w.uid);
  res.json({ iceServers: [
    { urls: `stun:${HOST}:3478` },
    { urls: [`turn:${HOST}:3478?transport=udp`, `turn:${HOST}:3478?transport=tcp`], ...c },
  ] });
});

// OAuth GitHub con lista blanca.
const states = new Map(), STATES_MAX = 1000, ghOk = limiter(20, 15 * 60e3);
app.get("/auth/login", (req, res) => {
  if (!ghOk(ipOf(req))) return res.status(429).type("text").send("Demasiados intentos, probá más tarde");
  if (!E.GITHUB_CLIENT_ID || !E.GITHUB_CLIENT_SECRET) return res.status(503).type("text").send("El ingreso con GitHub no está configurado todavía. Usá la clave de grupo.");
  const ret = safeReturn(String(req.query.return || ""));
  if (!ret) return res.status(400).type("text").send("URL de retorno no permitida");
  for (const [k, v] of states) if (Date.now() - v.t > 10 * 60e3) states.delete(k);
  if (states.size >= STATES_MAX) return res.status(429).type("text").send("Servidor ocupado, probá en unos minutos");
  const st = randomBytes(16).toString("hex");
  states.set(st, { ret, t: Date.now() });
  res.redirect("https://github.com/login/oauth/authorize?" + new URLSearchParams({ client_id: E.GITHUB_CLIENT_ID, state: st, scope: "user:email" }));
});
app.get("/auth/callback", async (req, res) => {
  const s = states.get(String(req.query.state || ""));
  states.delete(String(req.query.state || ""));
  if (!s || Date.now() - s.t > 10 * 60e3) return res.status(400).type("text").send("Sesión de ingreso vencida, volvé a intentar");
  try {
    const tok = await (await fetch("https://github.com/login/oauth/access_token", {
      method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: E.GITHUB_CLIENT_ID, client_secret: E.GITHUB_CLIENT_SECRET, code: String(req.query.code || "") }),
    })).json();
    if (!tok.access_token) throw new Error("sin access_token");
    const user = await (await fetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${tok.access_token}`, "User-Agent": "junkedmetal" } })).json();
    const login = String(user.login || "").toLowerCase();
    // Preferido: un mail verificado de GitHub que esté activo en la tabla. Si no, la lista ALLOW_GITHUB por login (sin revocación por tabla).
    const emails = await (await fetch("https://api.github.com/user/emails", { headers: { Authorization: `Bearer ${tok.access_token}`, "User-Agent": "junkedmetal" } })).json().catch(() => []);
    const mail = (Array.isArray(emails) ? emails : []).filter((e) => e.verified).map((e) => normMail(e.email)).find((m) => db.user(m)?.status === "active");
    if (mail) { db.audit(mail, "login", mail, "github " + login, ipOf(req)); return res.redirect(s.ret + "#token=" + mailToken(mail)); }
    if (!login || !ALLOW_GH.includes(login)) return res.status(403).type("text").send("El usuario de GitHub no está en la lista de invitados");
    db.audit("gh-" + login, "login", null, "github ALLOW_GITHUB", ipOf(req));
    res.redirect(s.ret + "#token=" + sign(E.JM_SECRET, "gh-" + login));
  } catch (e) {
    console.error("oauth", e.message);
    res.status(502).type("text").send("No se pudo validar con GitHub");
  }
});

// PeerJS: solo con token válido (query `token`, que el cliente pasa como opción `token` de Peer).
const peers = new Map();
const peerOpenOk = limiter(30, 60e3);
server.on("upgrade", (req, socket) => {
  const u = new URL(req.url, "http://x");
  if (!u.pathname.startsWith("/peer")) return socket.destroy();
  const w = who(u.searchParams.get("token"));
  const pid = String(u.searchParams.get("id") || ""), sala = pid.startsWith("jm-") || pid.startsWith("jmv-"); // jmv- = espectador: mismo requisito de suscripción, pero no cuenta como sala
  if (!w || !peerOpenOk(ipOf(req)) || (sala && !subOk(w))) { socket.write("HTTP/1.1 403 Forbidden\r\n\r\n"); return socket.destroy(); }
  req.jmUid = w.uid;
});
const peerApp = ExpressPeerServer(server, { path: "/", allow_discovery: false, alive_timeout: 60e3, concurrent_limit: 200 });
peerApp.on("connection", (c) => {
  const w = who(c.getToken());
  if (!w) return c.getSocket()?.close();
  peers.set(c.getId(), { uid: w.uid, since: Date.now(), c });
});
peerApp.on("disconnect", (c) => peers.delete(c.getId()));
app.use("/peer", peerApp);

// Salas en curso para espectar (T34): sala = peer "jm-<código>"; espectador = peer "jmv-<código>-<rand>" (no ocupa cupo ni cuenta como sala).
const salasOk = limiter(60, 60e3);
app.get("/api/salas", (req, res) => {
  if (!salasOk(ipOf(req))) return res.status(429).end();
  const w = bearerWho(req);
  if (!w) return res.status(401).json({ error: "Token inválido" });
  const viewers = {};
  for (const id of peers.keys()) { const m = /^jmv-([^-]+)-/.exec(id); if (m) viewers[m[1]] = (viewers[m[1]] || 0) + 1; }
  res.json([...peers].filter(([id]) => id.startsWith("jm-")).map(([id, p]) => ({ id, code: id.slice(3), host: pubName(p.uid), seg: Math.round((Date.now() - p.since) / 1000), espectadores: viewers[id.slice(3)] || 0 })));
});

// Panel.
async function turnTail() {
  try {
    const f = await open(TURN_LOG);
    const { size } = await f.stat(), n = Math.min(size, 64e3), buf = Buffer.alloc(n);
    await f.read(buf, 0, n, size - n); await f.close();
    return buf.toString().split("\n").filter((l) => /ALLOCATE processed|closed \(/.test(l)).slice(-25);
  } catch { return ["(sin acceso al log de coturn)"]; }
}
const stats = async () => {
  const list = [...peers].map(([id, p]) => ({ id, uid: p.uid, sala: id.startsWith("jm-"), seg: Math.round((Date.now() - p.since) / 1000) }));
  return { uptime: Math.round((Date.now() - started) / 1000), peers: list, usuarios: [...new Set(list.map((p) => p.uid))], turn: await turnTail() };
};
// Telemetría: solo con token válido (el token va en el cuerpo para poder usar keepalive/beacon). Tipos y tamaño acotados.
// run_end sospechoso (ver runEndSospechoso) o en ráfaga: no se guarda, se audita "telemetria-sospechosa" y se responde 204 igual (sin pistas al tramposo).
const telOk = limiter(120, 60e3), TEL_DAILY_MAX = +(E.TEL_DAILY_MAX || 2000), telUid = limiter(TEL_DAILY_MAX, 86400e3); // cuota por uid: 2000 eventos/día (en memoria; se reinicia con el proceso)
app.post("/api/telemetry", (req, res) => {
  if (!telOk(ipOf(req))) return res.status(429).end();
  const { token, type, data } = req.body || {}, w = who(String(token || ""));
  if (!w) return res.status(401).end();
  if (!telUid(w.uid)) return res.status(429).end();
  if (!/^[a-z_]{1,32}$/.test(type || "")) return res.status(400).end();
  if (type === "run_end") {
    const why = runEndSospechoso(data) || (db.recentCount(w.uid, "run_end", Date.now() - RUN_END_WINDOW) >= MAX_RUN_END ? `más de ${MAX_RUN_END} run_end en 10 min` : null);
    if (why) { db.audit(w.uid, "telemetria-sospechosa", w.uid, why, ipOf(req)); return res.status(204).end(); }
  }
  db.track(w.uid, type, JSON.stringify(data ?? {}).slice(0, 1500));
  res.status(204).end();
});
const pubName = (u) => db.aliasOf(u) || u.replace(/^cf-/, "").split("@")[0].slice(0, 3) + "…";
// Desafío diario: semilla de hoy (UTC) y top 10 con nombre público (nunca mail completo). Cuenta solo el primer run_end de cada usuario con daily===date y seed===seed.
const dailyOk = limiter(60, 60e3);
app.get("/api/daily", (req, res) => {
  if (!dailyOk(ipOf(req))) return res.status(429).end();
  const w = bearerWho(req);
  if (!w || !w.email) return res.status(401).json({ error: "Token inválido" });
  const date = dayOf(), seed = dailySeed(E.JM_SECRET, date), all = db.dailyBoard(date, seed);
  const row = (r) => ({ name: pubName(r.uid), win: !!r.win, t: r.t, kills: r.kills, lv: r.lv });
  const i = all.findIndex((r) => r.uid === w.uid);
  res.json({ date, seed, board: all.slice(0, 10).map(row), mine: i < 0 ? null : { ...row(all[i]), rank: i + 1 } });
});
// Ranking semanal: top 20 (alias + mejor kills) desde el lunes 00:00 UTC.
app.get("/api/ranking/semanal", (req, res) => {
  if (!dailyOk(ipOf(req))) return res.status(429).end();
  if (!bearerWho(req)) return res.status(401).json({ error: "Token inválido" });
  const d = new Date(), since = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  res.json(db.weeklyTop(since).map((r) => ({ name: pubName(r.uid), score: r.score })));
});
const lbOk = limiter(60, 60e3);
const lbRows = (n) => db.encoreTop(10).map((r) => ({ ...r, name: n(r.uid) }));
app.get("/api/leaderboard", (req, res) => {
  if (!lbOk(ipOf(req))) return res.status(429).end();
  if (!bearerWho(req)) return res.status(401).json({ error: "Token inválido" });
  res.json(lbRows(pubName).map(({ name, loop, stage, t, win }) => ({ name, loop, stage, t, win: !!win })));
});
// Alias público y datos de cuenta del usuario del token (solo uid cf-<mail>).
const aliasOk = limiter(10, 15 * 60e3);
app.post("/api/alias", (req, res) => {
  if (!aliasOk(ipOf(req))) return res.status(429).json({ error: "Demasiados intentos, probá más tarde" });
  const w = bearerWho(req);
  if (!w?.email) return res.status(401).json({ error: "Token inválido" });
  try { db.setAlias(w.email, checkAlias(req.body?.alias)); } catch (e) { return res.status(400).json({ error: e.message }); }
  db.audit(w.email, "alias", w.email, db.user(w.email).alias, ipOf(req));
  res.json({ alias: db.user(w.email).alias });
});
const meOk = limiter(60, 60e3);
app.get("/api/me", (req, res) => {
  if (!meOk(ipOf(req))) return res.status(429).end();
  const w = bearerWho(req);
  if (!w?.email) return res.status(401).json({ error: "Token inválido" });
  const u = db.user(w.email), s = db.sub(w.email), p = s?.planId ? db.plan(s.planId) : null;
  res.json({ email: u.email, alias: u.alias || null, status: u.status, plan: { name: p?.name ?? (s ? "Manual" : null), currentPeriodEnd: s?.currentPeriodEnd ?? null, active: db.subActive(w.email) } });
});
const meStatsOk = limiter(60, 60e3);
app.get("/api/me/stats", (req, res) => {
  if (!meStatsOk(ipOf(req))) return res.status(429).end();
  const w = bearerWho(req);
  if (!w?.email) return res.status(401).json({ error: "Token inválido" });
  res.json(db.userStats(w.uid));
});
app.get("/api/me/logros", (req, res) => {
  if (!meStatsOk(ipOf(req))) return res.status(429).end();
  const w = bearerWho(req);
  if (!w?.email) return res.status(401).json({ error: "Token inválido" });
  res.json(db.userLogros(w.uid));
});
app.get("/api/stats", async (req, res) => {
  if (!bearer(req)) return res.status(401).json({ error: "Token inválido" });
  const { uptime, peers: ps } = await stats(); // solo contadores: el detalle (uid, ids de sala, coturn) es de /admin/api/stats
  res.json({ uptime, peers: ps.length, salas: ps.filter((p) => p.sala).length });
});
// Revocar corta también los peers abiertos de ese usuario.
const kick = (email) => { for (const [id, p] of peers) if (p.uid === "cf-" + email) { p.c.getSocket()?.close(); peers.delete(id); } };

// ---------- Portal admin ----------
const COOKIE = "jm_admin", ADMIN_TTL = 12 * 3600;
const cookieOf = (req) => (req.headers.cookie || "").split(";").map((c) => c.trim().split("=")).find(([k]) => k === COOKIE)?.[1];
const safeDecode = (v) => { try { return decodeURIComponent(v); } catch { return ""; } }; // cookie %E0 → no admin, no 500
// Versión de sesión admin en memoria: el logout la sube y las cookies anteriores dejan de valer (también las de otros admins). Un reinicio cierra todas (arranca en Date.now()).
let adminEpoch = Date.now();
const adminOf = (req) => {
  const u = verify(E.JM_SECRET, safeDecode(cookieOf(req) || ""));
  if (!u?.startsWith("admin:")) return null;
  const r = u.slice(6), i = r.lastIndexOf(":");
  return i > 0 && +r.slice(i + 1) === adminEpoch ? r.slice(0, i) : null;
};
const setAdmin = (res, name) => res.cookie(COOKIE, sign(E.JM_SECRET, `admin:${name}:${adminEpoch}`, ADMIN_TTL), { httpOnly: true, secure: true, sameSite: "strict", path: "/admin", maxAge: ADMIN_TTL * 1000 });
const adminLoginOk = limiter(10, 15 * 60e3), adminApiOk = limiter(300, 60e3);
// CSRF: cookie SameSite=Strict + las escrituras exigen JSON (fuerza preflight entre orígenes) y, si viene Origin, que sea el propio.
app.use("/admin/api", (req, res, next) => {
  if (!adminApiOk(ipOf(req))) return res.status(429).json({ error: "Demasiadas solicitudes" });
  if (req.method === "POST") {
    if (!req.is("application/json")) return res.status(415).json({ error: "Se espera JSON" });
    const o = req.headers.origin;
    if (o && o !== PUBLIC && o !== `http://127.0.0.1:${PORT}`) return res.status(403).json({ error: "Origen no permitido" });
  }
  if (req.path === "/login") return next();
  req.admin = adminOf(req);
  if (!req.admin) return res.status(401).json({ error: "Sesión de administración requerida" });
  next();
});
app.post("/admin/api/login", (req, res) => {
  if (!adminLoginOk(ipOf(req))) return res.status(429).json({ error: "Demasiados intentos, esperar 15 minutos" });
  const { key, code, token } = req.body || {};
  let name = null;
  if (key && E.ADMIN_KEY && eq(key, E.ADMIN_KEY)) name = "clave";
  else if (code && db.useAdminCode(code)) name = "codigo";
  else if (token) { const w = who(token); if (w?.email && ADMINS.includes(w.email)) name = w.email; }
  if (!name) { db.audit("?", "admin-login-fallido", null, null, ipOf(req)); return res.status(401).json({ error: "Credencial incorrecta" }); }
  db.audit("admin:" + name, "admin-login", null, null, ipOf(req));
  setAdmin(res, name).json({ ok: true, admin: name });
});
app.post("/admin/api/logout", (req, res) => (adminEpoch = Math.max(adminEpoch + 1, Date.now()), res).clearCookie(COOKIE, { path: "/admin" }).json({ ok: true }));
app.get("/admin/api/me", (req, res) => res.json({ admin: req.admin, admins: ADMINS, pay: { stripe: pay.stripeOn(E), paypal: pay.paypalOn(E) }, requireSubscription: REQUIRE_SUB }));
app.get("/admin/api/users", (req, res) => res.json(db.users()));
app.get("/admin/api/expiring", (req, res) => res.json(db.expiring(3)));
app.get("/admin/api/audit", (req, res) => res.json(db.auditList(300)));
app.get("/admin/api/stats", async (req, res) => res.json(await stats()));
app.get("/admin/api/telemetry", (req, res) => res.json({ daily: { date: dayOf(), board: db.dailyBoard(dayOf(), dailySeed(E.JM_SECRET, dayOf())).slice(0, 10) }, stats: db.eventStats(Date.now() - 7 * 86400e3), events: db.events(200), leaderboard: db.encoreTop(10), analysis: db.telemetryAnalysis(Date.now() - 30 * 86400e3) }));
app.get("/admin/api/uso", (req, res) => res.json(db.usageStats(Date.now() - 30 * 86400e3)));
app.get("/admin/api/export", (req, res) => {
  const what = req.query.what, days = Math.min(Math.max(Math.floor(+req.query.days) || 30, 1), 3650);
  if (what !== "events" && what !== "analysis") return res.status(400).json({ error: "what debe ser events o analysis" });
  const since = Date.now() - days * 86400e3;
  const body = what === "events" ? eventsCsv(db.eventsSince(since, EXPORT_MAX)) : analysisCsv(db.telemetryAnalysis(since));
  res.type("text/csv; charset=utf-8").set("Content-Disposition", `attachment; filename="telemetria-${what}-${dayOf()}.csv"`).send("\ufeff" + body + "\r\n");
});
app.get("/admin/api/templates", (req, res) => res.json(db.templates()));
app.get("/admin/api/plans", (req, res) => res.json(db.plans()));
const act = (fn) => (req, res) => {
  try {
    const r = fn(req.body || {}, req);
    db.audit("admin:" + req.admin, req.path.replace("/admin/api/", ""), req.body?.email || req.body?.id || null, JSON.stringify(req.body).slice(0, 300), ipOf(req));
    res.json(r ?? { ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
};
// Access solo deja pasar mails no revocados con licencia vigente (y admins); se re-sincroniza tras cada cambio y cada hora (vencimientos).
let accessQ = Promise.resolve(); // en cadena: dos PUT nunca se cruzan y el último lleva la lista más nueva
const accessSync = () => (accessQ = accessQ.then(() => syncAccess(E, [...ADMINS, ...db.users().filter((u) => u.status !== "revoked" && db.subActive(u.email)).map((u) => u.email)]))
  .catch((e) => { console.error(e.message); db.audit("sistema", "access-error", null, e.message.slice(0, 300)); }));
// ponytail: hoy solo audita (no hay credenciales de mail). Para enviar de verdad: SMTP (nodemailer) o Resend (fetch a api.resend.com/emails con RESEND_API_KEY) acá dentro.
const notify = (email, text) => db.audit("sistema", "notify", email, text);
const EVENTS_KEEP_MS = 90 * 86400e3; // retención de telemetría
const hourly = () => { accessSync(); try { db.pruneEvents(Date.now() - EVENTS_KEEP_MS); } catch (e) { console.error(e.message); } try { db.noticeExpiring(notify); } catch (e) { console.error(e.message); } };
hourly(); setInterval(hourly, 3600e3).unref();
// Monitoreo cada 5 min: worker, coturn, disco y DB; audita solo cambios de estado y avisa caídas.
const monitor = createMonitor({ checks: defaultChecks({ db, dataDir: dirname(E.DB_FILE || "/opt/junkedmetal/data/jm.db") }), audit: (...a) => db.audit(...a), notify, admin: ADMINS[0] });
const monRun = () => monitor.run().catch((e) => console.error("monitor", e.message));
monRun(); setInterval(monRun, 300e3).unref();
app.get("/admin/api/health", (req, res) => res.json(monitor.estado()));
// Estado público (T54): solo ok/caido por función, sin detalles. online = coturn (la señalización /peer vive en este mismo proceso). Sin dato aún = caido.
const statusOk = limiter(30, 60e3);
app.get("/api/status", (req, res) => {
  if (!statusOk(ipOf(req))) return res.status(429).json({ error: "Demasiadas consultas" });
  const e = monitor.estado(), up = (...n) => (n.every((k) => e[k]?.ok) ? "ok" : "caido");
  res.set("Cache-Control", "public, max-age=30").json({ juego: up("worker"), online: up("coturn"), login: up("worker", "db"), actualizado: new Date().toISOString() });
});
// Invitar a uno: licencia obligatoria, revocado no se reinvita; la licencia inicial es un período. accessSync lo llama quien invita (una vez al final en lote).
const inviteOne = (email, planId) => {
  if (!db.plan(planId)) throw new Error("Elegir una licencia: sin licencia no hay acceso al juego");
  if (db.user(email)?.status === "revoked") throw new Error("Usuario revocado: primero Reactivar");
  const { code, expiresAt } = db.invite(email);
  db.applyPayment({ ref: "manual:" + randomBytes(8).toString("hex"), provider: "manual", email, planId });
  return { link: `${GAME_URL}?invite=${code}`, expiresAt };
};
app.post("/admin/api/invite", act(({ email, planId }) => { const r = inviteOne(email, planId); accessSync(); return r; }));
// Lote (máx. 50): cada mail se valida y falla por separado ({email, error}); los repetidos (sin distinguir mayúsculas) solo cuentan una vez; accessSync una sola vez al final.
const BATCH_MAX = 50;
app.post("/admin/api/invite-batch", act(({ emails, planId }) => {
  if (!Array.isArray(emails) || !emails.length) throw new Error("Pasar al menos un mail");
  if (emails.length > BATCH_MAX) throw new Error(`Máximo ${BATCH_MAX} mails por lote`);
  if (!db.plan(planId)) throw new Error("Elegir una licencia: sin licencia no hay acceso al juego");
  const seen = new Set();
  const results = emails.map((raw) => {
    const email = normMail(raw);
    if (seen.has(email)) return { email, error: "Repetido en el lote" };
    seen.add(email);
    try { return { email, ...inviteOne(email, planId) }; } catch (e) { return { email, error: e.message }; }
  });
  if (results.some((r) => r.link)) accessSync();
  return { results };
}));
// Lista de espera en el panel: invitar reusa inviteOne (licencia elegida) y marca invitado; descartar la oculta.
app.get("/admin/api/waitlist", (req, res) => res.json(db.waitlist()));
app.post("/admin/api/waitlist/invite", act(({ email, planId }) => { db.waitlistSet(email, "pendiente"); const r = inviteOne(normMail(email), planId); db.waitlistSet(email, "invitado"); accessSync(); return r; }));
app.post("/admin/api/waitlist/discard", act(({ email }) => db.waitlistSet(email, "descartado")));
// Ficha de un amigo: usuario + suscripción + estadísticas + últimas 20 partidas (run_end) y 10 sesiones (session: ua, w, h, touch).
const evs = (uid, type, n) => db.userEvents(uid, type, n).map((e) => { let d = {}; try { const x = JSON.parse(e.data); if (x && typeof x === "object") d = x; } catch {} return { at: e.at, d }; });
app.get("/admin/api/user/:email/detail", (req, res) => {
  const u = db.user(req.params.email);
  if (!u) return res.status(404).json({ error: "Usuario inexistente" });
  const uid = "cf-" + u.email, { tokenVersion, ...user } = u;
  res.json({ user, sub: db.sub(u.email) ?? null, stats: db.userStats(uid), runs: evs(uid, "run_end", 20), sessions: evs(uid, "session", 10) });
});
app.post("/admin/api/user", act(({ email, op, note, alias }) => {
  if (!db.user(email)) throw new Error("Usuario inexistente");
  if (op === "note") return void db.setNote(email, note ?? "");
  if (op === "alias") return void db.setAlias(email, alias);
  if (op === "revoke") { db.setStatus(email, "revoked"); kick(normMail(email)); return void accessSync(); }
  if (op === "activate") { db.setStatus(email, "active"); return void accessSync(); }
  throw new Error("Operación inválida");
}));
app.post("/admin/api/templates", act((b) => ({ templates: db.saveTemplates(b) })));
app.post("/admin/api/plan", act((p) => void db.savePlan(p)));
app.post("/admin/api/plan/delete", act(({ id }) => { if (!db.deletePlan(id)) throw new Error("Plan inexistente"); }));
// Suscripción a mano: set = plan y vencimiento exactos; paid = registrar un pago manual (extiende un período); cancel.
app.post("/admin/api/sub", act(({ email, op, planId, until }) => {
  if (op === "set") db.setSub(email, planId, Date.parse(until));
  else if (op === "paid") { if (!db.user(email)) throw new Error("Usuario inexistente"); db.applyPayment({ ref: "manual:" + randomBytes(8).toString("hex"), provider: "manual", email, planId }); }
  else if (op === "cancel") { if (!db.cancelSub(email)) throw new Error("Sin suscripción"); }
  else throw new Error("Operación inválida");
  accessSync();
}));
const adminHtml = await readFile(new URL("./admin.html", import.meta.url), "utf8");
app.get("/admin", (req, res) => res.status(adminOf(req) ? 200 : 401).set("Cache-Control", "no-store").type("html").send(adminHtml));

// ---------- Pagos ----------
const payOk = limiter(20, 15 * 60e3), ppHookOk = limiter(60, 60e3);
// Aplica un pago confirmado solo si coincide con el precio y la moneda del plan.
function settle(p, src) {
  if (!p) return false;
  const plan = db.plan(p.planId);
  if (!plan || !db.user(p.email) || p.amount !== plan.price || p.currency !== plan.currency) { db.audit(src, "pago-rechazado", p.email, JSON.stringify(p)); return false; }
  if (db.applyPayment(p)) { db.audit(src, "pago-aplicado", p.email, `${p.planId} ${p.ref}`); accessSync(); }
  return true;
}
app.get("/api/pay/checkout", async (req, res) => {
  if (!payOk(ipOf(req))) return res.status(429).json({ error: "Demasiados intentos" });
  const w = bearerWho(req);
  if (!w?.email) return res.status(401).json({ error: "Se requiere ingresar con mail" });
  const plan = db.plan(String(req.query.plan || "")), prov = String(req.query.provider || "");
  if (!plan) return res.status(404).json({ error: "Plan inexistente" });
  if (prov !== "stripe" && prov !== "paypal") return res.status(400).json({ error: "provider debe ser stripe o paypal" });
  if (!(prov === "stripe" ? pay.stripeOn(E) : pay.paypalOn(E))) return res.status(503).json({ error: `Pagos con ${prov} no configurados en el servidor` });
  try {
    const r = prov === "stripe"
      ? await pay.stripeCheckout(E, { plan, email: w.email, successUrl: GAME_URL + "?pago=ok", cancelUrl: GAME_URL + "?pago=cancelado" })
      : await pay.paypalCheckout(E, { plan, email: w.email, returnUrl: PUBLIC + "/api/pay/paypal/return", cancelUrl: GAME_URL + "?pago=cancelado" });
    db.audit(w.email, "checkout", w.email, `${prov} ${plan.id} ${r.ref}`, ipOf(req));
    res.json({ url: r.url });
  } catch (e) { console.error("checkout", e.message); res.status(502).json({ error: "La pasarela no respondió" }); }
});
app.post("/api/pay/stripe/webhook", (req, res) => {
  if (!pay.stripeOn(E)) return res.status(503).json({ error: "Stripe no configurado" });
  const ev = pay.stripeVerify(E.STRIPE_WEBHOOK_SECRET, req.body, req.headers["stripe-signature"]);
  if (!ev) return res.status(400).json({ error: "Firma inválida" });
  settle(pay.stripePayment(ev), "stripe");
  res.json({ received: true });
});
app.post("/api/pay/paypal/webhook", async (req, res) => {
  if (!ppHookOk(ipOf(req))) return res.status(429).json({ error: "Demasiadas solicitudes" });
  if (!pay.paypalOn(E)) return res.status(503).json({ error: "PayPal no configurado" });
  let ev = null;
  try { ev = JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString("utf8") : ""); } catch { /* inválido */ }
  if (!(await pay.paypalVerify(E, req.headers, ev))) return res.status(400).json({ error: "Firma inválida" });
  settle(pay.paypalPayment(ev), "paypal");
  res.json({ received: true });
});
app.get("/api/pay/paypal/return", async (req, res) => {
  if (!payOk(ipOf(req))) return res.status(429).json({ error: "Demasiados intentos" });
  if (!pay.paypalOn(E)) return res.status(503).json({ error: "PayPal no configurado" });
  try { res.redirect(GAME_URL + (settle(await pay.paypalCapture(E, String(req.query.token || "")), "paypal") ? "?pago=ok" : "?pago=error")); }
  catch (e) { console.error("paypal capture", e.message); res.redirect(GAME_URL + "?pago=error"); }
});
app.get("/panel", (req, res) => res.redirect(302, "/admin")); // el detalle de red vive en /admin → Red (H4: /api/stats ya no expone mails ni IPs)

app.use((req, res) => res.status(404).json({ error: "No encontrado" }));
app.use((err, req, res, next) => { // sin stack al cliente; el detalle va a la consola
  console.error("error http", req.method, req.path, err.message);
  const st = err.status >= 400 && err.status < 500 ? err.status : 500;
  res.status(st).json({ error: st === 500 ? "Error interno" : "Solicitud inválida" });
});
server.listen(PORT, "127.0.0.1", () => console.log(`jm-net en 127.0.0.1:${PORT}`));
