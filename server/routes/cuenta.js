import { limiter } from "../lib.js";
import { checkAlias } from "../db.js";

export function register(app, { db, ipOf, bearerWho, pubName, evs }) {
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
// Últimas 20 partidas propias (run_end): solo los campos que existan.
app.get("/api/me/historial", (req, res) => {
  if (!meStatsOk(ipOf(req))) return res.status(429).end();
  const w = bearerWho(req);
  if (!w?.email) return res.status(401).json({ error: "Token inválido" });
  res.json(evs(w.uid, "run_end", 20).map(({ at, d }) => ({ at, modo: d.mode, kills: d.kills, tiempo: d.t, auto: d.auto, victoria: d.win === true || d.win === 1 || d.win === "true" })));
});
// Perfil público por alias: nunca el mail.
app.get("/api/perfil/:alias", (req, res) => {
  if (!meStatsOk(ipOf(req))) return res.status(429).end();
  if (!bearerWho(req)) return res.status(401).json({ error: "Token inválido" });
  const uid = db.uidOfAlias(req.params.alias);
  if (!uid) return res.status(404).json({ error: "Sin perfil" });
  const { modes, encore } = db.userStats(uid);
  res.json({ alias: db.aliasOf(uid), records: { modes, encore }, logros: db.userLogros(uid) });
});
}
