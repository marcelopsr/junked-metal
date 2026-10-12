// Funciones puras: tokens, credenciales TURN, validación de return, rate limit.
import { createHmac, timingSafeEqual } from "node:crypto";

const PROD_ORIGINS = ["https://jm-login.mesr-96.workers.dev", "https://junkedmetal.duckdns.org", "https://marcelopsr.github.io"];
// localhost solo fuera de producción (el token iría a parar al localhost de la víctima).
export const originsFor = (prod) => prod ? PROD_ORIGINS : [...PROD_ORIGINS, "http://localhost:5173", "http://localhost:5174"];
export const ORIGINS = originsFor(process.env.NODE_ENV === "production");
const b64u = (s) => Buffer.from(s).toString("base64url");
const mac = (secret, s) => createHmac("sha256", secret).update(s).digest("base64url");

// v = tokenVersion del usuario: revocar sube la versión y los tokens viejos dejan de valer (ver db.js).
export function sign(secret, uid, ttlSec = 30 * 86400, now = Date.now(), v = 0) {
  const p = b64u(JSON.stringify({ u: uid, exp: Math.floor(now / 1000) + ttlSec, v }));
  return p + "." + mac(secret, p);
}

// Devuelve el uid o null.
export const verify = (secret, token, now = Date.now()) => decode(secret, token, now)?.u ?? null;
// Devuelve {u, v} o null (v = 0 en tokens anteriores a tokenVersion).
export function decode(secret, token, now = Date.now()) {
  if (typeof token !== "string" || token.length > 512) return null;
  const [p, s] = token.split(".");
  if (!p || !s) return null;
  const a = Buffer.from(s), b = Buffer.from(mac(secret, p));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { u, exp, v = 0 } = JSON.parse(Buffer.from(p, "base64url").toString());
    return typeof u === "string" && exp * 1000 > now ? { u, v: +v || 0 } : null;
  } catch { return null; }
}

// Canje del Worker jm-login (Cloudflare Access): firma HMAC de "cf-exchange:<mail>:<ts>" con EXCHANGE_SECRET (index.js cae a JM_SECRET si falta), ventana de 60 s.
export const exchangeSig = (secret, email, ts) => mac(secret, `cf-exchange:${email}:${ts}`);
export function exchangeOk(secret, body, now = Date.now()) {
  const { email, ts, sig } = body || {};
  if (typeof email !== "string" || !email.includes("@") || email.length > 254 || !Number.isFinite(ts) || Math.abs(now - ts) > 60e3) return null;
  const a = Buffer.from(String(sig)), b = Buffer.from(exchangeSig(secret, email, ts));
  return a.length === b.length && timingSafeEqual(a, b) ? email.toLowerCase() : null;
}

// TURN REST (coturn use-auth-secret): username "exp:uid", credencial = base64(HMAC-SHA1(secret, username)).
export function turnCred(secret, uid, ttlSec = 3600, now = Date.now()) {
  const username = `${Math.floor(now / 1000) + ttlSec}:${uid.replace(/:/g, "-")}`;
  return { username, credential: createHmac("sha1", secret).update(username).digest("base64") };
}

// URL de retorno solo hacia orígenes permitidos (evita open redirect).
export function safeReturn(ret, origins = ORIGINS) {
  try {
    const u = new URL(ret);
    return origins.includes(u.origin) && !u.username && !u.password ? u.origin + u.pathname + u.search : null;
  } catch { return null; }
}

// ponytail: rate limit en memoria por proceso; se pierde al reiniciar, suficiente para un solo nodo.
// Con el mapa lleno solo se purgan las ventanas vencidas; si sigue lleno, la clave nueva se rechaza (nunca se vacía todo).
const LIMITER_MAX_KEYS = 5000;
export function limiter(max, windowMs, maxKeys = LIMITER_MAX_KEYS) {
  const hits = new Map();
  return (key, now = Date.now()) => {
    const h = hits.get(key);
    if (h && now - h.t <= windowMs) return ++h.n <= max;
    if (!h && hits.size >= maxKeys) {
      for (const [k, v] of hits) if (now - v.t > windowMs) hits.delete(k);
      if (hits.size >= maxKeys) return false;
    }
    hits.set(key, { t: now, n: 1 });
    return true;
  };
}
