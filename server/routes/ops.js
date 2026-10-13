import * as pay from "../pay.js";
import { limiter } from "../lib.js";

export function register(app, { E, db, ipOf, bearer, bearerWho, stats, monitor, accessSync, PUBLIC, GAME_URL }) {
app.get("/api/health", (req, res) => res.json({ ok: true, uptime: Math.round(process.uptime()) }));
app.get("/api/aviso", (req, res) => { const a = db.aviso(); res.set("Cache-Control", "no-store"); a ? res.json(a) : res.status(204).end(); });
app.get("/api/stats", async (req, res) => {
  if (!bearer(req)) return res.status(401).json({ error: "Token inválido" });
  const { uptime, peers: ps } = await stats(); // solo contadores: el detalle (uid, ids de sala, coturn) es de /admin/api/stats
  res.json({ uptime, peers: ps.length, salas: ps.filter((p) => p.sala).length });
});
// Estado público (T54): solo ok/caido por función, sin detalles. online = coturn (la señalización /peer vive en este mismo proceso). Sin dato aún = caido.
const statusOk = limiter(30, 60e3);
app.get("/api/status", (req, res) => {
  if (!statusOk(ipOf(req))) return res.status(429).json({ error: "Demasiadas consultas" });
  const e = monitor.estado(), up = (...n) => (n.every((k) => e[k]?.ok) ? "ok" : "caido");
  res.set("Cache-Control", "public, max-age=30").json({ juego: up("worker"), online: up("coturn"), login: up("worker", "db"), actualizado: new Date().toISOString() });
});
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
  if (!plan.price || plan.period === "forever") return res.status(400).json({ error: "Ese plan solo se asigna desde el admin" });
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
}
