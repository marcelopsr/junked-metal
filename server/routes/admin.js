import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { sign, verify, limiter } from "../lib.js";
import { eventsCsv, analysisCsv, EXPORT_MAX, normMail, dayOf, dailySeed } from "../db.js";
import * as pay from "../pay.js";

export async function register(app, { E, db, ipOf, who, eq, evs, stats, kick, accessSync, monitor, ADMINS, PUBLIC, GAME_URL, PORT, REQUIRE_SUB }) {
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
app.get("/admin/api/aviso", (req, res) => res.json(db.aviso() || {}));
const act = (fn) => (req, res) => {
  try {
    const r = fn(req.body || {}, req);
    db.audit("admin:" + req.admin, req.path.replace("/admin/api/", ""), req.body?.email || req.body?.id || null, JSON.stringify(req.body).slice(0, 300), ipOf(req));
    res.json(r ?? { ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
};
app.get("/admin/api/health", (req, res) => res.json(monitor.estado()));
// Invitar a uno: licencia obligatoria, revocado no se reinvita; la licencia inicial es un período. accessSync lo llama quien invita (una vez al final en lote).
const inviteOne = (email, planId) => {
  if (!db.plan(planId)) throw new Error("Elegir una licencia: sin licencia no hay acceso al juego");
  if (db.user(email)?.status === "revoked") throw new Error("Usuario revocado: primero Reactivar");
  const { code, expiresAt } = db.invite(email);
  db.applyPayment({ ref: "manual:" + randomBytes(8).toString("hex"), provider: "manual", email, planId });
  return { link: `${GAME_URL}?invite=${code}`, expiresAt };
};
app.get("/admin/api/ranking/runs", (req, res) => res.json(db.rankingRuns(Date.now() - 30 * 86400e3)));
app.post("/admin/api/ranking/user", act(({ email, on }) => { if (!db.user(email)) throw new Error("Usuario inexistente"); db.rankBan("cf-" + normMail(email), !!on); }));
app.post("/admin/api/ranking/event", act(({ id, on }) => { db.hideEvent(+id, !!on); }));
app.post("/admin/api/aviso", act(({ texto, hasta }) => db.saveAviso(texto, +hasta) || { ok: true }));
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
app.get("/admin/api/user/:email/detail", (req, res) => {
  const u = db.user(req.params.email);
  if (!u) return res.status(404).json({ error: "Usuario inexistente" });
  const uid = "cf-" + u.email, { tokenVersion, ...user } = u;
  res.json({ user, banned: db.rankBanned(uid), sub: db.sub(u.email) ?? null, stats: db.userStats(uid), runs: evs(uid, "run_end", 20), sessions: evs(uid, "session", 10) });
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
const adminHtml = await readFile(new URL("../admin.html", import.meta.url), "utf8");
app.get("/admin", (req, res) => res.status(adminOf(req) ? 200 : 401).set("Cache-Control", "no-store").type("html").send(adminHtml));
}
