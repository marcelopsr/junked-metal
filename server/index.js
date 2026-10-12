// Junked Metal: señalización PeerJS propia + auth + credenciales TURN + panel.
import http from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFile, open } from "node:fs/promises";
import express from "express";
import { ExpressPeerServer } from "peer";
import { ORIGINS, sign, verify, decode, turnCred, safeReturn, limiter, exchangeOk } from "./lib.js";
import { openDb, normMail } from "./db.js";
import * as pay from "./pay.js";
import { syncAccess } from "./access.js";

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

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", "loopback"); // Caddy en 127.0.0.1 reescribe X-Forwarded-For
const server = http.createServer(app);
const ipOf = (req) => (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress;

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
  const email = exchangeOk(E.JM_SECRET, req.body);
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
const states = new Map();
app.get("/auth/login", (req, res) => {
  if (!E.GITHUB_CLIENT_ID || !E.GITHUB_CLIENT_SECRET) return res.status(503).type("text").send("El ingreso con GitHub no está configurado todavía. Usá la clave de grupo.");
  const ret = safeReturn(String(req.query.return || ""));
  if (!ret) return res.status(400).type("text").send("URL de retorno no permitida");
  const st = randomBytes(16).toString("hex");
  states.set(st, { ret, t: Date.now() });
  for (const [k, v] of states) if (Date.now() - v.t > 10 * 60e3) states.delete(k);
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
  const sala = String(u.searchParams.get("id") || "").startsWith("jm-");
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
const telOk = limiter(120, 60e3);
app.post("/api/telemetry", (req, res) => {
  if (!telOk(ipOf(req))) return res.status(429).end();
  const { token, type, data } = req.body || {}, w = who(String(token || ""));
  if (!w) return res.status(401).end();
  if (!/^[a-z_]{1,32}$/.test(type || "")) return res.status(400).end();
  db.track(w.uid, type, JSON.stringify(data ?? {}).slice(0, 1500));
  res.status(204).end();
});
app.get("/api/stats", async (req, res) => {
  if (!bearer(req)) return res.status(401).json({ error: "Token inválido" });
  res.json(await stats());
});
// Revocar corta también los peers abiertos de ese usuario.
const kick = (email) => { for (const [id, p] of peers) if (p.uid === "cf-" + email) { p.c.getSocket()?.close(); peers.delete(id); } };

// ---------- Portal admin ----------
const COOKIE = "jm_admin", ADMIN_TTL = 12 * 3600;
const cookieOf = (req) => (req.headers.cookie || "").split(";").map((c) => c.trim().split("=")).find(([k]) => k === COOKIE)?.[1];
const adminOf = (req) => { const u = verify(E.JM_SECRET, decodeURIComponent(cookieOf(req) || "")); return u?.startsWith("admin:") ? u.slice(6) : null; };
const setAdmin = (res, name) => res.cookie(COOKIE, sign(E.JM_SECRET, "admin:" + name, ADMIN_TTL), { httpOnly: true, secure: true, sameSite: "strict", path: "/admin", maxAge: ADMIN_TTL * 1000 });
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
app.post("/admin/api/logout", (req, res) => res.clearCookie(COOKIE, { path: "/admin" }).json({ ok: true }));
app.get("/admin/api/me", (req, res) => res.json({ admin: req.admin, admins: ADMINS, pay: { stripe: pay.stripeOn(E), paypal: pay.paypalOn(E) }, requireSubscription: REQUIRE_SUB }));
app.get("/admin/api/users", (req, res) => res.json(db.users()));
app.get("/admin/api/audit", (req, res) => res.json(db.auditList(300)));
app.get("/admin/api/stats", async (req, res) => res.json(await stats()));
app.get("/admin/api/telemetry", (req, res) => res.json({ stats: db.eventStats(Date.now() - 7 * 86400e3), events: db.events(200) }));
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
accessSync(); setInterval(accessSync, 3600e3).unref();
app.post("/admin/api/invite", act(({ email, planId }) => {
  if (!db.plan(planId)) throw new Error("Elegir una licencia: sin licencia no hay acceso al juego");
  if (db.user(email)?.status === "revoked") throw new Error("Usuario revocado: primero Reactivar");
  const { code, expiresAt } = db.invite(email);
  db.applyPayment({ ref: "manual:" + randomBytes(8).toString("hex"), provider: "manual", email, planId }); // licencia inicial: un período
  accessSync();
  return { link: `${GAME_URL}?invite=${code}`, expiresAt };
}));
app.post("/admin/api/user", act(({ email, op, note }) => {
  if (!db.user(email)) throw new Error("Usuario inexistente");
  if (op === "note") return void db.setNote(email, note ?? "");
  if (op === "revoke") { db.setStatus(email, "revoked"); kick(normMail(email)); return void accessSync(); }
  if (op === "activate") { db.setStatus(email, "active"); return void accessSync(); }
  throw new Error("Operación inválida");
}));
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
const payOk = limiter(20, 15 * 60e3);
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
  if (!pay.paypalOn(E)) return res.status(503).json({ error: "PayPal no configurado" });
  let ev = null;
  try { ev = JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString("utf8") : ""); } catch { /* inválido */ }
  if (!(await pay.paypalVerify(E, req.headers, ev))) return res.status(400).json({ error: "Firma inválida" });
  settle(pay.paypalPayment(ev), "paypal");
  res.json({ received: true });
});
app.get("/api/pay/paypal/return", async (req, res) => {
  if (!pay.paypalOn(E)) return res.status(503).json({ error: "PayPal no configurado" });
  try { res.redirect(GAME_URL + (settle(await pay.paypalCapture(E, String(req.query.token || "")), "paypal") ? "?pago=ok" : "?pago=error")); }
  catch (e) { console.error("paypal capture", e.message); res.redirect(GAME_URL + "?pago=error"); }
});
const panelHtml = await readFile(new URL("./panel.html", import.meta.url), "utf8");
app.get("/panel", (req, res) => res.type("html").send(panelHtml));

app.use((req, res) => res.status(404).json({ error: "No encontrado" }));
server.listen(PORT, "127.0.0.1", () => console.log(`jm-net en 127.0.0.1:${PORT}`));
