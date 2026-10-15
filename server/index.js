// Junked Metal: señalización PeerJS propia + auth + credenciales TURN + panel.
import http from "node:http";
import { dirname } from "node:path";
import { timingSafeEqual } from "node:crypto";
import { open } from "node:fs/promises";
import express from "express";
import { ORIGINS, sign, decode, exchangeSecretOf, ipKey } from "./lib.js";
import { openDb, normMail } from "./db.js";
import { syncAccess } from "./access.js";
import { register as registerAuth } from "./routes/auth.js";
import { register as registerOnline } from "./routes/online.js";
import { register as registerCuenta } from "./routes/cuenta.js";
import { register as registerAdmin } from "./routes/admin.js";
import { register as registerOps } from "./routes/ops.js";
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
const EXCHANGE_SECRET = exchangeSecretOf(E); // en producción sin EXCHANGE_SECRET propio el arranque falla (H8)
if (!E.EXCHANGE_SECRET) console.warn("aviso: falta EXCHANGE_SECRET en .env; el canje del Worker usa JM_SECRET (solo fuera de producción)");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", "loopback"); // Caddy en 127.0.0.1 reescribe X-Forwarded-For
const server = http.createServer(app);
const ipOf = (req) => ipKey(req.ip || req.socket.remoteAddress); // trust proxy loopback: req.ip ya sale de Caddy, no del XFF crudo

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

const peers = new Map();
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
const pubName = (u) => db.aliasOf(u) || u.replace(/^cf-/, "").split("@")[0].slice(0, 3) + "…";
// Ficha de un amigo: usuario + suscripción + estadísticas + últimas 20 partidas (run_end) y 10 sesiones (session: ua, w, h, touch).
const evs = (uid, type, n) => db.userEvents(uid, type, n).map((e) => { let d = {}; try { const x = JSON.parse(e.data); if (x && typeof x === "object") d = x; } catch {} return { at: e.at, d }; });
// Revocar corta también los peers abiertos de ese usuario.
const kick = (email) => { for (const [id, p] of peers) if (p.uid === "cf-" + email) { p.c.getSocket()?.close(); peers.delete(id); } };
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

const deps = { E, db, app, server, HOST, PORT, PUBLIC, GAME_URL, ADMINS, REQUIRE_SUB, ALLOW_GH, EXCHANGE_SECRET, ipOf, who, bearer, bearerWho, mailToken, subOk, eq, pubName, evs, peers, kick, stats, accessSync, monitor };
// Orden de registro (rutas con paths disjuntos; el middleware /admin/api va antes de sus rutas dentro de admin.js).
registerAuth(app, deps); registerOnline(app, deps); registerCuenta(app, deps); await registerAdmin(app, deps); registerOps(app, deps);


app.use((req, res) => res.status(404).json({ error: "No encontrado" }));
app.use((err, req, res, next) => { // sin stack al cliente; el detalle va a la consola
  console.error("error http", req.method, req.path, err.message);
  const st = err.status >= 400 && err.status < 500 ? err.status : 500;
  res.status(st).json({ error: st === 500 ? "Error interno" : "Solicitud inválida" });
});
server.listen(PORT, "127.0.0.1", () => console.log(`jm-net en 127.0.0.1:${PORT}`));
