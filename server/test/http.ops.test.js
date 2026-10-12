// Integración (ops): servidor propio vía _server.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { useServer, S } from "./_server.mjs";
import { sign } from "../lib.js";
import { cleanEnv, guardOut } from "./_server.mjs";
const srv = useServer();
const xff = (ip) => ({ "X-Forwarded-For": ip }); // a propósito: estos tests prueban límites por IP/uid
test("pagos: webhook Stripe con firma inválida 400; PayPal sin credenciales 503", async () => {
  const r = await fetch(srv.B + "/api/pay/stripe/webhook", { method: "POST", headers: { "Content-Type": "application/json", "Stripe-Signature": "t=1,v1=00" }, body: "{}" });
  assert.equal(r.status, 400);
  assert.equal((await fetch(srv.B + "/api/pay/paypal/webhook", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 503);
  assert.equal((await fetch(srv.B + "/api/pay/checkout?plan=x&provider=stripe")).status, 401);
});
test("telemetría: sin token 401; con token 204 y aparece en el admin", async () => {
  assert.equal((await srv.post("/api/telemetry", { type: "session" })).status, 401);
  const ck = await srv.adminLogin();
  await srv.post("/admin/api/plan", { id: "mes", name: "Mensual", price: 500, currency: "USD", period: "month" }, ck);
  const code = (await (await srv.post("/admin/api/invite", { email: "t@x.com", planId: "mes" }, ck)).json()).link.split("invite=")[1];
  const { token } = await (await srv.post("/api/invite-redeem", { code })).json();
  assert.equal((await srv.post("/api/telemetry", { token, type: "Mal tipo" })).status, 400);
  assert.equal((await srv.post("/api/telemetry", { token, type: "run_end", data: { win: true, t: 600 } })).status, 204);
  const t = await (await fetch(srv.B + "/admin/api/telemetry", { headers: ck })).json();
  assert.ok(t.events.some((e) => e.uid === "cf-t@x.com" && e.type === "run_end"));
});
test("H4/H5: /api/stats solo contadores; errores sin stack; cookie admin rota → 401", async () => {
  const { token } = await (await srv.post("/api/login", { clave: "g" })).json();
  const r = await fetch(srv.B + "/api/stats", { headers: { Authorization: "Bearer " + token } });
  assert.equal(r.status, 200);
  const j = await r.json(), txt = JSON.stringify(j);
  assert.deepEqual(Object.keys(j).sort(), ["peers", "salas", "uptime"]);
  assert.ok(!txt.includes("@") && !txt.includes("turn") && !/\d+\.\d+\.\d+\.\d+/.test(txt));
  const bad = await fetch(srv.B + "/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  const big = await srv.post("/api/login", { clave: "x".repeat(3000) });
  for (const [res, st] of [[bad, 400], [big, 413]]) {
    assert.equal(res.status, st);
    const t = await res.text();
    assert.ok(!/\bat \w|\.js|node_modules/.test(t), t);
  }
  assert.equal((await fetch(srv.B + "/admin/api/users", { headers: { Cookie: "jm_admin=%E0" } })).status, 401);
});

test("T51: cuota diaria de telemetría por uid (429 aunque cambie la IP)", async () => {
  const token = sign(S, "g-cuota");
  let last;
  for (let i = 0; i < 31; i++) last = (await srv.post("/api/telemetry", { token, type: "session", data: {} }, xff("6.6.6." + i))).status;
  assert.equal(last, 429);
});
test("T51: /auth/login con limiter por IP", async () => {
  const url = srv.B + "/auth/login?return=" + encodeURIComponent("https://junkedmetal.duckdns.org/");
  let last;
  for (let i = 0; i < 21; i++) last = (await fetch(url, { redirect: "manual", headers: xff("7.7.7.7") })).status;
  assert.equal(last, 429);
  assert.equal((await fetch(url, { redirect: "manual", headers: xff("7.7.7.8") })).status, 302);
});
test("T51: PayPal return y webhook con limiter (antes del chequeo de configuración)", async () => {
  let last;
  for (let i = 0; i < 21; i++) last = (await fetch(srv.B + "/api/pay/paypal/return?token=A", { redirect: "manual" })).status;
  assert.equal(last, 429);
  for (let i = 0; i < 61; i++) last = (await srv.post("/api/pay/paypal/webhook", {})).status;
  assert.equal(last, 429);
});
test("H19: el env del servidor de tests no hereda CF_*, STRIPE_* ni PAYPAL_*", () => {
  const e = cleanEnv({ CF_API_TOKEN: "x", CF_ACCOUNT_ID: "x", CF_ACCESS_APP: "x", CF_ACCESS_POLICY: "x", STRIPE_SECRET_KEY: "x", PAYPAL_CLIENT_ID: "x", PATH: "/bin" });
  assert.deepEqual(Object.keys(e), ["PATH"]);
});
test("T54: /api/status público, solo ok/caido, CORS de la portada y rate limit", async () => {
  const r = await fetch(srv.B + "/api/status", { headers: { Origin: "https://marcelopsr.github.io" } });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("access-control-allow-origin"), "https://marcelopsr.github.io");
  const j = await r.json();
  assert.deepEqual(Object.keys(j).sort(), ["actualizado", "juego", "login", "online"]);
  for (const k of ["juego", "online", "login"]) assert.match(j[k], /^(ok|caido)$/);
  assert.ok(!isNaN(Date.parse(j.actualizado)));
  let last; for (let i = 0; i < 31; i++) last = (await fetch(srv.B + "/api/status")).status;
  assert.equal(last, 429);
});

test("sin red: el servidor de prueba no intentó ningún fetch fuera de 127.0.0.1", async () => {
  assert.equal((await fetch(srv.B + "/api/health")).status, 200);
  await new Promise((r) => setTimeout(r, 300)); // deja correr el monitor y accessSync del arranque
  assert.equal(guardOut(srv.guardLog), "", "hubo fetch externo");
});
