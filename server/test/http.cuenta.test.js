// Integración (cuenta): servidor propio vía _server.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { useServer, S } from "./_server.mjs";

const srv = useServer();
test("alias, /api/me y leaderboard con alias", async () => {
  const ck = await srv.adminLogin();
  await srv.post("/admin/api/plan", { id: "mes", name: "Mensual", price: 500, currency: "USD", period: "month" }, ck);
  const tok = async (email) => { const c = (await (await srv.post("/admin/api/invite", { email, planId: "mes" }, ck)).json()).link.split("invite=")[1]; return (await (await srv.post("/api/invite-redeem", { code: c })).json()).token; };
  const t1 = await tok("al1@x.com"), t2 = await tok("al2@x.com"), H = (t) => ({ Authorization: "Bearer " + t });
  assert.equal((await fetch(srv.B + "/api/me")).status, 401, "me sin token");
  const me = await (await fetch(srv.B + "/api/me", { headers: H(t1) })).json();
  assert.deepEqual([me.email, me.alias, me.status, me.plan.name, me.plan.active], ["al1@x.com", null, "active", "Mensual", true]);
  assert.ok(me.plan.currentPeriodEnd > Date.now());
  assert.equal((await srv.post("/api/alias", { alias: "Zeta" })).status, 401, "alias sin token");
  assert.equal((await srv.post("/api/alias", { alias: "a@b" }, H(t1))).status, 400);
  assert.equal((await srv.post("/api/alias", { alias: "Mierda" }, H(t1))).status, 400);
  assert.equal((await srv.post("/api/alias", { alias: "Zeta" }, H(t1))).status, 200);
  assert.equal((await srv.post("/api/alias", { alias: "zeta" }, H(t2))).status, 400, "repetido");
  assert.equal((await (await fetch(srv.B + "/api/me", { headers: H(t1) })).json()).alias, "Zeta");
  const run = (t, loop) => srv.post("/api/telemetry", { token: t, type: "run_end", data: { mode: "encore", loop, stage: 1, t: 1000, win: false } });
  await run(t1, 3); await run(t2, 2);
  const lb = await (await fetch(srv.B + "/api/leaderboard", { headers: H(t1) })).json();
  assert.deepEqual(lb.map((r) => r.name).slice(0, 2), ["Zeta", "al2…"]);
  // admin: columna y op alias
  assert.equal((await srv.post("/admin/api/user", { email: "al2@x.com", op: "alias", alias: "Beta" }, ck)).status, 200);
  assert.equal((await srv.post("/admin/api/user", { email: "al2@x.com", op: "alias", alias: "Zeta" }, ck)).status, 400);
  const us = await (await fetch(srv.B + "/admin/api/users", { headers: ck })).json();
  assert.equal(us.find((u) => u.email === "al2@x.com").alias, "Beta");
});
test("/api/me/stats: sin token 401; cada usuario ve solo lo suyo", async () => {
  assert.equal((await fetch(srv.B + "/api/me/stats")).status, 401);
  const ck = await srv.adminLogin();
  await srv.post("/admin/api/plan", { id: "mes", name: "Mensual", price: 500, currency: "USD", period: "month" }, ck);
  const tok = async (email) => { const c = (await (await srv.post("/admin/api/invite", { email, planId: "mes" }, ck)).json()).link.split("invite=")[1]; return (await (await srv.post("/api/invite-redeem", { code: c })).json()).token; };
  const ta = await tok("sa@x.com"), tb = await tok("sb@x.com"), H = (t) => ({ Authorization: "Bearer " + t });
  await srv.post("/api/telemetry", { token: ta, type: "run_end", data: { mode: "arcade", win: true, t: 600 } });
  await srv.post("/api/telemetry", { token: ta, type: "pact_pick", data: { id: "p1", accepted: true } });
  const a = await (await fetch(srv.B + "/api/me/stats", { headers: H(ta) })).json(), b = await (await fetch(srv.B + "/api/me/stats", { headers: H(tb) })).json();
  assert.deepEqual(a.modes, [{ mode: "arcade", played: 1, won: 1, bestTime: 600 }]);
  assert.deepEqual(a.pacts.top, [{ id: "p1", accepted: 1 }]);
  assert.deepEqual([b.modes, b.pacts.top, b.last], [[], [], null]);
});

test("/api/me/historial y /api/perfil/:alias: auth, campos y sin mail", async () => {
  assert.equal((await fetch(srv.B + "/api/me/historial")).status, 401);
  assert.equal((await fetch(srv.B + "/api/perfil/x")).status, 401);
  const ck = await srv.adminLogin();
  await srv.post("/admin/api/plan", { id: "mes", name: "Mensual", price: 500, currency: "USD", period: "month" }, ck);
  const c = (await (await srv.post("/admin/api/invite", { email: "hp@x.com", planId: "mes" }, ck)).json()).link.split("invite=")[1];
  const { token } = await (await srv.post("/api/invite-redeem", { code: c })).json(), H = { Authorization: "Bearer " + token };
  assert.equal((await srv.post("/api/alias", { alias: "Perfilito" }, H)).status, 200);
  await srv.post("/api/telemetry", { token, type: "run_end", data: { mode: "survivor", win: true, t: 600, kills: 42 } });
  const h = await (await fetch(srv.B + "/api/me/historial", { headers: H })).json();
  assert.equal(h.length, 1); assert.equal(h[0].modo, "survivor"); assert.equal(h[0].kills, 42); assert.equal(h[0].tiempo, 600); assert.equal(h[0].victoria, true);
  const r = await fetch(srv.B + "/api/perfil/perfilito", { headers: H }), p = await r.json();
  assert.equal(p.alias, "Perfilito"); assert.equal(p.records.modes[0].mode, "survivor"); assert.ok(Array.isArray(p.logros));
  assert.ok(!JSON.stringify(p).includes("@"));
  assert.equal((await fetch(srv.B + "/api/perfil/nadie", { headers: H })).status, 404);
});
