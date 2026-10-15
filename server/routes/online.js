import { ExpressPeerServer } from "peer";
import { turnCred, limiter } from "../lib.js";
import { runEndSospechoso, MAX_RUN_END, RUN_END_WINDOW, dayOf, dailySeed, weekOf, reglaOf } from "../db.js";

export function register(app, { E, db, server, HOST, ipOf, who, bearerWho, subOk, pubName, peers }) {
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
// PeerJS: solo con token válido (query `token`, que el cliente pasa como opción `token` de Peer).
const peerOpenOk = limiter(30, 60e3), specOpenOk = limiter(120, 60e3), SPEC_MAX = 10; // salas 30/min por IP; espectadores (jmv-) 120/min por IP y SPEC_MAX por sala
server.on("upgrade", (req, socket) => {
  const u = new URL(req.url, "http://x");
  if (!u.pathname.startsWith("/peer")) return socket.destroy();
  const w = who(u.searchParams.get("token"));
  const pid = String(u.searchParams.get("id") || ""), sala = pid.startsWith("jm-") || pid.startsWith("jmv-"); // jmv- = espectador: mismo requisito de suscripción, pero no cuenta como sala
  const spec = pid.startsWith("jmv-"), pre = spec && pid.replace(/-[^-]*$/, "-");
  if (!w || !(spec ? specOpenOk : peerOpenOk)(ipOf(req)) || (sala && !subOk(w)) || (spec && [...peers.keys()].filter((k) => k.startsWith(pre)).length >= SPEC_MAX)) { socket.write("HTTP/1.1 403 Forbidden\r\n\r\n"); return socket.destroy(); }
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
// Telemetría: solo con token válido (el token va en el cuerpo para poder usar keepalive/beacon). Tipos y tamaño acotados.
// run_end sospechoso (ver runEndSospechoso) o en ráfaga: no se guarda, se audita "telemetria-sospechosa" y se responde 204 igual (sin pistas al tramposo).
const telOk = limiter(120, 60e3), TEL_DAILY_MAX = +(E.TEL_DAILY_MAX || 2000), telUid = limiter(TEL_DAILY_MAX, 86400e3), telAll = limiter(+(E.TEL_GLOBAL_DAILY_MAX || 50000), 86400e3); // H7: tope global diario (uids "g-" se acuñan con la clave de grupo; la cuota por uid sola no acota la tabla) // cuota por uid: 2000 eventos/día (en memoria; se reinicia con el proceso)
app.post("/api/telemetry", (req, res) => {
  if (!telOk(ipOf(req))) return res.status(429).end();
  const { token, type, data } = req.body || {}, w = who(String(token || ""));
  if (!w) return res.status(401).end();
  if (!telUid(w.uid) || !telAll("global")) return res.status(429).end();
  if (!/^[a-z_]{1,32}$/.test(type || "")) return res.status(400).end();
  if (type === "run_end") {
    const why = runEndSospechoso(data) || (db.recentCount(w.uid, "run_end", Date.now() - RUN_END_WINDOW) >= MAX_RUN_END ? `más de ${MAX_RUN_END} run_end en 10 min` : null);
    if (why) { db.audit(w.uid, "telemetria-sospechosa", w.uid, why, ipOf(req)); return res.status(204).end(); }
  }
  db.track(w.uid, type, JSON.stringify(data ?? {}).slice(0, 1500));
  res.status(204).end();
});
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
// Desafío semanal con regla: run_end con weekly===week y seed===seed (data libre, ya se guarda tal cual).
const wkInfo = () => { const week = weekOf(); return { week, seed: dailySeed(E.JM_SECRET, "week:" + week), regla: reglaOf(week) }; };
app.get("/api/weekly", (req, res) => {
  if (!dailyOk(ipOf(req))) return res.status(429).end();
  if (!bearerWho(req)) return res.status(401).json({ error: "Token inválido" });
  res.json(wkInfo());
});
app.get("/api/weekly/ranking", (req, res) => {
  if (!dailyOk(ipOf(req))) return res.status(429).end();
  if (!bearerWho(req)) return res.status(401).json({ error: "Token inválido" });
  const { week, seed, regla } = wkInfo();
  res.json({ week, regla, board: db.weeklyBoard(week, seed).map((r) => ({ name: pubName(r.uid), score: r.score })) });
});
// Ranking semanal: top 20 (alias + mejor kills) desde el lunes 00:00 UTC.
app.get("/api/ranking/semanal", (req, res) => {
  if (!dailyOk(ipOf(req))) return res.status(429).end();
  if (!bearerWho(req)) return res.status(401).json({ error: "Token inválido" });
  const d = new Date(), since = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  res.json(db.weeklyTop(since).map((r) => ({ name: pubName(r.uid), score: r.score })));
});
// Ranking del modo sin fin: top 20 por tiempo sobrevivido + tu mejor marca (nombre público, sin mails).
app.get("/api/endless/ranking", (req, res) => {
  if (!dailyOk(ipOf(req))) return res.status(429).end();
  const w = bearerWho(req);
  if (!w) return res.status(401).json({ error: "Token inválido" });
  const all = db.endlessTop(1e6), row = (r) => ({ name: pubName(r.uid), score: r.score }), i = all.findIndex((r) => r.uid === w.uid);
  res.json({ board: all.slice(0, 20).map(row), mine: i < 0 ? null : { ...row(all[i]), rank: i + 1 } });
});
const lbOk = limiter(60, 60e3);
const lbRows = (n) => db.encoreTop(10).map((r) => ({ ...r, name: n(r.uid) }));
app.get("/api/leaderboard", (req, res) => {
  if (!lbOk(ipOf(req))) return res.status(429).end();
  if (!bearerWho(req)) return res.status(401).json({ error: "Token inválido" });
  res.json(lbRows(pubName).map(({ name, loop, stage, t, win }) => ({ name, loop, stage, t, win: !!win })));
});
}
