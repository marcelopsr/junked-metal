// Prueba de carga local: npm run carga -- --jugadores 50 --segundos 60
// Levanta server/index.js con DB temporal y env mínimo (sin CF_*/STRIPE_*/PAYPAL_*), nunca producción.
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i > 0 ? +process.argv[i + 1] || d : d; };
const N = arg("jugadores", 50), SEG = arg("segundos", 60);
const PORT = 4100 + Math.floor(Math.random() * 800), B = `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), "jm-carga-"));
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(CF_|STRIPE_|PAYPAL_|GITHUB_)/.test(k)));
const proc = spawn(process.execPath, ["index.js"], { cwd: new URL("../server/", import.meta.url).pathname, stdio: "ignore", env: {
  ...env, MONITOR_OFF: "1", PORT: String(PORT), JM_SECRET: "carga-secret", TURN_SECRET: "t", GROUP_KEY: "g", ADMIN_KEY: "clave-carga", DB_FILE: join(dir, "jm.db"),
  INVITES_FILE: join(dir, "no.json"), EXCHANGE_SECRET: "carga-canje", REQUIRE_SUBSCRIPTION: "false" } });
const cleanup = () => { proc.kill(); rmSync(dir, { recursive: true, force: true }); };
process.on("SIGINT", () => { cleanup(); process.exit(130); });

const stats = new Map(); // endpoint -> { lat:[], ok, r429, err }
async function call(name, path, { method = "GET", body, headers = {} } = {}) {
  const s = stats.get(name) ?? stats.set(name, { lat: [], ok: 0, r429: 0, err: 0 }).get(name);
  const t0 = performance.now();
  try {
    const r = await fetch(B + path, { method, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...headers }, body: body && JSON.stringify(body) });
    s.lat.push(performance.now() - t0);
    if (r.status === 429) s.r429++; else if (r.status < 300) s.ok++; else s.err++;
    return r;
  } catch { s.lat.push(performance.now() - t0); s.err++; }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(B + "/api/health")).ok) break; } catch {} await sleep(100); if (i === 49) throw new Error("el servidor no arrancó"); }
  // Setup (no medido): login admin, plan, 50 invitaciones. trust proxy = loopback → X-Forwarded-For por jugador es confiable desde 127.0.0.1.
  const ar = await fetch(B + "/admin/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "clave-carga" }) });
  const ck = { Cookie: ar.headers.get("set-cookie").split(";")[0], "Content-Type": "application/json" };
  const adm = (p, b) => fetch(B + p, { method: "POST", headers: ck, body: JSON.stringify(b) }).then((r) => r.json());
  await adm("/admin/api/plan", { id: "mes", name: "Mensual", price: 500, currency: "USD", period: "month" });
  const players = [];
  for (let i = 0; i < N; i++) {
    const inv = await adm("/admin/api/invite", { email: `carga${i}@x.com`, planId: "mes" });
    const code = inv.link?.split("invite=")[1], xf = { "X-Forwarded-For": `10.9.${i >> 8}.${i & 255}` };
    const r = await fetch(B + "/api/invite-redeem", { method: "POST", headers: { "Content-Type": "application/json", ...xf }, body: JSON.stringify({ code }) });
    if (!r.ok) throw new Error(`canje ${i} falló: ${r.status}`);
    players.push({ token: (await r.json()).token, xf });
  }
  console.log(`Setup OK: ${N} usuarios con licencia y token. Cargando ${SEG}s...`);

  const end = Date.now() + SEG * 1000, pick = (a) => a[Math.floor(Math.random() * a.length)];
  const player = async ({ token, xf }) => {
    const H = { Authorization: "Bearer " + token, ...xf }, tel = (type, data) => call("POST /api/telemetry " + type, "/api/telemetry", { method: "POST", body: { token, type, data }, headers: xf });
    await sleep(Math.random() * 1000);
    await tel("session", { v: "carga" });
    let lastEnd = 0, n = 0;
    while (Date.now() < end) {
      n++;
      if (n % 6 === 1) await tel("run_start", { mode: "encore" });
      await tel("pact_pick", { id: pick(["p1", "p2", "p3"]), accepted: Math.random() < 0.5, stage: n % 5 });
      await tel("upgrade_pick", { id: pick(["u1", "u2", "u3"]), mode: "encore" });
      await tel("stage_end", { stage: n % 5, t: 120 + n });
      if (Date.now() - lastEnd > 20000) { lastEnd = Date.now(); await tel("run_end", { mode: "encore", win: Math.random() < 0.5, t: 700, loop: 1, stage: 2, kills: 300, lv: 12 }); }
      const g = n % 3;
      if (g === 0) await call("GET /api/leaderboard", "/api/leaderboard", { headers: H });
      else if (g === 1) await call("GET /api/daily", "/api/daily", { headers: H });
      else await call("GET /api/me/stats", "/api/me/stats", { headers: H });
      await sleep(1200 + Math.random() * 800);
    }
  };
  await Promise.all(players.map(player));

  const q = (a, p) => a.length ? [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(p * a.length))] : 0;
  const rows = [...stats].sort(([a], [b]) => a.localeCompare(b)).map(([endpoint, s]) => ({ endpoint, pedidos: s.lat.length, ok: s.ok, r429: s.r429, errores: s.err,
    p50: +q(s.lat, .5).toFixed(1), p95: +q(s.lat, .95).toFixed(1), p99: +q(s.lat, .99).toFixed(1) }));
  const [rssKb, cpu, cpuTime] = execFileSync("ps", ["-o", "rss=,pcpu=,time=", "-p", String(proc.pid)]).toString().trim().split(/\s+/);
  const proceso = { rssMB: +(rssKb / 1024).toFixed(1), pcpuMedio: +cpu, cpuTotal: cpuTime };
  console.table(rows);
  console.log(`Servidor: RSS ${proceso.rssMB} MB, tiempo CPU total ${cpuTime} (incluye arranque y setup) | ${N} jugadores, ${SEG}s`);
  mkdirSync(".carga", { recursive: true });
  const f = `.carga/${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(f, JSON.stringify({ jugadores: N, segundos: SEG, rows, proceso }, null, 2));
  console.log("Guardado en " + f);
} finally { cleanup(); }
