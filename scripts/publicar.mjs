// npm run publicar [-- --seco] [--sin-e2e] [--sin-novedades] [--commit "mensaje"]
// Pasos en orden; corta al primer fallo. --seco solo imprime lo que haría.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { novedadesDeAsuntos } from "./lib/novedades.mjs";

const args = process.argv.slice(2);
const seco = args.includes("--seco");
const sinE2e = args.includes("--sin-e2e");
const sinNov = args.includes("--sin-novedades");
const ci = args.indexOf("--commit");
const msg = ci >= 0 ? args[ci + 1] : null;
if (ci >= 0 && !msg) { console.error("--commit pide un mensaje"); process.exit(2); }

const HOST = "junkedmetal.duckdns.org";
const WORKER = "https://jm-login.mesr-96.workers.dev";
const ROOT = new URL("..", import.meta.url).pathname;
const buildEnv = { VITE_NET_HOST: HOST, VITE_LOGIN_URL: `${WORKER}/login` };

function envFile(p) {
  const out = {};
  for (const l of readFileSync(p, "utf8").split("\n")) {
    const m = l.match(/^\s*(?:export\s+)?([A-Za-z_]\w*)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
}
// Ejecuta un comando; en seco solo lo imprime.
function sh(cmd, a, { cwd = ROOT, env = {}, soft = false } = {}) {
  console.log(`  $ ${Object.entries(env).filter(([k]) => k.startsWith("VITE_")).map(([k, v]) => `${k}=${v} `).join("")}${[cmd, ...a].join(" ")}${cwd !== ROOT ? `   (en ${cwd.replace(ROOT, "")})` : ""}`);
  if (seco) return;
  const r = spawnSync(cmd, a, { cwd, env: { ...process.env, ...env }, stdio: "inherit" });
  if (r.status !== 0 && !soft) throw new Error(`${cmd} salió con ${r.status ?? r.signal}`);
}
async function http(url, opts, esperado, extra) {
  console.log(`  ${opts?.method ?? "GET"} ${url} -> espera ${esperado}`);
  if (seco) return;
  const r = await fetch(url, { redirect: "manual", ...opts });
  const loc = r.headers.get("location") ?? "";
  console.log(`    ${r.status} ${loc}`);
  if (r.status !== esperado || (extra && !extra(loc))) throw new Error(`${url}: ${r.status} ${loc}`);
}

// Novedades: commits feat/fix desde el hash de .publicado (o el último tag publicado-*).
function git(a) { const r = spawnSync("git", a, { cwd: ROOT, encoding: "utf8" }); return r.status === 0 ? r.stdout.trim() : ""; }
function novedades() {
  const f = join(ROOT, ".publicado");
  const base = (existsSync(f) ? readFileSync(f, "utf8").trim() : "") || git(["describe", "--tags", "--match", "publicado-*", "--abbrev=0"]);
  const head = git(["rev-parse", "HEAD"]);
  const asuntos = base ? git(["log", "--format=%s", `${base}..HEAD`]).split("\n").filter(Boolean) : [];
  const p = join(ROOT, "portada/novedades.json");
  const lista = JSON.parse(readFileSync(p, "utf8"));
  const nuevas = novedadesDeAsuntos(asuntos, lista, new Date().toISOString().slice(0, 10));
  console.log(base ? `  desde ${base.slice(0, 10)}: ${asuntos.length} commits` : "  sin marca previa: solo se registra .publicado");
  for (const n of nuevas) console.log(`  + ${n.fecha} ${n.titulo}`);
  if (!nuevas.length) console.log("  (sin novedades nuevas)");
  if (seco) return;
  if (nuevas.length) writeFileSync(p, `[\n${[...nuevas, ...lista].map((e) => JSON.stringify(e)).join(",\n")}\n]\n`);
  writeFileSync(f, `${head}\n`);
}

const hayE2e = !!JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).scripts?.e2e;
const pasos = [
  ["git status", () => sh("git", ["status", "--short", "--branch"], { soft: true })],
  ["test juego", () => sh("npm", ["run", "test:todo"])],
  ["test server", () => sh("npm", ["run", "test:server"])],
  ["test cf-login", () => sh("npm", ["test"], { cwd: join(ROOT, "server/cf-login") })],
  ["build", () => sh("npm", ["run", "build"], { env: buildEnv })],
  ...(hayE2e && !sinE2e ? [["e2e", () => sh("npm", ["run", "e2e"])]] : []),
  ["deploy VPS", () => {
    sh("rsync", ["-a", "--exclude", "node_modules", "--exclude", "test", "--exclude", ".env", "--exclude", "data", "server/", "vps:/opt/junkedmetal/"]);
    sh("ssh", ["vps", "cd /opt/junkedmetal && npm ci --omit=dev && pm2 restart jm-net --update-env"]);
  }],
  ["deploy Worker", () => {
    const f = join(homedir(), ".config/junkedmetal/cloudflare.env");
    let env = {};
    if (seco) console.log(`  (cargaría ${f})`);
    else if (!existsSync(f)) throw new Error(`falta ${f}`);
    else env = envFile(f);
    sh("npx", ["wrangler", "deploy"], { cwd: join(ROOT, "server/cf-login"), env });
  }],
  ["pm2 rc-demo", () => sh("pm2", ["restart", "rc-demo"])],
  ["prod: health", () => http(`https://${HOST}/api/health`, {}, 200)],
  ["prod: Worker->Access", () => http(`${WORKER}/`, {}, 302, (l) => l.includes("cloudflareaccess.com"))],
  ["prod: telemetry 401", () => http(`https://${HOST}/api/telemetry`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }, 401)],
  ...(msg ? [["commit + push", () => {
    if (!sinNov) novedades();
    sh("git", ["add", "-u"]); sh("git", ["add", "--", ".publicado", "portada/novedades.json"]); // ponytail: solo lo versionado y lo que escribe publicar; nunca archivos sueltos (-A subió capturas y referencias al repo público)
    sh("git", ["commit", "-m", `${msg}\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`]);
    sh("git", ["push", "origin"]);
  }]] : []),
];

const filas = [];
let fallo = false;
for (const [nombre, fn] of pasos) {
  console.log(`\n== ${nombre}${seco ? " (seco)" : ""}`);
  const t = Date.now();
  try { await fn(); filas.push([nombre, seco ? "seco" : "ok", Date.now() - t]); }
  catch (e) { console.error(`  FALLO: ${e.message}`); filas.push([nombre, "FALLO", Date.now() - t]); fallo = true; break; }
}
console.log("\n paso                    ok     tiempo");
for (const [n, ok, t] of filas) console.log(` ${n.padEnd(23)} ${ok.padEnd(6)} ${(t / 1000).toFixed(1)}s`);
if (fallo) process.exit(1);
