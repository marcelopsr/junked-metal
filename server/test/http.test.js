// Integración: levanta index.js en un puerto libre con una base temporal.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exchangeSig, sign } from "../lib.js";
import { dayOf, dailySeed, MAX_RUN_END } from "../db.js";

// Sin credenciales reales de Cloudflare/Stripe/PayPal del shell: los tests no deben tocar la política de Access de producción.
const cleanEnv = (env) => Object.fromEntries(Object.entries(env).filter(([k]) => !/^(CF_|STRIPE_|PAYPAL_)/.test(k)));
const PORT = 3900 + Math.floor(Math.random() * 90), B = `http://127.0.0.1:${PORT}`, S = "secreto-test";
let proc, guardLog;
before(async () => {
  const dir = mkdtempSync(join(tmpdir(), "jm-http-"));
  guardLog = join(dir, "red-bloqueada.log");
  proc = spawn(process.execPath, ["--import", new URL("./net-guard.mjs", import.meta.url).pathname, "index.js"], { cwd: new URL("..", import.meta.url).pathname, stdio: "pipe", env: {
    ...cleanEnv(process.env), MONITOR_OFF: "1", NET_GUARD_LOG: guardLog, PORT: String(PORT), JM_SECRET: S, TURN_SECRET: "t", GROUP_KEY: "g", ADMIN_KEY: "clave-admin", DB_FILE: join(dir, "jm.db"), INVITES_FILE: join(dir, "no.json"),
    EXCHANGE_SECRET: "canje-test", TEL_DAILY_MAX: "30", GITHUB_CLIENT_ID: "cid", GITHUB_CLIENT_SECRET: "cs", STRIPE_SECRET_KEY: "sk_test", STRIPE_WEBHOOK_SECRET: "whsec_test", REQUIRE_SUBSCRIPTION: "false" } });
  for (let i = 0; i < 50; i++) { try { if ((await fetch(B + "/api/health")).ok) return; } catch {} await new Promise((r) => setTimeout(r, 100)); }
  throw new Error("no arrancó");
});
after(() => proc.kill());
const post = (p, body, h = {}) => fetch(B + p, { method: "POST", headers: { "Content-Type": "application/json", ...h }, body: JSON.stringify(body) });
const exchange = (email, invite) => { const ts = Date.now(); return post("/api/cf-exchange", { email, ts, sig: exchangeSig("canje-test", email, ts), invite }); };

test("portal: sin sesión 401; clave → invitar → canjear → revocar corta /api/turn", async () => {
  assert.equal((await fetch(B + "/admin")).status, 401);
  assert.equal((await fetch(B + "/admin/api/users")).status, 401);
  assert.equal((await post("/admin/api/login", { key: "mala" })).status, 401);
  const lr = await post("/admin/api/login", { key: "clave-admin" });
  assert.equal(lr.status, 200);
  const ck = { Cookie: lr.headers.get("set-cookie").split(";")[0] };
  assert.equal((await fetch(B + "/admin", { headers: ck })).status, 200);
  await post("/admin/api/plan", { id: "mes", name: "Mensual", price: 500, currency: "USD", period: "month" }, ck);
  assert.equal((await post("/admin/api/invite", { email: "z@x.com", planId: "mes" }, { ...ck, Origin: "https://evil.com" })).status, 403, "CSRF por Origin");
  const inv = await (await post("/admin/api/invite", { email: "Z@x.com", planId: "mes" }, ck)).json();
  assert.match(inv.link, /^https:\/\/jm-login\.mesr-96\.workers\.dev\/\?invite=[\w-]+$/);
  const code = inv.link.split("invite=")[1];
  assert.equal((await exchange("z@x.com")).status, 403, "invitado sin código");
  const { token } = await (await exchange("z@x.com", code)).json();
  const turn = () => fetch(B + "/api/turn", { headers: { Authorization: "Bearer " + token } }).then((r) => r.status);
  assert.equal(await turn(), 200);
  const users = await (await fetch(B + "/admin/api/users", { headers: ck })).json();
  assert.equal(users.find((u) => u.email === "z@x.com").status, "active");
  assert.equal((await post("/admin/api/user", { email: "z@x.com", op: "revoke" }, ck)).status, 200);
  assert.equal(await turn(), 401, "token revocado");
  assert.equal((await exchange("z@x.com", code)).status, 403, "revocado no obtiene token nuevo");
  const audit = await (await fetch(B + "/admin/api/audit", { headers: ck })).json();
  assert.ok(audit.some((a) => a.action === "user" && a.target === "z@x.com"));
});
test("invite-redeem: canje directo, reuso 403, revocar corta el token", async () => {
  const lr = await post("/admin/api/login", { key: "clave-admin" });
  const ck = { Cookie: lr.headers.get("set-cookie").split(";")[0] };
  const mk = async () => (await (await post("/admin/api/invite", { email: "d@x.com", planId: "mes" }, ck)).json()).link.split("invite=")[1];
  const code = await mk();
  const ok = await post("/api/invite-redeem", { code }, { Origin: "https://marcelopsr.github.io" });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("access-control-allow-origin"), "https://marcelopsr.github.io");
  const { token } = await ok.json();
  const turn = () => fetch(B + "/api/turn", { headers: { Authorization: "Bearer " + token } }).then((r) => r.status);
  assert.equal(await turn(), 200);
  assert.equal((await post("/api/invite-redeem", { code })).status, 403, "reuso");
  assert.equal((await post("/api/invite-redeem", { code: "x" })).status, 403);
  const again = await mk(); // "Nuevo link" para un activo
  assert.equal((await post("/api/invite-redeem", { code: again })).status, 200);
  assert.equal(await turn(), 200, "el token anterior sigue valiendo");
  await post("/admin/api/user", { email: "d@x.com", op: "revoke" }, ck);
  assert.equal(await turn(), 401);
  assert.equal((await post("/admin/api/invite", { email: "d@x.com", planId: "mes" }, ck)).status, 400, "revocado: primero Reactivar");
});
test("pagos: webhook Stripe con firma inválida 400; PayPal sin credenciales 503", async () => {
  const r = await fetch(B + "/api/pay/stripe/webhook", { method: "POST", headers: { "Content-Type": "application/json", "Stripe-Signature": "t=1,v1=00" }, body: "{}" });
  assert.equal(r.status, 400);
  assert.equal((await fetch(B + "/api/pay/paypal/webhook", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 503);
  assert.equal((await fetch(B + "/api/pay/checkout?plan=x&provider=stripe")).status, 401);
});
test("telemetría: sin token 401; con token 204 y aparece en el admin", async () => {
  assert.equal((await post("/api/telemetry", { type: "session" })).status, 401);
  const lr = await post("/admin/api/login", { key: "clave-admin" });
  const ck = { Cookie: lr.headers.get("set-cookie").split(";")[0] };
  await post("/admin/api/plan", { id: "mes", name: "Mensual", price: 500, currency: "USD", period: "month" }, ck);
  const code = (await (await post("/admin/api/invite", { email: "t@x.com", planId: "mes" }, ck)).json()).link.split("invite=")[1];
  const { token } = await (await post("/api/invite-redeem", { code })).json();
  assert.equal((await post("/api/telemetry", { token, type: "Mal tipo" })).status, 400);
  assert.equal((await post("/api/telemetry", { token, type: "run_end", data: { win: true, t: 600 } })).status, 204);
  const t = await (await fetch(B + "/admin/api/telemetry", { headers: ck })).json();
  assert.ok(t.events.some((e) => e.uid === "cf-t@x.com" && e.type === "run_end"));
});
test("leaderboard: sin token 401; mejor expedición por usuario, sin mail completo", async () => {
  assert.equal((await fetch(B + "/api/leaderboard")).status, 401);
  const lr = await post("/admin/api/login", { key: "clave-admin" });
  const ck = { Cookie: lr.headers.get("set-cookie").split(";")[0] };
  const code = (await (await post("/admin/api/invite", { email: "lb@x.com", planId: "mes" }, ck)).json()).link.split("invite=")[1];
  const { token } = await (await post("/api/invite-redeem", { code })).json();
  await post("/api/telemetry", { token, type: "run_end", data: { mode: "encore", win: false, t: 200, loop: 0, stage: 2 } });
  await post("/api/telemetry", { token, type: "run_end", data: { mode: "encore", win: true, t: 300, loop: 1, stage: 0 } });
  await post("/api/telemetry", { token, type: "run_end", data: { mode: "diario", win: true, t: 9, loop: 5, stage: 5 } });
  const r = await fetch(B + "/api/leaderboard", { headers: { Authorization: "Bearer " + token } });
  assert.equal(r.status, 200);
  const rows = await r.json(), mine = rows.filter((x) => x.name === "lb…");
  assert.equal(mine.length, 1);
  assert.deepEqual(mine[0], { name: "lb…", loop: 1, stage: 0, t: 300, win: true });
  assert.ok(!JSON.stringify(rows).includes("@"));
});
test("alias, /api/me y leaderboard con alias", async () => {
  const ck = { Cookie: (await post("/admin/api/login", { key: "clave-admin" }, { "X-Forwarded-For": "10.7.7.7" })).headers.get("set-cookie").split(";")[0] };
  await post("/admin/api/plan", { id: "mes", name: "Mensual", price: 500, currency: "USD", period: "month" }, ck);
  const tok = async (email) => { const c = (await (await post("/admin/api/invite", { email, planId: "mes" }, ck)).json()).link.split("invite=")[1]; return (await (await post("/api/invite-redeem", { code: c })).json()).token; };
  const t1 = await tok("al1@x.com"), t2 = await tok("al2@x.com"), H = (t) => ({ Authorization: "Bearer " + t });
  assert.equal((await fetch(B + "/api/me")).status, 401, "me sin token");
  const me = await (await fetch(B + "/api/me", { headers: H(t1) })).json();
  assert.deepEqual([me.email, me.alias, me.status, me.plan.name, me.plan.active], ["al1@x.com", null, "active", "Mensual", true]);
  assert.ok(me.plan.currentPeriodEnd > Date.now());
  assert.equal((await post("/api/alias", { alias: "Zeta" })).status, 401, "alias sin token");
  assert.equal((await post("/api/alias", { alias: "a@b" }, H(t1))).status, 400);
  assert.equal((await post("/api/alias", { alias: "Mierda" }, H(t1))).status, 400);
  assert.equal((await post("/api/alias", { alias: "Zeta" }, H(t1))).status, 200);
  assert.equal((await post("/api/alias", { alias: "zeta" }, H(t2))).status, 400, "repetido");
  assert.equal((await (await fetch(B + "/api/me", { headers: H(t1) })).json()).alias, "Zeta");
  const run = (t, loop) => post("/api/telemetry", { token: t, type: "run_end", data: { mode: "encore", loop, stage: 1, t: 1000, win: false } });
  await run(t1, 3); await run(t2, 2);
  const lb = await (await fetch(B + "/api/leaderboard", { headers: H(t1) })).json();
  assert.deepEqual(lb.map((r) => r.name).slice(0, 2), ["Zeta", "al2…"]);
  // admin: columna y op alias
  assert.equal((await post("/admin/api/user", { email: "al2@x.com", op: "alias", alias: "Beta" }, ck)).status, 200);
  assert.equal((await post("/admin/api/user", { email: "al2@x.com", op: "alias", alias: "Zeta" }, ck)).status, 400);
  const us = await (await fetch(B + "/admin/api/users", { headers: ck })).json();
  assert.equal(us.find((u) => u.email === "al2@x.com").alias, "Beta");
});
let adminCk; // una sola sesión admin y canje por /api/cf-exchange (los limitadores de login/redeem son de 10 por 15 min)
const tokenFor = async (email) => {
  if (!adminCk) {
    adminCk = { Cookie: (await post("/admin/api/login", { key: "clave-admin" })).headers.get("set-cookie").split(";")[0] };
    await post("/admin/api/plan", { id: "mes", name: "Mensual", price: 500, currency: "USD", period: "month" }, adminCk);
  }
  const c = (await (await post("/admin/api/invite", { email, planId: "mes" }, adminCk)).json()).link.split("invite=")[1];
  return { ck: adminCk, token: (await (await exchange(email, c)).json()).token };
};
test("anti-trampa: run_end imposible rechazado y auditado; válido aceptado; ráfaga cortada", async () => {
  const { ck, token } = await tokenFor("cheat@x.com");
  const evs = async () => (await (await fetch(B + "/admin/api/telemetry", { headers: ck })).json()).events.filter((e) => e.uid === "cf-cheat@x.com" && e.type === "run_end");
  for (const d of [{ t: 10, loop: 3, stage: 2, kills: 1 }, { t: 9999, loop: 21, stage: 0 }, { t: 9999, loop: 0, stage: 5 }, { t: 500, kills: -5 }, { t: 500, lv: 99999 }, {}])
    assert.equal((await post("/api/telemetry", { token, type: "run_end", data: d })).status, 204);
  assert.equal((await evs()).length, 0);
  const audit = (await (await fetch(B + "/admin/api/audit", { headers: ck })).json()).filter((a) => a.action === "telemetria-sospechosa" && a.actor === "cf-cheat@x.com");
  assert.equal(audit.length, 6);
  assert.match(audit[0].detail || "", /./);
  assert.equal((await post("/api/telemetry", { token, type: "run_end", data: { t: 700, loop: 2, stage: 1, kills: 300, lv: 12 } })).status, 204);
  assert.equal((await evs()).length, 1);
  for (let i = 0; i < 10; i++) await post("/api/telemetry", { token, type: "run_end", data: { t: 700, kills: 1, lv: 1 } });
  assert.equal((await evs()).length, MAX_RUN_END, "ráfaga cortada en el tope");
});
test("diario: /api/daily, solo el primer intento cuenta, board sin mails", async () => {
  assert.equal((await fetch(B + "/api/daily")).status, 401);
  const a = await tokenFor("da@x.com"), b = await tokenFor("db@x.com"), H = (t) => ({ Authorization: "Bearer " + t });
  const d = await (await fetch(B + "/api/daily", { headers: H(a.token) })).json();
  assert.equal(d.date, dayOf());
  assert.equal(d.seed, dailySeed(S, d.date));
  assert.equal(d.mine, null);
  const send = (t, data) => post("/api/telemetry", { token: t, type: "run_end", data: { mode: "diario", daily: d.date, seed: d.seed, kills: 5, lv: 3, ...data } });
  await send(a.token, { win: false, t: 100 });
  await send(a.token, { win: true, t: 50 });            // segundo intento: no cuenta
  await send(b.token, { win: true, t: 200, seed: d.seed + 1 }); // semilla ajena: no cuenta
  await send(b.token, { win: true, t: 300 });
  const r = await (await fetch(B + "/api/daily", { headers: H(a.token) })).json();
  assert.deepEqual(r.mine, { name: "da…", win: false, t: 100, kills: 5, lv: 3, rank: 2 });
  assert.deepEqual(r.board.map((x) => [x.name, x.win, x.t]), [["db…", true, 300], ["da…", false, 100]]);
  assert.ok(!JSON.stringify(r).includes("@"));
});

test("/api/me/stats: sin token 401; cada usuario ve solo lo suyo", async () => {
  assert.equal((await fetch(B + "/api/me/stats")).status, 401);
  const ck = { Cookie: (await post("/admin/api/login", { key: "clave-admin" })).headers.get("set-cookie").split(";")[0] };
  await post("/admin/api/plan", { id: "mes", name: "Mensual", price: 500, currency: "USD", period: "month" }, ck);
  const tok = async (email) => { const c = (await (await post("/admin/api/invite", { email, planId: "mes" }, ck)).json()).link.split("invite=")[1]; return (await (await post("/api/invite-redeem", { code: c })).json()).token; };
  const ta = await tok("sa@x.com"), tb = await tok("sb@x.com"), H = (t) => ({ Authorization: "Bearer " + t });
  await post("/api/telemetry", { token: ta, type: "run_end", data: { mode: "arcade", win: true, t: 600 } });
  await post("/api/telemetry", { token: ta, type: "pact_pick", data: { id: "p1", accepted: true } });
  const a = await (await fetch(B + "/api/me/stats", { headers: H(ta) })).json(), b = await (await fetch(B + "/api/me/stats", { headers: H(tb) })).json();
  assert.deepEqual(a.modes, [{ mode: "arcade", played: 1, won: 1, bestTime: 600 }]);
  assert.deepEqual(a.pacts.top, [{ id: "p1", accepted: 1 }]);
  assert.deepEqual([b.modes, b.pacts.top, b.last], [[], [], null]);
});

test("export CSV: sin admin 401; BOM, encabezados, escapado y fórmulas neutralizadas", async () => {
  assert.equal((await fetch(B + "/admin/api/export?what=events")).status, 401);
  const lr = await post("/admin/api/login", { key: "clave-admin" });
  const ck = { Cookie: lr.headers.get("set-cookie").split(";")[0] };
  await post("/admin/api/plan", { id: "mes", name: "Mensual", price: 500, currency: "USD", period: "month" }, ck);
  const code = (await (await post("/admin/api/invite", { email: "csv@x.com", planId: "mes" }, ck)).json()).link.split("invite=")[1];
  const xf = { "X-Forwarded-For": "10.9.9.9" }; // IP propia: no compartir límites por IP con otros tests
  const { token } = await (await post("/api/invite-redeem", { code }, xf)).json();
  await post("/api/telemetry", { token, type: "pact_pick", data: { id: '=HYPERLINK("http://x","y")', accepted: true, stage: 1 } }, xf);
  await post("/api/telemetry", { token, type: "upgrade_pick", data: { id: 'a,"b"\nc', mode: "arcade" } }, xf);
  assert.equal((await fetch(B + "/admin/api/export?what=otra", { headers: ck })).status, 400);
  const r = await fetch(B + "/admin/api/export?what=events&days=30", { headers: ck });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type"), /^text\/csv; charset=utf-8/);
  assert.match(r.headers.get("content-disposition"), /^attachment; filename="telemetria-events-\d{4}-\d\d-\d\d\.csv"$/);
  const buf = Buffer.from(await r.arrayBuffer());
  assert.deepEqual([...buf.subarray(0, 3)], [0xef, 0xbb, 0xbf], "BOM UTF-8");
  const t = buf.toString("utf8");
  assert.ok(t.startsWith("\ufeffat,uid,type,mode,win,t,kills,lv,loop,stage,id,choice,variant,data\r\n"));
  assert.ok(t.includes(`,"'=HYPERLINK(""http://x"",""y"")"`), "fórmula neutralizada y escapada");
  assert.ok(t.includes(`"a,""b""\nc"`), "comas, comillas y saltos escapados");
  const a = Buffer.from(await (await fetch(B + "/admin/api/export?what=analysis", { headers: ck })).arrayBuffer()).toString("utf8");
  assert.ok(a.startsWith("\ufeff# pactos\r\nid,aceptado,rechazado\r\n"));
  assert.ok(a.includes("\r\n\r\n# quedarse_avanzar") && a.includes("# por_dia"));
});

// Un solo login para estas pruebas: el ingreso admin tiene tope de 10 por 15 min por IP.
let ckP; const admin2 = async () => (ckP ??= { Cookie: (await post("/admin/api/login", { key: "clave-admin" })).headers.get("set-cookie").split(";")[0] });
test("invite-batch: sin admin 401; mezcla válidos/inválidos/repetidos; límite 50; licencia obligatoria", async () => {
  assert.equal((await post("/admin/api/invite-batch", { emails: ["a@x.com"], planId: "mes" })).status, 401);
  const ck = await admin2();
  await post("/admin/api/plan", { id: "mes", name: "Mensual", price: 500, currency: "USD", period: "month" }, ck);
  await post("/admin/api/invite", { email: "rev@x.com", planId: "mes" }, ck);
  await post("/admin/api/user", { email: "rev@x.com", op: "revoke" }, ck);
  const r = await post("/admin/api/invite-batch", { emails: ["b1@x.com", "no-es-mail", "B1@x.com", "b2@x.com", "rev@x.com"], planId: "mes" }, ck);
  assert.equal(r.status, 200);
  const { results } = await r.json();
  assert.equal(results.length, 5);
  assert.match(results[0].link, /\?invite=[\w-]+$/);
  assert.equal(results[1].error, "Mail inválido");
  assert.equal(results[2].error, "Repetido en el lote");
  assert.match(results[3].link, /\?invite=/);
  assert.match(results[4].error, /revocado/);
  const users = await (await fetch(B + "/admin/api/users", { headers: ck })).json();
  assert.ok(["b1@x.com", "b2@x.com"].every((m) => users.find((u) => u.email === m)?.planId === "mes"), "licencia inicial");
  const big = Array.from({ length: 51 }, (_, i) => `m${i}@x.com`);
  assert.equal((await post("/admin/api/invite-batch", { emails: big, planId: "mes" }, ck)).status, 400);
  const fifty = await post("/admin/api/invite-batch", { emails: big.slice(0, 50), planId: "mes" }, ck);
  assert.equal(fifty.status, 200, "50 mails entran en el cuerpo");
  assert.equal((await post("/admin/api/invite-batch", { emails: ["c@x.com"], planId: "nada" }, ck)).status, 400);
  assert.equal((await post("/admin/api/invite-batch", { emails: "c@x.com", planId: "mes" }, ck)).status, 400);
});

test("detail: sin admin 401; inexistente 404; con datos escapa nada y devuelve stats/partidas/sesiones", async () => {
  assert.equal((await fetch(B + "/admin/api/user/a%40x.com/detail")).status, 401);
  const ck = await admin2();
  assert.equal((await fetch(B + "/admin/api/user/nadie%40x.com/detail", { headers: ck })).status, 404);
  await post("/admin/api/plan", { id: "mes", name: "Mensual", price: 500, currency: "USD", period: "month" }, ck);
  const code = (await (await post("/admin/api/invite", { email: "det@x.com", planId: "mes" }, ck)).json()).link.split("invite=")[1];
  const { token } = await (await exchange("det@x.com", code)).json();
  await post("/api/telemetry", { token, type: "session", data: { ua: "UA<b>", w: 390, h: 844, touch: true } });
  await post("/api/telemetry", { token, type: "run_end", data: { mode: "classic", win: true, t: 300, kills: 50, lv: 5 } });
  const d = await (await fetch(B + "/admin/api/user/DET%40x.com/detail", { headers: ck })).json();
  assert.equal(d.user.email, "det@x.com");
  assert.equal(d.user.tokenVersion, undefined);
  assert.equal(d.sub.planId, "mes");
  assert.equal(d.stats.modes[0].mode, "classic");
  assert.equal(d.runs.length, 1);
  assert.equal(d.runs[0].d.t, 300);
  assert.equal(d.sessions[0].d.ua, "UA<b>");
  assert.equal(d.sessions[0].d.w, 390);
});

test("H4/H5: /api/stats solo contadores; errores sin stack; cookie admin rota → 401", async () => {
  const { token } = await (await post("/api/login", { clave: "g" })).json();
  const r = await fetch(B + "/api/stats", { headers: { Authorization: "Bearer " + token } });
  assert.equal(r.status, 200);
  const j = await r.json(), txt = JSON.stringify(j);
  assert.deepEqual(Object.keys(j).sort(), ["peers", "salas", "uptime"]);
  assert.ok(!txt.includes("@") && !txt.includes("turn") && !/\d+\.\d+\.\d+\.\d+/.test(txt));
  const bad = await fetch(B + "/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  const big = await post("/api/login", { clave: "x".repeat(3000) });
  for (const [res, st] of [[bad, 400], [big, 413]]) {
    assert.equal(res.status, st);
    const t = await res.text();
    assert.ok(!/\bat \w|\.js|node_modules/.test(t), t);
  }
  assert.equal((await fetch(B + "/admin/api/users", { headers: { Cookie: "jm_admin=%E0" } })).status, 401);
});

const xff = (ip) => ({ "X-Forwarded-For": ip });
test("T51: canje exige EXCHANGE_SECRET (JM_SECRET no vale) y una cookie firmada con él no es admin", async () => {
  const ts = Date.now();
  assert.equal((await post("/api/cf-exchange", { email: "q@x.com", ts, sig: exchangeSig(S, "q@x.com", ts) }, xff("5.5.5.1"))).status, 401);
  const forged = sign("canje-test", "admin:x:1", 60);
  assert.equal((await fetch(B + "/admin/api/me", { headers: { Cookie: "jm_admin=" + forged } })).status, 401);
});
test("T51: cuota diaria de telemetría por uid (429 aunque cambie la IP)", async () => {
  const token = sign(S, "g-cuota");
  let last;
  for (let i = 0; i < 31; i++) last = (await post("/api/telemetry", { token, type: "session", data: {} }, xff("6.6.6." + i))).status;
  assert.equal(last, 429);
});
test("T51: /auth/login con limiter por IP", async () => {
  const url = B + "/auth/login?return=" + encodeURIComponent("https://junkedmetal.duckdns.org/");
  let last;
  for (let i = 0; i < 21; i++) last = (await fetch(url, { redirect: "manual", headers: xff("7.7.7.7") })).status;
  assert.equal(last, 429);
  assert.equal((await fetch(url, { redirect: "manual", headers: xff("7.7.7.8") })).status, 302);
});
test("T51: PayPal return y webhook con limiter (antes del chequeo de configuración)", async () => {
  let last;
  for (let i = 0; i < 21; i++) last = (await fetch(B + "/api/pay/paypal/return?token=A", { redirect: "manual", headers: xff("8.8.8.8") })).status;
  assert.equal(last, 429);
  for (let i = 0; i < 61; i++) last = (await post("/api/pay/paypal/webhook", {}, xff("8.8.8.9"))).status;
  assert.equal(last, 429);
});
test("T51: logout admin invalida la cookie anterior", async () => {
  const lr = await post("/admin/api/login", { key: "clave-admin" }, xff("9.9.9.1"));
  const ck = { Cookie: lr.headers.get("set-cookie").split(";")[0] };
  assert.equal((await fetch(B + "/admin/api/me", { headers: ck })).status, 200);
  assert.equal((await post("/admin/api/logout", {}, ck)).status, 200);
  assert.equal((await fetch(B + "/admin/api/me", { headers: ck })).status, 401);
});
test("H19: el env del servidor de tests no hereda CF_*, STRIPE_* ni PAYPAL_*", () => {
  const e = cleanEnv({ CF_API_TOKEN: "x", CF_ACCOUNT_ID: "x", CF_ACCESS_APP: "x", CF_ACCESS_POLICY: "x", STRIPE_SECRET_KEY: "x", PAYPAL_CLIENT_ID: "x", PATH: "/bin" });
  assert.deepEqual(Object.keys(e), ["PATH"]);
});
test("T54: /api/status público, solo ok/caido, CORS de la portada y rate limit", async () => {
  const r = await fetch(B + "/api/status", { headers: { Origin: "https://marcelopsr.github.io" } });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("access-control-allow-origin"), "https://marcelopsr.github.io");
  const j = await r.json();
  assert.deepEqual(Object.keys(j).sort(), ["actualizado", "juego", "login", "online"]);
  for (const k of ["juego", "online", "login"]) assert.match(j[k], /^(ok|caido)$/);
  assert.ok(!isNaN(Date.parse(j.actualizado)));
  let last; for (let i = 0; i < 31; i++) last = (await fetch(B + "/api/status")).status;
  assert.equal(last, 429);
});

test("plantillas de correo: sin admin 401; defaults, guardar y leer, variables, tamaño 400", async () => {
  assert.equal((await fetch(B + "/admin/api/templates")).status, 401);
  assert.equal((await post("/admin/api/templates", {})).status, 401);
  const ck = { Cookie: (await post("/admin/api/login", { key: "clave-admin" })).headers.get("set-cookie").split(";")[0] };
  const t0 = await (await fetch(B + "/admin/api/templates", { headers: ck })).json();
  assert.deepEqual(Object.keys(t0), ["invite", "expiring", "lapsed"]);
  assert.match(t0.invite.body, /\{link\}/);
  const nuevo = { ...t0, invite: { subject: "Hola {alias}", body: "Entra {mail}: {link} hasta {vence} ({plan})" } };
  assert.equal((await post("/admin/api/templates", nuevo, ck)).status, 200);
  const t1 = await (await fetch(B + "/admin/api/templates", { headers: ck })).json();
  assert.deepEqual(t1.invite, nuevo.invite);
  assert.ok((await (await fetch(B + "/admin/api/audit", { headers: ck })).json()).some((a) => a.action === "templates"), "auditado");
  // reemplazo de variables: se prueba la función real de admin.html
  const fill = new Function(`${readFileSync(new URL("../admin.html", import.meta.url), "utf8").match(/const fill = .*;/)[0]}; return fill;`)();
  assert.equal(fill(t1.invite.body, { mail: "a@x.com", link: "L", vence: "V", plan: "P" }), "Entra a@x.com: L hasta V (P)");
  assert.equal(fill("{alias}{otra}", {}), "{otra}");
  // tamaño excedido y plantilla incompleta: 400
  assert.equal((await post("/admin/api/templates", { ...t0, lapsed: { subject: "x", body: "y".repeat(4001) } }, ck)).status, 400);
  assert.equal((await post("/admin/api/templates", { ...t0, lapsed: { subject: "x".repeat(201), body: "y" } }, ck)).status, 400);
  assert.equal((await post("/admin/api/templates", { invite: t0.invite }, ck)).status, 400);
  assert.deepEqual(await (await fetch(B + "/admin/api/templates", { headers: ck })).json(), t1, "lo inválido no pisa lo guardado");
});

test("sin red: el servidor de prueba no intentó ningún fetch fuera de 127.0.0.1", async () => {
  assert.equal((await fetch(B + "/api/health")).status, 200);
  await new Promise((r) => setTimeout(r, 300)); // deja correr el monitor y accessSync del arranque
  assert.equal(existsSync(guardLog) ? readFileSync(guardLog, "utf8") : "", "", "hubo fetch externo");
});
test("lista de espera: 202 siempre, honeypot, CORS, panel invitar/descartar, 401 sin admin, rate limit", async () => {
  let n = 0; const O = { Origin: "https://marcelopsr.github.io" }, ip = () => ({ ...O, "X-Forwarded-For": "10.3.0." + ++n }); // cada llamada desde otra IP, salvo el bloque final
  const lr = await post("/admin/api/login", { key: "clave-admin" }, { "X-Forwarded-For": "10.7.7.8" });
  const ck = { Cookie: lr.headers.get("set-cookie").split(";")[0] };
  await post("/admin/api/plan", { id: "mes", name: "Mensual", price: 500, currency: "USD", period: "month" }, ck);
  const r1 = await post("/api/waitlist", { email: "W1@x.com", mensaje: "hola <b>" }, ip());
  assert.equal(r1.status, 202);
  assert.equal(r1.headers.get("access-control-allow-origin"), O.Origin);
  assert.equal((await post("/api/waitlist", { email: "w1@x.com" }, ip())).status, 202, "repetido igual");
  assert.equal((await post("/api/waitlist", { email: "d@x.com" }, ip())).status, 202, "ya es usuario igual");
  assert.equal((await post("/api/waitlist", { email: "bot@x.com", web: "http://spam" }, ip())).status, 202, "honeypot");
  assert.equal((await post("/api/waitlist", { email: "malo" }, ip())).status, 400);
  assert.equal((await post("/api/waitlist", { email: "l@x.com", mensaje: "a".repeat(301) }, ip())).status, 400);
  assert.equal((await post("/api/waitlist", { email: "e@x.com" }, { Origin: "https://evil.com", "X-Forwarded-For": "10.3.1.1" })).headers.get("access-control-allow-origin"), null);
  assert.equal((await fetch(B + "/admin/api/waitlist")).status, 401);
  assert.equal((await post("/admin/api/waitlist/invite", { email: "w1@x.com", planId: "mes" })).status, 401);
  const lista = await (await fetch(B + "/admin/api/waitlist", { headers: ck })).json();
  assert.deepEqual(lista.map((w) => w.email).sort(), ["e@x.com", "w1@x.com"], "sin honeypot ni usuario existente");
  lista.splice(lista.findIndex((w) => w.email === "e@x.com"), 1);
  await post("/admin/api/waitlist/discard", { email: "e@x.com" }, ck);
  assert.equal(lista[0].mensaje, "hola <b>");
  assert.equal((await post("/admin/api/waitlist/invite", { email: "w1@x.com" }, ck)).status, 400, "sin licencia");
  const inv = await post("/admin/api/waitlist/invite", { email: "w1@x.com", planId: "mes" }, ck);
  assert.equal(inv.status, 200);
  assert.match((await inv.json()).link, /\?invite=/);
  assert.equal((await (await fetch(B + "/admin/api/waitlist", { headers: ck })).json()).length, 0, "invitado sale de pendientes");
  await post("/api/waitlist", { email: "w2@x.com" }, ip());
  assert.equal((await post("/admin/api/waitlist/discard", { email: "w2@x.com" }, ck)).status, 200);
  assert.equal((await (await fetch(B + "/admin/api/waitlist", { headers: ck })).json()).length, 0);
  const H = { ...O, "X-Forwarded-For": "10.9.9.9" };
  for (let k = 0; k < 5; k++) assert.equal((await post("/api/waitlist", { email: `r${k}@x.com` }, H)).status, 202);
  assert.equal((await post("/api/waitlist", { email: "r5@x.com" }, H)).status, 429, "6.º intento de la hora por IP");
});
