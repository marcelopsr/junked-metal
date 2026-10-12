// Datos del portal: SQLite con node:sqlite (Node 22.13+/24, sin dependencias). Usuarios, invitaciones, auditoría, planes y suscripciones.
import { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";

const DAY = 86400e3;
export const PERIODS = { month: 30, year: 365 }; // días que suma un pago
export const normMail = (m) => String(m || "").trim().toLowerCase();
export const validMail = (m) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m) && m.length <= 254;

// Nuevo vencimiento: desde el vencimiento vigente si todavía no pasó, si no desde ahora.
export const extendEnd = (currentEnd, days, now = Date.now()) => Math.max(now, currentEnd || 0) + days * DAY;

export function openDb(file, invitesJson = null) {
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
  CREATE TABLE IF NOT EXISTS users(email TEXT PRIMARY KEY, status TEXT NOT NULL CHECK(status IN ('invited','active','revoked')),
    invitedAt INTEGER, activatedAt INTEGER, revokedAt INTEGER, note TEXT NOT NULL DEFAULT '', lastSeen INTEGER, tokenVersion INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS invites(code TEXT PRIMARY KEY, email TEXT NOT NULL, expiresAt INTEGER NOT NULL, usedAt INTEGER);
  CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY, at INTEGER NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT, detail TEXT, ip TEXT);
  CREATE TABLE IF NOT EXISTS admin_codes(code TEXT PRIMARY KEY, expiresAt INTEGER NOT NULL, usedAt INTEGER);
  CREATE TABLE IF NOT EXISTS plans(id TEXT PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL CHECK(price > 0), currency TEXT NOT NULL, period TEXT NOT NULL CHECK(period IN ('month','year')));
  CREATE TABLE IF NOT EXISTS subscriptions(email TEXT PRIMARY KEY, planId TEXT, status TEXT NOT NULL CHECK(status IN ('active','canceled')),
    provider TEXT NOT NULL CHECK(provider IN ('manual','stripe','paypal')), providerRef TEXT, currentPeriodEnd INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, at INTEGER NOT NULL, uid TEXT NOT NULL, type TEXT NOT NULL, data TEXT);
  CREATE INDEX IF NOT EXISTS events_at ON events(at);
  CREATE TABLE IF NOT EXISTS payments(ref TEXT PRIMARY KEY, provider TEXT NOT NULL, email TEXT NOT NULL, planId TEXT NOT NULL, amount INTEGER, at INTEGER NOT NULL);`);
  const q = (sql) => db.prepare(sql);
  const one = (sql, ...a) => q(sql).get(...a);
  const all = (sql, ...a) => q(sql).all(...a);
  const run = (sql, ...a) => q(sql).run(...a);
  const tx = (fn) => { db.exec("BEGIN"); try { const r = fn(); db.exec("COMMIT"); return r; } catch (e) { db.exec("ROLLBACK"); throw e; } };

  // Migración única desde invites.json: los activos entran como active.
  if (invitesJson && existsSync(invitesJson) && !one("SELECT 1 FROM users LIMIT 1")) {
    try {
      const now = Date.now();
      for (const i of JSON.parse(readFileSync(invitesJson, "utf8"))) {
        const m = normMail(i.email);
        if (validMail(m) && i.status === "active") run("INSERT OR IGNORE INTO users(email,status,invitedAt,activatedAt,note) VALUES(?,?,?,?,?)", m, "active", Date.parse(i.createdAt) || now, now, "importado de invites.json");
      }
    } catch (e) { console.error("import invites.json", e.message); }
  }

  const api = {
    db,
    audit: (actor, action, target = null, detail = null, ip = null) => run("INSERT INTO audit(at,actor,action,target,detail,ip) VALUES(?,?,?,?,?,?)", Date.now(), actor, action, target, detail, ip),
    auditList: (limit = 200) => all("SELECT * FROM audit ORDER BY id DESC LIMIT ?", limit),
    user: (email) => one("SELECT * FROM users WHERE email=?", normMail(email)),
    users: () => all(`SELECT u.*, s.planId, s.status subStatus, s.provider, s.currentPeriodEnd, p.name planName FROM users u
      LEFT JOIN subscriptions s ON s.email=u.email LEFT JOIN plans p ON p.id=s.planId ORDER BY u.email`),
    seen: (email, now = Date.now()) => run("UPDATE users SET lastSeen=? WHERE email=?", now, normMail(email)),
    setNote: (email, note) => run("UPDATE users SET note=? WHERE email=?", String(note).slice(0, 500), normMail(email)).changes > 0,

    // Invitar: crea (o reinvita) al usuario y un código de 7 días. Activo y revocado no cambian de estado (reactivar es explícito).
    invite(email, now = Date.now(), days = 7) {
      const m = normMail(email);
      if (!validMail(m)) throw new Error("Mail inválido");
      const code = randomBytes(12).toString("base64url");
      tx(() => {
        run("INSERT INTO users(email,status,invitedAt) VALUES(?, 'invited', ?) ON CONFLICT(email) DO UPDATE SET invitedAt=excluded.invitedAt, status=CASE WHEN status IN ('active','revoked') THEN status ELSE 'invited' END", m, now);
        run("INSERT INTO invites(code,email,expiresAt) VALUES(?,?,?)", code, m, now + days * DAY);
      });
      return { code, expiresAt: now + days * DAY };
    },
    // Canje con mail verificado: activo = ok; invitado + código válido de ese mail = se activa. Devuelve el usuario o null.
    redeem(email, code, now = Date.now()) {
      const m = normMail(email), u = api.user(m);
      if (!u || u.status === "revoked") return null;
      if (u.status === "active") return u;
      const inv = code && one("SELECT * FROM invites WHERE code=? AND email=? AND usedAt IS NULL AND expiresAt>?", String(code), m, now);
      if (!inv) return null;
      tx(() => {
        run("UPDATE invites SET usedAt=? WHERE code=?", now, inv.code);
        run("UPDATE users SET status='active', activatedAt=? WHERE email=?", now, m);
      });
      return api.user(m);
    },
    // Canje directo (sin Cloudflare): el código identifica al mail. Un solo uso; sirve también para reingresar un usuario activo desde otro dispositivo.
    // Devuelve {user} o {error}.
    redeemCode(code, now = Date.now()) {
      const inv = one("SELECT * FROM invites WHERE code=?", String(code ?? ""));
      if (!inv) return { error: "Código inválido" };
      const u = api.user(inv.email);
      if (!u || u.status === "revoked") return { error: "Usuario revocado" };
      if (inv.usedAt) return { error: "Código ya usado" };
      if (inv.expiresAt <= now) return { error: "Código vencido" };
      const used = tx(() => run("UPDATE invites SET usedAt=? WHERE code=? AND usedAt IS NULL", now, inv.code).changes > 0
        && (run("UPDATE users SET status='active', activatedAt=COALESCE(activatedAt,?) WHERE email=?", now, inv.email), true));
      return used ? { user: api.user(inv.email) } : { error: "Código ya usado" };
    },
    setStatus(email, status, now = Date.now()) {
      const m = normMail(email);
      if (status === "revoked") return run("UPDATE users SET status='revoked', revokedAt=?, tokenVersion=tokenVersion+1 WHERE email=?", now, m).changes > 0;
      if (status === "active") return run("UPDATE users SET status='active', activatedAt=?, revokedAt=NULL WHERE email=?", now, m).changes > 0;
      throw new Error("Estado inválido");
    },
    // Token de mail vigente: usuario activo y misma tokenVersion.
    tokenOk: (email, v) => { const u = api.user(email); return !!u && u.status === "active" && u.tokenVersion === v; },

    // Códigos de un solo uso para entrar al portal (se generan por ssh: `npm run admin-code`).
    newAdminCode(now = Date.now()) { const c = randomBytes(9).toString("base64url"); run("INSERT INTO admin_codes(code,expiresAt) VALUES(?,?)", c, now + 15 * 60e3); return c; },
    useAdminCode: (code, now = Date.now()) => run("UPDATE admin_codes SET usedAt=? WHERE code=? AND usedAt IS NULL AND expiresAt>?", now, String(code), now).changes > 0,

    // Telemetría mínima: eventos del juego (sesión, partidas) por uid, data en JSON.
    track: (uid, type, data, now = Date.now()) => run("INSERT INTO events(at,uid,type,data) VALUES(?,?,?,?)", now, uid, type, data),
    events: (limit = 300) => all("SELECT * FROM events ORDER BY id DESC LIMIT ?", limit),
    eventStats: (since) => all("SELECT type, COUNT(*) n, COUNT(DISTINCT uid) users FROM events WHERE at>? GROUP BY type ORDER BY n DESC", since),
    plans: () => all("SELECT * FROM plans ORDER BY price"),
    plan: (id) => one("SELECT * FROM plans WHERE id=?", String(id)),
    savePlan({ id, name, price, currency, period }) {
      id = String(id || "").trim(); name = String(name || "").trim(); currency = String(currency || "").trim().toUpperCase(); price = Math.round(+price);
      if (!/^[a-z0-9-]{1,32}$/.test(id) || !name || !/^[A-Z]{3}$/.test(currency) || !(price > 0) || !PERIODS[period]) throw new Error("Plan inválido: id [a-z0-9-], nombre, precio en centavos > 0, moneda ISO de 3 letras, período month|year");
      run("INSERT INTO plans(id,name,price,currency,period) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, price=excluded.price, currency=excluded.currency, period=excluded.period", id, name, price, currency, period);
    },
    deletePlan: (id) => run("DELETE FROM plans WHERE id=?", String(id)).changes > 0,

    sub: (email) => one("SELECT * FROM subscriptions WHERE email=?", normMail(email)),
    subActive: (email, now = Date.now()) => { const s = api.sub(email); return !!s && s.status === "active" && s.currentPeriodEnd > now; },
    // Manual: fija plan y vencimiento exacto.
    setSub(email, planId, currentPeriodEnd, provider = "manual", ref = null) {
      const m = normMail(email);
      if (!api.user(m)) throw new Error("Usuario inexistente");
      if (planId && !api.plan(planId)) throw new Error("Plan inexistente");
      if (!Number.isFinite(currentPeriodEnd)) throw new Error("Vencimiento inválido");
      run("INSERT INTO subscriptions(email,planId,status,provider,providerRef,currentPeriodEnd) VALUES(?,?,'active',?,?,?) ON CONFLICT(email) DO UPDATE SET planId=excluded.planId, status='active', provider=excluded.provider, providerRef=excluded.providerRef, currentPeriodEnd=excluded.currentPeriodEnd", m, planId || null, provider, ref, currentPeriodEnd);
    },
    cancelSub: (email) => run("UPDATE subscriptions SET status='canceled' WHERE email=?", normMail(email)).changes > 0,
    // Pago confirmado (pasarela o "marcar pagado"): idempotente por ref; activa o extiende un período del plan. Devuelve false si ya estaba aplicado.
    applyPayment({ ref, provider, email, planId, amount = null }, now = Date.now()) {
      const m = normMail(email), p = api.plan(planId);
      if (!p) throw new Error("Plan inexistente");
      return tx(() => {
        if (one("SELECT 1 FROM payments WHERE ref=?", ref)) return false;
        run("INSERT INTO payments(ref,provider,email,planId,amount,at) VALUES(?,?,?,?,?,?)", ref, provider, m, p.id, amount, now);
        const s = api.sub(m), base = s?.status === "active" ? s.currentPeriodEnd : 0;
        run("INSERT INTO subscriptions(email,planId,status,provider,providerRef,currentPeriodEnd) VALUES(?,?,'active',?,?,?) ON CONFLICT(email) DO UPDATE SET planId=excluded.planId, status='active', provider=excluded.provider, providerRef=excluded.providerRef, currentPeriodEnd=excluded.currentPeriodEnd", m, p.id, provider, ref, extendEnd(base, PERIODS[p.period], now));
        return true;
      });
    },
  };
  return api;
}
