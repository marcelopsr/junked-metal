import { randomBytes } from "node:crypto";
import { sign, safeReturn, limiter, failCap, exchangeOk } from "../lib.js";
import { normMail, validMail, WAITLIST_MSG_MAX } from "../db.js";

export function register(app, { E, db, ipOf, eq, mailToken, EXCHANGE_SECRET, ALLOW_GH }) {
const loginOk = limiter(10, 15 * 60e3), loginFails = failCap(60, 15 * 60e3); // H9: tope global de intentos contra la clave de grupo (rotar IP no lo esquiva)
app.post("/api/login", (req, res) => {
  if (!loginOk(ipOf(req)) || loginFails.full()) return res.status(429).json({ error: "Demasiados intentos, probá más tarde" });
  if (!eq(req.body?.clave ?? "", E.GROUP_KEY)) { loginFails.fail(); return res.status(401).json({ error: "Clave incorrecta" }); }
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
const redeemOk = limiter(10, 15 * 60e3), redeemFails = failCap(100, 15 * 60e3); // H9: tope global contra adivinar códigos
app.post("/api/invite-redeem", (req, res) => {
  if (!redeemOk(ipOf(req)) || redeemFails.full()) return res.status(429).json({ error: "Demasiados intentos, probá más tarde" });
  const code = typeof req.body?.code === "string" ? req.body.code.slice(0, 64) : "";
  const r = db.redeemCode(code);
  if (!r.user) { redeemFails.fail(); db.audit("?", "invitacion-rechazada", null, r.error, ipOf(req)); return res.status(403).json({ error: r.error }); }
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
}
