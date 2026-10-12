// jm-login: Cloudflare Access (One-time PIN) delante. Verifica el JWT de Access y canjea el mail en la VPS (POST /api/cf-exchange,
// firmado con JM_SECRET); la VPS decide si está invitado y devuelve el token de server/lib.js con uid "cf-<mail>".
export const ORIGINS = ["https://marcelopsr.github.io", "http://localhost:5173", "http://localhost:5174"]; // igual que server/lib.js
const enc = new TextEncoder();
const b64u = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export function safeReturn(ret) {
  try {
    const u = new URL(ret);
    return ORIGINS.includes(u.origin) && !u.username && !u.password ? u.origin + u.pathname + u.search : null;
  } catch { return null; }
}

// Igual que exchangeSig() de server/lib.js: base64url(HMAC-SHA256(secret, "cf-exchange:<mail>:<ts>")).
export async function exchangeSig(secret, email, ts) {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(`cf-exchange:${email}:${ts}`))));
}
const page = (status, msg) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Junked Metal</title><body style="font:18px system-ui;background:#16130f;color:#eee;padding:2em"><h1 style="color:#f08a24">Junked Metal</h1><p>${msg}</p>`, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });

// ponytail: certs pedidos en cada login (pocos por día); cachear por isolate si el volumen crece.
export async function accessEmail(jwt, team, aud, now = Date.now(), certs = null) {
  const [h, p, s] = (jwt || "").split(".");
  if (!h || !p || !s) return null;
  const head = JSON.parse(new TextDecoder().decode(unb64u(h)));
  if (head.alg !== "RS256") return null;
  const keys = certs || (await (await fetch(`${team}/cdn-cgi/access/certs`)).json()).keys;
  const jwk = keys.find((k) => k.kid === head.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  if (!(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, unb64u(s), enc.encode(h + "." + p)))) return null;
  const c = JSON.parse(new TextDecoder().decode(unb64u(p)));
  const auds = Array.isArray(c.aud) ? c.aud : [c.aud];
  if (!aud || !auds.includes(aud) || c.iss !== team || !(c.exp * 1000 > now)) return null;
  return typeof c.email === "string" && c.email ? c.email.toLowerCase() : null;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname !== "/") return new Response("No encontrado", { status: 404 });
    const ret = safeReturn(url.searchParams.get("return") || "");
    if (!ret) return new Response("return no permitido", { status: 400 });
    let mail = null;
    try { mail = await accessEmail(req.headers.get("Cf-Access-Jwt-Assertion"), env.TEAM_DOMAIN, env.POLICY_AUD); } catch { mail = null; }
    if (!mail) return page(403, "Sesión de Cloudflare Access inválida.");
    const ts = Date.now();
    let r;
    try { r = await fetch(env.EXCHANGE_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: mail, ts, sig: await exchangeSig(env.JM_SECRET, mail, ts), invite: (url.searchParams.get("invite") || "").slice(0, 64) || undefined }) }); }
    catch { return page(502, "No se pudo contactar al servidor del juego."); }
    if (r.status === 403) return page(403, "Sin invitación: pedí acceso al administrador.");
    const j = r.ok ? await r.json().catch(() => null) : null;
    if (!j?.token) return page(502, `El servidor del juego respondió ${r.status}.`);
    return Response.redirect(`${ret}#token=${encodeURIComponent(j.token)}`, 302);
  },
};
