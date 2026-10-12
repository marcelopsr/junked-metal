// Junked Metal: señalización PeerJS propia + auth + credenciales TURN + panel.
import http from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFile, open } from "node:fs/promises";
import express from "express";
import { ExpressPeerServer } from "peer";
import { ORIGINS, sign, verify, turnCred, safeReturn, limiter, exchangeOk } from "./lib.js";

const E = process.env;
for (const k of ["JM_SECRET", "TURN_SECRET", "GROUP_KEY"]) if (!E[k]) throw new Error(`falta ${k} en .env`);
const PORT = +(E.PORT || 3310), HOST = E.TURN_HOST || "junkedmetal.duckdns.org";
const ALLOW_GH = (E.ALLOW_GITHUB || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const TURN_LOG = E.TURN_LOG || "/var/log/coturn/turn.log";
const started = Date.now();

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
app.use(express.json({ limit: "2kb" }));

const bearer = (req) => verify(E.JM_SECRET, (req.headers.authorization || "").replace(/^Bearer /, ""));
const eq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

app.get("/api/health", (req, res) => res.json({ ok: true, uptime: Math.round(process.uptime()) }));

const loginOk = limiter(10, 15 * 60e3);
app.post("/api/login", (req, res) => {
  if (!loginOk(ipOf(req))) return res.status(429).json({ error: "Demasiados intentos, probá más tarde" });
  if (!eq(req.body?.clave ?? "", E.GROUP_KEY)) return res.status(401).json({ error: "Clave incorrecta" });
  res.json({ token: sign(E.JM_SECRET, "g-" + randomBytes(4).toString("hex")) });
});

// Login Cloudflare: el Worker jm-login manda el mail verificado por Access; acá se decide si está invitado.
// ponytail: invitados en un JSON leído en cada canje; lo reemplaza el portal de administración (SQLite).
const INVITES = E.INVITES_FILE || "/opt/junkedmetal/data/invites.json";
const exchOk = limiter(30, 15 * 60e3);
app.post("/api/cf-exchange", async (req, res) => {
  if (!exchOk(ipOf(req))) return res.status(429).json({ error: "Demasiados intentos" });
  const email = exchangeOk(E.JM_SECRET, req.body);
  if (!email) return res.status(401).json({ error: "Firma inválida" });
  let list = [];
  try { list = JSON.parse(await readFile(INVITES, "utf8")); } catch { return res.status(503).json({ error: "Lista de invitados no disponible" }); }
  const inv = Array.isArray(list) && list.find((i) => String(i.email).toLowerCase() === email);
  if (!inv || inv.status !== "active") return res.status(403).json({ error: "Sin invitación" });
  res.json({ token: sign(E.JM_SECRET, "cf-" + email) });
});

app.get("/api/turn", (req, res) => {
  const uid = bearer(req);
  if (!uid) return res.status(401).json({ error: "Token inválido" });
  const c = turnCred(E.TURN_SECRET, uid);
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
  res.redirect("https://github.com/login/oauth/authorize?" + new URLSearchParams({ client_id: E.GITHUB_CLIENT_ID, state: st, scope: "" }));
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
    if (!login || !ALLOW_GH.includes(login)) return res.status(403).type("text").send("Tu usuario de GitHub no está en la lista de invitados");
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
  const uid = verify(E.JM_SECRET, u.searchParams.get("token"));
  if (!uid || !peerOpenOk(ipOf(req))) { socket.write("HTTP/1.1 403 Forbidden\r\n\r\n"); return socket.destroy(); }
  req.jmUid = uid;
});
const peerApp = ExpressPeerServer(server, { path: "/", allow_discovery: false, alive_timeout: 60e3, concurrent_limit: 200 });
peerApp.on("connection", (c) => {
  const uid = verify(E.JM_SECRET, c.getToken());
  if (!uid) return c.getSocket()?.close();
  peers.set(c.getId(), { uid, since: Date.now() });
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
app.get("/api/stats", async (req, res) => {
  if (!bearer(req)) return res.status(401).json({ error: "Token inválido" });
  const list = [...peers].map(([id, p]) => ({ id, uid: p.uid, sala: id.startsWith("jm-"), seg: Math.round((Date.now() - p.since) / 1000) }));
  res.json({ uptime: Math.round((Date.now() - started) / 1000), peers: list, usuarios: [...new Set(list.map((p) => p.uid))], turn: await turnTail() });
});
const panelHtml = await readFile(new URL("./panel.html", import.meta.url), "utf8");
app.get("/panel", (req, res) => res.type("html").send(panelHtml));

app.use((req, res) => res.status(404).json({ error: "No encontrado" }));
server.listen(PORT, "127.0.0.1", () => console.log(`jm-net en 127.0.0.1:${PORT}`));
