// Datos del portal: SQLite con node:sqlite (Node 22.13+/24, sin dependencias). Usuarios, invitaciones, auditoría, planes y suscripciones.
import { DatabaseSync } from "node:sqlite";
import { randomBytes, createHmac } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";

const DAY = 86400e3;
export const PERIODS = { month: 30, year: 365, forever: 36500 }; // días que suma un pago; ponytail: "sin vencimiento" = 100 años, sin caso especial (nunca entra en avisos)
export const normMail = (m) => String(m || "").trim().toLowerCase();
// Alias público de récords: 3-16, letras/números/espacio/guion/guion bajo; lista corta de insultos (subcadena, sin tildes ni mayúsculas).
export const BLOCKED_ALIAS = ["puta", "puto", "mierda", "pendejo", "pelotudo", "boludo", "forro", "concha", "verga", "cagon", "culo", "carajo", "chingar", "joder", "maricon", "zorra", "idiota", "estupido", "imbecil", "gilipollas"];
export function checkAlias(a) {
  a = String(a ?? "").trim();
  if (!/^[\p{L}\p{N} _-]{3,16}$/u.test(a)) throw new Error("Alias inválido: 3 a 16 caracteres, letras, números, espacio, guion o guion bajo");
  const n = a.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (BLOCKED_ALIAS.some((w) => n.includes(w))) throw new Error("Alias no permitido");
  return a;
}
// Anti-trampa de run_end. ponytail: heurística con techo, no prueba criptográfica (el cliente es de confianza limitada); afinar constantes con telemetría real.
export const MIN_S_PER_STAGE = 60;   // FINAL_QA_6: el bot tarda ~150 s/escenario; 60 s deja margen a jugadores muy buenos
export const MAX_LOOP = 20, MAX_STAGE = 4; // vueltas ENCORE 0-20; escenario 0-4 (4 = FINAL ACT)
export const MAX_T = 86400, MAX_KILLS = 200000, MAX_LV = 500; // techos absurdos
export const MAX_RUN_END = 6, RUN_END_WINDOW = 10 * 60e3; // run_end por usuario cada 10 min
// Devuelve el motivo de rechazo (string) o null si el run_end es plausible.
export function runEndSospechoso(d) {
  const num = (v, lo, hi) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
  if (!d || typeof d !== "object") return "sin datos";
  if (!num(d.t, 0, MAX_T)) return "t fuera de rango";
  for (const [k, hi] of [["kills", MAX_KILLS], ["lv", MAX_LV]]) if (d[k] !== undefined && !num(d[k], 0, hi)) return k + " fuera de rango";
  if (d.loop !== undefined || d.stage !== undefined) {
    if (!Number.isInteger(d.loop) || d.loop < 0 || d.loop > MAX_LOOP) return "loop fuera de rango";
    if (!Number.isInteger(d.stage) || d.stage < 0 || d.stage > MAX_STAGE) return "stage fuera de rango";
    const min = (d.loop * 4 + d.stage) * MIN_S_PER_STAGE; // escenarios completados (4 por vuelta)
    if (d.t < min) return `t=${d.t} < mínimo ${min} para vuelta ${d.loop} escenario ${d.stage}`;
  }
  return null;
}
// Desafío diario: fecha UTC y semilla determinista 1..2^31 por fecha (HMAC con el secreto del servidor).
// CSV (T43): comillas/comas/saltos escapados; strings que empiezan con = + - @ (o tab/CR) llevan ' delante contra inyección de fórmulas. Números no.
export const csvCell = (v) => {
  if (v == null) return "";
  let s = String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
export const csvRows = (rows) => rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
export const EXPORT_MAX = 50000;
const EV_COLS = ["mode", "win", "t", "kills", "lv", "loop", "stage", "id", "choice", "variant"];
export const eventsCsv = (events) => csvRows([["at", "uid", "type", ...EV_COLS, "data"], ...events.map((e) => {
  let d = {}; try { const x = JSON.parse(e.data); if (x && typeof x === "object") d = x; } catch {}
  return [new Date(e.at).toISOString(), e.uid, e.type, ...EV_COLS.map((k) => (d[k] != null && typeof d[k] === "object" ? JSON.stringify(d[k]) : d[k])), e.data];
})]);
// Una sección por agregado, separadas por línea en blanco.
export const analysisCsv = (an) => [
  [["# pactos"], ["id", "aceptado", "rechazado"], ...an.pacts.map((r) => [r.id, r.accepted, r.rejected])],
  [["# quedarse_avanzar"], ["escenario", "quedarse", "avanzar"], ...an.stages.map((r) => [r.stage, r.stay, r.advance])],
  [["# mejoras"], ["modo", "id", "veces"], ...an.upgrades.map((r) => [r.mode, r.id, r.n])],
  [["# variantes"], ["variante", "veces"], ...an.routes.map((r) => [r.variant, r.n])],
  [["# por_dia"], ["dia", "iniciadas", "terminadas"], ...an.perDay.map((r) => [r.day, r.started, r.ended])],
].map(csvRows).join("\r\n\r\n");

export const dayOf = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
// Desafío semanal: lunes UTC de la semana (id), y regla rotando por número de semana.
export const REGLAS_SEMANA = ["solo_gomitas", "doble_velocidad", "sin_curas"];
export const weekOf = (now = Date.now()) => dayOf(now - ((new Date(now).getUTCDay() + 6) % 7) * 86400e3);
export const reglaOf = (week) => REGLAS_SEMANA[Math.floor(Date.parse(week) / 604800e3) % REGLAS_SEMANA.length];
export const dailySeed = (secret, date) => (createHmac("sha256", secret).update("daily:" + date).digest().readUInt32BE(0) % 2147483647) + 1;
export const WAITLIST_MSG_MAX = 300;
export const validMail = (m) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m) && m.length <= 254;

// Nuevo vencimiento: desde el vencimiento vigente si todavía no pasó, si no desde ahora.
export const extendEnd = (currentEnd, days, now = Date.now()) => Math.max(now, currentEnd || 0) + days * DAY;

export const TPL_MAX = { subject: 200, body: 4000 };
// Variables: {alias} {mail} {link} {vence} {plan}. Se reemplazan en el panel (admin.html), que abre Gmail compose sin credenciales.
export const DEFAULT_TEMPLATES = {
  invite: { subject: "Acceso a Junked Metal", body: "Hola {alias}, ya tienes acceso a Junked Metal con la licencia {plan}.\nPara entrar: {link}\nEl ingreso pide este mismo correo ({mail}) y un código que llega por mail. El link vence {vence}." },
  expiring: { subject: "Tu licencia de Junked Metal vence pronto", body: "Hola {alias}, tu licencia {plan} de Junked Metal vence el {vence}.\nPara seguir jugando sin interrupciones, avísame y la renovamos." },
  lapsed: { subject: "Tu licencia de Junked Metal venció", body: "Hola {alias}, tu licencia {plan} de Junked Metal venció el {vence} y el acceso quedó pausado.\nSi quieres renovarla, responde a este mensaje y la reactivamos." },
};
export function openDb(file, invitesJson = null) {
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
  CREATE TABLE IF NOT EXISTS users(email TEXT PRIMARY KEY, status TEXT NOT NULL CHECK(status IN ('invited','active','revoked')),
    invitedAt INTEGER, activatedAt INTEGER, revokedAt INTEGER, note TEXT NOT NULL DEFAULT '', lastSeen INTEGER, tokenVersion INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS invites(code TEXT PRIMARY KEY, email TEXT NOT NULL, expiresAt INTEGER NOT NULL, usedAt INTEGER);
  CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY, at INTEGER NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT, detail TEXT, ip TEXT);
  CREATE TABLE IF NOT EXISTS admin_codes(code TEXT PRIMARY KEY, expiresAt INTEGER NOT NULL, usedAt INTEGER);
  CREATE TABLE IF NOT EXISTS plans(id TEXT PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL CHECK(price >= 0), currency TEXT NOT NULL, period TEXT NOT NULL CHECK(period IN ('month','year','forever')));
  CREATE TABLE IF NOT EXISTS subscriptions(email TEXT PRIMARY KEY, planId TEXT, status TEXT NOT NULL CHECK(status IN ('active','canceled')),
    provider TEXT NOT NULL CHECK(provider IN ('manual','stripe','paypal')), providerRef TEXT, currentPeriodEnd INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, at INTEGER NOT NULL, uid TEXT NOT NULL, type TEXT NOT NULL, data TEXT);
  CREATE INDEX IF NOT EXISTS events_at ON events(at);
  CREATE TABLE IF NOT EXISTS notices(email TEXT NOT NULL, periodEnd INTEGER NOT NULL, at INTEGER NOT NULL, PRIMARY KEY(email, periodEnd));
  CREATE TABLE IF NOT EXISTS payments(ref TEXT PRIMARY KEY, provider TEXT NOT NULL, email TEXT NOT NULL, planId TEXT NOT NULL, amount INTEGER, at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS waitlist(email TEXT PRIMARY KEY, mensaje TEXT NOT NULL DEFAULT '', at INTEGER NOT NULL, estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente','invitado','descartado')));`);
  if (!db.prepare("PRAGMA table_info(users)").all().some((c) => c.name === "alias")) db.exec("ALTER TABLE users ADD COLUMN alias TEXT");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_alias ON users(alias COLLATE NOCASE)");
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

  // Migración: plans viejo (precio > 0, solo month|year) → admite gratis y sin vencimiento. SQLite no altera CHECK: se rearma la tabla.
  if (one("SELECT sql FROM sqlite_master WHERE name='plans'")?.sql.includes("price > 0")) tx(() => db.exec(`ALTER TABLE plans RENAME TO plans_old;
    CREATE TABLE plans(id TEXT PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL CHECK(price >= 0), currency TEXT NOT NULL, period TEXT NOT NULL CHECK(period IN ('month','year','forever')));
    INSERT INTO plans SELECT id,name,price,currency,period FROM plans_old; DROP TABLE plans_old;`));
  // Plan fijo "beta": gratis y sin vencimiento; el acceso dura hasta que el admin lo revoque o lo borre (botón "Dar acceso beta" del panel).
  run("INSERT OR IGNORE INTO plans(id,name,price,currency,period) VALUES('beta','Beta tester',0,'USD','forever')");
  db.exec("CREATE TABLE IF NOT EXISTS ranking_ban(uid TEXT PRIMARY KEY); CREATE TABLE IF NOT EXISTS hidden_events(id INTEGER PRIMARY KEY)");
  const OK = "AND id NOT IN (SELECT id FROM hidden_events) AND uid NOT IN (SELECT uid FROM ranking_ban)"; // moderación: filtro común de rankings
  const api = {
    db,
    // Moderación de rankings (admin): excluir usuario (uid) o partida (id de run_end).
    rankBan: (uid, on) => on ? run("INSERT OR IGNORE INTO ranking_ban(uid) VALUES(?)", uid) : run("DELETE FROM ranking_ban WHERE uid=?", uid),
    rankBanned: (uid) => !!one("SELECT 1 FROM ranking_ban WHERE uid=?", uid),
    hideEvent: (id, on) => on ? run("INSERT OR IGNORE INTO hidden_events(id) SELECT id FROM events WHERE id=? AND type='run_end'", id).changes || (() => { throw new Error("Partida inexistente"); })() : run("DELETE FROM hidden_events WHERE id=?", id),
    // Mejores partidas (30 días) para moderar, con flag hidden y uid vetado.
    rankingRuns: (since, limit = 30) => all("SELECT id, at, uid, json_extract(data,'$.mode') mode, json_extract(data,'$.kills') kills, json_extract(data,'$.t') t, id IN (SELECT id FROM hidden_events) hidden, uid IN (SELECT uid FROM ranking_ban) banned FROM events WHERE type='run_end' AND json_valid(data) AND at>? AND json_extract(data,'$.kills') IS NOT NULL ORDER BY kills DESC LIMIT ?", since, limit),
    // Aviso de mantenimiento: {texto, hasta(ms)} en settings; vencido o vacío → null.
    aviso(now = Date.now()) {
      try { const a = JSON.parse(one("SELECT value FROM settings WHERE key='aviso'")?.value || "null"); return a?.texto && a.hasta > now ? a : null; } catch { return null; }
    },
    saveAviso(texto, hasta) {
      texto = String(texto || "").trim().slice(0, 300);
      if (!texto) return run("DELETE FROM settings WHERE key='aviso'"), null;
      if (!Number.isFinite(hasta) || hasta <= Date.now()) throw new Error("Vencimiento inválido o pasado");
      run("INSERT INTO settings(key,value) VALUES('aviso',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", JSON.stringify({ texto, hasta }));
      return { texto, hasta };
    },
    // Plantillas de correo del panel (se guardan como JSON en settings). Lo guardado pisa los textos por defecto, clave por clave.
    templates() {
      let saved = {}; try { saved = JSON.parse(one("SELECT value FROM settings WHERE key='templates'")?.value || "{}"); } catch {}
      return Object.fromEntries(Object.entries(DEFAULT_TEMPLATES).map(([k, d]) => [k, { ...d, ...(saved[k] || {}) }]));
    },
    saveTemplates(t) {
      const out = {};
      for (const k of Object.keys(DEFAULT_TEMPLATES)) {
        const x = t?.[k];
        if (!x || typeof x.subject !== "string" || typeof x.body !== "string") throw new Error(`Plantilla "${k}" incompleta`);
        if (!x.subject.trim() || x.subject.length > TPL_MAX.subject) throw new Error(`Asunto de "${k}" vacío o de más de ${TPL_MAX.subject} caracteres`);
        if (!x.body.trim() || x.body.length > TPL_MAX.body) throw new Error(`Texto de "${k}" vacío o de más de ${TPL_MAX.body} caracteres`);
        out[k] = { subject: x.subject, body: x.body };
      }
      run("INSERT INTO settings(key,value) VALUES('templates',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", JSON.stringify(out));
      return out;
    },
    // Lista de espera pública (T63): mail único; un repetido no cambia nada (el endpoint responde igual).
    waitlistAdd: (email, mensaje) => run("INSERT OR IGNORE INTO waitlist(email,mensaje,at) VALUES(?,?,?)", normMail(email), String(mensaje || "").slice(0, WAITLIST_MSG_MAX), Date.now()).changes > 0,
    waitlist: () => all("SELECT * FROM waitlist WHERE estado='pendiente' ORDER BY at"),
    waitlistSet(email, estado) {
      if (!run("UPDATE waitlist SET estado=? WHERE email=?", estado, normMail(email)).changes) throw new Error("No está en la lista de espera");
    },
    audit: (actor, action, target = null, detail = null, ip = null) => run("INSERT INTO audit(at,actor,action,target,detail,ip) VALUES(?,?,?,?,?,?)", Date.now(), actor, action, target, detail, ip),
    auditList: (limit = 200) => all("SELECT * FROM audit ORDER BY id DESC LIMIT ?", limit),
    user: (email) => one("SELECT * FROM users WHERE email=?", normMail(email)),
    users: () => all(`SELECT u.*, s.planId, s.status subStatus, s.provider, s.currentPeriodEnd, p.name planName FROM users u
      LEFT JOIN subscriptions s ON s.email=u.email LEFT JOIN plans p ON p.id=s.planId ORDER BY u.email`),
    // Alias único sin distinguir mayúsculas; "" lo borra. Lanza si es inválido, repetido o el usuario no existe.
    setAlias(email, alias) {
      const m = normMail(email), a = String(alias ?? "").trim() === "" ? null : checkAlias(alias);
      if (!api.user(m)) throw new Error("Usuario inexistente");
      try { run("UPDATE users SET alias=? WHERE email=?", a, m); } catch (e) { if (/UNIQUE/.test(e.message)) throw new Error("Ese alias ya está en uso"); throw e; }
    },
    uidOfAlias: (alias) => { const r = one("SELECT email FROM users WHERE alias=? COLLATE NOCASE", String(alias)); return r ? "cf-" + r.email : null; },
    aliasOf: (uid) => one("SELECT alias FROM users WHERE email=?", normMail(String(uid).replace(/^cf-/, "")))?.alias || null,
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
    // Borrar usuario: sale de users, invitaciones, licencia, avisos y lista de espera; pagos y telemetría quedan como registro.
    deleteUser(email) {
      const m = normMail(email);
      for (const t of ["invites", "subscriptions", "notices", "waitlist"]) run(`DELETE FROM ${t} WHERE email=?`, m);
      return run("DELETE FROM users WHERE email=?", m).changes > 0;
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
    pruneEvents: (before) => run("DELETE FROM events WHERE at<?", before).changes,
    userEvents: (uid, type, limit = 20) => all("SELECT at, data FROM events WHERE uid=? AND type=? ORDER BY id DESC LIMIT ?", uid, type, limit),
    recentCount: (uid, type, since) => one("SELECT COUNT(*) n FROM events WHERE uid=? AND type=? AND at>?", uid, type, since).n,
    // Diario: solo el PRIMER run_end guardado de cada usuario para (fecha, semilla). Orden: victoria primero; ganadores por menor t, perdedores por mayor t.
    dailyBoard: (date, seed) => all(`SELECT uid, win, t, kills, lv FROM (SELECT id, uid, json_extract(data,'$.win') win, json_extract(data,'$.t') t, json_extract(data,'$.kills') kills, json_extract(data,'$.lv') lv,
      ROW_NUMBER() OVER (PARTITION BY uid ORDER BY id) rn FROM events WHERE type='run_end' AND json_valid(data) AND json_extract(data,'$.daily')=? AND json_extract(data,'$.seed')=? ${OK}) WHERE rn=1
      ORDER BY win DESC, CASE WHEN win THEN t ELSE -t END ASC, uid`, date, seed),
    // Logros online: podio semanal (top 3 de una semana UTC lun-dom ya cerrada), racha diaria (días seguidos con run_end del diario) y veterano (50 run_end).
    userLogros: (uid, now = Date.now()) => {
      const wk = (at) => Math.floor((at / 86400e3 + 3) / 7); // semana lun-dom UTC (día 0 epoch = jueves)
      const best = all(`SELECT CAST((at/86400000.0+3)/7 AS INTEGER) wk, uid, MAX(json_extract(data,'$.kills')) s FROM events WHERE type='run_end' AND json_valid(data) AND json_extract(data,'$.kills') IS NOT NULL ${OK} GROUP BY wk, uid`);
      const podio = best.some((r) => r.uid === uid && r.wk < wk(now) && best.filter((o) => o.wk === r.wk && (o.s > r.s || (o.s === r.s && o.uid < uid))).length < 3);
      const days = all("SELECT DISTINCT json_extract(data,'$.daily') d FROM events WHERE uid=? AND type='run_end' AND json_valid(data) AND json_extract(data,'$.daily') IS NOT NULL ORDER BY d", uid).map((r) => Date.parse(r.d) / 86400e3).filter(Number.isFinite);
      let streak = 0, run = 0;
      days.forEach((d, i) => { run = i && d - days[i - 1] === 1 ? run + 1 : 1; streak = Math.max(streak, run); });
      const n = one("SELECT COUNT(*) n FROM events WHERE uid=? AND type='run_end'", uid).n;
      const L = (id, name, done, progress, goal) => ({ id, name, done, progress: Math.min(progress, goal), goal });
      return [L("podio", "Podio semanal", podio, +podio, 1), L("racha3", "Racha diaria x3", streak >= 3, streak, 3), L("racha7", "Racha diaria x7", streak >= 7, streak, 7), L("veterano", "Veterano", n >= 50, n, 50)];
    },
    // Semanal: mejor puntaje (kills) por uid entre run_end con at>=since.
    // Sin fin: mejor tiempo sobrevivido (lasted, acotado por t) por usuario; run_end con endless:true.
    endlessTop: (limit = 20) => all(`SELECT uid, MAX(MIN(json_extract(data,'$.lasted'), json_extract(data,'$.t'))) score FROM events WHERE type='run_end' AND json_valid(data) AND json_extract(data,'$.endless')=1 AND json_extract(data,'$.lasted') IS NOT NULL ${OK} GROUP BY uid ORDER BY score DESC, uid LIMIT ?`, limit),
    weeklyTop: (since, limit = 20) => all(`SELECT uid, MAX(json_extract(data,'$.kills')) score FROM events WHERE type='run_end' AND json_valid(data) AND at>=? AND json_extract(data,'$.kills') IS NOT NULL ${OK} GROUP BY uid ORDER BY score DESC, uid LIMIT ?`, since, limit),
    // Semanal con regla: mejor kills por uid entre run_end con weekly===week y seed===seed.
    weeklyBoard: (week, seed, limit = 20) => all(`SELECT uid, MAX(json_extract(data,'$.kills')) score FROM events WHERE type='run_end' AND json_valid(data) AND json_extract(data,'$.weekly')=? AND json_extract(data,'$.seed')=? AND json_extract(data,'$.kills') IS NOT NULL ${OK} GROUP BY uid ORDER BY score DESC, uid LIMIT ?`, week, seed, limit),
    eventsSince: (since, limit = EXPORT_MAX) => all("SELECT * FROM events WHERE at>? ORDER BY id DESC LIMIT ?", since, limit),
    events: (limit = 300) => all("SELECT * FROM events ORDER BY id DESC LIMIT ?", limit),
    // Mejor expedición ENCORE por uid (vuelta, escenario, tiempo).
    encoreTop: (limit = 10) => all(`SELECT uid, loop, stage, t, win FROM (SELECT uid, json_extract(data,'$.loop') loop, json_extract(data,'$.stage') stage, json_extract(data,'$.t') t, json_extract(data,'$.win') win, ROW_NUMBER() OVER (PARTITION BY uid ORDER BY json_extract(data,'$.loop') DESC, json_extract(data,'$.win') DESC, json_extract(data,'$.stage') DESC, json_extract(data,'$.t') DESC) rn FROM events WHERE type='run_end' AND json_valid(data) AND json_extract(data,'$.mode')='encore' AND json_extract(data,'$.loop') IS NOT NULL ${OK}) WHERE rn=1 ORDER BY loop DESC, win DESC, stage DESC, t DESC LIMIT ?`, limit),
    eventStats: (since) => all("SELECT type, COUNT(*) n, COUNT(DISTINCT uid) users FROM events WHERE at>? GROUP BY type ORDER BY n DESC", since),
    // Análisis de telemetría desde `since` (ms): pactos, quedarse/avanzar, mejoras por modo, variantes, partidas por día (UTC).
    // Con `uid` filtra a ese usuario (mismas consultas; lo usa userStats).
    telemetryAnalysis(since, uid) {
      const J = (k) => `json_extract(data,'$.${k}')`, W = `WHERE at>?1 ${uid ? "AND uid=?2 " : ""}AND json_valid(data) AND type=`, A = uid ? [since, uid] : [since];
      return {
        pacts: all(`SELECT ${J("id")} id, SUM(${J("accepted")} IN (1,'true')) accepted, SUM(${J("accepted")} NOT IN (1,'true')) rejected FROM events ${W}'pact_pick' AND ${J("id")} IS NOT NULL GROUP BY 1 ORDER BY accepted+rejected DESC`, ...A),
        stages: all(`SELECT ${J("stage")} stage, SUM(${J("choice")}='stay') stay, SUM(${J("choice")}='advance') advance FROM events ${W}'stage_end' AND ${J("stage")} IS NOT NULL GROUP BY stage ORDER BY stage`, ...A),
        upgrades: all(`SELECT mode, id, n FROM (SELECT ${J("mode")} mode, ${J("id")} id, COUNT(*) n, ROW_NUMBER() OVER (PARTITION BY ${J("mode")} ORDER BY COUNT(*) DESC, ${J("id")}) rn FROM events ${W}'upgrade_pick' AND ${J("id")} IS NOT NULL GROUP BY 1, 2) WHERE rn<=10 ORDER BY mode, n DESC, id`, ...A),
        routes: all(`SELECT ${J("variant")} variant, COUNT(*) n FROM events ${W}'route_pick' AND ${J("variant")} IS NOT NULL GROUP BY variant ORDER BY n DESC, variant`, ...A),
        perDay: all(`SELECT date(at/1000,'unixepoch') day, SUM(type='run_start') started, SUM(type='run_end') ended FROM events WHERE at>?1 ${uid ? "AND uid=?2 " : ""}AND type IN ('run_start','run_end') GROUP BY day ORDER BY day DESC`, ...A),
      };
    },
    // Uso (admin): partidas por día (UTC), modos de run_start y abandono = run_start sin run_end (aprox. por conteo: max(0, inicios-fines)/inicios).
    usageStats(since) {
      const ev = all("SELECT type, date(at/1000,'unixepoch') day, CASE WHEN json_valid(data) THEN json_extract(data,'$.mode') END mode FROM events WHERE at>? AND type IN ('run_start','run_end')", since);
      const days = {}, modes = {}; let started = 0, ended = 0;
      for (const e of ev) {
        if (e.type === "run_start") { started++; (days[e.day] ||= { day: e.day, n: 0 }).n++; modes[e.mode || "?"] = (modes[e.mode || "?"] || 0) + 1; } else ended++;
      }
      return { perDay: Object.values(days).sort((x, y) => x.day < y.day ? -1 : 1), modes: Object.entries(modes).map(([mode, n]) => ({ mode, n })).sort((x, y) => y.n - x.n), started, ended, abandonPct: started ? Math.round(100 * Math.max(0, started - ended) / started) : 0 };
    },
    // Estadísticas históricas de un usuario (T41a): reusa telemetryAnalysis(0, uid). Sin datos → ceros/listas vacías.
    userStats(uid) {
      const J = (k) => `json_extract(data,'$.${k}')`, RE = "FROM events WHERE uid=? AND type='run_end' AND json_valid(data)", WIN = `${J("win")} IN (1,'true')`;
      const an = api.telemetryAnalysis(0, uid), sum = (rows, k) => rows.reduce((n, r) => n + (r[k] || 0), 0);
      const accepted = sum(an.pacts, "accepted"), rejected = sum(an.pacts, "rejected"), stay = sum(an.stages, "stay"), advance = sum(an.stages, "advance");
      const pct = (a, b) => (a + b ? Math.round((a / (a + b)) * 1000) / 10 : 0);
      const last = one(`SELECT at, ${J("mode")} mode, ${J("win")} win, ${J("t")} t, ${J("kills")} kills, ${J("lv")} lv ${RE} ORDER BY id DESC LIMIT 1`, uid);
      const enc = all(`SELECT ${J("loop")} loop, ${J("stage")} stage, ${J("t")} t, ${J("win")} win ${RE} AND ${J("mode")}='encore' AND ${J("loop")} IS NOT NULL ORDER BY ${J("loop")} DESC, ${J("win")} DESC, ${J("stage")} DESC, ${J("t")} DESC LIMIT 1`, uid)[0];
      return {
        modes: all(`SELECT ${J("mode")} mode, COUNT(*) played, SUM(${WIN}) won, MIN(CASE WHEN ${WIN} THEN ${J("t")} END) bestTime ${RE} AND ${J("mode")} IS NOT NULL GROUP BY mode ORDER BY played DESC, mode`, uid),
        encore: enc ? { loop: enc.loop, stage: enc.stage, t: enc.t, win: !!enc.win } : null,
        pacts: { top: an.pacts.filter((p) => p.accepted > 0).sort((x, y) => y.accepted - x.accepted || (x.id < y.id ? -1 : 1)).slice(0, 5).map((p) => ({ id: p.id, accepted: p.accepted })), accepted, rejected, rejectedPct: pct(rejected, accepted) },
        stages: { stay, advance, stayPct: pct(stay, advance), advancePct: pct(advance, stay) },
        upgrades: all(`SELECT ${J("id")} id, COUNT(*) n FROM events WHERE uid=? AND type='upgrade_pick' AND json_valid(data) AND ${J("id")} IS NOT NULL GROUP BY 1 ORDER BY n DESC, 1 LIMIT 5`, uid),
        variants: an.routes,
        last: last ? { at: last.at, mode: last.mode, win: last.win === 1 || last.win === "true", t: last.t, kills: last.kills, lv: last.lv } : null,
      };
    },
    plans: () => all("SELECT * FROM plans ORDER BY price"),
    plan: (id) => one("SELECT * FROM plans WHERE id=?", String(id)),
    savePlan({ id, name, price, currency, period }) {
      id = String(id || "").trim(); name = String(name || "").trim(); currency = String(currency || "").trim().toUpperCase(); price = Math.round(+price);
      if (!/^[a-z0-9-]{1,32}$/.test(id) || !name || !/^[A-Z]{3}$/.test(currency) || !(price >= 0) || !PERIODS[period]) throw new Error("Plan inválido: id [a-z0-9-], nombre, precio en centavos (0 = gratis), moneda ISO de 3 letras, período month|year|forever");
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
    // Licencias por vencer (próximos `days` días) y vencidas en los últimos 7: no revocados con suscripción activa.
    expiring(days = 3, now = Date.now()) {
      const sel = `SELECT u.email, s.planId, p.name planName, s.currentPeriodEnd FROM subscriptions s JOIN users u ON u.email=s.email LEFT JOIN plans p ON p.id=s.planId
        WHERE u.status!='revoked' AND s.status='active' AND s.currentPeriodEnd BETWEEN ? AND ? ORDER BY s.currentPeriodEnd`;
      return { soon: all(sel, now, now + days * DAY), lapsed: all(sel, now - 7 * DAY, now - 1) };
    },
    // Avisa una sola vez por usuario y período (tabla notices): audita `licencia-por-vencer` y llama notify(email, texto). Devuelve los avisados ahora.
    noticeExpiring(notify = () => {}, now = Date.now(), days = 3) {
      const sent = [];
      for (const u of api.expiring(days, now).soon) {
        if (!run("INSERT OR IGNORE INTO notices(email,periodEnd,at) VALUES(?,?,?)", u.email, u.currentPeriodEnd, now).changes) continue;
        const text = `Tu licencia vence el ${new Date(u.currentPeriodEnd).toISOString().slice(0, 10)}`;
        api.audit("sistema", "licencia-por-vencer", u.email, `${u.planId || "manual"} ${text}`);
        notify(u.email, text); sent.push(u.email);
      }
      return sent;
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
