// Helper compartido: cada archivo http.*.test.js levanta su propio index.js (puerto libre, DB temporal, env limpio, net-guard).
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { before, after } from "node:test";
import { exchangeSig } from "../lib.js";

// Sin credenciales reales de Cloudflare/Stripe/PayPal del shell: los tests no deben tocar la política de Access de producción.
export const cleanEnv = (env) => Object.fromEntries(Object.entries(env).filter(([k]) => !/^(CF_|STRIPE_|PAYPAL_)/.test(k)));
export const S = "secreto-test";
const freePort = () => new Promise((ok, no) => { const s = createServer(); s.once("error", no); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => ok(port)); }); });

// Registra before/after del archivo que lo importa y devuelve { PORT, B, post, exchange, adminLogin, guardLog }.
export function useServer(extraEnv = {}) {
  const t = { S }; let proc;
  const post = (p, body, h = {}) => fetch(t.B + p, { method: "POST", headers: { "Content-Type": "application/json", ...h }, body: JSON.stringify(body) });
  const exchange = (email, invite) => { const ts = Date.now(); return post("/api/cf-exchange", { email, ts, sig: exchangeSig("canje-test", email, ts), invite }); };
  let adminCk; // una sola sesión admin por servidor (el login tiene tope de 10 por 15 min); fresh=true fuerza otra
  const adminLogin = async (fresh = false) => {
    if (!fresh && adminCk) return adminCk;
    const ck = { Cookie: (await post("/admin/api/login", { key: "clave-admin" })).headers.get("set-cookie").split(";")[0] };
    await post("/admin/api/plan", { id: "mes", name: "Mensual", price: 500, currency: "USD", period: "month" }, ck);
    return fresh ? ck : (adminCk = ck);
  };
  before(async () => {
    const dir = mkdtempSync(join(tmpdir(), "jm-http-"));
    t.guardLog = join(dir, "red-bloqueada.log");
    t.PORT = await freePort(); t.B = `http://127.0.0.1:${t.PORT}`;
    proc = spawn(process.execPath, ["--import", new URL("./net-guard.mjs", import.meta.url).pathname, "index.js"], { cwd: new URL("..", import.meta.url).pathname, stdio: "pipe", env: {
      ...cleanEnv(process.env), MONITOR_OFF: "1", NET_GUARD_LOG: t.guardLog, PORT: String(t.PORT), JM_SECRET: S, TURN_SECRET: "t", GROUP_KEY: "g", ADMIN_KEY: "clave-admin", DB_FILE: join(dir, "jm.db"), INVITES_FILE: join(dir, "no.json"),
      EXCHANGE_SECRET: "canje-test", TEL_DAILY_MAX: "30", GITHUB_CLIENT_ID: "cid", GITHUB_CLIENT_SECRET: "cs", STRIPE_SECRET_KEY: "sk_test", STRIPE_WEBHOOK_SECRET: "whsec_test", REQUIRE_SUBSCRIPTION: "false", ...extraEnv } });
    for (let i = 0; i < 50; i++) { try { if ((await fetch(t.B + "/api/health")).ok) return; } catch {} await new Promise((r) => setTimeout(r, 100)); }
    throw new Error("no arrancó");
  });
  after(() => proc.kill());
  return Object.assign(t, { post, exchange, adminLogin });
}
export const guardOut = (g) => (existsSync(g) ? readFileSync(g, "utf8") : "");
