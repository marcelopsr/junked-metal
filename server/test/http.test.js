// Integración: levanta index.js en un puerto libre con una base temporal.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exchangeSig } from "../lib.js";

const PORT = 3900 + Math.floor(Math.random() * 90), B = `http://127.0.0.1:${PORT}`, S = "secreto-test";
let proc;
before(async () => {
  const dir = mkdtempSync(join(tmpdir(), "jm-http-"));
  proc = spawn(process.execPath, ["index.js"], { cwd: new URL("..", import.meta.url).pathname, stdio: "pipe", env: {
    ...process.env, PORT: String(PORT), JM_SECRET: S, TURN_SECRET: "t", GROUP_KEY: "g", ADMIN_KEY: "clave-admin", DB_FILE: join(dir, "jm.db"), INVITES_FILE: join(dir, "no.json"),
    STRIPE_SECRET_KEY: "sk_test", STRIPE_WEBHOOK_SECRET: "whsec_test", REQUIRE_SUBSCRIPTION: "false" } });
  for (let i = 0; i < 50; i++) { try { if ((await fetch(B + "/api/health")).ok) return; } catch {} await new Promise((r) => setTimeout(r, 100)); }
  throw new Error("no arrancó");
});
after(() => proc.kill());
const post = (p, body, h = {}) => fetch(B + p, { method: "POST", headers: { "Content-Type": "application/json", ...h }, body: JSON.stringify(body) });
const exchange = (email, invite) => { const ts = Date.now(); return post("/api/cf-exchange", { email, ts, sig: exchangeSig(S, email, ts), invite }); };

test("portal: sin sesión 401; clave → invitar → canjear → revocar corta /api/turn", async () => {
  assert.equal((await fetch(B + "/admin")).status, 401);
  assert.equal((await fetch(B + "/admin/api/users")).status, 401);
  assert.equal((await post("/admin/api/login", { key: "mala" })).status, 401);
  const lr = await post("/admin/api/login", { key: "clave-admin" });
  assert.equal(lr.status, 200);
  const ck = { Cookie: lr.headers.get("set-cookie").split(";")[0] };
  assert.equal((await fetch(B + "/admin", { headers: ck })).status, 200);
  assert.equal((await post("/admin/api/invite", { email: "z@x.com" }, { ...ck, Origin: "https://evil.com" })).status, 403, "CSRF por Origin");
  const inv = await (await post("/admin/api/invite", { email: "Z@x.com" }, ck)).json();
  assert.match(inv.link, /^https:\/\/marcelopsr\.github\.io\/junked-metal\/\?invite=[\w-]+$/);
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
test("pagos: webhook Stripe con firma inválida 400; PayPal sin credenciales 503", async () => {
  const r = await fetch(B + "/api/pay/stripe/webhook", { method: "POST", headers: { "Content-Type": "application/json", "Stripe-Signature": "t=1,v1=00" }, body: "{}" });
  assert.equal(r.status, 400);
  assert.equal((await fetch(B + "/api/pay/paypal/webhook", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 503);
  assert.equal((await fetch(B + "/api/pay/checkout?plan=x&provider=stripe")).status, 401);
});
