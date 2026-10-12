// Integración (online): servidor propio vía _server.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { useServer, S } from "./_server.mjs";
import { dayOf, dailySeed, weekOf, reglaOf, REGLAS_SEMANA, MAX_RUN_END } from "../db.js";
const srv = useServer();
test("leaderboard: sin token 401; mejor expedición por usuario, sin mail completo", async () => {
  assert.equal((await fetch(srv.B + "/api/leaderboard")).status, 401);
  const ck = await srv.adminLogin();
  const code = (await (await srv.post("/admin/api/invite", { email: "lb@x.com", planId: "mes" }, ck)).json()).link.split("invite=")[1];
  const { token } = await (await srv.post("/api/invite-redeem", { code })).json();
  await srv.post("/api/telemetry", { token, type: "run_end", data: { mode: "encore", win: false, t: 200, loop: 0, stage: 2 } });
  await srv.post("/api/telemetry", { token, type: "run_end", data: { mode: "encore", win: true, t: 300, loop: 1, stage: 0 } });
  await srv.post("/api/telemetry", { token, type: "run_end", data: { mode: "diario", win: true, t: 9, loop: 5, stage: 5 } });
  const r = await fetch(srv.B + "/api/leaderboard", { headers: { Authorization: "Bearer " + token } });
  assert.equal(r.status, 200);
  const rows = await r.json(), mine = rows.filter((x) => x.name === "lb…");
  assert.equal(mine.length, 1);
  assert.deepEqual(mine[0], { name: "lb…", loop: 1, stage: 0, t: 300, win: true });
  assert.ok(!JSON.stringify(rows).includes("@"));
});
const tokenFor = async (email) => {
  const ck = await srv.adminLogin();
  const c = (await (await srv.post("/admin/api/invite", { email, planId: "mes" }, ck)).json()).link.split("invite=")[1];
  return { ck, token: (await (await srv.exchange(email, c)).json()).token };
};
test("anti-trampa: run_end imposible rechazado y auditado; válido aceptado; ráfaga cortada", async () => {
  const { ck, token } = await tokenFor("cheat@x.com");
  const evs = async () => (await (await fetch(srv.B + "/admin/api/telemetry", { headers: ck })).json()).events.filter((e) => e.uid === "cf-cheat@x.com" && e.type === "run_end");
  for (const d of [{ t: 10, loop: 3, stage: 2, kills: 1 }, { t: 9999, loop: 21, stage: 0 }, { t: 9999, loop: 0, stage: 5 }, { t: 500, kills: -5 }, { t: 500, lv: 99999 }, {}])
    assert.equal((await srv.post("/api/telemetry", { token, type: "run_end", data: d })).status, 204);
  assert.equal((await evs()).length, 0);
  const audit = (await (await fetch(srv.B + "/admin/api/audit", { headers: ck })).json()).filter((a) => a.action === "telemetria-sospechosa" && a.actor === "cf-cheat@x.com");
  assert.equal(audit.length, 6);
  assert.match(audit[0].detail || "", /./);
  assert.equal((await srv.post("/api/telemetry", { token, type: "run_end", data: { t: 700, loop: 2, stage: 1, kills: 300, lv: 12 } })).status, 204);
  assert.equal((await evs()).length, 1);
  for (let i = 0; i < 10; i++) await srv.post("/api/telemetry", { token, type: "run_end", data: { t: 700, kills: 1, lv: 1 } });
  assert.equal((await evs()).length, MAX_RUN_END, "ráfaga cortada en el tope");
});
test("diario: /api/daily, solo el primer intento cuenta, board sin mails", async () => {
  assert.equal((await fetch(srv.B + "/api/daily")).status, 401);
  const a = await tokenFor("da@x.com"), b = await tokenFor("db@x.com"), H = (t) => ({ Authorization: "Bearer " + t });
  const d = await (await fetch(srv.B + "/api/daily", { headers: H(a.token) })).json();
  assert.equal(d.date, dayOf());
  assert.equal(d.seed, dailySeed(S, d.date));
  assert.equal(d.mine, null);
  const send = (t, data) => srv.post("/api/telemetry", { token: t, type: "run_end", data: { mode: "diario", daily: d.date, seed: d.seed, kills: 5, lv: 3, ...data } });
  await send(a.token, { win: false, t: 100 });
  await send(a.token, { win: true, t: 50 });            // segundo intento: no cuenta
  await send(b.token, { win: true, t: 200, seed: d.seed + 1 }); // semilla ajena: no cuenta
  await send(b.token, { win: true, t: 300 });
  const r = await (await fetch(srv.B + "/api/daily", { headers: H(a.token) })).json();
  assert.deepEqual(r.mine, { name: "da…", win: false, t: 100, kills: 5, lv: 3, rank: 2 });
  assert.deepEqual(r.board.map((x) => [x.name, x.win, x.t]), [["db…", true, 300], ["da…", false, 100]]);
  assert.ok(!JSON.stringify(r).includes("@"));
});

test("ranking sin fin: 401, mejor por usuario, mine, sin mails, moderación", async () => {
  assert.equal((await fetch(srv.B + "/api/endless/ranking")).status, 401);
  const a = await tokenFor("ena@x.com"), b = await tokenFor("enb@x.com");
  const send = (t, lasted, extra = {}) => srv.post("/api/telemetry", { token: t, type: "run_end", data: { mode: "supervivencia", endless: true, lasted, kills: 5, lv: 3, t: 900, win: true, ...extra } });
  await send(a.token, 100); await send(a.token, 300); await send(b.token, 200); await send(b.token, 999, { endless: false });
  const r = await (await fetch(srv.B + "/api/endless/ranking", { headers: { Authorization: "Bearer " + b.token } })).json();
  assert.deepEqual(r.board.filter((x) => x.name.startsWith("en")), [{ name: "ena…", score: 300 }, { name: "enb…", score: 200 }]);
  assert.equal(r.mine.score, 200);
  assert.ok(!JSON.stringify(r).includes("@"));
});

test("ranking semanal: 401 sin token, mejor kills por usuario, sin mails", async () => {
  assert.equal((await fetch(srv.B + "/api/ranking/semanal")).status, 401);
  const a = await tokenFor("wka@x.com"), b = await tokenFor("wkb@x.com");
  const send = (t, kills) => srv.post("/api/telemetry", { token: t, type: "run_end", data: { mode: "normal", kills, lv: 3, t: 100, win: false } });
  await send(a.token, 7); await send(a.token, 12); await send(b.token, 9);
  const r = await (await fetch(srv.B + "/api/ranking/semanal", { headers: { Authorization: "Bearer " + a.token } })).json();
  assert.deepEqual(r.filter((x) => x.name.startsWith("wk")), [{ name: "wka…", score: 12 }, { name: "wkb…", score: 9 }]);
  assert.ok(!JSON.stringify(r).includes("@"));
});

test("desafío semanal: /api/weekly, ranking solo con semana+semilla, sin mails", async () => {
  assert.equal((await fetch(srv.B + "/api/weekly")).status, 401);
  assert.equal((await fetch(srv.B + "/api/weekly/ranking")).status, 401);
  const a = await tokenFor("wsa@x.com"), b = await tokenFor("wsb@x.com"), H = { Authorization: "Bearer " + a.token };
  const w = await (await fetch(srv.B + "/api/weekly", { headers: H })).json();
  assert.equal(w.week, weekOf());
  assert.equal(new Date(w.week).getUTCDay(), 1);
  assert.equal(w.seed, dailySeed(S, "week:" + w.week));
  assert.ok(REGLAS_SEMANA.includes(w.regla) && w.regla === reglaOf(w.week));
  assert.notEqual(reglaOf("2026-10-05"), reglaOf("2026-10-12"));
  const send = (t, data) => srv.post("/api/telemetry", { token: t, type: "run_end", data: { weekly: w.week, seed: w.seed, t: 100, lv: 1, win: false, ...data } });
  await send(a.token, { kills: 5 }); await send(a.token, { kills: 9 }); await send(b.token, { kills: 7 });
  await send(b.token, { kills: 99, seed: w.seed + 1 }); // semilla ajena: no cuenta
  const r = await (await fetch(srv.B + "/api/weekly/ranking", { headers: H })).json();
  assert.equal(r.regla, w.regla);
  assert.deepEqual(r.board, [{ name: "wsa…", score: 9 }, { name: "wsb…", score: 7 }]);
  assert.ok(!JSON.stringify(r).includes("@"));
});

test("T34: /api/salas lista salas (no espectadores) con conteo de espectadores", async () => {
  const { WebSocket } = await import("ws");
  const { token } = await (await srv.post("/api/login", { clave: "g" })).json();
  const open = (id) => new Promise((ok, no) => { const w = new WebSocket(`ws://127.0.0.1:${srv.PORT}/peer/peerjs?key=peerjs&id=${id}&token=${encodeURIComponent(token)}`); w.once("message", () => ok(w)); w.once("error", no); w.once("unexpected-response", (_, r) => no(new Error("HTTP " + r.statusCode))); });
  assert.equal((await fetch(srv.B + "/api/salas")).status, 401);
  const ws = [await open("jm-ABC123"), await open("jmv-ABC123-x1"), await open("jmv-ABC123-x2")];
  const l = await (await fetch(srv.B + "/api/salas", { headers: { Authorization: "Bearer " + token } })).json();
  ws.forEach((w) => w.close());
  assert.equal(l.length, 1);
  assert.deepEqual([l[0].id, l[0].code, l[0].espectadores], ["jm-ABC123", "ABC123", 2]);
  assert.ok(!JSON.stringify(l).includes("@"));
});
test("espectadores: tope 10 por sala (403) y su limiter no consume el de salas", async () => {
  const { WebSocket } = await import("ws");
  const { token } = await (await srv.post("/api/login", { clave: "g" })).json();
  const open = (id) => new Promise((ok, no) => { const w = new WebSocket(`ws://127.0.0.1:${srv.PORT}/peer/peerjs?key=peerjs&id=${id}&token=${encodeURIComponent(token)}`); w.once("message", () => ok(w)); w.once("error", no); w.once("unexpected-response", (_, r) => no(new Error("HTTP " + r.statusCode))); });
  const ws = [];
  for (const s of ["TOPE01", "TOPE02", "TOPE03", "TOPE04"]) for (let i = 0; i < 10; i++) ws.push(await open(`jmv-${s}-${i}`));
  await assert.rejects(open("jmv-TOPE01-x"), /HTTP 403/);
  ws.push(await open("jm-TOPE01")); // 41 aperturas de la misma IP (4 salas × 10): las salas siguen con su propio cupo (30)
  ws.forEach((w) => w.close());
});
